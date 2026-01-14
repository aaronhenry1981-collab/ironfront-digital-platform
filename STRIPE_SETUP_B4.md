# 🔴 Stripe Setup for B4 (REQUIRED)

**Status:** ⚠️ **MUST BE COMPLETED BEFORE B4**

---

## ⚠️ Current State

- ✅ Pricing pages are informational
- ❌ No payments can occur safely yet
- ❌ Stripe products not created
- ❌ Price IDs not configured

**B4 will implement checkout and webhooks, but products must exist first.**

---

## 1️⃣ Create Stripe Products (Test Mode)

### Step 1: Access Stripe Dashboard

1. Go to: https://dashboard.stripe.com
2. **IMPORTANT:** Ensure you're in **Test Mode** (toggle in top right)
3. Navigate to: **Products** → **Add product**

### Step 2: Create Products & Prices

Create exactly these products with the following configuration:

---

#### Product 1: Individual Operator

**Product Details:**
- **Name:** `Individual Operator`
- **Description:** `Platform access for individual operators`
- **Pricing Model:** Recurring
- **Price:** `$99.00 USD`
- **Billing Period:** Monthly
- **Price ID:** Copy this after creation (starts with `price_`)

**Stripe Dashboard Steps:**
1. Click "Add product"
2. Enter name: `Individual Operator`
3. Enter description: `Platform access for individual operators`
4. Under "Pricing", select "Recurring"
5. Set amount: `99.00` USD
6. Set billing period: `Monthly`
7. Click "Save product"
8. **Copy the Price ID** (looks like `price_1ABC123...`)

---

#### Product 2: Builder

**Product Details:**
- **Name:** `Builder`
- **Description:** `Builder tier platform access`
- **Pricing Model:** Recurring
- **Price:** `$299.00 USD`
- **Billing Period:** Monthly
- **Price ID:** Copy this after creation

**Stripe Dashboard Steps:**
1. Click "Add product"
2. Enter name: `Builder`
3. Enter description: `Builder tier platform access`
4. Under "Pricing", select "Recurring"
5. Set amount: `299.00` USD
6. Set billing period: `Monthly`
7. Click "Save product"
8. **Copy the Price ID**

---

#### Product 3: Advanced Operator

**Product Details:**
- **Name:** `Advanced Operator`
- **Description:** `Advanced operator platform access`
- **Pricing Model:** Recurring
- **Price:** `$599.00 USD`
- **Billing Period:** Monthly
- **Price ID:** Copy this after creation

**Stripe Dashboard Steps:**
1. Click "Add product"
2. Enter name: `Advanced Operator`
3. Enter description: `Advanced operator platform access`
4. Under "Pricing", select "Recurring"
5. Set amount: `599.00` USD
6. Set billing period: `Monthly`
7. Click "Save product"
8. **Copy the Price ID**

---

#### Product 4: Organization / Leader

**Product Details:**
- **Name:** `Organization / Leader`
- **Description:** `Organization and leader tier platform access`
- **Pricing Model:** Recurring
- **Price:** `$999.00 USD`
- **Billing Period:** Monthly
- **Price ID:** Copy this after creation

**Stripe Dashboard Steps:**
1. Click "Add product"
2. Enter name: `Organization / Leader`
3. Enter description: `Organization and leader tier platform access`
4. Under "Pricing", select "Recurring"
5. Set amount: `999.00` USD
6. Set billing period: `Monthly`
7. Click "Save product"
8. **Copy the Price ID**

---

#### Product 5: Franchise License

**Product Details:**
- **Name:** `Franchise License`
- **Description:** `3-year franchise license (one-time payment)`
- **Pricing Model:** One-time
- **Price:** `$10,000.00 USD`
- **Billing Period:** N/A (one-time)
- **Price ID:** Copy this after creation

**Stripe Dashboard Steps:**
1. Click "Add product"
2. Enter name: `Franchise License`
3. Enter description: `3-year franchise license (one-time payment)`
4. Under "Pricing", select "One-time"
5. Set amount: `10000.00` USD
6. Click "Save product"
7. **Copy the Price ID**

---

## 2️⃣ Copy Price IDs

### After Creating Each Product:

1. In Stripe Dashboard, go to **Products**
2. Click on the product you just created
3. Under "Pricing", you'll see the price
4. Click on the price to view details
5. **Copy the Price ID** (starts with `price_`)

**Example Price IDs:**
```
price_1ABC123def456GHI789jkl012MNO345pqr678STU901vwx234YZA567bcd890
```

**⚠️ IMPORTANT:**
- Price IDs are unique to your Stripe account
- Test mode and Live mode have different Price IDs
- You'll need to create products in both modes eventually
- **For now, only create in Test Mode**

---

## 3️⃣ Store Price IDs in Environment Variables

### Create/Update `.env` Template

**On production EC2 instance (`/opt/ifd-app/.env`):**

```bash
# Stripe Configuration (TEST MODE)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # (Will be set up in B4)

# Stripe Price IDs (TEST MODE)
STRIPE_PRICE_INDIVIDUAL=price_...
STRIPE_PRICE_BUILDER=price_...
STRIPE_PRICE_ADVANCED=price_...
STRIPE_PRICE_ORGANIZATION=price_...
STRIPE_PRICE_FRANCHISE=price_...

# App Configuration
APP_URL=https://ironfrontdigital.com
NODE_ENV=production
```

