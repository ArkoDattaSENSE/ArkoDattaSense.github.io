let ACTIVE_VERTICAL = "all";
let ACTIVE_TYPE = "all";

let VERTICAL_META = {};
let VERTICAL_VIDEO = {};
let VERTICAL_NAMES = {};
let TYPE_NAMES = {};

// YouTube Player API tracking
let mainPlayer = null;
let modalPlayer = null;
let currentTimestamp = 0;
let wasPlayingMain = false;
let wasPlayingModal = false;

/* ========================================================= */
/* =================== YOUTUBE API SETUP =================== */
/* ========================================================= */

// Load YouTube IFrame API
function loadYouTubeAPI() {
  if (window.YT) return;
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Called automatically by YouTube API when ready
window.onYouTubeIframeAPIReady = function () {
};

function initYouTubePlayer(iframeId, onReady) {
  if (!window.YT || !window.YT.Player) {
    setTimeout(() => initYouTubePlayer(iframeId, onReady), 100);
    return;
  }

  const iframe = document.getElementById(iframeId);
  if (!iframe) return null;

  const removeLoader = () => {
    const container = iframe.parentElement;
    const loader = container ? container.querySelector('.video-loader') : null;
    if (loader) {
      loader.style.transition = "opacity 0.3s ease";
      loader.style.opacity = "0";
      setTimeout(() => loader.remove(), 300);
    }
  };

  return new YT.Player(iframeId, {
    events: {
      'onReady': (event) => {
        // Remove loader when player is ready
        removeLoader();
        if (onReady) onReady(event);
      },
      'onStateChange': (event) => {
        // Also remove if it starts playing/buffering (backup for mobile)
        if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.BUFFERING) {
          removeLoader();
        }
      }
    }
  });
}

/* ========================================================= */
/* ====================== BOOTSTRAP ======================== */
/* ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadYouTubeAPI();

  fetch("pages.json")
    .then(r => r.json())
    .then(pages => {
      pages.sort((a, b) => a.order - b.order);
      const nav = document.getElementById("nav-items");

      pages.forEach((p, i) => {
        const li = document.createElement("li");
        li.className = "nav-item";

        const a = document.createElement("a");
        a.className = "nav-link";
        a.textContent = p.title;
        a.href = "#";
        a.onclick = () => loadPage(p.link);

        li.appendChild(a);
        nav.appendChild(li);

        if (i === 0) loadPage(p.link);
      });
    });

  updateStickyFilterPosition();
  window.addEventListener("resize", updateStickyFilterPosition);
});

function updateStickyFilterPosition() {
  const tabs = document.querySelector(".nav-tabs");
  const filters = document.getElementById("filters-mobile");
  if (tabs && filters && window.innerWidth < 768) {
    filters.style.top = `${tabs.offsetHeight}px`;
  }
}

function loadPage(page) {
  fetch(`pages/${page}`)
    .then(r => r.text())
    .then(html => {
      document.getElementById("content").innerHTML = html;
      loadPublications();
      loadNews();
      loadSimpleList("awards.json", "awards-content", "awards");
      loadSimpleList("teaching.json", "teaching-content", "teaching");
      loadSimpleList("service.json", "service-content", "service");
    });
}

/* ========================================================= */
/* ================= VIDEO NORMALIZATION =================== */
/* ========================================================= */

function renderVideoEmbed(video, isModal = false) {
  if (!video || !video.trim()) return "";

  const v = video.trim();
  let id = "";

  // ... (keep your existing ID extraction logic) ...
  try {
    const url = new URL(v);
    if (url.hostname.includes("youtu.be")) {
      id = url.pathname.slice(1);
    } else if (url.searchParams.get("v")) {
      id = url.searchParams.get("v");
    }
  } catch (_) { }

  if (id) {
    const iframeId = isModal ? 'modal-youtube-player' : 'main-youtube-player';
    return `
      <div class="ratio ratio-16x9 position-relative bg-dark" style="overflow: hidden; background: #000;">
        <div class="video-loader d-flex justify-content-center align-items-center position-absolute w-100 h-100 bg-dark" 
             style="z-index: 3; top:0; left:0; pointer-events: none;">
          <div class="spinner-border text-light" role="status"></div>
        </div>
        <iframe
          id="${iframeId}"
          src="https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0&autoplay=0"
          frameborder="0"
          style="position: absolute; z-index: 3; top:0; left:0; width:100%; height:100%;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      </div>
    `;
  }
  return "";
}


