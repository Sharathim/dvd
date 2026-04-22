from flask import Flask, abort, jsonify, render_template, send_from_directory, request, session
from pathlib import Path
import json
from functools import wraps
from email.message import EmailMessage
import os
import smtplib
from dotenv import load_dotenv

app = Flask(__name__)
app.secret_key = "dv_dream_homes_secret_key_2024"

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CONTACT_TO_EMAIL = "rathisha273@gmail.com"

load_dotenv(BASE_DIR / ".env")


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/<path:page>")
def render_page(page: str):
    # Keep old .html-style URLs working without changing existing links.
    if not page.endswith(".html"):
        abort(404)

    template_path = BASE_DIR / "templates" / page
    if not template_path.is_file():
        abort(404)

    return render_template(page)


@app.route("/data/<path:filename>")
def serve_data_file(filename: str):
    return send_from_directory(DATA_DIR, filename)


def _read_json_array(filename: str):
    file_path = DATA_DIR / filename
    if not file_path.is_file():
        return []

    with file_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    return payload if isinstance(payload, list) else []


def _write_json_array(filename: str, data: list):
    """Write data to JSON file safely"""
    file_path = DATA_DIR / filename
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with file_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)


def _read_admin_credentials():
    """Load admin credentials"""
    file_path = DATA_DIR / "admin.json"
    if not file_path.is_file():
        return {}
    
    with file_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    
    return payload if isinstance(payload, dict) else {}


