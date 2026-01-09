const http = require("http");
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Iron Front Digital Platform – CI/CD live\n");
});

server.listen(port, "0.0.0.0", () =>
  console.log("Listening on " + port)
);
