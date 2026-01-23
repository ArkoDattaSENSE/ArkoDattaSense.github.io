let ACTIVE_VERTICAL = "all";
let ACTIVE_TYPE = "all";
let VERTICAL_META = {};
let VERTICAL_NAMES = {};
let TYPE_NAMES = {};

document.addEventListener("DOMContentLoaded", () => {
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
});

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

/* ---------------- PUBLICATIONS ---------------- */

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
      // Handle thumbnail clicks
      const img = e.target.closest(".pub-thumb");
      if (img) {
        const idx = img.dataset.pubIndex;
        openModal(window.__PUBS__[idx]);
        return;
      }

      // Handle filter badge clicks
      const badge = e.target.closest(".filter-badge");
      if (badge) {
        e.stopPropagation();
        const filterType = badge.dataset.filterType;
        const filterValue = badge.dataset.filterValue;
        
        if (filterType === "vertical") {
          ACTIVE_VERTICAL = filterValue;
          updateAllFilters();
        } else if (filterType === "type") {
          ACTIVE_TYPE = filterValue;
          updateAllFilters();
        }
        
        updateVerticalDescription();
        renderFilteredPublications();
      }
    };
  });
}

function updateAllFilters() {
  // Update desktop filters
  const dVert = document.getElementById("filter-vertical");
  const dType = document.getElementById("filter-type");
  if (dVert) dVert.value = ACTIVE_VERTICAL;
  if (dType) dType.value = ACTIVE_TYPE;

  // Update mobile filters
  const mVert = document.querySelector(".filter-vertical");
  const mType = document.querySelector(".filter-type");
  if (mVert) mVert.value = ACTIVE_VERTICAL;
  if (mType) mType.value = ACTIVE_TYPE;

  // Update modal filters
  const modalVert = document.getElementById("modal-filter-vertical");
  const modalType = document.getElementById("modal-filter-type");
  if (modalVert) modalVert.value = ACTIVE_VERTICAL;
  if (modalType) modalType.value = ACTIVE_TYPE;

  // Update modal vertical description
  updateModalVerticalDescription();
}

function openModal(pub) {
  document.getElementById("modalTitle").innerHTML = pub.title;
  document.getElementById("modalAuthors").innerHTML = pub.authors;
  document.getElementById("modalVenue").innerHTML = pub.venue;
  document.getElementById("modalAbstract").innerHTML = pub.abstract;

  const actions = document.getElementById("modalActions");
  actions.innerHTML = "";

  if (pub.pdf) {
    actions.innerHTML += `<a href="${pub.pdf}" class="btn btn-primary">PDF</a>`;
  }
  if (pub.website) {
    actions.innerHTML += `<a href="${pub.website}" class="btn btn-outline-secondary">Website</a>`;
  }

  const pubModal = document.getElementById("pubModal");
  const modal = new bootstrap.Modal(pubModal);
  
  // Ensure proper z-index stacking
  pubModal.style.zIndex = "1060";
  
  // Handle backdrop z-index after modal is shown
  pubModal.addEventListener('shown.bs.modal', function adjustBackdrop() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    if (backdrops.length > 0) {
      const lastBackdrop = backdrops[backdrops.length - 1];
      lastBackdrop.style.zIndex = "1055";
    }
    pubModal.removeEventListener('shown.bs.modal', adjustBackdrop);
  });
  
  modal.show();
}

/* ---------------- NEWS ---------------- */

function loadNews() {
  fetch("news.json")
    .then(r => r.json())
    .then(news => {
      news.sort((a, b) => a.order - b.order);

      const desktop = document.getElementById("news-content");
      const mobile = document.getElementById("news-content-mobile");
      if (!desktop) return;

      desktop.innerHTML = "";
      news.forEach(n => {
        const li = document.createElement("li");
        li.innerHTML = `${n.date}: ${n.text}`;
        desktop.appendChild(li);
      });

      if (mobile) {
        mobile.innerHTML = desktop.innerHTML;
      }
    });
}

/* ---------------- GENERIC LIST (Awards / Teaching / Service) ---------------- */

