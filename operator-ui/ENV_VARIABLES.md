# Environment Variables

Reference for every env var the app reads, what enables it, and what
gracefully degrades when it's unset. Copy `.env.example` → `.env.local`
and fill in.

> **Two apps share this Postgres database**:
> - `operator-ui/` — Next.js app (this directory)
> - `app/` — legacy marketing/landing Node server
>
> Most variables in this file are read by the Next.js app. The legacy
> server's vars are listed at the bottom.

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Everything
else is server-side only.

---

## Database

| Variable | Required? | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | — | Postgres connection string. Both apps connect to the same DB. Must start with `postgres://` or `postgresql://`. |

---

## Authentication

| Variable | Required? | Default | Notes |
|---|---|---|---|
| `INTAKE_ORG_ID` | No | `00000000-0000-0000-0000-000000000002` | UUID of the system intake org. Override only if you've changed the seeded org. |

The owner email is hardcoded to `aaronhenry1981@gmail.com` in `src/lib/auth.ts`. Sessions use the `session_id` cookie shared between both apps.

---

## Stripe

| Variable | Required? | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | Yes (for billing) | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Yes (for webhooks) | `whsec_...` from the Stripe webhook endpoint config |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes (for Checkout) | `pk_live_...` or `pk_test_...` |
| `NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY` | Yes | Price ID from your Stripe products |
| `NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTHLY` | Yes | |
| `NEXT_PUBLIC_STRIPE_PRICE_SCALE_MONTHLY` | Yes | |
| `NEXT_PUBLIC_STRIPE_PRICE_ORGANIZATION_MONTHLY` | Yes | |
| `NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL` | Yes | |
| `NEXT_PUBLIC_STRIPE_PRICE_GROWTH_ANNUAL` | Yes | |
| `NEXT_PUBLIC_STRIPE_PRICE_SCALE_ANNUAL` | Yes | |
| `NEXT_PUBLIC_STRIPE_PRICE_ORGANIZATION_ANNUAL` | Yes | |
| `NEXT_PUBLIC_STRIPE_PRICE_FRANCHISE` | Yes | One-time payment price ID |

---

## Claude LLM (next-touch drafting)

| Variable | Required? | Default | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | No | — | When unset, `/api/console/intakes/[id]/draft-next-touch` returns 503 with a clear message. Rule-based template ranking continues to work. |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-6` | Set to `claude-opus-4-7` to upgrade. Cost: Sonnet ≈ $0.18–0.30 per draft, Opus ≈ $0.30–0.50. |

---

## AWS SES (outbound email)

Required to actually send magic-link auth emails and outreach touches. When unset, the app falls back to console-logging email content.

| Variable | Required? | Default | Notes |
|---|---|---|---|
| `AWS_REGION` | Yes (for email) | — | e.g. `us-east-1`. Already set if you're on AWS. |
| `AWS_SES_FROM_EMAIL` | Yes (for email) | — | Verified sender, e.g. `Iron Front Digital <hello@ironfrontdigital.com>` |
| `AWS_SES_REPLY_TO_DOMAIN` | No (but enables inbound) | — | e.g. `operations.ironfrontdigital.com`. When set, outreach emails get a reply-to of `intake-<id>@<domain>` so inbound replies thread back. |

**AWS-side setup needed:**
1. Verify the from-domain in SES (SPF + DKIM DNS records)
2. Move SES out of sandbox if not already (Account dashboard → Request production access)
3. Add `ses:SendEmail` to the EC2/ECS instance role

The standard AWS credential chain is used — no `AWS_ACCESS_KEY_ID` needed if you're running on AWS with an instance/task role.

---

## Inbound email webhook

| Variable | Required? | Default | Notes |
|---|---|---|---|
| `INBOUND_EMAIL_SECRET` | Yes (for inbound) | — | Any random long string. Must match the `x-inbound-secret` header your forwarder Lambda sends to `POST /api/inbound/email`. |

**AWS-side setup needed (only if you want inbound capture):**
1. MX record on your reply-to domain → AWS SES inbound
2. SES → Email receiving → Receipt rule → Action: invoke Lambda
3. Lambda parses the raw email and POSTs the normalized payload (`{to, from, subject, text}`) to `/api/inbound/email` with the `x-inbound-secret` header

---

## Scheduled jobs (cron)

| Variable | Required? | Default | Notes |
|---|---|---|---|
| `CRON_SECRET` | Yes (for cron) | — | Any random long string. Required by `POST /api/cron/run-jobs` via the `x-cron-secret` header. Without it, the endpoint returns 503. The owner-only "Run jobs now" button doesn't need it (uses session auth). |

**Recommended cadence:** every 15 minutes. Wire from EventBridge, system crontab, GitHub Actions cron, or any scheduler — example:

```sh
*/15 * * * * curl -X POST -H "x-cron-secret: $CRON_SECRET" https://yourdomain/api/cron/run-jobs
```

---

## Error tracking (Sentry)

Both optional. When unset, Sentry SDK is loaded but inert — zero overhead.

| Variable | Required? | Default | Notes |
|---|---|---|---|
| `SENTRY_DSN` | No | — | Server-side errors. |
| `NEXT_PUBLIC_SENTRY_DSN` | No | — | Browser errors. Same DSN as `SENTRY_DSN` is fine. |
| `SENTRY_ENVIRONMENT` | No | `NODE_ENV` value | e.g. `production`, `staging` |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | No | `NODE_ENV` value | Browser-side equivalent |

Traces sample at 10% in production, 0% in dev.

---

## App URL

| Variable | Required? | Default | Notes |
|---|---|---|---|
| `APP_URL` | Yes | `http://localhost:3000` | Used for magic link verify URLs and Stripe `success_url` / `cancel_url`. e.g. `https://ironfrontdigital.com` |
| `NEXT_PUBLIC_APP_URL` | Yes | (same as `APP_URL`) | Browser-side equivalent |

---

## Legacy app (`app/server.js`)

The legacy Node http server has its own variables. It shares `DATABASE_URL` with the Next.js app for auth tables (users, sessions, magic_links).

| Variable | Required? | Default | Notes |
|---|---|---|---|
| `APP_VERSION` | **Yes** | — | Build version stamp. Server hard-fails on startup if missing. Set by your deploy pipeline. |
| `PORT` | No | `3000` | HTTP listen port |
| `DB_PATH` | No | `/data/ifd.db` | SQLite path for the legacy `leads` + `events` tables. Mount as a durable volume in production. |
| `ADMIN_KEY` | Yes (for `/admin/*`) | — | Required header value for `x-admin-key` to access `/admin/leads`, `/admin/events`, `/admin/export`, `/admin/clear`, `/admin/lead/status`. |
| `STRIPE_SECRET_KEY` | No (but recommended) | — | Same as Next.js app. When unset, Stripe customer creation on `/apply` is skipped (intake still recorded). |
| `NODE_ENV` | No | — | When `production`, login cookie gets the `Secure` flag |

---

## Quickstart

For local dev:

```bash
cp operator-ui/.env.example operator-ui/.env.local
# Fill in DATABASE_URL, ANTHROPIC_API_KEY (optional), Stripe test keys
# Skip AWS / SES / Sentry / cron — they all gracefully degrade

cd operator-ui
npx prisma migrate deploy
npx prisma db seed   # creates sample intakes + engagement config
npm run dev
```

For production:

1. Set everything in the tables above.
2. Run `npx prisma migrate deploy`.
3. Verify SES sender domain.
4. Wire your scheduler to `POST /api/cron/run-jobs`.
5. (Optional) Wire SES inbound → Lambda → `POST /api/inbound/email`.
