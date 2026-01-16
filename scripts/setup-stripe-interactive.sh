#!/usr/bin/env bash
# Interactive Stripe Setup Script
# Guides you through Stripe product creation and .env configuration

set -euo pipefail

ENV_FILE="${1:-/opt/ifd-app/.env}"

echo "=========================================="
echo "  Stripe Setup for Phase B4"
echo "=========================================="
echo ""
echo "This script will guide you through:"
echo "  1. Creating products in Stripe Dashboard"
echo "  2. Collecting Price IDs"
echo "  3. Updating production .env file"
echo ""
read -p "Press Enter to continue..."
echo ""

# Check if .env exists
if [[ ! -f "$ENV_FILE" ]]; then
  echo "⚠️  .env file not found: $ENV_FILE"
  read -p "Create new .env file? (yes/no): " create_env
  if [[ "$create_env" == "yes" ]]; then
    touch "$ENV_FILE"
    echo "Created $ENV_FILE"
  else
    echo "Exiting. Please create .env file first."
    exit 1
  fi
fi

echo "Step 1: Stripe Dashboard Setup"
echo "=============================="
echo ""
echo "You need to create 5 products in Stripe Dashboard (Test Mode)."
echo ""
echo "Open: https://dashboard.stripe.com/test/products"
echo ""
echo "Ensure you're in TEST MODE (toggle in top right)"
echo ""
read -p "Press Enter when you have Stripe Dashboard open..."
echo ""

# Function to collect price ID
collect_price_id() {
  local product_name=$1
  local price_amount=$2
  local price_type=$3
  
  echo ""
  echo "Creating: $product_name"
  echo "  Price: $price_amount"
  echo "  Type: $price_type"
  echo ""
  echo "In Stripe Dashboard:"
  echo "  1. Click 'Add product'"
  echo "  2. Name: '$product_name'"
  echo "  3. Description: 'Platform access tier'"
  echo "  4. Pricing: $price_type"
  echo "  5. Amount: $price_amount"
  if [[ "$price_type" == "Recurring" ]]; then
    echo "  6. Billing period: Monthly"
  fi
  echo "  7. Click 'Save product'"
  echo "  8. Copy the Price ID (starts with 'price_')"
  echo ""
  
  while true; do
    read -p "Enter Price ID for $product_name (or 'skip' to skip): " price_id
    
    if [[ "$price_id" == "skip" ]]; then
      echo "Skipped $product_name"
      return 1
    fi
    
    if [[ -z "$price_id" ]]; then
      echo "Price ID cannot be empty. Try again."
      continue
    fi
    
    if [[ ! "$price_id" =~ ^price_ ]]; then
      echo "⚠️  Warning: Price ID should start with 'price_'"
      read -p "Continue anyway? (yes/no): " confirm
      if [[ "$confirm" != "yes" ]]; then
        continue
      fi
    fi
    
    echo "$price_id"
    return 0
  done
}

# Collect all price IDs
declare -A PRICE_IDS

echo "Collecting Price IDs..."
echo ""

PRICE_IDS[INDIVIDUAL]=$(collect_price_id "Individual Operator" "\$99.00" "Recurring")
if [[ $? -eq 0 ]]; then
  PRICE_IDS[INDIVIDUAL]="${PRICE_IDS[INDIVIDUAL]}"
else
  PRICE_IDS[INDIVIDUAL]=""
fi

PRICE_IDS[BUILDER]=$(collect_price_id "Builder" "\$299.00" "Recurring")
if [[ $? -eq 0 ]]; then
  PRICE_IDS[BUILDER]="${PRICE_IDS[BUILDER]}"
else
  PRICE_IDS[BUILDER]=""
fi

PRICE_IDS[ADVANCED]=$(collect_price_id "Advanced Operator" "\$599.00" "Recurring")
if [[ $? -eq 0 ]]; then
  PRICE_IDS[ADVANCED]="${PRICE_IDS[ADVANCED]}"
else
  PRICE_IDS[ADVANCED]=""
fi

PRICE_IDS[ORGANIZATION]=$(collect_price_id "Organization / Leader" "\$999.00" "Recurring")
if [[ $? -eq 0 ]]; then
  PRICE_IDS[ORGANIZATION]="${PRICE_IDS[ORGANIZATION]}"
else
  PRICE_IDS[ORGANIZATION]=""
fi

PRICE_IDS[FRANCHISE]=$(collect_price_id "Franchise License" "\$10,000.00" "One-time")
if [[ $? -eq 0 ]]; then
  PRICE_IDS[FRANCHISE]="${PRICE_IDS[FRANCHISE]}"
