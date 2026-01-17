#!/bin/bash
# Check DATABASE_URL configuration for server.js

echo "=========================================="
echo "DATABASE_URL Configuration Check"
echo "=========================================="
echo ""

# Check if .env file exists
ENV_FILE="/opt/ifd-app/.env"
if [ -f "$ENV_FILE" ]; then
  echo "✅ .env file found: $ENV_FILE"
  echo ""
  
  # Check if DATABASE_URL is set
  if grep -q "DATABASE_URL" "$ENV_FILE"; then
    echo "✅ DATABASE_URL found in .env file"
    DATABASE_URL=$(grep "DATABASE_URL" "$ENV_FILE" | cut -d '=' -f2-)
    
    # Check format
    if [[ "$DATABASE_URL" == postgresql://* ]] || [[ "$DATABASE_URL" == postgres://* ]]; then
      echo "✅ DATABASE_URL format is correct (PostgreSQL)"
      echo ""
      echo "DATABASE_URL value (hidden):"
      echo "  $(echo $DATABASE_URL | sed 's/:[^:@]*@/:****@/g')"
    else
      echo "❌ DATABASE_URL format is incorrect"
      echo "   Must start with 'postgresql://' or 'postgres://'"
      echo "   Current value: ${DATABASE_URL:0:20}..."
    fi
  else
    echo "❌ DATABASE_URL not found in .env file"
    echo ""
    echo "Add this line to $ENV_FILE:"
    echo "  DATABASE_URL=postgresql://user:password@host:5432/dbname"
  fi
else
  echo "❌ .env file not found: $ENV_FILE"
  echo ""
  echo "Create .env file with:"
  echo "  DATABASE_URL=postgresql://user:password@host:5432/dbname"
fi

echo ""
echo "=========================================="
echo "Docker Container Check"
echo "=========================================="
echo ""

# Check if container is running
if docker ps | grep -q "ifd-app"; then
  echo "✅ Docker container 'ifd-app' is running"
  
  # Check if DATABASE_URL is in container environment
  if docker exec ifd-app env | grep -q "DATABASE_URL"; then
    echo "✅ DATABASE_URL is set in container environment"
  else
    echo "❌ DATABASE_URL not found in container environment"
    echo "   Container needs to be restarted after adding to .env"
  fi
else
  echo "⚠️  Docker container 'ifd-app' not found or not running"
fi

echo ""
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo ""
echo "1. If DATABASE_URL is missing or wrong:"
echo "   Edit $ENV_FILE"
echo "   Add: DATABASE_URL=postgresql://user:password@host:5432/dbname"
echo ""
echo "2. Restart container:"
echo "   docker restart ifd-app"
echo ""
echo "3. Check logs:"
echo "   docker logs ifd-app | grep -i database"
echo ""
echo "4. Test health endpoint:"
echo "   curl http://localhost:3000/health | jq ."
echo ""

