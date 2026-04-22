(function () {
  const TESTIMONIALS_FALLBACK = [
    {
      id: 1,
      author: "Mr. Shyam Sundar",
      quote: "My decision to purchase a flat with your team was strongly influenced by glowing recommendations from trusted people in and around the locality. Your extensive experience in constructing high-quality homes further reinforced my confidence, making this project a proud milestone in our lives. We are especially impressed by your attention to detail, commitment to craftsmanship, and your willingness to accommodate customizations to suit our requirements. We are proud to say that you are playing a key role in turning our dream of owning a home into reality. It is truly an honour to have our dream home built by your team, and we eagerly look forward to its completion.",
      rating: 5,
      avatar: "S"
    },
    {
      id: 2,
      author: "Mr. Kothandaraman",
      quote: "I personally witnessed the use of high-quality chamber bricks and ready-mix concrete at the site, which speaks volumes about the commitment to construction excellence. There is understandably a high level of expectation among the buyers and I am confident that the team will exceed those expectations. The entire management and staff at DV have been exceptionally friendly and cooperative throughout the process, making the journey smooth and reassuring.",
      rating: 5,
      avatar: "K"
    }
  ];

  const toSafeText = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const buildStars = (rating) => {
    const score = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));
    return "★".repeat(score) + "☆".repeat(5 - score);
  };

  const getAvatar = (item) => {
    const fromData = (item.avatar || "").trim();
    if (fromData) {
      return fromData.slice(0, 1).toUpperCase();
    }
    const fromAuthor = (item.author || "").trim();
    return fromAuthor ? fromAuthor.slice(0, 1).toUpperCase() : "D";
  };

  const buildTestimonialCard = (item) => {
    const author = toSafeText(item.author || "Customer");
    const quote = toSafeText(item.quote || "");
    const avatar = toSafeText(getAvatar(item));
    const stars = toSafeText(buildStars(item.rating));

    return `
      <article class="testimonial-card reveal visible">
        <div class="stars" aria-label="Five star rating">${stars}</div>
        <blockquote>${quote}</blockquote>
        <div class="testimonial-author">
          <span class="avatar">${avatar}</span>
          <span>${author}</span>
        </div>
      </article>`;
  };

  async function loadTestimonialsData() {
    try {
      const response = await fetch("/data/testimonials.json", { cache: "no-store" });
      if (!response.ok) {
        return TESTIMONIALS_FALLBACK;
      }
      const payload = await response.json();
      return Array.isArray(payload) && payload.length ? payload : TESTIMONIALS_FALLBACK;
    } catch {
      return TESTIMONIALS_FALLBACK;
    }
  }

  async function initTestimonialsSection() {
    const shell = document.getElementById("testimonialShell");
    const viewport = document.getElementById("testimonialViewport");
    const track = document.getElementById("testimonialTrack");
    const nextBtn = document.getElementById("testimonialNext");
    const dotsWrap = document.getElementById("testimonialDots");

    if (!shell || !viewport || !track || !nextBtn || !dotsWrap) {
      return;
    }

    const items = await loadTestimonialsData();

    let cardsPerSlide = 2;
    let slideCount = 1;
    let currentSlide = 0;
    let autoTimer = null;
    let isPaused = false;
    let isAnimating = false;

    const chunkItems = (source, size) => {
      const pages = [];
      for (let index = 0; index < source.length; index += size) {
        pages.push(source.slice(index, index + size));
      }
      return pages;
    };

    const buildTrackContent = (size) => {
      const pages = chunkItems(items, size);
      if (!pages.length) {
        return [];
      }

      if (pages.length > 1) {
        pages.push(pages[0]);
      }
      return pages;
    };

    const getCardsPerSlide = () => window.matchMedia("(max-width: 980px)").matches ? 1 : 2;

    const renderDots = () => {
      dotsWrap.innerHTML = "";
      if (slideCount <= 1) {
        return;
      }

      for (let index = 0; index < slideCount; index++) {
        const dot = document.createElement("button");
        dot.className = "testimonial-dot";
        dot.type = "button";
        dot.setAttribute("aria-label", `Go to testimonial slide ${index + 1}`);
        dot.addEventListener("click", () => {
          goToSlide(index);
          restartAuto();
        });
        dotsWrap.appendChild(dot);
      }
    };

    const setActiveDot = () => {
      const dots = Array.from(dotsWrap.querySelectorAll(".testimonial-dot"));
      const dotIndex = slideCount > 0 ? Math.min(currentSlide, slideCount - 1) : 0;
      dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === dotIndex);
      });
    };

    const renderTrack = () => {
      const pages = buildTrackContent(cardsPerSlide);
      track.innerHTML = pages.map(function (page) {
        return `
          <div class="testimonial-slide">
            ${page.map(buildTestimonialCard).join("")}
          </div>`;
      }).join("");
    };

    const applyTransform = (smooth = true) => {
      track.style.transitionDuration = smooth ? "700ms" : "0ms";
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
      isAnimating = smooth;
      setActiveDot();
    };

    const updateSliderMode = () => {
      cardsPerSlide = getCardsPerSlide();
      slideCount = Math.max(1, Math.ceil(items.length / cardsPerSlide));
      const shouldSlide = slideCount > 1;

      renderTrack();
      shell.classList.toggle("is-slider", shouldSlide);
      track.classList.toggle("is-slider", shouldSlide);

      if (currentSlide >= slideCount) {
        currentSlide = 0;
      }

      renderDots();
      setActiveDot();
      applyTransform(false);
    };

    const goToSlide = (index, smooth = true) => {
      if (slideCount <= 1) {
        currentSlide = 0;
        applyTransform(false);
        return;
      }

      currentSlide = Math.max(0, Math.min(index, slideCount));
      applyTransform(smooth);
    };

    const nextSlide = () => {
      if (slideCount <= 1) {
        return;
      }
      if (isAnimating) {
        return;
      }
      if (currentSlide >= slideCount) {
        currentSlide = 0;
        applyTransform(false);
      }
      goToSlide(currentSlide + 1);
    };

    const stopAuto = () => {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
      }
    };

    const startAuto = () => {
      stopAuto();
      if (slideCount > 1 && !isPaused) {
        autoTimer = window.setInterval(() => {
          nextSlide();
        }, 5000);
      }
    };

    const restartAuto = () => {
      startAuto();
    };

    const pauseAuto = () => {
      isPaused = true;
      stopAuto();
    };

    const resumeAuto = () => {
      isPaused = false;
      startAuto();
    };

    nextBtn.addEventListener("click", () => {
      nextSlide();
      restartAuto();
    });

    viewport.addEventListener("pointerdown", pauseAuto);
    viewport.addEventListener("pointerup", resumeAuto);
    viewport.addEventListener("pointercancel", resumeAuto);
    viewport.addEventListener("pointerleave", () => {
      if (isPaused) {
        resumeAuto();
      }
    });

    track.addEventListener("transitionend", () => {
      isAnimating = false;
      if (currentSlide === slideCount) {
        currentSlide = 0;
        applyTransform(false);
      }
    });

    window.addEventListener("resize", () => {
      updateSliderMode();
      restartAuto();
    });

    updateSliderMode();
    startAuto();
  }

  const loadCompletedProjectsData = async () => {
    try {
      const response = await fetch("/api/completed-projects", { cache: "no-store" });
      if (!response.ok) {
        return [];
      }

      const payload = await response.json();
      return Array.isArray(payload) ? payload : [];
    } catch {
      return [];
    }
  };

  const buildCompletedProjectCard = (item, index) => {
    const title = toSafeText(item.title || "Completed Project");
    const description = toSafeText(item.description || "");
    const projectType = toSafeText(item.project_type || item.projectType || "Completed Residence");
    const location = toSafeText(item.location || "Not specified");
    const completedIn = toSafeText(item.completed_in || item.completedIn || "Not specified");
    const units = toSafeText(item.units || "Not specified");
    const builtUpArea = toSafeText(item.built_up_area || item.builtUpArea || "Not specified");
    const image = toSafeText(item.image || "");

    return `
      <article class="completed-project-card reveal visible">
        <div class="completed-project-media">
          ${image ? `<img src="${image}" alt="${title}">` : ""}
          <span class="completed-project-index"><i class="fas fa-star"></i> Project ${String(index + 1).padStart(2, "0")}</span>
        </div>
        <div class="completed-project-content">
          <div class="completed-project-heading">
            <p class="completed-project-kicker">${projectType}</p>
            <h3>${title}</h3>
            <p>${description}</p>
          </div>
          <table class="completed-project-table" aria-label="${title} project details">
            <tbody>
              <tr>
                <th scope="row">Location</th>
                <td>${location}</td>
              </tr>
              <tr>
                <th scope="row">Completed In</th>
                <td>${completedIn}</td>
              </tr>
              <tr>
                <th scope="row">Units</th>
                <td>${units}</td>
              </tr>
              <tr>
                <th scope="row">Built-up Area</th>
                <td>${builtUpArea}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>`;
  };

  async function initCompletedProjectsSection() {
    const list = document.getElementById("completedProjectsList");
    if (!list) {
      return;
    }

    const projects = await loadCompletedProjectsData();
    if (!projects.length) {
      list.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--muted);">No completed projects yet.</p>';
      return;
    }

    list.innerHTML = projects.map((item, index) => buildCompletedProjectCard(item, index)).join("");
  }

  const loadOngoingProjectsData = async () => {
    try {
      const response = await fetch("/api/ongoing-projects", { cache: "no-store" });
      if (!response.ok) {
        return [];
      }

      const payload = await response.json();
      return Array.isArray(payload) ? payload : [];
    } catch {
      return [];
    }
  };

  const buildOngoingProjectCard = (item) => {
    const title = toSafeText(item.title || "Project");
    const tag = toSafeText(item.tag || "Ongoing");
    const description = toSafeText(item.description || "");
    const metaOne = toSafeText(item.meta_one || "");
    const metaTwo = toSafeText(item.meta_two || "");
    const image = toSafeText(item.image || "");
    const link = toSafeText(item.link || "#");

    return `
      <article class="project-card reveal visible">
        ${image ? `<img src="${image}" alt="${title} project">` : ""}
        <div class="project-body">
          <span class="project-tag">${tag}</span>
          <h3>${title}</h3>
          <p>${description}</p>
          <div class="project-meta">
            <span>${metaOne}</span>
            <span>${metaTwo}</span>
          </div>
          <a href="${link}" class="btn btn-primary"><i class="fas fa-arrow-right"></i> View Project</a>
        </div>
      </article>`;
  };

  async function initOngoingProjectsSection() {
    const grid = document.getElementById("ongoingProjectGrid");
    if (!grid) {
      return;
    }

    const projects = await loadOngoingProjectsData();
    if (!projects.length) {
      grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666;">No ongoing projects yet.</p>';
      return;
    }

    grid.innerHTML = projects.map((item) => buildOngoingProjectCard(item)).join("");
  }

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

  initTestimonialsSection();
  initCompletedProjectsSection();
  initOngoingProjectsSection();

  const messageForm = document.getElementById("contactForm");
  if (messageForm) {
    messageForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const formData = Object.fromEntries(new FormData(messageForm).entries());
      const status = document.getElementById("formStatus");
      const submitButton = messageForm.querySelector('button[type="submit"]');

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: formData.name || "",
            email: formData.email || "",
            subject: formData.subject || "",
            message: formData.message || ""
          })
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Failed to send message.");
        }

        if (status) {
          status.classList.add("visible");
          status.style.color = "var(--gold)";
          status.textContent = "Message sent successfully. We will contact you shortly.";
        }
        messageForm.reset();
      } catch (error) {
        if (status) {
          status.classList.add("visible");
          status.style.color = "#ff8f8f";
          status.textContent = error.message || "Failed to send message. Please try again.";
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Send Message";
        }
      }

      if (status) {
        window.setTimeout(() => {
          status.classList.remove("visible");
        }, 7000);
      }
    });
  }

  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = new Date().getFullYear();
  });
})();

