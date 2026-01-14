#!/usr/bin/env bash
# Run B3 Intakes Migration in Production
# Run this on production EC2 instance

set -euo pipefail

echo "=== B3 Intakes Migration Execution ==="
echo ""

# Check if we're in the right directory
if [[ ! -f "prisma/schema.prisma" ]]; then
  echo "❌ ERROR: Must run from operator-ui directory"
  echo "   cd /path/to/operator-ui"
  exit 1
fi

# Check if DATABASE_URL is set
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f ".env" ]]; then
    echo "Loading DATABASE_URL from .env..."
    export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
  else
    echo "❌ ERROR: DATABASE_URL not set and .env not found"
    exit 1
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ ERROR: DATABASE_URL still not set"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Check if DATABASE_URL points to production
if echo "$DATABASE_URL" | grep -q "localhost\|127.0.0.1"; then
  echo "⚠️  WARNING: DATABASE_URL appears to point to localhost"
  echo "   Are you sure this is production?"
  read -p "Continue? (yes/no): " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

echo ""
echo "Running Prisma migration..."
echo ""

# Generate Prisma Client first
echo "1. Generating Prisma Client..."
npm run db:generate

# Run migration
echo ""
echo "2. Running database migration..."
npm run db:migrate

echo ""
echo "=== ✅ MIGRATION COMPLETE ==="
echo ""
echo "Next steps:"
echo "1. Verify migration: ./scripts/verify-intakes-migration.sh"
echo "2. Optionally seed: npm run db:seed"
echo ""