function renderPublicationVideo(pub) {
  if (!pub.video || !pub.video.trim()) return "";

  let videoId = "";

  try {
    const url = new URL(pub.video.trim());
    if (url.hostname.includes("youtu.be")) {
      videoId = url.pathname.slice(1);
    } else if (url.searchParams.get("v")) {
      videoId = url.searchParams.get("v");
    }
  } catch (_) { }

  if (!videoId) return "";

  const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return `
    <div class="ratio ratio-16x9 position-relative mb-3" style="overflow:hidden">
      
      <!-- Thumbnail placeholder -->
      <img
        src="${thumb}"
        class="position-absolute w-100 h-100"
        style="object-fit:cover; z-index:2"
        data-role="pub-video-placeholder"
      />

      <!-- Iframe -->
      <iframe
        src="https://www.youtube.com/embed/${videoId}"
        class="position-absolute w-100 h-100"
        style="border:0; z-index:1"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        onload="
          const img=this.parentElement.querySelector('[data-role=pub-video-placeholder]');
          if(img) img.remove();
        "
      ></iframe>
    </div>
  `;
}

/* ========================================================= */
/* ===================== PUBLICATIONS ====================== */
/* ========================================================= */

function loadPublications() {
  fetch("pubs.json")
    .then(r => r.json())
    .then(pubs => {
      pubs.sort((a, b) => a.order - b.order);
      window.__PUBS__ = pubs;
      loadFilters();
    });
}

function enablePublicationClicks() {
  document.querySelectorAll('[data-role="pub-grid"]').forEach(grid => {
    grid.onclick = e => {
      const img = e.target.closest(".pub-thumb");
      if (img) {
        openModal(window.__PUBS__[img.dataset.pubIndex]);
        return;
      }

      const badge = e.target.closest(".filter-badge");
      if (badge) {
        e.stopPropagation();

        if (badge.dataset.filterType === "vertical") {
          ACTIVE_VERTICAL = badge.dataset.filterValue;
        } else {
          ACTIVE_TYPE = badge.dataset.filterValue;
        }

        updateAllFilters();
        updateVerticalDescription();
        renderFilteredPublications();

        const modal = document.getElementById("publicationsModal");
        if (modal && modal.classList.contains("show")) {
          renderModalPublications();
          updateModalVerticalDescription();
        }
      }
    };
  });
}

function updateAllFilters() {
  ["filter-vertical", "modal-filter-vertical"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = ACTIVE_VERTICAL;
  });

  ["filter-type", "modal-filter-type"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = ACTIVE_TYPE;
  });

  const mv = document.querySelector(".filter-vertical");
  const mt = document.querySelector(".filter-type");
  if (mv) mv.value = ACTIVE_VERTICAL;
  if (mt) mt.value = ACTIVE_TYPE;

  updateModalVerticalDescription();
}

function openModal(pub) {
  // 1. Define the element FIRST
  const modalEl = document.getElementById("pubModal");

  // 2. Now you can use it
  document.getElementById("modalTitle").innerHTML = pub.title;
  document.getElementById("modalAuthors").innerHTML = pub.authors;
  document.getElementById("modalVenue").innerHTML = pub.venue;
  document.getElementById("modalAbstract").innerHTML = renderPublicationVideo(pub) + pub.abstract;

  // PATCH: Clear abstract (and stop video) when closed
  modalEl.addEventListener('hidden.bs.modal', () => {
    document.getElementById("modalAbstract").innerHTML = "";
  }, { once: true });

  const actions = document.getElementById("modalActions");
  actions.innerHTML = "";
  if (pub.pdf) actions.innerHTML += `<a href="${pub.pdf}" class="btn btn-primary">PDF</a>`;
  if (pub.website) actions.innerHTML += `<a href="${pub.website}" class="btn btn-outline-secondary">Website</a>`;

  const modal = new bootstrap.Modal(modalEl);
  modalEl.style.zIndex = 1060;

  modalEl.addEventListener("shown.bs.modal", function fixBackdrop() {
    const backdrops = document.querySelectorAll(".modal-backdrop");
    if (backdrops.length) {
      backdrops[backdrops.length - 1].style.zIndex = 1055;
    }
    modalEl.removeEventListener("shown.bs.modal", fixBackdrop);
  });

  modal.show();
}


