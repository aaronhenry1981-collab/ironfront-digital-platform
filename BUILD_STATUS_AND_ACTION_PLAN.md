# Iron Front Digital — Build Status & Action Plan

## Executive Summary

**Current Position:** Layer 2 (Auth) is 95% complete — just needs `DATABASE_URL` configured in production.

**Next Critical Path:**
1. ✅ Complete Layer 2 (Auth) — Configure `DATABASE_URL`
2. ✅ Verify Layer 3 (Owner Console) — Test `/console/owner` access
3. ⚠️ Complete Layer 5 (Revenue Visibility) — Wire Stripe events to console
4. 🎯 Build Layer 7 (Lead Engine) — Compliant, best-in-class self-identification system

---

## Detailed Status by Layer

### LAYER 0 — FOUNDATIONAL DECISIONS ✅ **COMPLETE**
All locked. No action needed.

### LAYER 1 — INFRASTRUCTURE ✅ **COMPLETE**
- ✅ Hosting, Docker, CI/CD all working
- ✅ PostgreSQL database exists
- ✅ Migrations system in place
- ✅ Audit logging operational

### LAYER 2 — AUTH & OWNER ACCESS ⚠️ **95% COMPLETE**

**✅ Completed:**
- Login page (`/login`) renders correctly
- Auth API routes implemented (`POST /api/auth/request-link`, `GET /api/auth/verify-link`)
- Owner email hard-coded: `aaronhenry1981@gmail.com`
- Session management working
- Middleware guards in place
- Error handling and diagnostics

**⚠️ Blocking Issue:**
- `DATABASE_URL` environment variable not set in production
- **Fix:** Add `DATABASE_URL=postgresql://...` to `/opt/ifd-app/.env` on server
- **See:** `DATABASE_URL_SETUP.md` for instructions

**🎯 Action Required:**
```bash
# SSH to server and edit .env file
echo "DATABASE_URL=postgresql://user:pass@host:5432/dbname" >> /opt/ifd-app/.env
docker restart ifd-app
```

### LAYER 3 — OWNER CONSOLE ✅ **90% COMPLETE**

**✅ Completed:**
- `/console/owner` dashboard exists
- System health panel (app, DB, Stripe status)
- Intake snapshot (counts by status)
- Recent activity (latest audit events)
- Revenue signals (checkout_started, checkout_completed counts)
- Logout button

**⚠️ Minor Gaps:**
- Revenue signals show counts but not actual revenue amounts
- No ability to reassign intakes from console (exists in intake board)
- No ability to pause automations (Atlas not yet built)

**🎯 Action:** Verify console works after `DATABASE_URL` is set. Minor enhancements can come later.

### LAYER 4 — PUBLIC EXPERIENCE ✅ **COMPLETE**
All pages, copy, and UX are production-ready.

### LAYER 5 — MONETIZATION ⚠️ **80% COMPLETE**

**✅ Completed:**
- Stripe products created (monthly + annual)
- Checkout flows working
- Price IDs configured
- Success routing operational

**⚠️ Missing:**
- Stripe checkout events (`checkout_started`, `checkout_completed`) need to be logged to `events` table
- Revenue amounts not tracked (only counts)
- Drop-off tracking not implemented

**🎯 Action Required:**
1. Wire Stripe checkout events to `events` table
2. Track revenue amounts (store in event metadata or separate table)
3. Display actual revenue in owner console

**Code Location:**
- Checkout: `operator-ui/src/app/api/checkout/create/route.ts` (needs event logging)
- Owner console: Already queries `checkout_started` and `checkout_completed` events

### LAYER 6 — SIGNAL COLLECTION ⚠️ **70% COMPLETE**

**✅ Completed:**
- Page views tracked internally
- Intent tracking (scale, launch, ecosystems)
- Apply intent tracked

**⚠️ Missing:**
- Conversion funnel visibility in owner console
- Behavioral signal analysis

**🎯 Action:** Low priority. Can enhance after Layer 7.

### LAYER 7 — LEAD ENGINE ⚠️ **30% COMPLETE** 🎯 **FOCUS AREA**

**✅ Completed:**
- Self-identification via `/api/public/apply` route
- Intake routing logic (`routeIntake()`)
- Lead ownership rules
- Status lifecycle (new → contacted → qualified → closed)

**❌ Missing (Compliant Lead Engine):**
- Referral intake system
- Lead source tracking per intake
- Performance tracking per source
- Monetization logic (sell, assign, retain decisions)

**⚠️ Important Note:**
Per your checklist, **scrapers/reverse lookups are NOT v1**. They are v2+ under controlled conditions.

**🎯 What to Build (Compliant Lead Engine v1):**

1. **Lead Source Tracking**
   - Add `source` field to `intakes` table (already exists in `leads`)
   - Track: `self_identified`, `referral`, `paid_traffic` (future)
   - Map source to each intake record

2. **Referral System**
   - Referral codes/tokens
   - Track referrer → referral mapping
   - Reward/credit system (optional, v2)

3. **Performance Analytics**
   - Source → conversion rates
   - Source → revenue attribution
   - Display in owner console