function loadSimpleList(jsonFile, desktopId, mobileId) {
  fetch(jsonFile)
    .then(r => r.json())
    .then(items => {
      items.sort((a, b) => a.order - b.order);

      const desktop = document.getElementById(desktopId);
      const mobile = document.getElementById(mobileId);
      if (!desktop) return;

      const ul = document.createElement("ul");
      ul.className = "list";

      items.forEach(it => {
        const li = document.createElement("li");
        li.innerHTML = it.text + "<br><br>";
        ul.appendChild(li);
      });

      desktop.innerHTML = "";
      desktop.appendChild(ul);

      if (mobile) {
        mobile.innerHTML = ul.outerHTML;
      }
    });
}

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
      VERTICAL_NAMES[v.id] = v.name;
      vSel.innerHTML += `<option value="${v.id}">${v.name}</option>`;
    });

    types.forEach(t => {
      TYPE_NAMES[t.id] = t.name;
      tSel.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });

    vSel.onchange = () => {
      ACTIVE_VERTICAL = vSel.value;
      updateVerticalDescription();
      renderFilteredPublications();
    };

    tSel.onchange = () => {
      ACTIVE_TYPE = tSel.value;
      renderFilteredPublications();
    };

    document.getElementById("clear-filters").onclick = () => {
      ACTIVE_VERTICAL = "all";
      ACTIVE_TYPE = "all";
      vSel.value = "all";
      tSel.value = "all";
      updateVerticalDescription();
      renderFilteredPublications();
    };

    // Setup expand button
    const expandBtn = document.getElementById("expand-publications");
    if (expandBtn) {
      expandBtn.onclick = openPublicationsModal;
    }

    // Initial render after filters are loaded
    renderFilteredPublications();
  });
}

function getVerticalName(verticalId) {
  return VERTICAL_NAMES[verticalId] || verticalId;
}

function getTypeName(typeId) {
  return TYPE_NAMES[typeId] || typeId;
}

function openPublicationsModal() {
  const modal = new bootstrap.Modal(document.getElementById("publicationsModal"));
  
  // Sync modal filters with main filters
  syncModalFilters();
  
  // Render publications in modal
  renderModalPublications();
  
  modal.show();
}

function syncModalFilters() {
  const mainVert = document.getElementById("filter-vertical");
  const mainType = document.getElementById("filter-type");
  const modalVert = document.getElementById("modal-filter-vertical");
  const modalType = document.getElementById("modal-filter-type");

  if (!mainVert || !modalVert) return;

  // Copy options
  modalVert.innerHTML = mainVert.innerHTML;
  modalType.innerHTML = mainType.innerHTML;

  // Sync current values
  modalVert.value = ACTIVE_VERTICAL;
  modalType.value = ACTIVE_TYPE;

  // Bind events to update both main and modal
  modalVert.onchange = () => {
    ACTIVE_VERTICAL = modalVert.value;
    mainVert.value = ACTIVE_VERTICAL;
    updateVerticalDescription();
    updateModalVerticalDescription();
    renderFilteredPublications();
    renderModalPublications();
  };

  modalType.onchange = () => {
    ACTIVE_TYPE = modalType.value;
    mainType.value = ACTIVE_TYPE;
    renderFilteredPublications();
    renderModalPublications();
  };

  const modalClear = document.getElementById("modal-clear-filters");
  if (modalClear) {
    modalClear.onclick = () => {
      ACTIVE_VERTICAL = "all";
      ACTIVE_TYPE = "all";
      mainVert.value = "all";
      mainType.value = "all";
      modalVert.value = "all";
      modalType.value = "all";
      updateVerticalDescription();
      updateModalVerticalDescription();
      renderFilteredPublications();
      renderModalPublications();
    };
  }
}

function updateModalVerticalDescription() {
  const desc = document.getElementById("modal-vertical-description");
  if (!desc) return;

  if (ACTIVE_VERTICAL === "all" || !VERTICAL_META[ACTIVE_VERTICAL]) {
    desc.style.display = "none";
    desc.innerHTML = "";
  } else {
    desc.style.display = "block";
    desc.innerHTML = VERTICAL_META[ACTIVE_VERTICAL];
  }
}