/* ========================================================= */
/* ======================== NEWS =========================== */
/* ========================================================= */

function loadNews() {
  fetch("news.json")
    .then(r => r.json())
    .then(news => {
      news.sort((a, b) => a.order - b.order);
      const d = document.getElementById("news-content");
      const m = document.getElementById("news-content-mobile");
      if (!d) return;

      d.innerHTML = "";
      news.forEach(n => {
        const li = document.createElement("li");
        li.innerHTML = `${n.date}: ${n.text}`;
        d.appendChild(li);
      });
      if (m) m.innerHTML = d.innerHTML;
    });
}

/* ========================================================= */
/* ===================== SIMPLE LIST ======================= */
/* ========================================================= */

function loadSimpleList(jsonFile, desktopId, mobileId) {
  fetch(jsonFile)
    .then(r => r.json())
    .then(items => {
      items.sort((a, b) => a.order - b.order);
      const d = document.getElementById(desktopId);
      const m = document.getElementById(mobileId);
      if (!d) return;

      const ul = document.createElement("ul");
      items.forEach(it => {
        const li = document.createElement("li");
        li.innerHTML = it.text + "<br><br>";
        ul.appendChild(li);
      });

      d.innerHTML = "";
      d.appendChild(ul);
      if (m) m.innerHTML = ul.outerHTML;
    });
}

/* ========================================================= */
/* ======================== FILTERS ======================== */
/* ========================================================= */

function loadFilters() {
  Promise.all([
    fetch("research_vertical.json").then(r => r.json()),
    fetch("publication_type.json").then(r => r.json())
  ]).then(([verticals, types]) => {
    const vSel = document.getElementById("filter-vertical");
    const tSel = document.getElementById("filter-type");
    if (!vSel || !tSel) return;

    vSel.innerHTML = "";
    tSel.innerHTML = "";

    verticals.forEach(v => {
      VERTICAL_META[v.id] = v.description || "";
      VERTICAL_VIDEO[v.id] = v.video || "";
      VERTICAL_NAMES[v.id] = v.name;
      vSel.innerHTML += `<option value="${v.id}">${v.name}</option>`;
    });

    types.forEach(t => {
      TYPE_NAMES[t.id] = t.name;
      tSel.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });

    vSel.onchange = () => {
      ACTIVE_VERTICAL = vSel.value;
      syncAllFilters();
      updateVerticalDescription();
      renderFilteredPublications();
    };

    tSel.onchange = () => {
      ACTIVE_TYPE = tSel.value;
      syncAllFilters();
      renderFilteredPublications();
    };

    document.getElementById("clear-filters").onclick = clearAllFilters;

    // Mobile clear button uses a class, not ID
    const clearMobile = document.querySelector(".clear-filters");
    if (clearMobile) {
      clearMobile.onclick = clearAllFilters;
    }

    document.getElementById("expand-publications")
      ?.addEventListener("click", openPublicationsModal);

    updateVerticalDescription();
    renderFilteredPublications();
  });
}

function clearAllFilters() {
  ACTIVE_VERTICAL = "all";
  ACTIVE_TYPE = "all";
  syncAllFilters();
  updateVerticalDescription();
  renderFilteredPublications();

  const modal = document.getElementById("publicationsModal");
  if (modal && modal.classList.contains("show")) {
    updateModalVerticalDescription();
    renderModalPublications();
  }
}

