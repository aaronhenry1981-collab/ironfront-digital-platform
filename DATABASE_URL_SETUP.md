# DATABASE_URL Setup for Authentication

## Current Status

✅ Login page is rendering correctly  
✅ Auth API routes are implemented  
⚠️ **`DATABASE_URL` needs to be configured in production**

## Quick Fix

The error message you're seeing indicates `DATABASE_URL` is not set. This environment variable must point to the **same PostgreSQL database** that the `operator-ui` Next.js app uses.

## Steps to Configure

### 1. Find Your PostgreSQL DATABASE_URL

The `DATABASE_URL` should be the same connection string used by `operator-ui`. It will look like:

```
postgresql://username:password@host:5432/database_name
```

**Where to find it:**
- Check the `operator-ui` deployment environment variables
- Or check where Prisma migrations ran successfully
- Or contact your database administrator

### 2. Set DATABASE_URL for server.js Deployment

The `server.js` app deploys via Docker using `deploy/deploy.sh`, which loads environment variables from an `.env` file.

**Option A: Add to existing `.env` file on server**

SSH to your server and edit/create `/opt/ifd-app/.env`:

```bash
# SSH to server (example)
ssh user@your-server

# Edit .env file
nano /opt/ifd-app/.env

# Add this line (use your actual PostgreSQL connection string):
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Save and exit (Ctrl+X, then Y, then Enter)
```

**Option B: Set in deployment pipeline/environment**

If you use GitHub Actions or another CI/CD, add `DATABASE_URL` as a secret/environment variable that gets passed to the Docker container.

### 3. Verify PostgreSQL Connection

After setting `DATABASE_URL`, restart the container:

```bash
# Restart Docker container
docker restart ifd-app

# Check logs to verify connection
docker logs ifd-app | grep -i database
```

**Success indicators:**
- No "DATABASE_URL not set" warnings
- No "PostgreSQL connection failed" errors
- Auth API routes respond (not 503 errors)

### 4. Test the Login Flow

1. Visit `https://ironfrontdigital.com/login`
2. Enter owner email: `aaronhenry1981@gmail.com`
3. Click "Send secure login link"
4. Should see: "Check your email for a secure login link" (green)
5. Check server logs for magic link URL
6. Click the magic link to complete authentication

## Important Notes

- **Format:** Must start with `postgres://` or `postgresql://` (not `mysql://`)
- **Same Database:** Must point to the **same** PostgreSQL database as `operator-ui`
- **Tables Required:** Database must have `users`, `magic_links`, `sessions`, `events` tables (created by Prisma migrations)

## Troubleshooting

**Still seeing "Database not configured"?**
1. Verify `.env` file exists at `/opt/ifd-app/.env`
2. Verify `DATABASE_URL` line is present and has correct format
3. Restart Docker container after changes
4. Check container logs: `docker logs ifd-app`

**Connection errors?**
1. Test connection from server: `psql "$DATABASE_URL" -c "SELECT 1"`
2. Verify database host is reachable from Docker container
3. Check firewall/security group rules
4. Verify database credentials are correct

## Next Steps After Configuration

Once `DATABASE_URL` is set and working:

1. ✅ Login form will work
2. ✅ Magic links will be generated
3. ✅ Sessions will be created
4. ⚠️ **Email sending:** Currently logs to console. Need to wire to email service for production.

