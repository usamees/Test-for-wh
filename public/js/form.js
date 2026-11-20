/* Päringuvorm: samm-sammult küsimustik. Harud, kontroll ja suunamine tulevad
   jagatud failist /js/data.js (sama loogika kontrollib päringut ka serveris). */
(function () {
  "use strict";
  const box = document.getElementById("form");
  if (!box || !window.ES) return;
  const E = window.ES;
  const { ORG, SERVICES, SVC, GROUPS, RECIPIENTS, HELP } = E;

  // Avaldatud sisu (nimed ja „sageli tellitakse koos“) tuleb serverist
  try {
    const pub = JSON.parse(document.getElementById("es-content").textContent);
    const map = {};
    SERVICES.forEach(s => { map[s.slug] = { name: pub.names[s.slug], related: pub.related[s.slug] || [] }; });
    E.applyContent(map);
  } catch (e) { /* vaikesisu jääb */ }

  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ic = (id, cls = "") => `<svg class="ic ${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privaatrežiim */ } }
  };
  const DRAFT = "es_draft_v2";
  let FILES = []; // File objektid (ainult mälus)
  const MAX_FILES = 5, MAX_BYTES = 10 * 1024 * 1024;

  function newForm() { return { svc: null, a: {}, c: { pref: "email" }, files: [], step: "svc", key: null, from: null, sentId: null }; }
  let F = store.get(DRAFT, null) || newForm();
  if (!F || typeof F !== "object" || !F.a || !F.c) F = newForm();
  const save = () => store.set(DRAFT, F);

  const svcName = s => E.svcName(s);
  const stepsNow = () => E.stepList(F.svc, F.a);
  const qById = id => E.questionsFor(F.svc).find(q => q.id === id);

  function funnel(step) {
    try {
      const body = JSON.stringify({ svc: F.svc || "-", step: String(step).replace(/[^a-z_·0-9]/g, "") });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/funnel", new Blob([body], { type: "application/json" }));
    } catch (e) { /* statistika ei ole kriitiline */ }
  }

  function startForm(slug) {
    if (slug && slug !== "abi" && !SVC[slug]) slug = null;
    if (F.step === "done") F = newForm();
    if (slug) {
      if (F.svc !== slug) { F.svc = slug; E.prune(F.svc, F.a); F.from = slug === "abi" ? "teenuste lehelt: vajan abi" : "teenuse lehelt: " + svcName(slug); F.step = stepsNow()[1]; F.key = null; }
    } else if (!F.svc) { F.step = "svc"; F.from = "üldvorm"; }
    if (F.svc && F.svc !== "abi" && !SVC[F.svc]) F = newForm();
    if (!stepsNow().includes(F.step) && F.step !== "done") F.step = stepsNow()[F.svc ? 1 : 0];
    if (!F.from) F.from = "üldvorm";
    save();
  }

  function optHtml(name, opts, cur) {
    return opts.map((x, i) => `<div class="opt ${x.cls || ""}"><input type="radio" name="${name}" id="${name}_${i}" value="${esc(x.v)}" ${cur === x.v ? "checked" : ""}><label for="${name}_${i}">${x.icon ? ic(x.icon) : ""}<b>${esc(x.l)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ""}</label></div>`).join("");
  }

  function render(focus) {
    if (F.step === "done") return renderDone();
    const steps = stepsNow(); const idx = steps.indexOf(F.step); let html = "";
    const pct = Math.round(((idx < 0 ? 0 : idx) / (steps.length - 1)) * 100);
    html += `<div class="fhead">${F.svc ? `<span class="chip">Teenus: <b>${esc(svcName(F.svc))}</b><button type="button" data-act="chg-svc">Muuda</button></span>` : `<span></span>`}<span style="font-size:14px;color:var(--muted)">Samm ${idx + 1}</span></div>
    <div class="bar" role="progressbar" aria-label="Vormi edenemine" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`;
    if (F.step === "svc") {
      const opts = [...SERVICES.map(s => ({ v: s.slug, l: s.name, icon: s.icon, sub: GROUPS[s.group] })), { v: "abi", l: HELP.name, icon: "i-chat", cls: "help", sub: "Kirjelda vajadust oma sõnadega" }];
      html += `<fieldset><legend id="lg">Millise teenuse kohta soovid päringut saata?</legend><div class="seg">${optHtml("svc", opts, F.svc)}</div><p class="err" id="e_svc" role="alert"></p></fieldset>`;
    } else if (F.step === "contact") {
      const c = F.c;
      html += `<h2 class="qlabel" id="lg" tabindex="-1">Kuidas saame teiega ühendust võtta?</h2>
      <div class="row2"><div class="fld"><label for="c_name">Nimi *</label><input type="text" id="c_name" autocomplete="name" maxlength="200" value="${esc(c.name)}"><p class="err" id="e_c_name"></p></div>
      <div class="fld"><label for="c_company">Ettevõte <span class="hint">(valikuline)</span></label><input type="text" id="c_company" autocomplete="organization" maxlength="200" value="${esc(c.company)}"></div></div>
      <div class="row2"><div class="fld"><label for="c_email">E-post *</label><input type="email" id="c_email" autocomplete="email" inputmode="email" maxlength="254" value="${esc(c.email)}"><p class="err" id="e_c_email"></p></div>
      <div class="fld"><label for="c_phone">Telefon <span class="hint">(valikuline)</span></label><input type="tel" id="c_phone" autocomplete="tel" inputmode="tel" maxlength="40" value="${esc(c.phone)}"><p class="err" id="e_c_phone"></p></div></div>
      <fieldset class="fld"><legend style="font:500 15px var(--display);margin-bottom:6px">Eelistatud kontaktiviis</legend><div class="opts two-col">${optHtml("c_pref", [{ v: "email", l: "E-post" }, { v: "tel", l: "Telefon" }], c.pref)}</div></fieldset>
      <div class="hp" aria-hidden="true" style="position:absolute;left:-9999px"><label for="c_website">Veebileht</label><input type="text" id="c_website" tabindex="-1" autocomplete="off"></div>
      <label class="cons"><input type="checkbox" id="c_consent" ${c.consent ? "checked" : ""}><span>Nõustun, et ${esc(ORG.name)} töötleb minu andmeid päringule vastamiseks. <a href="/privaatsus" target="_blank" rel="noopener">Privaatsustingimused</a></span></label><p class="err" id="e_c_consent"></p>`;
    } else if (F.step === "summary") {
      html += summaryHtml();
    } else {
      const q = qById(F.step);
      if (q.type === "info") {
        html += `<div class="info ${q.tone}" id="lg" tabindex="-1">${q.tone === "hot" ? `<b style="font:600 20px var(--display)">Vajate kohe abi?</b>` : ""}<p>${esc(q.text)}</p>${q.tone === "hot" ? `<a class="btn red" href="${ORG.hotHref}">${ic("i-phone")}Helista ${esc(ORG.hot)}</a><p style="font-size:14px;color:#C9CED6">Võite päringu ka edasi täita, kui soovite lisaks kirjalikku pöördumist.</p>` : ""}</div>`;
      } else if (q.type === "choice") {
        html += `<fieldset><legend id="lg">${esc(q.text)}</legend><div class="opts ${q.opts.length > 4 ? "two-col" : ""}">${optHtml(q.id, q.opts, F.a[q.id])}</div><p class="err" id="e_${q.id}" role="alert"></p></fieldset>`;
      } else if (q.type === "multi") {
        const cur = F.a[q.id] || [];
        html += `<fieldset><legend id="lg">${esc(q.text)}</legend><p style="color:var(--muted);margin:-8px 0 16px">${esc(q.hint)}</p><div class="opts">${q.opts.map((x, i) => `<div class="opt chk"><input type="checkbox" name="${q.id}" id="${q.id}_${i}" value="${esc(x.v)}" ${cur.includes(x.v) ? "checked" : ""}><label for="${q.id}_${i}"><span class="t"><b>${esc(x.l)}</b><small>${esc(x.sub)}</small></span></label></div>`).join("")}</div></fieldset>`;
      } else if (q.type === "select") {
        html += `<div class="fld"><label class="qlabel" for="${q.id}" id="lg">${esc(q.text)}</label><select id="${q.id}"><option value="">Vali maakond</option>${q.opts.map(x => `<option value="${esc(x.v)}" ${F.a[q.id] === x.v ? "selected" : ""}>${esc(x.l)}</option>`).join("")}</select><p class="err" id="e_${q.id}" role="alert"></p></div>`;
      } else {
        html += `<div class="fld"><label class="qlabel" for="${q.id}" id="lg">${esc(q.text)}${q.req ? "" : ' <span class="hint" style="font-size:15px;font-weight:400">(valikuline)</span>'}</label><textarea id="${q.id}" maxlength="4000" placeholder="${esc(q.ph)}">${esc(F.a[q.id])}</textarea><p class="err" id="e_${q.id}" role="alert"></p></div>
        ${q.files ? `<div class="fld"><label for="files">Lisa failid <span class="hint">(joonised, PDF, pildid; kuni ${MAX_FILES} faili, igaüks kuni 10 MB)</span></label><input type="file" id="files" multiple accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.dwg,.dxf,.doc,.docx,.xls,.xlsx,.odt,.ods,.txt,.zip"><p class="files">${filesText()}</p><p class="err" id="e_files" role="alert"></p></div>` : ""}`;
      }
    }
    const isSum = F.step === "summary";
    html += `<div class="fnav">${idx > 0 ? `<button type="button" class="btn back" data-act="back">← Tagasi</button>` : "<span></span>"}
      ${isSum ? `<button type="button" class="btn red" data-act="submit" id="sendbtn">Saada päring</button>` : `<button type="button" class="btn red" data-act="next">Edasi →</button>`}</div>
      <div id="sendmsg"></div>`;
    box.innerHTML = html;
    if (focus) {
      const l = $("#lg", box);
      if (l) { if (!l.hasAttribute("tabindex")) l.setAttribute("tabindex", "-1"); l.focus({ preventScroll: true }); }
      const y = box.getBoundingClientRect().top + window.scrollY - 110;
      if (Math.abs(window.scrollY - y) > 40) window.scrollTo(0, Math.max(0, y));
    }
  }
  function filesText() {
    if (FILES.length) return "Lisatud: " + FILES.map(f => esc(f.name)).join(", ");
    if (F.files.length) return "Varem valitud failid (" + F.files.map(esc).join(", ") + ") tuleb pärast lehe uuesti laadimist uuesti lisada.";
    return "";
  }

  function summaryHtml() {
    const qs = E.visibleQs(F.svc, F.a).filter(q => q.type !== "info");
    const r = E.routeFor(F.svc, F.a); const c = F.c;
    const row = (q, a, step) => `<div class="r"><span class="q">${esc(q)}</span><span class="a">${esc(a) || "—"}</span><button type="button" data-goto="${step}" aria-label="Muuda: ${esc(q)}">Muuda</button></div>`;
    return `<h2 class="qlabel" id="lg" tabindex="-1">Kontrollige päring üle</h2>
    <div class="sum"><h3>Teenus</h3>${row("Valitud teenus", svcName(F.svc), "svc")}
    <h3>Vastused</h3>${qs.map(q => row(q.text, F.a[q.id] !== undefined && F.a[q.id] !== "" ? E.labelOf(q, F.a[q.id]) : (q.type === "multi" ? "Ei soovi" : q.req === false ? "" : "—"), q.id)).join("")}
    ${FILES.length ? row("Failid", FILES.map(f => f.name).join(", "), "desc") : ""}
    <h3>Kontakt</h3>${row("Nimi", c.name, "contact")}${c.company ? row("Ettevõte", c.company, "contact") : ""}${row("E-post", c.email, "contact")}${c.phone ? row("Telefon", c.phone, "contact") : ""}${row("Eelistatud kontaktiviis", c.pref === "tel" ? "Telefon" : "E-post", "contact")}</div>
    <p class="routebox">Päring suunatakse: <b>${esc(RECIPIENTS[r.to].role)}</b>${r.cc.length ? " (koopia: " + r.cc.map(k => esc(RECIPIENTS[k].role)).join(", ") + ")" : ""}</p>`;
  }

  function renderDone() {
    box.innerHTML = `<div class="done"><span class="ok">${ic("i-check")}</span><h2 class="qlabel" id="lg" tabindex="-1" style="margin:0">Päring on vastu võetud</h2>
    <p>Päringu tunnus</p><code>${esc(F.sentId)}</code><p style="max-width:46ch">Päring jõudis meie süsteemi ja edastatakse teenuse eest vastutavale inimesele. Saatsime kinnituse ka teie e-postile. Kiire abi korral helistage 24/7 numbrile <a href="${ORG.hotHref}">${esc(ORG.hot)}</a>.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="btn ghost" type="button" data-act="new">Uus päring</button><a class="btn red" href="/">Avalehele</a></div></div>`;
    $("#lg", box).focus();
  }

  function collect() {
    const s = F.step;
    if (s === "svc") { const v = $('input[name="svc"]:checked'); if (v && v.value !== F.svc) { F.svc = v.value; E.prune(F.svc, F.a); F.key = null; F.from = F.from || "üldvorm"; } }
    else if (s === "contact") {
      ["name", "company", "email", "phone"].forEach(k => { F.c[k] = $("#c_" + k).value.trim(); });
      const p = $('input[name="c_pref"]:checked'); F.c.pref = p ? p.value : "email"; F.c.consent = $("#c_consent").checked;
      F.hp = ($("#c_website") || {}).value || "";
    } else if (s !== "summary") {
      const q = qById(s); if (!q || q.type === "info") return;
      let v;
      if (q.type === "multi") { v = [...document.querySelectorAll(`input[name="${q.id}"]:checked`)].map(x => x.value); if (!v.length) v = undefined; }
      else if (q.type === "choice") { const x = $(`input[name="${q.id}"]:checked`); v = x ? x.value : undefined; }
      else v = $("#" + q.id).value.trim();
      if (v === undefined || v === "") delete F.a[q.id]; else F.a[q.id] = v;
      E.prune(F.svc, F.a);
    }
    save();
  }

  function showErrors(errs) {
    box.querySelectorAll(".err").forEach(e => { e.textContent = ""; });
    box.querySelectorAll("[aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
    let first = null;
    for (const [k, m] of Object.entries(errs)) {
      const e = $("#e_" + k); if (e) e.innerHTML = ic("i-alert") + esc(m);
      const inp = $("#" + k) || $(`input[name="${k}"]`);
      if (inp) { inp.setAttribute("aria-invalid", "true"); inp.setAttribute("aria-describedby", "e_" + k); first = first || inp; }
    }
    if (first) first.focus();
    return !Object.keys(errs).length;
  }
  function validate() {
    const s = F.step; let errs = {};
    if (s === "svc" && !F.svc) errs.svc = "Valige teenus või „Vajan abi teenuse valikul“.";
    if (s === "contact") errs = E.contactErrors(F.c);
    const q = qById(s);
    if (q) { const m = E.answerError(q, F.a[q.id]); if (m) errs[q.id] = m; }
    if (q && q.files) {
      if (FILES.length > MAX_FILES) errs.files = `Lisage kuni ${MAX_FILES} faili.`;
      else if (FILES.some(f => f.size > MAX_BYTES)) errs.files = "Fail on liiga suur (kuni 10 MB).";
    }
    return showErrors(errs);
  }
  function next() { collect(); if (!validate()) return; const st = stepsNow(); F.step = st[st.indexOf(F.step) + 1]; funnel(F.step); save(); render(true); }
  function back() { collect(); const st = stepsNow(); const i = st.indexOf(F.step); if (i > 0) { F.step = st[i - 1]; save(); render(true); } }

  async function submit() {
    collect();
    const btn = $("#sendbtn"), msg = $("#sendmsg");
    if (!F.key) { F.key = "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); save(); }
    btn.disabled = true; btn.textContent = "Saadan…"; msg.innerHTML = "";
    const fd = new FormData();
    fd.append("data", JSON.stringify({ svc: F.svc, answers: F.a, contact: F.c, from: F.from, key: F.key, website: F.hp || "" }));
    FILES.forEach(f => fd.append("files", f, f.name));
    try {
      const res = await fetch("/api/paringud", { method: "POST", body: fd, headers: { Accept: "application/json" } });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.id) {
        F.sentId = out.id; F.step = "done"; FILES = []; save(); funnel("saadetud"); render(true); return;
      }
      if (res.status === 422 && out.errors) {
        const st = stepsNow(); const firstBad = st.find(s => out.errors[s] || (s === "contact" && Object.keys(out.errors).some(k => k.startsWith("c_"))));
        if (firstBad) { F.step = firstBad; save(); render(true); showErrors(out.errors); return; }
      }
      throw new Error(out.error || "Server ei võtnud päringut vastu");
    } catch (e) {
      btn.disabled = false; btn.textContent = "Proovi uuesti";
      msg.innerHTML = `<div class="alert" role="alert"><b>Päringut ei õnnestunud saata.</b><span>${esc(e.message)}. Teie vastused on alles. Proovige uuesti või helistage <a href="tel:${esc(ORG.phone.replace(/\s/g, ""))}">${esc(ORG.phone)}</a>.</span></div>`;
    }
  }

  box.addEventListener("click", e => {
    const t = e.target.closest("[data-act],[data-goto]"); if (!t) return;
    if (t.dataset.goto) { collect(); F.step = t.dataset.goto; save(); render(true); return; }
    const a = t.dataset.act;
    if (a === "next") next(); else if (a === "back") back(); else if (a === "submit") submit();
    else if (a === "chg-svc") { collect(); F.step = "svc"; save(); render(true); }
    else if (a === "new") { F = newForm(); FILES = []; F.from = "üldvorm"; save(); history.replaceState(null, "", "/paring"); render(true); }
  });
  box.addEventListener("change", e => {
    if (e.target.id === "files") {
      FILES = [...e.target.files]; F.files = FILES.map(f => f.name); save();
      $(".files", box).innerHTML = filesText();
      return;
    }
    if ((e.target.type === "radio" || (e.target.type === "checkbox" && e.target.name === "extra")) && e.target.name !== "c_pref") {
      collect(); const st = stepsNow(); const bar = $(".bar i", box); if (bar) bar.style.width = Math.round(st.indexOf(F.step) / (st.length - 1) * 100) + "%";
    }
  });
  box.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "BUTTON" && e.target.tagName !== "A") {
      e.preventDefault(); if (F.step === "summary") submit(); else if (F.step !== "done") next();
    }
  });

  startForm(box.dataset.start || null);
  funnel((F.step || "svc") + "·avatud");
  render(false);
})();
