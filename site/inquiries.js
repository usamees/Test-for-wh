// Päringud: vastuvõtt, failid, sisemine teavitus, olekud ja säilitamine.
// Vastuvõtt ja teavitus on eraldi: päring salvestub ka siis, kui e-kiri ei lähe,
// ja teavituse uuesti saatmine ei loo uut päringut.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const db = require("./db");
const mailer = require("./mailer");
const ES = require("./data");

const STATUSES = ["Uus", "Töös", "Pakkumine saadetud", "Suletud"];
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".heic", ".webp", ".dwg", ".dxf", ".doc", ".docx", ".xls", ".xlsx", ".odt", ".ods", ".txt", ".zip"];

function uploadDir() { return path.join(process.env.DATA_DIR || path.join(__dirname, "..", "data"), "uploads"); }

function newId() {
  const d = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `ES-${d}-${crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4)}`;
}

function safeName(n) {
  const base = path.basename(String(n || "fail")).replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120);
  return base || "fail";
}

function fileAllowed(name) { return ALLOWED_EXT.includes(path.extname(String(name)).toLowerCase()); }

/** Kontrollib ja koostab päringu serveri poolel. Kliendilt tulnud suunamist ei usaldata. */
function prepare(input) {
  const svc = String(input.svc || "");
  const a = input.answers && typeof input.answers === "object" ? { ...input.answers } : {};
  for (const k of Object.keys(a)) { if (typeof a[k] === "string") a[k] = a[k].trim(); if (a[k] === "") delete a[k]; }
  const c = {
    name: String(input.contact?.name || "").trim(), company: String(input.contact?.company || "").trim(),
    email: String(input.contact?.email || "").trim(), phone: String(input.contact?.phone || "").trim(),
    pref: input.contact?.pref === "tel" ? "tel" : "email", consent: input.contact?.consent === true
  };
  if (!(svc === "abi" || ES.SVC[svc])) return { errors: { svc: "Valige teenus." } };
  ES.prune(svc, a);
  const errors = ES.validateAll(svc, a, c);
  if (Object.keys(errors).length) return { errors };
  const from = typeof input.from === "string" ? input.from.slice(0, 120) : "üldvorm";
  const payload = ES.buildPayload({ svc, a, c, key: null, from, files: (input.fileNames || []) });
  return { payload };
}