else
  PRICE_IDS[FRANCHISE]=""
fi

echo ""
echo "Step 2: Verify Stripe API Keys"
echo "==============================="
echo ""

# Check existing keys
if grep -q "STRIPE_SECRET_KEY" "$ENV_FILE"; then
  EXISTING_SECRET=$(grep "^STRIPE_SECRET_KEY=" "$ENV_FILE" | cut -d'=' -f2-)
  if [[ "$EXISTING_SECRET" =~ ^sk_test_ ]]; then
    echo "✅ STRIPE_SECRET_KEY found (Test Mode)"
  elif [[ "$EXISTING_SECRET" =~ ^sk_live_ ]]; then
    echo "⚠️  STRIPE_SECRET_KEY found (LIVE MODE - ensure this is intentional)"
  else
    echo "⚠️  STRIPE_SECRET_KEY found but format unclear"
  fi
else
  echo "❌ STRIPE_SECRET_KEY not found in .env"
  read -p "Enter Stripe Secret Key (sk_test_...): " secret_key
  if [[ -n "$secret_key" ]]; then
    echo "STRIPE_SECRET_KEY=$secret_key" >> "$ENV_FILE"
  fi
fi

if grep -q "STRIPE_PUBLISHABLE_KEY" "$ENV_FILE"; then
  EXISTING_PUB=$(grep "^STRIPE_PUBLISHABLE_KEY=" "$ENV_FILE" | cut -d'=' -f2-)
  if [[ "$EXISTING_PUB" =~ ^pk_test_ ]]; then
    echo "✅ STRIPE_PUBLISHABLE_KEY found (Test Mode)"
  elif [[ "$EXISTING_PUB" =~ ^pk_live_ ]]; then
    echo "⚠️  STRIPE_PUBLISHABLE_KEY found (LIVE MODE - ensure this is intentional)"
  else
    echo "⚠️  STRIPE_PUBLISHABLE_KEY found but format unclear"
  fi
else
  echo "❌ STRIPE_PUBLISHABLE_KEY not found in .env"
  read -p "Enter Stripe Publishable Key (pk_test_...): " pub_key
  if [[ -n "$pub_key" ]]; then
    echo "STRIPE_PUBLISHABLE_KEY=$pub_key" >> "$ENV_FILE"
  fi
fi

echo ""
echo "Step 3: Update .env File"
echo "========================"
echo ""

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

echo "Updating .env file with Price IDs..."
echo ""

if [[ -n "${PRICE_IDS[INDIVIDUAL]}" ]]; then
  update_env_var "STRIPE_PRICE_INDIVIDUAL" "${PRICE_IDS[INDIVIDUAL]}"
fi

if [[ -n "${PRICE_IDS[BUILDER]}" ]]; then
  update_env_var "STRIPE_PRICE_BUILDER" "${PRICE_IDS[BUILDER]}"
fi

if [[ -n "${PRICE_IDS[ADVANCED]}" ]]; then
  update_env_var "STRIPE_PRICE_ADVANCED" "${PRICE_IDS[ADVANCED]}"
fi

if [[ -n "${PRICE_IDS[ORGANIZATION]}" ]]; then
  update_env_var "STRIPE_PRICE_ORGANIZATION" "${PRICE_IDS[ORGANIZATION]}"
fi

if [[ -n "${PRICE_IDS[FRANCHISE]}" ]]; then
  update_env_var "STRIPE_PRICE_FRANCHISE" "${PRICE_IDS[FRANCHISE]}"
fi

echo ""
echo "Step 4: Validation"
echo "=================="
echo ""

# Run validation script if it exists
VALIDATION_SCRIPT="$(dirname "$0")/validate-stripe-prices.sh"
if [[ -f "$VALIDATION_SCRIPT" ]]; then
  echo "Running validation..."
  bash "$VALIDATION_SCRIPT" "$ENV_FILE"
  VALIDATION_RESULT=$?
  
  if [[ $VALIDATION_RESULT -eq 0 ]]; then
    echo ""
    echo "✅ Validation passed!"
  else
    echo ""
    echo "⚠️  Validation found issues. Please review above."
  fi
else
  echo "Validation script not found. Skipping validation."
fi

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Verify all Price IDs in .env are correct"
echo "  2. Test Stripe connection (B4 will handle this)"
echo "  3. Proceed with Phase B4"
echo ""
echo "To verify manually, run:"
echo "  ./scripts/validate-stripe-prices.sh $ENV_FILE"
echo ""


