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
let pgPool = null;
const OWNER_EMAIL = "aaronhenry1981@gmail.com";

if (process.env.DATABASE_URL) {
  try {
    // Only create pool if DATABASE_URL is PostgreSQL (not MySQL)
    if (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://')) {
      pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
      // Test connection (non-blocking)
      pgPool.query('SELECT 1').catch((err) => {
        console.error('[ifd] PostgreSQL connection failed:', err.message);
      });
    } else {
      console.warn('[ifd] DATABASE_URL is not PostgreSQL (must be postgres:// or postgresql://). Auth will not work.');
    }
  } catch (err) {
    console.error('[ifd] Failed to initialize PostgreSQL pool:', err.message);
  }
} else {
  console.warn('[ifd] DATABASE_URL not set. Auth API routes will not work.');
}

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
    .eyebrow{display:inline-block;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#ffb26b;margin-bottom:16px}
    h1{font-size:48px;font-weight:600;margin:0 0 20px;color:#ffffff;line-height:1.15;letter-spacing:-0.02em}
    h2{font-size:36px;font-weight:600;margin:0 0 24px;color:#ffffff;line-height:1.2;letter-spacing:-0.015em}
    h3{font-size:20px;font-weight:600;margin:0 0 12px;color:#ffffff;letter-spacing:-0.01em}
    p{font-size:16px;color:#d1d5db;line-height:1.7;margin:0 0 16px}
    .lead{font-size:19px;color:#e5e7eb;line-height:1.65;margin:0 0 16px;max-width:680px}
    .section{padding:96px 0}
    .section-alt{background:rgba(255,255,255,0.02);padding:96px 0}
    .section h2,.section-alt h2{text-align:center}
    .hero{text-align:center;padding:120px 0 96px;max-width:840px;margin:0 auto}
    .hero h1{font-size:56px;margin-bottom:24px}
    .hero .lead{font-size:20px;color:#d1d5db;margin:0 auto 40px;max-width:640px}
    .btn{display:inline-block;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;transition:all 0.18s ease;border:none;cursor:pointer;line-height:1.2}
    .btn-primary{background:#ff7a18;color:#0b0b0d}
    .btn-primary:hover{background:#ff8a2e;transform:translateY(-1px);box-shadow:0 8px 20px rgba(255,122,24,0.25)}
    .btn-secondary{background:transparent;color:#ff7a18;border:1.5px solid #ff7a18}
    .btn-secondary:hover{background:rgba(255,122,24,0.10);transform:translateY(-1px)}
    .btn-ghost{background:transparent;color:#d1d5db;border:1px solid rgba(255,255,255,0.18)}
    .btn-ghost:hover{border-color:rgba(255,255,255,0.4);color:#ffffff}
    .btn-group{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:32px}
    .card-link{display:block;text-decoration:none;transition:all 0.18s ease}
    .card-link:hover{transform:translateY(-2px);border-color:rgba(255,122,24,0.4)}
    .card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.10);border-radius:12px;padding:32px;text-align:left}
    .card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:48px;max-width:1200px;margin-left:auto;margin-right:auto}
    .card-grid-2{grid-template-columns:repeat(auto-fit,minmax(380px,1fr));max-width:920px}
    .card-center{text-align:center}
    .card .feature-tag{display:inline-block;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#0b0b0d;background:#ff7a18;padding:4px 10px;border-radius:4px;margin-bottom:12px}
    .step-number{width:44px;height:44px;background:rgba(255,122,24,0.15);color:#ff7a18;border:1px solid rgba(255,122,24,0.4);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;margin:0 auto 20px}
    input,select,textarea{padding:14px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);width:100%;max-width:440px;font-size:16px;font-family:inherit;background:rgba(255,255,255,0.04);color:#eaeaea}
    input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.45)}
    input:focus,select:focus,textarea:focus{outline:none;border-color:#ff7a18;box-shadow:0 0 0 3px rgba(255,122,24,0.15)}
    button{padding:14px 28px;border-radius:8px;border:none;background:#ff7a18;color:#0b0b0d;font-weight:600;font-size:16px;cursor:pointer;transition:all 0.18s ease;width:100%;max-width:440px}
    button:hover{background:#ff8a2e;transform:translateY(-1px);box-shadow:0 8px 20px rgba(255,122,24,0.25)}
    ul.feature-list{list-style:none;padding:0;margin:0}
    ul.feature-list li{display:flex;align-items:flex-start;margin:14px 0;color:#d1d5db;line-height:1.6;font-size:15px;padding-left:0}
    ul.feature-list li:before{content:"✓";color:#ff7a18;margin-right:12px;font-size:14px;font-weight:700;flex-shrink:0;margin-top:3px}
    ul.plain{list-style:none;padding:0;margin:24px auto;max-width:640px;text-align:left}
    ul.plain li{display:flex;align-items:flex-start;margin:12px 0;color:#d1d5db;line-height:1.65;font-size:15px}
    ul.plain li:before{content:"•";color:#ff7a18;margin-right:14px;font-size:20px;line-height:1;flex-shrink:0}
    .price{display:flex;align-items:baseline;gap:6px;margin:20px 0}
    .price-amount{font-size:44px;font-weight:600;color:#ffffff;letter-spacing:-0.02em}
    .price-period{color:#9ca3af;font-size:14px}
    .price-annual{color:#9ca3af;font-size:13px;margin-bottom:24px}
    .price-annual strong{color:#e5e7eb;font-weight:600}
    .price-annual .save{color:#ff7a18;margin-left:6px}
    .footer-note{padding:48px 0;border-top:1px solid rgba(255,255,255,0.08);text-align:center;margin-top:64px}
    .footer-note p{font-size:13px;color:rgba(255,255,255,0.5);margin:0;max-width:640px;margin-left:auto;margin-right:auto}
    .small{font-size:12px;color:rgba(255,255,255,0.35);text-align:center;margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06)}
    a{color:#ffb26b;text-decoration:none;transition:color 0.15s ease}
    a:hover{color:#ff7a18}
    .card h3,.card h3:hover{color:#ffffff;cursor:default}
    .card p{color:#d1d5db}
    .content-center{max-width:760px;margin:0 auto;text-align:left}
    .text-muted{color:#9ca3af}
    .pill{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);padding:6px 12px;border-radius:999px;font-size:12px;color:#d1d5db;margin:4px}
    @media (max-width:640px){
      h1,.hero h1{font-size:36px}
      .hero p,.hero .lead{font-size:17px}
      .section,.section-alt{padding:64px 0}
      .hero{padding:80px 0 64px}
      .btn-group{flex-direction:column;width:100%}
      .btn-group .btn{width:100%}
      h2{font-size:28px}
      .card-grid{grid-template-columns:1fr;gap:16px}
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
      console.error('[ifd] Auth API called but PostgreSQL not configured. DATABASE_URL:', process.env.DATABASE_URL ? 'set (check format)' : 'not set');
      res.writeHead(503, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ 
        error: "Authentication service unavailable. Database connection not configured. Please set DATABASE_URL to a PostgreSQL connection string."
      }));
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

    (async () => {
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
          res.writeHead(302, { Location: "/login?error=invalid_or_expired_link" });
          return res.end();
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
        // Cookie name must match operator-ui (src/lib/auth.ts) so both apps share session state
        const cookieOptions = [
          `session_id=${sessionId}`,
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
        res.writeHead(302, { Location: "/login?error=verification_failed" });
        res.end();
      }
    })();
    return;
  }

  // Auth API routes - POST /api/auth/logout
  // Mirrors operator-ui/src/app/api/auth/logout/route.ts so logout works
  // regardless of which app served the request.
  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    const cookieHeader = req.headers.cookie || "";
    const match = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/);
    const sessionId = match ? match[1] : null;

    (async () => {
      if (sessionId && pgPool) {
        try {
          await pgPool.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
        } catch (e) {
          console.error("Error deleting session on logout:", e?.message || e);
        }
      }

      // Clear cookie regardless of DB outcome so the client is logged out.
      const expired = "Thu, 01 Jan 1970 00:00:00 GMT";
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `session_id=; HttpOnly; SameSite=Lax; Path=/; Expires=${expired}`,
      });
      res.end(JSON.stringify({ success: true }));
    })();
    return;
  }

  // Health check with database status
  if (url.pathname === "/health") {
    const health = {
      ok: true,
      version: VERSION,
      database: {
        sqlite: "ok", // SQLite always works (for leads/events)
        postgres: pgPool ? "configured" : "not_configured",
        auth_enabled: !!pgPool,
      },
    };
    // If DATABASE_URL is set but pgPool is null, check why
    if (process.env.DATABASE_URL && !pgPool) {
      health.database.postgres = "misconfigured";
      health.database.postgres_note = "DATABASE_URL set but not PostgreSQL format";
    }
    return json(res, 200, health);
  }
  
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
        <div class="eyebrow">Pricing</div>
        <h1>Pay for the platform. That's it.</h1>
        <p class="lead">Two tracks, monthly or annual. No setup fees, no long-term contracts, no income guarantees implied or required. Pick the one that matches where you are.</p>
      </div>

      <div class="section-alt">
        <div class="card-grid card-grid-2">
          <a href="/pricing/launch" class="card card-link">
            <span class="feature-tag">LaunchPath™</span>
            <h3>Building from zero</h3>
            <p style="margin:16px 0">Three tiers from $99/mo, with annual plans that save 16%. Includes structured guidance and a clear upgrade path as your operation grows.</p>
            <ul class="feature-list" style="margin:20px 0">
              <li>Individual Operator — $99/mo</li>
              <li>Builder — $299/mo (most popular)</li>
              <li>Advanced Operator — $999/mo</li>
            </ul>
            <p style="color:#ffb26b;font-size:14px;margin-top:24px;">View LaunchPath pricing →</p>
          </a>
          <a href="/pricing/scale" class="card card-link">
            <span class="feature-tag">Scale</span>
            <h3>Already operating</h3>
            <p style="margin:16px 0">For established businesses and franchise candidates. Includes team-level visibility, multi-user access, and licensed deployment options.</p>
            <ul class="feature-list" style="margin:20px 0">
              <li>Organization / Leader — $599/mo</li>
              <li>Franchise License — $10,000 one-time (3-year)</li>
            </ul>
            <p style="color:#ffb26b;font-size:14px;margin-top:24px;">View Scale pricing →</p>
          </a>
        </div>
      </div>

      <div class="section">
        <div style="max-width:680px;margin:0 auto;text-align:center">
          <h2>Not sure which fits?</h2>
          <p class="lead" style="margin:0 auto 32px">Apply with whichever feels closer — we route applicants to the right tier during review.</p>
          <div class="btn-group">
            <a href="/apply" class="btn btn-primary">Apply for access</a>
            <a href="/" class="btn btn-ghost">Back to home</a>
          </div>
        </div>
      </div>
    `));
  }
  
  if (url.pathname === "/pricing/launch") {
    return html(res, 200, page("LaunchPath™ Pricing", `
      <div class="hero">
        <div class="eyebrow">LaunchPath™ Pricing</div>
        <h1>Three tiers. One platform.</h1>
        <p class="lead">Start where it makes sense. Step up as your operation grows. Same platform, more capacity. Annual plans save 16%.</p>
      </div>

      <div class="section-alt">
        <div class="card-grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));max-width:1200px;">
          <div class="card">
            <h3>Individual Operator</h3>
            <div class="price"><span class="price-amount">$99</span><span class="price-period">/ month</span></div>
            <div class="price-annual"><strong>$999</strong> / year <span class="save">save $189</span></div>
            <ul class="feature-list">
              <li>Foundational platform access</li>
              <li>Intake board + assignment workflow</li>
              <li>Core conversation tools</li>
              <li>Basic operational visibility</li>
              <li>Email support</li>
            </ul>
            <p class="text-muted" style="font-size:13px;margin:20px 0">For someone just starting — structure without overwhelming complexity.</p>
            <a href="/apply?intent=launch&tier=individual" class="btn btn-primary" style="width:100%;text-align:center;">Get started</a>
          </div>

          <div class="card" style="border-color:rgba(255,122,24,0.55);box-shadow:0 0 0 1px rgba(255,122,24,0.25)">
            <span class="feature-tag">Most popular</span>
            <h3>Builder</h3>
            <div class="price"><span class="price-amount">$299</span><span class="price-period">/ month</span></div>
            <div class="price-annual"><strong>$2,999</strong> / year <span class="save">save $589</span></div>
            <ul class="feature-list">
              <li>Everything in Individual Operator</li>
              <li>Expanded automation + workflows</li>
              <li>Calibrated outreach templates</li>
              <li>SLA + escalation monitoring</li>
              <li>Priority email support</li>
            </ul>
            <p class="text-muted" style="font-size:13px;margin:20px 0">For someone actively building — more tools, structured support.</p>
            <a href="/apply?intent=launch&tier=builder" class="btn btn-primary" style="width:100%;text-align:center;">Get started</a>
          </div>

          <div class="card">
            <h3>Advanced Operator</h3>
            <div class="price"><span class="price-amount">$999</span><span class="price-period">/ month</span></div>
            <div class="price-annual"><strong>$9,999</strong> / year <span class="save">save $1,989</span></div>
            <ul class="feature-list">
              <li>Everything in Builder</li>
              <li>Full platform access</li>
              <li>High-volume intake capacity</li>
              <li>LLM next-touch drafting</li>
              <li>Faster-response support</li>
            </ul>
            <p class="text-muted" style="font-size:13px;margin:20px 0">For serious operators running high volume.</p>
            <a href="/apply?intent=launch&tier=advanced" class="btn btn-primary" style="width:100%;text-align:center;">Get started</a>
          </div>
        </div>
      </div>

      <div class="section">
        <div style="text-align:center;max-width:720px;margin:0 auto 48px">
          <div class="eyebrow">Why LaunchPath</div>
          <h2>Built for the operator who intends to scale.</h2>
        </div>
        <div class="content-center">
          <ul class="plain">
            <li>Proven workflows instead of guesswork</li>
            <li>Operational infrastructure from day one — not after the spreadsheets stop scaling</li>
            <li>A clear upgrade path as volume grows</li>
            <li>Same platform across tiers — you never have to migrate</li>
          </ul>
        </div>
        <div class="btn-group" style="margin-top:32px">
          <a href="/apply?intent=launch" class="btn btn-primary">Apply for access</a>
          <a href="/pricing" class="btn btn-ghost">Compare both tracks</a>
        </div>
      </div>

      <div class="footer-note">
        <p>Pricing reflects platform access only. No earnings or outcomes are guaranteed. Annual plans billed upfront.</p>
      </div>
    `));
  }
  
  if (url.pathname === "/pricing/scale") {
    return html(res, 200, page("Scale Pricing", `
      <div class="hero">
        <div class="eyebrow">Scale Pricing</div>
        <h1>For organizations that already operate.</h1>
        <p class="lead">Two options — recurring access for ongoing operations, or a one-time franchise license for organizations that want to deploy the platform under their own brand.</p>
      </div>

      <div class="section-alt">
        <div class="card-grid card-grid-2">
          <div class="card">
            <h3>Organization / Leader</h3>
            <div class="price"><span class="price-amount">$599</span><span class="price-period">/ month</span></div>
            <div class="price-annual"><strong>$5,999</strong> / year <span class="save">save $1,189</span></div>
            <ul class="feature-list">
              <li>Organization-level platform access</li>
              <li>Team visibility + governance tools</li>
              <li>Distributed-team coordination</li>
              <li>Multi-user access + permissions</li>
              <li>Advanced reporting + analytics</li>
              <li>Priority support</li>
            </ul>
            <p class="text-muted" style="font-size:13px;margin:20px 0">For established businesses and leaders running coordinated teams.</p>
            <a href="/apply?intent=scale&tier=leader" class="btn btn-primary" style="width:100%;text-align:center;">Apply for access</a>
          </div>

          <div class="card">
            <h3>Franchise License</h3>
            <div class="price"><span class="price-amount">$10,000</span><span class="price-period">one-time</span></div>
            <div class="price-annual"><strong>3-year license</strong> included</div>
            <ul class="feature-list">
              <li>Licensed deployment of the platform</li>
              <li>Approved branding + white-label options</li>
              <li>Full platform access for 3 years</li>
              <li>Dedicated onboarding</li>
              <li>Custom integration support</li>
              <li>Franchise partner benefits</li>
            </ul>
            <p class="text-muted" style="font-size:13px;margin:20px 0">For organizations deploying Iron Front Digital under their own brand.</p>
            <a href="/apply?intent=scale&tier=franchise" class="btn btn-primary" style="width:100%;text-align:center;">Request franchise access</a>
          </div>
        </div>
      </div>

      <div class="section">
        <div style="text-align:center;max-width:720px;margin:0 auto 48px">
          <div class="eyebrow">Why Scale</div>
          <h2>Operational structure without rebuilding what already works.</h2>
        </div>
        <div class="content-center">
          <ul class="plain">
            <li>Team-level visibility — see what every operator is doing without hovering</li>
            <li>Consistent execution across distributed teams and locations</li>
            <li>Multi-user permissions, governance, audit trail</li>
            <li>Reporting and analytics designed for organizational decision-making</li>
            <li>Application required so we can match capacity to your operation</li>
          </ul>
        </div>
        <div class="btn-group" style="margin-top:32px">
          <a href="/apply?intent=scale" class="btn btn-primary">Apply for access</a>
          <a href="/pricing" class="btn btn-ghost">Compare both tracks</a>
        </div>
      </div>

      <div class="footer-note">
        <p>Pricing reflects platform access only. No earnings or outcomes are guaranteed. Annual plans billed upfront.</p>
      </div>
    `));
  }
  
  if (url.pathname === "/apply") {
    return html(res, 200, page("Apply for access", `
      <div class="hero">
        <div class="eyebrow">Application</div>
        <h1>Apply for platform access.</h1>
        <p class="lead">Iron Front Digital is gated by application — not because access is scarce, but because the platform works best when matched to the right tier and operator. Pick a path; we'll get back within 1–2 business days.</p>
      </div>

      <div class="section-alt">
        <div style="text-align:center;max-width:720px;margin:0 auto 48px">
          <div class="eyebrow">Which fits you</div>
          <h2>Two paths.</h2>
        </div>
        <div class="card-grid card-grid-2">
          <a href="/scale" class="card card-link">
            <span class="feature-tag">Scale</span>
            <h3>I already run a business.</h3>
            <p>You have customers, operators, or a team. You need operational structure, team-level visibility, and consistent execution across distributed work — without rebuilding.</p>
            <p style="color:#ffb26b;font-size:14px;margin-top:20px">Apply for Scale →</p>
          </a>
          <a href="/launch" class="card card-link">
            <span class="feature-tag">LaunchPath™</span>
            <h3>I'm starting from zero.</h3>
            <p>You're building a business and want infrastructure from day one — not after the spreadsheets stop scaling. Includes structured guidance and a clear upgrade path.</p>
            <p style="color:#ffb26b;font-size:14px;margin-top:20px">Apply for LaunchPath →</p>
          </a>
        </div>
        <p style="text-align:center;margin-top:32px;font-size:14px;color:#9ca3af">
          Not sure which fits? Pick the closer match — we route to the right tier during review.
        </p>
      </div>

      <div class="footer-note">
        <p>Iron Front Digital is operational software and infrastructure. We do not offer income guarantees, business opportunities, or compensation programs. Outcomes depend on execution.</p>
      </div>
    `));
  }
  
  if (url.pathname === "/mlm" || url.pathname === "/biab") {
    const source = url.pathname.replace("/", "");
    const isScale = source === "mlm";
    const headline = isScale
      ? "Operational infrastructure for organizations that already exist."
      : "A real business needs real systems. Start with both.";
    const subhead = isScale
      ? "We don't replace your business. We make it operate better — with intake routing, conversation tools, SLA monitoring, and outcome attribution that runs without constant manual intervention."
      : "Structured guidance, working systems, and an upgrade path — so the business you build today still works at 10x the volume.";
    const eyebrow = isScale ? "Scale" : "LaunchPath™";
    const benefits = isScale
      ? [
          { h: "Team-level visibility", p: "See where every applicant, lead, and operator action stands across your organization. No more guessing who owns what." },
          { h: "Distributed-team coordination", p: "Auto-routing assigns intakes to the right operator. SLA breaches, conversion drops, and stale work get surfaced before they fall through." },
          { h: "Outreach that learns", p: "Templates with calibrated confidence — the platform tells you which messages convert and suggests the next best touch for each applicant." },
          { h: "Compliance-friendly by design", p: "Owner-only access, full audit trail, magic-link auth. No income guarantees implied or required anywhere on the platform." },
        ]
      : [
          { h: "Structure from day one", p: "Stop cobbling together spreadsheets. Get a real intake board, assignment workflow, and conversation tools the day you start." },
          { h: "Guidance built into the workflow", p: "The platform proposes the next move with calibrated confidence — based on what's worked for similar applicants in similar situations." },
          { h: "Built-in upgrade path", p: "Start with Individual Operator. Step up to Builder, Advanced Operator, and beyond as your volume grows. Same platform, more capacity." },
          { h: "Pay for what you use", p: "$99/mo to start. Annual plans save 16%. No long-term contracts, no setup fees." },
        ];
    const ctaIntent = isScale ? "scale" : "launch";

    return html(res, 200, page(isScale ? "Scale" : "LaunchPath™", `
      <div class="hero">
        <div class="eyebrow">${eyebrow}</div>
        <h1>${headline}</h1>
        <p class="lead">${subhead}</p>
        <div class="btn-group">
          <a href="/pricing/${ctaIntent}" class="btn btn-primary">See ${isScale ? "Scale" : "LaunchPath"} pricing</a>
          <a href="/apply?intent=${ctaIntent}" class="btn btn-secondary">Apply for access</a>
        </div>
      </div>

      <div class="section-alt">
        <div style="text-align:center;max-width:720px;margin:0 auto 48px">
          <div class="eyebrow">What you get</div>
          <h2>Built for ${isScale ? "operators with people on the team" : "operators who intend to scale"}.</h2>
        </div>
        <div class="card-grid card-grid-2">
          ${benefits.map(b => `
            <div class="card">
              <h3>${b.h}</h3>
              <p>${b.p}</p>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="section">
        <div style="max-width:720px;margin:0 auto;text-align:center">
          <div class="eyebrow">Quick apply</div>
          <h2>Tell us your email. We'll route you to the right tier.</h2>
          <p class="text-muted" style="margin-bottom:32px">Or skip ahead to the full application below.</p>
          <form method="POST" action="/apply" style="max-width:440px;margin:0 auto;display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
            <input type="hidden" name="source" value="${source}" />
            <input required type="email" name="email" placeholder="you@company.com" style="flex:1;min-width:240px;max-width:320px" />
            <button type="submit" style="width:auto;flex-shrink:0">Apply now</button>
          </form>
          <p class="text-muted" style="margin-top:32px;font-size:14px">
            <a href="/pricing/${ctaIntent}">View ${isScale ? "Scale" : "LaunchPath"} pricing →</a>
            &nbsp;·&nbsp;
            <a href="/">← Back to home</a>
          </p>
        </div>
      </div>

      <div class="footer-note">
        <p>Iron Front Digital is operational software and infrastructure. We do not offer income guarantees, business opportunities, or compensation programs. Outcomes depend on execution.</p>
      </div>
    `));
  }

  return html(res, 200, page("Iron Front Digital", `
    <div class="hero">
      <div class="eyebrow">Operational Infrastructure</div>
      <h1>Run the business, not the busywork.</h1>
      <p class="lead">Iron Front Digital is the operating layer for serious businesses — intake routing, conversation tools, operator workflows, and outcome-tracked recommendations. Built for people who intend to operate, not experiment.</p>
      <div class="btn-group">
        <a href="/scale" class="btn btn-primary">Scale an existing business</a>
        <a href="/launch" class="btn btn-secondary">Build from zero</a>
      </div>
    </div>

    <div class="section-alt">
      <div style="text-align:center;max-width:720px;margin:0 auto 48px">
        <div class="eyebrow">What you get</div>
        <h2>A platform that does the operating, so you can focus on the business.</h2>
      </div>
      <div class="card-grid">
        <div class="card">
          <h3>Intake routing & operator console</h3>
          <p>New leads land on a Kanban board, auto-assigned to the right operator. Status, notes, assignment, and a complete conversation thread live in one place.</p>
        </div>
        <div class="card">
          <h3>Outreach with calibrated playbooks</h3>
          <p>Reusable message templates that learn — confidence scores adjust automatically as outcomes accumulate. The platform suggests the next best touch and drafts it for you.</p>
        </div>
        <div class="card">
          <h3>SLA monitoring & escalation</h3>
          <p>Stale unassigned intakes, missed first-contact windows, and conversion-rate drops get surfaced before they fall through.</p>
        </div>
        <div class="card">
          <h3>Outcome attribution</h3>
          <p>Every applied recommendation, every sent message, every status change is linked back to the eventual outcome — so what works rises to the top automatically.</p>
        </div>
        <div class="card">
          <h3>Magic-link auth & audit trail</h3>
          <p>Owner-only access, no passwords. Every operator action is recorded to a tamper-evident audit log.</p>
        </div>
        <div class="card">
          <h3>Stripe billing built in</h3>
          <p>Customer creation, checkout, subscription management, and webhook-driven status updates — wired up out of the box.</p>
        </div>
      </div>
    </div>

    <div class="section">
      <div style="text-align:center;max-width:720px;margin:0 auto 48px">
        <div class="eyebrow">Who it's for</div>
        <h2>Two paths into the platform.</h2>
      </div>
      <div class="card-grid card-grid-2">
        <a href="/scale" class="card card-link">
          <span class="feature-tag">Scale</span>
          <h3>You already run a business.</h3>
          <p>For organizations and leaders who need better operational structure, team-level visibility, and consistent execution across distributed teams.</p>
          <p style="color:#ffb26b;font-size:14px;margin-top:20px">See Scale →</p>
        </a>
        <a href="/launch" class="card card-link">
          <span class="feature-tag">LaunchPath™</span>
          <h3>You're starting from zero.</h3>
          <p>Structured guidance, systems, and an upgrade path — for people building a real business and want infrastructure from day one, not after they outgrow spreadsheets.</p>
          <p style="color:#ffb26b;font-size:14px;margin-top:20px">See LaunchPath →</p>
        </a>
      </div>
    </div>

    <div class="section-alt">
      <div style="text-align:center;max-width:720px;margin:0 auto 48px">
        <div class="eyebrow">How it works</div>
        <h2>Three steps to operating differently.</h2>
      </div>
      <div class="card-grid">
        <div class="card card-center">
          <div class="step-number">1</div>
          <h3>Choose a path</h3>
          <p>Scale if you already have a business. LaunchPath if you're starting from zero.</p>
        </div>
        <div class="card card-center">
          <div class="step-number">2</div>
          <h3>Apply for access</h3>
          <p>A short application so we can match you to the right tier and operator.</p>
        </div>
        <div class="card card-center">
          <div class="step-number">3</div>
          <h3>Start operating</h3>
          <p>Provision happens within 24 hours. The platform takes over the operational layer from day one.</p>
        </div>
      </div>
      <div class="btn-group" style="margin-top:48px">
        <a href="/pricing" class="btn btn-primary">See pricing</a>
        <a href="/apply" class="btn btn-secondary">Apply now</a>
      </div>
    </div>

    <div class="footer-note">
      <p>Iron Front Digital is operational software and infrastructure. We do not offer income guarantees, business opportunities, or compensation programs. Outcomes depend on execution.</p>
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
