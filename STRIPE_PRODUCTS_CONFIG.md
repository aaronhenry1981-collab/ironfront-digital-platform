# Stripe Products Configuration

**Status:** Awaiting ChatGPT conversation details

---

## Current Product Structure (Placeholder)

Once you provide the ChatGPT conversation, I will update this with:
- Exact product names
- Customer-facing descriptions
- Pricing details
- Feature lists
- Tax configuration

---

## Product Descriptions (Customer Portal)

**Question:** "Do we have a description we're using for each of these products, so it's on the customer portal, so they know?"

**Answer:** Currently using basic descriptions. Will be updated based on your ChatGPT conversation.

**Current descriptions:**
- Individual Operator: "Platform access for individual operators"
- Builder: "Builder tier platform access"
- Advanced Operator: "Advanced operator platform access"
- Organization/Leader: "Organization and leader tier platform access"
- Franchise License: "3-year franchise license (one-time payment)"

**These will be enhanced with:**
- Feature lists
- Use cases
- What's included
- Customer-facing language (no MLM terms)

---

## Stripe Tax Configuration

**Question:** "Are we gonna do the collect tax file and remit end of compliance with Stripe tax?"

**Answer:** Yes, recommended. See `STRIPE_TAX_SETUP.md` for details.

**Benefits:**
- ✅ Automatic tax calculation
- ✅ Tax collection and remittance
- ✅ Compliance with tax regulations
- ✅ Customer portal shows tax breakdown

**Setup:**
1. Enable Stripe Tax in Dashboard
2. Products created with `create-stripe-products-with-tax.mjs` include tax configuration
3. Checkout sessions will automatically calculate tax

---

## Cleanup Script

**Question:** "Right now were only using what you are given. Do we have a description we're using for each of these products?"

**Answer:** Created `scripts/cleanup-stripe-products.sh` to:
- List all existing products
- Archive unused products (keeps active ones)
- Only keeps products referenced in `.env` Price IDs

**Usage:**
```bash
# List all products first
./scripts/list-stripe-products.sh

# Clean up unused products
./scripts/cleanup-stripe-products.sh
```

---

## Next Steps

1. **Wait for ChatGPT conversation** → Update product definitions
2. **Create products** → Using updated definitions
3. **Clean up** → Archive unused products
4. **Configure tax** → Enable Stripe Tax
5. **Update descriptions** → Customer-facing descriptions

---

**Ready to proceed once you share the ChatGPT conversation details.**