function renderModalPublications() {
  const container = document.getElementById("modal-publications-content");
  if (!container || !window.__PUBS__) return;

  const pubs = window.__PUBS__.filter(p => {
    const vOk = ACTIVE_VERTICAL === "all" || p.research_vertical === ACTIVE_VERTICAL;
    const tOk = ACTIVE_TYPE === "all" || p.publication_type === ACTIVE_TYPE;
    return vOk && tOk;
  });

  container.innerHTML = createPublicationsGrid(pubs);
  
  // Enable clicks in modal
  enablePublicationClicks();
}

function updateVerticalDescription() {
  const desc = document.getElementById("vertical-description");
  if (desc) {
    if (ACTIVE_VERTICAL === "all" || !VERTICAL_META[ACTIVE_VERTICAL]) {
      desc.style.display = "none";
      desc.innerHTML = "";
    } else {
      desc.style.display = "block";
      desc.innerHTML = VERTICAL_META[ACTIVE_VERTICAL];
    }
  }

  // Update mobile description too
  const mDesc = document.querySelector(".vertical-description");
  if (mDesc) {
    if (ACTIVE_VERTICAL === "all" || !VERTICAL_META[ACTIVE_VERTICAL]) {
      mDesc.style.display = "none";
      mDesc.innerHTML = "";
    } else {
      mDesc.style.display = "block";
      mDesc.innerHTML = VERTICAL_META[ACTIVE_VERTICAL];
    }
  }
}

function renderFilteredPublications() {
  const container = document.getElementById("publications-content");
  const mobileContainer = document.getElementById("publications-content-mobile");
  
  if (!container || !window.__PUBS__) return;

  const pubs = window.__PUBS__.filter(p => {
    const vOk = ACTIVE_VERTICAL === "all" || p.research_vertical === ACTIVE_VERTICAL;
    const tOk = ACTIVE_TYPE === "all" || p.publication_type === ACTIVE_TYPE;
    return vOk && tOk;
  });

  // Create the grid HTML
  const gridHTML = createPublicationsGrid(pubs);

  // Update desktop
  container.innerHTML = gridHTML;

  // Update mobile
  if (mobileContainer) {
    mobileContainer.innerHTML = gridHTML;
  }

  // Sync mobile filters
  syncMobileFilters();

  // Enable clicks
  enablePublicationClicks();
}

function createPublicationsGrid(pubs) {
  let html = '<div class="row row-cols-1 row-cols-md-3 g-3" data-role="pub-grid">';
  
  pubs.forEach((pub) => {
    const pubIndex = window.__PUBS__.indexOf(pub);
    
    // Get readable names for vertical and type
    const verticalName = getVerticalName(pub.research_vertical);
    const typeName = getTypeName(pub.publication_type);
    
    html += `
      <div class="col">
        <div class="card pub-card h-100">
          <img src="${pub.thumbnail}"
               class="card-img-top pub-thumb"
               data-pub-index="${pubIndex}"
               style="cursor:pointer">

          <div class="card-body d-flex flex-column">
            <h6 class="card-title">${pub.title}</h6>
            <p class="small mb-1">${pub.authors}</p>
            <p class="small text-muted mb-2">${pub.venue}</p>
            
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
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

function syncMobileFilters() {
  const dVert = document.getElementById("filter-vertical");
  const dType = document.getElementById("filter-type");

  const mVert = document.querySelector(".filter-vertical");
  const mType = document.querySelector(".filter-type");
  const mClear = document.querySelector(".clear-filters");

  if (!dVert || !mVert) return;

  // Copy options
  mVert.innerHTML = dVert.innerHTML;
  mType.innerHTML = dType.innerHTML;

  // Sync state
  mVert.value = ACTIVE_VERTICAL;
  mType.value = ACTIVE_TYPE;

  // Bind events
  mVert.onchange = e => {
    ACTIVE_VERTICAL = e.target.value;
    updateVerticalDescription();
    renderFilteredPublications();
  };

  mType.onchange = e => {
    ACTIVE_TYPE = e.target.value;
    renderFilteredPublications();
  };

  if (mClear) {
    mClear.onclick = () => {
      ACTIVE_VERTICAL = "all";
      ACTIVE_TYPE = "all";
      dVert.value = "all";
      dType.value = "all";
      mVert.value = "all";
      mType.value = "all";
      updateVerticalDescription();
      renderFilteredPublications();
    };
  }
}