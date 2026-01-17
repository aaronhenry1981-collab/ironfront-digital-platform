import http from "http";
import crypto from "crypto";
import fs from "fs";
import Stripe from "stripe";
import Database from "better-sqlite3";
import pg from "pg";
const { Pool } = pg;

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

// PostgreSQL connection for auth tables (shared with Next.js operator-ui)
const pgPool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
const OWNER_EMAIL = "aaronhenry1981@gmail.com";

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
    *{box-sizing:border-box}
    body{margin:0;background:#0b0b0d;color:#eaeaea;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
    .wrap{max-width:1280px;margin:0 auto;padding:0 24px}
    h1{font-size:44px;font-weight:500;margin:0 0 16px;color:#ffffff;line-height:1.2}
    h2{font-size:36px;font-weight:500;margin:0 0 32px;color:#ffffff;line-height:1.3;text-align:center}
    h3{font-size:20px;font-weight:500;margin:0 0 12px;color:#ffffff}
    p{font-size:16px;color:#d1d5db;line-height:1.75;margin:0 0 16px}
    .section{padding:80px 0;text-align:center}
    .section-alt{background:rgba(255,255,255,0.02);padding:80px 0;text-align:center}
    .hero{text-align:center;padding:96px 0;max-width:896px;margin:0 auto}
    .hero h1{font-size:48px;margin-bottom:24px;color:#ffffff}
    .hero p{font-size:20px;color:#d1d5db;margin-bottom:40px;max-width:640px;margin-left:auto;margin-right:auto}
    .btn{display:inline-block;padding:16px 32px;border-radius:8px;text-decoration:none;font-size:18px;font-weight:600;transition:all 0.2s;border:none;cursor:pointer;box-shadow:0 4px 6px rgba(0,0,0,0.1)}
    .btn-primary{background:#ff7a18;color:#0b0b0d}
    .btn-primary:hover{background:#ff8a2e;transform:translateY(-2px);box-shadow:0 6px 12px rgba(255,122,24,0.3)}
    .btn-secondary{background:transparent;color:#ff7a18;border:2px solid #ff7a18}
    .btn-secondary:hover{background:rgba(255,122,24,0.15);border-color:#ff8a2e;color:#ff8a2e;transform:translateY(-2px);box-shadow:0 6px 12px rgba(255,122,24,0.2)}
    .btn-group{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:32px}
    .card-link{display:block;text-decoration:none;transition:all 0.2s}
    .card-link:hover{transform:translateY(-4px);box-shadow:0 8px 16px rgba(0,0,0,0.2);border-color:rgba(255,122,24,0.3)}
    .card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:32px;text-align:left}
    .card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-top:48px;max-width:1200px;margin-left:auto;margin-right:auto}
    .card-center{text-align:center}
    .step-number{width:56px;height:56px;background:#ff7a18;color:#0b0b0d;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;margin:0 auto 20px}
    input{padding:14px 18px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);width:100%;max-width:440px;font-size:16px;font-family:inherit;background:rgba(255,255,255,0.05);color:#eaeaea}
    input::placeholder{color:rgba(255,255,255,0.5)}
    input:focus{outline:none;border-color:#ff7a18;box-shadow:0 0 0 3px rgba(255,122,24,0.2)}
    button{padding:14px 28px;border-radius:8px;border:none;background:#ff7a18;color:#0b0b0d;font-weight:600;font-size:16px;cursor:pointer;transition:all 0.2s;width:100%;max-width:440px;box-shadow:0 4px 6px rgba(0,0,0,0.1)}
    button:hover{background:#ff8a2e;transform:translateY(-2px);box-shadow:0 6px 12px rgba(255,122,24,0.3)}
    ul{list-style:none;padding:0;margin:0;max-width:640px;margin-left:auto;margin-right:auto;text-align:left}
    li{display:flex;align-items:start;margin:16px 0;color:#d1d5db;line-height:1.75;font-size:16px}
    li:before{content:"•";color:#ff7a18;margin-right:16px;font-size:24px;line-height:1;font-weight:bold}
    .footer-note{padding:48px 0;border-top:1px solid rgba(255,255,255,0.12);text-align:center;margin-top:64px}
    .footer-note p{font-size:14px;color:rgba(255,255,255,0.6);margin:0;max-width:640px;margin-left:auto;margin-right:auto}
    .small{font-size:12px;color:rgba(255,255,255,0.4);text-align:center;margin-top:64px;padding-top:32px;border-top:1px solid rgba(255,255,255,0.08)}
    a{color:#ffb26b;text-decoration:none;transition:color 0.2s}
    a:hover{color:#ff7a18;text-decoration:none}
    .card h3{color:#ffffff;cursor:default}
    .card p{color:#d1d5db}
    .content-center{max-width:768px;margin:0 auto;text-align:left}
    @media (max-width:640px){
      .hero h1{font-size:36px}
      .hero p{font-size:18px}
      .section,.section-alt{padding:48px 0}
      .btn-group{flex-direction:column;width:100%}
      .btn{width:100%;max-width:100%}
      h1{font-size:32px}
      h2{font-size:28px}
      .card-grid{grid-template-columns:1fr}
    }
  </style>
  </head><body><div class="wrap">${body}<div class="small">Iron Front Digital • v${VERSION}</div></div></body></html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");

  // Owner login page - serves login form for magic link authentication
  if (url.pathname === "/login") {
    const OWNER_EMAIL = "aaronhenry1981@gmail.com";
    return html(res, 200, page("Owner Login", `
      <div style="min-height:calc(100vh - 120px);display:flex;align-items:center;justify-content:center;padding:20px;background:#111827;">
        <div style="width:100%;max-width:400px;background:#1f2937;border-radius:8px;padding:32px;box-shadow:0 4px 6px rgba(0,0,0,0.3);">
          ${process.env.NODE_ENV === 'development' ? '<div style="position:fixed;top:0;left:0;right:0;background:#fef3c7;border-bottom:1px solid #f59e0b;color:#92400e;font-size:12px;padding:4px 16px;text-align:center;">Login UI mounted</div>' : ''}
          <h1 style="font-size:24px;font-weight:600;color:#fff;margin-bottom:24px;text-align:center;">Owner Login</h1>
          <form id="loginForm" style="display:flex;flex-direction:column;gap:16px;">
            <div>
              <label for="email" style="display:block;font-size:14px;font-weight:500;color:#d1d5db;margin-bottom:4px;">Email</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                required 
                placeholder="Enter owner email"
                style="width:100%;padding:8px 12px;background:#374151;border:1px solid #4b5563;border-radius:4px;color:#fff;font-size:14px;outline:none;box-sizing:border-box;"
                onfocus="this.style.borderColor='#ea580c';"
                onblur="this.style.borderColor='#4b5563';"
              />
            </div>
            <button 
              type="submit" 
              id="submitBtn"
              style="width:100%;padding:10px;background:#ea580c;color:#fff;border:none;border-radius:4px;font-weight:500;font-size:14px;cursor:pointer;transition:background 0.2s;"
              onmouseover="this.style.background='#c2410c';"
              onmouseout="this.style.background='#ea580c';"
            >
              Send secure login link
            </button>
          </form>
          <div id="statusText" style="margin-top:16px;font-size:14px;text-align:center;min-height:20px;"></div>
        </div>
      </div>
      <script>
        (function() {
          const form = document.getElementById('loginForm');
          const statusText = document.getElementById('statusText');
          const submitBtn = document.getElementById('submitBtn');
          const OWNER_EMAIL = "${OWNER_EMAIL}";
          
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            statusText.textContent = '';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            
            try {
              const response = await fetch('/api/auth/request-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                if (response.status === 403) {
                  statusText.textContent = 'Access restricted.';
                  statusText.style.color = '#ef4444';
                } else {
                  statusText.textContent = data.error || 'Failed to send login link.';
                  statusText.style.color = '#ef4444';
                }
              } else {
                statusText.textContent = 'Check your email for a secure login link';
                statusText.style.color = '#10b981';
                form.reset();
              }
            } catch (error) {
              statusText.textContent = 'Failed to send login link. Please try again.';
              statusText.style.color = '#ef4444';
            } finally {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Send secure login link';
            }
          });
        })();
      </script>
    `));
  }

  // Auth API routes - POST /api/auth/request-link
  if (url.pathname === "/api/auth/request-link" && req.method === "POST") {
    if (!pgPool) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Database not configured" }));
    }

    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const email = (data.email || "").toLowerCase().trim();

        if (!email) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Email is required" }));
        }

        // Hard requirement: Only owner email can request a link
        if (email !== OWNER_EMAIL) {
          res.writeHead(403, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Access restricted." }));
        }

        // Get or create owner user
        let userResult = await pgPool.query(
          "SELECT id, email, role FROM users WHERE email = $1",
          [email]
        );
        let userId;
        if (userResult.rows.length === 0) {
          const newUser = await pgPool.query(
            "INSERT INTO users (id, email, role, created_at) VALUES (gen_random_uuid(), $1, $2, NOW()) RETURNING id",
            [email, "owner"]
          );
          userId = newUser.rows[0].id;
        } else {
          userId = userResult.rows[0].id;
          if (userResult.rows[0].role !== "owner") {
            await pgPool.query("UPDATE users SET role = $1 WHERE id = $2", ["owner", userId]);
          }
        }

        // Invalidate previous unused links
        await pgPool.query(
          "UPDATE magic_links SET used_at = NOW() WHERE email = $1 AND used_at IS NULL AND expires_at > NOW()",
          [email]
        );

        // Generate token and hash
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        // Create magic link (15 minute expiry)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await pgPool.query(
          "INSERT INTO magic_links (id, email, token_hash, expires_at, created_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW())",
          [email, tokenHash, expiresAt.toISOString()]
        );

        // Log auth request (non-blocking) - use events table if it exists
        pgPool.query(
          "INSERT INTO events (id, org_id, actor_user_id, actor_role, event_type, target_type, metadata, created_at) VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, NOW())",
          ["00000000-0000-0000-0000-000000000002", userId, "owner", "auth_request", "magic_link", JSON.stringify({ email })]
        ).catch(() => {});

        // For now, log magic link to console (TODO: send email)
        const verifyUrl = `${req.headers.host ? `https://${req.headers.host}` : "http://localhost:3000"}/api/auth/verify-link?token=${token}`;
        console.log("=".repeat(80));
        console.log("MAGIC LINK EMAIL (v1 - console only)");
        console.log("=".repeat(80));
        console.log(`To: ${email}`);
        console.log(`Subject: Your Iron Front Digital Login Link`);
        console.log(`Click this link to log in: ${verifyUrl}`);
        console.log(`This link expires in 15 minutes.`);
        console.log("=".repeat(80));

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message: "Magic link sent" }));
      } catch (error) {
        console.error("Error in request-link:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    });
    return;
  }

  // Auth API routes - GET /api/auth/verify-link
  if (url.pathname === "/api/auth/verify-link" && req.method === "GET") {
    if (!pgPool) {
      return res.writeHead(302, { Location: "/login?error=database_not_configured" }).end();
    }

    const token = url.searchParams.get("token");
    if (!token) {
      return res.writeHead(302, { Location: "/login?error=invalid_link" }).end();
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    try {
      // Find valid magic link
      const linkResult = await pgPool.query(
        `SELECT ml.*, u.id as user_id, u.role as user_role 
         FROM magic_links ml 
         LEFT JOIN users u ON u.email = ml.email 
         WHERE ml.token_hash = $1 AND ml.used_at IS NULL AND ml.expires_at > NOW()`,
        [tokenHash]
      );

      if (linkResult.rows.length === 0 || linkResult.rows[0].email !== OWNER_EMAIL || linkResult.rows[0].user_role !== "owner") {
        return res.writeHead(302, { Location: "/login?error=invalid_or_expired_link" }).end();
      }

      const magicLink = linkResult.rows[0];

      // Mark magic link as used
      await pgPool.query("UPDATE magic_links SET used_at = NOW() WHERE id = $1", [magicLink.id]);

      // Create session (7 day expiry)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const sessionResult = await pgPool.query(
        "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (gen_random_uuid(), $1, $2, NOW()) RETURNING id",
        [magicLink.user_id, expiresAt.toISOString()]
      );
      const sessionId = sessionResult.rows[0].id;

      // Log auth verify (non-blocking) - use events table if it exists
      pgPool.query(
        "INSERT INTO events (id, org_id, actor_user_id, actor_role, event_type, target_type, metadata, created_at) VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, NOW())",
        ["00000000-0000-0000-0000-000000000002", magicLink.user_id, "owner", "auth_verify", "magic_link", JSON.stringify({ email: magicLink.email, sessionId })]
      ).catch(() => {});

      // Set session cookie and redirect to console
      const cookieOptions = [
        `ifd_session=${sessionId}`,
        "HttpOnly",
        "SameSite=Lax",
        `Path=/`,
        `Expires=${expiresAt.toUTCString()}`,
      ];
      if (process.env.NODE_ENV === "production") {
        cookieOptions.push("Secure");
      }

      res.writeHead(302, {
        "Set-Cookie": cookieOptions.join("; "),
        "Location": "/console/owner",
      });
      res.end();
    } catch (error) {
      console.error("Error in verify-link:", error);
      res.writeHead(302, { Location: "/login?error=verification_failed" }).end();
    }
    return;
  }

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
          <div class="hero">
            <h1>Application Received</h1>
            <div class="card" style="max-width:640px;margin:32px auto;">
              <p><strong>Recommended Path:</strong> ${c.tier}</p>
              <p><strong>Pricing Model:</strong> ${c.pricing}</p>
              <p>${c.note}</p>
            </div>
            <p>Our team will review and follow up.</p>
          </div>
        `));
      } catch (e) {
        console.error("[ifd] apply error:", e?.message || e);
        return html(res, 500, page("Error", "<h1>Something went wrong</h1>"));
      }
    });
    return;
  }

  // ----- Pages -----
  // Map /scale to /mlm and /launch to /biab for consistency
  if (url.pathname === "/scale") {
    url.pathname = "/mlm";
  }
  if (url.pathname === "/launch") {
    url.pathname = "/biab";
  }
  
  if (url.pathname === "/pricing") {
    return html(res, 200, page("Pricing", `
      <div class="hero">
        <h1>Choose Your Path</h1>
        <p>Select the pricing structure that matches where you are in your business journey.</p>
      </div>
      
      <div class="section-alt">
        <div class="card-grid" style="grid-template-columns:repeat(auto-fit,minmax(400px,1fr));max-width:1000px;">
          <a href="/pricing/launch" class="card card-link">
            <h3>LaunchPath™</h3>
            <p style="color:#d1d5db;margin:16px 0 24px;">For individuals starting a business from zero</p>
            <p style="color:#ffb26b;font-size:14px;margin-top:24px;">View LaunchPath™ Pricing →</p>
          </a>
          <a href="/pricing/scale" class="card card-link">
            <h3>Scale</h3>
            <p style="color:#d1d5db;margin:16px 0 24px;">For existing businesses and leaders</p>
            <p style="color:#ffb26b;font-size:14px;margin-top:24px;">View Scale Pricing →</p>
          </a>
        </div>
      </div>
    `));
  }
  
  if (url.pathname === "/pricing/launch") {
    return html(res, 200, page("LaunchPath™ Pricing", `
      <div class="hero">
        <h1>LaunchPath™ Pricing</h1>
        <p>For individuals starting a business from zero. Choose the level of access and support that matches your commitment.</p>
      </div>
      
      <div class="section-alt">
        <div class="card-grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));max-width:1200px;">
          <div class="card">
            <h3>Individual Operator</h3>
            <div style="margin:24px 0;">
              <span style="font-size:48px;font-weight:600;color:#ffffff;">$99</span>
              <span style="color:#d1d5db;margin-left:8px;">/ month</span>
            </div>
            <div style="margin-bottom:32px;">
              <span style="font-size:36px;font-weight:600;color:#ffffff;">$999</span>
              <span style="color:#d1d5db;margin-left:8px;">/ year</span>
              <span style="color:#ff7a18;font-size:14px;margin-left:8px;">(Save $189)</span>
            </div>
            <p style="color:#ffffff;font-weight:500;margin-bottom:16px;">What You Get:</p>
            <ul style="text-align:left;margin:0 0 24px 0;padding:0;">
              <li style="font-size:14px;">Foundational access to the operating platform</li>
              <li style="font-size:14px;">Core systems and workflows</li>
              <li style="font-size:14px;">Basic operational visibility</li>
              <li style="font-size:14px;">Essential automation tools</li>
              <li style="font-size:14px;">Email support</li>
            </ul>
            <p style="color:#d1d5db;margin-bottom:24px;font-size:14px;">Perfect for someone just starting out who wants structure without overwhelming complexity.</p>
            <a href="/launch" class="btn btn-primary" style="width:100%;text-align:center;">Get Started</a>
          </div>
          
          <div class="card" style="border-color:rgba(255,122,24,0.6);border-width:2px;">
            <div style="background:#ff7a18;color:#0b0b0d;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:600;display:inline-block;margin-bottom:16px;">MOST POPULAR</div>
            <h3>Builder</h3>
            <div style="margin:24px 0;">
              <span style="font-size:48px;font-weight:600;color:#ffffff;">$299</span>
              <span style="color:#d1d5db;margin-left:8px;">/ month</span>
            </div>
            <div style="margin-bottom:32px;">
              <span style="font-size:36px;font-weight:600;color:#ffffff;">$2,999</span>
              <span style="color:#d1d5db;margin-left:8px;">/ year</span>
              <span style="color:#ff7a18;font-size:14px;margin-left:8px;">(Save $589)</span>
            </div>
            <p style="color:#ffffff;font-weight:500;margin-bottom:16px;">What You Get:</p>
            <ul style="text-align:left;margin:0 0 24px 0;padding:0;">
              <li style="font-size:14px;">Everything in Individual Operator</li>
              <li style="font-size:14px;">Expanded automation and system tools</li>
              <li style="font-size:14px;">Advanced operational visibility</li>
              <li style="font-size:14px;">Structured support and guidance</li>
              <li style="font-size:14px;">Priority email support</li>
              <li style="font-size:14px;">Access to business-building workflows</li>
            </ul>
            <p style="color:#d1d5db;margin-bottom:24px;font-size:14px;">Ideal for someone actively building a business who needs more tools and structured support.</p>
            <a href="/launch" class="btn btn-primary" style="width:100%;text-align:center;">Get Started</a>
          </div>
          
          <div class="card">
            <h3>Advanced Operator</h3>
            <div style="margin:24px 0;">
              <span style="font-size:48px;font-weight:600;color:#ffffff;">$999</span>
              <span style="color:#d1d5db;margin-left:8px;">/ month</span>
            </div>
            <div style="margin-bottom:32px;">
              <span style="font-size:36px;font-weight:600;color:#ffffff;">$9,999</span>
              <span style="color:#d1d5db;margin-left:8px;">/ year</span>
              <span style="color:#ff7a18;font-size:14px;margin-left:8px;">(Save $1,989)</span>
            </div>
            <p style="color:#ffffff;font-weight:500;margin-bottom:16px;">What You Get:</p>
            <ul style="text-align:left;margin:0 0 24px 0;padding:0;">
              <li style="font-size:14px;">Everything in Builder</li>
              <li style="font-size:14px;">Full platform access</li>
              <li style="font-size:14px;">All automation and system tools</li>
              <li style="font-size:14px;">Complete operational visibility</li>
              <li style="font-size:14px;">High-volume capacity</li>
              <li style="font-size:14px;">Priority support with faster response</li>
              <li style="font-size:14px;">Advanced workflows and integrations</li>
            </ul>
            <p style="color:#d1d5db;margin-bottom:24px;font-size:14px;">For serious operators managing high volume who need everything the platform offers.</p>
            <a href="/launch" class="btn btn-primary" style="width:100%;text-align:center;">Get Started</a>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="content-center">
          <h2 style="margin-bottom:24px;">Why Choose LaunchPath™?</h2>
          <p style="margin-bottom:16px;">LaunchPath™ is designed for individuals who are starting from zero and want a structured, guided path to building a real business.</p>
          <p style="margin-bottom:16px;">Unlike trying to figure it out alone, LaunchPath™ gives you:</p>
          <ul style="text-align:left;max-width:640px;margin:24px auto;">
            <li>Proven systems and workflows that work</li>
            <li>Operational infrastructure from day one</li>
            <li>Clear structure instead of guesswork</li>
            <li>Scalable foundation that grows with you</li>
            <li>Support when you need it</li>
          </ul>
          <p style="margin-top:32px;color:#ffb26b;">All plans include access to the same core platform. Higher tiers unlock more tools, capacity, and support.</p>
        </div>
      </div>
      
      <div class="section-alt">
        <div class="content-center">
          <p style="font-size:14px;color:rgba(255,255,255,0.6);text-align:center;max-width:640px;margin:0 auto;">
            Pricing reflects platform access only. No earnings or outcomes are guaranteed. Annual plans billed upfront and save you money.
          </p>
        </div>
      </div>
    `));
  }
  
  if (url.pathname === "/pricing/scale") {
    return html(res, 200, page("Scale Pricing", `
      <div class="hero">
        <h1>Scale Pricing</h1>
        <p>For existing businesses and leaders who need operational infrastructure, visibility, and team-level support.</p>
      </div>
      
      <div class="section-alt">
        <div class="card-grid" style="grid-template-columns:repeat(auto-fit,minmax(400px,1fr));max-width:1000px;">
          <div class="card">
            <h3>Organization / Leader</h3>
            <div style="margin:24px 0;">
              <span style="font-size:48px;font-weight:600;color:#ffffff;">$599</span>
              <span style="color:#d1d5db;margin-left:8px;">/ month</span>
            </div>
            <div style="margin-bottom:32px;">
              <span style="font-size:36px;font-weight:600;color:#ffffff;">$5,999</span>
              <span style="color:#d1d5db;margin-left:8px;">/ year</span>
              <span style="color:#ff7a18;font-size:14px;margin-left:8px;">(Save $1,189)</span>
            </div>
            <p style="color:#ffffff;font-weight:500;margin-bottom:16px;">What You Get:</p>
            <ul style="text-align:left;margin:0 0 24px 0;padding:0;">
              <li style="font-size:14px;">Organization-level platform access</li>
              <li style="font-size:14px;">Team-level operational visibility</li>
              <li style="font-size:14px;">Governance and oversight tools</li>
              <li style="font-size:14px;">System support for distributed teams</li>
              <li style="font-size:14px;">Multi-user access and permissions</li>
              <li style="font-size:14px;">Priority support</li>
              <li style="font-size:14px;">Advanced reporting and analytics</li>
            </ul>
            <p style="color:#d1d5db;margin-bottom:24px;font-size:14px;">Perfect for established businesses and leaders who need operational structure, team visibility, and consistent execution across their organization.</p>
            <a href="/apply" class="btn btn-secondary" style="width:100%;text-align:center;">Apply for Access</a>
          </div>
          
          <div class="card">
            <h3>Franchise License</h3>
            <div style="margin:24px 0;">
              <span style="font-size:48px;font-weight:600;color:#ffffff;">$10,000</span>
            </div>
            <div style="margin-bottom:32px;">
              <span style="color:#d1d5db;font-size:16px;">One-time payment</span>
              <div style="color:#ff7a18;font-size:14px;margin-top:8px;">3-year license included</div>
            </div>
            <p style="color:#ffffff;font-weight:500;margin-bottom:16px;">What You Get:</p>
            <ul style="text-align:left;margin:0 0 24px 0;padding:0;">
              <li style="font-size:14px;">Licensed deployment of the platform</li>
              <li style="font-size:14px;">Approved branding and customization</li>
              <li style="font-size:14px;">Full platform access for 3 years</li>
              <li style="font-size:14px;">White-label options</li>
              <li style="font-size:14px;">Dedicated support and onboarding</li>
              <li style="font-size:14px;">Custom integration support</li>
              <li style="font-size:14px;">Franchise partner benefits</li>
            </ul>
            <p style="color:#d1d5db;margin-bottom:24px;font-size:14px;">For organizations that want to deploy the Iron Front Digital platform under their own branding with full licensing rights.</p>
            <a href="/apply" class="btn btn-secondary" style="width:100%;text-align:center;">Request Franchise Access</a>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="content-center">
          <h2 style="margin-bottom:24px;">Why Choose Scale?</h2>
          <p style="margin-bottom:16px;">Scale is designed for existing businesses and leaders who already operate but need better structure, visibility, and team-level support.</p>
          <p style="margin-bottom:16px;">Scale gives you:</p>
          <ul style="text-align:left;max-width:640px;margin:24px auto;">
            <li>Operational infrastructure without rebuilding</li>
            <li>Team-level visibility and governance</li>
            <li>Consistent execution across locations</li>
            <li>System support for distributed operations</li>
            <li>Multi-user access and permissions</li>
            <li>Advanced reporting and oversight</li>
          </ul>
          <p style="margin-top:32px;color:#ffb26b;">Scale plans require application to ensure alignment and appropriate platform use for organizational needs.</p>
        </div>
      </div>
      
      <div class="section-alt">
        <div class="content-center">
          <p style="font-size:14px;color:rgba(255,255,255,0.6);text-align:center;max-width:640px;margin:0 auto;">
            Pricing reflects platform access only. No earnings or outcomes are guaranteed. Annual plans billed upfront and save you money.
          </p>
        </div>
      </div>
    `));
  }
  
  if (url.pathname === "/apply") {
    return html(res, 200, page("Apply", `
      <div class="hero">
        <h1>Apply for Access</h1>
        <p style="max-width:640px;margin:0 auto 32px;">Select your path to get started.</p>
        <div class="card-grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));max-width:800px;">
          <a href="/scale" class="card card-link">
            <h3>Scale an Existing Business</h3>
            <p>For established businesses and organizations.</p>
          </a>
          <a href="/launch" class="card card-link">
            <h3>Start a Business</h3>
            <p>For individuals starting from zero.</p>
          </a>
        </div>
      </div>
    `));
  }
  
  if (url.pathname === "/mlm" || url.pathname === "/biab") {
    const source = url.pathname.replace("/", "");
    return html(res, 200, page("Apply", `
      <div class="hero">
        <h1>${source === "mlm" ? "Scale Your Existing Business" : "Start a Business"}</h1>
        <p style="max-width:640px;margin:0 auto 32px;">${source === "mlm"
          ? "Infrastructure, automation, and systems for established network marketing organizations."
          : "Structured guidance and systems to build a real business with an upgrade path."
        }</p>
        <form method="POST" action="/apply" style="max-width:440px;margin:0 auto;">
          <input type="hidden" name="source" value="${source}" />
          <input required type="email" name="email" placeholder="Your email" style="margin-bottom:16px;" />
          <button type="submit" style="width:100%;">Apply Now</button>
        </form>
        <div style="margin-top:24px;">
          <a href="/" style="color:#ffb26b;font-size:14px;">← Back to Home</a>
        </div>
      </div>
    `));
  }

  return html(res, 200, page("Iron Front Digital", `
    <div class="hero">
      <h1>The Platform That Runs the Business Behind the Business</h1>
      <p>Iron Front Digital provides operational infrastructure for people building, scaling, or managing real businesses.</p>
      <div class="btn-group">
        <a href="/scale" class="btn btn-primary">Scale an Existing Business</a>
        <a href="/launch" class="btn btn-secondary">Start a Business With Structure</a>
      </div>
    </div>
    
    <div class="section-alt">
      <h2>What This Platform Is</h2>
      <div class="content-center">
        <p>Operational software and infrastructure designed to support long-term business operations.</p>
        <p>Systems, automation, and visibility tools that help businesses operate consistently without constant manual intervention.</p>
        <p>Built for organizations and individuals who intend to operate businesses over years, not experiment with short-term tactics.</p>
      </div>
    </div>
    
    <div class="section">
      <h2>Who This Is For</h2>
      <div class="card-grid">
        <a href="/scale" class="card card-link">
          <h3>Existing Business Operators</h3>
          <p>For people who already run businesses and need better operational structure, visibility, and automation.</p>
        </a>
        <a href="/launch" class="card card-link">
          <h3>Starting From Zero</h3>
          <p>For people starting a business from zero who want structure, systems, and guidance rather than guesswork.</p>
        </a>
        <a href="/scale" class="card card-link">
          <h3>Distributed Teams</h3>
          <p>For organizations managing distributed teams who need operational visibility and consistent execution across locations.</p>
        </a>
      </div>
    </div>
    
    <div class="section-alt">
      <h2>What This Is Not</h2>
      <ul>
        <li>Not an MLM</li>
        <li>Not a business opportunity</li>
        <li>No income guarantees</li>
        <li>No recruiting promises</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>How It Works</h2>
      <div class="card-grid">
        <div class="card card-center">
          <div class="step-number">1</div>
          <h3>Choose a Path</h3>
          <p>Select Scale for existing businesses or Launch for starting from zero.</p>
          <div style="margin-top:20px;">
            <a href="/scale" class="btn btn-primary" style="font-size:14px;padding:10px 20px;">Scale</a>
            <a href="/launch" class="btn btn-secondary" style="font-size:14px;padding:10px 20px;margin-left:8px;">Launch</a>
          </div>
        </div>
        <a href="/apply" class="card card-link card-center">
          <div class="step-number">2</div>
          <h3>Apply for Access</h3>
          <p>Complete the application process to ensure alignment and appropriate platform use.</p>
        </a>
        <div class="card card-center">
          <div class="step-number">3</div>
          <h3>Operate Within the Platform</h3>
          <p>Use the operational tools, systems, and visibility features to run your business.</p>
        </div>
      </div>
    </div>
    
    <div class="section-alt">
      <h2>Built for People Who Intend to Operate, Not Experiment</h2>
      <div class="btn-group">
        <a href="/pricing" class="btn btn-primary">View Pricing</a>
        <a href="/apply" class="btn btn-secondary">Apply for Access</a>
      </div>
      <div style="margin-top:32px;display:flex;gap:24px;justify-content:center;flex-wrap:wrap;">
        <a href="/pricing/launch" style="color:#ffb26b;font-size:14px;">LaunchPath™ Pricing →</a>
        <a href="/pricing/scale" style="color:#ffb26b;font-size:14px;">Scale Pricing →</a>
      </div>
    </div>
    
    <div class="footer-note">
      <p>Iron Front Digital provides software and infrastructure. Outcomes depend on execution and external factors.</p>
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
