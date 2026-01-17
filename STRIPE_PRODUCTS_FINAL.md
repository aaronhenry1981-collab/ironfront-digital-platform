# Stripe Products - Final Configuration

**Based on actual product definitions from scale/launch pages**

---

## Products Created

### Scale Path (Existing Organizations)

1. **Individual Operator**
   - Price: $49/month
   - Description: Essential platform access for individual operators. Includes operational dashboards, team visibility, automated onboarding, lead handling & routing, and intervention insights. Perfect for getting started with Iron Front infrastructure.

2. **Builder**
   - Price: $199/month
   - Description: Enhanced platform access for building and scaling operations. Includes all Individual Operator features plus advanced automation, scaling tools, and expanded team management capabilities.

3. **Org Leader**
   - Price: $599/month
   - Description: Enterprise-level platform access for organization leaders. Includes all Builder features plus advanced analytics, priority support, organization-wide management tools, and dedicated resources.

### Launch Path (New Businesses - LaunchPath™)

4. **Starter**
   - Price: $99/month
   - Description: LaunchPath™ Starter tier. Perfect for starting from zero. Includes step-by-step business setup, systems for leads and follow-up, training on structure, and optional access to operating environments (EEP).

5. **Growth**
   - Price: $299/month
   - Description: LaunchPath™ Growth tier. Enhanced business setup with advanced systems, expanded training, priority access to operating environments, and scaling support.

6. **Scale**
   - Price: $999/month
   - Description: LaunchPath™ Scale tier. Complete business operating system with full infrastructure, advanced training, comprehensive support, and enterprise-level features.

### Shared

7. **Franchise License**
   - Price: $10,000 (one-time, 3-year license)
   - Description: 3-year franchise license with full platform access and support. Includes all platform features, dedicated resources, franchise-level support, and comprehensive business infrastructure.

---

## Customer Portal Descriptions

All products include customer-facing descriptions that:
- ✅ Explain what's included
- ✅ Use enterprise/business language
- ✅ No MLM terms
- ✅ No earnings language
- ✅ Clear value proposition

These descriptions appear in:
- Stripe Customer Portal
- Invoices
- Product listings
- Checkout pages

---

## Stripe Tax Configuration

**Tax Code:** `txcd_10100000` (Software as a Service - SaaS)

**Tax Behavior:** `exclusive` (tax calculated separately)

**Benefits:**
- Automatic tax calculation based on customer location
- Tax collection and remittance handled by Stripe
- Compliance with sales tax, VAT, and GST requirements
- Customer portal shows tax breakdown

---

## Environment Variables

After products are created, add to `.env`:

```bash
# Scale path
STRIPE_PRICE_INDIVIDUAL=price_...
STRIPE_PRICE_BUILDER=price_...
STRIPE_PRICE_ORGANIZATION=price_...

# Launch path
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_SCALE=price_...

# Shared
STRIPE_PRICE_FRANCHISE=price_...
```

---

## Cleanup

**Old products in Stripe will be archived** (not deleted) by the cleanup script.

Only products referenced in `.env` Price IDs will remain active.

---

**Status:** Ready to create/update products in Stripe






