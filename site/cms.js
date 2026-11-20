// Teenuslehtede haldus: kasutajad, töövoog ja ülevaatuse meeldetuletused.
// Töövoog: Avaldatud → [omanik muudab] Mustand → Keelekontroll → Avaldatud
//                                     ↖ Tagasi omanikule (kommentaariga) ↙
// Ülevaatus: omanik kinnitab sisu iga N kuu tagant. Enne tähtaega meeldetuletus,
// tähtajal teavitus, X päeva pärast eskalatsioon administraatorile.
const crypto = require("node:crypto");
const db = require("./db");
const mailer = require("./mailer");
const ES = require("./data");

const ROLE_L = { admin: "Administraator", owner: "Teenuse omanik", lang: "Keeletoimetaja" };
const STATE_L = { avaldatud: "Avaldatud", mustand: "Mustand", keel: "Keelekontrollis", tagasi: "Tagasi omanikule" };
const FIELD_L = { name: "Teenuse nimi", lead: "Sissejuhatus", problem: "Millise probleemi lahendab", note: "Lisamärkus", forWho: "Kellele", includes: "Mida teeme", order: "Kuidas tellimine käib", facts: "Eelised", related: "Sageli tellitakse koos", contact: "Kontaktisik" };
const FIELDS = ES.CONTENT_FIELDS;
const DEFAULT_SETTINGS = { remindDays: 14, escalateDays: 7, langSlaDays: 3, adminEmail: "", retentionMonths: 24 };

const SEED_USERS = [
  { id: "admin", name: "Administraator", role: "admin", email: "" },
  { id: "vaido", name: "Vaido Sooäär", role: "owner", email: "vaido@eservice.ee" },
  { id: "indrek", name: "Indrek Lillemäe", role: "owner", email: "indrek.lillemae@eservice.ee" },
  { id: "jaan", name: "Jaan Räni", role: "owner", email: "solar@eservice.ee" },
  { id: "evgeny", name: "Evgeny Emeliyanov", role: "owner", email: "evgeny@eservice.ee" },
  { id: "ahti", name: "Ahti Sillat", role: "owner", email: "ahti@eservice.ee" },
  { id: "priit", name: "Priit Paltmann", role: "owner", email: "priit.paltmann@eservice.ee" },
  { id: "keel", name: "Keeletoimetaja", role: "lang", email: "" }
];
const SEED_OWNERS = { elektritood: ["vaido", 6], projekteerimine: ["indrek", 12], paikesejaamad: ["jaan", 6], akusysteemid: ["jaan", 6],
  autolaadijad: [null, 6], "kait-ja-hooldus": ["evgeny", 12], jarelevaataja: ["evgeny", 12], mootelabor: ["ahti", 6], raamlepingud: ["priit", 12] };

const clone = x => JSON.parse(JSON.stringify(x));
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Tallinn" }); // YYYY-MM-DD
const iso = d => d.toISOString().slice(0, 10);
const addM = (s, m) => { const d = new Date(s + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() + m); return iso(d); };
const days = (a, b) => Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 864e5);
const fmt = s => s ? new Date(String(s).slice(0, 10) + "T12:00:00Z").toLocaleDateString("et-EE") : "—";

