(function () {
  const ensureElement = (selector, creator) => {
    const existing = document.querySelector(selector);
    if (existing) return existing;
    const element = creator();
    document.body.prepend(element);
    return element;
  };

  const progress = ensureElement("#progress", () => {
    const element = document.createElement("div");
    element.id = "progress";
    return element;
  });

  const scrollTopBtn = document.getElementById("scrollTop") || (() => {
    const button = document.createElement("button");
    button.className = "scroll-top";
    button.id = "scrollTop";
    button.setAttribute("aria-label", "Scroll to top");
    button.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(button);
    return button;
  })();

  const header = document.getElementById("siteHeader") || document.querySelector(".site-header");

  const updateScrollUi = () => {
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const percent = Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100));
    if (progress) progress.style.width = percent + "%";
    if (header) header.classList.toggle("scrolled", window.scrollY > 50);
    if (scrollTopBtn) scrollTopBtn.classList.toggle("visible", window.scrollY > 500);
  };

  window.addEventListener("scroll", updateScrollUi, { passive: true });
  updateScrollUi();

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  const navToggle = document.querySelector("[data-nav-toggle]");
  const navMenu = document.querySelector("[data-nav-menu]");
  const dropdownParents = Array.from(document.querySelectorAll(".has-dropdown"));

  const closeMobileNav = () => {
    if (!navMenu || !navToggle) return;
    navMenu.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  };

  const closeAllDropdowns = () => {
    dropdownParents.forEach((dropdown) => {
      dropdown.classList.remove("open");
      const toggle = dropdown.querySelector("[data-dropdown-toggle]");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    });
  };

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      navMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", navMenu.classList.contains("open") ? "true" : "false");
    });

    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        closeMobileNav();
        closeAllDropdowns();
      });
    });

    document.addEventListener("click", (event) => {
      if (!navMenu.contains(event.target) && !navToggle.contains(event.target)) {
        closeMobileNav();
        closeAllDropdowns();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 980) {
        closeMobileNav();
        closeAllDropdowns();
      }
    });
  }

  dropdownParents.forEach((dropdown) => {
    const toggle = dropdown.querySelector("[data-dropdown-toggle]");
    if (!toggle) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const wasOpen = dropdown.classList.contains("open");
      closeAllDropdowns();
      if (!wasOpen) {
        dropdown.classList.add("open");
        toggle.setAttribute("aria-expanded", "true");
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileNav();
      closeAllDropdowns();
    }
  });

  document.querySelectorAll(".page-hero-content, .section-title, .section-copy, .split-card, .contact-grid, .gallery-grid, .stats-grid, .highlights-grid, .history-grid, .management-grid, .project-grid-tight, .availability-table, .map-wrap").forEach((element) => {
    if (!element.classList.contains("reveal") && !element.classList.contains("reveal-left") && !element.classList.contains("reveal-right")) {
      element.classList.add("reveal");
    }
  });

  document.querySelectorAll(".project-card, .project-info-card, .highlight-item, .history-card, .management-card, .contact-item-card, .testimonial-card, .standard-row, .trust-item, .numbered-block, .timeline-card").forEach((element, index) => {
    if (!element.classList.contains("reveal") && !element.classList.contains("reveal-left") && !element.classList.contains("reveal-right")) {
      element.classList.add("reveal");
    }
    element.style.transitionDelay = Math.min(index % 6, 5) * 0.08 + "s";
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  document.querySelectorAll(".reveal, .reveal-left, .reveal-right").forEach((element) => revealObserver.observe(element));

  const chapterSections = Array.from(document.querySelectorAll(".page-hero, main > section")).filter((section) => {
    return section.offsetParent !== null && section.getBoundingClientRect().height > 80;
  });

  if (chapterSections.length > 2 && !document.querySelector(".story-rail")) {
    const rail = document.createElement("nav");
    rail.className = "story-rail";
    rail.setAttribute("aria-label", "Page story navigation");

    chapterSections.forEach((section, index) => {
      if (!section.id) section.id = "story-chapter-" + (index + 1);
      const heading = section.querySelector("h1, h2, h3, .section-band p");
      const label = (heading ? heading.textContent : "Chapter " + (index + 1)).trim().replace(/\s+/g, " ");
      const link = document.createElement("a");
      link.href = "#" + section.id;
      link.innerHTML = "<span></span><em>" + label + "</em>";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      rail.appendChild(link);
    });

    document.body.appendChild(rail);

    const railLinks = Array.from(rail.querySelectorAll("a"));
    const railObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = chapterSections.indexOf(entry.target);
        railLinks.forEach((link, linkIndex) => {
          link.classList.toggle("active", linkIndex === index);
          link.classList.toggle("passed", linkIndex < index);
        });
      });
    }, { threshold: 0.35 });

    chapterSections.forEach((section) => railObserver.observe(section));
  }

  const storyImage = document.querySelector("[data-story-image]");
  const storyVisual = document.querySelector("[data-story-visual]");
  const storyCount = document.querySelector("[data-story-count]");
  const storyTitle = document.querySelector("[data-story-title]");
  const storyCaption = document.querySelector("[data-story-caption]");
  const storySteps = Array.from(document.querySelectorAll("[data-story-step]"));
  const progressBars = Array.from(document.querySelectorAll(".story-progress span"));

  const setActiveStory = (step) => {
    const index = storySteps.indexOf(step);
    if (index < 0) return;

    storySteps.forEach((item) => item.classList.toggle("is-active", item === step));
    progressBars.forEach((bar, barIndex) => bar.classList.toggle("active", barIndex <= index));

    if (storyCount) storyCount.textContent = step.dataset.index + " / 04";
    if (storyTitle) storyTitle.textContent = step.dataset.title || "";
    if (storyCaption) storyCaption.textContent = step.dataset.caption || "";

    if (storyImage && step.dataset.image && storyImage.getAttribute("src") !== step.dataset.image) {
      storyVisual?.classList.add("is-changing");
      window.setTimeout(() => {
        storyImage.setAttribute("src", step.dataset.image);
        storyImage.setAttribute("alt", step.dataset.title || "DV Dream Homes story image");
        storyVisual?.classList.remove("is-changing");
      }, 240);
    }
  };

  if (storySteps.length) {
    const storyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveStory(entry.target);
      });
    }, { rootMargin: "-40% 0px -40% 0px", threshold: 0 });

    storySteps.forEach((step) => storyObserver.observe(step));
  }

  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll("[data-count]").forEach((number) => {
        const target = Number(number.dataset.count || "0");
        const suffix = number.dataset.suffix || "";
        const duration = 1200;
        const start = performance.now();

        const tick = (now) => {
          const progressValue = Math.min(1, (now - start) / duration);
          const current = Math.round(target * progressValue);
          number.textContent = current + suffix;
          if (progressValue < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      });
      statObserver.unobserve(entry.target);
    });
  }, { threshold: 0.35 });

  document.querySelectorAll(".stat-panel, .stats-grid").forEach((panel) => statObserver.observe(panel));

  const messageForm = document.getElementById("contactForm");
  if (messageForm) {
    messageForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = Object.fromEntries(new FormData(messageForm).entries());
      const payload = {
        ...formData,
        id: Date.now(),
        source: document.body.dataset.page || "website",
        timestamp: new Date().toISOString()
      };

      let messages = [];
      try {
        const saved = localStorage.getItem("dv_messages");
        messages = saved ? JSON.parse(saved) : [];
      } catch (error) {
        messages = [];
      }

      messages.unshift(payload);
      localStorage.setItem("dv_messages", JSON.stringify(messages));

      const status = document.getElementById("formStatus");
      if (status) {
        status.classList.add("visible");
        status.textContent = "Message sent successfully. We will contact you shortly.";
      }
      messageForm.reset();
    });
  }

  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = new Date().getFullYear();
  });
})();

