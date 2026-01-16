#!/usr/bin/env bash
# Verify B3 Intakes Migration Status
# Run this on production EC2 instance

set -euo pipefail

echo "=== B3 Intakes Migration Verification ==="
echo ""

# Check if DATABASE_URL is set
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ ERROR: DATABASE_URL not set"
  echo "   Set it in .env or export it:"
  echo "   export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Check if intakes table exists
echo "Checking if 'intakes' table exists..."
TABLE_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'intakes'
);" 2>/dev/null || echo "false")

if [[ "$TABLE_EXISTS" == *"t"* ]] || [[ "$TABLE_EXISTS" == *"true"* ]]; then
  echo "✅ 'intakes' table EXISTS"
else
  echo "❌ 'intakes' table DOES NOT EXIST"
  echo ""
  echo "⚠️  MIGRATION REQUIRED"
  echo ""
  echo "Run migration with:"
  echo "  npm run db:migrate"
  exit 1
fi

echo ""

# Check indexes
echo "Checking indexes..."
INDEXES=$(psql "$DATABASE_URL" -tAc "
  SELECT indexname 
  FROM pg_indexes 
  WHERE tablename = 'intakes';
" 2>/dev/null || echo "")

if [[ -z "$INDEXES" ]]; then
  echo "⚠️  WARNING: No indexes found on 'intakes' table"
  echo "   Migration may not have completed fully"
else
  echo "✅ Indexes found:"
  echo "$INDEXES" | while read -r idx; do
    if [[ -n "$idx" ]]; then
      echo "   - $idx"
    fi
  done
fi

echo ""

# Check columns
echo "Checking required columns..."
COLUMNS=$(psql "$DATABASE_URL" -tAc "
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'intakes'
  ORDER BY ordinal_position;
" 2>/dev/null || echo "")

REQUIRED_COLS=("id" "org_id" "name" "email" "intent" "preferences" "status" "assigned_user_id" "created_at" "first_contact_at" "last_activity_at" "notes")

MISSING_COLS=()
for col in "${REQUIRED_COLS[@]}"; do
  if ! echo "$COLUMNS" | grep -q "^${col}$"; then
    MISSING_COLS+=("$col")
  fi
done

if [[ ${#MISSING_COLS[@]} -eq 0 ]]; then
  echo "✅ All required columns present"
else
  echo "❌ Missing columns:"
  for col in "${MISSING_COLS[@]}"; do
    echo "   - $col"
  done
  echo ""
  echo "⚠️  MIGRATION REQUIRED"
  exit 1
fi

echo ""
echo "=== ✅ MIGRATION VERIFICATION COMPLETE ==="
echo ""
echo "The 'intakes' table is ready for B4."
echo ""


