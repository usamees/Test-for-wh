// Avalike lehtede HTML (serveris renderdatud, et lehed oleksid otsingumootoritele
// loetavad ja töötaksid ka ilma JavaScriptita). Kujundus ja tekstid prototüübist.
const fs = require("node:fs");
const path = require("node:path");
const ES = require("./data");

const ICONS = fs.readFileSync(path.join(__dirname, "views", "icons.svg.html"), "utf8");
const { ORG, SERVICES, SVC, GROUPS } = ES;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ic = (id, cls = "") => `<svg class="ic ${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const tel = p => "tel:" + String(p).replace(/\s/g, "");
const baseUrl = () => (process.env.PUBLIC_URL || "").replace(/\/$/, "");

const NAV = [["/teenused", "teenused", "Teenused"], ["/tehtud-tood", "tehtud-tood", "Tehtud tööd"], ["/ettevottest", "ettevottest", "Ettevõttest"], ["/karjaar", "karjaar", "Karjäär"], ["/kontakt", "kontakt", "Kontakt"]];

function layout({ title, desc, body, nav = "", bodyClass = "", canonical = "", scripts = [], noindex = false, head = "" }) {
  const full = title ? `${title} · E-Service AS` : "E-Service AS";
  const canon = canonical && baseUrl() ? `<link rel="canonical" href="${baseUrl()}${canonical}">` : "";
  const ld = { "@context": "https://schema.org", "@type": "Organization", name: ORG.name, url: baseUrl() || undefined, email: ORG.email, telephone: ORG.phone, vatID: ORG.vat, taxID: ORG.reg,
    address: { "@type": "PostalAddress", streetAddress: "Salve tn 2a", addressLocality: "Tallinn", postalCode: "11612", addressCountry: "EE" } };
  return `<!doctype html>
<html lang="et">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc || "")}">
${noindex ? '<meta name="robots" content="noindex,nofollow">' : ""}
${canon}
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(desc || "")}">
<meta property="og:type" content="website">
<meta property="og:locale" content="et_EE">
${baseUrl() ? `<meta property="og:image" content="${baseUrl()}/img/p1.jpg">` : ""}
<link rel="icon" type="image/svg+xml" href="/img/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap">
<link rel="stylesheet" href="/css/site.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
${head}
</head>
<body class="${bodyClass}">
${ICONS}
<a class="sr" href="#sisu">Liigu sisu juurde</a>
<div class="top"><div class="wrap">
  <a class="hot" href="${ORG.hotHref}">Rikketelefon 24/7 <b>${ORG.hot}</b></a>
  <span class="loc">Tallinn · Tartu · Pärnu</span>
  <span class="lang" aria-label="Keel"><span class="on" aria-current="true">ET</span><span class="off" title="Ingliskeelne versioon tuleb hiljem" aria-disabled="true">EN</span></span>
</div></div>
<header class="main"><div class="wrap">
  <a class="logo" href="/" aria-label="E-Service AS avaleht"><img src="/img/logo.png" alt="E-Service AS" width="700" height="179"></a>
  <nav class="menu" id="menu" aria-label="Peamenüü">
    <button class="iconbtn close" type="button" aria-label="Sulge menüü" data-act="menu-close">${ic("i-x")}</button>
    ${NAV.map(([href, key, label]) => `<a href="${href}"${key === nav ? ' aria-current="page"' : ""}>${label}</a>${key === "teenused" ? `<a class="sub" href="/teenused#ehitus">${GROUPS.ehitus}</a><a class="sub" href="/teenused#too">${GROUPS.too}</a>` : ""}`).join("\n    ")}
    <a class="m247" href="${ORG.hotHref}"><small>Rikketelefon 24/7</small><b>${ORG.hot}</b></a>
    <a class="m-only btn red" href="/paring" style="margin-top:12px;border:0">Küsi pakkumist</a>
  </nav>
  <button class="iconbtn" type="button" aria-label="Otsi" data-act="search">${ic("i-search")}</button>
  <a class="btn red cta-h" href="/paring">Küsi pakkumist</a>
  <button class="iconbtn burger" type="button" aria-label="Ava menüü" aria-controls="menu" aria-expanded="false" data-act="menu">${ic("i-menu")}</button>
