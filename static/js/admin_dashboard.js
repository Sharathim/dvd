const STORAGE_KEYS = {
    projects: 'dv_projects',
    testimonials: 'dv_testimonials'
};

const LEGACY_STORAGE_KEYS = {
    projects: 'rrr_projects',
    testimonials: 'rrr_testimonials'
};

const STORAGE_VERSION_KEY = 'dv_storage_version';
const STORAGE_VERSION = '2026-04-dv-refresh-1';

const AUTH_KEYS = {
    loggedIn: 'dv_admin_logged_in',
    legacyLoggedIn: 'rrr_admin_logged_in',
    username: 'dv_admin_username',
    legacyUsername: 'rrr_admin_username'
};

let deleteHandler = null;

window.addEventListener('load', function () {
    const loadingScreen = document.getElementById('loadingScreen');
    setTimeout(function () {
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
        }
        setTimeout(function () {
            if (loadingScreen) {
                loadingScreen.remove();
            }
        }, 500);
    }, 1000);
});

function loadStore(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
}

function saveStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function hasValidArrayStore(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        return Array.isArray(value);
    } catch {
        return false;
    }
}

function nextId(items) {
    return items.length ? Math.max(...items.map(function (item) { return item.id || 0; })) + 1 : 1;
}

function resolveImage(path, fallback) {
    if (!path) {
        return fallback;
    }
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('static/')) {
        return path;
    }
    return `static/uploads/${path}`;
}

function lockBodyScroll() {
    document.body.classList.add('modal-open');
}

function unlockBodyScroll() {
    document.body.classList.remove('modal-open');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        lockBodyScroll();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        unlockBodyScroll();
    }
}

window.closeModal = closeModal;

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        return;
    }
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(function () {
        toast.className = 'toast';
    }, 3500);
}

function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) {
        return;
    }

    input.addEventListener('change', function () {
        const file = input.files && input.files[0];
        if (!file) {
            preview.style.display = 'none';
            return;
        }
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
    });
}

function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function bootstrapData() {
    const currentVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (currentVersion !== STORAGE_VERSION) {
        Object.keys(STORAGE_KEYS).forEach(function (key) {
            const nextKey = STORAGE_KEYS[key];
            const legacyKey = LEGACY_STORAGE_KEYS[key];
            if (!localStorage.getItem(nextKey) && legacyKey && localStorage.getItem(legacyKey)) {
                localStorage.setItem(nextKey, localStorage.getItem(legacyKey));
            }
        });
        localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    }

    if (!hasValidArrayStore(STORAGE_KEYS.projects)) {
        try {
            const resp = await fetch('data/projects.json');
            const value = resp.ok ? await resp.json() : [];
            saveStore(STORAGE_KEYS.projects, Array.isArray(value) ? value : []);
        } catch {
            saveStore(STORAGE_KEYS.projects, []);
        }
    }

    if (!hasValidArrayStore(STORAGE_KEYS.testimonials)) {
        try {
            const resp = await fetch('data/testimonials.json');
            const value = resp.ok ? await resp.json() : [];
            saveStore(STORAGE_KEYS.testimonials, Array.isArray(value) ? value : []);
        } catch {
            saveStore(STORAGE_KEYS.testimonials, []);
        }
    }

}

function createProjectCardHTML(project) {
    return `
        <div class="card-title">${project.title}</div>
        <img class="card-img" src="${resolveImage(project.image, 'https://placehold.co/400x200/0D3B66/FFFFFF?text=No+Image')}" alt="${project.title}">
        <div class="card-details">${project.description}</div>
        <div class="card-details"><strong>Category:</strong> ${project.category} | <strong>Status:</strong> ${project.status}</div>
        <small class="card-details"><i class="fas fa-calendar"></i> Created: ${project.date_created || 'N/A'}</small>
        <div class="card-actions">
            <button class="btn btn-primary" onclick="editProject('${project.id}')"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-danger" onclick="confirmDelete('project', '${project.id}')"><i class="fas fa-trash"></i> Delete</button>
        </div>`;
}

