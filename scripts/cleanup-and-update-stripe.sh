#!/usr/bin/env bash
# Complete Stripe Cleanup and Update
# 1. Lists all products
# 2. Updates products with correct definitions
# 3. Archives unused products

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${1:-$PROJECT_ROOT/.env}"

echo "=========================================="
echo "  Stripe Cleanup and Update"
echo "=========================================="
echo ""

# Load .env
if [[ -f "$ENV_FILE" ]]; then
  export $(grep -v '^#' "$ENV_FILE" | grep STRIPE_SECRET_KEY | xargs)
fi

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "❌ ERROR: STRIPE_SECRET_KEY not found"
  exit 1
fi

echo "Step 1: List Current Products"
echo "=============================="
echo ""
./scripts/list-stripe-products.sh "$ENV_FILE"
echo ""

echo "Step 2: Update Products with Correct Definitions"
echo "=================================================="
echo ""
node "$SCRIPT_DIR/update-stripe-products.mjs"
echo ""

echo "Step 3: Clean Up Unused Products"
echo "=================================="
echo ""
read -p "Archive unused products? (yes/no): " cleanup
if [[ "$cleanup" == "yes" ]]; then
  ./scripts/cleanup-stripe-products.sh "$ENV_FILE"
else
  echo "Skipping cleanup."
fi

echo ""
echo "✅ Complete!"






