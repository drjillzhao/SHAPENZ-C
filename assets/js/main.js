/* SHAPEing Net Zero Collective — site logic
   Loads editable content from /content/*.json (edited via GitHub or the
   /admin dashboard) and renders it into the static HTML pages. */

const CONTENT_BASE = "./content/";

async function loadJSON(name) {
  try {
    const res = await fetch(CONTENT_BASE + name, { cache: "no-store" });
    if (!res.ok) throw new Error(name + " " + res.status);
    return await res.json();
  } catch (err) {
    console.error("Could not load content:", name, err);
    return null;
  }
}

/* list files are stored as {"items": [...]} so Decap CMS (which needs a
   single JSON object per file) can manage them as a "list" field */
async function loadList(name) {
  const data = await loadJSON(name);
  return (data && Array.isArray(data.items)) ? data.items : [];
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/* ---------- site-wide chrome (footer + contact defaults) ---------- */
async function renderSiteChrome() {
  const site = await loadJSON("site.json");
  if (!site) return;

  document.querySelectorAll("[data-org-name]").forEach(n => n.textContent = site.org_name);
  document.querySelectorAll("[data-contact-email]").forEach(n => { n.textContent = site.contact_email; n.href = "mailto:" + site.contact_email; });
  document.querySelectorAll("[data-contact-phone]").forEach(n => n.textContent = site.contact_phone);
  document.querySelectorAll("[data-contact-address]").forEach(n => n.textContent = site.contact_address);
  document.querySelectorAll("[data-footer-note]").forEach(n => n.textContent = site.footer_note);

  const socialRow = document.querySelector("[data-social-row]");
  if (socialRow && site.social) {
    socialRow.innerHTML = "";
    Object.entries(site.social).forEach(([label, url]) => {
      if (!url) return;
      socialRow.appendChild(el(`<a href="${url}" target="_blank" rel="noopener">${label}</a>`));
    });
  }
}

/* ---------- home page ---------- */
async function renderHome() {
  const site = await loadJSON("site.json");
  if (site) {
    const h1 = document.querySelector("[data-hero-title]");
    if (h1) h1.textContent = site.tagline;
    const lede = document.querySelector("[data-hero-lede]");
    if (lede) lede.textContent = site.intro;
    const chips = document.querySelector("[data-chip-row]");
    if (chips) chips.innerHTML = site.disciplines.map(d => `<span class="chip">${d}</span>`).join("");

    const storyImg = document.querySelector("[data-story-image]");
    if (storyImg) storyImg.src = site.story_image;
    const storyBody = document.querySelector("[data-story-body]");
    if (storyBody) storyBody.textContent = site.story_body;
    const storyStats = document.querySelector("[data-story-stats]");
    if (storyStats) storyStats.textContent = site.story_stats;
  }

  const news = await loadList("news.json");
  const newsWrap = document.querySelector("[data-news-list]");
  if (newsWrap) {
    newsWrap.innerHTML = "";
    if (!news || !news.length) {
      newsWrap.appendChild(el(`<p class="empty-note">No news posted yet.</p>`));
    } else {
      news.forEach(item => {
        newsWrap.appendChild(el(`
          <article class="news-card">
            <time>${fmtDate(item.date)}</time>
            <p>${item.headline}</p>
            ${item.link_url ? `<a class="btn btn-outline" href="${item.link_url}" target="_blank" rel="noopener">${item.link_text || "Read more"}</a>` : ""}
          </article>
        `));
      });
    }
  }

  const events = await loadList("events.json");
  const upcoming = events.filter(e => e.status === "upcoming").sort((a, b) => a.order - b.order)[0];
  const featureWrap = document.querySelector("[data-upcoming-feature]");
  if (featureWrap) {
    featureWrap.innerHTML = "";
    if (upcoming) {
      featureWrap.appendChild(el(`
        <div class="event-feature">
          <img src="${upcoming.image || "images/event-placeholder.svg"}" alt="${upcoming.title}">
          <div class="body">
            <span class="eyebrow">Upcoming Event</span>
            <h3>${upcoming.title}</h3>
            <p class="t-meta">${upcoming.date_label} · ${upcoming.venue}</p>
            <p>${upcoming.summary || ""}</p>
            <a class="btn btn-primary" href="events.html">See details</a>
          </div>
        </div>
      `));
    } else {
      featureWrap.appendChild(el(`<p class="empty-note">No upcoming event scheduled yet — check back soon.</p>`));
    }
  }
}

/* ---------- events page ---------- */
async function renderEvents() {
  const events = (await loadList("events.json")).sort((a, b) => b.order - a.order);
  const list = document.querySelector("[data-events-timeline]");
  if (!list) return;
  list.innerHTML = "";
  if (!events.length) {
    list.appendChild(el(`<p class="empty-note">Events will appear here once added.</p>`));
    return;
  }
  events.forEach(e => {
    list.appendChild(el(`
      <li data-order="${String(e.order).padStart(2, "0")}">
        <div class="t-title">${e.title} ${e.status === "upcoming" ? "· <span style='color:var(--amber-deep)'>Upcoming</span>" : ""}</div>
        <div class="t-meta">${e.date_label}${e.date_end ? " – " + fmtDate(e.date_end) : ""} · ${e.city || ""}</div>
        <p>${e.venue}</p>
        ${e.summary ? `<p>${e.summary}</p>` : ""}
      </li>
    `));
  });
}

/* ---------- members page ---------- */
async function renderMembers() {
  const members = await loadList("members.json");
  const grid = document.querySelector("[data-members-grid]");
  if (!grid) return;
  grid.innerHTML = "";
  if (!members.length) {
    grid.appendChild(el(`<p class="empty-note">No members added yet.</p>`));
    return;
  }
  members.forEach(m => {
    grid.appendChild(el(`
      <article class="member-card">
        <img src="${m.image || "images/member-placeholder.svg"}" alt="${m.name}">
        <div class="body">
          <h3>${m.name}</h3>
          <span class="member-role">${[m.role, m.institution].filter(Boolean).join(" · ")}</span>
          <p>${m.bio || ""}</p>
        </div>
      </article>
    `));
  });
}

/* ---------- publications page ---------- */
async function renderPublications() {
  const pubs = (await loadList("publications.json")).sort((a, b) => (b.year || 0) - (a.year || 0));
  const list = document.querySelector("[data-pub-list]");
  if (!list) return;
  list.innerHTML = "";
  if (!pubs.length) {
    list.appendChild(el(`<p class="empty-note">No publications added yet.</p>`));
    return;
  }
  pubs.forEach(p => {
    list.appendChild(el(`
      <div class="pub-item">
        <div class="pub-year">${p.year || ""}</div>
        <div>
          <h3 style="font-size:19px;margin-bottom:6px;">${p.url ? `<a href="${p.url}" target="_blank" rel="noopener">${p.title}</a>` : p.title}</h3>
          <div class="pub-outlet">${[p.authors, p.outlet].filter(Boolean).join(" — ")}</div>
          ${p.summary ? `<p style="margin-top:10px;">${p.summary}</p>` : ""}
        </div>
      </div>
    `));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderSiteChrome();
  const page = document.body.dataset.page;
  if (page === "home") renderHome();
  if (page === "events") renderEvents();
  if (page === "members") renderMembers();
  if (page === "publications") renderPublications();

  const form = document.querySelector("[data-contact-form]");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      form.querySelector("[data-form-status]").textContent =
        "Thanks — this demo form doesn't send yet. Connect it to Formspree, EmailJS, or a Cloudflare Worker to receive messages.";
    });
  }
});
