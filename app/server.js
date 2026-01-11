import http from "http";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const APP_VERSION = process.env.APP_VERSION || process.env.GITHUB_SHA || "unknown";

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function html(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = req.url || "/";
  if (url === "/health") return json(res, 200, { ok: true, version: APP_VERSION });
  if (url === "/ready") return json(res, 200, { ready: true, version: APP_VERSION });

  return html(res, 200, `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Iron Front Digital</title>
  <style>
    body{margin:0;background:#0b0b0d;color:#eaeaea;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
    .wrap{max-width:980px;margin:48px auto;padding:0 20px}
    h1{font-size:44px;margin:0 0 14px}
    p{font-size:16px;opacity:.9}
    .card{margin-top:18px;padding:16px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.03)}
    .muted{opacity:.7;font-size:13px;margin-top:18px}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Iron Front Digital</h1>
    <p>Platform is live. Deployment pipeline is active.</p>
    <div class="card">
      <div><strong>Status:</strong> Online</div>
      <div class="muted">Version: <code>${APP_VERSION}</code></div>
    </div>
    <div class="muted">Health: <code>/health</code> • Ready: <code>/ready</code></div>
  </div>
</body>
</html>`);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[ifd] listening on :${PORT} version=${APP_VERSION}`);
});

function shutdown(signal) {
  console.log(`[ifd] ${signal} received, shutting down...`);
  server.close(() => {
    console.log("[ifd] server closed");
    process.exit(0);
  });
  setTimeout(() => {
    console.log("[ifd] forced exit");
    process.exit(1);
  }, 8000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