def _require_admin(f):
    """Decorator to check if user is authenticated"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("authenticated"):
            abort(401)
        return f(*args, **kwargs)
    return decorated_function


def _send_contact_email(name: str, email: str, subject: str, message: str):
    smtp_host = os.getenv("DV_SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("DV_SMTP_PORT", "587"))
    smtp_user = os.getenv("DV_SMTP_USER", "").strip()
    smtp_password = os.getenv("DV_SMTP_PASSWORD", "")
    smtp_from = os.getenv("DV_SMTP_FROM", smtp_user).strip() or smtp_user
    use_tls = os.getenv("DV_SMTP_USE_TLS", "true").strip().lower() == "true"

    if not smtp_host or not smtp_user or not smtp_password or not smtp_from:
        raise RuntimeError("SMTP configuration is missing")

    email_message = EmailMessage()
    email_message["Subject"] = f"[DV Dream Homes] Contact Form: {subject}"
    email_message["From"] = smtp_from
    email_message["To"] = CONTACT_TO_EMAIL
    email_message["Reply-To"] = email

    body = (
        "New contact form submission\n\n"
        f"Name: {name}\n"
        f"Email: {email}\n"
        f"Subject: {subject}\n"
        f"Message:\n{message}\n\n"
        f"Source IP: {request.remote_addr or 'Unknown'}"
    )
    email_message.set_content(body)

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        if use_tls:
            server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(email_message)


@app.route("/api/projects")
def api_projects():
    return jsonify(_read_json_array("projects.json"))


@app.route("/api/completed-projects")
def api_completed_projects():
    return jsonify(_read_json_array("completed_projects.json"))


@app.route("/api/ongoing-projects")
def api_ongoing_projects():
    return jsonify(_read_json_array("ongoing_projects.json"))


@app.route("/api/testimonials")
def api_testimonials():
    return jsonify(_read_json_array("testimonials.json"))


@app.route("/api/admin")
def api_admin():
    file_path = DATA_DIR / "admin.json"
    if not file_path.is_file():
        return jsonify({})

    with file_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    return jsonify(payload if isinstance(payload, dict) else {})


@app.route("/api/contact", methods=["POST"])
def api_contact():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    subject = str(data.get("subject", "")).strip()
    message = str(data.get("message", "")).strip()

    if not name or not email or not subject or not message:
        return jsonify({"ok": False, "error": "Please fill all required fields."}), 400

    try:
        _send_contact_email(name, email, subject, message)
    except RuntimeError:
        return jsonify({"ok": False, "error": "Mail server is not configured."}), 500
    except Exception:
        return jsonify({"ok": False, "error": "Failed to send message. Please try again."}), 502

    return jsonify({"ok": True}), 200


# ===== ADMIN AUTHENTICATION =====
@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json()
    username = data.get("username", "")
    password = data.get("password", "")
    
    credentials = _read_admin_credentials()
    
    if username == credentials.get("username") and password == credentials.get("password"):
        session["authenticated"] = True
        session["username"] = username
        return jsonify({"ok": True, "username": username}), 200
    
    return jsonify({"ok": False, "error": "Invalid credentials"}), 401


@app.route("/api/admin/logout", methods=["POST"])
def admin_logout():
    session.clear()
    return jsonify({"ok": True}), 200


@app.route("/api/admin/status", methods=["GET"])
def admin_status():
    return jsonify({
        "authenticated": session.get("authenticated", False),
        "username": session.get("username", "")
    }), 200


# ===== PROJECTS CRUD =====
@app.route("/api/projects", methods=["GET", "POST"])
def projects_endpoint():
    if request.method == "POST":
        _require_admin(lambda: None)()
        data = request.get_json()
        projects = _read_json_array("projects.json")
        
        # Generate ID
        new_id = max([p.get("id", 0) for p in projects], default=0) + 1
        
        new_project = {
            "id": new_id,
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "category": data.get("category", ""),
            "status": data.get("status", "ongoing"),
            "location": data.get("location", ""),
            "year": data.get("year", ""),
            "image": data.get("image", ""),
            "date_created": data.get("date_created", "")
        }
        
        projects.append(new_project)
        _write_json_array("projects.json", projects)
        
        return jsonify(new_project), 201
    
    return jsonify(_read_json_array("projects.json")), 200


@app.route("/api/projects/<int:project_id>", methods=["PUT", "DELETE"])
def project_detail(project_id):
    _require_admin(lambda: None)()
    projects = _read_json_array("projects.json")
    
    project_index = next((i for i, p in enumerate(projects) if p.get("id") == project_id), None)
    
    if project_index is None:
        abort(404)
    
    if request.method == "PUT":
        data = request.get_json()
        project = projects[project_index]
        project.update({
            "title": data.get("title", project.get("title")),
            "description": data.get("description", project.get("description")),
            "category": data.get("category", project.get("category")),
            "status": data.get("status", project.get("status")),
            "location": data.get("location", project.get("location")),
            "year": data.get("year", project.get("year")),
            "image": data.get("image", project.get("image"))
        })
        _write_json_array("projects.json", projects)
        return jsonify(project), 200
    
    elif request.method == "DELETE":
        projects.pop(project_index)
        _write_json_array("projects.json", projects)
        return jsonify({"ok": True}), 200


# ===== COMPLETED PROJECTS CRUD =====
@app.route("/api/completed-projects", methods=["GET", "POST"])
def completed_projects_endpoint():
    if request.method == "POST":
        _require_admin(lambda: None)()
        data = request.get_json()
        completed_projects = _read_json_array("completed_projects.json")

        new_id = max([project.get("id", 0) for project in completed_projects], default=0) + 1

        new_completed_project = {
            "id": new_id,
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "project_type": data.get("project_type", "Completed Residence"),
            "location": data.get("location", ""),
            "completed_in": data.get("completed_in", ""),
            "units": data.get("units", ""),
            "built_up_area": data.get("built_up_area", ""),
            "image": data.get("image", ""),
            "date_created": data.get("date_created", "")
        }

        completed_projects.append(new_completed_project)
        _write_json_array("completed_projects.json", completed_projects)

        return jsonify(new_completed_project), 201

    return jsonify(_read_json_array("completed_projects.json")), 200


@app.route("/api/completed-projects/<int:project_id>", methods=["PUT", "DELETE"])
def completed_project_detail(project_id):
    _require_admin(lambda: None)()
    completed_projects = _read_json_array("completed_projects.json")

    project_index = next((i for i, project in enumerate(completed_projects) if project.get("id") == project_id), None)

    if project_index is None:
        abort(404)

    if request.method == "PUT":
        data = request.get_json()
        project = completed_projects[project_index]
        project.update({
            "title": data.get("title", project.get("title")),
            "description": data.get("description", project.get("description")),
            "project_type": data.get("project_type", project.get("project_type")),
            "location": data.get("location", project.get("location")),
            "completed_in": data.get("completed_in", project.get("completed_in")),
            "units": data.get("units", project.get("units")),
            "built_up_area": data.get("built_up_area", project.get("built_up_area")),
            "image": data.get("image", project.get("image"))
        })
        _write_json_array("completed_projects.json", completed_projects)
        return jsonify(project), 200

    elif request.method == "DELETE":
        completed_projects.pop(project_index)
        _write_json_array("completed_projects.json", completed_projects)
        return jsonify({"ok": True}), 200


# ===== ONGOING PROJECTS CRUD =====
@app.route("/api/ongoing-projects", methods=["GET", "POST"])
def ongoing_projects_endpoint():
    if request.method == "POST":
        _require_admin(lambda: None)()
        data = request.get_json()
        ongoing_projects = _read_json_array("ongoing_projects.json")

        new_id = max([project.get("id", 0) for project in ongoing_projects], default=0) + 1

        new_ongoing_project = {
            "id": new_id,
            "tag": data.get("tag", "Ongoing"),
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "meta_one": data.get("meta_one", ""),
            "meta_two": data.get("meta_two", ""),
            "image": data.get("image", ""),
            "link": data.get("link", ""),
            "date_created": data.get("date_created", "")
        }

        ongoing_projects.append(new_ongoing_project)
        _write_json_array("ongoing_projects.json", ongoing_projects)

        return jsonify(new_ongoing_project), 201

    return jsonify(_read_json_array("ongoing_projects.json")), 200


@app.route("/api/ongoing-projects/<int:project_id>", methods=["PUT", "DELETE"])
def ongoing_project_detail(project_id):
    _require_admin(lambda: None)()
    ongoing_projects = _read_json_array("ongoing_projects.json")

    project_index = next((i for i, project in enumerate(ongoing_projects) if project.get("id") == project_id), None)

    if project_index is None:
        abort(404)

    if request.method == "PUT":
        data = request.get_json()
        project = ongoing_projects[project_index]
        project.update({
            "tag": data.get("tag", project.get("tag")),
            "title": data.get("title", project.get("title")),
            "description": data.get("description", project.get("description")),
            "meta_one": data.get("meta_one", project.get("meta_one")),
            "meta_two": data.get("meta_two", project.get("meta_two")),
            "image": data.get("image", project.get("image")),
            "link": data.get("link", project.get("link"))
        })
        _write_json_array("ongoing_projects.json", ongoing_projects)
        return jsonify(project), 200

    elif request.method == "DELETE":
        ongoing_projects.pop(project_index)
        _write_json_array("ongoing_projects.json", ongoing_projects)
        return jsonify({"ok": True}), 200


# ===== TESTIMONIALS CRUD =====
@app.route("/api/testimonials", methods=["GET", "POST"])
def testimonials_endpoint():
    if request.method == "POST":
        _require_admin(lambda: None)()
        data = request.get_json()
        testimonials = _read_json_array("testimonials.json")
        
        # Generate ID
        new_id = max([t.get("id", 0) for t in testimonials], default=0) + 1
        
        new_testimonial = {
            "id": new_id,
            "author": data.get("author", ""),
            "quote": data.get("quote", ""),
            "rating": data.get("rating", 5),
            "avatar": data.get("avatar", ""),
            "date_created": data.get("date_created", "")
        }
        
        testimonials.append(new_testimonial)
        _write_json_array("testimonials.json", testimonials)
        
        return jsonify(new_testimonial), 201
    
    return jsonify(_read_json_array("testimonials.json")), 200


@app.route("/api/testimonials/<int:testimonial_id>", methods=["PUT", "DELETE"])
def testimonial_detail(testimonial_id):
    _require_admin(lambda: None)()
    testimonials = _read_json_array("testimonials.json")
    
    testimonial_index = next((i for i, t in enumerate(testimonials) if t.get("id") == testimonial_id), None)
    
    if testimonial_index is None:
        abort(404)
    
    if request.method == "PUT":
        data = request.get_json()
        testimonial = testimonials[testimonial_index]
        testimonial.update({
            "author": data.get("author", testimonial.get("author")),
            "quote": data.get("quote", testimonial.get("quote")),
            "rating": data.get("rating", testimonial.get("rating")),
            "avatar": data.get("avatar", testimonial.get("avatar"))
        })
        _write_json_array("testimonials.json", testimonials)
        return jsonify(testimonial), 200
    
    elif request.method == "DELETE":
        testimonials.pop(testimonial_index)
        _write_json_array("testimonials.json", testimonials)
        return jsonify({"ok": True}), 200


if __name__ == "__main__":
    app.run(debug=True)
