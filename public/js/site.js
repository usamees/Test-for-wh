/* Üldine: mobiilimenüü ja otsing. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let lastFocus = null;

  function closeMenu() {
    const m = $("#menu"); if (!m) return;
    m.classList.remove("open");
    const b = $(".burger"); if (b) b.setAttribute("aria-expanded", "false");
    const s = $(".scrim"); if (s) s.remove();
  }
  function openMenu(btn) {
    $("#menu").classList.add("open"); btn.setAttribute("aria-expanded", "true");
    const s = document.createElement("div"); s.className = "scrim"; s.onclick = closeMenu; document.body.appendChild(s);
    const first = $("#menu a"); if (first) first.focus();
  }

  let index = null;
  async function openSearch() {
    lastFocus = document.activeElement;
    const el = document.createElement("div"); el.className = "srch"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Otsing");
    el.innerHTML = `<div class="box"><label class="sr" for="sq">Otsi</label><input type="search" id="sq" placeholder="Otsi teenust või lehte" autocomplete="off"><ul id="sres"></ul></div>`;
    document.body.appendChild(el);
    const close = () => { el.remove(); if (lastFocus) lastFocus.focus(); };
    el.addEventListener("click", e => { if (e.target === el) close(); });
    el.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    $("#sq").focus();
    if (!index) {
      try { index = await (await fetch("/api/otsing.json")).json(); } catch (e) { index = []; }
    }
    const draw = v => {
      const n = v.toLowerCase().trim();
      const hits = n ? index.filter(i => i.x.toLowerCase().includes(n)) : index;
      $("#sres").innerHTML = hits.map(i => `<li><a href="${esc(i.u)}">${esc(i.t)}<small>${esc(i.d)}</small></a></li>`).join("") || "<li style='padding:12px'>Tulemusi ei leitud</li>";
    };
    draw($("#sq").value); $("#sq").oninput = e => draw(e.target.value);
  }

  document.addEventListener("click", e => {
    const t = e.target.closest("[data-act]"); if (!t) return;
    const a = t.dataset.act;
    if (a === "menu") openMenu(t);
    else if (a === "menu-close") closeMenu();
    else if (a === "search") openSearch();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });

  // Prototüübi vanad #-aadressid → päris aadressid
  function legacyHash() {
    const h = location.pathname === "/" && location.hash.slice(1);
    if (!h) return;
    const map = { avaleht: "/", teenused: "/teenused", ettevottest: "/ettevottest", kontakt: "/kontakt", karjaar: "/karjaar", "tehtud-tood": "/tehtud-tood", paring: "/paring", haldus: "/haldus" };
    const to = map[h] || (h.startsWith("teenus-") && "/teenused/" + h.slice(7)) || (h.startsWith("paring-") && "/paring/" + h.slice(7)) || null;
    if (to && to !== "/") location.replace(to);
  }
  legacyHash();
  window.addEventListener("hashchange", legacyHash);

  // Halduse kinnitusnupud (data-confirm)
  document.addEventListener("submit", e => {
    const b = e.submitter; const msg = (b && b.dataset.confirm) || e.target.dataset.confirm;
    if (msg && !window.confirm(msg)) e.preventDefault();
  });
})();
