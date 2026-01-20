# Supabase PostgreSQL Setup for Authentication

## Step 1: Create Supabase Project

1. Go to: https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - Project name: `ironfront-digital` (or your choice)
   - Database password: (generate strong password, save it!)
   - Region: Choose closest to your deployment region
4. Click "Create new project"
5. Wait 2-3 minutes for project to provision

## Step 2: Get Connection String

1. In Supabase dashboard, go to: **Settings** → **Database**
2. Scroll to "Connection string" section
3. Select "URI" tab
4. Copy the connection string (it will look like):
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
5. **Important:** Use the **Pooled connection** (port 6543) for better performance

**Alternative:** If you need the direct connection (port 5432):
   - Use "Transaction" mode in the connection string
   - Format: `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require`

## Step 3: Run Database Migrations

The auth tables need to be created. Use the Prisma migration:

```bash
cd operator-ui
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require" npx prisma migrate deploy
```

Or apply the SQL migration directly:

```bash
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require" -f prisma/migrations/20250116000000_add_auth_tables/migration.sql
```

## Step 4: Set DATABASE_URL in Production

Use GitHub Actions workflow:

1. Go to: https://github.com/aaronhenry1981-collab/ironfront-digital-platform/actions
2. Click "Set DATABASE_URL in Production"
3. Click "Run workflow"
4. Paste your Supabase connection string
5. Click "Run workflow"

**Connection string format:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

Or use pooled connection (recommended):
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
```

## Step 5: Verify Setup

After setting DATABASE_URL:

1. Check health: `curl https://ironfrontdigital.com/health`
   - Should show: `"postgres":"configured"`

2. Test login: Visit `https://ironfrontdigital.com/login`
   - Should NOT show DATABASE_URL error
   - Should accept email and show "Check your email" message

3. Verify database:
   ```sql
   -- Connect to Supabase SQL Editor or via psql
   SELECT * FROM users WHERE email = 'aaronhenry1981@gmail.com';
   ```

## Required Tables

These tables must exist (created by migration):

- `users` - User accounts
- `magic_links` - Magic link tokens
- `sessions` - Active sessions
- `events` - Audit log
- `orgs` - Organizations
- `intakes` - Lead intake records

## Security Notes

- Always use `?sslmode=require` in connection string (Supabase requires SSL)
- Pooled connections (port 6543) are recommended for serverless/containers
- Direct connections (port 5432) work but may hit connection limits
- Never commit connection strings to git

## Troubleshooting

**Connection refused:**
- Check connection string format
- Ensure `?sslmode=require` is included
- Verify project is active in Supabase dashboard

**Authentication failed:**
- Verify password is correct
- Check if IP is allowed (Supabase allows all by default, but check settings)

**Table doesn't exist:**
- Run migrations: `npx prisma migrate deploy`
- Or apply SQL migration directly

