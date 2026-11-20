// E-posti saatmine (SMTP, nodemailer). Seadistus keskkonnamuutujatest, vt .env.example.
// Kui SMTP_HOST puudub, saatmine ebaõnnestub teatega "kanal seadistamata" – päring
// salvestub siiski ja teavituse saab halduses uuesti saata.
let transport = null;
let custom = false;

function config() {
  return {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "E-Service AS koduleht <noreply@eservice.ee>",
    redirectTo: process.env.MAIL_REDIRECT_TO || ""
  };
}

function configured() { return custom || !!config().host; }

function getTransport() {
  if (transport) return transport;
  const c = config();
  if (!c.host) return null;
  const nodemailer = require("nodemailer");
  transport = nodemailer.createTransport({
    host: c.host, port: c.port, secure: c.secure,
    auth: c.user ? { user: c.user, pass: c.pass } : undefined
  });
  return transport;
}

// Testide ja erilahenduste jaoks: transport = { sendMail(msg) => Promise }
function setTransport(t) { transport = t; custom = !!t; }

/**
 * @param {{to:string[]|string, cc?:string[], replyTo?:string, subject:string, text:string, attachments?:Array}} msg
 */
async function send(msg) {
  const t = getTransport();
  if (!t) throw new Error("e-posti kanal seadistamata (SMTP_HOST puudub)");
  const c = config();
  const list = x => (Array.isArray(x) ? x : x ? [x] : []).filter(Boolean);
  let to = list(msg.to), cc = list(msg.cc), subject = msg.subject, text = msg.text;
  if (c.redirectTo) { // testkeskkond: kõik kirjad ühele aadressile, algsed saajad kirja algusesse
    text = `[Ümbersuunatud. Algne saaja: ${to.join(", ")}${cc.length ? "; koopia: " + cc.join(", ") : ""}]\n\n` + text;
    to = [c.redirectTo]; cc = []; subject = "[TEST] " + subject;
  }
  const info = await t.sendMail({ from: c.from, to, cc, replyTo: msg.replyTo, subject, text, attachments: msg.attachments });
  return { to, cc, messageId: info && info.messageId };
}

module.exports = { send, setTransport, configured, config };
