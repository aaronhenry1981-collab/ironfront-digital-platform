# 🔴 B3 Intakes Migration Verification (CRITICAL)

**Status:** ⚠️ **REQUIRES MANUAL VERIFICATION**

---

## ⚠️ CRITICAL: Intakes Table Must Exist Before B4

The `intakes` table is in the **Operator UI PostgreSQL database**, not the main app's SQLite database.

**The main app's deploy script does NOT run Prisma migrations.**

---

## ✅ Verification Steps

### Option 1: Quick Status Check (Recommended First)

**On production EC2 instance:**

```bash
# SSH to EC2
ssh -i ~/.ssh/id_ed25519 ec2-user@<EC2_IP>

# Navigate to Operator UI (adjust path if different)
cd /opt/ifd-app/operator-ui  # OR wherever Operator UI is deployed

# Make scripts executable
chmod +x scripts/*.sh

# Quick check
./scripts/check-migration-status.sh
```

**Expected Output:**
```
✅ 'intakes' table EXISTS
   Row count: X
   Index count: 3
✅ Migration appears complete
```

**If table is MISSING:**
```
❌ 'intakes' table MISSING
⚠️  ACTION REQUIRED: Run: npm run db:migrate
```

---

### Option 2: Full Verification

**Run full verification script:**

```bash
cd /opt/ifd-app/operator-ui
./scripts/verify-intakes-migration.sh
```

**This checks:**
- ✅ Table exists
- ✅ All required columns present
- ✅ Indexes created
- ✅ Schema matches B3 requirements

---

### Option 3: Manual PostgreSQL Check

**Connect directly to PostgreSQL:**

```bash
# Load DATABASE_URL from .env
cd /opt/ifd-app/operator-ui
source .env  # Or export DATABASE_URL=...

# Connect and check
psql "$DATABASE_URL" -c "\d intakes"
```

**Expected output should show:**
- Table `intakes` with columns:
  - `id` (uuid)
  - `org_id` (uuid, nullable)
  - `name` (text, nullable)
  - `email` (citext)
  - `intent` (text)
  - `preferences` (jsonb, nullable)
  - `status` (text, default 'new')
  - `assigned_user_id` (uuid, nullable)
  - `created_at` (timestamptz)
  - `first_contact_at` (timestamptz, nullable)
  - `last_activity_at` (timestamptz, nullable)
  - `notes` (text, nullable)

**And indexes:**
- `intakes_intent_status_created_at_idx`
- `intakes_assigned_user_id_status_idx`
- `intakes_created_at_idx`

---

## 🚀 Running Migration (If Needed)

**If table does NOT exist, run migration:**

```bash
cd /opt/ifd-app/operator-ui

# Ensure DATABASE_URL is set
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
# OR load from .env
source .env

# Run migration
npm run db:migrate
```

**Or use the helper script:**

```bash
chmod +x scripts/run-intakes-migration.sh
./scripts/run-intakes-migration.sh
```

**Migration will:**
1. Generate Prisma Client
2. Create migration files
3. Apply migration to database
4. Create `intakes` table with all columns and indexes

---

## ✅ Verification Checklist

Before proceeding to B4, confirm:

- [ ] `intakes` table exists in production PostgreSQL
- [ ] All required columns are present (12 columns)
- [ ] All indexes are created (3 indexes)
- [ ] No migration errors in logs
- [ ] Can insert a test row (optional verification)

**Test insert (optional, clean up after):**

```sql
INSERT INTO intakes (id, email, intent, status, created_at)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  'launch',
  'new',
  NOW()
);

-- Verify
SELECT * FROM intakes WHERE email = 'test@example.com';

-- Clean up
DELETE FROM intakes WHERE email = 'test@example.com';
```

---

## 🔍 Troubleshooting

### Error: "DATABASE_URL not set"

**Solution:**
```bash
# Check if .env exists
ls -la /opt/ifd-app/operator-ui/.env

# Load from .env
cd /opt/ifd-app/operator-ui
export $(grep -v '^#' .env | grep DATABASE_URL | xargs)

# Or set manually
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

### Error: "relation intakes does not exist"

**Solution:** Migration has not been run. Run:
```bash
npm run db:migrate
```

### Error: "Migration already applied"

**Solution:** This is fine. The table exists. Verify with:
```bash
./scripts/verify-intakes-migration.sh
```

### Error: "Permission denied"

**Solution:** Ensure PostgreSQL user has CREATE TABLE permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE your_db TO your_user;
```

---

## 📝 Migration Logs

**Check Prisma migration status:**

```bash
cd /opt/ifd-app/operator-ui
npx prisma migrate status
```

**Expected output:**
```
Database schema is up to date!
```

**If migrations are pending:**
```
X migrations found in prisma/migrations
X migrations have been applied to database
```

---

## ⚠️ IMPORTANT NOTES

1. **Operator UI is separate from main app**
   - Main app uses SQLite (`/opt/ifd-data/ifd.db`)
   - Operator UI uses PostgreSQL (via `DATABASE_URL`)
   - Deploy script for main app does NOT run Prisma migrations

2. **Migration must be run manually** (or via separate CI/CD)
   - First time: `npm run db:migrate`
   - Future: Prisma tracks applied migrations

3. **Backup before migration** (recommended):
   ```bash
   pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

4. **Seed after migration** (optional):
   ```bash
   npm run db:seed
   ```

---

## ✅ Confirmation

**Once verified, confirm:**

- [ ] `intakes` table exists
- [ ] All columns present
- [ ] All indexes created
- [ ] No errors in migration logs

**Then reply:** "B3 migration verified - intakes table exists in production"

---

**Last Updated:** $(date)  
**Status:** Awaiting verification