/* ---------- paroolid ja sessioonid ---------- */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString("hex")}$${h.toString("hex")}`;
}
function checkPassword(pw, stored) {
  if (!stored || !pw) return false;
  const [, salt, h] = stored.split("$");
  const calc = crypto.scryptSync(pw, Buffer.from(salt, "hex"), 64);
  const want = Buffer.from(h, "hex");
  return calc.length === want.length && crypto.timingSafeEqual(calc, want);
}
const SESSION_MS = 12 * 3600 * 1000;
function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex"), csrf = crypto.randomBytes(24).toString("hex");
  db.get().prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
  db.get().prepare("INSERT INTO sessions (token, user_id, csrf, expires) VALUES (?, ?, ?, ?)").run(token, userId, csrf, Date.now() + SESSION_MS);
  return token;
}
function getSession(token) {
  if (!token) return null;
  const s = db.get().prepare("SELECT * FROM sessions WHERE token = ? AND expires > ?").get(token, Date.now());
  if (!s) return null;
  const user = getUser(s.user_id);
  return user ? { token, csrf: s.csrf, user } : null;
}
function destroySession(token) { db.get().prepare("DELETE FROM sessions WHERE token = ?").run(token); }

/* ---------- kasutajad ---------- */
function users() { return db.get().prepare("SELECT id, name, role, email, pass_hash IS NOT NULL AS has_pw FROM users ORDER BY role, name").all(); }
function getUser(id) { return db.get().prepare("SELECT id, name, role, email FROM users WHERE id = ?").get(id) || null; }
function findLogin(login) {
  const l = String(login || "").trim().toLowerCase();
  return db.get().prepare("SELECT * FROM users WHERE lower(id) = ? OR (email <> '' AND lower(email) = ?)").get(l, l) || null;
}
function setPassword(id, pw) { db.get().prepare("UPDATE users SET pass_hash = ? WHERE id = ?").run(hashPassword(pw), id); }
function saveUser({ id, name, role, email }) {
  if (!/^[a-z0-9._-]{2,40}$/.test(id || "")) throw new Error("Kasutajatunnus: 2–40 väiketähte, numbrit või . _ -");
  if (!ROLE_L[role]) throw new Error("Tundmatu roll");
  if (!String(name || "").trim()) throw new Error("Nimi on kohustuslik");
  db.get().prepare(`INSERT INTO users (id, name, role, email) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, role = excluded.role, email = excluded.email`).run(id, name.trim(), role, String(email || "").trim());
}
const userName = id => (id && getUser(id)?.name) || (id ? id : "Määramata");

/* ---------- seadistus ja algandmed ---------- */
function settings() { return { ...DEFAULT_SETTINGS, ...db.getSetting("cms", {}) }; }
function saveSettings(s) { db.setSetting("cms", { ...settings(), ...s }); }

/** Loob puuduvad kasutajad ja teenuste kirjed. Tagastab admini parooli, kui see genereeriti. */
function seed() {
  const d = db.get();
  let generated = null;
  for (const u of SEED_USERS) {
    if (!getUser(u.id)) d.prepare("INSERT INTO users (id, name, role, email) VALUES (?, ?, ?, ?)").run(u.id, u.name, u.role, u.email);
  }
  const admin = d.prepare("SELECT pass_hash FROM users WHERE id = 'admin'").get();
  if (!admin.pass_hash) {
    const pw = process.env.ADMIN_PASSWORD || (generated = crypto.randomBytes(9).toString("base64url"));
    setPassword("admin", pw);
  }
  const t = today();
  for (const s of ES.SERVICES) {
    if (d.prepare("SELECT 1 FROM cms_services WHERE slug = ?").get(s.slug)) continue;
    const [owner, interval] = SEED_OWNERS[s.slug] || [null, 6];
    d.prepare(`INSERT INTO cms_services (slug, published, owner, interval_months, last_reviewed) VALUES (?, ?, ?, ?, ?)`)
      .run(s.slug, JSON.stringify(ES.DEFAULTS[s.slug]), owner, interval, t);
    d.prepare("INSERT INTO cms_history (slug, at, by_user, act) VALUES (?, ?, ?, ?)").run(s.slug, t, "admin", "Algandmed avaldatud (prototüübi sisu)");
  }
  applyPublished();
  return generated;
}

/* ---------- teenuse kirje ---------- */
function rowToSvc(r) {
  return { slug: r.slug, published: JSON.parse(r.published), draft: r.draft ? JSON.parse(r.draft) : null, state: r.state, owner: r.owner,
    interval: r.interval_months, lastReviewed: r.last_reviewed, version: r.version, comment: r.comment, submittedAt: r.submitted_at };
}
function svc(slug) { const r = db.get().prepare("SELECT * FROM cms_services WHERE slug = ?").get(slug); return r ? rowToSvc(r) : null; }
function allSvc() { return ES.SERVICES.map(s => svc(s.slug)).filter(Boolean); }
function saveSvc(r) {
  db.get().prepare(`UPDATE cms_services SET published = ?, draft = ?, state = ?, owner = ?, interval_months = ?, last_reviewed = ?, version = ?, comment = ?, submitted_at = ? WHERE slug = ?`)
    .run(JSON.stringify(r.published), r.draft ? JSON.stringify(r.draft) : null, r.state, r.owner, r.interval, r.lastReviewed, r.version, r.comment || "", r.submittedAt, r.slug);
}
function history(slug) {
  const rows = slug ? db.get().prepare("SELECT * FROM cms_history WHERE slug = ? ORDER BY id DESC").all(slug)
    : db.get().prepare("SELECT * FROM cms_history ORDER BY id DESC LIMIT 300").all();
  return rows;
}
function log(slug, by, act) { db.get().prepare("INSERT INTO cms_history (slug, at, by_user, act) VALUES (?, ?, ?, ?)").run(slug, new Date().toISOString(), by, act); }

/** Avalik leht näitab ainult avaldatud versiooni. */
function applyPublished() {
  const map = {};
  for (const r of db.get().prepare("SELECT slug, published FROM cms_services").all()) map[r.slug] = JSON.parse(r.published);
  ES.applyContent(map);
}

function nextReview(r) { return addM(r.lastReviewed, r.interval); }
function reviewStatus(r, now = today()) {
  const due = nextReview(r), d = days(now, due), st = settings();
  if (d < -st.escalateDays) return { k: "esc", l: `Eskaleeritud · ${-d} p üle`, c: "bad" };
  if (d < 0) return { k: "over", l: `Üle tähtaja · ${-d} p`, c: "bad" };
  if (d <= st.remindDays) return { k: "soon", l: `Tähtaeg ${d} p pärast`, c: "wait" };
  return { k: "ok", l: "Korras", c: "ok" };
}

/* ---------- teavitused ---------- */
function notifications(limit = 200) { return db.get().prepare("SELECT * FROM notifications ORDER BY at DESC LIMIT ?").all(limit).map(n => ({ ...n, recipients: JSON.parse(n.recipients) })); }
function emailsOf(ids) {
  const st = settings();
  return [...new Set(ids.filter(Boolean).map(id => {
    const u = getUser(id); const e = u && u.email;
    return e || (u && u.role === "admin" ? st.adminEmail : "");
  }).filter(Boolean))];
}
/** Sama võtmega teavitust ei saadeta topelt. */
async function notify(key, toIds, subject, body) {
  if (db.get().prepare("SELECT 1 FROM notifications WHERE k = ?").get(key)) return false;
  const to = emailsOf(toIds);
  let state = "salvestatud";
  db.get().prepare("INSERT INTO notifications (k, at, recipients, subject, body, state) VALUES (?, ?, ?, ?, ?, ?)").run(key, new Date().toISOString(), JSON.stringify(to.length ? to : toIds.filter(Boolean)), subject, body, "saatmisel");
  if (!to.length) state = "saajal puudub e-post";
  else if (!mailer.configured()) state = "e-posti kanal seadistamata";
  else {
    try { await mailer.send({ to, subject: "[Koduleht] " + subject, text: body + `\n\nHaldus: ${require("./inquiries").baseUrl()}/haldus` }); state = "saadetud"; }
    catch (e) { state = "ebaõnnestus: " + e.message; }
  }
  db.get().prepare("UPDATE notifications SET state = ? WHERE k = ?").run(state, key);
  return true;
}

async function runReminders(now = today()) {
  const st = settings();
  for (const s of ES.SERVICES) {
    const r = svc(s.slug); if (!r) continue;
    const name = r.published.name, due = nextReview(r), d = days(now, due);
    const to = r.owner ? [r.owner] : ["admin"];
    if (!r.owner) await notify(`${s.slug}|noowner`, ["admin"], `Teenusel „${name}“ puudub omanik`, "Määrake teenusele omanik, kes vastutab sisu ja ülevaatuse eest.");
    if (d <= st.remindDays) await notify(`${s.slug}|remind|${due}`, to, `Meeldetuletus: vaata üle „${name}“`, `Teenuse lehe ülevaatuse tähtaeg on ${fmt(due)}. Kontrolli sisu ja kinnita või tee muudatused.`);
    if (d < 0) await notify(`${s.slug}|over|${due}`, to, `Tähtaeg möödas: „${name}“`, `Teenuse lehe ülevaatus pidi olema tehtud ${fmt(due)}.`);
    if (d < -st.escalateDays) await notify(`${s.slug}|esc|${due}`, ["admin", r.owner], `Eskalatsioon: „${name}“ ülevaatamata`, `Ülevaatus on ${-d} päeva üle tähtaja. Omanik: ${userName(r.owner)}.`);
    if (r.state === "keel" && r.submittedAt && days(r.submittedAt.slice(0, 10), now) > st.langSlaDays)
      await notify(`${s.slug}|langwait|${r.submittedAt}`, [...langUsers(), "admin"], `Keelekontroll ootab: „${name}“`, `Muudatus on oodanud keelekontrolli alates ${fmt(r.submittedAt)}.`);
  }
}
const langUsers = () => db.get().prepare("SELECT id FROM users WHERE role = 'lang'").all().map(u => u.id);

/* ---------- õigused ---------- */
const isOwnerOrAdmin = (u, r) => u.id === r.owner || u.role === "admin";
const can = {
  edit: (u, r) => isOwnerOrAdmin(u, r) && ["avaldatud", "mustand", "tagasi"].includes(r.state),
  review: (u, r) => isOwnerOrAdmin(u, r) && r.state === "avaldatud",
  lang: (u, r) => (u.role === "lang" || u.role === "admin") && r.state === "keel",
  settings: u => u.role === "admin"
};

/* ---------- toimeti vorm → sisu ---------- */
const linesTo = v => String(v || "").split("\n").map(x => x.trim()).filter(Boolean);
const pairsTo = v => linesTo(v).map(l => { const [a, ...b] = l.split("|"); return [a.trim(), b.join("|").trim()]; });
function readEditor(d, body, langOnly, slug) {
  const n = clone(d), v = k => String(body["ed_" + k] ?? "");
  n.name = v("name").trim(); n.lead = v("lead").trim(); n.problem = v("problem").trim(); n.note = v("note").trim();
  n.forWho = linesTo(v("forWho")); n.includes = linesTo(v("includes")); n.order = pairsTo(v("order"));
  const f = pairsTo(v("facts")); n.facts = d.facts.map((x, i) => f[i] ? [x[0], f[i][0], f[i][1]] : x);
  const checked = langOnly ? d.related.map(x => x[0]) : [].concat(body.rel || []).filter(s => ES.SVC[s] && s !== slug);
  const why = s => String(body["relwhy_" + s] ?? (d.related.find(x => x[0] === s) || [])[1] ?? "").trim();
  n.related = [...d.related.map(x => x[0]).filter(s => checked.includes(s)), ...checked.filter(s => !d.related.some(x => x[0] === s))].map(s => [s, why(s)]);
  ["name", "role", "email", "phone"].forEach(k => { if (!langOnly || k === "role") n.contact[k] = String(body["ed_c_" + k] ?? n.contact[k]).trim(); });
  return n;
}

/* ---------- tegevused (tagastavad veateate või null) ---------- */
async function act(action, slug, user, body = {}) {
  const r = svc(slug); if (!r) return "Teenust ei leitud.";
  const now = new Date().toISOString();
  const deny = "Sul ei ole selle tegevuse õigust.";
  switch (action) {
    case "startEdit":
      if (!can.edit(user, r)) return deny;
      if (!r.draft) { r.draft = clone(r.published); r.state = "mustand"; log(slug, user.id, "Alustas muutmist (mustand)"); }
      break;
    case "saveDraft":
      if (!can.edit(user, r) || r.state === "avaldatud") return deny;
      r.draft = readEditor(r.draft, body, false, slug); log(slug, user.id, "Salvestas mustandi");
      break;
    case "submit": {
      if (!can.edit(user, r) || r.state === "avaldatud") return deny;
      r.draft = readEditor(r.draft, body, false, slug); saveSvc(r);
      const miss = ["name", "lead", "problem"].filter(f => !String(r.draft[f]).trim()).concat(["forWho", "includes"].filter(f => !r.draft[f].length));
      if (miss.length) return "Täida enne saatmist: " + miss.map(f => FIELD_L[f]).join(", ");
      if (JSON.stringify(r.draft) === JSON.stringify(r.published)) return "Muudatusi ei ole. Kui sisu on ajakohane, kasuta „Kinnitan, et sisu on ajakohane“.";
      r.state = "keel"; r.submittedAt = now; r.comment = ""; log(slug, user.id, "Saatis keelekontrolli");
      saveSvc(r);
      await notify(`${slug}|tolang|${now}`, langUsers(), `Keelekontroll: „${r.draft.name}“`, `${user.name} saatis teenuse lehe muudatuse keelekontrolli.`);
      return null;
    }
    case "discard":
      if (!can.edit(user, r) || r.state === "avaldatud") return deny;
      r.draft = null; r.state = "avaldatud"; r.comment = ""; log(slug, user.id, "Loobus muudatustest");
      break;
    case "review":
      if (!can.review(user, r)) return deny;
      r.lastReviewed = today(); log(slug, user.id, "Kinnitas, et sisu on ajakohane (muudatusteta)");
      break;
    case "langSave":
      if (!can.lang(user, r)) return deny;
      r.draft = readEditor(r.draft, body, true, slug); log(slug, user.id, "Keeletoimetaja parandas teksti");
      break;
    case "publish":
      if (!can.lang(user, r)) return deny;
      r.draft = readEditor(r.draft, body, true, slug); r.published = clone(r.draft); r.draft = null; r.state = "avaldatud";
      r.version++; r.lastReviewed = today(); r.submittedAt = null; log(slug, user.id, `Keelekontroll tehtud, avaldatud versioon ${r.version}`);
      saveSvc(r); applyPublished();
      await notify(`${slug}|pub|${r.version}`, [r.owner || "admin"], `Avaldatud: „${r.published.name}“`, `Teenuse leht on keelekontrolli läbinud ja avaldatud (versioon ${r.version}). Järgmine ülevaatus ${fmt(nextReview(r))}.`);
      return null;
    case "reject": {
      if (!can.lang(user, r)) return deny;
      const c = String(body.langComment || "").trim();
      if (!c) return "Lisa kommentaar, mida omanik peab parandama.";
      r.draft = readEditor(r.draft, body, true, slug); r.state = "tagasi"; r.comment = c; r.submittedAt = null; log(slug, user.id, "Saatis tagasi omanikule: " + c);
      saveSvc(r);
      await notify(`${slug}|back|${now}`, [r.owner || "admin"], `Tagasi parandamiseks: „${r.draft.name}“`, c);
      return null;
    }
    default: return "Tundmatu tegevus.";
  }
  saveSvc(r);
  return null;
}

function myTasks(user) {
  const out = [];
  for (const r of allSvc()) {
    const rs = reviewStatus(r), name = r.published.name;
    if ((user.role === "lang" || user.role === "admin") && r.state === "keel") out.push([r.slug, name, `Keelekontroll ootab alates ${fmt(r.submittedAt)}`, "wait"]);
    if ((user.id === r.owner || (user.role === "admin" && !r.owner)) && r.state === "tagasi") out.push([r.slug, name, "Tagasi parandamiseks: " + r.comment, "bad"]);
    if (user.id === r.owner && r.state === "mustand") out.push([r.slug, name, "Pooleli mustand", "wait"]);
    if (user.role === "admin" && !r.owner) out.push([r.slug, name, "Omanik määramata (Seaded)", "bad"]);
    if ((user.id === r.owner || (user.role === "admin" && (rs.k === "esc" || !r.owner))) && rs.k !== "ok") out.push([r.slug, name, "Ülevaatus: " + rs.l + (r.owner ? "" : " · omanik määramata"), rs.c]);
  }
  return out;
}

function setOwnership(slug, owner, interval, by) {
  const r = svc(slug); if (!r) return;
  const o = owner || null;
  if (o && !getUser(o)) return;
  if (o !== r.owner) { r.owner = o; log(slug, by, "Omanikuks määrati " + userName(o)); }
  if ([3, 6, 12].includes(interval) && interval !== r.interval) { r.interval = interval; log(slug, by, `Ülevaatuse intervall: ${interval} kuud`); }
  saveSvc(r);
}

module.exports = { ROLE_L, STATE_L, FIELD_L, FIELDS, seed, svc, allSvc, history, applyPublished, nextReview, reviewStatus, notifications, runReminders,
  can, act, myTasks, settings, saveSettings, setOwnership, users, getUser, findLogin, setPassword, saveUser, userName, checkPassword,
  createSession, getSession, destroySession, fmt, today, readEditor };
