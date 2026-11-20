const express = require("express");
const path = require("node:path");
const ES = require("../site/data");
const R = require("../site/render");

const router = express.Router();

const send = (res, html, status = 200) => res.status(status).type("html").send(html);

router.get("/", (req, res) => send(res, R.pageHome()));
router.get("/teenused", (req, res) => send(res, R.pageServices()));
router.get("/teenused/:slug", (req, res, next) => {
  const s = ES.SVC[req.params.slug];
  if (!s) return next();
  send(res, R.pageService(s));
});
router.get("/ettevottest", (req, res) => send(res, R.pageCompany()));
router.get("/kontakt", (req, res) => send(res, R.pageContact()));
router.get("/karjaar", (req, res) => send(res, R.pageCareer()));
router.get("/tehtud-tood", (req, res) => send(res, R.pageWorks()));
router.get("/privaatsus", (req, res) => send(res, R.pagePrivacy()));
router.get("/paring", (req, res) => send(res, R.pageForm(null)));
router.get("/paring/:slug", (req, res) => {
  const slug = req.params.slug;
  if (slug !== "abi" && !ES.SVC[slug]) return res.redirect(302, "/paring");
  send(res, R.pageForm(slug));
});

// Jagatud vormiloogika brauserile
router.get("/js/data.js", (req, res) => {
  res.type("application/javascript").sendFile(path.join(__dirname, "..", "site", "data.js"), { maxAge: "1h" });
});

router.get("/api/otsing.json", (req, res) => res.json(R.searchIndex()));

router.get("/robots.txt", (req, res) => {
  const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  res.type("text/plain").send(`User-agent: *\nDisallow: /haldus\nDisallow: /api/\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ""}`);
});
router.get("/sitemap.xml", (req, res) => {
  const base = (process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  const urls = ["/", "/teenused", ...ES.SERVICES.map(s => `/teenused/${s.slug}`), "/tehtud-tood", "/ettevottest", "/karjaar", "/kontakt", "/paring", "/privaatsus"];
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${base}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
});

// Prototüübi vanad #-aadressid jõuavad serverisse ainult avalehena; ümbersuunamine tehakse
// brauseris (site.js). Vanad eservice.ee aadressid saab lisada siia vajadusel.

module.exports = router;
