#!/bin/bash
# Initialize .env file with required + optional variable placeholders.
# Run this once on a fresh server before the first deploy.

set -euo pipefail

APP_DIR="/opt/ifd-app"
ENV_FILE="${APP_DIR}/.env"

echo "[init-env] Initializing .env file: $ENV_FILE"

mkdir -p "$APP_DIR"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

# Helper: append a variable with a comment header and placeholder if not set
append_if_missing() {
  local var_name="$1"
  local comment="$2"
  local placeholder="$3"
  if ! grep -q "^${var_name}=" "$ENV_FILE" 2>/dev/null \
    && ! grep -q "^# ${var_name}=" "$ENV_FILE" 2>/dev/null; then
    {
      echo ""
      echo "# ${comment}"
      echo "# ${var_name}=${placeholder}"
    } >> "$ENV_FILE"
    echo "[init-env] added placeholder: ${var_name}"
  fi
}

# ============ REQUIRED ============

append_if_missing "DATABASE_URL" \
  "PostgreSQL connection string. Both apps share this DB." \
  "postgresql://user:password@host:5432/ifd"

append_if_missing "APP_VERSION" \
  "Build version stamp. Legacy app server hard-fails on startup if missing." \
  "set-by-deploy-pipeline"

append_if_missing "APP_URL" \
  "Public app URL (used for magic-link redirects, Stripe success_url)." \
  "https://ironfrontdigital.com"

append_if_missing "NEXT_PUBLIC_APP_URL" \
  "Same as APP_URL, exposed to the browser." \
  "https://ironfrontdigital.com"

append_if_missing "ADMIN_KEY" \
  "Required header value (x-admin-key) for /admin/* endpoints (legacy app)." \
  "replace-with-random-string"

# ============ STRIPE ============

append_if_missing "STRIPE_SECRET_KEY" \
  "Stripe API secret key (server-side only)." \
  "sk_live_..."

append_if_missing "STRIPE_WEBHOOK_SECRET" \
  "Stripe webhook signing secret (whsec_...)." \
  "whsec_..."

append_if_missing "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" \
  "Stripe publishable key for the browser." \
  "pk_live_..."

# Price IDs are managed separately (see scripts/create-stripe-products-*.mjs)
# Add them here when you have them.

# ============ CLAUDE LLM (optional) ============

append_if_missing "ANTHROPIC_API_KEY" \
  "Anthropic API key for next-touch drafting. When unset, drafter returns 503 cleanly." \
  "sk-ant-..."

append_if_missing "CLAUDE_MODEL" \
  "Default claude-sonnet-4-6. Set to claude-opus-4-7 to upgrade." \
  "claude-sonnet-4-6"

# ============ AWS SES (optional - falls back to console.log when unset) ============

append_if_missing "AWS_REGION" \
  "AWS region for SES. Already set if running on AWS with default credential chain." \
  "us-east-1"

append_if_missing "AWS_SES_FROM_EMAIL" \
  "Verified sender for outbound email. Format: 'Display Name <addr@domain>'." \
  "Iron Front Digital <hello@ironfrontdigital.com>"

append_if_missing "AWS_SES_REPLY_TO_DOMAIN" \
  "Domain for reply-to addresses (intake-<id>@<domain>). Enables inbound threading." \
  "operations.ironfrontdigital.com"

# ============ Inbound email webhook (optional) ============

append_if_missing "INBOUND_EMAIL_SECRET" \
  "Shared secret between SES Lambda forwarder and /api/inbound/email." \
  "replace-with-random-string"

# ============ Cron / scheduled jobs ============

append_if_missing "CRON_SECRET" \
  "Required by POST /api/cron/run-jobs (x-cron-secret header)." \
  "replace-with-random-string"

# ============ Sentry (optional) ============

append_if_missing "SENTRY_DSN" \
  "Server-side error tracking. No-op if unset." \
  "https://...@sentry.io/..."

append_if_missing "NEXT_PUBLIC_SENTRY_DSN" \
  "Browser-side error tracking. Same DSN as SENTRY_DSN is fine." \
  "https://...@sentry.io/..."

# ============ Org IDs (rarely needed) ============

append_if_missing "INTAKE_ORG_ID" \
  "UUID of the system intake org. Override only if you've changed the seed." \
  "00000000-0000-0000-0000-000000000002"

echo ""
echo "[init-env] .env file initialized."
echo "[init-env] Edit ${ENV_FILE} and uncomment + fill any vars you need."
echo "[init-env] Required: DATABASE_URL, APP_VERSION, ADMIN_KEY"
echo "[init-env] Strongly recommended: STRIPE_*, ANTHROPIC_API_KEY, AWS_SES_*, CRON_SECRET"
