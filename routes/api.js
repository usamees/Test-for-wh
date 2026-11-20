const express = require("express");
const multer = require("multer");
const crypto = require("node:crypto");
const inquiries = require("../site/inquiries");

const router = express.Router();

/* Lihtne mälupõhine piirang IP kohta (rämpspäringute vastu). */
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now(), ip = req.ip || "?";
    const arr = (hits.get(ip) || []).filter(t => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: "Liiga palju päringuid. Proovige mõne aja pärast uuesti" });
    arr.push(now); hits.set(ip, arr);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < windowMs)) hits.delete(k);
    next();
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: inquiries.MAX_FILES, fileSize: inquiries.MAX_FILE_BYTES, fields: 5, fieldSize: 200 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!inquiries.fileAllowed(file.originalname)) return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "files"));
    cb(null, true);
  }
});

const submitLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.FORM_RATE_LIMIT || 10) });

router.post("/paringud", submitLimit, (req, res, next) => {
  upload.array("files", inquiries.MAX_FILES)(req, res, err => {
    if (!err) return next();
    const msg = err.code === "LIMIT_FILE_SIZE" ? "Fail on liiga suur (kuni 10 MB)"
      : err.code === "LIMIT_FILE_COUNT" ? `Lisage kuni ${inquiries.MAX_FILES} faili`
        : err.code === "LIMIT_UNEXPECTED_FILE" ? "Seda failitüüpi ei saa lisada" : "Vigane päring";
    res.status(422).json({ error: msg, errors: { files: msg } });
  });
}, async (req, res) => {
  let input;
  try { input = JSON.parse(req.body.data || "{}"); } catch (e) { return res.status(400).json({ error: "Vigane päring" }); }

  // Meepott: robotid täidavad peidetud välja. Vastame nagu õnnestus, aga ei salvesta.
  if (input.website) return res.status(201).json({ id: "ES-" + crypto.randomBytes(3).toString("hex").toUpperCase() });

  const files = req.files || [];
  const { payload, errors } = inquiries.prepare({ ...input, fileNames: files.map(f => f.originalname) });
  if (errors) return res.status(422).json({ error: "Kontrollige vastuseid", errors });

  const key = typeof input.key === "string" && /^[a-z0-9]{6,40}$/i.test(input.key) ? input.key : null;
  const { record, duplicate } = inquiries.create(payload, key, files);
  res.status(duplicate ? 200 : 201).json({ id: record.id });

  if (!duplicate) {
    // Teavitus pärast vastust: e-posti viivitus ei aeglusta vormi ega kaota päringut.
    const job = (async () => { await inquiries.notify(record.id); await inquiries.confirmToCustomer(record.id); })();
    req.app.locals.pending = job;
    job.catch(e => console.error("Teavituse viga", record.id, e));
  }
});

router.post("/funnel", express.json({ limit: "2kb" }), rateLimit({ windowMs: 60 * 1000, max: 120 }), (req, res) => {
  const { svc, step } = req.body || {};
  inquiries.funnelStep(String(svc || "-"), String(step || ""));
  res.status(204).end();
});

module.exports = router;
