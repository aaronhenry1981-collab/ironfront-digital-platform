#!/usr/bin/env bash
# List All Stripe Products
# Shows what products exist in Stripe

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
echo "  Stripe Products List"
echo "=========================================="
echo ""

node -e "
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

(async () => {
  const products = await stripe.products.list({ limit: 100 });
  
  console.log('Total products:', products.data.length);
  console.log('');
  
  for (const product of products.data) {
    console.log('Product:', product.name);
    console.log('  ID:', product.id);
    console.log('  Active:', product.active);
    console.log('  Description:', product.description || '(none)');
    
    // Get prices for this product
    const prices = await stripe.prices.list({ product: product.id, limit: 10 });
    for (const price of prices.data) {
      const amount = (price.unit_amount / 100).toFixed(2);
      const currency = price.currency.toUpperCase();
      const interval = price.recurring ? price.recurring.interval : 'one-time';
      console.log('  Price:', currency + ' ' + amount, '(' + interval + ') -', price.id);
    }
    console.log('');
  }
})();
" 2>&1






