#!/bin/bash
# Initialize .env file with required variables
# This ensures all required environment variables have values or placeholders

set -euo pipefail

APP_DIR="/opt/ifd-app"
ENV_FILE="${APP_DIR}/.env"

echo "[init-env] Initializing .env file: $ENV_FILE"

# Create .env file if it doesn't exist
mkdir -p "$APP_DIR"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

# Check if DATABASE_URL is set, if not add placeholder
if ! grep -q "^DATABASE_URL=" "$ENV_FILE" 2>/dev/null; then
  echo "[init-env] DATABASE_URL not found, adding placeholder"
  echo "# PostgreSQL connection string for authentication" >> "$ENV_FILE"
  echo "# Format: postgresql://username:password@host:5432/database_name" >> "$ENV_FILE"
  echo "# This is required for authentication to work" >> "$ENV_FILE"
  echo "# DATABASE_URL=postgresql://user:password@host:5432/dbname" >> "$ENV_FILE"
  echo ""
fi

# Ensure other common env vars exist with defaults or placeholders
if ! grep -q "^STRIPE_SECRET_KEY=" "$ENV_FILE" 2>/dev/null; then
  echo "# Stripe secret key (optional)" >> "$ENV_FILE"
  echo "# STRIPE_SECRET_KEY=sk_live_..." >> "$ENV_FILE"
  echo ""
fi

if ! grep -q "^STRIPE_WEBHOOK_SECRET=" "$ENV_FILE" 2>/dev/null; then
  echo "# Stripe webhook secret (optional)" >> "$ENV_FILE"
  echo "# STRIPE_WEBHOOK_SECRET=whsec_..." >> "$ENV_FILE"
  echo ""
fi

echo "[init-env] .env file initialized"
echo "[init-env] Check $ENV_FILE and set required values (especially DATABASE_URL)"

