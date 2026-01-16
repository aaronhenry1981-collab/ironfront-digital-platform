# Environment Variables for Operator UI

## Stripe Configuration

Add these to your `.env.local` (development) or production environment:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... or pk_test_...

# Stripe Price IDs (Monthly)
NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_SCALE_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ORGANIZATION_MONTHLY=price_...

# Stripe Price IDs (Annual)
NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_PRICE_GROWTH_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_PRICE_SCALE_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_PRICE_ORGANIZATION_ANNUAL=price_...

# Stripe Price ID (One-time)
NEXT_PUBLIC_STRIPE_PRICE_FRANCHISE=price_...

# App URL
APP_URL=https://ironfrontdigital.com
NEXT_PUBLIC_APP_URL=https://ironfrontdigital.com
```

## Note

- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- `STRIPE_SECRET_KEY` is server-side only (used in API routes)
- Price IDs are from the Stripe products created in Step 2


