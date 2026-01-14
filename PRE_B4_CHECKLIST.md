# ✅ PRE-B4 GO-LIVE CHECKLIST

**Status:** In Progress  
**Date:** $(date)

---

## 1️⃣ Confirm Production Is Truly Live

### ✅ Homepage
- [x] `https://ironfrontdigital.com` - **VERIFIED** (loads successfully)
- [ ] `https://ironfrontdigital.com/scale` - **NEEDS VERIFICATION** (appears to load but may be showing homepage)
- [ ] `https://ironfrontdigital.com/launch` - **NEEDS VERIFICATION** (appears to load but may be showing homepage)
- [ ] `https://ironfrontdigital.com/ecosystems` - **NEEDS VERIFICATION** (appears to load but may be showing homepage)
- [ ] `https://ironfrontdigital.com/pricing` - **NEEDS VERIFICATION** (appears to load but may be showing homepage)

**⚠️ NOTE:** The public pages (`/scale`, `/launch`, `/ecosystems`, `/pricing`) are part of the **Operator UI Next.js app**, not the main Node.js server. These routes may not be deployed to production yet.

**Action Required:**
- Verify if Operator UI is deployed to production
- If not, deploy Operator UI or configure routing to serve these pages

### ✅ Health Endpoints
- [ ] `https://ironfrontdigital.com/health` - **NEEDS MANUAL VERIFICATION**
  - Expected: `200 OK` with `{"ok": true, "version": "..."}`
- [ ] `https://ironfrontdigital.com/ready` - **NEEDS MANUAL VERIFICATION**
  - Expected: `200 OK` with `{"ok": true, "db": "ok", "version": "..."}`

**To Verify:**
```bash
# On your local machine or via browser:
curl https://ironfrontdigital.com/health
curl https://ironfrontdigital.com/ready
```

**If either fails → STOP and fix before proceeding.**

---

## 2️⃣ Run Database Migration in Production (REQUIRED)

### ⚠️ CRITICAL: Intakes Table Must Exist Before B4

**Action Required:**

1. **SSH to production EC2 instance:**
   ```bash
   ssh -i ~/.ssh/id_ed25519 ec2-user@<EC2_IP>
   ```

2. **Navigate to Operator UI directory:**
   ```bash
   cd /opt/ifd-app/operator-ui  # Or wherever Operator UI is deployed
   ```

3. **Run migration:**
   ```bash
   npm run db:migrate
   ```

4. **Verify intakes table exists:**
   ```bash
   # Connect to PostgreSQL and verify:
   psql $DATABASE_URL -c "\d intakes"
   ```

5. **Seed database (one time only):**
   ```bash
   npm run db:seed
   ```

**Why This Is Required:**
- `/apply` endpoint creates intake records
- Billing metadata will attach to `intake_id`
- Stripe webhooks depend on stable IDs
- **No payments should be processed until intakes table exists**

**Status:** [ ] NOT STARTED | [ ] IN PROGRESS | [ ] COMPLETE

---

## 3️⃣ Decide Stripe Mode

### ✅ Decision: **TEST MODE FIRST**

**Rationale:**
- Validate checkout → webhook → entitlements flow
- No accidental real charges
- Faster iteration
- Can switch to live mode after validation

**Action Required:**
- Confirm Stripe Dashboard is in **Test Mode**
- Use test API keys in production `.env` for now

**Status:** [ ] CONFIRMED (Test Mode)

---

## 4️⃣ Stripe Setup (REQUIRED)

**Quick Start:** See `STRIPE_SETUP_QUICK_START.md`  
**Full Guide:** See `STRIPE_SETUP_B4.md`  
**Complete Guide:** See `STRIPE_SETUP_COMPLETE.md`

### Quick Checklist:

- [ ] All 5 products created in Stripe Dashboard (Test Mode)
  - Individual Operator ($99/mo)
  - Builder ($299/mo)
  - Advanced Operator ($599/mo)
  - Organization/Leader ($999/mo)
  - Franchise License ($10,000 one-time)
- [ ] All Price IDs copied from Stripe Dashboard
- [ ] Price IDs stored in production `.env`:
  - `STRIPE_PRICE_INDIVIDUAL`
  - `STRIPE_PRICE_BUILDER`
  - `STRIPE_PRICE_ADVANCED`
  - `STRIPE_PRICE_ORGANIZATION`
  - `STRIPE_PRICE_FRANCHISE`
- [ ] Test API keys in production `.env`:
  - `STRIPE_SECRET_KEY=sk_test_...`
  - `STRIPE_PUBLISHABLE_KEY=pk_test_...`

**Validation:**
```bash
# Run validation script
chmod +x scripts/validate-stripe-prices.sh
./scripts/validate-stripe-prices.sh /opt/ifd-app/.env
```

**Status:** [ ] NOT STARTED | [ ] IN PROGRESS | [ ] COMPLETE

---

