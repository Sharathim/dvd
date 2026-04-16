const STORAGE_KEYS = {
    projects: 'dv_projects',
    testimonials: 'dv_testimonials',
    messages: 'dv_messages'
};

const STORAGE_VERSION_KEY = 'dv_storage_version';
const STORAGE_VERSION = '2026-04-dv-refresh-1';

document.documentElement.style.overflow = 'hidden';
let loadingDismissed = false;
let countersStarted = false;

function startCountersOnce() {
    if (countersStarted) {
        return;
    }
    countersStarted = true;
    setTimeout(initCounters, 120);
}

function dismissLoadingScreen() {
    if (loadingDismissed) {
        return;
    }
    loadingDismissed = true;

    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(function () {
            if (loadingScreen) {
                loadingScreen.remove();
            }
        }, 350);
    }

    document.documentElement.style.overflow = 'auto';
    startCountersOnce();
}

document.addEventListener('DOMContentLoaded', function () {
    // Fast path: clear loader soon after DOM is ready.
    setTimeout(dismissLoadingScreen, 220);
});

window.addEventListener('load', dismissLoadingScreen);

// Hard cap: never keep loader beyond this point, even on slow media.
setTimeout(dismissLoadingScreen, 1600);

function ensureStorageVersion() {
    const currentVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (currentVersion === STORAGE_VERSION) {
        return;
    }

    Object.keys(STORAGE_KEYS).forEach(function (key) {
        localStorage.removeItem(STORAGE_KEYS[key]);
    });
    localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
}

function loadStore(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function saveStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

async function fetchJson(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            return [];
        }
        const payload = await response.json();
        return Array.isArray(payload) ? payload : [];
    } catch {
        return [];
    }
}