function syncAllFilters() {
  // Desktop filters
  const dv = document.getElementById("filter-vertical");
  const dt = document.getElementById("filter-type");
  if (dv) dv.value = ACTIVE_VERTICAL;
  if (dt) dt.value = ACTIVE_TYPE;

  // Mobile filters (main page)
  const mv = document.querySelector(".filter-vertical");
  const mt = document.querySelector(".filter-type");
  if (mv) mv.value = ACTIVE_VERTICAL;
  if (mt) mt.value = ACTIVE_TYPE;

  // Modal filters
  const modalV = document.getElementById("modal-filter-vertical");
  const modalT = document.getElementById("modal-filter-type");
  if (modalV) modalV.value = ACTIVE_VERTICAL;
  if (modalT) modalT.value = ACTIVE_TYPE;
}

/* ========================================================= */
/* =============== VERTICAL DESCRIPTION ==================== */
/* ========================================================= */

function updateVerticalDescription() {
  const desktopDesc = document.getElementById("vertical-description");
  const mobileDesc = document.querySelector(".vertical-description");

  const targets = [desktopDesc, mobileDesc].filter(Boolean);

  // Fade out
  targets.forEach(el => {
    el.classList.remove("desc-fade-in");
    el.classList.add("desc-fade-out");
  });

  setTimeout(() => {
    // Update content AFTER fade-out
    renderVerticalBlock(desktopDesc, false);
    renderVerticalBlock(mobileDesc, true);

    // Fade back in (only if visible)
    targets.forEach(el => {
      if (el.style.display !== "none") {
        el.classList.remove("desc-fade-out");
        el.classList.add("desc-fade-in");
      }
    });
  }, 180); // MUST match CSS
}


function renderVerticalBlock(container, isMobile) {
  if (!container) return;

  const title = VERTICAL_NAMES[ACTIVE_VERTICAL];
  const desc = VERTICAL_META[ACTIVE_VERTICAL];
  const video = VERTICAL_VIDEO[ACTIVE_VERTICAL];

  // Show description for "all" without title
  if (ACTIVE_VERTICAL === "all") {
    if (desc) {
      container.style.display = "block";
      container.innerHTML = `<p>${desc}</p>`;
    } else {
      container.style.display = "none";
      container.innerHTML = "";
    }
    mainPlayer = null;
    return;
  }

  let html = "";

  if (!video) {
    html = `
      <div class="col-12">
        <h5 class="mb-2">${title}</h5>
        <p>${desc}</p>
      </div>
    `;
  } else if (isMobile) {
    html = `
      <h5 class="mb-2">${title}</h5>
      <p>${desc}</p>
      ${renderVideoEmbed(video, false)}
    `;
  } else {
    html = `
      <div class="row g-3 align-items-start">
        <div class="col-md-4">
          ${renderVideoEmbed(video, false)}
        </div>
        <div class="col-md-8">
          <h5 class="mb-2">${title}</h5>
          <p>${desc}</p>
        </div>
      </div>
    `;
  }

  container.style.display = "block";
  container.innerHTML = html;

  if (video) {
    setTimeout(() => {
      mainPlayer = initYouTubePlayer('main-youtube-player', function (event) {
        console.log('Main player ready');
      });
    }, 100);
  }
}

/* ========================================================= */
/* ========================= MODAL ========================= */
/* ========================================================= */

function openPublicationsModal() {
  // 1. IMMEDIATELY stop the main background video
  if (mainPlayer && mainPlayer.pauseVideo) {
    mainPlayer.pauseVideo();
  }

  syncModalFilters();
  updateModalVerticalDescription();
  renderModalPublications();

  const modalEl = document.getElementById("publicationsModal");
  const modal = new bootstrap.Modal(modalEl);

  // 2. Ensure the modal's own video stops when the modal is closed
  modalEl.addEventListener('hidden.bs.modal', onModalClose, { once: true });

  modal.show();
}

function onModalClose() {
  // Stop the modal video so it doesn't leak audio into the main page
  if (modalPlayer && modalPlayer.pauseVideo) {
    modalPlayer.pauseVideo();
  }
}

