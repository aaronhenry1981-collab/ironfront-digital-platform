import http from "http";
import fs from "fs";
import crypto from "crypto";
import Stripe from "stripe";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const VERSION = process.env.APP_VERSION || "unknown";
const ADMIN_KEY = process.env.ADMIN_KEY;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || null;

const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY) : null;
const LEADS_FILE = "/tmp/ifd-leads.json";

if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, "[]");

const readLeads = () => JSON.parse(fs.readFileSync(LEADS_FILE, "utf8"));
const writeLeads = (l) => fs.writeFileSync(LEADS_FILE, JSON.stringify(l, null, 2));

function classify(source) {
  if (source === "mlm") return { tier: "MLM Platform", pricing: "Revenue-share (10%)", note: "Systems + automation for existing orgs" };
  if (source === "biab") return { tier: "BIAB Starter", pricing: "$100–$1,500 / month", note: "Guided business build with upgrade path" };
  return { tier: "Franchise Candidate", pricing: "$10,000 license + royalties", note: "Limited partner access" };
}

const page = (title, body) => `<!doctype html>
<html><head><meta charset="utf-8"/><title>${title}</title></head>
<body style="background:#0b0b0d;color:#eaeaea;font-family:sans-serif;padding:40px">
${body}
<div style="opacity:.6;margin-top:30px">Iron Front Digital • v${VERSION}</div>
</body></html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/health")
    return json(res, { ok: true, version: VERSION });

  if (url.pathname === "/ready")
    return json(res, { ready: true, version: VERSION });

  if (url.pathname.startsWith("/admin")) {
    if (req.headers["x-admin-key"] !== ADMIN_KEY) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
  }

  if (url.pathname === "/admin/leads")
    return json(res, readLeads());

  if (url.pathname === "/apply" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      const data = new URLSearchParams(body);
      const email = data.get("email");
      const source = data.get("source");
      const classification = classify(source);

      let stripeId = null;
      if (stripe) {
        const customer = await stripe.customers.create({
          email,
          metadata: { source, tier: classification.tier }
        });
        stripeId = customer.id;
      }

      const leads = readLeads();
      leads.push({
        id: crypto.randomUUID(),
        email,
        source,
        tier: classification.tier,
        stripeId,
        ts: new Date().toISOString()
      });
      writeLeads(leads);

      return html(res, page("Application Received", `
        <h1>Application Received</h1>
        <p><strong>Recommended Path:</strong> ${classification.tier}</p>
        <p><strong>Pricing Model:</strong> ${classification.pricing}</p>
        <p>${classification.note}</p>
        <p>Our team will review and follow up.</p>
      `));
    });
    return;
  }

  if (url.pathname === "/mlm" || url.pathname === "/biab") {
    const source = url.pathname.replace("/", "");
    return html(res, page("Apply", `
      <h1>${source === "mlm" ? "Scale Your Business" : "Start a Business"}</h1>
      <form method="POST" action="/apply">
        <input type="hidden" name="source" value="${source}" />
        <input required name="email" placeholder="Email" />
        <button>Apply</button>
      </form>
    `));
  }

  return html(res, page("Iron Front Digital", `
    <h1>Build. Scale. Operate.</h1>
    <p>Select your path:</p>
    <p><a href="/mlm">Existing Business</a> • <a href="/biab">Start a Business</a></p>
  `));
});

function json(res, obj) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}
function html(res, body) {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(body);
}

server.listen(PORT, "0.0.0.0", () =>
  console.log(`[ifd] live ${PORT} (${VERSION})`)
);