</div></header>
<main id="sisu" tabindex="-1">
${body}
</main>
<footer><div class="wrap">
  <div><img src="/img/logo.png" alt="E-Service AS" width="700" height="179" loading="lazy"></div>
  <div><b>Teenused</b><a href="/teenused/elektritood">Elektritööd</a><a href="/teenused/kait-ja-hooldus">Käit ja hooldus</a><a href="/teenused/paikesejaamad">Päikesejaamad</a><a href="/teenused/mootelabor">Mõõtelabor</a><a href="/teenused">Kõik teenused</a></div>
  <div><b>Ettevõte</b><a href="/tehtud-tood">Tehtud tööd</a><a href="/ettevottest">Ettevõttest</a><a href="/karjaar">Karjäär</a><a href="/kontakt">Kontakt</a></div>
  <div><b>Kontakt</b><a href="${tel(ORG.phone)}">${ORG.phone}</a><a href="mailto:${ORG.email}">${ORG.email}</a><span>Reg. kood ${ORG.reg}</span></div>
  <div class="legal"><span>© ${new Date().getFullYear()} ${ORG.name}</span><span><a href="/privaatsus" style="display:inline">Privaatsus ja küpsised</a> · <a href="/ettevottest#toetused" style="display:inline">Toetused</a></span></div>