function syncModalFilters() {
  const mv = document.getElementById("modal-filter-vertical");
  const mt = document.getElementById("modal-filter-type");
  const dv = document.getElementById("filter-vertical");
  const dt = document.getElementById("filter-type");

  if (!mv || !mt) return;

  mv.innerHTML = dv.innerHTML;
  mt.innerHTML = dt.innerHTML;
  mv.value = ACTIVE_VERTICAL;
  mt.value = ACTIVE_TYPE;

  mv.onchange = () => {
    ACTIVE_VERTICAL = mv.value;
    syncAllFilters();
    updateVerticalDescription();
    updateModalVerticalDescription();
    renderFilteredPublications();
    renderModalPublications();
  };

  mt.onchange = () => {
    ACTIVE_TYPE = mt.value;
    syncAllFilters();
    renderFilteredPublications();
    renderModalPublications();
  };

  document.getElementById("modal-clear-filters").onclick = clearAllFilters;
}

function updateModalVerticalDescription() {
  const c = document.getElementById("modal-vertical-description");
  if (!c) return;

  const title = VERTICAL_NAMES[ACTIVE_VERTICAL];
  const desc = VERTICAL_META[ACTIVE_VERTICAL];
  const video = VERTICAL_VIDEO[ACTIVE_VERTICAL];

  if (ACTIVE_VERTICAL === "all") {
    c.style.display = desc ? "block" : "none";
    c.innerHTML = desc ? `<p>${desc}</p>` : "";
    modalPlayer = null; // Clear reference
    return;
  }

  c.innerHTML = `
    <div class="row g-3 align-items-start">
      <div class="col-md-4">
        ${renderVideoEmbed(video, true)}
      </div>
      <div class="col-md-8">
        <h5 class="mb-2">${title}</h5>
        <p>${desc}</p>
      </div>
    </div>
  `;
  c.style.display = "block";

  if (video) {
    setTimeout(() => {
      modalPlayer = initYouTubePlayer('modal-youtube-player', function (event) {
        console.log('Modal player ready');
      });
    }, 200);
  }
}

/* ========================================================= */
/* ======================== RENDER ========================= */
/* ========================================================= */

function renderFilteredPublications() {
  const c = document.getElementById("publications-content");
  const m = document.getElementById("publications-content-mobile");
  if (!c) return;

  const pubs = window.__PUBS__.filter(p =>
    (ACTIVE_VERTICAL === "all" || p.research_vertical === ACTIVE_VERTICAL) &&
    (ACTIVE_TYPE === "all" || p.publication_type === ACTIVE_TYPE)
  );

  const targets = [c, m].filter(Boolean);

  // Fade out
  targets.forEach(el => {
    el.classList.remove("pub-fade-in");
    el.classList.add("pub-fade-out");
  });

  // After fade-out, swap content
  setTimeout(() => {
    const html = createPublicationsGrid(pubs);

    c.innerHTML = html;
    if (m) m.innerHTML = html;

    enablePublicationClicks();
    syncMobileFilters();
    setTimeout(updateStickyFilterPosition, 50);

    // Fade back in
    targets.forEach(el => {
      el.classList.remove("pub-fade-out");
      el.classList.add("pub-fade-in");
    });
  }, 180); // MUST match CSS duration
}


function renderModalPublications() {
  const c = document.getElementById("modal-publications-content");
  if (!c) return;

  const pubs = window.__PUBS__.filter(p =>
    (ACTIVE_VERTICAL === "all" || p.research_vertical === ACTIVE_VERTICAL) &&
    (ACTIVE_TYPE === "all" || p.publication_type === ACTIVE_TYPE)
  );

  c.innerHTML = createPublicationsGrid(pubs);
  setTimeout(enablePublicationClicks, 50);
}

/* ========================================================= */
/* ========================= GRID ========================== */
/* ========================================================= */

