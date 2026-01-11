import http from "http";
import fs from "fs";
import crypto from "crypto";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const VERSION = process.env.APP_VERSION || "unknown";
const ADMIN_KEY = process.env.ADMIN_KEY || "change-me";
const LEADS_FILE = "/tmp/ifd-leads.json";

if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, "[]");

const readLeads = () => JSON.parse(fs.readFileSync(LEADS_FILE, "utf8"));
const writeLeads = (leads) => fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));

const page = (title, body) => `<!doctype html>
<html><head><meta charset="utf-8"/><title>${title}</title></head>
<body style="background:#0b0b0d;color:#eaeaea;font-family:sans-serif;padding:40px">
${body}
<div style="opacity:.6;margin-top:30px">Version ${VERSION}</div>
</body></html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/health")
    return json(res, { ok: true, version: VERSION });

  if (url.pathname === "/ready")
    return json(res, { ready: true, version: VERSION });

  // Admin guard
  if (url.pathname.startsWith("/admin")) {
    const key = req.headers["x-admin-key"];
    if (key !== ADMIN_KEY) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
  }

  if (url.pathname === "/admin/leads")
    return json(res, readLeads());

  if (url.pathname === "/admin/export") {
    const leads = readLeads();
    const csv = ["email,source,timestamp"].concat(
      leads.map(l => `${l.email},${l.source},${l.ts}`)
    ).join("\n");
    res.writeHead(200, { "Content-Type": "text/csv" });
    return res.end(csv);
  }

  if (url.pathname === "/admin/clear" && req.method === "POST") {
    writeLeads([]);
    return json(res, { cleared: true });
  }

  if (url.pathname === "/submit" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      const data = new URLSearchParams(body);
      const leads = readLeads();
      leads.push({
        id: crypto.randomUUID(),
        email: data.get("email"),
        source: data.get("source"),
        ts: new Date().toISOString()
      });
      writeLeads(leads);
      return html(res, page("Received", "<h1>Request received</h1>"));
    });
    return;
  }

  if (url.pathname === "/mlm")
    return html(res, page("MLM", `
      <h1>Scale Your MLM</h1>
      <form method="POST" action="/submit">
        <input type="hidden" name="source" value="mlm"/>
        <input name="email" required placeholder="Email"/>
        <button>Request Access</button>
      </form>
    `));

  if (url.pathname === "/biab")
    return html(res, page("BIAB", `
      <h1>Start a Business</h1>
      <form method="POST" action="/submit">
        <input type="hidden" name="source" value="biab"/>
        <input name="email" required placeholder="Email"/>
        <button>Request Access</button>
      </form>
    `));

  return html(res, page("Iron Front Digital", `
    <h1>Build. Scale. Operate.</h1>
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
