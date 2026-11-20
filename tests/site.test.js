const test = require("node:test");
const assert = require("node:assert");
const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "es-test-"));
process.env.ADMIN_PASSWORD = "admin-parool-123";
process.env.FORM_RATE_LIMIT = "1000";

const request = require("supertest");
const mailer = require("../site/mailer");
const sent = [];
mailer.setTransport({ async sendMail(m) { sent.push(m); return { messageId: "x" }; } });

const app = require("../server");
const ES = require("../site/data");
const cms = require("../site/cms");

const validInquiry = (over = {}) => ({
  svc: "elektritood",
  answers: { el_type: "sise", el_building: "eramu", el_stage: "uus", el_project: "ei", loc: "Harjumaa", time: "kohe", desc: "Uus maja" },
  contact: { name: "Mari Maasikas", email: "mari@example.com", phone: "+372 5555 5555", pref: "email", consent: true },
  from: "test", key: "ktest" + Math.random().toString(36).slice(2, 10),
  ...over
});
const post = data => request(app).post("/api/paringud").field("data", JSON.stringify(data));

async function login(agent, user = "admin", pw = "admin-parool-123") {
  const res = await agent.post("/haldus/login").type("form").send({ login: user, password: pw });
  assert.strictEqual(res.status, 303);
  const page = await agent.get("/haldus");
  return /name="_csrf" value="([^"]+)"/.exec(page.text)[1];
}

/* ---------- avalikud lehed ---------- */
test("public pages render with real URLs", async () => {
  for (const url of ["/", "/teenused", "/teenused/elektritood", "/ettevottest", "/kontakt", "/karjaar", "/tehtud-tood", "/paring", "/paring/abi", "/privaatsus"]) {
    const res = await request(app).get(url);
    assert.strictEqual(res.status, 200, url);
    assert.match(res.text, /<title>.*E-Service AS<\/title>/, url);
  }
  const svc = await request(app).get("/teenused/mootelabor");
  assert.match(svc.text, /Akrediteeritud mõõtelabor/);
  assert.match(svc.text, /href="\/paring\/mootelabor"/);
});

test("unknown pages return 404, unknown form service redirects", async () => {
  assert.strictEqual((await request(app).get("/teenused/puudub")).status, 404);
  assert.strictEqual((await request(app).get("/olematu")).status, 404);
  const r = await request(app).get("/paring/puudub");
  assert.strictEqual(r.status, 302);
});

test("sitemap, robots, search index and shared data script", async () => {
  const sm = await request(app).get("/sitemap.xml");
  assert.match(sm.text, /\/teenused\/autolaadijad<\/loc>/);
  assert.match((await request(app).get("/robots.txt")).text, /Disallow: \/haldus/);
  const idx = await request(app).get("/api/otsing.json");
  assert.ok(idx.body.length >= 13);
  const js = await request(app).get("/js/data.js");
  assert.match(js.headers["content-type"], /javascript/);
});

test("security headers are set", async () => {
  const res = await request(app).get("/");
  assert.match(res.headers["content-security-policy"], /default-src 'self'/);
  assert.strictEqual(res.headers["x-content-type-options"], "nosniff");
});

/* ---------- vormiloogika ---------- */
test("routing rules: south county goes to Tartu, substation to substations", () => {
  assert.strictEqual(ES.routeFor("elektritood", { el_type: "liin", loc: "Tartumaa" }).to, "R_TARTU");
  assert.strictEqual(ES.routeFor("elektritood", { el_type: "alajaam", loc: "Harjumaa" }).to, "R_ALAJ");
  assert.strictEqual(ES.routeFor("elektritood", { el_type: "rike", loc: "Tartumaa" }).to, "R_KAIT");
  const r = ES.routeFor("elektritood", { el_type: "sise", el_project: "ei", extra: ["mootelabor"] });
  assert.deepStrictEqual(r, { to: "R_SISE", cc: ["R_PROJ", "R_LAB"] });
});

test("prune removes answers from branches that are no longer visible", () => {
  const a = { el_type: "liin", el_voltage: "kesk", el_building: "eramu" };
  ES.prune("elektritood", a);
  assert.strictEqual(a.el_building, undefined);
  assert.strictEqual(a.el_voltage, "kesk");
});

