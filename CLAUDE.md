# Iron Front Digital — Claude Code Notes

This is a real production system: lead intake + Stripe billing + an
operator console for managing applicants, with a self-improvement loop
(rule-based recommendations whose confidence calibrates against
outcomes) and Claude-powered next-touch drafting.

This file documents what's non-obvious about how it's structured.
Reading the code or `git log` will tell you what each file does;
this file tells you why things are the way they are and what to avoid.

## Project layout — two apps, one database

```
ironfront-digital-platform/
├── app/                  # Legacy Node http server (1 file: server.js)
│                         #   Marketing pages, /apply, /api/auth/*, Stripe checkout
├── operator-ui/          # Next.js 14 App Router (the new code)
│                         #   /console/*, /api/console/*, /api/cron/*,
│                         #   /api/inbound/*, conversation system, LLM drafter
├── scripts/              # One-off Stripe product setup scripts
└── deploy/               # AWS deploy + DB URL setup shell scripts
```

Both apps share **one Postgres database** for auth tables (`users`,
`sessions`, `magic_links`) and the operator-ui's domain tables. The
legacy app *also* has its own SQLite DB at `/data/ifd.db` for the
older `leads` + `events` tables — that's separate from the Postgres.

**Most new work goes in `operator-ui/`.** Touch `app/server.js` only
when something specifically belongs in the marketing/landing layer.

## Architecture decisions worth knowing

### Auth lives in a layout, not middleware

Next 14 middleware runs on **Edge Runtime**, which doesn't support
Prisma or `node:crypto`. So `/console/*` auth is enforced by
`src/app/console/layout.tsx` (server component, `runtime = 'nodejs'`),
not middleware. There used to be a `src/middleware.ts` — it was
deleted deliberately.

If you find yourself wanting to add a middleware, **don't**. Add the
check in a layout (or the route itself) so it has Node.js runtime.

### Cookie name is `session_id` (shared across both apps)

The legacy `app/server.js` and `operator-ui/` both read/write the
**same** `session_id` cookie against the same Postgres `sessions`
table. Originally the legacy app used `ifd_session` and they were
incompatible — that was a real bug fixed in commit `6909b30`. Don't
reintroduce a different cookie name in either app.

### Auth-required API routes are pinned to `force-dynamic`

Every route that calls `getCurrentUser()` (which reads `cookies()`)
has `export const dynamic = 'force-dynamic'` at the top. Without it,
Next tries to statically prerender them, hits a `DYNAMIC_SERVER_USAGE`
exception, and either fails the build or floods logs.

**`getCurrentUser()` re-throws `DYNAMIC_SERVER_USAGE`** on purpose —
do not wrap it in a `try/catch` that swallows everything. Only catch
`error.digest !== 'DYNAMIC_SERVER_USAGE'` and re-throw the rest.

### LLM model is env-var driven, default Sonnet 4.6

`src/lib/llm-drafter.ts` reads `process.env.CLAUDE_MODEL` with default
`claude-sonnet-4-6`. To upgrade, set `CLAUDE_MODEL=claude-opus-4-7` —
no code change. **Do not hardcode model strings elsewhere.** If you
need an LLM call from a new file, route it through the same pattern.

Adaptive thinking is on by default (`thinking: { type: 'adaptive' }`).
Don't pass `temperature`, `top_p`, `top_k`, or `budget_tokens` —
they're either deprecated (Sonnet 4.6) or removed (Opus 4.7) and will
400.

### Console pages are mostly client components

Most `/console/*` pages have `'use client'` at the top and fetch from
their corresponding `/api/console/*` endpoints. The exception is
`/console/owner/page.tsx`, which is a server component (it directly
queries Prisma for owner-overview metrics).

## The self-improvement loop

This is the system's "smart" layer. Read `src/lib/recommendation-generator.ts`
once to see the pattern; everything else slots into it.

```
[Cron, every 15 min]
   │
   └── runScheduledJobs() in lib/scheduled-jobs.ts
        │
        ├── runEscalationChecks()        (Atlas: SLA breaches, conversion drops)
        │
        └── generateRecommendations()
             │
             For each generator (8 of them today):
             │
             1. Find candidates (DB query)
             2. Compute calibrated confidence:
                  base × (1−w) + observed_hit_rate × 100 × w
                  where w = sample_size / (sample_size + 5)
             3. Idempotently write Recommendation rows
                  (skipped if same generator+target already active)
                ▲
                │
                │ feedback loop:
                │
[Operator marks "applied" or "dismissed"] ───┐
                                              │
[When Intake reaches qualified/closed/lost] ──┴── lib/outcome-tracker.ts
                                                  marks rec.outcome =
                                                    successful / unsuccessful / unrelated
                                                  → next generation pass uses better confidence
```

Templates work the same way. `lib/template-engine.ts` →
`rankTemplatesForIntake` reads `Touch.outcome` history per template
and blends declared `base_confidence` with observed hit rate.

**To add a new generator:** add a new `Generator` object to
`ALL_GENERATORS` in `recommendation-generator.ts`. Set
`name`, `version`, `base_confidence`, and a `run()` function. Done.

