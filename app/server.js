import http from "http";

const PORT = process.env.PORT || 3000;
const VERSION = process.env.APP_VERSION || "unknown";

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, version: VERSION }));
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
    <html>
      <head><title>Iron Front Digital</title></head>
      <body style="background:#0b0b0b;color:#fff;font-family:sans-serif;padding:40px">
        <h1>Iron Front Digital Platform</h1>
        <p>CI/CD live. Zero-downtime deployments active.</p>
        <p><strong>Status:</strong> Online</p>
        <p style="opacity:.6">Version: ${VERSION}</p>
      </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log(`IFD running on port ${PORT} (version ${VERSION})`);
});
