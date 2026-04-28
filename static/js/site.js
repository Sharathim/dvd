(function () {
  const BRAND_LOGO_PATH = "static/assets/images/dv-logo.png";

  window.openFloorPlanModal = (imagePath, projectTitle) => {
    const modalId = "floorPlanModal";
    let modal = document.getElementById(modalId);

    if (!modal) {
      modal = document.createElement("div");
      modal.id = modalId;
      modal.className = "floor-modal-overlay";
      modal.innerHTML = `
        <div class="floor-modal-content">
          <div class="floor-modal-header">
            <h3 id="floorModalTitle"></h3>
            <button class="floor-modal-close" onclick="closeFloorPlanModal()">&times;</button>
          </div>
          <div class="floor-modal-body">
            <img id="floorModalImage" src="" alt="Floor Plan">
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeFloorPlanModal();
      });
    }

    document.getElementById("floorModalTitle").textContent = projectTitle + " - Floor Plan";
    const img = document.getElementById("floorModalImage");
    img.src = imagePath;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  window.closeFloorPlanModal = () => {
    const modal = document.getElementById("floorPlanModal");
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }
  };

  const applyGlobalBranding = () => {
    const existingIcon = document.querySelector("link[rel='icon']");
    if (existingIcon) {
      existingIcon.setAttribute("href", BRAND_LOGO_PATH);
      existingIcon.setAttribute("type", "image/png");
    } else {
      const icon = document.createElement("link");
      icon.setAttribute("rel", "icon");
      icon.setAttribute("type", "image/png");
      icon.setAttribute("href", BRAND_LOGO_PATH);
      document.head.appendChild(icon);
    }

    document.querySelectorAll(".brand-mark").forEach((brandMark) => {
      if (brandMark.querySelector("img.brand-logo-image")) {
        return;
      }

      brandMark.textContent = "";
      const logoImage = document.createElement("img");
      logoImage.className = "brand-logo-image";
      logoImage.src = BRAND_LOGO_PATH;
      logoImage.alt = "DV Dream Homes";
      logoImage.loading = "lazy";
      brandMark.appendChild(logoImage);
    });
  };

  applyGlobalBranding();

  const initPageLoader = () => {
    const pageLoader = document.getElementById("pageLoader");
    if (!pageLoader) {
      return;
    }

    const shownAt = performance.now();
    const minimumVisibleMs = 3000;
    const absoluteFallbackMs = 4800;
    let hasClosed = false;
    const dismissLoader = () => {
      if (hasClosed) {
        return;
      }

      hasClosed = true;
      pageLoader.classList.add("is-hidden");
      document.body.classList.remove("page-loader-active");

      window.setTimeout(() => {
        pageLoader.remove();
      }, 420);
    };

    const dismissWhenReady = () => {
      const elapsed = performance.now() - shownAt;
      const remaining = Math.max(0, minimumVisibleMs - elapsed);
      window.setTimeout(dismissLoader, remaining);
    };

    window.addEventListener("load", dismissWhenReady, { once: true });
    window.setTimeout(dismissWhenReady, minimumVisibleMs);
    window.setTimeout(dismissLoader, absoluteFallbackMs);
  };

  initPageLoader();

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

  const ONGOING_PROJECT_PREVIEW_KEY = "dv_ongoing_project_preview";

  const toSlug = (value) => String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "project";

  const getOngoingProjectSlug = (item) => {
    const explicitSlug = String(item.slug || "").trim();
    if (explicitSlug) {
      return toSlug(explicitSlug);
    }

    const legacyLink = String(item.link || "").trim();
    if (legacyLink.endsWith(".html")) {
      return toSlug(legacyLink.replace(/\.html$/i, ""));
    }

    return toSlug(item.title || "project");
  };

  const getOngoingPreviewProject = (selectedSlug) => {
    try {
      const rawPreview = sessionStorage.getItem(ONGOING_PROJECT_PREVIEW_KEY);
      if (!rawPreview) {
        return null;
      }

      const parsed = JSON.parse(rawPreview);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }

      const previewSlug = getOngoingProjectSlug(parsed);
      if (!previewSlug || previewSlug !== selectedSlug) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  };

  const toArray = (value) => Array.isArray(value) ? value.filter(Boolean).map((entry) => String(entry).trim()).filter(Boolean) : [];

  const getOngoingProjectDetail = (project) => {
    const detail = (project && typeof project.detail === "object" && project.detail) ? project.detail : {};
    const stats = toArray(detail.stats).slice(0, 6);
    const highlights = toArray(detail.highlights).slice(0, 8);
    const nearbyPlaces = toArray(detail.nearby_places).slice(0, 8);
    const centralTags = toArray(detail.central_tags).slice(0, 8);
    const centralList = toArray(detail.central_list).slice(0, 10);

    return {
      coverImage: detail.cover_image || project.image || "",
      location: detail.location || "Not specified",
      summaryTitle: detail.summary_title || "Great location to match the great value",
      summary: detail.summary || project.description || "",
      detailsIntro: detail.details_intro || "",
      stats,
      floorPlanImage: detail.floor_plan_image || "",
      catalogueUrl: detail.catalogue_url || "",
      highlightsIntro: detail.highlights_intro || "",
      highlights,
      locationHeading: detail.location_heading || "Highly Prosperous Location",
      locationSubtitle: detail.location_subtitle || "",
      nearbyPlaces,
      centralHeading: detail.central_heading || "Centrally Located",
      centralTags,
      centralListTitle: detail.central_list_title || "Nearby Highlights",
      centralList,
      centralImage: detail.central_image || project.image || ""
    };
  };



  const renderOngoingProjectDetailPage = (project) => {
    const main = document.querySelector("main");
    if (!main || !project) {
      return;
    }

    const title = toSafeText(project.title || "Project");
    const detail = getOngoingProjectDetail(project);
    const coverImage = toSafeText(detail.coverImage);
    const location = toSafeText(detail.location);
    const summaryTitle = toSafeText(detail.summaryTitle);
    const summary = toSafeText(detail.summary);
    const detailsIntro = toSafeText(detail.detailsIntro);
    const highlightsIntro = toSafeText(detail.highlightsIntro);

    const statsHtml = detail.stats.length
      ? `<div class="stats-grid stats-grid-spaced">${detail.stats.map((item) => `<div class="stat">${toSafeText(item)}</div>`).join("")}</div>`
      : "";

    const highlightsHtml = detail.highlights.length
      ? `<div class="container stats-grid stats-grid-spaced">${detail.highlights.map((item) => `<div class="stat">${toSafeText(item)}</div>`).join("")}</div>`
      : "";

    const nearbyHtml = detail.nearbyPlaces.length
      ? `<div class="container stats-grid stats-grid-spaced">${detail.nearbyPlaces.map((item) => `<div class="stat">${toSafeText(item)}</div>`).join("")}</div>`
      : "";

    const centralTagsHtml = detail.centralTags.length
      ? detail.centralTags.map((item) => `<span>${toSafeText(item)}</span>`).join("")
      : "";

    const centralListHtml = detail.centralList.length
      ? detail.centralList.map((item) => `<li>${toSafeText(item)}</li>`).join("")
      : "<li>Not specified</li>";

    const catalogueUrl = toSafeText(detail.catalogueUrl || "#");
    const floorPlanImage = toSafeText(detail.floorPlanImage);
    const centralImage = toSafeText(detail.centralImage);

    const pageHero = document.querySelector(".page-hero");
    if (pageHero) {
      pageHero.style.backgroundImage = "url('./static/images/ongoing2.jpg')";
    }
    const pageHeroTitle = document.querySelector(".page-hero-content h1");
    if (pageHeroTitle) {
      pageHeroTitle.textContent = project.title || "Ongoing Project";
    }

    document.title = `${project.title || "Ongoing Project"} | DV Dream Homes`;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute("content", project.description || "DV Dream Homes ongoing project details.");
    }

    main.innerHTML = `
      <section class="section">
        <div class="container" style="margin-bottom: 1rem;">
          <a href="ongoing-projects.html" class="btn btn-outline"><i class="fas fa-arrow-left"></i> Back to Ongoing Projects</a>
        </div>
        <div class="container split-card">
          <div class="image-wrap">
            ${coverImage ? `<img src="${coverImage}" alt="${title} main image">` : ""}
          </div>
          <div>
            <h3 class="project-headline">${title}</h3>
            <h4>${location}</h4>
            <p><strong>${summaryTitle}</strong></p>
            <p style="white-space: pre-wrap;">${summary}</p>
          </div>
        </div>
      </section>

      <section class="section-band"><p>Project Details</p></section>

      <section class="section-tight">
        <div class="container section-copy text-center">
          ${detailsIntro ? `<p>${detailsIntro}</p>` : ""}
          ${statsHtml}
        </div>
      </section>

      <section class="section">
        <div class="container section-title">
          <p class="kicker">Floor Plan</p>
          <div class="floor-image">
            ${floorPlanImage ? `<img src="${floorPlanImage}" alt="${title} floor plan">` : `<div style="padding: 40px; text-align: center; border: 2px dashed #ccc; color: #666; font-weight: bold; border-radius: 8px;">Coming Soon</div>`}
          </div>
        </div>
      </section>

      <section class="section-band"><p>Catalogue</p></section>
      <section class="section-tight">
        <div class="container text-center">
          ${catalogueUrl && catalogueUrl !== "#" ? `<a href="${catalogueUrl}" class="btn btn-red" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-arrow-down"></i> Download Catalogue (PDF)</a>` : `<div style="padding: 20px; color: #666; font-style: italic;">Will be uploaded soon</div>`}
        </div>
      </section>

      ${(detail.highlights.length || highlightsIntro) ? `
        <section class="section-band"><p>Key Project Highlights</p></section>
        <section class="section-tight">
          <div class="container section-copy text-center">
            ${highlightsIntro ? `<p>${highlightsIntro}</p>` : ""}
          </div>
          ${highlightsHtml}
        </section>` : ""}

      ${(detail.nearbyPlaces.length || detail.locationSubtitle) ? `
        <section class="section section-alt">
          <div class="container section-title">
            <h2>${toSafeText(detail.locationHeading)}</h2>
            ${detail.locationSubtitle ? `<p>${toSafeText(detail.locationSubtitle)}</p>` : ""}
          </div>
          ${nearbyHtml}
        </section>` : ""}

      ${(detail.centralTags.length || detail.centralList.length) ? `
        <section class="section">
          <div class="container section-title">
            <h2>${toSafeText(detail.centralHeading)}</h2>
          </div>
          <div class="container central-grid">
            <div>
              ${centralTagsHtml ? `<div class="central-tags">${centralTagsHtml}</div>` : ""}
              ${centralImage ? `<img src="${centralImage}" alt="${title} surroundings">` : ""}
            </div>
            <div>
              <h4>${toSafeText(detail.centralListTitle)}</h4>
              <ul>${centralListHtml}</ul>
            </div>
          </div>
        </section>` : ""}

    `;
  };

  const buildOngoingProjectCard = (item) => {
    const title = toSafeText(item.title || "Project");
    const tag = toSafeText(item.tag || "Ongoing");
    const description = toSafeText(item.description || "");
    const metaLine = toSafeText(item.metaline || item.meta_line || "");
    const image = toSafeText(item.image || "");
    const link = `ongoing-projects.html?project=${encodeURIComponent(getOngoingProjectSlug(item))}`;

    return `
      <article class="project-card reveal visible">
        ${image ? `<img src="${image}" alt="${title} project">` : ""}
        <div class="project-body">
          <span class="project-tag">${tag}</span>
          <h3>${title}</h3>
          <p>${description}</p>
          <div class="project-meta">
            ${metaLine ? `<span>${metaLine}</span>` : ""}
          </div>
          <div class="project-card-footer">
            <a href="${link}" class="btn btn-primary"><i class="fas fa-arrow-right"></i> View Project</a>
            ${item.floorPlan || item.floor_plan ? `
              <button class="floor-plan-btn" onclick="openFloorPlanModal('${toSafeText(item.floorPlan || item.floor_plan)}', '${title}')" title="View Floor Plan">
                <i class="fas fa-map"></i>
              </button>
            ` : ""}
          </div>
        </div>
      </article>`;
  };

  async function initOngoingProjectsSection() {
    const grid = document.getElementById("ongoingProjectGrid");
    if (!grid) {
      return;
    }

    const projects = await loadOngoingProjectsData();
    const queryParams = new URLSearchParams(window.location.search);
    const selectedSlug = toSlug(queryParams.get("project") || "");
    const isPreviewMode = queryParams.get("preview") === "1";

    if (selectedSlug) {
      const apiProject = projects.find((item) => getOngoingProjectSlug(item) === selectedSlug);
      const previewProject = isPreviewMode ? getOngoingPreviewProject(selectedSlug) : null;
      const selectedProject = previewProject || apiProject;

      if (selectedProject) {
        renderOngoingProjectDetailPage(selectedProject);
        return;
      }
    }

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

  const initMobileStorySlider = () => {
    const storySuite = document.querySelector(".story-suite");
    if (!storySuite || !storySteps.length) return;

    const wrap = document.createElement("div");
    wrap.className = "story-mobile-wrap";
    wrap.id = "storyMobileWrap";

    const sticky = document.createElement("div");
    sticky.className = "story-mobile-sticky";

    const imgTrack = document.createElement("div");
    imgTrack.className = "mobile-images-track";
    imgTrack.id = "mobileImagesTrack";

    const txtTrack = document.createElement("div");
    txtTrack.className = "mobile-texts-track";
    txtTrack.id = "mobileTextsTrack";

    const n = storySteps.length;
    imgTrack.style.width = `${n * 100}vw`;
    txtTrack.style.width = `${n * 100}vw`;

    const revSteps = [...storySteps].reverse();
    revSteps.forEach(step => {
      const slide = document.createElement("div");
      slide.className = "mobile-slide-img";
      const img = document.createElement("img");
      img.src = step.dataset.image;
      img.alt = step.dataset.title || "Story image";
      slide.appendChild(img);
      imgTrack.appendChild(slide);
    });

    storySteps.forEach((step, index) => {
      const slide = document.createElement("div");
      slide.className = "mobile-slide-txt";
      slide.innerHTML = step.innerHTML;

      const stepIndex = document.createElement("div");
      stepIndex.className = "mobile-step-index";
      stepIndex.textContent = `0${index + 1} / 0${n}`;
      slide.prepend(stepIndex);

      txtTrack.appendChild(slide);
    });

    sticky.appendChild(imgTrack);
    sticky.appendChild(txtTrack);
    wrap.appendChild(sticky);

    const layout = storySuite.querySelector(".story-layout");
    if (layout) {
      layout.parentNode.insertBefore(wrap, layout.nextSibling);
    } else {
      storySuite.appendChild(wrap);
    }

    // Set container height dynamically based on number of slides to ensure sufficient scrolling length.
    wrap.style.height = `${n * 100}vh`;

    let isMobile = window.innerWidth <= 980;

    let snapTimeout = null;
    let isSnapping = false;

    const onScroll = () => {
      if (!isMobile) return;

      const navH = 74;
      const rect = wrap.getBoundingClientRect();
      const stickyH = window.innerHeight - navH;
      const maxScroll = Math.max(1, rect.height - stickyH);
      const scrollTop = navH - rect.top;

      let progress = 0;
      if (scrollTop > 0) {
        progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
      }

      const maxTrans = ((n - 1) / n) * 100;
      txtTrack.style.transform = `translate3d(${-progress * maxTrans}%, 0, 0)`;
      imgTrack.style.transform = `translate3d(${-maxTrans + (progress * maxTrans)}%, 0, 0)`;

      if (!isSnapping && scrollTop > 5 && scrollTop < maxScroll - 5) {
        clearTimeout(snapTimeout);
        snapTimeout = setTimeout(() => {
          if (!isMobile) return;

          const currentScrollTop = navH - wrap.getBoundingClientRect().top;
          if (currentScrollTop > 5 && currentScrollTop < maxScroll - 5) {
            const snapProgress = currentScrollTop / maxScroll;
            const targetIndex = Math.round(snapProgress * (n - 1));
            const targetScrollTop = targetIndex * (maxScroll / (n - 1));

            if (Math.abs(currentScrollTop - targetScrollTop) > 10) {
              isSnapping = true;
              const absoluteTarget = window.scrollY + wrap.getBoundingClientRect().top - navH + targetScrollTop;

              window.scrollTo({
                top: absoluteTarget,
                behavior: "smooth"
              });

              setTimeout(() => { isSnapping = false; }, 600);
            }
          }
        }, 150);
      }
    };

    window.addEventListener("scroll", () => {
      requestAnimationFrame(onScroll);
    }, { passive: true });

    window.addEventListener("resize", () => {
      isMobile = window.innerWidth <= 980;
      if (!isMobile) {
        txtTrack.style.transform = "";
        imgTrack.style.transform = "";
      } else {
        requestAnimationFrame(onScroll);
      }
    });

    requestAnimationFrame(onScroll);
  };

  initMobileStorySlider();

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

  const numberedBlocks = document.querySelectorAll(".numbered-block");
  if (numberedBlocks.length) {
    let isMobileView = window.innerWidth <= 980;

    window.addEventListener("resize", () => {
      isMobileView = window.innerWidth <= 980;
      if (!isMobileView) {
        numberedBlocks.forEach(b => b.classList.remove("is-hovered"));
      }
    });

    const blockObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!isMobileView) return;

        if (entry.isIntersecting) {
          entry.target.classList.add("is-hovered");
        } else {
          entry.target.classList.remove("is-hovered");
        }
      });
    }, { rootMargin: "-35% 0px -35% 0px", threshold: 0 });

    numberedBlocks.forEach((block) => blockObserver.observe(block));
  }

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

