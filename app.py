from flask import Flask, abort, jsonify, render_template, send_from_directory, request, session
from pathlib import Path
import json
from functools import wraps

app = Flask(__name__)
app.secret_key = "dv_dream_homes_secret_key_2024"

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"


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


@app.route("/api/projects")
def api_projects():
    return jsonify(_read_json_array("projects.json"))


@app.route("/api/testimonials")
def api_testimonials():
    return jsonify(_read_json_array("testimonials.json"))


@app.route("/api/messages")
def api_messages():
    return jsonify(_read_json_array("messages.json"))


@app.route("/api/admin")
def api_admin():
    file_path = DATA_DIR / "admin.json"
    if not file_path.is_file():
        return jsonify({})

    with file_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    return jsonify(payload if isinstance(payload, dict) else {})


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


# ===== MESSAGES CRUD =====
@app.route("/api/messages", methods=["GET", "POST"])
def messages_endpoint():
    if request.method == "POST":
        data = request.get_json()
        messages = _read_json_array("messages.json")
        
        # Generate ID
        new_id = max([m.get("id", 0) for m in messages], default=0) + 1
        
        new_message = {
            "id": new_id,
            "name": data.get("name", ""),
            "email": data.get("email", ""),
            "phone": data.get("phone", ""),
            "message": data.get("message", ""),
            "date_created": data.get("date_created", "")
        }
        
        messages.append(new_message)
        _write_json_array("messages.json", messages)
        
        return jsonify(new_message), 201
    
    return jsonify(_read_json_array("messages.json")), 200


@app.route("/api/messages/<int:message_id>", methods=["DELETE"])
def message_detail(message_id):
    _require_admin(lambda: None)()
    messages = _read_json_array("messages.json")
    
    message_index = next((i for i, m in enumerate(messages) if m.get("id") == message_id), None)
    
    if message_index is None:
        abort(404)
    
    if request.method == "DELETE":
        messages.pop(message_index)
        _write_json_array("messages.json", messages)
        return jsonify({"ok": True}), 200


if __name__ == "__main__":
    app.run(debug=True)
