#!/usr/bin/env bash
# Complete Stripe Setup - Creates products AND updates .env
# This is the fully automated version

set -euo pipefail

ENV_FILE="${1:-/opt/ifd-app/.env}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=========================================="
echo "  Complete Stripe Setup (Automated)"
echo "=========================================="
echo ""

# Check if we have Stripe API key
if [[ -f "$ENV_FILE" ]] && grep -q "STRIPE_SECRET_KEY" "$ENV_FILE"; then
  STRIPE_KEY=$(grep "^STRIPE_SECRET_KEY=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  export STRIPE_SECRET_KEY="$STRIPE_KEY"
  echo "✅ Found STRIPE_SECRET_KEY in $ENV_FILE"
else
  echo "⚠️  STRIPE_SECRET_KEY not found in $ENV_FILE"
  read -p "Enter Stripe Secret Key (sk_test_...): " STRIPE_KEY
  if [[ -z "$STRIPE_KEY" ]]; then
    echo "❌ Stripe key required. Exiting."
    exit 1
  fi
  export STRIPE_SECRET_KEY="$STRIPE_KEY"
fi

# Check if we're in test mode
if [[ "$STRIPE_KEY" =~ ^sk_test_ ]]; then
  echo "✅ Test mode detected"
elif [[ "$STRIPE_KEY" =~ ^sk_live_ ]]; then
  echo "⚠️  LIVE MODE detected - are you sure? (Ctrl+C to cancel)"
  sleep 3
else
  echo "⚠️  Key format unclear - proceeding anyway"
fi

echo ""
echo "Step 1: Creating Stripe Products..."
echo "===================================="
echo ""

  # Check if Node.js and stripe package are available
  if command -v node &> /dev/null; then
    # Try annual pricing script first (new structure), then fallback
    SCRIPT_FILE=""
    if [[ -f "$SCRIPT_DIR/update-stripe-products-with-annual.mjs" ]]; then
      SCRIPT_FILE="$SCRIPT_DIR/update-stripe-products-with-annual.mjs"
    elif [[ -f "$SCRIPT_DIR/create-stripe-products-api.mjs" ]]; then
      SCRIPT_FILE="$SCRIPT_DIR/create-stripe-products-api.mjs"
    elif [[ -f "$SCRIPT_DIR/create-stripe-products-api.js" ]]; then
      SCRIPT_FILE="$SCRIPT_DIR/create-stripe-products-api.js"
    fi
    
    if [[ -n "$SCRIPT_FILE" ]]; then
      echo "Using Node.js API script..."
      # Check if stripe package exists, install if needed
      # Try root directory first (for operator-ui), then app directory
      if ! npm list stripe --prefix "$PROJECT_ROOT" &> /dev/null 2>&1 && \
         ! [[ -f "$PROJECT_ROOT/node_modules/stripe/package.json" ]] && \
         ! npm list stripe --prefix "$PROJECT_ROOT/app" &> /dev/null 2>&1 && \
         ! [[ -f "$PROJECT_ROOT/app/node_modules/stripe/package.json" ]]; then
        echo "Installing stripe package..."
        cd "$PROJECT_ROOT"
        npm install stripe --save --no-package-lock 2>&1 | grep -v "npm WARN" || true
      fi
      
      # Use the annual pricing script if available
      if [[ -f "$SCRIPT_DIR/update-stripe-products-with-annual.mjs" ]]; then
        SCRIPT_FILE="$SCRIPT_DIR/update-stripe-products-with-annual.mjs"
      fi
      
      node "$SCRIPT_FILE" > /tmp/stripe-products-output.txt 2>&1
    
    # Extract price IDs from output (support both old and new structure)
    INDIVIDUAL_MONTHLY=$(grep "STRIPE_PRICE_INDIVIDUAL_MONTHLY=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    INDIVIDUAL_ANNUAL=$(grep "STRIPE_PRICE_INDIVIDUAL_ANNUAL=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    INDIVIDUAL=$(grep "STRIPE_PRICE_INDIVIDUAL=" /tmp/stripe-products-output.txt | grep -v "_MONTHLY\|_ANNUAL" | cut -d'=' -f2 || echo "$INDIVIDUAL_MONTHLY")
    
    BUILDER_MONTHLY=$(grep "STRIPE_PRICE_BUILDER_MONTHLY=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    BUILDER_ANNUAL=$(grep "STRIPE_PRICE_BUILDER_ANNUAL=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    BUILDER=$(grep "STRIPE_PRICE_BUILDER=" /tmp/stripe-products-output.txt | grep -v "_MONTHLY\|_ANNUAL" | cut -d'=' -f2 || echo "$BUILDER_MONTHLY")
    
    ORGANIZATION_MONTHLY=$(grep "STRIPE_PRICE_ORGANIZATION_MONTHLY=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    ORGANIZATION_ANNUAL=$(grep "STRIPE_PRICE_ORGANIZATION_ANNUAL=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    ORGANIZATION=$(grep "STRIPE_PRICE_ORGANIZATION=" /tmp/stripe-products-output.txt | grep -v "_MONTHLY\|_ANNUAL" | cut -d'=' -f2 || echo "$ORGANIZATION_MONTHLY")
    
    STARTER_MONTHLY=$(grep "STRIPE_PRICE_STARTER_MONTHLY=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    STARTER_ANNUAL=$(grep "STRIPE_PRICE_STARTER_ANNUAL=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    
    GROWTH_MONTHLY=$(grep "STRIPE_PRICE_GROWTH_MONTHLY=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    GROWTH_ANNUAL=$(grep "STRIPE_PRICE_GROWTH_ANNUAL=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    
    SCALE_MONTHLY=$(grep "STRIPE_PRICE_SCALE_MONTHLY=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    SCALE_ANNUAL=$(grep "STRIPE_PRICE_SCALE_ANNUAL=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    
    FRANCHISE=$(grep "STRIPE_PRICE_FRANCHISE=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    
    cat /tmp/stripe-products-output.txt
    rm -f /tmp/stripe-products-output.txt
  else
    echo "⚠️  Stripe package not found. Installing..."
    cd "$PROJECT_ROOT/app"
    npm install stripe --save --no-package-lock 2>&1 | grep -v "npm WARN" || true
    node "$SCRIPT_DIR/create-stripe-products-api.js" > /tmp/stripe-products-output.txt 2>&1
    
    INDIVIDUAL=$(grep "STRIPE_PRICE_INDIVIDUAL=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    BUILDER=$(grep "STRIPE_PRICE_BUILDER=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    ADVANCED=$(grep "STRIPE_PRICE_ADVANCED=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    ORGANIZATION=$(grep "STRIPE_PRICE_ORGANIZATION=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    FRANCHISE=$(grep "STRIPE_PRICE_FRANCHISE=" /tmp/stripe-products-output.txt | cut -d'=' -f2 || echo "")
    
    cat /tmp/stripe-products-output.txt
    rm -f /tmp/stripe-products-output.txt
  fi
else
  echo "❌ Node.js not found. Cannot create products via API."
  echo ""
  echo "Alternative: Use Stripe Dashboard manually:"
  echo "  1. Go to https://dashboard.stripe.com/test/products"
  echo "  2. Create products as documented in STRIPE_SETUP_B4.md"
  echo "  3. Run: ./scripts/setup-stripe-interactive.sh $ENV_FILE"
  exit 1
fi

echo ""
echo "Step 2: Updating .env file..."
echo "=============================="
echo ""

# Check if we got at least some price IDs
if [[ -z "$INDIVIDUAL_MONTHLY" ]] && [[ -z "$INDIVIDUAL" ]]; then
  echo "⚠️  Could not create products. Please check output above."
  echo "   You may need to create products manually in Stripe Dashboard."
  exit 1
fi

# Ensure .env exists
touch "$ENV_FILE"

# Function to update or add env variable
update_env_var() {
  local var_name=$1
  local var_value=$2
  
  if grep -q "^${var_name}=" "$ENV_FILE"; then
    # Update existing
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^${var_name}=.*|${var_name}=${var_value}|" "$ENV_FILE"
    else
      sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" "$ENV_FILE"
    fi
    echo "  Updated: $var_name"
  else
    # Add new
    echo "${var_name}=${var_value}" >> "$ENV_FILE"
    echo "  Added: $var_name"
  fi
}

# Update monthly prices (use monthly if available, fallback to old structure)
if [[ -n "$INDIVIDUAL_MONTHLY" ]]; then
  update_env_var "STRIPE_PRICE_INDIVIDUAL_MONTHLY" "$INDIVIDUAL_MONTHLY"
  update_env_var "STRIPE_PRICE_INDIVIDUAL_ANNUAL" "$INDIVIDUAL_ANNUAL"
  update_env_var "STRIPE_PRICE_BUILDER_MONTHLY" "$BUILDER_MONTHLY"
  update_env_var "STRIPE_PRICE_BUILDER_ANNUAL" "$BUILDER_ANNUAL"
  update_env_var "STRIPE_PRICE_ORGANIZATION_MONTHLY" "$ORGANIZATION_MONTHLY"
  update_env_var "STRIPE_PRICE_ORGANIZATION_ANNUAL" "$ORGANIZATION_ANNUAL"
  update_env_var "STRIPE_PRICE_STARTER_MONTHLY" "$STARTER_MONTHLY"
  update_env_var "STRIPE_PRICE_STARTER_ANNUAL" "$STARTER_ANNUAL"
  update_env_var "STRIPE_PRICE_GROWTH_MONTHLY" "$GROWTH_MONTHLY"
  update_env_var "STRIPE_PRICE_GROWTH_ANNUAL" "$GROWTH_ANNUAL"
  update_env_var "STRIPE_PRICE_SCALE_MONTHLY" "$SCALE_MONTHLY"
  update_env_var "STRIPE_PRICE_SCALE_ANNUAL" "$SCALE_ANNUAL"
else
  # Fallback to old structure for compatibility
  update_env_var "STRIPE_PRICE_INDIVIDUAL" "$INDIVIDUAL"
  update_env_var "STRIPE_PRICE_BUILDER" "$BUILDER"
  update_env_var "STRIPE_PRICE_ORGANIZATION" "$ORGANIZATION"
fi

update_env_var "STRIPE_PRICE_FRANCHISE" "$FRANCHISE"

echo ""
echo "Step 3: Validation..."
echo "====================="
echo ""

VALIDATION_SCRIPT="$SCRIPT_DIR/validate-stripe-prices.sh"
if [[ -f "$VALIDATION_SCRIPT" ]]; then
  bash "$VALIDATION_SCRIPT" "$ENV_FILE"
  VALIDATION_RESULT=$?
  
  if [[ $VALIDATION_RESULT -eq 0 ]]; then
    echo ""
    echo "=========================================="
    echo "  ✅ Setup Complete!"
    echo "=========================================="
    echo ""
    echo "All products created and configured."
    echo "Ready for Phase B4!"
  else
    echo ""
    echo "⚠️  Validation found issues. Please review above."
    exit 1
  fi
else
  echo "Validation script not found. Please verify manually."
fi

