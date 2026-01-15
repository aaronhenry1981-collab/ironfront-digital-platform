import http from "http";
import crypto from "crypto";
import fs from "fs";
import Stripe from "stripe";
import Database from "better-sqlite3";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const VERSION = process.env.APP_VERSION || "missing";
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || null;

// Durable DB location (host-mounted volume via deploy.sh)
const DB_PATH = process.env.DB_PATH || "/data/ifd.db";
// Legacy file (migrated once, then ignored)
const LEGACY_LEADS_FILE = "/tmp/ifd-leads.json";

if (VERSION === "missing") {
  // Hard fail if pipeline didn't pass a version (prevents drift)
  console.error("[ifd] APP_VERSION missing – refusing to start");
  process.exit(1);
}

const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY) : null;

function ensureDir(p) {
  const dir = p.split("/").slice(0, -1).join("/") || "/";
  fs.mkdirSync(dir, { recursive: true });
}
ensureDir(DB_PATH);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL,          -- mlm | biab
  tier TEXT NOT NULL,            -- MLM Platform | BIAB Starter | Franchise Candidate
  status TEXT NOT NULL,          -- new | contacted | qualified | closed
  stripe_customer_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,            -- lead_created | lead_status_updated | admin_exported | admin_cleared | etc
  lead_id TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_lead_id ON events(lead_id);