/* ---------- päringu vastuvõtt ---------- */
test("valid inquiry is stored, routed server-side and emailed", async () => {
  sent.length = 0;
  const res = await post(validInquiry());
  assert.strictEqual(res.status, 201);
  assert.match(res.body.id, /^ES-\d{6}-[0-9A-F]{4}$/);
  await app.locals.pending;
  const internal = sent.find(m => m.subject.includes(res.body.id) && m.subject.startsWith("Uus päring"));
  assert.ok(internal, "internal notification sent");
  assert.deepStrictEqual(internal.to, ["viktor@eservice.ee"]);
  assert.deepStrictEqual(internal.cc, ["indrek.lillemae@eservice.ee"]);
  assert.strictEqual(internal.replyTo, "mari@example.com");
  assert.ok(sent.some(m => m.to.includes("mari@example.com")), "customer confirmation sent");
});

test("client-supplied recipient is ignored", async () => {
  sent.length = 0;
  const data = validInquiry({ recipient: { to: "R_INFO" } });
  data.answers.loc = "Tartumaa";
  const res = await post(data);
  await app.locals.pending;
  const m = sent.find(x => x.subject.includes(res.body.id) && x.subject.startsWith("Uus päring"));
  assert.deepStrictEqual(m.to, ["tartu@eservice.ee"]);
});

test("same idempotency key does not create a duplicate", async () => {
  const data = validInquiry();
  const a = await post(data), b = await post(data);
  assert.strictEqual(a.status, 201);
  assert.strictEqual(b.status, 200);
  assert.strictEqual(a.body.id, b.body.id);
});

test("invalid inquiry returns field errors", async () => {
  const data = validInquiry();
  data.answers.el_type = "olematu";
  data.contact.email = "vale";
  data.contact.consent = false;
  const res = await post(data);
  assert.strictEqual(res.status, 422);
  assert.ok(res.body.errors.el_type);
  assert.ok(res.body.errors.c_email);
  assert.ok(res.body.errors.c_consent);
});

test("honeypot submissions are not stored", async () => {
  const before = require("../site/inquiries").list().length;
  const res = await post(validInquiry({ website: "http://spam" }));
  assert.strictEqual(res.status, 201);
  assert.strictEqual(require("../site/inquiries").list().length, before);
});

test("files are attached and disallowed types rejected", async () => {
  sent.length = 0;
  const ok = await request(app).post("/api/paringud").field("data", JSON.stringify(validInquiry())).attach("files", Buffer.from("%PDF-1.4"), "joonis.pdf");
  assert.strictEqual(ok.status, 201);
  await app.locals.pending;
  const m = sent.find(x => x.subject.includes(ok.body.id));
  assert.strictEqual(m.attachments[0].filename, "joonis.pdf");
  const bad = await request(app).post("/api/paringud").field("data", JSON.stringify(validInquiry())).attach("files", Buffer.from("x"), "viirus.exe");
  assert.strictEqual(bad.status, 422);
});

test("inquiry is kept when e-mail fails, and can be resent", async () => {
  mailer.setTransport({ async sendMail() { throw new Error("SMTP maas"); } });
  const res = await post(validInquiry());
  await app.locals.pending;
  const inq = require("../site/inquiries");
  assert.strictEqual(inq.get(res.body.id).notify.state, "ebaõnnestus");
  mailer.setTransport({ async sendMail(m) { sent.push(m); return {}; } });
  const r2 = await inq.notify(res.body.id);
  assert.strictEqual(r2.notify.state, "saadetud");
  assert.strictEqual(r2.notify.attempts, 2);
});

test("funnel records only service and step", async () => {
  const res = await request(app).post("/api/funnel").send({ svc: "elektritood", step: "loc" });
  assert.strictEqual(res.status, 204);
  assert.ok(require("../site/inquiries").funnel().some(r => r.k === "elektritood|et|loc"));
});

/* ---------- haldus ---------- */
test("admin requires login", async () => {
  const res = await request(app).get("/haldus/paringud");
  assert.strictEqual(res.status, 303);
  assert.match(res.headers.location, /^\/haldus\/login/);
  const bad = await request(app).post("/haldus/login").type("form").send({ login: "admin", password: "vale" });
  assert.strictEqual(bad.status, 401);
});