async function bootstrapData() {
    ensureStorageVersion();

    if (!localStorage.getItem(STORAGE_KEYS.projects)) {
        const projects = await fetchJson('data/projects.json');
        saveStore(STORAGE_KEYS.projects, projects);
    }

    if (!localStorage.getItem(STORAGE_KEYS.testimonials)) {
        const testimonials = await fetchJson('data/testimonials.json');
        saveStore(STORAGE_KEYS.testimonials, testimonials);
    }

    if (!localStorage.getItem(STORAGE_KEYS.messages)) {
        const messages = await fetchJson('data/messages.json');
        saveStore(STORAGE_KEYS.messages, messages);
    }
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

function titleCase(value) {
    if (!value || typeof value !== 'string') {
        return 'General';
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderProjects() {
    const wrapper = document.getElementById('projectsSwiperWrapper');
    if (!wrapper) {
        return;
    }

    const fallback = [
        {
            title: 'Azure Heights Villa',
            description: 'A premium 6,500 sq ft smart villa with double-height living and landscape courtyard.',
            category: 'residential',
            location: 'ECR, Chennai',
            year: '2024',
            image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=700&q=80'
        },
        {
            title: 'Meridian Corporate Tower',
            description: 'LEED-ready office tower with high-performance facade and flexible floor plates.',
            category: 'commercial',
            location: 'OMR',
            year: '2023',
            image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=700&q=80'
        },
        {
            title: 'Palmwoods Residences',
            description: 'Luxury apartment development featuring club amenities and curated green spaces.',
            category: 'apartments',
            location: 'Anna Nagar',
            year: '2023',
            image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=700&q=80'
        }
    ];

    const source = loadStore(STORAGE_KEYS.projects);
    const projects = source.length ? source : fallback;

    wrapper.innerHTML = projects.map(function (project) {
        const category = titleCase(project.category);
        const location = project.location || 'Chennai';
        const year = project.year || project.date_created || 'Recent';

        return `
            <div class="swiper-slide">
                <div class="project-card">
                    <div class="project-image-wrap">
                        <img class="project-image" src="${resolveImage(project.image, fallback[0].image)}" alt="${project.title || 'Project'}">
                        <span class="project-category">${category}</span>
                    </div>
                    <div class="project-content">
                        <h3>${project.title || 'Project'}</h3>
                        <p>${project.description || ''}</p>
                        <div class="project-meta">
                            <span><i class="fas fa-location-dot"></i>${location}</span>
                            <span><i class="fas fa-calendar"></i>${year}</span>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function renderTestimonials() {
    const wrapper = document.getElementById('testimonialsSwiperWrapper');
    if (!wrapper) {
        return;
    }

    const fallback = [
        {
            name: 'Suresh Kumar',
            company: 'Villa Owner, Adyar',
            text: 'DV Dream Homes delivered our villa exactly as promised. Build quality and finish are exceptional.',
            rating: 5,
            image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face'
        },
        {
            name: 'Priya Raman',
            company: 'Apartment Owner, Anna Nagar',
            text: 'From design to handover, communication was clear and timelines were respected.',
            rating: 5,
            image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face'
        }
    ];

    const source = loadStore(STORAGE_KEYS.testimonials);
    const testimonials = source.length ? source : fallback;

    wrapper.innerHTML = testimonials.map(function (item) {
        return `
            <div class="swiper-slide">
                <div class="testimonial-card" data-rating="${item.rating || 5}">
                    <div class="rating"></div>
                    <div class="testimonial-text">${item.text || ''}</div>
                    <div class="testimonial-author">
                        <img src="${resolveImage(item.image, fallback[0].image)}" alt="Photo of ${item.name || 'Client'}" class="author-photo">
                        <div class="author-info">
                            <h4>${item.name || 'Client'}</h4>
                            <p>${item.company || ''}</p>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function populateStars() {
    document.querySelectorAll('.testimonial-card').forEach(function (card) {
        const rating = parseInt(card.dataset.rating, 10) || 5;
        const ratingContainer = card.querySelector('.rating');
        if (!ratingContainer) {
            return;
        }

        let stars = '';
        for (let index = 0; index < 5; index++) {
            stars += index < rating
                ? '<i class="fas fa-star"></i>'
                : '<i class="fas fa-star" style="opacity: 0.3;"></i>';
        }
        ratingContainer.innerHTML = stars;
    });
}

function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    if (!slides.length) {
        return;
    }

    let currentSlide = 0;
    setInterval(function () {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 5000);
}

function initSwipers() {
    if (typeof Swiper === 'undefined') {
        return;
    }

    const testimonialSlideCount = document.querySelectorAll('#testimonialsSwiperWrapper .swiper-slide').length;
    const hasFewTestimonials = testimonialSlideCount <= 2;

    new Swiper('.projects-swiper', {
        slidesPerView: 1,
        spaceBetween: 18,
        loop: true,
        centeredSlides: true,
        autoplay: {
            delay: 3500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true
        },
        speed: 650,
        pagination: {
            el: '.projects-swiper .swiper-pagination',
            clickable: true
        },
        breakpoints: {
            640: { slidesPerView: 1.2, centeredSlides: true },
            900: { slidesPerView: 2, centeredSlides: false },
            1200: { slidesPerView: 3, centeredSlides: false }
        }
    });

    new Swiper('.testimonials-swiper', {
        slidesPerView: 1,
        spaceBetween: 18,
        loop: !hasFewTestimonials,
        centeredSlides: hasFewTestimonials,
        autoplay: {
            delay: 4200,
            disableOnInteraction: false,
            pauseOnMouseEnter: true
        },
        speed: 700,
        pagination: {
            el: '.testimonials-swiper .swiper-pagination',
            clickable: true
        },
        breakpoints: {
            640: {
                slidesPerView: hasFewTestimonials ? 1 : 1.2,
                centeredSlides: hasFewTestimonials
            },
            900: {
                slidesPerView: hasFewTestimonials ? 2 : 2,
                centeredSlides: hasFewTestimonials
            },
            1200: {
                slidesPerView: hasFewTestimonials ? 2 : 3,
                centeredSlides: hasFewTestimonials
            }
        },
        on: {
            init: function () {
                setTimeout(populateStars, 100);
            },
            slideChange: function () {
                setTimeout(populateStars, 50);
            }
        }
    });
}

function setupContactForm() {
    const queryForm = document.getElementById('customerQueryForm');
    const formMsg = document.getElementById('formMsg');
    const submitBtn = document.getElementById('submitBtn');

    if (!queryForm || !formMsg || !submitBtn) {
        return;
    }

    queryForm.addEventListener('submit', function (event) {
        event.preventDefault();
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Sending... <i class="fas fa-spinner fa-spin"></i>';

        const payload = Object.fromEntries(new FormData(queryForm).entries());
        const messages = loadStore(STORAGE_KEYS.messages);
        const nextId = messages.length
            ? Math.max(...messages.map(function (item) { return item.id || 0; })) + 1
            : 1;

        messages.unshift({
            id: nextId,
            ...payload,
            timestamp: new Date().toISOString(),
            status: 'New'
        });
        saveStore(STORAGE_KEYS.messages, messages);

        formMsg.textContent = 'Thanks for reaching out. DV Dream Homes will contact you shortly.';
        formMsg.className = 'form-msg-box success';

        queryForm.reset();
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Send Message <i class="fas fa-paper-plane"></i>';
    });
}

function setupNavigation() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');

    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', function (event) {
            event.preventDefault();
            mobileNav.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });

        mobileNav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                mobileNav.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-times');
                }
            });
        });

        document.addEventListener('click', function (event) {
            if (!mobileNav.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
                mobileNav.classList.remove('active');
            }
        });
    }

    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    const sections = document.querySelectorAll('section[id]');

    function updateActiveNav() {
        let current = '';
        const scrollY = window.pageYOffset;

        sections.forEach(function (section) {
            const sectionTop = section.offsetTop - 130;
            const sectionHeight = section.offsetHeight;
            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
        });
    }

    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav();

    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;

    window.addEventListener('scroll', function () {
        const currentScroll = window.pageYOffset;
        if (!navbar) {
            return;
        }

        navbar.classList.toggle('scrolled', currentScroll > 40);
        if (currentScroll <= 100) {
            navbar.classList.remove('navbar-hidden');
            lastScrollTop = currentScroll;
            return;
        }

        navbar.classList.toggle('navbar-hidden', currentScroll > lastScrollTop);
        lastScrollTop = currentScroll;
    });
}

