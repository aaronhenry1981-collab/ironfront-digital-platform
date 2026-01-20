#!/bin/bash
# Setup Supabase PostgreSQL database for authentication
# Run this after creating Supabase project

set -euo pipefail

# Check if DATABASE_URL is set
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ ERROR: DATABASE_URL not set"
  echo ""
  echo "Usage:"
  echo "  DATABASE_URL='postgresql://postgres:password@db.project.supabase.co:5432/postgres?sslmode=require' bash scripts/setup-supabase-db.sh"
  echo ""
  echo "Or set in .env file:"
  echo "  DATABASE_URL=postgresql://..."
  exit 1
fi

echo "=========================================="
echo "Setting up Supabase Database"
echo "=========================================="
echo ""

# Validate connection string
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]] && [[ ! "$DATABASE_URL" =~ ^postgres:// ]]; then
  echo "❌ ERROR: DATABASE_URL must start with 'postgresql://' or 'postgres://'"
  exit 1
fi

# Check if sslmode=require is present
if [[ ! "$DATABASE_URL" =~ sslmode=require ]]; then
  echo "⚠️  WARNING: Connection string should include '?sslmode=require' for Supabase"
  echo "   Adding it automatically..."
  if [[ "$DATABASE_URL" == *"?"* ]]; then
    DATABASE_URL="${DATABASE_URL}&sslmode=require"
  else
    DATABASE_URL="${DATABASE_URL}?sslmode=require"
  fi
  echo "   Updated: ${DATABASE_URL:0:50}..."
fi

echo "✅ Connection string validated"
echo ""

# Test connection
echo "Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
  echo "✅ Database connection successful"
else
  echo "❌ Database connection failed"
  echo "   Check your connection string and Supabase project status"
  exit 1
fi

echo ""
echo "Running Prisma migrations..."
cd "$(dirname "$0")/.." || exit 1

# Run Prisma migrations
if npx prisma migrate deploy; then
  echo "✅ Migrations completed successfully"
else
  echo "❌ Migration failed"
  echo ""
  echo "Trying direct SQL migration..."
  
  # Try applying SQL migration directly
  if [[ -f "prisma/migrations/20250116000000_add_auth_tables/migration.sql" ]]; then
    echo "Applying SQL migration directly..."
    if psql "$DATABASE_URL" -f "prisma/migrations/20250116000000_add_auth_tables/migration.sql"; then
      echo "✅ SQL migration applied successfully"
    else
      echo "❌ SQL migration failed"
      exit 1
    fi
  else
    echo "❌ Migration file not found"
    exit 1
  fi
fi

echo ""
echo "Verifying tables exist..."
TABLES=$(psql "$DATABASE_URL" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'magic_links', 'sessions', 'events');" | tr -d ' ')

REQUIRED_TABLES=("users" "magic_links" "sessions" "events")
MISSING_TABLES=()

for table in "${REQUIRED_TABLES[@]}"; do
  if echo "$TABLES" | grep -q "^${table}$"; then
    echo "✅ Table '${table}' exists"
  else
    echo "❌ Table '${table}' missing"
    MISSING_TABLES+=("$table")
  fi
done

if [[ ${#MISSING_TABLES[@]} -gt 0 ]]; then
  echo ""
  echo "❌ ERROR: Missing required tables: ${MISSING_TABLES[*]}"
  echo "   Please check migration logs above"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ Supabase database setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Set DATABASE_URL in production environment"
echo "2. Use GitHub Actions workflow 'Set DATABASE_URL in Production'"
echo "3. Or add to /opt/ifd-app/.env on server:"
echo "   DATABASE_URL=${DATABASE_URL:0:60}..."
echo "4. Restart container: docker restart ifd-app"
echo "5. Test login: https://ironfrontdigital.com/login"
echo ""

