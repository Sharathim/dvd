(function () {
    const navToggle = document.querySelector('[data-nav-toggle]');
    const navMenu = document.querySelector('[data-nav-menu]');
    const dropdownParents = Array.from(document.querySelectorAll('.has-dropdown'));

    function closeMobileNav() {
        if (!navMenu || !navToggle) {
            return;
        }
        navMenu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
    }

    function closeAllDropdowns() {
        dropdownParents.forEach(function (dropdown) {
            dropdown.classList.remove('open');
        });
    }

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function () {
            navMenu.classList.toggle('open');
            navToggle.setAttribute('aria-expanded', navMenu.classList.contains('open') ? 'true' : 'false');
        });

        navMenu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                closeMobileNav();
                closeAllDropdowns();
            });
        });

        document.addEventListener('click', function (event) {
            if (!navMenu.contains(event.target) && !navToggle.contains(event.target)) {
                closeMobileNav();
                closeAllDropdowns();
            }
        });

        window.addEventListener('resize', function () {
            if (window.innerWidth > 1060) {
                closeMobileNav();
                closeAllDropdowns();
            }
        });
    }

    dropdownParents.forEach(function (dropdownParent) {
        const dropdownToggle = dropdownParent.querySelector('[data-dropdown-toggle]');
        if (!dropdownToggle) {
            return;
        }

        dropdownToggle.addEventListener('click', function (event) {
            if (window.innerWidth > 1060) {
                return;
            }
            event.preventDefault();

            const isOpen = dropdownParent.classList.contains('open');
            closeAllDropdowns();
            if (!isOpen) {
                dropdownParent.classList.add('open');
            }
        });
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeMobileNav();
            closeAllDropdowns();
        }
    });

    const messageForm = document.getElementById('contactForm');
    if (messageForm) {
        messageForm.addEventListener('submit', function (event) {
            event.preventDefault();
            const formData = Object.fromEntries(new FormData(messageForm).entries());
            const payload = {
                ...formData,
                id: Date.now(),
                source: document.body.dataset.page || 'website',
                timestamp: new Date().toISOString()
            };

            let messages = [];
            try {
                const saved = localStorage.getItem('dv_messages');
                messages = saved ? JSON.parse(saved) : [];
            } catch (error) {
                messages = [];
            }

            messages.unshift(payload);
            localStorage.setItem('dv_messages', JSON.stringify(messages));

            const status = document.getElementById('formStatus');
            if (status) {
                status.classList.add('visible');
                status.textContent = 'Message sent successfully. We will contact you shortly.';
            }
            messageForm.reset();
        });
    }

    const yearEls = document.querySelectorAll('[data-year]');
    yearEls.forEach(function (el) {
        el.textContent = new Date().getFullYear();
    });
})();