function createPublicationsGrid(pubs) {
  let html = `<div class="row row-cols-1 row-cols-md-3 g-3" data-role="pub-grid">`;

  pubs.forEach(pub => {
    const idx = window.__PUBS__.indexOf(pub);
    const verticalName = VERTICAL_NAMES[pub.research_vertical] || pub.research_vertical;
    const typeName = TYPE_NAMES[pub.publication_type] || pub.publication_type;

    html += `
      <div class="col">
        <div class="card h-100">
          <img src="${pub.thumbnail}" class="card-img-top pub-thumb" data-pub-index="${idx}" style="cursor:pointer">
          <div class="card-body d-flex flex-column">
            <h6>${pub.title}</h6>
            <p class="small">${pub.authors}</p>
            <p class="small text-muted">${pub.venue}</p>
            
            <div class="mb-2 d-flex gap-2 flex-wrap">
              <span class="badge bg-primary filter-badge" 
                    data-filter-type="vertical" 
                    data-filter-value="${pub.research_vertical}"
                    style="cursor:pointer">${verticalName}</span>
              <span class="badge bg-secondary filter-badge" 
                    data-filter-type="type" 
                    data-filter-value="${pub.publication_type}"
                    style="cursor:pointer">${typeName}</span>
            </div>
            
            <div class="mt-auto d-flex gap-2">
              ${pub.pdf ? `<a href="${pub.pdf}" class="btn btn-sm btn-outline-primary">PDF</a>` : ""}
              ${pub.website ? `<a href="${pub.website}" class="btn btn-sm btn-outline-secondary">Website</a>` : ""}
            </div>
          </div>
        </div>
      </div>`;
  });

  return html + `</div>`;
}

/* ========================================================= */
/* =================== MOBILE FILTER SYNC ================== */
/* ========================================================= */

function syncMobileFilters() {
  const dv = document.getElementById("filter-vertical");
  const dt = document.getElementById("filter-type");
  const mv = document.querySelector(".filter-vertical");
  const mt = document.querySelector(".filter-type");

  if (!mv || !mt) return;

  mv.innerHTML = dv.innerHTML;
  mt.innerHTML = dt.innerHTML;
  mv.value = ACTIVE_VERTICAL;
  mt.value = ACTIVE_TYPE;

  mv.onchange = e => {
    ACTIVE_VERTICAL = e.target.value;
    syncAllFilters();
    updateVerticalDescription();
    renderFilteredPublications();
  };

  mt.onchange = e => {
    ACTIVE_TYPE = e.target.value;
    syncAllFilters();
    renderFilteredPublications();
  };
}

window.addEventListener("load", () => {
  const btn = document.getElementById("pubs-scroll-top");
  const pubsPane = document.getElementById("pubs");
  const filters = document.getElementById("filters-mobile-bar");
  const tabs = document.querySelector(".nav-tabs");

  if (!btn || !pubsPane || !filters || !tabs) return;

  const isFiltersHidden = () => {
    const filtersRect = filters.getBoundingClientRect();
    const tabsRect = tabs.getBoundingClientRect();

    // filters completely above the tabs
    return filtersRect.bottom <= tabsRect.bottom;
  };

  const updateButtonVisibility = () => {
    if (
      pubsPane.classList.contains("active") &&
      isFiltersHidden()
    ) {
      btn.style.display = "flex";
    } else {
      btn.style.display = "none";
    }
  };

  // Watch scroll
  window.addEventListener("scroll", updateButtonVisibility, { passive: true });

  // Watch tab switches
  document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
    tab.addEventListener("shown.bs.tab", updateButtonVisibility);
  });

  // Scroll exactly to filters
  btn.addEventListener("click", () => {
    const y =
      window.scrollY +
      filters.getBoundingClientRect().top -
      tabs.offsetHeight -
      8; // small visual gap

    window.scrollTo({ top: y, behavior: "smooth" });
  });

  // Initial state
  updateButtonVisibility();
});

document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll("#publications-content, #publications-content-mobile")
    .forEach(el => el.classList.add("pub-fade-in"));
});

document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll(
      "#vertical-description, .vertical-description"
    )
    .forEach(el => el.classList.add("desc-fade-in"));
});
