import http from "http";
import fs from "fs";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const VERSION = process.env.APP_VERSION || "unknown";
const LEADS_FILE = "/tmp/ifd-leads.json";

if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, "[]");

const readLeads = () => JSON.parse(fs.readFileSync(LEADS_FILE, "utf8"));
const saveLead = (lead) => {
  const leads = readLeads();
  leads.push({ ...lead, ts: new Date().toISOString() });
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
};

const page = (title, body) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
body{margin:0;background:#0b0b0d;color:#eaeaea;font-family:system-ui}
.wrap{max-width:960px;margin:60px auto;padding:0 24px}
h1{font-size:44px;margin:0 0 12px}
p{font-size:16px;opacity:.9}
form{margin-top:24px}
input{padding:12px;border-radius:10px;border:none;width:100%;max-width:420px}
button{margin-top:14px;padding:12px 20px;border-radius:10px;border:none;background:#ff7a18;font-weight:600}
.small{opacity:.6;font-size:13px;margin-top:28px}
</style>
</head>
<body>
<div class="wrap">
${body}
<div class="small">Iron Front Digital • ${VERSION}</div>
</div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/health")
    return json(res, { ok: true, version: VERSION });

  if (url.pathname === "/ready")
    return json(res, { ready: true, version: VERSION });

  if (url.pathname === "/admin/leads")
    return json(res, readLeads());

  if (url.pathname === "/submit" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => body += c);
    req.on("end", () => {
      const data = new URLSearchParams(body);
      saveLead({
        email: data.get("email"),
        source: data.get("source")
      });
      return html(res, page("Received", `
        <h1>Request Received</h1>
        <p>We'll be in touch shortly.</p>
      `));
    });
    return;
  }

  if (url.pathname === "/mlm")
    return html(res, page("Scale MLM", `
      <h1>Scale Your Existing Business</h1>
      <p>Infrastructure, automation, and systems for established MLM leaders.</p>
      <form method="POST" action="/submit">
        <input type="hidden" name="source" value="mlm" />
        <input required type="email" name="email" placeholder="Your email" />
        <button>Request Access</button>
      </form>
    `));

  if (url.pathname === "/biab")
    return html(res, page("Start a Business", `
      <h1>Start a Business</h1>
      <p>Structured ownership with real systems and guidance.</p>
      <form method="POST" action="/submit">
        <input type="hidden" name="source" value="biab" />
        <input required type="email" name="email" placeholder="Your email" />
        <button>Request Access</button>
      </form>
    `));

  return html(res, page("Iron Front Digital", `
    <h1>Build. Scale. Operate.</h1>
    <p>Select your path:</p>
    <p><a href="/mlm">Existing MLM Business</a> • <a href="/biab">Start a Business</a></p>
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

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[ifd] live ${PORT} (${VERSION})`);
});
