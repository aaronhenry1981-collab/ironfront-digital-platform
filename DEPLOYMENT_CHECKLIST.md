# Deployment checklist — go from merged PR to fully live

The PR adds a lot of code that needs configuration to actually run.
This is the precise list of things to do, in order, with the
infrastructure work that's already prepared in this repo to help.

The ones marked **YOU** require AWS console / DNS access I don't have
from inside the repo. The ones marked **REPO** are already wired up.

---

## 1. Database migrations — **YOU**

Two new Prisma migrations need to apply to production Postgres:

- `20260506000000_self_improvement_loop` — recommendation feedback +
  outcome columns + `engagement_configs` table
- `20260506100000_conversations_and_templates` — `outreach_templates`
  + `touches` tables

```sh
# On a host that can reach prod Postgres
cd operator-ui
DATABASE_URL=<prod_postgres_url> npx prisma migrate deploy
```

Verify with:

```sh
DATABASE_URL=<prod_postgres_url> npx prisma db execute --stdin <<EOF
SELECT version, active, active_days_threshold FROM engagement_configs;
EOF
```

You should see one row, `version=1, active=t, active_days_threshold=14`.

---

## 2. Environment variables — **YOU** (using REPO scripts)

You're already using AWS SSM Parameter Store for `DATABASE_URL`. Extend
that pattern to cover all the new secrets.

### 2a. Create the SSM parameters

In AWS Console → Systems Manager → Parameter Store, create these
**SecureString** parameters under `/ironfront/prod/`:

| Parameter name | Value | Notes |
|---|---|---|
| `/ironfront/prod/ADMIN_KEY` | random 48+ chars | legacy app `/admin/*` access |
| `/ironfront/prod/STRIPE_SECRET_KEY` | `sk_live_...` | from Stripe |
| `/ironfront/prod/STRIPE_WEBHOOK_SECRET` | `whsec_...` | from Stripe webhook config |
| `/ironfront/prod/STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | from Stripe |
| `/ironfront/prod/ANTHROPIC_API_KEY` | `sk-ant-...` | from console.anthropic.com |
| `/ironfront/prod/CLAUDE_MODEL` | `claude-sonnet-4-6` | swap to `claude-opus-4-7` later |
| `/ironfront/prod/AWS_SES_FROM_EMAIL` | `Iron Front Digital <hello@ironfrontdigital.com>` | must be a verified sender |
| `/ironfront/prod/AWS_SES_REPLY_TO_DOMAIN` | `operations.ironfrontdigital.com` | enables inbound threading |
| `/ironfront/prod/INBOUND_EMAIL_SECRET` | random 48+ chars | shared with the Lambda |
| `/ironfront/prod/CRON_SECRET` | random 48+ chars | shared with GitHub Actions |
| `/ironfront/prod/SENTRY_DSN` | `https://...@sentry.io/...` | optional |

Generate random values with:
```sh
openssl rand -hex 32
```

### 2b. Sync them onto the server

The new `deploy/load-secrets-from-ssm.sh` script (REPO) reads all of
these from SSM and writes them to `/opt/ifd-app/.env`:

```sh
# On the EC2 instance:
cd /opt/ifd-app/repo   # or wherever the cloned repo lives
./deploy/load-secrets-from-ssm.sh
```

It safely no-ops on any parameter that doesn't exist yet, so you can
populate SSM incrementally and re-run.

### 2c. Restart the app to pick up new env vars

```sh
cd /opt/ifd-app
APP_VERSION=$(git rev-parse --short HEAD) ./deploy/deploy.sh
```

---

## 3. AWS SES setup — **YOU**

Once-per-domain configuration in the AWS console.

### 3a. Verify the sender domain

- AWS Console → SES → Verified identities → Create identity
- Identity type: Domain
- Domain: `ironfrontdigital.com` (or your subdomain)
- Enable **Easy DKIM**, copy the 3 CNAME records SES gives you
- Add those 3 CNAMEs to Route 53 (or whatever DNS host you use)
- Add an SPF record: `v=spf1 include:amazonses.com -all`
- Wait ~10 minutes for status to flip to **Verified**

### 3b. Move SES out of sandbox

- SES → Account dashboard → Request production access
- Use case: transactional + customer-relationship email
- Daily sending volume estimate: realistic upper bound
- AWS approves usually within 24h

While in sandbox, SES will only send to addresses you've explicitly
verified — fine for testing your own email.

### 3c. IAM permission for the EC2 instance role

