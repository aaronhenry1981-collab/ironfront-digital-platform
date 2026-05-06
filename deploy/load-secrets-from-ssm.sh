#!/usr/bin/env bash
# Load secrets from AWS SSM Parameter Store into a .env file.
#
# Mirrors the existing DATABASE_URL pattern in deploy.sh, extended to all
# the new env vars (Anthropic, SES, cron, inbound, Sentry).
#
# Usage:
#   ./deploy/load-secrets-from-ssm.sh
# or with overrides:
#   SSM_PREFIX=/ironfront/staging ENV_FILE=./operator-ui/.env.local \
#     ./deploy/load-secrets-from-ssm.sh
#
# Skips any SSM parameter that doesn't exist (so you can selectively
# populate them and re-run safely). Existing values in the .env file
# are replaced for the var being synced.

set -euo pipefail

SSM_PREFIX="${SSM_PREFIX:-/ironfront/prod}"
SSM_REGION="${SSM_REGION:-us-east-2}"
ENV_FILE="${ENV_FILE:-/opt/ifd-app/.env}"

# List of (env-var-name, ssm-suffix) pairs. The full SSM param name is
# constructed as ${SSM_PREFIX}/${ssm-suffix}.
SECRETS=(
  "DATABASE_URL:DATABASE_URL"
  "ADMIN_KEY:ADMIN_KEY"
  "STRIPE_SECRET_KEY:STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET:STRIPE_WEBHOOK_SECRET"
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:STRIPE_PUBLISHABLE_KEY"
  "ANTHROPIC_API_KEY:ANTHROPIC_API_KEY"
  "CLAUDE_MODEL:CLAUDE_MODEL"
  "AWS_SES_FROM_EMAIL:AWS_SES_FROM_EMAIL"
  "AWS_SES_REPLY_TO_DOMAIN:AWS_SES_REPLY_TO_DOMAIN"
  "INBOUND_EMAIL_SECRET:INBOUND_EMAIL_SECRET"
  "CRON_SECRET:CRON_SECRET"
  "SENTRY_DSN:SENTRY_DSN"
  "NEXT_PUBLIC_SENTRY_DSN:SENTRY_DSN"
)

if ! command -v aws >/dev/null 2>&1; then
  echo "[load-secrets] aws CLI not found; aborting"
  exit 1
fi

mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

write_var() {
  local name="$1"
  local value="$2"
  # Remove any existing line(s) for this var, then append the new value.
  if grep -q "^${name}=" "$ENV_FILE" 2>/dev/null; then
    grep -v "^${name}=" "$ENV_FILE" > "${ENV_FILE}.tmp" || true
    mv "${ENV_FILE}.tmp" "$ENV_FILE"
  fi
  # Quote the value to preserve special characters.
  printf '%s=%q\n' "$name" "$value" >> "$ENV_FILE"
}

loaded=0
skipped=0
for entry in "${SECRETS[@]}"; do
  env_name="${entry%%:*}"
  ssm_suffix="${entry##*:}"
  ssm_param="${SSM_PREFIX}/${ssm_suffix}"

  value="$(aws ssm get-parameter \
    --name "$ssm_param" \
    --with-decryption \
    --query Parameter.Value \
    --output text \
    --region "$SSM_REGION" 2>/dev/null || echo "")"

  if [[ -n "$value" && "$value" != "None" ]]; then
    write_var "$env_name" "$value"
    echo "[load-secrets] loaded ${env_name} from ${ssm_param}"
    loaded=$((loaded + 1))
  else
    skipped=$((skipped + 1))
  fi
done

chmod 600 "$ENV_FILE"

echo ""
echo "[load-secrets] done: loaded=${loaded}, skipped=${skipped}"
echo "[load-secrets] env file: ${ENV_FILE}"
echo "[load-secrets] SSM prefix: ${SSM_PREFIX}"
