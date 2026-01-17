# Authentication Setup for server.js

## Overview

The `server.js` application now supports owner-only magic link authentication using PostgreSQL (shared with the Next.js `operator-ui` app).

## Required Configuration

### 1. Environment Variable: `DATABASE_URL`

The `DATABASE_URL` environment variable **must** be set to a PostgreSQL connection string.

**Format:**
```
postgresql://username:password@host:5432/database
```

**Example:**
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/ironfront
```

### 2. Where to Set `DATABASE_URL`

For Docker deployments (via `deploy/deploy.sh`):

1. **Create or update `.env` file** in `/opt/ifd-app/` on the server:
   ```bash
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   ```

2. The deploy script automatically loads `.env` using `--env-file` flag

3. **Verify** it's being passed:
   ```bash
   docker inspect ifd-app | grep -i DATABASE_URL
   ```

### 3. PostgreSQL Database Requirements

The PostgreSQL database must have these tables (created by `operator-ui` Prisma migrations):

- `users` - User accounts with `email` and `role` fields
- `magic_links` - Magic link tokens (hashed)
- `sessions` - Active user sessions
- `events` - Audit log (optional, non-blocking)

**Migration:** Run Prisma migrations in `operator-ui` first:
```bash
cd operator-ui
npx prisma migrate deploy
```

### 4. Verify Connection

After deployment, check logs for connection status:

**Success:**
```
[ifd] live :3000 version=... db=/data/ifd.db
```

**Warning (if DATABASE_URL not set):**
```
[ifd] DATABASE_URL not set. Auth API routes will not work.
```

**Warning (if DATABASE_URL not PostgreSQL):**
```
[ifd] DATABASE_URL is not PostgreSQL (must be postgres:// or postgresql://). Auth will not work.
```

**Error (if connection fails):**
```
[ifd] PostgreSQL connection failed: <error message>
```

### 5. Test Authentication Flow

1. Visit `https://ironfrontdigital.com/login`
2. Enter owner email: `aaronhenry1981@gmail.com`
3. Click "Send secure login link"
4. Check server logs for magic link URL (console output in v1)
5. Click the magic link to verify and create session
6. Should redirect to `/console/owner` (or wherever owner console is)

### 6. Troubleshooting

**Error: "Database not configured" or 503 error**
- `DATABASE_URL` is not set in `.env` file
- `DATABASE_URL` format is wrong (must start with `postgres://` or `postgresql://`)
- PostgreSQL database is not accessible from Docker container

**Error: "PostgreSQL connection failed"**
- Database credentials are incorrect
- Database host is not reachable
- Database does not exist
- Firewall/network rules blocking connection

**Check connection:**
```bash
# SSH to server
ssh user@server

# Test PostgreSQL connection directly
psql "$DATABASE_URL" -c "SELECT 1"

# Check if tables exist
psql "$DATABASE_URL" -c "\d users"
psql "$DATABASE_URL" -c "\d magic_links"
psql "$DATABASE_URL" -c "\d sessions"
```

## Notes

- The `server.js` app uses **both** SQLite (for leads/events) **and** PostgreSQL (for auth)
- SQLite is the primary database for the app
- PostgreSQL is only used for authentication routes (`/api/auth/*`)
- If `DATABASE_URL` is not set, all other routes work normally, but auth routes return 503

