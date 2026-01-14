#!/usr/bin/env bash
# Create Stripe Products Programmatically via API
# This automates product creation in Stripe Dashboard

set -euo pipefail

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
  echo "⚠️  Stripe CLI not found. Installing..."
  echo ""
  echo "Install Stripe CLI:"
  echo "  macOS: brew install stripe/stripe-cli/stripe"
  echo "  Linux: See https://stripe.com/docs/stripe-cli"
  echo ""
  echo "Or use the API script instead (requires API key)"
  exit 1
fi

# Check if logged in
if ! stripe config --list &> /dev/null; then
  echo "⚠️  Not logged into Stripe CLI"
  echo ""
  echo "Login with:"
  echo "  stripe login"
  exit 1
fi

echo "=========================================="
echo "  Creating Stripe Products (Test Mode)"
echo "=========================================="
echo ""

# Ensure we're in test mode
stripe config --set test_mode true

# Function to create product
create_product() {
  local name=$1
  local description=$2
  local amount=$3
  local currency=$4
  local interval=$5  # month or null for one-time
  
  echo "Creating: $name"
  
  if [[ -n "$interval" ]]; then
    # Recurring product
    stripe products create \
      --name "$name" \
      --description "$description" \
      --type=service \
      --price "$amount" \
      --currency "$currency" \
      --recurring interval="$interval" \
      --expand "default_price" \
      --test-mode
  else
    # One-time product
    stripe products create \
      --name "$name" \
      --description "$description" \
      --type=service \
      --price "$amount" \
      --currency "$currency" \
      --expand "default_price" \
      --test-mode
  fi
}

# Create all products
echo "Creating products..."

INDIVIDUAL=$(create_product "Individual Operator" "Platform access for individual operators" 9900 usd month | jq -r '.default_price.id')
echo "  ✅ Individual Operator: $INDIVIDUAL"

BUILDER=$(create_product "Builder" "Builder tier platform access" 29900 usd month | jq -r '.default_price.id')
echo "  ✅ Builder: $BUILDER"

ADVANCED=$(create_product "Advanced Operator" "Advanced operator platform access" 59900 usd month | jq -r '.default_price.id')
echo "  ✅ Advanced Operator: $ADVANCED"

ORGANIZATION=$(create_product "Organization / Leader" "Organization and leader tier platform access" 99900 usd month | jq -r '.default_price.id')
echo "  ✅ Organization / Leader: $ORGANIZATION"

FRANCHISE=$(create_product "Franchise License" "3-year franchise license (one-time payment)" 1000000 usd "" | jq -r '.default_price.id')
echo "  ✅ Franchise License: $FRANCHISE"

echo ""
echo "=========================================="
echo "  Products Created Successfully!"
echo "=========================================="
echo ""
echo "Price IDs:"
echo "  STRIPE_PRICE_INDIVIDUAL=$INDIVIDUAL"
echo "  STRIPE_PRICE_BUILDER=$BUILDER"
echo "  STRIPE_PRICE_ADVANCED=$ADVANCED"
echo "  STRIPE_PRICE_ORGANIZATION=$ORGANIZATION"
echo "  STRIPE_PRICE_FRANCHISE=$FRANCHISE"
echo ""
echo "Next: Update .env file with these Price IDs"
echo ""

