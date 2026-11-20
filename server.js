const express = require("express");
const path = require("node:path");
const cookieParser = require("cookie-parser");

const db = require("./site/db");
const cms = require("./site/cms");
const inquiries = require("./site/inquiries");
const render = require("./site/render");

const usersRoutes = require("./routes/users");
const healthRoutes = require("./routes/health");
const pageRoutes = require("./routes/pages");
const apiRoutes = require("./routes/api");
const adminRoutes = require("./routes/admin");

db.open();
const generatedAdminPassword = cms.seed();

const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY === "true" ? true : process.env.TRUST_PROXY);

// Turvapäised
app.use((req, res, next) => {
  res.set({
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  });
  if (process.env.NODE_ENV === "production") res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public"), { maxAge: process.env.NODE_ENV === "production" ? "7d" : 0 }));

app.use("/users", usersRoutes);
app.use("/health", healthRoutes);
app.use("/api", apiRoutes);
app.use("/haldus", adminRoutes);
app.use("/", pageRoutes);

app.use((req, res) => res.status(404).type("html").send(render.page404()));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith("/api/")) return res.status(500).json({ error: "Serveri viga" });
  res.status(500).type("html").send(render.page500());
});

/** Iga tunni järel: ülevaatuse meeldetuletused ja vanade päringute kustutamine. */
function startScheduler() {
  const tick = async () => {
    try {
      await cms.runReminders();
      const n = inquiries.purgeOld(cms.settings().retentionMonths);
      if (n) console.log(`Kustutati ${n} säilitusaja ületanud päringut`);
    } catch (e) { console.error("Ajastatud töö viga", e); }
  };
  tick();
  setInterval(tick, 60 * 60 * 1000).unref();
}

const PORT = process.env.PORT || 3000;

// Only start the server when this file is run directly (e.g. `npm run dev`),
// so the tests can import `app` without opening a real port.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`E-Service koduleht: http://localhost:${PORT}`);
    if (generatedAdminPassword) {
      console.log(`\nHaldus: http://localhost:${PORT}/haldus  kasutaja: admin  parool: ${generatedAdminPassword}`);
      console.log("(Parool genereeriti, sest ADMIN_PASSWORD puudub. Muuda see halduses: Muuda parooli.)\n");
    }
  });
  startScheduler();
}

module.exports = app;
