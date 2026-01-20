#!/bin/bash
# Create and apply Supabase migration
# This ensures all auth tables exist in Supabase

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ ERROR: DATABASE_URL not set"
  echo ""
  echo "Set DATABASE_URL environment variable:"
  echo "  export DATABASE_URL='postgresql://postgres:password@db.project.supabase.co:5432/postgres?sslmode=require'"
  exit 1
fi

cd "$(dirname "$0")/.." || exit 1

echo "=========================================="
echo "Creating Supabase Migration"
echo "=========================================="
echo ""

# Check if tables already exist
echo "Checking existing tables..."
EXISTING_TABLES=$(psql "$DATABASE_URL" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ' || echo "")

if echo "$EXISTING_TABLES" | grep -q "^users$"; then
  echo "⚠️  Table 'users' already exists"
  read -p "Continue anyway? (y/n): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
  fi
fi

# Read the migration SQL
MIGRATION_FILE="prisma/migrations/20250116000000_add_auth_tables/migration.sql"

if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "Applying migration..."
if psql "$DATABASE_URL" -f "$MIGRATION_FILE"; then
  echo "✅ Migration applied successfully"
else
  echo "❌ Migration failed"
  exit 1
fi

echo ""
echo "Verifying tables..."
REQUIRED_TABLES=("users" "magic_links" "sessions" "events" "orgs" "intakes")
ALL_EXIST=true

for table in "${REQUIRED_TABLES[@]}"; do
  if psql "$DATABASE_URL" -t -c "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table';" | grep -q "1"; then
    echo "✅ Table '$table' exists"
  else
    echo "❌ Table '$table' missing"
    ALL_EXIST=false
  fi
done

if [[ "$ALL_EXIST" == "true" ]]; then
  echo ""
  echo "✅ All required tables exist!"
  echo ""
  echo "Database is ready for authentication."
else
  echo ""
  echo "❌ Some tables are missing. Check errors above."
  exit 1
fi

