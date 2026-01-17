# Quick Start: Configure DATABASE_URL

## The Error You're Seeing

```
Authentication service unavailable. Database connection not configured. 
Please set DATABASE_URL to a PostgreSQL connection string.
```

**This is normal!** All code is complete. You just need to configure `DATABASE_URL` in production.

---

## Step-by-Step Fix (5 Minutes)

### 1. Find Your PostgreSQL Connection String

The `DATABASE_URL` should be the same PostgreSQL database used by `operator-ui` Next.js app.

**Format:**
```
postgresql://username:password@host:5432/database_name
```

**Where to find it:**
- Check your `operator-ui` deployment environment variables
- Check your PostgreSQL database credentials
- Contact your database administrator if needed

**Example:**
```
DATABASE_URL=postgresql://postgres:yourpassword@db.ironfront.com:5432/ironfront
```

### 2. Set DATABASE_URL on Your Server

**Option A: Edit `.env` file on server (Recommended)**

```bash
# SSH to your production server
ssh your-user@your-server

# Navigate to app directory
cd /opt/ifd-app

# Edit .env file (or create if it doesn't exist)
nano .env

# Add this line (replace with your actual connection string):
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Save and exit (Ctrl+X, then Y, then Enter)

# Restart Docker container
docker restart ifd-app

# Verify logs show no DATABASE_URL warnings
docker logs ifd-app | grep -i database
```

**Option B: Set as environment variable in Docker**

```bash
# If using docker-compose or docker run with -e flags:
docker run -e DATABASE_URL=postgresql://... your-image

# Or add to docker-compose.yml:
environment:
  - DATABASE_URL=postgresql://...
```

**Option C: Set in deployment script**

If your `deploy/deploy.sh` script uses `.env` file, make sure `DATABASE_URL` is in `/opt/ifd-app/.env`.

### 3. Verify Connection

After setting `DATABASE_URL` and restarting, check logs:

```bash
# Check container logs
docker logs ifd-app | grep -i postgresql

# Should see:
# [ifd] live :3000 version=... db=/data/ifd.db
# (No "DATABASE_URL not set" warnings)
```

### 4. Test Login Flow

1. Visit `https://ironfrontdigital.com/login`
2. Enter owner email: `aaronhenry1981@gmail.com`
3. Click "Send secure login link"
4. Should see: "Check your email for a secure login link" (green)
5. Check server logs for magic link URL
6. Click magic link → Should redirect to `/console/owner`

---

## Troubleshooting

### Still seeing "Database not configured"?

**Check 1: Is `.env` file being loaded?**
```bash
# Verify .env file exists and has DATABASE_URL
cat /opt/ifd-app/.env | grep DATABASE_URL

# Should output: DATABASE_URL=postgresql://...
```

**Check 2: Is Docker reading the env file?**
```bash
# Check container environment
docker exec ifd-app env | grep DATABASE_URL

# Should output: DATABASE_URL=postgresql://...
```

**Check 3: Is DATABASE_URL format correct?**
- Must start with `postgresql://` or `postgres://`
- Cannot be `mysql://` (wrong database type)
- Format: `postgresql://user:password@host:port/dbname`

**Check 4: Can server reach PostgreSQL?**
```bash
# Test connection from server
docker exec ifd-app node -e "const pg = require('pg'); const pool = new pg.Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT 1').then(() => console.log('Connected!')).catch(e => console.error('Failed:', e.message));"
```

### Connection errors?

**Error: "Connection refused"**
- PostgreSQL host is not reachable from Docker container
- Check firewall rules
- Verify host IP/domain is correct

**Error: "Authentication failed"**
- Database credentials are incorrect
- Verify username and password

**Error: "Database does not exist"**
- Database name is wrong
- Verify database exists in PostgreSQL

### Need help?

1. **Check server logs:** `docker logs ifd-app`
2. **Verify .env file:** `cat /opt/ifd-app/.env`
3. **Test PostgreSQL connection:** Use `psql` from server
4. **Check deploy script:** See `deploy/deploy.sh` how it loads `.env`

---

## What Happens After Configuration

Once `DATABASE_URL` is set correctly:

✅ Login page will work  
✅ Magic links will be generated  
✅ Sessions will be created  
✅ Owner console will be accessible  
✅ All auth flows operational  

The error message will disappear and you'll see:
- Green success message: "Check your email for a secure login link"
- Magic link in server logs
- Successful redirect to `/console/owner`

---

## Summary

**Problem:** `DATABASE_URL` not set in production  
**Solution:** Add `DATABASE_URL=postgresql://...` to `/opt/ifd-app/.env`  
**Time:** 5 minutes  
**Result:** Authentication fully operational

---

**All code is complete. Just need this one configuration step!**