### Price ID Mapping

| Product | Environment Variable | Example Value |
|---------|---------------------|---------------|
| Individual Operator | `STRIPE_PRICE_INDIVIDUAL` | `price_1ABC...` |
| Builder | `STRIPE_PRICE_BUILDER` | `price_1DEF...` |
| Advanced Operator | `STRIPE_PRICE_ADVANCED` | `price_1GHI...` |
| Organization / Leader | `STRIPE_PRICE_ORGANIZATION` | `price_1JKL...` |
| Franchise License | `STRIPE_PRICE_FRANCHISE` | `price_1MNO...` |

---

## 4️⃣ Verify Test Keys in Production

### Check Current `.env` on EC2:

```bash
# SSH to EC2
ssh -i ~/.ssh/id_ed25519 ec2-user@<EC2_IP>

# Check Stripe keys (be careful - contains secrets)
cat /opt/ifd-app/.env | grep STRIPE
```

### Expected Output:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### If Keys Are Missing:

1. Get test keys from Stripe Dashboard:
   - Go to: **Developers** → **API keys**
   - Ensure **Test mode** is enabled
   - Copy **Secret key** (starts with `sk_test_`)
   - Copy **Publishable key** (starts with `pk_test_`)

2. Add to `.env`:
   ```bash
   # Edit .env (use nano, vim, or your preferred editor)
   nano /opt/ifd-app/.env
   
   # Add:
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

3. Restart application (if needed):
   ```bash
   # If using Docker
   docker restart ifd-app
   
   # If using PM2
   pm2 restart ifd-app
   ```

---

## 5️⃣ Verification Checklist

Before proceeding to B4, confirm:

- [ ] All 5 products created in Stripe Dashboard (Test Mode)
- [ ] All 5 Price IDs copied
- [ ] Price IDs stored in production `.env`
- [ ] Test mode API keys in production `.env`
- [ ] `STRIPE_SECRET_KEY` starts with `sk_test_`
- [ ] `STRIPE_PUBLISHABLE_KEY` starts with `pk_test_`
- [ ] All environment variables are set correctly

---

## 6️⃣ Price ID Storage Template

**Create a secure note (NOT in git) with your Price IDs:**

```
STRIPE PRICE IDs (TEST MODE)
============================

Individual Operator:  price_...
Builder:              price_...
Advanced Operator:    price_...
Organization/Leader:  price_...
Franchise License:    price_...

Created: [DATE]
Stripe Account: [YOUR_ACCOUNT]
Mode: TEST
```

**⚠️ DO NOT:**
- Commit Price IDs to git
- Share Price IDs in chat/email
- Use production Price IDs in test mode

---

## 7️⃣ Optional: Price ID Validation Script

**Create a simple validation script to verify Price IDs:**

```bash
#!/bin/bash
# validate-stripe-prices.sh

echo "=== Stripe Price ID Validation ==="

# Load .env
source /opt/ifd-app/.env

# Check if all price IDs are set
MISSING=0

check_price() {
  local var=$1
  local name=$2
  
  if [[ -z "${!var:-}" ]]; then
    echo "❌ $name: NOT SET"
    MISSING=$((MISSING + 1))
  elif [[ "${!var}" =~ ^price_ ]]; then
    echo "✅ $name: ${!var}"
  else
    echo "⚠️  $name: Invalid format (should start with 'price_')"
    MISSING=$((MISSING + 1))
  fi
}

check_price "STRIPE_PRICE_INDIVIDUAL" "Individual Operator"
check_price "STRIPE_PRICE_BUILDER" "Builder"
check_price "STRIPE_PRICE_ADVANCED" "Advanced Operator"
check_price "STRIPE_PRICE_ORGANIZATION" "Organization/Leader"
check_price "STRIPE_PRICE_FRANCHISE" "Franchise License"

echo ""
if [[ $MISSING -eq 0 ]]; then
  echo "✅ All Price IDs are set correctly"
else
  echo "❌ $MISSING Price ID(s) missing or invalid"
  exit 1
fi
```

---

## ⚠️ IMPORTANT NOTES

1. **Test Mode First**
   - Create all products in **Test Mode**
   - Use test API keys
   - Do NOT enable Live Mode yet
   - B4 will handle the monetization wiring

2. **Price IDs Are Unique**
   - Each Stripe account has unique Price IDs
   - Test and Live modes have different Price IDs
   - You'll need to create products in both modes eventually

3. **Security**
   - Never commit `.env` to git
   - Never share API keys or Price IDs
   - Use environment variables, not hardcoded values

4. **Future: Live Mode**
   - After B4 is tested in Test Mode
   - Create products in Live Mode
   - Update `.env` with Live Mode Price IDs
   - Switch API keys to Live Mode

---

## ✅ Completion Confirmation

**Once all items are complete, confirm:**

- [ ] All 5 products created in Stripe Dashboard (Test Mode)
- [ ] All Price IDs copied and stored in `.env`
- [ ] Test API keys verified in production `.env`
- [ ] Ready for B4 implementation

**Then reply:** "Stripe setup complete - products created and Price IDs stored"

---

**Last Updated:** $(date)  
**Status:** Awaiting Stripe Dashboard setup

