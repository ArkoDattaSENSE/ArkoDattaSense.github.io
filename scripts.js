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
  
        const container = document.getElementById("publications-content");
        const mobile = document.getElementById("pubs");
        if (!container) return;
  
        const grid = document.createElement("div");
        grid.className = "row row-cols-1 row-cols-md-3 g-3";
        grid.dataset.role = "pub-grid";
  
        pubs.forEach((pub, idx) => {
          const col = document.createElement("div");
          col.className = "col";
  
          const buttons = `
            ${pub.pdf ? `<a href="${pub.pdf}" class="btn btn-sm btn-outline-primary">PDF</a>` : ""}
            ${pub.website ? `<a href="${pub.website}" class="btn btn-sm btn-outline-secondary">Website</a>` : ""}
          `;
  
          col.innerHTML = `
            <div class="card pub-card h-100">
              <img src="${pub.thumbnail}"
                   class="card-img-top pub-thumb"
                   data-pub-index="${idx}"
                   style="cursor:pointer">
  
              <div class="card-body d-flex flex-column">
                <h6 class="card-title">${pub.title}</h6>
                <p class="small mb-1">${pub.authors}</p>
                <p class="small text-muted mb-2">${pub.venue}</p>
  
                <div class="mt-auto d-flex gap-2">
                  ${buttons}
                </div>
              </div>
            </div>
          `;
  
          grid.appendChild(col);
        });
  
        window.__PUBS__ = pubs;
  
        container.innerHTML = "";
        container.appendChild(grid);
  
        if (mobile) {
          mobile.innerHTML = grid.outerHTML;
        }
  
        enablePublicationClicks();
      });
  }
  
  function enablePublicationClicks() {
    document.querySelectorAll('[data-role="pub-grid"]').forEach(grid => {
      grid.onclick = e => {
        const img = e.target.closest(".pub-thumb");
        if (!img) return;
  
        const idx = img.dataset.pubIndex;
        openModal(window.__PUBS__[idx]);
      };
    });
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
  
    new bootstrap.Modal(document.getElementById("pubModal")).show();
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
          li.innerHTML = it.text+"<br><br>";
          ul.appendChild(li);
        });
  
        desktop.innerHTML = "";
        desktop.appendChild(ul);
  
        if (mobile) {
          mobile.innerHTML = ul.outerHTML;
        }
      });
  }
  