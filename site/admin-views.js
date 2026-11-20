// Halduskeskkonna vaated (serveris renderdatud HTML-vormid).
const ES = require("./data");
const cms = require("./cms");
const inquiries = require("./inquiries");
const mailer = require("./mailer");
const { layout, esc, ic, serviceBody } = require("./render");

const { SERVICES, SVC, RECIPIENTS, FLOW, COMMON } = ES;
const { ROLE_L, STATE_L, FIELD_L, FIELDS, fmt } = cms;

const badge = (l, c) => `<span class="stt ${c}">${esc(l)}</span>`;
const stateBadge = r => badge(STATE_L[r.state], r.state === "avaldatud" ? "ok" : r.state === "tagasi" ? "bad" : "wait");
const dt = s => s ? new Date(s).toLocaleString("et-EE", { timeZone: "Europe/Tallinn", dateStyle: "short", timeStyle: "short" }) : "—";
const csrfField = s => `<input type="hidden" name="_csrf" value="${esc(s.csrf)}">`;

function adminLayout(s, { title, body, tab }) {
  const u = s && s.user;
  const tabs = u ? [["/haldus", "yle", "Ülevaade"], ["/haldus/paringud", "paringud", "Päringud"], ["/haldus/teavitused", "teavitused", "Teavitused"], ["/haldus/logi", "logi", "Muudatuste logi"],
    ["/haldus/otsustustabel", "otsus", "Otsustustabel"], ["/haldus/statistika", "stat", "Vormi statistika"], ...(u.role === "admin" ? [["/haldus/seaded", "seaded", "Seaded"]] : [])] : [];
  const bar = u ? `<div class="adbar"><div class="wrap"><b>Haldus</b><span>${esc(u.name)} · ${ROLE_L[u.role]}</span>
    <a href="/haldus/parool" style="color:#fff">Muuda parooli</a>
    <form method="post" action="/haldus/logout" style="margin:0">${csrfField(s)}<button class="btn sm ghost" type="submit">Logi välja</button></form>
    ${mailer.configured() ? "" : `<span class="stt bad">E-post seadistamata (SMTP_HOST)</span>`}</div></div>
    <div class="wrap" style="padding-top:18px"><nav class="adtabs" aria-label="Halduse menüü">${tabs.map(([h, k, l]) => `<a href="${h}"${k === tab ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav></div>` : "";
  return layout({ title: `${title} · Haldus`, desc: "", body: bar + body, bodyClass: "inform", noindex: true, scripts: [] });
}

function pageLogin({ error, next }) {
  return adminLayout(null, { title: "Sisselogimine", body: `<div class="ph"><div class="wrap"><h1>Haldus</h1><p class="lede">Logige sisse, et näha päringuid ja muuta teenuslehti.</p></div></div>
  <section class="sec" style="padding-top:28px"><div class="wrap"><form class="fbox" method="post" action="/haldus/login" style="max-width:440px">
    ${error ? `<div class="alert" role="alert" style="margin:0 0 16px"><b>${esc(error)}</b></div>` : ""}
    <input type="hidden" name="next" value="${esc(next || "")}">
    <div class="fld"><label for="login">Kasutajatunnus või e-post</label><input type="text" id="login" name="login" autocomplete="username" required></div>
    <div class="fld"><label for="password">Parool</label><input type="password" id="password" name="password" autocomplete="current-password" required></div>
    <button class="btn red" type="submit">Logi sisse</button></form></div></section>` });
}

/* ---------- ülevaade ---------- */
function flowLegend(cur) {
  const st = [["mustand", "1. Teenuse omanik", "muudab sisu ja saadab edasi"], ["keel", "2. Keelekontroll", "parandab keele, avaldab või saadab tagasi"], ["avaldatud", "3. Avaldatud", "ülevaatuse tähtaeg algab uuesti"]];
  const on = k => cur && (cur === k || (cur === "tagasi" && k === "mustand"));
  return `<ol class="wf">${st.map(([k, b, s]) => `<li class="${on(k) ? "on" : ""}"><b>${b}</b><span>${s}</span></li>`).join("")}</ol>`;
}
function pageOverview(s, { newCount }) {
  const tasks = cms.myTasks(s.user);
  const rows = cms.allSvc().map(r => { const rs = cms.reviewStatus(r); return `<tr><td><b>${esc(r.published.name)}</b><br><small style="color:var(--muted)">v${r.version} · iga ${r.interval} kuu järel</small></td><td>${esc(cms.userName(r.owner))}</td><td>${stateBadge(r)}</td><td>${fmt(r.lastReviewed)}</td><td>${fmt(cms.nextReview(r))}</td><td>${badge(rs.l, rs.c)}</td><td><a class="btn sm ghost" href="/haldus/teenused/${r.slug}">Ava</a></td></tr>`; }).join("");
  return adminLayout(s, { title: "Ülevaade", tab: "yle", body: `<section class="sec" style="padding-top:24px"><div class="wrap" style="display:grid;gap:24px">
    <div class="ib"><h2 style="font-size:20px">Uued päringud</h2><p>${newCount ? `<a href="/haldus/paringud?status=Uus"><b>${newCount}</b> uut päringut ootab vastamist</a>` : "Uusi päringuid pole."}</p></div>
    <div class="ib"><h2 style="font-size:20px">Minu ülesanded (${tasks.length})</h2>${tasks.length ? `<ul class="tasks">${tasks.map(([slug, name, t, c]) => `<li><span class="stt ${c}">●</span><a href="/haldus/teenused/${slug}">${esc(name)}</a><span>${esc(t)}</span></li>`).join("")}</ul>` : "<p>Avatud ülesandeid pole.</p>"}</div>
    <div><h2 style="font-size:22px;margin-bottom:12px">Teenuslehed</h2>${flowLegend()}<div class="tblw" style="margin-top:14px"><table class="resp"><thead><tr><th>Teenus</th><th>Omanik</th><th>Olek</th><th>Viimane ülevaatus</th><th>Järgmine</th><th>Ülevaatus</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>
  </div></section>` });
}

/* ---------- päringud ---------- */
const nState = st => badge(st, st === "saadetud" ? "ok" : st === "ootel" ? "wait" : "bad");
function pageInquiries(s, { list, status, q }) {
  return adminLayout(s, { title: "Päringud", tab: "paringud", body: `<section class="sec" style="padding-top:24px"><div class="wrap" style="display:grid;gap:18px">
    <form method="get" class="acts" style="align-items:end">
      <div class="fld" style="margin:0"><label for="f_status">Staatus</label><select id="f_status" name="status"><option value="">Kõik</option>${inquiries.STATUSES.map(x => `<option ${x === status ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div class="fld" style="margin:0;min-width:260px"><label for="f_q">Otsi</label><input type="text" id="f_q" name="q" value="${esc(q)}" placeholder="Tunnus, nimi, e-post, teenus"></div>
      <button class="btn ghost" type="submit">Filtreeri</button></form>
    ${s.user.role !== "admin" ? `<p class="note">Näed päringuid, mille saaja või koopia saaja oled sina (${esc(s.user.email || "e-post määramata")}).</p>` : ""}
    <div class="tblw"><table class="resp"><thead><tr><th>Tunnus</th><th>Aeg</th><th>Teenus</th><th>Klient</th><th>Saaja</th><th>Staatus</th><th>Teavitus</th></tr></thead><tbody>
    ${list.length ? list.map(r => `<tr><td><a href="/haldus/paringud/${esc(r.id)}"><b>${esc(r.id)}</b></a></td><td>${dt(r.createdAt)}</td><td>${esc(r.service.name)}</td><td>${esc(r.contact.name)}${r.contact.company ? "<br><small>" + esc(r.contact.company) + "</small>" : ""}</td><td>${esc(RECIPIENTS[r.recipient.to].role)}</td><td>${badge(r.status, r.status === "Uus" ? "wait" : r.status === "Suletud" ? "ok" : "ok")}</td><td>${nState(r.notify.state)}</td></tr>`).join("") : `<tr><td colspan="7">Päringuid ei leitud.</td></tr>`}
    </tbody></table></div></div></section>` });
}
function pageInquiry(s, r) {
  const c = r.contact;
  return adminLayout(s, { title: r.id, tab: "paringud", body: `<div class="ph" style="padding-block:24px"><div class="wrap"><nav class="crumb"><a href="/haldus/paringud">Päringud</a> › <span aria-current="page">${esc(r.id)}</span></nav>
    <h1 style="font-size:clamp(26px,3.4vw,36px)">${esc(r.id)} · ${esc(r.service.name)}</h1><p>${badge(r.status, r.status === "Uus" ? "wait" : "ok")} <small style="color:var(--muted)">Saabus ${dt(r.createdAt)} · alustatud: ${esc(r.startedFrom)}</small></p></div></div>
  <section class="sec" style="padding-top:20px"><div class="wrap sv-grid">
    <div style="display:grid;gap:18px">
      <div class="ib"><h2 style="font-size:20px">Vastused</h2><div class="sum">${r.answers.map(a => `<div class="r"><span class="q">${esc(a.question)}</span><span class="a" style="white-space:pre-wrap">${esc(a.label)}</span></div>`).join("")}</div></div>
      ${r.fileRows.length ? `<div class="ib"><h2 style="font-size:20px">Failid</h2><ul class="checks">${r.fileRows.map(f => `<li>${ic("i-file")}<a href="/haldus/paringud/${esc(r.id)}/failid/${f.id}">${esc(f.orig_name)}</a> <small>(${Math.ceil(f.size / 1024)} kB)</small></li>`).join("")}</ul></div>` : ""}
      <details class="ib"><summary>E-kirja sisu ja teavituslogi</summary><pre style="white-space:pre-wrap">${esc(ES.emailText(r))}</pre><pre style="white-space:pre-wrap">${esc(r.notify.log.join("\n") || "Logi on tühi.")}</pre></details>
    </div>
    <aside class="side" style="top:16px">
      <div class="card"><h3>Klient</h3><p class="who"><b>${esc(c.name)}</b>${c.company ? esc(c.company) : ""}</p>
        <a class="l" href="mailto:${esc(c.email)}?subject=${encodeURIComponent("Re: päring " + r.id)}">${ic("i-mail")}${esc(c.email)}</a>${c.phone ? `<a class="l" href="tel:${esc(c.phone.replace(/\s/g, ""))}">${ic("i-phone")}${esc(c.phone)}</a>` : ""}
        <small>Eelistab: ${c.pref === "tel" ? "telefoni" : "e-posti"}</small></div>
      <div class="card"><h3>Suunamine</h3><p>${esc(RECIPIENTS[r.recipient.to].role)}: ${esc(RECIPIENTS[r.recipient.to].person)}</p>${r.recipient.cc.length ? `<small>Koopia: ${r.recipient.cc.map(k => esc(RECIPIENTS[k].role)).join(", ")}</small>` : ""}
        <p>Teavitus: ${nState(r.notify.state)} (${r.notify.attempts}×)</p>
        <form method="post" action="/haldus/paringud/${esc(r.id)}/teavita">${csrfField(s)}<button class="btn sm ghost" type="submit">Saada teavitus uuesti</button></form></div>
      <div class="card"><h3>Staatus</h3><form method="post" action="/haldus/paringud/${esc(r.id)}/staatus" class="acts">${csrfField(s)}<select name="status" aria-label="Staatus">${inquiries.STATUSES.map(x => `<option ${x === r.status ? "selected" : ""}>${x}</option>`).join("")}</select><button class="btn sm red" type="submit">Salvesta</button></form></div>
      ${s.user.role === "admin" ? `<form method="post" action="/haldus/paringud/${esc(r.id)}/kustuta" data-confirm="Kustutada päring ${esc(r.id)} koos failidega jäädavalt?">${csrfField(s)}<button class="btn sm ghost" type="submit">Kustuta päring</button></form>` : ""}
    </aside></div></section>` });
}

/* ---------- teenuse toimeti ---------- */
function editorHtml(slug, d, ro, langOnly) {
  const dis = ro ? "disabled" : "";
  const ta = (f, v, rows, hint) => `<div class="fld"><label for="ed_${f}">${FIELD_L[f]}</label>${hint ? `<span class="hint">${hint}</span>` : ""}<textarea id="ed_${f}" name="ed_${f}" rows="${rows}" ${dis}>${esc(v)}</textarea></div>`;
  const others = SERVICES.filter(s => s.slug !== slug);
  return `<div class="ed">
    <div class="fld"><label for="ed_name">${FIELD_L.name}</label><input type="text" id="ed_name" name="ed_name" value="${esc(d.name)}" ${dis}></div>
    ${ta("lead", d.lead, 2)}${ta("problem", d.problem, 3)}${ta("note", d.note, 2, "Valikuline")}
    <div class="row2">${ta("forWho", d.forWho.join("\n"), 5, "Üks rida = üks sihtrühm")}${ta("includes", d.includes.join("\n"), 5, "Üks rida = üks töö")}</div>
    ${ta("order", d.order.map(x => x.join(" | ")).join("\n"), 4, "Rida: samm | kirjeldus")}
    ${ta("facts", d.facts.map(x => x.slice(1).join(" | ")).join("\n"), 3, "3 rida: pealkiri | kirjeldus (ikoonid jäävad)")}
    <fieldset class="fld"><legend style="font:500 15px var(--display);margin-bottom:6px">${FIELD_L.related}</legend><span class="hint">Linnuke = näidatakse lehel ja pakutakse vormis lisateenusena${langOnly ? " (keeletoimetaja saab muuta ainult põhjenduse teksti)" : ""}</span>
      <div class="relx">${others.map(s => { const cur = d.related.find(x => x[0] === s.slug); return `<label><input type="checkbox" name="rel" value="${s.slug}" ${cur ? "checked" : ""} ${ro || langOnly ? "disabled" : ""}><span>${esc(s.name)}</span><input type="text" name="relwhy_${s.slug}" value="${esc(cur ? cur[1] : "")}" placeholder="Miks koos?" aria-label="Miks koos: ${esc(s.name)}" ${ro ? "disabled" : ""}></label>`; }).join("")}</div></fieldset>
    <fieldset class="fld"><legend style="font:500 15px var(--display);margin-bottom:6px">${FIELD_L.contact}</legend><div class="row2">
      ${[["name", "Nimi"], ["role", "Roll"], ["email", "E-post"], ["phone", "Telefon"]].map(([k, l]) => `<div class="fld"><label for="ed_c_${k}">${l}</label><input type="text" id="ed_c_${k}" name="ed_c_${k}" value="${esc(d.contact[k])}" ${ro || (langOnly && k !== "role") ? "disabled" : ""}></div>`).join("")}</div></fieldset>
  </div>`;
}
function diffHtml(a, b) {
  const show = (f, x) => f === "contact" ? Object.values(x).join(" · ") : Array.isArray(x) ? x.map(y => Array.isArray(y) ? (f === "related" ? (SVC[y[0]] ? SVC[y[0]].name : y[0]) + ": " + y[1] : y.filter(Boolean).slice(f === "facts" ? 1 : 0).join(" – ")) : y).join("\n") : x;
  const ch = FIELDS.filter(f => JSON.stringify(a[f]) !== JSON.stringify(b[f]));
  if (!ch.length) return `<p class="note">Avaldatud versiooniga võrreldes muudatusi ei ole.</p>`;
  return `<div class="diff">${ch.map(f => `<div class="dr"><b>${FIELD_L[f]}</b><pre class="old">${esc(show(f, a[f]))}</pre><pre class="new">${esc(show(f, b[f]))}</pre></div>`).join("")}</div>`;
}
function pageService(s, slug, { error, notice } = {}) {
  const u = s.user, r = cms.svc(slug), rs = cms.reviewStatus(r), d = r.draft || r.published;
  const editable = cms.can.edit(u, r) && r.state !== "avaldatud", langMode = cms.can.lang(u, r);
  const btn = (a, l, cls = "ghost", confirm) => `<button class="btn ${cls}" type="submit" name="action" value="${a}" ${confirm ? `data-confirm="${esc(confirm)}"` : ""}>${l}</button>`;
  const acts = [];
  if (cms.can.edit(u, r) && r.state === "avaldatud") acts.push(btn("startEdit", "Muuda sisu", "red"));
  if (cms.can.review(u, r)) acts.push(btn("review", "Kinnitan, et sisu on ajakohane"));
  if (editable) acts.push(btn("saveDraft", "Salvesta mustand"), btn("submit", "Saada keelekontrolli", "red"), btn("discard", "Loobu muudatustest", "sm back", "Loobuda kõigist mustandi muudatustest?"));
  if (langMode) acts.push(btn("langSave", "Salvesta parandused"), btn("publish", "Kinnita ja avalda", "red", "Avaldada muudatus kodulehel?"));
  const why = !acts.length ? (r.state === "keel" ? "Muudatus on keelekontrollis. Seda saab nüüd muuta ainult keeletoimetaja." : `Sul ei ole selle teenuse muutmise õigust. Omanik: ${cms.userName(r.owner)}.`) : "";
  const preview = serviceBody({ ...SVC[slug], ...JSON.parse(JSON.stringify(d)), slug }, d.related);
  const hist = cms.history(slug);
  return adminLayout(s, { title: r.published.name, tab: "yle", body: `<div class="ph" style="padding-block:24px"><div class="wrap"><nav class="crumb"><a href="/haldus">Ülevaade</a> › <span aria-current="page">${esc(r.published.name)}</span></nav>
    <div class="row"><div><h1 style="font-size:clamp(26px,3.4vw,38px)">${esc(d.name)}</h1>
    <p>${stateBadge(r)} ${badge("Ülevaatus: " + rs.l, rs.c)} <small style="color:var(--muted)">Omanik: <b>${esc(cms.userName(r.owner))}</b> · viimati üle vaadatud ${fmt(r.lastReviewed)} · järgmine ${fmt(cms.nextReview(r))} · versioon ${r.version}</small></p></div>
    <a class="btn sm ghost" href="/teenused/${slug}" target="_blank" rel="noopener">Vaata avalikku lehte</a></div></div></div>
  <section class="sec" style="padding-top:20px"><div class="wrap"><form method="post" action="/haldus/teenused/${slug}" style="display:grid;gap:22px">${csrfField(s)}
    ${flowLegend(r.state)}
    ${notice ? `<p class="note">${esc(notice)}</p>` : ""}
    ${r.state === "tagasi" ? `<div class="alert"><b>Keeletoimetaja kommentaar</b><span>${esc(r.comment)}</span></div>` : ""}
    <div class="acts">${acts.join("")}</div>${why ? `<p class="note">${esc(why)}</p>` : ""}${error ? `<p class="err" role="alert">${ic("i-alert")}${esc(error)}</p>` : ""}
    ${langMode ? `<div class="ib"><h2 style="font-size:20px">Muudatused avaldatud versiooniga võrreldes</h2>${diffHtml(r.published, r.draft)}
      <div class="fld"><label for="langComment">Kommentaar omanikule (tagasi saatmisel kohustuslik)</label><textarea id="langComment" name="langComment" rows="2"></textarea></div>
      <div>${btn("reject", "Saada tagasi omanikule")}</div></div>` : ""}
    ${(r.state === "tagasi" || r.state === "mustand") && r.draft ? `<details class="ib"><summary>Muudatused avaldatud versiooniga võrreldes</summary>${diffHtml(r.published, r.draft)}</details>` : ""}
    <div class="ib"><h2 style="font-size:20px">${editable ? "Muuda sisu" : langMode ? "Paranda keelt" : "Sisu"}${r.draft && !editable && !langMode ? " (mustand)" : ""}</h2>${editorHtml(slug, d, !(editable || langMode), langMode)}</div>
  </form>
    <details class="ib" style="margin-top:22px"><summary>Eelvaade${r.draft ? " (salvestatud mustand)" : ""}</summary><div class="pvbox">${preview}</div></details>
    <div class="ib" style="margin-top:22px"><h2 style="font-size:20px">Ajalugu</h2><div class="tblw"><table><tbody>${hist.map(h => `<tr><td>${dt(h.at.length > 10 ? h.at : h.at + "T12:00:00Z")}</td><td>${esc(cms.userName(h.by_user))}</td><td>${esc(h.act)}</td></tr>`).join("")}</tbody></table></div></div>
  </div></section>` });
}

/* ---------- teavitused, logi, otsustustabel, statistika ---------- */
function pageNotifications(s) {
  const n = cms.notifications();
  return adminLayout(s, { title: "Teavitused", tab: "teavitused", body: `<section class="sec" style="padding-top:24px"><div class="wrap" style="display:grid;gap:12px">
    ${n.length ? n.map(x => `<div class="ib"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b style="font-family:var(--display)">${esc(x.subject)}</b><small>${dt(x.at)} · ${esc(x.state)}</small></div><small>Saaja: ${esc(x.recipients.join(", "))}</small><p>${esc(x.body)}</p></div>`).join("") : "<p>Teavitusi pole.</p>"}
  </div></section>` });
}
function pageLog(s) {
  const all = cms.history();
  return adminLayout(s, { title: "Muudatuste logi", tab: "logi", body: `<section class="sec" style="padding-top:24px"><div class="wrap"><div class="tblw"><table><thead><tr><th>Aeg</th><th>Teenus</th><th>Kes</th><th>Tegevus</th></tr></thead><tbody>
    ${all.map(h => `<tr><td>${dt(h.at.length > 10 ? h.at : h.at + "T12:00:00Z")}</td><td>${esc(SVC[h.slug] ? SVC[h.slug].name : h.slug)}</td><td>${esc(cms.userName(h.by_user))}</td><td>${esc(h.act)}</td></tr>`).join("")}</tbody></table></div></div></section>` });
}
function condText(c) {
  if (!c) return "alati";
  if (c.all) return c.all.map(condText).join(" JA ");
  if (c.any) return "(" + c.any.map(condText).join(" VÕI ") + ")";
  const lab = v => { const q = [...Object.values(FLOW).flatMap(f => f.q), ...COMMON].find(q => q.id === c.q); return q && q.opts ? (q.opts.find(x => x.v === v) || {}).l || v : v; };
  const vals = c.in || c.not;
  return `<code>${c.q}</code> ${c.in ? "=" : "≠"} ${vals.length > 3 && c.q === "loc" ? "Lõuna-Eesti maakond" : vals.map(lab).map(esc).join(" / ")}`;
}
function pageDecisionTable(s) {
  const rows = Object.entries(FLOW).map(([slug, f]) => {
    const name = ES.svcName(slug);
    const qs = f.q.map(q => `<tr><td>${esc(name)}</td><td><code>${q.id}</code></td><td>${q.type === "info" ? "<i>Teade:</i> " : ""}${esc(q.text)}</td><td>${q.opts ? q.opts.map(x => esc(x.l)).join(" · ") : q.type === "info" ? "—" : "vabatekst"}</td><td>${condText(q.when)}</td></tr>`).join("");
    const rt = f.route.map(r => `${condText(r.when)} → <b>${esc(RECIPIENTS[r.to].role)}</b> (${esc(RECIPIENTS[r.to].email)})`).join("<br>") + (f.cc.length ? "<br><i>Koopia:</i> " + f.cc.map(r => `${condText(r.when)} → ${esc(RECIPIENTS[r.to].role)}`).join("<br>") : "");
    const xq = ES.extraQ(slug);
    const xr = xq ? `<tr><td>${esc(name)}</td><td><code>extra</code></td><td>${esc(xq.text)} <i>(valikuline, mitu)</i></td><td>${xq.opts.map(x => esc(x.l)).join(" · ")}</td><td>alati · iga valik lisab selle teenuse vastutaja koopiasse</td></tr>` : "";
    return qs + xr + `<tr style="background:#FFFBEA"><td>${esc(name)}</td><td colspan="4"><b>Saaja:</b> ${rt}</td></tr>`;
  }).join("");
  return adminLayout(s, { title: "Otsustustabel", tab: "otsus", body: `<section class="sec tp" style="padding-top:24px"><div class="wrap">
    <p style="font-size:14px;color:var(--muted);margin-bottom:10px">Kõigil teenustel peale „Vajan abi“ järgnevad ühised sammud: <code>loc</code> maakond, <code>time</code> algusaeg, <code>desc</code> lisainfo ja failid, siis kontakt ja kokkuvõte. Reeglite muutmiseks muuda faili <code>site/data.js</code>.</p>
    <div class="tblw"><table><thead><tr><th>Teenus</th><th>ID</th><th>Küsimus</th><th>Vastusevariandid</th><th>Näidatakse, kui</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>` });
}
function pageStats(s) {
  const fun = inquiries.funnel();
  return adminLayout(s, { title: "Vormi statistika", tab: "stat", body: `<section class="sec tp" style="padding-top:24px"><div class="wrap">
    <p style="font-size:14px;color:var(--muted);margin-bottom:10px">Teenus · keel · samm. Nime, kontakte, faile ega vabateksti ei salvestata.</p>
    <div class="tblw"><table><thead><tr><th>Teenus</th><th>Keel</th><th>Samm</th><th>Kordi</th></tr></thead><tbody>${fun.map(({ k, n }) => { const [sv, l, st] = k.split("|"); return `<tr><td>${esc(sv === "-" ? "—" : ES.svcName(sv))}</td><td>${esc(l)}</td><td>${esc(st)}</td><td>${n}</td></tr>`; }).join("") || `<tr><td colspan="4">Andmed puuduvad</td></tr>`}</tbody></table></div></div></section>` });
}

/* ---------- seaded ja parool ---------- */
function pageSettings(s, { notice, error } = {}) {
  const st = cms.settings(), users = cms.users(), owners = users.filter(u => u.role === "owner" || u.role === "admin");
  return adminLayout(s, { title: "Seaded", tab: "seaded", body: `<section class="sec" style="padding-top:24px"><div class="wrap" style="display:grid;gap:24px;max-width:900px">
    ${notice ? `<p class="note">${esc(notice)}</p>` : ""}${error ? `<div class="alert" role="alert"><b>${esc(error)}</b></div>` : ""}
    <form class="ib" method="post" action="/haldus/seaded">${csrfField(s)}<h2 style="font-size:20px">Ülevaatuse, teavituste ja säilitamise reeglid</h2>
      <div class="row2"><div class="fld"><label for="st_remind">Meeldetuletus enne tähtaega (päeva)</label><input type="text" inputmode="numeric" id="st_remind" name="remindDays" value="${st.remindDays}"></div>
      <div class="fld"><label for="st_esc">Eskalatsioon adminile pärast tähtaega (päeva)</label><input type="text" inputmode="numeric" id="st_esc" name="escalateDays" value="${st.escalateDays}"></div>
      <div class="fld"><label for="st_lang">Keelekontrolli ootamise piir (päeva)</label><input type="text" inputmode="numeric" id="st_lang" name="langSlaDays" value="${st.langSlaDays}"></div>
      <div class="fld"><label for="st_ret">Päringute säilitamine (kuud, 0 = lõputult)</label><input type="text" inputmode="numeric" id="st_ret" name="retentionMonths" value="${st.retentionMonths}"></div>
      <div class="fld"><label for="st_mail">Administraatori e-post (eskalatsioonid)</label><input type="email" id="st_mail" name="adminEmail" value="${esc(st.adminEmail)}"></div></div>
      <h3 style="margin-top:10px">Omanikud ja ülevaatuse intervall</h3>
      <div class="tblw"><table><thead><tr><th>Teenus</th><th>Omanik</th><th>Intervall</th></tr></thead><tbody>${cms.allSvc().map(r => `<tr><td>${esc(r.published.name)}</td><td><select name="own_${r.slug}" aria-label="Omanik: ${esc(r.published.name)}"><option value="">Määramata</option>${owners.map(u => `<option value="${u.id}" ${u.id === r.owner ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select></td><td><select name="int_${r.slug}" aria-label="Intervall: ${esc(r.published.name)}">${[3, 6, 12].map(m => `<option value="${m}" ${m === r.interval ? "selected" : ""}>${m} kuud</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>
      <button class="btn red" type="submit" style="justify-self:start">Salvesta seaded</button></form>
    <div class="ib"><h2 style="font-size:20px">Kasutajad</h2>
      <div class="tblw"><table><thead><tr><th>Tunnus</th><th>Nimi</th><th>Roll</th><th>E-post</th><th>Parool</th></tr></thead><tbody>${users.map(u => `<tr><td><code>${esc(u.id)}</code></td><td>${esc(u.name)}</td><td>${ROLE_L[u.role]}</td><td>${esc(u.email || "—")}</td><td>${u.has_pw ? badge("määratud", "ok") : badge("puudub", "bad")}</td></tr>`).join("")}</tbody></table></div>
      <form method="post" action="/haldus/kasutajad" style="display:grid;gap:4px">${csrfField(s)}<h3>Lisa või muuda kasutajat</h3>
        <div class="row2"><div class="fld"><label for="u_id">Kasutajatunnus</label><input type="text" id="u_id" name="id" required pattern="[a-z0-9._\\-]{2,40}"></div>
        <div class="fld"><label for="u_name">Nimi</label><input type="text" id="u_name" name="name" required></div>
        <div class="fld"><label for="u_role">Roll</label><select id="u_role" name="role">${Object.entries(ROLE_L).map(([k, l]) => `<option value="${k}" ${k === "owner" ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="fld"><label for="u_email">E-post</label><input type="email" id="u_email" name="email"></div>
        <div class="fld"><label for="u_pw">Uus parool <span class="hint">(valikuline, vähemalt 10 märki)</span></label><input type="password" id="u_pw" name="password" autocomplete="new-password"></div></div>
        <button class="btn ghost" type="submit" style="justify-self:start">Salvesta kasutaja</button></form></div>
  </div></section>` });
}
function pagePassword(s, { notice, error } = {}) {
  return adminLayout(s, { title: "Muuda parooli", tab: "", body: `<section class="sec" style="padding-top:24px"><div class="wrap"><form class="fbox" method="post" action="/haldus/parool" style="max-width:440px">${csrfField(s)}
    <h1 style="font-size:26px;margin-bottom:14px">Muuda parooli</h1>
    ${notice ? `<p class="note">${esc(notice)}</p>` : ""}${error ? `<div class="alert" role="alert" style="margin:0 0 12px"><b>${esc(error)}</b></div>` : ""}
    <div class="fld"><label for="pw_old">Praegune parool</label><input type="password" id="pw_old" name="old" autocomplete="current-password" required></div>
    <div class="fld"><label for="pw_new">Uus parool <span class="hint">(vähemalt 10 märki)</span></label><input type="password" id="pw_new" name="new" autocomplete="new-password" required minlength="10"></div>
    <button class="btn red" type="submit">Salvesta</button></form></div></section>` });
}

module.exports = { pageLogin, pageOverview, pageInquiries, pageInquiry, pageService, pageNotifications, pageLog, pageDecisionTable, pageStats, pageSettings, pagePassword };
