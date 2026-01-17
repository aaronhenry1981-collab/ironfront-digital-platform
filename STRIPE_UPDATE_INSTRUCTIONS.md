# How to Update Stripe Products

## Option 1: Run Locally (Recommended)

**Why:** You can see the output, copy Price IDs, and test before updating production.

### Steps:

1. **Get your Stripe Secret Key:**
   - Go to Stripe Dashboard → Developers → API keys
   - Copy your **Test Mode** secret key (starts with `sk_test_...`)

2. **Set the environment variable:**
   ```bash
   # On Windows (PowerShell)
   $env:STRIPE_SECRET_KEY="sk_test_..."

   # On Mac/Linux
   export STRIPE_SECRET_KEY="sk_test_..."
   ```

3. **Run the update script:**
   ```bash
   cd ironfront-digital-platform
   node scripts/update-stripe-products.mjs
   ```

4. **Copy the Price IDs from the output** and add them to your production `.env` file on EC2.

---

## Option 2: Run on EC2 Instance

**Why:** If your `.env` file is already on EC2 with the Stripe key.

### Steps:

1. **SSH into your EC2 instance:**
   ```bash
   ssh -i ~/.ssh/id_ed25519 ec2-user@3.140.200.133
   ```

2. **Navigate to the app directory:**
   ```bash
   cd /opt/ifd-app
   ```

3. **The script will automatically load from .env, so just run:**
   ```bash
   node scripts/update-stripe-products.mjs
   ```

4. **Copy the Price IDs from the output** and update your `.env` file:
   ```bash
   nano /opt/ifd-app/.env
   # Add the Price IDs
   ```

---

## What the Script Does

1. ✅ **Checks for existing products** by name
2. ✅ **Updates existing products** with correct prices and descriptions
3. ✅ **Creates new products** if they don't exist
4. ✅ **Creates/updates prices** for each product
5. ✅ **Outputs Price IDs** for your `.env` file

---

## After Running

You'll see output like:

```
Price IDs for .env:

STRIPE_PRICE_INDIVIDUAL=price_1ABC...
STRIPE_PRICE_BUILDER=price_1DEF...
STRIPE_PRICE_ORGANIZATION=price_1GHI...
STRIPE_PRICE_STARTER=price_1JKL...
STRIPE_PRICE_GROWTH=price_1MNO...
STRIPE_PRICE_SCALE=price_1PQR...
STRIPE_PRICE_FRANCHISE=price_1STU...
```

**Copy these to your production `.env` file on EC2.**

---

## Verify Products in Stripe Dashboard

After running, check Stripe Dashboard → Products:
- ✅ All 7 products should exist
- ✅ Prices should match: $49, $199, $599, $99, $299, $999, $10,000
- ✅ Descriptions should be updated with customer-facing text

---

## Troubleshooting

**Error: STRIPE_SECRET_KEY not found**
- Make sure you set the environment variable (Option 1) or have it in `.env` (Option 2)

**Error: Cannot find module 'stripe'**
- Run: `npm install stripe` (or the script will use the Stripe package if available)

**Products not updating?**
- Check that you're using the correct Stripe account (Test vs Live mode)
- Verify the API key has write permissions






