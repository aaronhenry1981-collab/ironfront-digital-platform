#!/bin/bash
# Set DATABASE_URL in production .env file
# Run this on your production server: bash deploy/set-database-url.sh

set -euo pipefail

APP_DIR="/opt/ifd-app"
ENV_FILE="${APP_DIR}/.env"

echo "=========================================="
echo "Set DATABASE_URL Configuration"
echo "=========================================="
echo ""

# Check if .env file exists, create if not
if [ ! -f "$ENV_FILE" ]; then
  echo "Creating .env file: $ENV_FILE"
  mkdir -p "$APP_DIR"
  touch "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

# Check if DATABASE_URL already exists
if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
  echo "⚠️  DATABASE_URL already exists in .env file"
  echo ""
  echo "Current value (hidden):"
  grep "^DATABASE_URL=" "$ENV_FILE" | sed 's/:[^:@]*@/:****@/g'
  echo ""
  read -p "Do you want to update it? (y/n): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
  # Remove existing DATABASE_URL line
  sed -i '/^DATABASE_URL=/d' "$ENV_FILE"
fi

# Prompt for DATABASE_URL
echo ""
echo "Enter your PostgreSQL DATABASE_URL"
echo "Format: postgresql://username:password@host:5432/database_name"
echo "Example: postgresql://postgres:mypass@db.example.com:5432/ironfront"
echo ""
read -p "DATABASE_URL: " DATABASE_URL

# Validate format
if [[ ! "$DATABASE_URL" == postgresql://* ]] && [[ ! "$DATABASE_URL" == postgres://* ]]; then
  echo ""
  echo "❌ Error: DATABASE_URL must start with 'postgresql://' or 'postgres://'"
  echo "   Got: ${DATABASE_URL:0:20}..."
  exit 1
fi

# Add to .env file
echo "DATABASE_URL=$DATABASE_URL" >> "$ENV_FILE"

echo ""
echo "✅ DATABASE_URL added to $ENV_FILE"
echo ""

# Check if Docker container exists
if docker ps -a | grep -q "ifd-app"; then
  echo "⚠️  Docker container 'ifd-app' is running"
  echo ""
  read -p "Do you want to restart it now? (y/n): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Restarting Docker container..."
    docker restart ifd-app
    echo "✅ Container restarted"
    echo ""
    echo "Waiting for container to be ready..."
    sleep 5
    
    # Check health
    if curl -fsS "http://localhost:3000/health" >/dev/null 2>&1; then
      echo "✅ Container is healthy"
      
      # Check database status
      HEALTH_RESPONSE=$(curl -fsS "http://localhost:3000/health")
      if echo "$HEALTH_RESPONSE" | grep -q '"postgres":"configured"'; then
        echo "✅ PostgreSQL connection configured successfully!"
      else
        echo "⚠️  PostgreSQL may not be connected. Check logs: docker logs ifd-app"
      fi
    else
      echo "⚠️  Container health check failed. Check logs: docker logs ifd-app"
    fi
  else
    echo ""
    echo "⚠️  Remember to restart the container: docker restart ifd-app"
  fi
else
  echo "⚠️  Docker container 'ifd-app' not found"
  echo "   Container will pick up DATABASE_URL on next deployment or start"
fi

echo ""
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo ""
echo "1. Test login: https://ironfrontdigital.com/login"
echo "2. Check logs: docker logs ifd-app | grep -i database"
echo "3. Verify health: curl http://localhost:3000/health | jq ."
echo ""