function setupFadeIn() {
    const fadeSections = document.querySelectorAll('.fade-in-section');
    if (!fadeSections.length) {
        return;
    }

    if (typeof IntersectionObserver === 'undefined') {
        fadeSections.forEach(function (section) {
            section.classList.add('is-visible');
        });
        return;
    }

    document.body.classList.add('js-fade');

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -60px 0px'
    });

    fadeSections.forEach(function (section) {
        observer.observe(section);
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    document.body.classList.add('content-loaded');

    setupNavigation();
    setupContactForm();
    setupFadeIn();
    initHeroSlider();

    await bootstrapData();
    renderProjects();
    renderTestimonials();

    initSwipers();
    populateStars();

    const year = document.getElementById('copyrightYear');
    if (year) {
        year.textContent = new Date().getFullYear();
    }
});

function startCounter(element, target, suffix) {
    let count = 0;
    const increment = Math.max(target / 60, 1);

    const timer = setInterval(function () {
        count += increment;
        if (count >= target) {
            element.textContent = `${target}${suffix}`;
            clearInterval(timer);
        } else {
            element.textContent = `${Math.floor(count)}${suffix}`;
        }
    }, 24);
}

function initCounters() {
    const counters = document.querySelectorAll('.hero-stats h3[data-target]');

    counters.forEach(function (element, index) {
        const target = parseInt(element.dataset.target, 10);
        if (Number.isNaN(target)) {
            return;
        }

        const suffix = element.textContent.includes('+') ? '+' : '';
        element.textContent = `0${suffix}`;

        setTimeout(function () {
            startCounter(element, target, suffix);
        }, index * 150);
    });
}
