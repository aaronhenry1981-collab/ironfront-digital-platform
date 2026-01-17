# 🔐 STRIPE STEP 2 — EXECUTE AUTOMATION

## Run This Command (via AWS SSM)

```bash
aws ssm send-command \
  --region us-east-2 \
  --instance-ids i-0160b2a838a432bbc \
  --document-name "AWS-RunShellScript" \
  --comment "Stripe Step 2 – automated product + tax setup" \
  --parameters 'commands=[
    "cd /opt/ifd-app",
    "chmod +x scripts/setup-stripe-complete.sh",
    "./scripts/setup-stripe-complete.sh /opt/ifd-app/.env"
  ]'
```

## What This Does

✅ Uses existing Stripe account (from .env)  
✅ Detects existing products (already created)  
✅ Creates/updates monthly & annual prices  
✅ Writes Price IDs to `/opt/ifd-app/.env`  
✅ Validates everything  
✅ Exits cleanly or fails loudly  

## Expected Runtime

~30-90 seconds

## Success Criteria

You'll see:
- ✔ Products present (or created)
- ✔ Price IDs written to .env
- ✔ Validation passed

## Note on Stripe Tax

Stripe Tax is enabled in the Stripe Dashboard (not via API).  
Products are configured with `tax_behavior: exclusive` which is correct for Stripe Tax.

## After Completion

Reply with: **"Stripe Step 2 complete."**






