# ✅ Stripe Setup - Complete Guide

This document provides multiple ways to complete Stripe setup, from fully automated to manual.

---

## 🚀 Option 1: Interactive Setup Script (Recommended)

**Best for:** First-time setup, guided process

```bash
# On EC2 instance
cd /opt/ifd-app
chmod +x scripts/setup-stripe-interactive.sh
./scripts/setup-stripe-interactive.sh /opt/ifd-app/.env
```

**What it does:**
- Guides you through Stripe Dashboard product creation
- Collects Price IDs interactively
- Updates .env file automatically
- Validates setup

**Follow the prompts:**
1. Open Stripe Dashboard when prompted
2. Create each product as instructed
3. Paste Price IDs when asked
4. Script updates .env automatically

---

## ⚡ Option 2: Quick Setup Script

**Best for:** You already have Price IDs ready

```bash
# On EC2 instance
cd /opt/ifd-app
chmod +x scripts/setup-stripe-quick.sh
./scripts/setup-stripe-quick.sh /opt/ifd-app/.env \
  price_individual_here \
  price_builder_here \
  price_advanced_here \
  price_organization_here \
  price_franchise_here
```

**Replace `price_*_here` with actual Price IDs from Stripe Dashboard.**

---

## 📝 Option 3: Manual Setup

**Best for:** Full control, step-by-step

### Step 1: Create Products in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/products
2. **Ensure Test Mode is ON** (toggle in top right)
3. Create these 5 products:

#### Product 1: Individual Operator
- Name: `Individual Operator`
- Description: `Platform access for individual operators`
- Pricing: **Recurring**
- Amount: `$99.00`
- Billing: **Monthly**
- **Copy Price ID** (starts with `price_`)

#### Product 2: Builder
- Name: `Builder`
- Description: `Builder tier platform access`
- Pricing: **Recurring**
- Amount: `$299.00`
- Billing: **Monthly**
- **Copy Price ID**

#### Product 3: Advanced Operator
- Name: `Advanced Operator`
- Description: `Advanced operator platform access`
- Pricing: **Recurring**
- Amount: `$599.00`
- Billing: **Monthly**
- **Copy Price ID**

#### Product 4: Organization / Leader
- Name: `Organization / Leader`
- Description: `Organization and leader tier platform access`
- Pricing: **Recurring**
- Amount: `$999.00`
- Billing: **Monthly**
- **Copy Price ID**

#### Product 5: Franchise License
- Name: `Franchise License`
- Description: `3-year franchise license (one-time payment)`
- Pricing: **One-time**
- Amount: `$10,000.00`
- **Copy Price ID**

### Step 2: Update Production .env

**SSH to EC2:**
```bash
ssh -i ~/.ssh/id_ed25519 ec2-user@<EC2_IP>
```

**Edit .env file:**
```bash
nano /opt/ifd-app/.env
# OR
vi /opt/ifd-app/.env
```

**Add/Update these lines:**
```bash
# Stripe Price IDs (TEST MODE)
STRIPE_PRICE_INDIVIDUAL=price_YOUR_INDIVIDUAL_PRICE_ID
STRIPE_PRICE_BUILDER=price_YOUR_BUILDER_PRICE_ID
STRIPE_PRICE_ADVANCED=price_YOUR_ADVANCED_PRICE_ID
STRIPE_PRICE_ORGANIZATION=price_YOUR_ORGANIZATION_PRICE_ID
STRIPE_PRICE_FRANCHISE=price_YOUR_FRANCHISE_PRICE_ID

# Stripe API Keys (if not already set)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
```

**Save and exit:**
- Nano: `Ctrl+X`, then `Y`, then `Enter`
- Vi: `Esc`, then `:wq`, then `Enter`

### Step 3: Validate Setup

```bash
chmod +x scripts/validate-stripe-prices.sh
./scripts/validate-stripe-prices.sh /opt/ifd-app/.env
```

**Expected output:**
```
✅ Individual Operator: price_...
✅ Builder: price_...
✅ Advanced Operator: price_...
✅ Organization/Leader: price_...
✅ Franchise License: price_...
✅ STRIPE_SECRET_KEY: Test mode (sk_test_...)
✅ STRIPE_PUBLISHABLE_KEY: Test mode (pk_test_...)
✅ All Stripe configuration is set correctly
```

---

## 🔍 Verification Checklist

Before confirming setup is complete, verify:

- [ ] All 5 products created in Stripe Dashboard (Test Mode)
- [ ] All 5 Price IDs copied (each starts with `price_`)
- [ ] All Price IDs added to `/opt/ifd-app/.env`
- [ ] Stripe API keys in `.env` (test mode: `sk_test_...`, `pk_test_...`)
- [ ] Validation script passes with all green checks
- [ ] No errors in validation output

---

## ✅ Confirmation

Once all items above are verified, reply with:

**"Stripe setup complete — products created and Price IDs stored."**

---

## 🆘 Troubleshooting

### Price ID not found in Stripe Dashboard

**Solution:**
1. Go to Products → Click on product name
2. Under "Pricing", click on the price
3. Price ID is shown at the top of the price details page

### Validation script fails

**Common issues:**
- Price IDs missing → Add them to .env
- Price IDs wrong format → Must start with `price_`
- API keys missing → Add test keys from Stripe Dashboard

**Fix:**
```bash
# Check what's missing
./scripts/validate-stripe-prices.sh /opt/ifd-app/.env

# Fix issues shown, then re-run validation
```

### .env file permissions

**If you get permission errors:**
```bash
# Check permissions
ls -la /opt/ifd-app/.env

# Fix if needed (be careful with permissions)
chmod 600 /opt/ifd-app/.env
chown ec2-user:ec2-user /opt/ifd-app/.env
```

---

## 📋 Quick Reference

**Required Products:**
1. Individual Operator - $99/mo
2. Builder - $299/mo
3. Advanced Operator - $599/mo
4. Organization/Leader - $999/mo
5. Franchise License - $10,000 one-time

**Required Environment Variables:**
- `STRIPE_PRICE_INDIVIDUAL`
- `STRIPE_PRICE_BUILDER`
- `STRIPE_PRICE_ADVANCED`
- `STRIPE_PRICE_ORGANIZATION`
- `STRIPE_PRICE_FRANCHISE`
- `STRIPE_SECRET_KEY` (test mode)
- `STRIPE_PUBLISHABLE_KEY` (test mode)

**Validation Command:**
```bash
./scripts/validate-stripe-prices.sh /opt/ifd-app/.env
```

---

**Last Updated:** $(date)  
**Status:** Ready for setup