Whatever role the EC2 instance assumes needs `ses:SendEmail` and
`ses:SendRawEmail`. Add this inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
```

If you want to be tighter, scope `Resource` to your verified identity
ARN.

---

## 4. Scheduler — **REPO** (already wired)

A GitHub Actions workflow (`.github/workflows/scheduled-jobs.yml`)
runs `POST /api/cron/run-jobs` every 15 minutes. Set two **repository
secrets** in GitHub for it to work:

- Settings → Secrets and variables → Actions → New repository secret
- Add: `APP_BASE_URL` = `https://ironfrontdigital.com` (no trailing slash)
- Add: `CRON_SECRET` = same value as the `CRON_SECRET` env var (step 2)

The workflow also has `workflow_dispatch` so you can fire it manually
from the Actions tab to test.

> **Alternative if you don't want to use GitHub Actions:** a system
> cron entry on the EC2 instance does the same thing:
> ```
> */15 * * * * curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" \
>   https://ironfrontdigital.com/api/cron/run-jobs >> /var/log/ifd-cron.log 2>&1
> ```
> Pick **one**, not both.

---

## 5. SES inbound email — **YOU** (using REPO Lambda)

Optional but recommended — without this, replies to outreach emails
don't get logged.

### 5a. Build and deploy the Lambda

The forwarder code is already written in `infrastructure/lambda/inbound-email/`.

```sh
cd infrastructure/lambda/inbound-email
npm install
npm run package    # builds inbound-email.zip
```

Then in AWS Console → Lambda:
- Create function → Author from scratch
- Name: `ifd-inbound-email-forwarder`
- Runtime: Node.js 20.x
- Upload the `inbound-email.zip` you just built
- Handler: `index.handler`
- Timeout: 30s, Memory: 256MB
- Environment variables:
  - `APP_BASE_URL` = `https://ironfrontdigital.com`
  - `INBOUND_EMAIL_SECRET` = same value as in step 2

Attach an inline IAM policy granting `s3:GetObject` on your inbound
S3 bucket.

Full step-by-step: `infrastructure/lambda/inbound-email/README.md`.

### 5b. Wire SES to call the Lambda

- Create an S3 bucket for SES inbound messages (or reuse one)
- Add an MX record on `operations.ironfrontdigital.com`:
  ```
  operations.ironfrontdigital.com.  IN  MX  10  inbound-smtp.us-east-1.amazonaws.com.
  ```
  (use the region your SES is in)
- AWS Console → SES → Email receiving → Receipt rule sets:
  - New rule set if you don't have one
  - New rule:
    - Recipient: `operations.ironfrontdigital.com`
    - Action 1: S3 → write to your inbound bucket
    - Action 2: Lambda → `ifd-inbound-email-forwarder`, **Event** mode
- Set the rule set as **active**

### 5c. Test the inbound flow

Send an email to `intake-<some-uuid-from-your-DB>@operations.ironfrontdigital.com`.
You should see:
- A new row in the `touches` table (`direction='inbound'`)
- The intake's `last_activity_at` bumped
- An `inbound_email_received` event in the events table
- Lambda CloudWatch logs showing the request

---

## Verify everything works

After all 5 steps:

1. **Magic-link auth:** Log out, log in. The email should arrive in your inbox (not just CloudWatch logs).
2. **Stripe:** Run a test checkout — webhook should mark the intake as `qualified`.
3. **Conversation:** Open an intake in `/console/intake`, click "Draft next touch with Claude" — should produce a real draft. Send it.
4. **Inbound:** Reply to the draft email from your personal inbox — within ~30s the reply should appear in the conversation thread.
5. **Cron:** GitHub Actions tab → run "Scheduled Jobs" workflow manually → should return 200 OK with a JSON summary.
6. **Owner:** `/console/owner` → "Run jobs now" button should also work and show stats.
7. **Sentry:** Visit a route that errors deliberately or watch your Sentry dashboard for the next ambient error.

If any of these fails, check:
- App env vars actually loaded (`docker exec ifd-app env | grep -E 'CRON|ANTHROPIC|AWS_SES'`)
- Sentry receives a test event (Sentry's test-event button)
- AWS CloudWatch logs for the Lambda
- The operator-ui app logs (`docker logs ifd-app`)

---

## TL;DR for what's where

| Need | File |
|---|---|
| Cron scheduler | `.github/workflows/scheduled-jobs.yml` |
| SES inbound forwarder | `infrastructure/lambda/inbound-email/` |
| Sync env from SSM | `deploy/load-secrets-from-ssm.sh` |
| Initialize new server's `.env` | `deploy/init-env.sh` |
| Comprehensive env reference | `operator-ui/ENV_VARIABLES.md` |
| Architecture decisions | `CLAUDE.md` |