test("admin sees inquiries and can change status; CSRF is enforced", async () => {
  const agent = request.agent(app);
  const csrf = await login(agent);
  const { body } = await post(validInquiry());
  const list = await agent.get("/haldus/paringud");
  assert.match(list.text, new RegExp(body.id));
  const noCsrf = await agent.post(`/haldus/paringud/${body.id}/staatus`).type("form").send({ status: "Töös" });
  assert.strictEqual(noCsrf.status, 403);
  const ok = await agent.post(`/haldus/paringud/${body.id}/staatus`).type("form").send({ status: "Töös", _csrf: csrf });
  assert.strictEqual(ok.status, 303);
  assert.strictEqual(require("../site/inquiries").get(body.id).status, "Töös");
});

test("owner only sees inquiries addressed to them", async () => {
  cms.setPassword("ahti", "ahti-parool-123");
  const agent = request.agent(app);
  await login(agent, "ahti", "ahti-parool-123");
  const lab = await post({ ...validInquiry(), svc: "mootelabor", answers: { ml_type: "audit", loc: "Harjumaa", time: "kohe" } });
  const other = await post(validInquiry());
  assert.strictEqual((await agent.get(`/haldus/paringud/${lab.body.id}`)).status, 200);
  assert.strictEqual((await agent.get(`/haldus/paringud/${other.body.id}`)).status, 404);
});

test("content workflow: owner edits, language editor publishes, public page updates", async () => {
  cms.setPassword("vaido", "vaido-parool-123");
  cms.setPassword("keel", "keel-parool-123");
  const owner = request.agent(app);
  let csrf = await login(owner, "vaido", "vaido-parool-123");
  await owner.post("/haldus/teenused/elektritood").type("form").send({ _csrf: csrf, action: "startEdit" });
  const d = cms.svc("elektritood").draft;
  const form = { _csrf: csrf, action: "submit", ed_name: d.name, ed_lead: "Uus sissejuhatus testist.", ed_problem: d.problem, ed_note: "",
    ed_forWho: d.forWho.join("\n"), ed_includes: d.includes.join("\n"), ed_order: d.order.map(x => x.join(" | ")).join("\n"),
    ed_facts: d.facts.map(x => x.slice(1).join(" | ")).join("\n"), rel: d.related.map(x => x[0]),
    ...Object.fromEntries(d.related.map(x => ["relwhy_" + x[0], x[1]])),
    ed_c_name: d.contact.name, ed_c_role: d.contact.role, ed_c_email: d.contact.email, ed_c_phone: d.contact.phone };
  const sub = await owner.post("/haldus/teenused/elektritood").type("form").send(form);
  assert.strictEqual(sub.status, 303);
  assert.strictEqual(cms.svc("elektritood").state, "keel");
  // avalik leht näitab veel vana teksti
  assert.doesNotMatch((await request(app).get("/teenused/elektritood")).text, /Uus sissejuhatus testist/);
  // omanik ei saa ise avaldada
  const deny = await owner.post("/haldus/teenused/elektritood").type("form").send({ ...form, action: "publish" });
  assert.strictEqual(deny.status, 422);

  const lang = request.agent(app);
  csrf = await login(lang, "keel", "keel-parool-123");
  const pub = await lang.post("/haldus/teenused/elektritood").type("form").send({ ...form, _csrf: csrf, action: "publish" });
  assert.strictEqual(pub.status, 303);
  assert.strictEqual(cms.svc("elektritood").version, 2);
  assert.match((await request(app).get("/teenused/elektritood")).text, /Uus sissejuhatus testist/);
});

test("review reminders are sent once per due date", async () => {
  const before = cms.notifications().length;
  const far = new Date(); far.setFullYear(far.getFullYear() + 2);
  await cms.runReminders(far.toISOString().slice(0, 10));
  const mid = cms.notifications().length;
  assert.ok(mid > before);
  await cms.runReminders(far.toISOString().slice(0, 10));
  assert.strictEqual(cms.notifications().length, mid);
});