function createTestimonialCardHTML(item) {
    let stars = '';
    for (let i = 0; i < 5; i++) {
        stars += `<i class="fas fa-star" style="opacity:${i < (item.rating || 0) ? 1 : 0.3}"></i>`;
    }

    return `
        <div style="display: flex; align-items: center; gap: 1.2rem; margin-bottom: 1.5rem;">
            <img class="card-author-img" src="${resolveImage(item.image, 'https://placehold.co/70x70/EFEFEF/333333?text=?')}" alt="${item.name}">
            <div>
                <div class="card-title" style="margin-bottom: 0.2rem;">${item.name}</div>
                <div class="card-details">${item.company}</div>
            </div>
        </div>
        <div class="rating-stars" data-rating="${item.rating}">${stars}</div>
        <div class="card-message">"${item.text}"</div>
        <small class="card-details"><i class="fas fa-calendar"></i> Created: ${item.date_created || 'N/A'}</small>
        <div class="card-actions">
            <button class="btn btn-primary" onclick="editTestimonial('${item.id}')"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-danger" onclick="confirmDelete('testimonial', '${item.id}')"><i class="fas fa-trash"></i> Delete</button>
        </div>`;
}

function renderProjects() {
    const ongoingList = document.getElementById('ongoingProjectsList');
    const completedList = document.getElementById('completedProjectsList');
    
    const projects = loadStore(STORAGE_KEYS.projects);
    const ongoingProjects = projects.filter(function (p) { return p.status === 'ongoing'; });
    const completedProjects = projects.filter(function (p) { return p.status === 'completed'; });

    // Render ongoing projects
    if (ongoingList) {
        if (!ongoingProjects.length) {
            ongoingList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #666;"><i class="fas fa-building" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i><p>No ongoing projects have been added yet.</p></div>';
        } else {
            ongoingList.innerHTML = ongoingProjects.map(function (project) {
                return `<div class="card" data-id="${project.id}">${createProjectCardHTML(project)}</div>`;
            }).join('');
        }
    }

    // Render completed projects
    if (completedList) {
        if (!completedProjects.length) {
            completedList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #666;"><i class="fas fa-building" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i><p>No completed projects have been added yet.</p></div>';
        } else {
            completedList.innerHTML = completedProjects.map(function (project) {
                return `<div class="card" data-id="${project.id}">${createProjectCardHTML(project)}</div>`;
            }).join('');
        }
    }
}

function renderTestimonials() {
    const list = document.getElementById('testimonialsList');
    if (!list) {
        return;
    }

    const testimonials = loadStore(STORAGE_KEYS.testimonials);
    if (!testimonials.length) {
        list.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #666;"><i class="fas fa-quote-left" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i><p>No testimonials have been added yet.</p></div>';
        return;
    }

    list.innerHTML = testimonials.map(function (item) {
        return `<div class="card" data-id="${item.id}">${createTestimonialCardHTML(item)}</div>`;
    }).join('');
}

function updateDashboardStats() {
    const projects = loadStore(STORAGE_KEYS.projects);
    const testimonials = loadStore(STORAGE_KEYS.testimonials);

    // Count ongoing and completed projects
    const ongoingCount = projects.filter(function (p) { return p.status === 'ongoing'; }).length;
    const completedCount = projects.filter(function (p) { return p.status === 'completed'; }).length;
    const testimonialCount = testimonials.length;

    // Update stat cards
    const ongoingElement = document.getElementById('ongoingProjects');
    const completedElement = document.getElementById('completedProjects');
    const totalTestimonialsElement = document.getElementById('totalTestimonials');

    if (ongoingElement) {
        ongoingElement.textContent = ongoingCount;
    }
    if (completedElement) {
        completedElement.textContent = completedCount;
    }
    if (totalTestimonialsElement) {
        totalTestimonialsElement.textContent = testimonialCount;
    }
}

function renderAll() {
    updateDashboardStats();
    renderProjects();
    renderTestimonials();
}

function openProjectModal() {
    const form = document.getElementById('projectForm');
    if (!form) {
        return;
    }
    form.reset();
    document.getElementById('projectModalTitle').textContent = 'Add Project';
    document.getElementById('proj_id').value = '';
    document.getElementById('proj_imagePreview').style.display = 'none';
    openModal('projectModalBg');
}

window.openProjectModal = openProjectModal;

function openTestimonialModal() {
    const form = document.getElementById('testimonialForm');
    if (!form) {
        return;
    }
    form.reset();
    document.getElementById('testimonialModalTitle').textContent = 'Add Testimonial';
    document.getElementById('test_id').value = '';
    document.getElementById('test_imagePreview').style.display = 'none';
    openModal('testimonialModalBg');
}