</div></footer>
<div class="mbar"><a class="btn ghost" href="${ORG.hotHref}">Helista 24/7</a><a class="btn red" href="/paring">Küsi pakkumist</a></div>
<script src="/js/site.js" defer></script>
${scripts.map(s => `<script src="${s}" defer></script>`).join("\n")}
</body>
</html>`;
}

/* ---------- avaleht ---------- */
const svcLink = s => `<li><a href="/teenused/${s.slug}">${ic(s.icon)}${esc(s.name)}</a></li>`;
function ctaBand(slug) {
  return `<section class="cta-b"><div class="wrap">${ic("i-mail")}<div><h2>Räägime Sinu projektist</h2><p>Kirjelda vajadust ja päring jõuab kohe õige inimeseni.</p></div>
  <div class="acts"><a class="btn white" href="/paring${slug ? "/" + slug : ""}">Saada päring</a><a class="btn ghostw" href="${ORG.hotHref}">${ic("i-phone")}${ORG.hot}</a></div></div></section>`;
}
function pageHome() {
  const g = k => SERVICES.filter(s => s.group === k).map(svcLink).join("");
  const flow = [["i-chat", "1. Kaardistame vajaduse", "Arutame läbi objekti ja ootused."], ["i-layers", "2. Planeerime lahenduse", "Tehniline lahendus ja ajakava."], ["i-file", "3. Teeme pakkumise", "Tööde ulatus ja hind."], ["i-hat", "4. Teostame", "Kokkulepitud ajal ja ohutult."], ["i-shield", "5. Hoiame töös", "Käit, hooldus ja tugi 24/7."]];
  const body = `
  <section class="hero"><div class="wrap in">
    <div class="txt"><span class="eyebrow" style="color:var(--lime)">Elektritööd alates 1992</span>
      <h1>Ühendused, mis kestavad.</h1>
      <p>Ehitame, projekteerime ja hoiame töös elektripaigaldisi pistikupesast kuni 35 kV võrguni. Üle Eesti, ööpäev läbi.</p>
      <div class="ctas"><a class="btn white" href="/paring">Küsi pakkumist</a><a class="btn ghostw" href="/teenused">Vaata teenuseid</a></div></div>
    <div class="img" style="background-image:url(/img/p1.jpg)" role="img" aria-label="Elektrik objektil"></div>
  </div><div class="band"><span>350+ käiduobjekti hoiame töös iga päev</span></div></section>
  <nav class="paths" aria-label="Kiirvalikud">
    <a href="/teenused/elektritood">${ic("i-tower")}<small>Ehitus</small><b>Uus objekt</b><span>Elektritööd, projekt, liitumine</span></a>
    <a href="/teenused/kait-ja-hooldus">${ic("i-tools")}<small>Haldus</small><b>Käit ja hooldus</b><span>Järelevaataja, käidukava, 24/7</span></a>
    <a href="/teenused/paikesejaamad">${ic("i-sun")}<small>Energia</small><b>Päike, aku, laadija</b><span>Lahendus koos paigaldusega</span></a>
    <a href="/karjaar">${ic("i-hat")}<small>Karjäär</small><b>Tule tööle</b><span>Töö ja praktika</span></a>
  </nav>
  <section class="sec"><div class="wrap">
    <div class="hd"><h2>Teenused rühmitatud selle järgi, mida vajate</h2><a class="more" href="/teenused">Kõik teenused</a></div>
    <div class="svc dirB">
      <div class="col c1"><h3>${GROUPS.ehitus}</h3><p>Projektist kuni mõõtmiste ja üleandmiseni, võtmed kätte.</p><ul>${g("ehitus")}</ul></div>
      <div class="col c2"><h3>${GROUPS.too}</h3><p>Järelevalve, korralised hooldused ja rikete kõrvaldamine 24/7.</p><ul>${g("too")}</ul></div>
    </div></div></section>
  <section class="proof" aria-label="Ettevõte numbrites">
    <div>${ic("i-cal")}<p><b>30+</b><span>aastat elektritöid</span></p></div>
    <div>${ic("i-gear")}<p><b>350+</b><span>käiduobjekti</span></p></div>
    <div>${ic("i-users")}<p><b>150+</b><span>töötajat</span></p></div>
    <div>${ic("i-zap")}<p><b>24/7</b><span>rikkevalmidus</span></p></div>
  </section>
  <section class="sec flowsec"><div class="wrap">
    <div class="hd"><h2>Kuidas koostöö käib</h2><a class="more" href="/paring">Saada päring</a></div>
    <ol class="flow">${flow.map(([i, b, s]) => `<li class="st"><span class="nd">${ic(i)}</span><b>${b}</b><span>${s}</span></li>`).join("")}</ol>
  </div></section>
  <section class="sec"><div class="wrap">
    <div class="hd"><h2>Meid usaldavad</h2><a class="more" href="/tehtud-tood">Tehtud tööd</a></div>
    <p class="logos">${["Elektrilevi", "Merko", "Rimi", "Selver", "Prisma", "Coop", "Bauhaus", "ABB", "Alexela", "Neste", "Viru Keskus", "Elektrum", "Connecto", "Leonhard Weiss", "Enersense"].map(x => `<span>${x}</span>`).join("")}</p>
  </div></section>
  <section class="career"><div class="txt"><span class="eyebrow" style="color:var(--ink)">Karjäär</span><h2>Tee tööd, mille tulemus jääb aastakümneteks.</h2>
    <p>Ootame elektrikuid, insenere ja praktikante. Toetame erialatudengeid stipendiumitega TalTechis ja TTK-s.</p>
    <div class="perks"><span>${ic("i-pin")}Objektid üle Eesti</span><span>${ic("i-grad")}Stipendiumid ja praktika</span><span>${ic("i-users")}150+ kolleegi</span></div>
    <a class="btn red" style="justify-self:start" href="/karjaar">Töö ja praktika</a></div>
    <div class="img" style="background-image:url(/img/p2.jpg)" role="img" aria-label="E-Service töötajad"></div></section>
  ${ctaBand()}`;
  return layout({ title: "Elektritööd alates 1992", desc: "Ehitame, projekteerime ja hoiame töös elektripaigaldisi pistikupesast kuni 35 kV võrguni. Üle Eesti, ööpäev läbi.", body, canonical: "/" });
}

/* ---------- teenused ---------- */
function pageServices() {
  const card = s => `<a class="svcard" href="/teenused/${s.slug}">${ic(s.icon)}<h3>${esc(s.name)}</h3><p>${esc(s.lead)}</p><span class="go">Loe lähemalt →</span></a>`;
  const body = `<div class="ph"><div class="wrap"><nav class="crumb" aria-label="Asukoht"><a href="/">Avaleht</a> › <span aria-current="page">Teenused</span></nav>
    <div class="row"><div><h1>Teenused</h1><p class="lede">Ehitame ja paigaldame uusi lahendusi ning hoiame olemasolevaid paigaldisi töös.</p></div><a class="btn red" href="/paring">Saada päring</a></div></div></div>
  <section class="sec"><div class="wrap">
    ${Object.entries(GROUPS).map(([k, t]) => `<h2 class="gh" id="${k}">${t}</h2><div class="grid3" style="margin-bottom:36px">${SERVICES.filter(s => s.group === k).map(card).join("")}</div>`).join("")}
    <a class="svcard" href="/paring/abi" style="border-style:dashed;max-width:520px">${ic("i-chat")}<h3>Ei tea, milline teenus sobib?</h3><p>Kirjeldage vajadust oma sõnadega ja suuname päringu õigele inimesele.</p><span class="go">Vajan abi teenuse valikul →</span></a>
  </div></section>`;
  return layout({ title: "Teenused", desc: "E-Service AS teenused: elektritööd, projekteerimine, päikesejaamad, akusüsteemid, autolaadijad, käit ja hooldus, järelevaataja, mõõtelabor, raamlepingud.", body, nav: "teenused", canonical: "/teenused" });
}
const WHO_IC = [[/era|kodu|korter/i, "i-bldg"], [/tööstus|tootmis|kaubandus/i, "i-factory"], [/võrgu|kõrgepinge/i, "i-tower"], [/avalik|sektor/i, "i-public"], [/ehita|arenda/i, "i-hat"], [/päike/i, "i-sun"], [/laadi/i, "i-plug"], [/kinnisvara|hoone|haldur|omanik/i, "i-bldg"], [/ettevõt|kontor|tellija/i, "i-users"]];
const whoIcon = x => (WHO_IC.find(([r]) => r.test(x)) || [0, "i-users"])[1];
const STEP_IC = ["i-chat", "i-layers", "i-file", "i-hat", "i-shield"];
const initials = n => String(n).split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();

/** Teenuse lehe sisu. `s` = teenus koos (avaldatud või mustandi) sisuga, `related` = [[slug, miks], ...] */
function serviceBody(s, related) {
  return `<div class="svp-hero"><div class="wrap"><nav class="crumb" aria-label="Asukoht"><a href="/">Avaleht</a> › <a href="/teenused">Teenused</a> › ${GROUPS[s.group]} › <span aria-current="page">${esc(s.name)}</span></nav>
    <div class="ph row" style="padding:0;background:none"><div><h1 style="font-size:clamp(30px,4.2vw,46px);margin-bottom:12px">${esc(s.name)}</h1><p class="lede">${esc(s.lead)}</p></div><a class="btn red" href="/paring/${s.slug}">Küsi pakkumist</a></div></div></div>
  <div class="wrap"><div class="benefits">${s.facts.map(([i, b, d]) => `<div>${ic(i)}<p><b>${esc(b)}</b>${esc(d)}</p></div>`).join("")}</div></div>
  <section class="sec" style="padding-top:44px"><div class="wrap sv-grid">
    <div>
      <div class="block"><h2>Millise probleemi lahendab</h2><p>${esc(s.problem)}</p>${s.note ? `<p class="note">${esc(s.note)}</p>` : ""}</div>
      <div class="block"><h2>Mida teeme</h2><ul class="checks two">${s.includes.map(x => `<li>${ic("i-check")}<span>${esc(x)}</span></li>`).join("")}</ul></div>
      <div class="block"><h2>Kellele</h2><div class="who-list">${s.forWho.map(x => `<span>${ic(whoIcon(x))}${esc(x)}</span>`).join("")}</div></div>
      ${related && related.length ? `<div class="block"><h2>Sageli tellitakse koos</h2><div class="rel">${related.filter(([r]) => SVC[r]).map(([r, why]) => `<a href="/teenused/${r}">${ic(SVC[r].icon)}<b>${esc(SVC[r].name)}</b><span>${esc(why)}</span></a>`).join("")}</div></div>` : ""}
      <div class="block"><h2>Kuidas tellimine käib</h2><ol class="flow sm c4">${s.order.map(([b, d], i) => `<li class="st"><span class="nd">${ic(STEP_IC[i] || "i-check")}</span><b>${esc(b)}</b><span>${esc(d)}</span></li>`).join("")}</ol></div>
      <div class="owner"><span class="av" aria-hidden="true">${esc(initials(s.contact.name))}</span><div class="who"><b>${esc(s.contact.name)}</b>${esc(s.contact.role)}<a href="mailto:${esc(s.contact.email)}">${esc(s.contact.email)}</a><a href="${esc(tel(s.contact.phone))}">${esc(s.contact.phone)}</a></div><a class="btn red" href="/paring/${s.slug}">Küsi pakkumist</a></div>
    </div>
    <aside class="side" aria-label="Kontakt">
      <div class="card"><h3>Saada päring</h3><p style="font-size:15px;color:var(--muted)">Vastake mõnele küsimusele. Päring jõuab otse teenuse eest vastutava inimeseni.</p><a class="btn red" href="/paring/${s.slug}">Küsi pakkumist</a></div>
      <div class="card hot"><small>Rike või avarii?</small><a href="${ORG.hotHref}">${ORG.hot}</a><small>Operatiivtelefon 24/7</small></div>
    </aside>
  </div></section>${ctaBand(s.slug)}`;
}
function pageService(s) {
  const ld = { "@context": "https://schema.org", "@type": "Service", name: s.name, description: s.lead, provider: { "@type": "Organization", name: ORG.name }, areaServed: "EE" };
  return layout({ title: s.name, desc: s.lead, body: serviceBody(s, ES.RELATED[s.slug] || []), nav: "teenused", canonical: `/teenused/${s.slug}`,
    head: `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` });
}

/* ---------- ettevõte, kontakt, karjäär, tehtud tööd ---------- */
function pageCompany() {
  const hist = [["1992", "Ettevõte asutati; esimesed hooldus- ja remonditööd."], ["1993", "Kahetariifsete mõõtesüsteemide ehitus ja elektrienergia müük Harjumaal."], ["1995", "Soetati keskpinge mõõte- ja kaabliveaotsimise labor; esimesed suuremad keskpingetööd."], ["1996", "Algas elektripaigaldiste hoolduse ja käidukorralduse teenus ning koostöö Elektrileviga."], ["2000+", "Suuremad objektid: kaubanduskeskused, hooldekodu, restoranid, sidemastid, keskpinge liitumispunktid."], ["2003", "Mõõtelabor sai akrediteeritud staatuse."], ["2022", "Esimene Eesti labor, mis on akrediteeritud päikeseelektrisüsteemide mõõtmiseks."]];
  const body = `<div class="ph"><div class="wrap"><nav class="crumb" aria-label="Asukoht"><a href="/">Avaleht</a> › <span aria-current="page">Ettevõttest</span></nav>
    <h1>Usaldusväärne partner elektrivaldkonnas</h1><p class="lede">E-Service AS on 1992. aastal Eesti kapitalil asutatud elektritööde ettevõte. Peakontor ja baas asuvad Tallinnas Nõmmel, suurem üksus Tartus ning töötajaid on üle Eesti.</p></div></div>
  <section class="sec"><div class="wrap">
    <div class="facts"><div><b>30+</b>aastat</div><div><b>350+</b>käiduobjekti</div><div><b>150+</b>töötajat</div><div><b>15 mln €+</b>aastakäive</div></div>
  </div></section>
  <section class="sec soft"><div class="wrap two">
    <div><h2 style="font-size:28px;margin-bottom:16px">Ajalugu</h2><ul class="timeline">${hist.map(([y, t]) => `<li><b>${y}</b><span>${t}</span></li>`).join("")}</ul></div>
    <div style="display:grid;gap:28px;align-content:start">
      <div><h2 style="font-size:28px;margin-bottom:12px">Missioon</h2><p>Olla usaldusväärne ja paindlik partner elektrivaldkonnas. Eesmärk on digitaliseerida põhiprotsessid aastaks 2027.</p></div>
      <div><h3 style="margin-bottom:8px">Juhtimine</h3><p>Kaupo Peetmaa on ettevõtte asutaja, ainuomanik ja juhatuse liige. Krister Peetmaa on juhatuse liige ja tegevjuht, ettevõttes alates 1994. aastast.</p></div>
      <div><h3 style="margin-bottom:8px">Liikmelisus</h3><ul class="checks">${["Eesti Elektritööde Ettevõtjate Liit (EETEL); Krister Peetmaa on nõukogu esimees", "Eesti Kaubandus-Tööstuskoda", "Eesti Maksumaksjate Liit"].map(x => `<li>${ic("i-check")}<span>${x}</span></li>`).join("")}</ul></div>
      <div><h3 style="margin-bottom:8px">Toetame</h3><p>Spordiklubisid ja -projekte, erialatudengite stipendiume TalTechis ja TTK-s ning elektrivaldkonna üritust POSITRON.</p></div>
    </div></div></section>
  <section class="sec" id="toetused"><div class="wrap"><h2 style="font-size:24px;margin-bottom:12px">Toetused ja projektid</h2>
    <ul class="checks"><li>${ic("i-check")}<span>Digitaliseerimise teekaart: toetus 8750 €, Euroopa Regionaalarengu Fondi kaasrahastusel.</span></li>
    <li>${ic("i-check")}<span>Ettevõtte digipöörde projekt: kogumaksumus 241 085,97 €, rahastus ELi taasterahastust (NextGenerationEU). Eesmärk on kasvatada töötaja kohta loodavat lisandväärtust üle 10%.</span></li></ul>
  </div></section>${ctaBand()}`;
  return layout({ title: "Ettevõttest", desc: "E-Service AS on 1992. aastal asutatud Eesti kapitalil elektritööde ettevõte. Peakontor Tallinnas Nõmmel, üksus Tartus.", body, nav: "ettevottest", canonical: "/ettevottest" });
}
const PEOPLE = [["Krister Peetmaa", "Juhatuse liige, tegevjuht", "krister@eservice.ee", "+372 512 3006"], ["Madis Hunt", "Äriarendusjuht", "madis.hunt@eservice.ee", "+372 512 3033"], ["Vaido Sooäär", "Ehitusosakonna juht", "vaido@eservice.ee", "+372 512 3043"], ["Evgeny Emeliyanov", "Käiduosakonna juht", "evgeny@eservice.ee", "+372 512 3014"], ["Indrek Lillemäe", "Projekteerimisosakonna juht (Tartu)", "indrek.lillemae@eservice.ee", "+372 512 3057"], ["Priit Paltmann", "Võrguhoolduse osakonna juht", "priit.paltmann@eservice.ee", "+372 512 3002"], ["Andre Lindvest", "Targa võrgu osakonna juht", "andre.lindvest@eservice.ee", "+372 512 3005"], ["Ahti Sillat", "Mõõtelabori juht", "ahti@eservice.ee", "+372 512 3004"], ["Kristina Straukaite", "Personalijuht", "cv@eservice.ee", "+372 512 3017"]];
function pageContact() {
  const body = `<div class="ph"><div class="wrap"><nav class="crumb" aria-label="Asukoht"><a href="/">Avaleht</a> › <span aria-current="page">Kontakt</span></nav>
    <div class="row"><div><h1>Kontakt</h1><p class="lede">Hinnapäringu saatmiseks kasutage päringuvormi: see suunab päringu kohe õigele inimesele.</p></div><a class="btn red" href="/paring">Saada päring</a></div></div></div>
  <section class="sec"><div class="wrap" style="display:grid;gap:36px">
    <div class="card hot" style="max-width:520px"><small>Rike või avarii</small><a href="${ORG.hotHref}">${ORG.hot}</a><small>Operatiivtelefon 24/7</small></div>
    <div class="offices">${ORG.offices.map(x => `<div class="card"><h3>${x.city}</h3>${x.note ? `<small style="color:var(--muted)">${x.note}</small>` : ""}<p>${x.addr}</p><a class="l" href="${tel(x.phone)}">${ic("i-phone")}${x.phone}</a><a class="l" href="mailto:${x.email}">${ic("i-mail")}${x.email}</a></div>`).join("")}</div>
    <div><h2 style="font-size:26px;margin-bottom:14px">Kontaktisikud</h2><div class="tblw"><table class="resp"><thead><tr><th>Nimi</th><th>Ametikoht</th><th>E-post</th><th>Telefon</th></tr></thead><tbody>
      ${PEOPLE.map(p => `<tr><td><b>${p[0]}</b></td><td>${p[1]}</td><td><a href="mailto:${p[2]}">${p[2]}</a></td><td><a href="${tel(p[3])}">${p[3]}</a></td></tr>`).join("")}</tbody></table></div></div>
    <div><h2 style="font-size:22px;margin-bottom:10px">Rekvisiidid</h2><p>${ORG.name} · Registrikood ${ORG.reg} · KMKR ${ORG.vat} · Salve tn 2a, Tallinn 11612</p></div>
  </div></section>`;
  return layout({ title: "Kontakt", desc: `E-Service AS kontaktid: Tallinn, Tartu, Pärnu. Rikketelefon 24/7 ${ORG.hot}, ${ORG.email}.`, body, nav: "kontakt", canonical: "/kontakt" });
}
function pageCareer() {
  const body = `<div class="ph"><div class="wrap"><nav class="crumb" aria-label="Asukoht"><a href="/">Avaleht</a> › <span aria-current="page">Karjäär</span></nav><h1>Töö ja praktika</h1><p class="lede">Ootame elektrikuid, insenere ja praktikante. Toetame erialatudengeid stipendiumitega TalTechis ja TTK-s.</p></div></div>
    <section class="sec"><div class="wrap two">
      <div style="display:grid;gap:16px;align-content:start"><h2 style="font-size:26px">Miks E-Service</h2>
        <ul class="checks"><li>${ic("i-check")}<span>Objektid üle Eesti: pistikupesast kuni 35 kV võrguni.</span></li><li>${ic("i-check")}<span>Üle 150 kolleegi ja kogenud juhendajad.</span></li><li>${ic("i-check")}<span>Stipendiumid ja praktika TalTechi ja TTK erialatudengitele.</span></li></ul>
        <p>Saatke CV ja paar rida endast. Võtame ühendust, kui sobiv koht on avatud.</p></div>
      <div class="card" style="align-self:start"><h3>Kandideerimine</h3><p class="who"><b>Kristina Straukaite</b>Personalijuht</p><a class="l" href="mailto:cv@eservice.ee">${ic("i-mail")}cv@eservice.ee</a><a class="l" href="tel:+3725123017">${ic("i-phone")}+372 512 3017</a></div>
    </div></section>`;
  return layout({ title: "Karjäär", desc: "Töö ja praktika E-Service AS-is: elektrikud, insenerid ja praktikandid.", body, nav: "karjaar", canonical: "/karjaar" });
}
function pageWorks() {
  const body = `<div class="ph"><div class="wrap"><nav class="crumb" aria-label="Asukoht"><a href="/">Avaleht</a> › <span aria-current="page">Tehtud tööd</span></nav><h1>Tehtud tööd</h1><p class="lede">Alates 2000. aastast oleme teinud elektritöid kaubanduskeskustele, tööstusele, sidemastidele ja keskpinge liitumispunktidele.</p></div></div>
  <section class="sec"><div class="wrap">
    <div class="hd"><h2>Meie kliendid ja partnerid</h2></div>
    <p class="logos">${["Elektrilevi", "Merko", "Rimi", "Selver", "Prisma", "Coop", "Bauhaus", "ABB", "Alexela", "Neste", "Viru Keskus", "Elektrum", "Connecto", "Leonhard Weiss", "Enersense"].map(x => `<span>${x}</span>`).join("")}</p>
    <p class="note" style="max-width:640px;margin-top:28px">Referentsprojektide kirjeldused avaldame kliendi loal. Küsige meilt teie valdkonna sarnaseid töid: <a href="/paring">saada päring</a> või helista ${ORG.phone}.</p>
  </div></section>${ctaBand()}`;
  return layout({ title: "Tehtud tööd", desc: "E-Service AS tehtud tööd ja kliendid.", body, nav: "tehtud-tood", canonical: "/tehtud-tood" });
}
function pagePrivacy() {
  const body = `<div class="ph"><div class="wrap"><nav class="crumb" aria-label="Asukoht"><a href="/">Avaleht</a> › <span aria-current="page">Privaatsus</span></nav><h1>Privaatsus ja küpsised</h1><p class="lede">Kuidas ${ORG.name} kodulehe kaudu saadud andmeid kasutab.</p></div></div>
  <section class="sec"><div class="wrap" style="max-width:780px;display:grid;gap:22px">
    <div><h2 style="font-size:22px;margin-bottom:8px">Vastutav töötleja</h2><p>${ORG.name}, registrikood ${ORG.reg}, Salve tn 2a, Tallinn 11612, <a href="mailto:${ORG.email}">${ORG.email}</a>.</p></div>
    <div><h2 style="font-size:22px;margin-bottom:8px">Päringuvormi andmed</h2><p>Päringuvormi kaudu kogume nime, e-posti, soovi korral telefoni ja ettevõtte nime, teie vastused vormi küsimustele, lisainfo ja lisatud failid. Kasutame neid ainult päringule vastamiseks ja pakkumise koostamiseks. Päring edastatakse e-postiga teenuse eest vastutavale töötajale.</p></div>
    <div><h2 style="font-size:22px;margin-bottom:8px">Säilitamine</h2><p>Päringuid säilitame kuni ${require("./cms").settings().retentionMonths} kuud, seejärel kustutatakse need automaatselt. Kui päringust sünnib leping, säilitatakse lepinguga seotud andmeid seadusest tulenevate tähtaegade järgi.</p></div>
    <div><h2 style="font-size:22px;margin-bottom:8px">Teie õigused</h2><p>Teil on õigus küsida oma andmete koopiat, neid parandada või kustutada. Kirjutage <a href="mailto:${ORG.email}">${ORG.email}</a>.</p></div>
    <div><h2 style="font-size:22px;margin-bottom:8px">Küpsised ja statistika</h2><p>Avalik koduleht ei kasuta jälgimisküpsiseid. Päringuvormi pooleli olevad vastused hoitakse ainult teie brauseris, et need ei kaoks lehte vahetades. Vormi kasutamise statistikasse loeme ainult teenuse ja vormi sammu, ilma isikuandmeteta. Halduskeskkonna sisselogimisel kasutatakse ühte vajalikku sessiooniküpsist.</p></div>
  </div></section>`;
  return layout({ title: "Privaatsus ja küpsised", desc: "E-Service AS kodulehe privaatsustingimused ja küpsised.", body, canonical: "/privaatsus" });
}

/* ---------- päringuvorm ---------- */
function pageForm(slug) {
  const pub = { related: ES.RELATED, names: Object.fromEntries(SERVICES.map(s => [s.slug, s.name])) };
  const body = `<div class="ph" style="padding-block:28px 24px"><div class="wrap"><nav class="crumb" aria-label="Asukoht"><a href="/">Avaleht</a> › <span aria-current="page">Päring</span></nav><h1 style="margin:0">Saada päring</h1></div></div>
  <section class="sec" style="padding-top:28px"><div class="wrap"><div class="fwrap"><div class="fbox" id="form" aria-live="polite" data-start="${esc(slug || "")}">
    <noscript><p>Päringuvorm vajab JavaScripti. Kirjutage meile <a href="mailto:${ORG.email}">${ORG.email}</a> või helistage ${ORG.phone}.</p></noscript>
  </div>
  <p style="font-size:14px;color:var(--muted);margin-top:14px;text-align:center">Rike või avarii? Helistage 24/7: <a href="${ORG.hotHref}"><b>${ORG.hot}</b></a></p></div></div></section>
  <script type="application/json" id="es-content">${JSON.stringify(pub).replace(/</g, "\\u003c")}</script>`;
  const svc = slug && (slug === "abi" ? ES.HELP : SVC[slug]);
  return layout({ title: svc ? `Päring: ${svc.name}` : "Saada päring", desc: "Saatke E-Service AS-ile päring. Vorm küsib ainult valitud teenuse jaoks vajalikku infot.", body, bodyClass: "inform",
    canonical: slug ? `/paring/${slug}` : "/paring", scripts: ["/js/data.js", "/js/form.js"] });
}

function page404() {
  const body = `<div class="ph"><div class="wrap"><h1>Lehte ei leitud</h1><p class="lede">Aadress võib olla muutunud. <a href="/">Avalehele</a> või <a href="/teenused">teenuste juurde</a>.</p></div></div>`;
  return layout({ title: "Lehte ei leitud", desc: "", body, noindex: true });
}
function page500() {
  const body = `<div class="ph"><div class="wrap"><h1>Midagi läks valesti</h1><p class="lede">Proovige hetke pärast uuesti või helistage ${ORG.phone}. Rikke korral 24/7: <a href="${ORG.hotHref}">${ORG.hot}</a>.</p></div></div>`;
  return layout({ title: "Viga", desc: "", body, noindex: true });
}

function searchIndex() {
  return [...SERVICES.map(s => ({ t: s.name, d: s.lead, u: "/teenused/" + s.slug, x: [s.name, s.lead, s.problem, ...s.includes, ...s.forWho].join(" ") })),
    { t: "Ettevõttest", d: "Ajalugu, juhtimine, liikmelisus", u: "/ettevottest", x: "ettevõte ajalugu 1992 juhtimine EETEL toetused" },
    { t: "Kontakt", d: "Kontorid, kontaktisikud, rekvisiidid", u: "/kontakt", x: "kontakt telefon e-post Tallinn Tartu Pärnu rekvisiidid" },
    { t: "Karjäär", d: "Töö ja praktika", u: "/karjaar", x: "töö praktika kandideeri cv" },
    { t: "Saada päring", d: "Päringuvorm", u: "/paring", x: "päring pakkumine hinnapäring vorm" }];
}

module.exports = { layout, esc, ic, tel, pageHome, pageServices, pageService, serviceBody, pageCompany, pageContact, pageCareer, pageWorks, pagePrivacy, pageForm, page404, page500, searchIndex };
