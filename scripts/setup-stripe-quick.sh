#!/usr/bin/env bash
# Quick Stripe Setup - Non-interactive version
# Use this if you already have Price IDs ready

set -euo pipefail

ENV_FILE="${1:-/opt/ifd-app/.env}"

if [[ $# -lt 6 ]]; then
  echo "Usage: $0 <env_file> <individual_price_id> <builder_price_id> <advanced_price_id> <organization_price_id> <franchise_price_id>"
  echo ""
  echo "Example:"
  echo "  $0 /opt/ifd-app/.env price_123 price_456 price_789 price_abc price_def"
  exit 1
fi

INDIVIDUAL=$2
BUILDER=$3
ADVANCED=$4
ORGANIZATION=$5
FRANCHISE=$6

echo "Updating $ENV_FILE with Price IDs..."

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
  else
    # Add new
    echo "${var_name}=${var_value}" >> "$ENV_FILE"
  fi
}

update_env_var "STRIPE_PRICE_INDIVIDUAL" "$INDIVIDUAL"
update_env_var "STRIPE_PRICE_BUILDER" "$BUILDER"
update_env_var "STRIPE_PRICE_ADVANCED" "$ADVANCED"
update_env_var "STRIPE_PRICE_ORGANIZATION" "$ORGANIZATION"
update_env_var "STRIPE_PRICE_FRANCHISE" "$FRANCHISE"

echo "✅ Price IDs updated in $ENV_FILE"
echo ""
echo "Running validation..."

VALIDATION_SCRIPT="$(dirname "$0")/validate-stripe-prices.sh"
if [[ -f "$VALIDATION_SCRIPT" ]]; then
  bash "$VALIDATION_SCRIPT" "$ENV_FILE"
else
  echo "Validation script not found. Please verify manually."
fi

