# ⚡ Stripe Setup - Quick Start

**Fastest way to complete Stripe setup for Phase B4**

## 🚀 Fully Automated Option (NEW!)

**If you have STRIPE_SECRET_KEY in .env, this is fully automated:**

```bash
# On EC2 instance
cd /opt/ifd-app
chmod +x scripts/setup-stripe-complete.sh
./scripts/setup-stripe-complete.sh /opt/ifd-app/.env
```

**This script will:**
- ✅ Create all 5 products in Stripe via API
- ✅ Get Price IDs automatically
- ✅ Update .env file
- ✅ Validate setup

**No manual Stripe Dashboard work needed!**

---

## 📝 Manual Option (If automated doesn't work)

---

## 🎯 What You Need

1. Access to Stripe Dashboard (Test Mode)
2. SSH access to production EC2 instance
3. 10-15 minutes

---

## 🚀 Quick Steps

### 1. Create Products in Stripe (5 minutes)

**Go to:** https://dashboard.stripe.com/test/products

**Create these 7 products:**

| Product | Price | Type | Path |
|---------|-------|------|------|
| Individual Operator | $49 | Monthly recurring | Scale |
| Builder | $199 | Monthly recurring | Scale |
| Org Leader | $599 | Monthly recurring | Scale |
| Starter | $99 | Monthly recurring | Launch |
| Growth | $299 | Monthly recurring | Launch |
| Scale | $999 | Monthly recurring | Launch |
| Franchise License | $10,000 | One-time | Both |

**For each product:**
1. Click "Add product"
2. Enter name and description
3. Set pricing (recurring monthly OR one-time)
4. Set amount
5. Save
6. **Copy Price ID** (starts with `price_`)

**Keep Price IDs handy** - you'll need them in step 2.

---

### 2. Run Interactive Setup Script (5 minutes)

**SSH to EC2:**
```bash
ssh -i ~/.ssh/id_ed25519 ec2-user@<EC2_IP>
```

**Run setup script:**
```bash
cd /opt/ifd-app
chmod +x scripts/setup-stripe-interactive.sh
./scripts/setup-stripe-interactive.sh /opt/ifd-app/.env
```

**Follow prompts:**
- Script will ask for each Price ID
- Paste Price IDs when prompted
- Script updates .env automatically
- Validation runs at the end

---

### 3. Verify (1 minute)

**Run validation:**
```bash
./scripts/validate-stripe-prices.sh /opt/ifd-app/.env
```

**Expected:** All green checks ✅

---

## ✅ Done!

**Reply with:** "Stripe setup complete — products created and Price IDs stored."

---

## 🆘 Alternative: Manual Setup

If scripts don't work, see `STRIPE_SETUP_COMPLETE.md` for manual steps.

---

**Total time:** ~10-15 minutes  
**Difficulty:** Easy (guided by script)