window.openTestimonialModal = openTestimonialModal;

async function saveProject(event) {
    event.preventDefault();
    const form = document.getElementById('projectForm');
    const data = Object.fromEntries(new FormData(form).entries());
    const imageFile = document.getElementById('proj_image').files[0];
    const projects = loadStore(STORAGE_KEYS.projects);
    const isEdit = !!data.id;

    if (isEdit) {
        const item = projects.find(function (project) { return String(project.id) === String(data.id); });
        if (!item) {
            showToast('Project not found.', 'error');
            return;
        }

        item.title = data.title;
        item.description = data.description;
        item.category = data.category;
        item.status = data.status;
        if (imageFile) {
            item.image = await fileToDataUrl(imageFile);
        }
        if (!item.date_created) {
            item.date_created = new Date().toISOString().split('T')[0];
        }
    } else {
        projects.unshift({
            id: nextId(projects),
            title: data.title,
            description: data.description,
            category: data.category,
            status: data.status,
            image: imageFile ? await fileToDataUrl(imageFile) : '',
            date_created: new Date().toISOString().split('T')[0]
        });
    }

    saveStore(STORAGE_KEYS.projects, projects);
    renderProjects();
    closeModal('projectModalBg');
    showToast(isEdit ? 'Project updated successfully!' : 'Project added successfully!', 'success');
}

async function saveTestimonial(event) {
    event.preventDefault();
    const form = document.getElementById('testimonialForm');
    const data = Object.fromEntries(new FormData(form).entries());
    const imageFile = document.getElementById('test_image').files[0];
    const testimonials = loadStore(STORAGE_KEYS.testimonials);
    const isEdit = !!data.id;

    if (isEdit) {
        const item = testimonials.find(function (testimonial) { return String(testimonial.id) === String(data.id); });
        if (!item) {
            showToast('Testimonial not found.', 'error');
            return;
        }

        item.name = data.name;
        item.company = data.company;
        item.text = data.text;
        item.rating = parseInt(data.rating, 10) || 5;
        if (imageFile) {
            item.image = await fileToDataUrl(imageFile);
        }
        if (!item.date_created) {
            item.date_created = new Date().toISOString().split('T')[0];
        }
    } else {
        testimonials.unshift({
            id: nextId(testimonials),
            name: data.name,
            company: data.company,
            text: data.text,
            rating: parseInt(data.rating, 10) || 5,
            image: imageFile ? await fileToDataUrl(imageFile) : '',
            date_created: new Date().toISOString().split('T')[0]
        });
    }

    saveStore(STORAGE_KEYS.testimonials, testimonials);
    renderTestimonials();
    closeModal('testimonialModalBg');
    showToast(isEdit ? 'Testimonial updated successfully!' : 'Testimonial added successfully!', 'success');
}

function editProject(id) {
    const projects = loadStore(STORAGE_KEYS.projects);
    const item = projects.find(function (project) { return String(project.id) === String(id); });
    if (!item) {
        showToast('Could not fetch project details.', 'error');
        return;
    }

    document.getElementById('projectModalTitle').textContent = 'Edit Project';
    document.getElementById('proj_id').value = item.id;
    document.getElementById('proj_title').value = item.title || '';
    document.getElementById('proj_desc').value = item.description || '';
    document.getElementById('proj_category').value = item.category || '';
    document.getElementById('proj_status').value = item.status || '';

    const preview = document.getElementById('proj_imagePreview');
    if (item.image) {
        preview.src = resolveImage(item.image, '');
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }

    openModal('projectModalBg');
}

window.editProject = editProject;

function editTestimonial(id) {
    const testimonials = loadStore(STORAGE_KEYS.testimonials);
    const item = testimonials.find(function (testimonial) { return String(testimonial.id) === String(id); });
    if (!item) {
        showToast('Could not fetch testimonial details.', 'error');
        return;
    }

    document.getElementById('testimonialModalTitle').textContent = 'Edit Testimonial';
    document.getElementById('test_id').value = item.id;
    document.getElementById('test_name').value = item.name || '';
    document.getElementById('test_company').value = item.company || '';
    document.getElementById('test_text').value = item.text || '';
    document.getElementById('test_rating').value = item.rating || 5;

    const preview = document.getElementById('test_imagePreview');
    if (item.image) {
        preview.src = resolveImage(item.image, '');
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }

    openModal('testimonialModalBg');
}