## Where to look for X

| Need | File |
|---|---|
| Who owns auth | `src/lib/auth.ts` (owner-only magic link) |
| Console-wide auth gate | `src/app/console/layout.tsx` |
| Where intake routing decisions are made | `src/lib/intake-routing.ts` |
| Engagement state computation | `src/lib/engagement-state.ts` (pure function) |
| What "smart" means | `src/lib/recommendation-generator.ts` (8 generators) |
| Template ranking algorithm | `src/lib/template-engine.ts` |
| LLM next-touch drafter | `src/lib/llm-drafter.ts` (Claude Sonnet 4.6 by default) |
| Email sender | `src/lib/email.ts` (AWS SES) |
| Inbound email handler | `src/app/api/inbound/email/route.ts` |
| Outcome attribution | `src/lib/outcome-tracker.ts` + `src/lib/touch-outcome-tracker.ts` |
| Cron jobs | `src/lib/scheduled-jobs.ts` (called from `/api/cron/run-jobs` and `/api/console/run-jobs-now`) |
| Stripe webhook | `src/app/api/webhooks/stripe/route.ts` |
| Operator UI for an intake | `src/components/intake/IntakeDetailPanel.tsx` |
| Owner dashboard | `src/app/console/owner/page.tsx` |

## Things to NOT do

- **Don't add a `middleware.ts` for auth.** Edge runtime can't run
  Prisma. Use a server-component layout instead.
- **Don't hardcode `claude-opus-4-7` or `claude-sonnet-4-6`.** Read
  `process.env.CLAUDE_MODEL`.
- **Don't pass `temperature`/`top_p`/`top_k`/`budget_tokens` to Claude.**
  They're removed/deprecated on the models we use.
- **Don't add `temperature` or other sampling params to existing
  Anthropic SDK calls** — they will 400 on Opus 4.7.
- **Don't catch `getCurrentUser()` errors blindly.** Re-throw if
  `error.digest === 'DYNAMIC_SERVER_USAGE'`.
- **Don't change the cookie name from `session_id`.** Both apps
  depend on it.
- **Don't put `model`/`tools`/`system` on Anthropic Managed Agents
  sessions** — those go on the agent. (Not currently used here, but
  if you reach for Managed Agents later, this is the #1 trap.)
- **Don't `git add -A` after running `npm install` for the first
  time.** `package-lock.json` is intentionally untracked (see commit
  `6c66a3f`) — only commit it if you mean to. The CI flow handles
  lockfiles separately.

## Common commands

All run from `operator-ui/` unless noted.

```bash
# Install
npm install --legacy-peer-deps

# Generate Prisma client (after schema changes)
npx prisma generate

# Apply migrations against the configured DATABASE_URL
npx prisma migrate deploy

# Seed dev data (sample intakes + engagement_configs v1)
npx prisma db seed

# Dev server
npm run dev

# Type check + build (what CI runs)
npx tsc --noEmit
npx next build
npx next lint

# Manually trigger a cron run (operator console, owner only)
# Or via curl:
curl -X POST -H "x-cron-secret: $CRON_SECRET" \
  http://localhost:3000/api/cron/run-jobs
```

For the legacy `app/` server:

```bash
cd app
APP_VERSION=dev DATABASE_URL=postgres://... ADMIN_KEY=dev node server.js
```

## Environment variables

See `operator-ui/ENV_VARIABLES.md` for the comprehensive reference,
or `cp operator-ui/.env.example operator-ui/.env.local` to start.

The minimum to get the operator-ui running locally:

```bash
DATABASE_URL=postgresql://...
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Everything else (Claude API key, AWS SES, Sentry, cron, Stripe)
gracefully degrades when unset — magic links log to console, the
LLM drafter returns 503, etc. So you can run the app with just
`DATABASE_URL` and exercise everything except billing and AI.

## Branch and commit conventions

- Feature branches off `main`.
- Commit messages: short imperative title, then a body explaining
  why (not what). The codebase has reasonable history; `git log
  --oneline -20` is a fine reference.
- **Never amend or force-push** without explicit ask. Never push to
  `main` directly.

## Tests

There are no automated tests yet — this is a known gap. The original
test-coverage analysis lives in `git log` under commits between
`e25cdd8` and `caaa6a4`. The conversation around what to test first
(auth flow, Stripe webhook, the email/inbound endpoints) is in the
commit messages.

When tests do get added, use Vitest. Don't add Jest — the project
doesn't need both.

## Stale documentation at the repo root

There are ~18 markdown files at the repo root from earlier work
phases (`BUILD_STATUS_AND_ACTION_PLAN.md`, `COMPLETION_STATUS.md`,
`PHASE_*.md`, `STRIPE_SETUP_*.md`, etc.). They are work-in-progress
notes from earlier checkpoints, **not authoritative documentation**.
The authoritative docs are:

- `README.md` (when present in `operator-ui/`)
- `operator-ui/ENV_VARIABLES.md`
- This file
- The commit history

Treat the root-level `*.md` files as historical artifacts unless
specifically pointed at one.
