# Operator UI v1

Enterprise-grade business operations console for Iron Front Digital.

## Features

- Owner-only magic-link authentication (no third-party services)
- Protected routes under `/console/*`
- Owner console dashboard (`/console/owner`)
- Organization Live View with real-time engagement visualization
- Segments management
- Interventions tracking
- Audit log
- Settings configuration
- PostgreSQL persistence (Phase A4)

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- PostgreSQL (via Prisma)

## Prerequisites

- Node.js 18+ 
- PostgreSQL 16+ (or Docker)
- npm or yarn

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start PostgreSQL

**Option A: Docker (Recommended)**

```bash
docker-compose up -d
```

**Option B: Local PostgreSQL**

Ensure PostgreSQL is running on `localhost:5432` with a database named `ifd_operator`.

### 3. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update `DATABASE_URL` in `.env` if needed:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ifd_operator?schema=public"
```

### 4. Run Migrations

```bash
npm run db:migrate
```

This will:
- Generate Prisma Client
- Run database migrations
- Create all tables and indexes

### 5. Seed Database (Optional)

Populate database with development data:

```bash
npm run db:seed
```

This creates:
- 1 org (Iron Front Digital)
- 1 operator user
- 12 participants (including 2 system participants)
- Relationships
- Events
- Recommendations

### 6. Generate Prisma Client

```bash
npm run db:generate
```

### 7. Start Development Server

```bash
npm run dev
```

## Owner Authentication

The owner console uses magic-link authentication with no third-party services.

### How to Log In

1. Navigate to `/login`
2. Enter the owner email: `aaronhenry1981@gmail.com`
3. Click "Send Magic Link"
4. Check the console output (in development) or your email (in production) for the magic link
5. Click the link to log in
6. You'll be redirected to `/console/owner`

### Owner Console

The owner console (`/console/owner`) provides:
- **System Status**: Application, database, and Stripe health checks
- **Intake Snapshot**: Counts of intakes by status
- **Recent Activity**: Latest audit events
- **Revenue Signals**: Checkout event counts

### Logout

Click the "Logout" button in the owner console to end your session.

### Security

- Only the hard-coded owner email can request or verify magic links
- Magic links expire after 15 minutes
- Sessions expire after 7 days
- All authentication attempts are logged to audit events

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Management

### Prisma Studio

View and edit database records in a GUI:

```bash
npm run db:studio
```

### Migrations

Create a new migration:

```bash
npm run db:migrate
```

Apply migrations to production:

```bash
npx prisma migrate deploy
```

### Reset Database

⚠️ **Warning: This deletes all data**

```bash
npx prisma migrate reset
```

## Project Structure

```
operator-ui/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   └── console/       # Protected console routes
│   ├── components/        # React components
│   ├── lib/
│   │   ├── db.ts          # Prisma client
│   │   ├── auth.ts        # Authentication utilities
│   │   ├── api.ts         # API client
│   │   ├── audit.ts       # Audit logging
│   │   └── repositories/  # Data access layer
│   └── middleware.ts      # Route protection
├── docker-compose.yml     # Local PostgreSQL
└── .env.example           # Environment template
```

## Authentication

Currently uses database-based user lookup. For production:

1. Implement session-based authentication (NextAuth.js, etc.)
2. Replace `getCurrentUser()` in `src/lib/auth.ts`
3. Update middleware to check sessions

## Org Scoping

All API routes enforce org scoping:

- User must have `org_membership` for the requested org
- `org_id` from URL param is validated against user's memberships
- Returns 403 Forbidden if user is not a member

## Role-Based Access Control

- **Observer**: Read-only access (graph, segments, participants, recommendations)
- **Operator**: Full read access + can write interventions
- **Owner**: Full access (same as operator for now)

## Database Schema

### Core Tables

- `orgs` - Organizations
- `users` - User accounts
- `org_memberships` - User-org relationships with roles
- `participants` - Organization participants
- `relationships` - Participant relationships (edges)
- `events` - Audit log
- `interventions` - Operator interventions
- `recommendations` - Atlas pattern detection recommendations
- `intakes` - Application intake records (with routing and status)
- `leads` - Legacy lead records (for backward compatibility)

See `prisma/schema.prisma` for full schema definition.

## Intake Flow

### Overview

The intake system routes public applications into operator-managed opportunities:

1. **Application Submission** - Public applies via `/apply` page
2. **Intake Creation** - System creates intake record with routing
3. **Automatic Assignment** - Load-balanced assignment to operator pool
4. **Operator Board** - Operators manage intakes via kanban board
5. **Status Tracking** - Status updates tracked with timestamps
6. **Owner Metrics** - Owners see system-level metrics only

### Routing Rules

- `intent=launch` → LaunchPath operator pool
- `intent=scale` → Org Ops operator pool
- `intent=ecosystems` → EEP concierge pool
- If no operator available → unassigned queue

### Status Flow

- `new` → `contacted` → `qualified` → `closed` / `lost`

### Atlas Escalation

Atlas monitors for:
- Unassigned intakes > 24 hours
- First contact SLA breaches
- Conversion rate drops

Atlas only suggests escalation (no automation).

## Compliance

- No MLM terms
- No recruiting language
- No earnings/income references
- No hierarchy visuals
- Behavior-based, not compensation-based
- Fully auditable

## Routes

### Public Routes (No Authentication Required)

- `/` - Home page with intent selection
- `/scale` - Infrastructure for existing organizations
- `/launch` - LaunchPath™ for starting from zero
- `/ecosystems` - Ecosystem Entry Program (EEP)
- `/pricing` - Consolidated pricing view
- `/apply` - Shared application form

### Protected Routes (Operator Console)

- `/console/intake` - Intake Board (kanban-style intake management)
- `/console/overview` - Owner Overview (system-level metrics, owner-only)
- `/console/organization` - Organization Live View
- `/console/segments` - Segments management
- `/console/interventions` - Interventions tracking
- `/console/audit` - Audit log
- `/console/settings` - Settings configuration

## API Endpoints

### Public APIs (No Authentication Required)

- `POST /api/public/apply` - Submit public application

### Protected APIs (Authentication Required)

All endpoints require authentication and org membership:

- `GET /api/console/intakes` - List intakes (scoped by role)
- `GET /api/console/intakes/[id]` - Get intake detail
- `POST /api/console/intakes/[id]/status` - Update intake status
- `POST /api/console/intakes/[id]/assign` - Assign/reassign intake (operators only)
- `POST /api/console/intakes/[id]/notes` - Update intake notes
- `GET /api/console/overview` - Owner metrics (owner-only)
- `GET /api/orgs/[orgId]/graph` - Graph data (nodes + edges)
- `GET /api/orgs/[orgId]/segments` - Computed segments
- `GET /api/orgs/[orgId]/participants/[participantId]` - Participant detail
- `GET /api/orgs/[orgId]/recommendations` - Atlas recommendations

## Development Notes

- All data access goes through repositories (no inline SQL)
- Audit logging persists to `events` table
- Engagement state is computed (not manually set)
- Segments are computed from participant data
- No mock data in production routes (Phase A4)

## Troubleshooting

### Database Connection Issues

1. Check PostgreSQL is running: `docker-compose ps` (if using Docker)
2. Verify `DATABASE_URL` in `.env`
3. Test connection: `npx prisma db pull`

### Migration Issues

1. Reset database: `npx prisma migrate reset`
2. Regenerate client: `npm run db:generate`
3. Check schema for syntax errors

### Seed Script Issues

1. Ensure migrations are applied first
2. Check for unique constraint violations
3. Run seed again (it's idempotent with upserts)

## Production Deployment

1. Set `DATABASE_URL` environment variable
2. Run migrations: `npx prisma migrate deploy`
3. Generate Prisma Client: `npm run db:generate`
4. Build: `npm run build`
5. Start: `npm start`

## License

Private - Iron Front Digital