window.editTestimonial = editTestimonial;

function openConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    deleteHandler = onConfirm;
    openModal('confirmModal');
}

function confirmDelete(type, id) {
    const labels = {
        project: 'This will permanently delete this project.',
        testimonial: 'This will permanently delete this testimonial.'
    };

    openConfirmModal(`Delete ${type}`, labels[type] || 'Are you sure?', function () {
        if (type === 'project') {
            const projects = loadStore(STORAGE_KEYS.projects).filter(function (item) { return String(item.id) !== String(id); });
            saveStore(STORAGE_KEYS.projects, projects);
            renderProjects();
        }

        if (type === 'testimonial') {
            const testimonials = loadStore(STORAGE_KEYS.testimonials).filter(function (item) { return String(item.id) !== String(id); });
            saveStore(STORAGE_KEYS.testimonials, testimonials);
            renderTestimonials();
        }

        showToast(`${type} deleted successfully.`, 'success');
    });
}

window.confirmDelete = confirmDelete;

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');

    function switchTab(targetId) {
        contentSections.forEach(function (section) { section.classList.remove('active'); });
        navLinks.forEach(function (link) { link.classList.remove('active'); });

        const targetSection = document.getElementById(targetId);
        const targetLink = document.querySelector(`.nav-link[data-target="${targetId}"]`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        if (targetLink) {
            targetLink.classList.add('active');
        }
    }

    navLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.dataset.target;
            history.pushState(null, '', this.getAttribute('href'));
            switchTab(targetId);
        });
    });

    const hash = window.location.hash.replace('#', '');
    const sectionId = hash ? `${hash}-section` : 'dashboard-section';
    switchTab(document.getElementById(sectionId) ? sectionId : 'dashboard-section');
}

function setupModalEvents() {
    document.querySelectorAll('.modal-bg').forEach(function (bg) {
        bg.addEventListener('click', function (event) {
            if (event.target === bg) {
                closeModal(bg.id);
            }
        });
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            document.querySelectorAll('.modal-bg.active').forEach(function (modal) {
                closeModal(modal.id);
            });
        }
    });

    document.getElementById('confirmOkBtn').addEventListener('click', function () {
        if (deleteHandler) {
            deleteHandler();
            deleteHandler = null;
        }
        closeModal('confirmModal');
    });

    document.getElementById('confirmCancelBtn').addEventListener('click', function () {
        deleteHandler = null;
        closeModal('confirmModal');
    });
}

function setupAuth() {
    const loggedIn = localStorage.getItem(AUTH_KEYS.loggedIn) === 'true' || localStorage.getItem(AUTH_KEYS.legacyLoggedIn) === 'true';
    if (!loggedIn) {
        window.location.href = '/admin';
        return false;
    }

    localStorage.setItem(AUTH_KEYS.loggedIn, 'true');
    const username = localStorage.getItem(AUTH_KEYS.username) || localStorage.getItem(AUTH_KEYS.legacyUsername) || 'admin';
    localStorage.setItem(AUTH_KEYS.username, username);
    const usernameNode = document.getElementById('adminUsername');
    if (usernameNode) {
        usernameNode.textContent = username;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (event) {
            event.preventDefault();
            localStorage.removeItem(AUTH_KEYS.loggedIn);
            localStorage.removeItem(AUTH_KEYS.username);
            localStorage.removeItem(AUTH_KEYS.legacyLoggedIn);
            localStorage.removeItem(AUTH_KEYS.legacyUsername);
            window.location.href = '/admin';
        });
    }

    return true;
}

document.addEventListener('DOMContentLoaded', async function () {
    if (!setupAuth()) {
        return;
    }

    try {
        await bootstrapData();
    } catch {
        // Continue with local defaults if bootstrap fails.
    }
    setupNavigation();
    setupModalEvents();
    setupImagePreview('proj_image', 'proj_imagePreview');
    setupImagePreview('test_image', 'test_imagePreview');

    const projectForm = document.getElementById('projectForm');
    const testimonialForm = document.getElementById('testimonialForm');

    projectForm.addEventListener('submit', saveProject);
    testimonialForm.addEventListener('submit', saveTestimonial);

    renderAll();
});
