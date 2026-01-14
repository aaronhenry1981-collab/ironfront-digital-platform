#!/usr/bin/env bash
# Quick Migration Status Check
# Run this on production EC2 instance

set -euo pipefail

echo "=== Quick Migration Status Check ==="
echo ""

# Try to load DATABASE_URL
if [[ -f ".env" ]]; then
  export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL not set"
  echo "   Set it in .env or export it"
  exit 1
fi

# Quick check: does intakes table exist?
echo "Checking 'intakes' table..."
RESULT=$(psql "$DATABASE_URL" -tAc "
  SELECT CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'intakes'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END;
" 2>/dev/null || echo "ERROR")

if [[ "$RESULT" == "EXISTS" ]]; then
  echo "✅ 'intakes' table EXISTS"
  
  # Count rows
  COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM intakes;" 2>/dev/null || echo "0")
  echo "   Row count: $COUNT"
  
  # Check indexes
  IDX_COUNT=$(psql "$DATABASE_URL" -tAc "
    SELECT COUNT(*) 
    FROM pg_indexes 
    WHERE tablename = 'intakes';
  " 2>/dev/null || echo "0")
  echo "   Index count: $IDX_COUNT"
  
  echo ""
  echo "✅ Migration appears complete"
else
  echo "❌ 'intakes' table MISSING"
  echo ""
  echo "⚠️  ACTION REQUIRED:"
  echo "   Run: npm run db:migrate"
  exit 1
fi