## 4️⃣ Create Stripe Account Structure (No Code Yet) - DEPRECATED

### ⚠️ DO THIS IN STRIPE DASHBOARD (TEST MODE)

**Action Required:** Create these products and prices in Stripe Dashboard:

#### LaunchPath™
- [ ] `launch_starter_99` → $99 / month (recurring)
- [ ] `launch_growth_299` → $299 / month (recurring)
- [ ] `launch_scale_999` → $999 / month (recurring)

#### Scale Path
- [ ] `scale_individual_49` → $49 / month (recurring)
- [ ] `scale_builder_199` → $199 / month (recurring)
- [ ] `scale_leader_599` → $599 / month (recurring)

#### License
- [ ] `license_3yr_10000` → $10,000 one-time

**⚠️ IMPORTANT:**
- Copy Price IDs exactly (they look like `price_xxxxx`)
- Store them in a secure location (NOT in git)
- You'll need these for B4 implementation

**Status:** [ ] NOT STARTED | [ ] IN PROGRESS | [ ] COMPLETE

---

## 5️⃣ Prepare Production Secrets (Do NOT Commit)

### ⚠️ SECRETS LIVE ONLY ON SERVER

**Action Required:** On EC2 instance, verify `/opt/ifd-app/.env` contains:

```bash
# Stripe (TEST MODE for now)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # (Not needed yet, but prepare)

# App Configuration
APP_URL=https://ironfrontdigital.com
NODE_ENV=production

# Database (if Operator UI uses separate DB)
DATABASE_URL=postgresql://...

# Existing
ADMIN_KEY=...
APP_VERSION=...
```

**To Verify:**
```bash
# SSH to EC2
ssh -i ~/.ssh/id_ed25519 ec2-user@<EC2_IP>

# Check .env (be careful - contains secrets)
cat /opt/ifd-app/.env | grep -E "STRIPE|APP_URL|NODE_ENV"
```

**⚠️ DO NOT:**
- Commit `.env` to git
- Share secrets in chat/email
- Use production keys in test mode

**Status:** [ ] VERIFIED | [ ] NEEDS UPDATE

---

## 6️⃣ Confirm Legal & Positioning

### ✅ Internal Confirmation Required

**Before B4, confirm internally:**

- [x] You are selling **platform access**
- [x] You are **NOT** selling income
- [x] You are **NOT** selling placement
- [x] You are **NOT** brokering MLMs
- [x] You are charging for:
  - Infrastructure
  - Operating capacity
  - Support level

**Current Copy Alignment:**
- ✅ Already aligns with compliance requirements
- ✅ No MLM terms
- ✅ No earnings promises
- ✅ Neutral enterprise tone

**This protects:**
- Stripe account approval
- Bank reviews
- Ad platform compliance
- Long-term scale

**Status:** [ ] CONFIRMED

---

## 🚫 WHAT NOT TO DO YET

**Do NOT:**
- [ ] Turn on Stripe Live mode
- [ ] Add checkout buttons without webhooks
- [ ] Allow payments without entitlements
- [ ] Manually assign access after payment

**B4 will handle all of that correctly.**

---

## ✅ READINESS CHECKLIST

**You are ready for Phase B4 when ALL of these are true:**

- [ ] Public pages live and accessible
- [ ] `/health` returns 200
- [ ] `/ready` returns 200
- [ ] `intakes` table exists in production PostgreSQL
- [ ] Stripe products created (test mode)
- [ ] Stripe test keys in production `.env`
- [ ] Legal positioning confirmed

---

## 📝 NEXT STEPS

Once all items above are checked:

1. Reply with: **"Pre-B4 checklist complete."**
2. Proceed with Phase B4 implementation
3. B4 will implement:
   - Stripe Checkout integration
   - Webhook handling
   - Entitlement management
   - Billing metadata attachment

---

## 🔍 VERIFICATION COMMANDS

**Quick verification script (run on EC2):**

```bash
#!/bin/bash
echo "=== Production Readiness Check ==="

# Check health endpoints
echo "1. Health endpoint:"
curl -s https://ironfrontdigital.com/health | jq .

echo "2. Ready endpoint:"
curl -s https://ironfrontdigital.com/ready | jq .

# Check database (if Operator UI deployed)
echo "3. Database connection:"
cd /opt/ifd-app/operator-ui 2>/dev/null && npm run db:migrate --dry-run || echo "Operator UI not found"

# Check .env (careful - secrets)
echo "4. Environment check:"
test -f /opt/ifd-app/.env && echo "✅ .env exists" || echo "❌ .env missing"
grep -q "STRIPE_SECRET_KEY" /opt/ifd-app/.env && echo "✅ Stripe key present" || echo "❌ Stripe key missing"
grep -q "APP_URL" /opt/ifd-app/.env && echo "✅ APP_URL present" || echo "❌ APP_URL missing"

echo "=== Check Complete ==="
```

---

**Last Updated:** $(date)  
**Status:** Awaiting manual verification

