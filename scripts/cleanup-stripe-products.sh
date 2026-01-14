#!/usr/bin/env bash
# Cleanup Unused Stripe Products
# Removes all products except the ones we're actively using

set -euo pipefail

# Load .env if exists
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${1:-$PROJECT_ROOT/.env}"

if [[ -f "$ENV_FILE" ]]; then
  export $(grep -v '^#' "$ENV_FILE" | grep STRIPE_SECRET_KEY | xargs)
fi

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "❌ ERROR: STRIPE_SECRET_KEY not found"
  echo "   Set it in .env or environment"
  exit 1
fi

echo "=========================================="
echo "  Stripe Products Cleanup"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This will archive unused products in Stripe"
echo "   Products will be archived (not deleted) and can be restored"
echo ""
read -p "Continue? (yes/no): " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Fetching products from Stripe..."

# Use Node.js script to list and archive products
node -e "
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

(async () => {
  // Get active products we're using from .env
  const activePriceIds = [
    process.env.STRIPE_PRICE_INDIVIDUAL,
    process.env.STRIPE_PRICE_BUILDER,
    process.env.STRIPE_PRICE_ADVANCED,
    process.env.STRIPE_PRICE_ORGANIZATION,
    process.env.STRIPE_PRICE_FRANCHISE,
  ].filter(Boolean);

  console.log('Active Price IDs:', activePriceIds);
  console.log('');

  // Get all products
  const products = await stripe.products.list({ limit: 100, active: true });
  
  const activeProductIds = new Set();
  
  // Find product IDs for our active prices
  for (const priceId of activePriceIds) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (price.product) {
        activeProductIds.add(price.product);
      }
    } catch (e) {
      console.error('Error fetching price', priceId, ':', e.message);
    }
  }

  console.log('Active Product IDs:', Array.from(activeProductIds));
  console.log('');

  let archived = 0;
  let kept = 0;

  for (const product of products.data) {
    if (activeProductIds.has(product.id)) {
      console.log('✅ KEEPING:', product.name, '(' + product.id + ')');
      kept++;
    } else {
      console.log('🗑️  ARCHIVING:', product.name, '(' + product.id + ')');
      try {
        await stripe.products.update(product.id, { active: false });
        archived++;
      } catch (e) {
        console.error('  Error archiving:', e.message);
      }
    }
  }

  console.log('');
  console.log('Summary:');
  console.log('  Kept:', kept);
  console.log('  Archived:', archived);
})();
" 2>&1

echo ""
echo "✅ Cleanup complete!"