/** Salvestab päringu. Sama idempotentsusvõtmega korduv saatmine tagastab olemasoleva päringu. */
function create(payload, idemKey, files = []) {
  const d = db.get();
  if (idemKey) {
    const dup = d.prepare("SELECT id FROM inquiries WHERE idem_key = ?").get(idemKey);
    if (dup) return { record: get(dup.id), duplicate: true };
  }
  let id = newId();
  while (d.prepare("SELECT 1 FROM inquiries WHERE id = ?").get(id)) id = newId();
  const rec = { ...payload, id, key: idemKey || null };
  const dir = path.join(uploadDir(), id);
  const stored = files.map((f, i) => ({ orig: safeName(f.originalname), stored: `${i + 1}-${crypto.randomBytes(6).toString("hex")}${path.extname(f.originalname).toLowerCase()}`, size: f.size, mime: f.mimetype, buf: f.buffer }));
  rec.files = stored.map(f => f.orig);
  db.tx(t => {
    t.prepare(`INSERT INTO inquiries (id, idem_key, created_at, service_slug, service_name, contact_name, contact_email, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, idemKey || null, rec.createdAt, rec.service.slug, rec.service.name, rec.contact.name, rec.contact.email, JSON.stringify(rec));
    const ins = t.prepare("INSERT INTO inquiry_files (inquiry_id, orig_name, stored_name, size, mime) VALUES (?, ?, ?, ?, ?)");
    stored.forEach(f => ins.run(id, f.orig, f.stored, f.size, f.mime || null));
  });
  if (stored.length) {
    fs.mkdirSync(dir, { recursive: true });
    stored.forEach(f => fs.writeFileSync(path.join(dir, f.stored), f.buf));
  }
  return { record: get(id), duplicate: false };
}

function rowToRecord(r) {
  if (!r) return null;
  const p = JSON.parse(r.payload);
  return { ...p, id: r.id, status: r.status, createdAt: r.created_at,
    notify: { state: r.notify_state, attempts: r.notify_attempts, log: JSON.parse(r.notify_log) },
    fileRows: db.get().prepare("SELECT id, orig_name, stored_name, size, mime FROM inquiry_files WHERE inquiry_id = ? ORDER BY id").all(r.id) };
}

function get(id) { return rowToRecord(db.get().prepare("SELECT * FROM inquiries WHERE id = ?").get(id)); }

function list({ status, q, limit = 200 } = {}) {
  let sql = "SELECT * FROM inquiries", where = [], args = [];
  if (status) { where.push("status = ?"); args.push(status); }
  if (q) { where.push("(id LIKE ? OR contact_name LIKE ? OR contact_email LIKE ? OR service_name LIKE ?)"); const l = `%${q}%`; args.push(l, l, l, l); }
  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY created_at DESC LIMIT ?"; args.push(limit);
  return db.get().prepare(sql).all(...args).map(rowToRecord);
}

function filePath(inquiryId, fileRow) { return path.join(uploadDir(), inquiryId, fileRow.stored_name); }

function appendLog(id, state, line, incAttempts) {
  const r = db.get().prepare("SELECT notify_log FROM inquiries WHERE id = ?").get(id);
  const log = JSON.parse(r.notify_log); log.push(line);
  db.get().prepare(`UPDATE inquiries SET notify_state = ?, notify_log = ?, notify_attempts = notify_attempts + ? WHERE id = ?`)
    .run(state, JSON.stringify(log), incAttempts ? 1 : 0, id);
}

const stamp = () => new Date().toLocaleString("et-EE", { timeZone: "Europe/Tallinn" });

/** Saadab päringu vastutajale (ja koopia saajatele). Ei viska erindit. */
async function notify(id) {
  const rec = get(id); if (!rec) return null;
  const R = ES.RECIPIENTS[rec.recipient.to];
  const cc = rec.recipient.cc.map(k => ES.RECIPIENTS[k].email);
  const attachments = rec.fileRows.map(f => ({ filename: f.orig_name, path: filePath(id, f) })).filter(a => fs.existsSync(a.path));
  try {
    const res = await mailer.send({
      to: R.email, cc, replyTo: rec.contact.email,
      subject: `Uus päring ${rec.id} · ${rec.service.name}`,
      text: ES.emailText(rec) + `\n\nPäring halduses: ${baseUrl()}/haldus/paringud/${rec.id}`,
      attachments
    });
    appendLog(id, "saadetud", `${stamp()} · saadetud: ${res.to.join(", ")}${res.cc.length ? " (koopia: " + res.cc.join(", ") + ")" : ""}`, true);
  } catch (e) {
    appendLog(id, "ebaõnnestus", `${stamp()} · ebaõnnestus: ${e.message}`, true);
  }
  return get(id);
}

/** Kinnitus kliendile (ei mõjuta sisemise teavituse olekut). */
async function confirmToCustomer(id) {
  if (process.env.SEND_CUSTOMER_CONFIRMATION === "false") return;
  const rec = get(id); if (!rec) return;
  const ORG = ES.ORG;
  const text = [`Tere, ${rec.contact.name}!`, "", `Täname päringu eest. Päring ${rec.id} („${rec.service.name}“) jõudis meieni ja on edastatud teenuse eest vastutavale inimesele, kes võtab teiega ühendust.`, "",
    `Kui elekter on ära või olukord on ohtlik, helistage 24/7 operatiivtelefonil ${ORG.hot}.`, "", "Lugupidamisega", ORG.name, `${ORG.phone} · ${ORG.email}`].join("\n");
  try {
    await mailer.send({ to: rec.contact.email, replyTo: ORG.email, subject: `Päring ${rec.id} on vastu võetud · ${ORG.name}`, text });
    appendLog(id, get(id).notify.state, `${stamp()} · kinnitus kliendile saadetud`, false);
  } catch (e) {
    appendLog(id, get(id).notify.state, `${stamp()} · kinnitus kliendile ebaõnnestus: ${e.message}`, false);
  }
}

function setStatus(id, status) {
  if (!STATUSES.includes(status)) throw new Error("Tundmatu staatus");
  db.get().prepare("UPDATE inquiries SET status = ? WHERE id = ?").run(status, id);
}

function remove(id) {
  db.get().prepare("DELETE FROM inquiries WHERE id = ?").run(id);
  fs.rmSync(path.join(uploadDir(), id), { recursive: true, force: true });
}

/** Kustutab päringud, mis on vanemad kui säilitusaeg (kuudes). */
function purgeOld(months) {
  if (!months || months <= 0) return 0;
  const cut = new Date(); cut.setMonth(cut.getMonth() - months);
  const old = db.get().prepare("SELECT id FROM inquiries WHERE created_at < ?").all(cut.toISOString());
  old.forEach(r => remove(r.id));
  return old.length;
}

function funnelStep(svc, step) {
  const valid = svc === "-" || svc === "abi" || ES.SVC[svc];
  if (!valid || !/^[a-z_·0-9]{1,40}$/.test(step)) return false;
  db.get().prepare("INSERT INTO funnel (k, n) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1").run(`${svc}|et|${step}`);
  return true;
}
function funnel() { return db.get().prepare("SELECT k, n FROM funnel ORDER BY k").all(); }

function baseUrl() { return (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, ""); }

module.exports = { prepare, create, get, list, notify, confirmToCustomer, setStatus, remove, purgeOld, filePath, funnelStep, funnel,
  STATUSES, MAX_FILES, MAX_FILE_BYTES, ALLOWED_EXT, fileAllowed, baseUrl };
