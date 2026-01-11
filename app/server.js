import http from "http";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const VERSION = process.env.APP_VERSION || "unknown";

const page = (title, body) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
body{margin:0;background:#0b0b0d;color:#eaeaea;font-family:system-ui,-apple-system,Segoe UI,Roboto}
.wrap{max-width:1080px;margin:60px auto;padding:0 24px}
h1{font-size:46px;margin:0 0 12px}
h2{font-size:28px;margin:0 0 10px}
p{font-size:16px;opacity:.9;line-height:1.6}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:40px}
.card{border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:26px;background:rgba(255,255,255,.03)}
a.btn{display:inline-block;margin-top:18px;padding:14px 22px;border-radius:12px;background:#ff7a18;color:#000;text-decoration:none;font-weight:600}
.small{opacity:.6;font-size:13px;margin-top:28px}
@media(max-width:800px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
${body}
<div class="small">Iron Front Digital • Version ${VERSION}</div>
</div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = req.url || "/";

  if (url === "/health")
    return json(res, { ok: true, version: VERSION });

  if (url === "/ready")
    return json(res, { ready: true, version: VERSION });

  if (url === "/mlm")
    return html(res, page("Scale Your MLM", `
      <h1>Scale Your Existing Business</h1>
      <p>
        Iron Front Digital provides infrastructure, automation, lead systems,
        and operational tooling for established MLM and network marketing
        businesses.
      </p>
      <p>
        This is not a new MLM. We power <strong>your</strong> brand, your team,
        and your compensation structure — while removing operational friction.
      </p>
      <a class="btn" href="/request-access">Request Access</a>
    `));

  if (url === "/biab")
    return html(res, page("Start a Business", `
      <h1>Start a Business — The Right Way</h1>
      <p>
        Our Business-in-a-Box program is designed for individuals who want
        ownership, structure, and real systems — without guessing or duct tape.
      </p>
      <p>
        You'll build a legitimate business with guidance, infrastructure,
        and a clear path to scaling.
      </p>
      <a class="btn" href="/request-access">Request Access</a>
    `));

  if (url === "/request-access")
    return html(res, page("Request Access", `
      <h1>Request Early Access</h1>
      <p>
        We're onboarding in controlled phases to maintain quality.
      </p>
      <p>
        Email collection and onboarding flow is opening shortly.
      </p>
      <p><strong>Status:</strong> Applications opening soon.</p>
    `));

  return html(res, page("Iron Front Digital", `
    <h1>Build. Scale. Operate.</h1>
    <p>
      Iron Front Digital builds and operates infrastructure for modern
      business owners — from network marketing leaders to first-time founders.
    </p>

    <div class="grid">
      <div class="card">
        <h2>I Have an Existing Business</h2>
        <p>
          I'm already operating an MLM or network marketing organization
          and want better systems, automation, and scale.
        </p>
        <a class="btn" href="/mlm">Continue</a>
      </div>

      <div class="card">
        <h2>I Want to Start a Business</h2>
        <p>
          I'm looking for a structured way to build a real business with
          support, systems, and a growth path.
        </p>
        <a class="btn" href="/biab">Continue</a>
      </div>
    </div>
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
  console.log(`[ifd] live on ${PORT} (${VERSION})`);
});
