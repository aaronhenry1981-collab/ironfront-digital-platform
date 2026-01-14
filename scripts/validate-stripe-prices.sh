#!/usr/bin/env bash
# Validate Stripe Price IDs in .env
# Run this on production EC2 instance

set -euo pipefail

ENV_FILE="${1:-/opt/ifd-app/.env}"

echo "=== Stripe Price ID Validation ==="
echo "Checking: $ENV_FILE"
echo ""

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ ERROR: .env file not found: $ENV_FILE"
  exit 1
fi

# Load .env
set -a
source "$ENV_FILE"
set +a

# Check if all price IDs are set
MISSING=0
INVALID=0

check_price() {
  local var=$1
  local name=$2
  
  if [[ -z "${!var:-}" ]]; then
    echo "❌ $name: NOT SET"
    MISSING=$((MISSING + 1))
  elif [[ "${!var}" =~ ^price_ ]]; then
    echo "✅ $name: ${!var:0:20}..." # Show first 20 chars
  else
    echo "⚠️  $name: Invalid format (should start with 'price_')"
    echo "    Current value: ${!var:0:30}..."
    INVALID=$((INVALID + 1))
  fi
}

echo "Price IDs:"
check_price "STRIPE_PRICE_INDIVIDUAL" "  Individual Operator"
check_price "STRIPE_PRICE_BUILDER" "  Builder"
check_price "STRIPE_PRICE_ORGANIZATION" "  Org Leader"
check_price "STRIPE_PRICE_STARTER" "  Starter (LaunchPath)"
check_price "STRIPE_PRICE_GROWTH" "  Growth (LaunchPath)"
check_price "STRIPE_PRICE_SCALE" "  Scale (LaunchPath)"
check_price "STRIPE_PRICE_FRANCHISE" "  Franchise License"

echo ""
echo "API Keys:"

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "❌ STRIPE_SECRET_KEY: NOT SET"
  MISSING=$((MISSING + 1))
elif [[ "${STRIPE_SECRET_KEY}" =~ ^sk_test_ ]]; then
  echo "✅ STRIPE_SECRET_KEY: Test mode (${STRIPE_SECRET_KEY:0:15}...)"
elif [[ "${STRIPE_SECRET_KEY}" =~ ^sk_live_ ]]; then
  echo "⚠️  STRIPE_SECRET_KEY: LIVE MODE (${STRIPE_SECRET_KEY:0:15}...)"
  echo "    ⚠️  WARNING: Live mode detected. Ensure this is intentional."
else
  echo "⚠️  STRIPE_SECRET_KEY: Invalid format"
  INVALID=$((INVALID + 1))
fi

if [[ -z "${STRIPE_PUBLISHABLE_KEY:-}" ]]; then
  echo "❌ STRIPE_PUBLISHABLE_KEY: NOT SET"
  MISSING=$((MISSING + 1))
elif [[ "${STRIPE_PUBLISHABLE_KEY}" =~ ^pk_test_ ]]; then
  echo "✅ STRIPE_PUBLISHABLE_KEY: Test mode (${STRIPE_PUBLISHABLE_KEY:0:15}...)"
elif [[ "${STRIPE_PUBLISHABLE_KEY}" =~ ^pk_live_ ]]; then
  echo "⚠️  STRIPE_PUBLISHABLE_KEY: LIVE MODE (${STRIPE_PUBLISHABLE_KEY:0:15}...)"
  echo "    ⚠️  WARNING: Live mode detected. Ensure this is intentional."
else
  echo "⚠️  STRIPE_PUBLISHABLE_KEY: Invalid format"
  INVALID=$((INVALID + 1))
fi

echo ""
if [[ $MISSING -eq 0 && $INVALID -eq 0 ]]; then
  echo "✅ All Stripe configuration is set correctly"
  exit 0
else
  echo "❌ Validation failed:"
  [[ $MISSING -gt 0 ]] && echo "   - $MISSING missing value(s)"
  [[ $INVALID -gt 0 ]] && echo "   - $INVALID invalid value(s)"
  exit 1
fi