`);

const stmtInsertLead = db.prepare(`
INSERT INTO leads (id,email,source,tier,status,stripe_customer_id,created_at)
VALUES (@id,@email,@source,@tier,@status,@stripe_customer_id,@created_at)
`);
const stmtGetLeadByEmailSource = db.prepare(`
SELECT * FROM leads WHERE email = ? AND source = ? ORDER BY created_at DESC LIMIT 1
`);
const stmtListLeads = db.prepare(`
SELECT * FROM leads ORDER BY created_at DESC LIMIT ?
`);
const stmtUpdateLeadStatus = db.prepare(`
UPDATE leads SET status = ? WHERE id = ?
`);
const stmtDeleteAllLeads = db.prepare(`DELETE FROM leads`);
const stmtCountLeads = db.prepare(`SELECT COUNT(*) AS n FROM leads`);
const stmtInsertEvent = db.prepare(`
INSERT INTO events (id,type,lead_id,meta_json,created_at)
VALUES (@id,@type,@lead_id,@meta_json,@created_at)
`);
const stmtListEvents = db.prepare(`
SELECT * FROM events ORDER BY created_at DESC LIMIT ?
`);

function nowIso() { return new Date().toISOString(); }
function uuid() { return crypto.randomUUID(); }

function event(type, lead_id, meta) {
  stmtInsertEvent.run({
    id: uuid(),
    type,
    lead_id: lead_id || null,
    meta_json: meta ? JSON.stringify(meta) : null,
    created_at: nowIso()
  });
}

function classify(source) {
  if (source === "mlm") return { tier: "MLM Platform", pricing: "Revenue-share (10%)", note: "Systems + automation for existing orgs" };
  if (source === "biab") return { tier: "BIAB Starter", pricing: "$100–$1,500 / month", note: "Guided business build with upgrade path" };
  return { tier: "Franchise Candidate", pricing: "$10,000 license + royalties", note: "Limited partner access" };
}

function flagsForTier(tier) {
  return {
    is_platform_user: tier === "MLM Platform" ? 1 : 0,
    is_biab_user: tier === "BIAB Starter" ? 1 : 0,
    is_franchise_candidate: tier === "Franchise Candidate" ? 1 : 0
  };
}

// One-time migration from legacy JSON into SQLite (safe + idempotent-ish)
(function migrateLegacy() {
  try {
    if (!fs.existsSync(LEGACY_LEADS_FILE)) return;
    const raw = fs.readFileSync(LEGACY_LEADS_FILE, "utf8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return;

    const existing = stmtCountLeads.get().n;
    if (existing > 0) return;

    const tx = db.transaction((rows) => {
      for (const r of rows) {
        const id = r.id || uuid();
        const email = r.email || "";
        const source = r.source || "mlm";
        const tier = r.tier || classify(source).tier;
        const created_at = r.ts || nowIso();
        const stripe_customer_id = r.stripeId || r.stripe_customer_id || null;
        stmtInsertLead.run({
          id,
          email,
          source,
          tier,
          status: "new",
          stripe_customer_id,
          created_at
        });
        event("lead_migrated", id, { source, tier, legacy: true });
      }
    });

    tx(arr);
    console.log(`[ifd] migrated ${arr.length} legacy leads into sqlite`);
  } catch (e) {
    console.error("[ifd] legacy migration failed (non-fatal):", e?.message || e);
  }
})();

function requireAdmin(req, res) {
  const k = req.headers["x-admin-key"];
  if (!ADMIN_KEY || k !== ADMIN_KEY) {
    res.writeHead(403);
    res.end("Forbidden");
    return false;
  }
  return true;
}

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

function html(res, code, body) {
  res.writeHead(code, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <style>
    body{margin:0;background:#0b0b0d;color:#eaeaea;font-family:system-ui,-apple-system,Segoe UI,Roboto}
    .wrap{max-width:1020px;margin:60px auto;padding:0 24px}
    h1{font-size:44px;margin:0 0 12px}
    p{font-size:16px;opacity:.9;line-height:1.6}
    .card{margin-top:18px;padding:18px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.03)}
    input{padding:12px;border-radius:10px;border:none;width:100%;max-width:440px}
    button{margin-top:14px;padding:12px 20px;border-radius:10px;border:none;background:#ff7a18;font-weight:700}
    .small{opacity:.6;font-size:13px;margin-top:30px}
    a{color:#ffb26b}
  </style>
  </head><body><div class="wrap">${body}<div class="small">Iron Front Digital • v${VERSION}</div></div></body></html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");

  if (url.pathname === "/health") return json(res, 200, { ok: true, version: VERSION });
  
  if (url.pathname === "/ready") {
    // /ready checks database connection (for deployment gates)
    try {
      // Test database connection by running a simple query
      db.prepare("SELECT 1").get();
      return json(res, 200, { ok: true, db: "ok", version: VERSION });
    } catch (e) {
      // Database connection failed
      res.writeHead(503);
      return res.end(JSON.stringify({ ok: false, db: "error", version: VERSION }));
    }
  }
  
  if (url.pathname === "/version") return json(res, 200, { version: VERSION });

  // ----- Admin -----
  if (url.pathname === "/admin/leads") {
    if (!requireAdmin(req, res)) return;
    const limit = Math.min(Number(url.searchParams.get("limit") || "200"), 2000);
    return json(res, 200, stmtListLeads.all(limit));
  }

  if (url.pathname === "/admin/events") {
    if (!requireAdmin(req, res)) return;
    const limit = Math.min(Number(url.searchParams.get("limit") || "200"), 2000);
    return json(res, 200, stmtListEvents.all(limit));
  }

  if (url.pathname === "/admin/export") {
    if (!requireAdmin(req, res)) return;
    event("admin_exported", null, { by: "admin" });

    const leads = stmtListLeads.all(5000);
    const header = "id,email,source,tier,status,stripe_customer_id,created_at";
    const rows = leads.map(l =>
      `${l.id},${l.email},${l.source},${l.tier},${l.status},${l.stripe_customer_id || ""},${l.created_at}`
    );
    res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" });
    return res.end([header, ...rows].join("\n"));
  }

  if (url.pathname === "/admin/lead/status" && req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      const data = new URLSearchParams(body);
      const id = data.get("id") || "";
      const status = data.get("status") || "";
      const allowed = new Set(["new", "contacted", "qualified", "closed"]);
      if (!id || !allowed.has(status)) return json(res, 400, { ok: false, error: "invalid id/status" });

      stmtUpdateLeadStatus.run(status, id);
      event("lead_status_updated", id, { status });
      return json(res, 200, { ok: true, id, status });
    });
    return;
  }

  if (url.pathname === "/admin/clear" && req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    stmtDeleteAllLeads.run();
    event("admin_cleared", null, { by: "admin" });
    return json(res, 200, { ok: true, cleared: true });
  }

  // ----- Apply (Stripe pre-qual + durable save) -----
  if (url.pathname === "/apply" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      try {
        const data = new URLSearchParams(body);
        const email = (data.get("email") || "").trim();
        const source = (data.get("source") || "").trim(); // mlm|biab
        if (!email || !["mlm","biab"].includes(source)) return html(res, 400, page("Error", "<h1>Invalid submission</h1>"));

        const c = classify(source);

        // de-dupe by latest email+source (keeps it simple)
        const existing = stmtGetLeadByEmailSource.get(email, source);
        if (existing) {
          event("lead_duplicate_apply", existing.id, { email, source });
          return html(res, 200, page("Application Received", `
            <h1>Application Received</h1>
            <p>We already have your request for this path.</p>
            <div class="card">
              <p><strong>Recommended Path:</strong> ${existing.tier}</p>
              <p><strong>Status:</strong> ${existing.status}</p>
            </div>
          `));
        }

        let stripe_customer_id = null;
        if (stripe) {
          const customer = await stripe.customers.create({
            email,
            metadata: { source, tier: c.tier, version: VERSION }
          });
          stripe_customer_id = customer.id;
        }

        const id = uuid();
        stmtInsertLead.run({
          id,
          email,
          source,
          tier: c.tier,
          status: "new",
          stripe_customer_id,
          created_at: nowIso()
        });
        event("lead_created", id, { email, source, tier: c.tier, ...flagsForTier(c.tier) });

        return html(res, 200, page("Application Received", `
          <h1>Application Received</h1>
          <div class="card">
            <p><strong>Recommended Path:</strong> ${c.tier}</p>
            <p><strong>Pricing Model:</strong> ${c.pricing}</p>
            <p>${c.note}</p>
          </div>
          <p>Our team will review and follow up.</p>
        `));
      } catch (e) {
        console.error("[ifd] apply error:", e?.message || e);
        return html(res, 500, page("Error", "<h1>Something went wrong</h1>"));
      }
    });
    return;
  }

  // ----- Pages -----
  if (url.pathname === "/mlm" || url.pathname === "/biab") {
    const source = url.pathname.replace("/", "");
    return html(res, 200, page("Apply", `
      <h1>${source === "mlm" ? "Scale Your Existing Business" : "Start a Business"}</h1>
      <p>${source === "mlm"
        ? "Infrastructure, automation, and systems for established network marketing organizations."
        : "Structured guidance and systems to build a real business with an upgrade path."
      }</p>
      <form method="POST" action="/apply">
        <input type="hidden" name="source" value="${source}" />
        <input required type="email" name="email" placeholder="Your email" />
        <button>Apply</button>
      </form>
    `));
  }

  return html(res, 200, page("Iron Front Digital", `
    <h1>The Platform That Runs the Business Behind the Business</h1>
    <p>Iron Front Digital provides operational infrastructure for people building, scaling, or managing real businesses.</p>
    <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
      <a href="/scale" style="display:inline-block;padding:12px 24px;background:#ff7a18;color:#0b0b0d;text-decoration:none;border-radius:8px;font-weight:600;">Scale an Existing Business</a>
      <a href="/launch" style="display:inline-block;padding:12px 24px;background:transparent;color:#ff7a18;text-decoration:none;border:2px solid #ff7a18;border-radius:8px;font-weight:600;">Start a Business With Structure</a>
    </div>
    <div style="margin-top:48px;">
      <h2 style="font-size:28px;margin-bottom:16px;">What This Platform Is</h2>
      <p>Operational software and infrastructure designed to support long-term business operations.</p>
      <p>Systems, automation, and visibility tools that help businesses operate consistently without constant manual intervention.</p>
      <p>Built for organizations and individuals who intend to operate businesses over years, not experiment with short-term tactics.</p>
    </div>
    <div style="margin-top:48px;">
      <h2 style="font-size:28px;margin-bottom:16px;">Who This Is For</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-top:16px;">
        <div class="card">
          <h3 style="margin-top:0;font-size:18px;">Existing Business Operators</h3>
          <p style="font-size:14px;opacity:.9;">For people who already run businesses and need better operational structure, visibility, and automation.</p>
        </div>
        <div class="card">
          <h3 style="margin-top:0;font-size:18px;">Starting From Zero</h3>
          <p style="font-size:14px;opacity:.9;">For people starting a business from zero who want structure, systems, and guidance rather than guesswork.</p>
        </div>
        <div class="card">
          <h3 style="margin-top:0;font-size:18px;">Distributed Teams</h3>
          <p style="font-size:14px;opacity:.9;">For organizations managing distributed teams who need operational visibility and consistent execution across locations.</p>
        </div>
      </div>
    </div>
    <div style="margin-top:48px;">
      <h2 style="font-size:28px;margin-bottom:16px;">What This Is Not</h2>
      <ul style="list-style:none;padding:0;">
        <li style="margin:8px 0;">• Not an MLM</li>
        <li style="margin:8px 0;">• Not a business opportunity</li>
        <li style="margin:8px 0;">• No income guarantees</li>
        <li style="margin:8px 0;">• No recruiting promises</li>
      </ul>
    </div>
    <div style="margin-top:48px;">
      <h2 style="font-size:28px;margin-bottom:16px;">How It Works</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-top:16px;">
        <div class="card" style="text-align:center;">
          <div style="width:48px;height:48px;background:#ff7a18;color:#0b0b0d;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;margin:0 auto 12px;">1</div>
          <h3 style="margin-top:0;font-size:16px;">Choose a Path</h3>
          <p style="font-size:14px;opacity:.9;">Select Scale for existing businesses or Launch for starting from zero.</p>
        </div>
        <div class="card" style="text-align:center;">
          <div style="width:48px;height:48px;background:#ff7a18;color:#0b0b0d;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;margin:0 auto 12px;">2</div>
          <h3 style="margin-top:0;font-size:16px;">Apply for Access</h3>
          <p style="font-size:14px;opacity:.9;">Complete the application process to ensure alignment and appropriate platform use.</p>
        </div>
        <div class="card" style="text-align:center;">
          <div style="width:48px;height:48px;background:#ff7a18;color:#0b0b0d;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;margin:0 auto 12px;">3</div>
          <h3 style="margin-top:0;font-size:16px;">Operate Within the Platform</h3>
          <p style="font-size:14px;opacity:.9;">Use the operational tools, systems, and visibility features to run your business.</p>
        </div>
      </div>
    </div>
    <div style="margin-top:48px;text-align:center;">
      <h2 style="font-size:28px;margin-bottom:24px;">Built for People Who Intend to Operate, Not Experiment</h2>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <a href="/pricing" style="display:inline-block;padding:12px 24px;background:#ff7a18;color:#0b0b0d;text-decoration:none;border-radius:8px;font-weight:600;">View Pricing</a>
        <a href="/apply" style="display:inline-block;padding:12px 24px;background:transparent;color:#ff7a18;text-decoration:none;border:2px solid #ff7a18;border-radius:8px;font-weight:600;">Apply for Access</a>
      </div>
    </div>
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,.12);text-align:center;">
      <p style="font-size:13px;opacity:.6;">Iron Front Digital provides software and infrastructure. Outcomes depend on execution and external factors.</p>
    </div>
  `));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[ifd] live :${PORT} version=${VERSION} db=${DB_PATH}`);
});

function shutdown(signal) {
  console.log(`[ifd] ${signal} received, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
