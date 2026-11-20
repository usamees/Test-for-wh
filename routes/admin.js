const express = require("express");
const fs = require("node:fs");
const ES = require("../site/data");
const cms = require("../site/cms");
const inquiries = require("../site/inquiries");
const V = require("../site/admin-views");

const router = express.Router();
const COOKIE = "es_sess";
router.use(express.urlencoded({ extended: false, limit: "200kb" }));
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

const cookieOpts = () => ({ httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/haldus" });
const send = (res, html, status = 200) => res.status(status).type("html").send(html);

/* ---------- sisselogimine ---------- */
const loginHits = new Map();
function loginLimited(ip) {
  const now = Date.now(), arr = (loginHits.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
  loginHits.set(ip, arr);
  return arr.length >= 10;
}
const safeNext = n => (typeof n === "string" && /^\/haldus(\/[\w\-/.?=&%]*)?$/.test(n) ? n : "/haldus");

router.get("/login", (req, res) => send(res, V.pageLogin({ next: req.query.next })));
router.post("/login", (req, res) => {
  if (loginLimited(req.ip)) return send(res, V.pageLogin({ error: "Liiga palju katseid. Proovige 15 minuti pärast uuesti." }), 429);
  const u = cms.findLogin(req.body.login);
  if (!u || !cms.checkPassword(String(req.body.password || ""), u.pass_hash)) {
    loginHits.get(req.ip).push(Date.now());
    return send(res, V.pageLogin({ error: "Vale kasutajatunnus või parool.", next: req.body.next }), 401);
  }
  res.cookie(COOKIE, cms.createSession(u.id), cookieOpts());
  res.redirect(303, safeNext(req.body.next));
});

/* ---------- kaitse: sessioon ja CSRF ---------- */
router.use((req, res, next) => {
  const s = cms.getSession(req.cookies && req.cookies[COOKIE]);
  if (!s) {
    if (req.method === "GET") return res.redirect(303, "/haldus/login?next=" + encodeURIComponent(req.originalUrl));
    return res.status(401).send("Sessioon on aegunud. Logige uuesti sisse.");
  }
  if (req.method === "POST" && req.body._csrf !== s.csrf) return res.status(403).send("Vorm on aegunud. Laadige leht uuesti.");
  req.s = s;
  next();
});
const adminOnly = (req, res, next) => (req.s.user.role === "admin" ? next() : res.status(403).send("Ainult administraatorile."));

router.post("/logout", (req, res) => {
  cms.destroySession(req.s.token);
  res.clearCookie(COOKIE, cookieOpts());
  res.redirect(303, "/haldus/login");
});

/* ---------- ülevaade ---------- */
router.get("/", (req, res) => send(res, V.pageOverview(req.s, { newCount: visibleInquiries(req.s.user, { status: "Uus" }).length })));

/* ---------- päringud ---------- */
function canSee(user, rec) {
  if (user.role === "admin") return true;
  const mine = String(user.email || "").toLowerCase();
  if (!mine) return false;
  return [rec.recipient.to, ...rec.recipient.cc].some(k => ES.RECIPIENTS[k] && ES.RECIPIENTS[k].email.toLowerCase() === mine);
}
function visibleInquiries(user, opts) { return inquiries.list(opts).filter(r => canSee(user, r)); }
function loadInquiry(req, res, next) {
  const r = inquiries.get(req.params.id);
  if (!r || !canSee(req.s.user, r)) return res.status(404).send("Päringut ei leitud.");
  req.rec = r; next();
}

router.get("/paringud", (req, res) => {
  const status = inquiries.STATUSES.includes(req.query.status) ? req.query.status : "";
  const q = String(req.query.q || "").slice(0, 100);
  send(res, V.pageInquiries(req.s, { list: visibleInquiries(req.s.user, { status, q }), status, q }));
});
router.get("/paringud/:id", loadInquiry, (req, res) => send(res, V.pageInquiry(req.s, req.rec)));
router.get("/paringud/:id/failid/:fid", loadInquiry, (req, res) => {
  const f = req.rec.fileRows.find(x => String(x.id) === req.params.fid);
  const p = f && inquiries.filePath(req.rec.id, f);
  if (!p || !fs.existsSync(p)) return res.status(404).send("Faili ei leitud.");
  res.download(p, f.orig_name);
});
router.post("/paringud/:id/teavita", loadInquiry, async (req, res) => {
  await inquiries.notify(req.rec.id);
  res.redirect(303, `/haldus/paringud/${req.rec.id}`);
});
router.post("/paringud/:id/staatus", loadInquiry, (req, res) => {
  if (inquiries.STATUSES.includes(req.body.status)) inquiries.setStatus(req.rec.id, req.body.status);
  res.redirect(303, `/haldus/paringud/${req.rec.id}`);
});
router.post("/paringud/:id/kustuta", adminOnly, loadInquiry, (req, res) => {
  inquiries.remove(req.rec.id);
  res.redirect(303, "/haldus/paringud");
});

/* ---------- teenuslehed ---------- */
router.get("/teenused/:slug", (req, res, next) => {
  if (!cms.svc(req.params.slug)) return next();
  send(res, V.pageService(req.s, req.params.slug, { notice: req.query.ok ? "Salvestatud." : "" }));
});
router.post("/teenused/:slug", async (req, res, next) => {
  const slug = req.params.slug;
  if (!cms.svc(slug)) return next();
  const err = await cms.act(String(req.body.action || ""), slug, req.s.user, req.body);
  if (err) return send(res, V.pageService(req.s, slug, { error: err }), 422);
  res.redirect(303, `/haldus/teenused/${slug}?ok=1`);
});

/* ---------- muu ---------- */
router.get("/teavitused", (req, res) => send(res, V.pageNotifications(req.s)));
router.get("/logi", (req, res) => send(res, V.pageLog(req.s)));
router.get("/otsustustabel", (req, res) => send(res, V.pageDecisionTable(req.s)));
router.get("/statistika", (req, res) => send(res, V.pageStats(req.s)));

router.get("/seaded", adminOnly, (req, res) => send(res, V.pageSettings(req.s, { notice: req.query.ok ? "Salvestatud." : "" })));
router.post("/seaded", adminOnly, async (req, res) => {
  const n = k => Math.max(0, Math.min(3650, parseInt(req.body[k], 10) || 0));
  const email = String(req.body.adminEmail || "").trim();
  cms.saveSettings({ remindDays: n("remindDays"), escalateDays: n("escalateDays"), langSlaDays: n("langSlaDays"), retentionMonths: n("retentionMonths"),
    adminEmail: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : "" });
  for (const r of cms.allSvc()) {
    if (`own_${r.slug}` in req.body) cms.setOwnership(r.slug, req.body[`own_${r.slug}`], Number(req.body[`int_${r.slug}`]), req.s.user.id);
  }
  await cms.runReminders();
  res.redirect(303, "/haldus/seaded?ok=1");
});
router.post("/kasutajad", adminOnly, (req, res) => {
  try {
    const { id, name, role, email, password } = req.body;
    if (id === "admin" && role !== "admin") throw new Error("Peakasutaja roll peab jääma administraatoriks.");
    if (password && String(password).length < 10) throw new Error("Parool peab olema vähemalt 10 märki.");
    cms.saveUser({ id: String(id || "").trim().toLowerCase(), name, role, email });
    if (password) cms.setPassword(String(id).trim().toLowerCase(), String(password));
    res.redirect(303, "/haldus/seaded?ok=1");
  } catch (e) {
    send(res, V.pageSettings(req.s, { error: e.message }), 422);
  }
});

router.get("/parool", (req, res) => send(res, V.pagePassword(req.s)));
router.post("/parool", (req, res) => {
  const u = cms.findLogin(req.s.user.id);
  if (!cms.checkPassword(String(req.body.old || ""), u.pass_hash)) return send(res, V.pagePassword(req.s, { error: "Praegune parool on vale." }), 422);
  if (String(req.body.new || "").length < 10) return send(res, V.pagePassword(req.s, { error: "Uus parool peab olema vähemalt 10 märki." }), 422);
  cms.setPassword(u.id, String(req.body.new));
  send(res, V.pagePassword(req.s, { notice: "Parool on muudetud." }));
});

module.exports = router;
