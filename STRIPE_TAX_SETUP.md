# Stripe Tax Configuration

## Overview

Stripe Tax automatically calculates, collects, and remits sales tax, VAT, and GST based on customer location.

**Benefits:**
- ✅ Automatic tax calculation
- ✅ Tax collection and remittance
- ✅ Compliance with tax regulations
- ✅ Customer portal shows tax breakdown
- ✅ Automatic updates when tax rates change

---

## Setup Steps

### 1. Enable Stripe Tax

**In Stripe Dashboard:**
1. Go to: **Settings** → **Tax**
2. Click **"Get started"** or **"Enable Stripe Tax"**
3. Complete business information:
   - Business address
   - Tax registration numbers (if applicable)
   - Business type

### 2. Configure Tax Settings

**Tax Calculation:**
- **Automatic:** Stripe calculates tax based on customer location
- **Manual:** You calculate tax (not recommended)

**Tax Behavior:**
- **Exclusive:** Tax added on top of price (recommended)
- **Inclusive:** Tax included in price

**Registration:**
- Add tax registrations for states/countries where you're required to collect tax
- Stripe will guide you through registration requirements

### 3. Update Products

Products created with `create-stripe-products-with-tax.mjs` already include:
- `tax_code`: Digital products tax code
- `tax_behavior`: Exclusive (tax calculated separately)

**Tax Codes:**
- `txcd_10000000` - Digital products (default)
- `txcd_10100000` - Software as a Service (SaaS)
- Custom codes available for specific product types

---

## Implementation in Code

### Checkout Session with Tax

```javascript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: priceId,
    quantity: 1,
  }],
  automatic_tax: {
    enabled: true, // Enable automatic tax calculation
  },
  customer_email: customerEmail,
  success_url: 'https://ironfrontdigital.com/success',
  cancel_url: 'https://ironfrontdigital.com/cancel',
});
```

### Customer Portal

Tax information automatically appears in Stripe Customer Portal:
- Tax breakdown on invoices
- Tax amounts shown separately
- Compliance with local tax requirements

---

## Tax Remittance

**Stripe handles:**
- ✅ Tax calculation
- ✅ Tax collection
- ✅ Tax remittance to tax authorities
- ✅ Tax reporting

**You need to:**
- Register for tax in applicable jurisdictions
- Provide business information to Stripe
- Review tax reports in Stripe Dashboard

---

## Configuration Options

### Tax Behavior

**Exclusive (Recommended):**
```javascript
tax_behavior: 'exclusive' // Tax added on top
// Customer sees: $99.00 + $7.92 tax = $106.92
```

**Inclusive:**
```javascript
tax_behavior: 'inclusive' // Tax included
// Customer sees: $99.00 (includes tax)
```

### Tax Codes

Common tax codes:
- `txcd_10000000` - Digital products
- `txcd_10100000` - Software as a Service
- `txcd_20030000` - Professional services

---

## Compliance Notes

**Important:**
- Tax requirements vary by jurisdiction
- Some states require tax registration at certain revenue thresholds
- Stripe Tax helps with compliance but doesn't replace legal advice
- Consult with a tax professional for your specific situation

**Iron Front Digital:**
- Selling digital platform access (SaaS)
- May need to register for sales tax in multiple states
- Stripe Tax simplifies compliance

---

## Verification

**Check tax is working:**
1. Create a test checkout session
2. Use test customer in different location
3. Verify tax is calculated correctly
4. Check invoice shows tax breakdown

**In Stripe Dashboard:**
- **Tax** → **Reports** - View tax collected
- **Tax** → **Registrations** - Manage tax registrations
- **Tax** → **Settings** - Configure tax behavior

---

## Cost

**Stripe Tax Pricing:**
- 0.5% of transaction amount (for tax calculation and remittance)
- Additional fees may apply for tax registration services

**Example:**
- $99 subscription with $7.92 tax
- Stripe Tax fee: ~$0.50 (0.5% of $99)
- Total cost: $0.50 per transaction

---

**Status:** Ready to configure  
**Next:** Enable in Stripe Dashboard, then products will automatically use tax calculation

