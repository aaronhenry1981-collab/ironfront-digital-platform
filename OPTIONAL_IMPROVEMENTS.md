# 🟡 Optional Improvements (Not Blockers)

These improvements are **not required** before B4, but worth noting for future implementation.

---

## 1. Add `/version` Endpoint

**Purpose:** Human-readable version check endpoint

**Current Status:** ✅ **ALREADY IMPLEMENTED**

The `/version` endpoint already exists in `app/server.js`:
```javascript
if (url.pathname === "/version") return json(res, 200, { version: VERSION });
```

**Usage:**
```bash
curl https://ironfrontdigital.com/version
# Returns: {"version": "..."}
```

**Optional Enhancement:**
Could add more details:
```javascript
if (url.pathname === "/version") {
  return json(res, 200, {
    version: APP_VERSION,
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
}
```

**Status:** ✅ Implemented (basic) | [ ] Enhanced version available

---

## 2. Basic Rate Limiting

**Purpose:** Prevent abuse of API endpoints

**Implementation Options:**

### Option A: Express Rate Limit (if using Express)
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Option B: Custom Middleware (for Node.js http)
```javascript
const rateLimitMap = new Map();

function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const record = rateLimitMap.get(ip);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return next();
  }

  if (record.count >= maxRequests) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Too many requests' }));
  }

  record.count++;
  next();
}
```

### Option C: AWS ALB Rate Limiting
- Configure at ALB level
- No code changes needed
- Managed by AWS

**Recommended Limits:**
- Public endpoints: 100 requests / 15 minutes per IP
- API endpoints: 1000 requests / 15 minutes per IP
- Webhook endpoints: 100 requests / minute per IP

**Status:** [ ] Not implemented | [ ] Can be done in B4

---

## 3. Lock Admin Routes Behind Auth

**Purpose:** Secure admin endpoints

**Current State:**
- Admin routes use `X-Admin-Key` header
- No session-based authentication

**Implementation:**

### Option A: Session-Based Auth
```javascript
// Check session instead of header
function requireAdmin(req, res, next) {
  const session = getSession(req);
  if (!session || session.role !== 'admin') {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  next();
}
```

### Option B: JWT Tokens
```javascript
const jwt = require('jsonwebtoken');

function requireAdmin(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) {
    res.writeHead(401);
    return res.end('Unauthorized');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.writeHead(401);
    return res.end('Unauthorized');
  }
}
```

### Option C: IP Whitelist (Simple)
```javascript
const ADMIN_IPS = process.env.ADMIN_IPS?.split(',') || [];

function requireAdmin(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (!ADMIN_IPS.includes(ip)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  next();
}
```

**Current Protection:**
- ✅ `X-Admin-Key` header check exists (in `requireAdmin()` function)
- ✅ Admin key stored in environment variable (`ADMIN_KEY`)
- ✅ All admin routes protected (`/admin/leads`, `/admin/events`, `/admin/export`, `/admin/clear`, `/admin/lead/status`)
- ⚠️  No session management (uses header-based auth)
- ⚠️  No IP whitelisting

**Current Implementation:**
```javascript
function requireAdmin(req, res) {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    res.writeHead(403);
    res.end("Forbidden");
    return false;
  }
  return true;
}
```

**Status:** ✅ Implemented (header-based) | [ ] Can be enhanced with sessions/JWT in future

---

## Priority Assessment

| Improvement | Priority | Effort | Blocker? |
|------------|----------|--------|----------|
| `/version` endpoint | Low | 5 min | ❌ No |
| Rate limiting | Medium | 1-2 hours | ❌ No |
| Admin auth enhancement | Medium | 2-4 hours | ❌ No |

**Recommendation:**
- Implement `/version` endpoint in B4 (quick win)
- Add rate limiting after B4 is stable
- Enhance admin auth as needed (current `X-Admin-Key` is sufficient for now)

---

## Implementation Notes

### `/version` Endpoint
- **When:** Can be added anytime
- **Where:** `app/server.js` or API route
- **Risk:** Low
- **Benefit:** High (debugging aid)

### Rate Limiting
- **When:** After B4, before public launch
- **Where:** Middleware layer
- **Risk:** Medium (could block legitimate users if misconfigured)
- **Benefit:** High (security)

### Admin Auth
- **When:** When admin panel is built
- **Where:** Middleware layer
- **Risk:** Low (enhancement, not replacement)
- **Benefit:** Medium (security improvement)

---

**Status:** All items are optional and do not block B4 progress.

