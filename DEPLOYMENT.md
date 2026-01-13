# Deployment Guide

## Production Deployment

This application uses zero-downtime deployment with Docker containers, database migrations, and health gates.

### Deployment Pipeline

1. **GitHub Actions** triggers on push to `main`
2. **SSM Command** syncs code to EC2 instance
3. **deploy.sh** script runs on instance:
   - Acquires deployment lock
   - Builds Docker image
   - Runs migrations (pre-swap)
   - Starts staged container on port 3001
   - Waits for `/health` and `/ready` endpoints
   - Swaps to port 3000 if gates pass
   - Rolls back on failure
   - Logs deploy events

### Environment Variables

Create `/opt/ifd-app/.env` on the EC2 instance with required variables:

```bash
# Required
ADMIN_KEY=your-secure-admin-key-here

# Optional
STRIPE_SECRET_KEY=sk_test_...  # For Stripe integration
PORT=3000                       # Default: 3000
DB_PATH=/data/ifd.db            # Default: /data/ifd.db
```

**To set environment variables:**

1. SSH into EC2 instance (or use SSM)
2. Create/edit `/opt/ifd-app/.env`:
   ```bash
   sudo nano /opt/ifd-app/.env
   ```
3. Add variables (one per line, KEY=value format)
4. Set permissions:
   ```bash
   sudo chmod 600 /opt/ifd-app/.env
   sudo chown ec2-user:ec2-user /opt/ifd-app/.env
   ```

**Required Variables:**
- `ADMIN_KEY` - Admin API key for `/admin/*` endpoints
- `APP_VERSION` - Automatically set by deploy script (git SHA)

**Optional Variables:**
- `STRIPE_SECRET_KEY` - Stripe API key for customer creation
- `PORT` - Server port (default: 3000)
- `DB_PATH` - SQLite database path (default: /data/ifd.db)

### Health Endpoints

- `/health` - Returns 200 if server process is running
- `/ready` - Returns 200 if server process is running AND database connection succeeds
- `/version` - Returns current APP_VERSION

Deployment gates check both `/health` and `/ready` before swapping containers.

### Database Migrations

- SQLite migrations run automatically on server start
- For future PostgreSQL migrations, `npm run db:migrate` is called in deploy script
- Migrations run BEFORE container swap (in one-off container)
- If migrations fail, deployment aborts and old container continues running

### Rollback

- Automatic rollback if new container fails health/ready gates
- Uses previous container image
- Old container image preserved until successful deployment

### Deployment Events

Deploy events are logged to the `events` table:
- `deploy_success` - Deployment completed successfully
- `deploy_failed` - Deployment failed (metadata includes reason)

Event logging is non-blocking (deployment succeeds even if event logging fails).

### Manual Deployment

To deploy manually via SSM:

```bash
aws ssm send-command \
  --region us-east-2 \
  --instance-ids i-0160b2a838a432bbc \
  --document-name "AWS-RunShellScript" \
  --parameters commands="[
    \"cd /opt/ifd-app\",
    \"APP_VERSION=\$(git rev-parse --short HEAD 2>/dev/null || echo manual-$(date +%s)) /opt/ifd-deploy/deploy.sh\"
  ]"
```

### Troubleshooting

**Deployment fails at migration step:**
- Check database file permissions
- Verify DATA_DIR is accessible
- Check migration logs in container output

**Deployment fails at health gates:**
- Check container logs: `docker logs ifd-app-new`
- Verify `/health` and `/ready` endpoints respond
- Check database connection

**Rollback occurs:**
- Check logs for specific failure reason
- Verify new code doesn't break database schema
- Check environment variables are set correctly

**Deploy event logging fails:**
- Non-fatal error (deployment still succeeds)
- Check database permissions
- Verify events table exists