4. **Lead Handling Automation**
   - Auto-assignment rules per source
   - Routing logic enhancements
   - Monetization logic (when to sell vs retain)

**Code Locations:**
- Intake creation: `operator-ui/src/app/api/public/apply/route.ts`
- Intake routing: `operator-ui/src/lib/intake-routing.ts`
- Owner console: `operator-ui/src/app/console/owner/page.tsx`

### LAYER 8-9 — AUTONOMY & SCALE ❌ **NOT STARTED**
Defer until Layer 7 is complete.

---

## Immediate Action Plan (Priority Order)

### 🔴 **Priority 1: Complete Authentication (Layer 2)**
**Time:** 5 minutes  
**Action:** Set `DATABASE_URL` in production  
**Deliverable:** Owner can log in and access `/console/owner`

**Steps:**
1. SSH to production server
2. Add `DATABASE_URL` to `/opt/ifd-app/.env`
3. Restart Docker container
4. Test login flow

**Documentation:** `DATABASE_URL_SETUP.md`

---

### 🟠 **Priority 2: Wire Revenue Visibility (Layer 5)**
**Time:** 2-3 hours  
**Action:** Log Stripe checkout events to database  
**Deliverable:** Owner console shows actual revenue

**Steps:**
1. Add event logging to checkout flow
2. Track revenue amounts in event metadata
3. Update owner console to display revenue
4. Test with test checkout

**Files to Modify:**
- `operator-ui/src/app/api/checkout/create/route.ts` — Add `checkout_started` event
- Stripe webhook handler — Add `checkout_completed` event with amount
- `operator-ui/src/app/console/owner/page.tsx` — Display revenue amounts

---

### 🟡 **Priority 3: Build Compliant Lead Engine (Layer 7)**
**Time:** 4-6 hours  
**Action:** Implement referral intake and source tracking  
**Deliverable:** Complete, compliant lead engine with analytics

**Steps:**

1. **Add Source Tracking**
   ```prisma
   // Already exists in schema, ensure it's used
   // Add source to intakes table if missing
   ```

2. **Referral System**
   - Create referral code generation
   - Track referrer → referral relationships
   - Add referral endpoint: `POST /api/public/apply?referral=CODE`

3. **Analytics Dashboard**
   - Source → conversion rates
   - Source → revenue attribution
   - Display in owner console

4. **Lead Handling Rules**
   - Auto-assignment by source
   - Routing logic updates
   - Monetization decisions

**Files to Create/Modify:**
- `operator-ui/src/app/api/public/apply/route.ts` — Accept referral codes
- `operator-ui/src/lib/referral.ts` — Referral code logic (new)
- `operator-ui/src/app/console/owner/page.tsx` — Source analytics (new section)
- Database migration — Ensure `source` field exists

---

## Testing Checklist

### After Priority 1 (Auth):
- [ ] Owner can log in at `/login`
- [ ] Magic link received (check server logs)
- [ ] Can access `/console/owner`
- [ ] System status shows correctly
- [ ] Intake snapshot displays

### After Priority 2 (Revenue):
- [ ] Test checkout triggers `checkout_started` event
- [ ] Stripe webhook logs `checkout_completed` with amount
- [ ] Owner console shows revenue amounts
- [ ] Drop-off tracking works (if implemented)

### After Priority 3 (Lead Engine):
- [ ] Self-identified leads tracked correctly
- [ ] Referral codes work
- [ ] Source analytics visible in console
- [ ] Lead handling rules execute correctly

---

## Compliance Notes (Lead Engine)

**✅ Compliant Approaches (v1):**
- Self-identification (user submits application)
- Referral system (user shares code with others)
- Paid traffic (ads → landing page → apply)

**❌ NOT v1 (Defer to v2+):**
- Web scrapers
- Reverse phone/email lookups
- Unsolicited data collection
- Third-party lead lists without consent

**🎯 Best Practices:**
1. All leads must opt-in (self-identify)
2. Track source explicitly
3. Respect privacy (GDPR, CCPA)
4. Audit trail for all lead creation
5. Clear ownership and routing rules

---

## Estimated Timeline

- **Priority 1 (Auth):** 5 minutes (configuration only)
- **Priority 2 (Revenue):** 2-3 hours
- **Priority 3 (Lead Engine):** 4-6 hours

**Total:** ~6-9 hours of focused work to reach "fully functioning autonomous business"

---

## Next Steps

1. **Immediate:** Configure `DATABASE_URL` (see `DATABASE_URL_SETUP.md`)
2. **Today:** Wire Stripe revenue events (Priority 2)
3. **This Week:** Build compliant lead engine (Priority 3)
4. **Next Week:** Layer 8 (Autonomy) — only after Layer 7 is stable

---

## Questions to Resolve

1. **Revenue Tracking:** Store amounts in `events.metadata` or separate `revenue` table?
2. **Referral System:** Auto-generate codes or manual assignment?
3. **Lead Analytics:** Real-time or batch processing?
4. **Monetization Logic:** Rules-based or ML-driven? (Start with rules)

---

**Status:** Ready to execute Priority 1 immediately. Priorities 2-3 are clear and can be completed in sequence.

