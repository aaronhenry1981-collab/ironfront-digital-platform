#!/usr/bin/env bash
set -euo pipefail

# Complete RDS setup script - runs on EC2 instance via SSM
# This script does everything: creates RDS, stores in SSM, runs migrations, restarts container

REGION="us-east-2"
INSTANCE_ID="i-0160b2a838a432bbc"
DB_IDENTIFIER="ifd-postgres"
DB_NAME="ironfront"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-IronFront2024!SecureRDS#Postgres}"
SSM_PARAM="/ironfront/prod/DATABASE_URL"

echo "=========================================="
echo "Iron Front Digital - Complete RDS Setup"
echo "=========================================="
echo ""

# Step 1: Get VPC and Security Group Info
echo "[1/7] Getting VPC and security group information..."
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text \
  --region "$REGION")

INSTANCE_SG=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text \
  --region "$REGION")

echo "  VPC ID: $VPC_ID"
echo "  Instance Security Group: $INSTANCE_SG"
echo ""

# Step 2: Create/Get RDS Security Group
echo "[2/7] Setting up RDS security group..."
EXISTING_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=ifd-rds-postgres" "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' \
  --output text \
  --region "$REGION" 2>/dev/null || echo "None")

if [[ "$EXISTING_SG" != "None" && "$EXISTING_SG" != "" ]]; then
  echo "  Security group already exists: $EXISTING_SG"
  SG_ID="$EXISTING_SG"
else
  echo "  Creating security group..."
  SG_ID=$(aws ec2 create-security-group \
    --group-name ifd-rds-postgres \
    --description "Security group for Iron Front Digital RDS PostgreSQL" \
    --vpc-id "$VPC_ID" \
    --query 'GroupId' \
    --output text \
    --region "$REGION")
  
  echo "  Created: $SG_ID"
  
  # Allow inbound from EC2 instance security group
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port 5432 \
    --source-group "$INSTANCE_SG" \
    --region "$REGION" 2>/dev/null || echo "  Rule may already exist"
fi
echo ""

# Step 3: Get PostgreSQL Version
echo "[3/7] Getting latest PostgreSQL version..."
PG_VERSION=$(aws rds describe-db-engine-versions \
  --engine postgres \
  --query 'DBEngineVersions[0].EngineVersion' \
  --output text \
  --region "$REGION")
echo "  PostgreSQL version: $PG_VERSION"
echo ""

# Step 4: Create RDS Instance (if needed)
echo "[4/7] Checking/Creating RDS instance..."
EXISTING_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_IDENTIFIER" \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text \
  --region "$REGION" 2>/dev/null || echo "None")

if [[ "$EXISTING_STATUS" != "None" && "$EXISTING_STATUS" != "" ]]; then
  echo "  RDS instance exists with status: $EXISTING_STATUS"
  if [[ "$EXISTING_STATUS" != "available" ]]; then
    echo "  Waiting for instance to be available..."
    aws rds wait db-instance-available \
      --db-instance-identifier "$DB_IDENTIFIER" \
      --region "$REGION" || echo "  Still initializing..."
  fi
else
  echo "  Creating RDS instance: $DB_IDENTIFIER"
  echo "  This will take 5-10 minutes..."
  
  aws rds create-db-instance \
    --db-instance-identifier "$DB_IDENTIFIER" \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version "$PG_VERSION" \
    --master-username "$DB_USERNAME" \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 \
    --storage-type gp2 \
    --db-name "$DB_NAME" \
    --vpc-security-group-ids "$SG_ID" \
    --db-subnet-group-name default \
    --publicly-accessible \
    --backup-retention-period 7 \
    --no-multi-az \
    --region "$REGION"
  
  echo "  Waiting for RDS to be available (this takes 5-10 minutes)..."
  aws rds wait db-instance-available \
    --db-instance-identifier "$DB_IDENTIFIER" \
    --region "$REGION" || echo "  Instance may still be initializing"
fi

# Get endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_IDENTIFIER" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text \
  --region "$REGION")

echo "  RDS Endpoint: $DB_ENDPOINT"
echo ""

# Step 5: Store DATABASE_URL in SSM
echo "[5/7] Storing DATABASE_URL in SSM Parameter Store..."
DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_ENDPOINT}:5432/${DB_NAME}"

if aws ssm get-parameter --name "$SSM_PARAM" --region "$REGION" >/dev/null 2>&1; then
  echo "  Parameter exists, updating..."
  aws ssm put-parameter \
    --name "$SSM_PARAM" \
    --value "$DATABASE_URL" \
    --type SecureString \
    --overwrite \
    --region "$REGION" >/dev/null
else
  echo "  Creating new parameter..."
  aws ssm put-parameter \
    --name "$SSM_PARAM" \
    --value "$DATABASE_URL" \
    --type SecureString \
    --description "PostgreSQL connection string for Iron Front Digital production" \
    --region "$REGION" >/dev/null
fi

echo "  ✅ Stored in SSM: $SSM_PARAM"
echo ""

# Step 6: Install PostgreSQL client and run migrations
echo "[6/7] Running database migrations..."
echo "  Installing PostgreSQL client..."
sudo yum install -y postgresql15 >/dev/null 2>&1 || \
  sudo apt-get update >/dev/null 2>&1 && sudo apt-get install -y postgresql-client >/dev/null 2>&1 || \
  echo "  PostgreSQL client install skipped (may already be installed)"

echo "  Testing connection..."
for i in {1..6}; do
  if psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
    echo "  ✅ Connection successful"
    break
  else
    if [[ $i -eq 6 ]]; then
      echo "  ❌ Connection failed after 6 attempts"
      exit 1
    fi
    echo "  Waiting for RDS to be ready... (attempt $i/6)"
    sleep 10
  fi
done

echo "  Applying migration..."
MIGRATION_FILE="/opt/ifd-app/operator-ui/prisma/migrations/20250116000000_add_auth_tables/migration.sql"
if [[ -f "$MIGRATION_FILE" ]]; then
  psql "$DATABASE_URL" -f "$MIGRATION_FILE" || {
    echo "  ⚠️  Migration file not found at $MIGRATION_FILE, creating tables manually..."
    
    # Create tables manually if migration file doesn't exist
    psql "$DATABASE_URL" <<EOF || true
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  lead_id UUID,
  meta_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert owner user if not exists
INSERT INTO users (email, role) 
VALUES ('aaronhenry1981@gmail.com', 'owner')
ON CONFLICT (email) DO UPDATE SET role = 'owner';
EOF
  }
else
  echo "  Creating tables manually..."
  psql "$DATABASE_URL" <<EOF
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  lead_id UUID,
  meta_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert owner user if not exists
INSERT INTO users (email, role) 
VALUES ('aaronhenry1981@gmail.com', 'owner')
ON CONFLICT (email) DO UPDATE SET role = 'owner';
EOF
fi

echo "  ✅ Migrations complete"
echo ""

# Step 7: Restart container with DATABASE_URL from SSM
echo "[7/7] Restarting container with DATABASE_URL from SSM..."
CONTAINER_NAME="ifd-app"

# Get DATABASE_URL from SSM
EXPORTED_DB_URL=$(aws ssm get-parameter \
  --name "$SSM_PARAM" \
  --with-decryption \
  --query Parameter.Value \
  --output text \
  --region "$REGION")

if [[ -z "$EXPORTED_DB_URL" ]]; then
  echo "  ❌ Failed to retrieve DATABASE_URL from SSM"
  exit 1
fi

# Restart container - it will pick up DATABASE_URL from SSM via deploy.sh
echo "  Restarting container..."
docker restart "$CONTAINER_NAME" >/dev/null 2>&1 || echo "  Container may not be running yet"

echo "  Waiting for container to be healthy..."
sleep 10

for i in {1..12}; do
  if curl -fsS http://localhost:3000/health >/dev/null 2>&1; then
    echo "  ✅ Container is healthy"
    
    # Check if DATABASE_URL is working
    HEALTH_RESPONSE=$(curl -fsS http://localhost:3000/health 2>/dev/null || echo "")
    if echo "$HEALTH_RESPONSE" | grep -q "postgres.*connected\|postgres.*ok" || echo "$HEALTH_RESPONSE" | grep -q '"postgres":"ok"'; then
      echo "  ✅ Database connection verified"
    else
      echo "  ⚠️  Container healthy but database status unclear"
    fi
    break
  else
    if [[ $i -eq 12 ]]; then
      echo "  ⚠️  Container not responding after 2 minutes"
      echo "  Checking logs..."
      docker logs --tail 50 "$CONTAINER_NAME" 2>&1 | head -20
    else
      echo "  Waiting... (attempt $i/12)"
      sleep 10
    fi
  fi
done

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "RDS Instance: $DB_IDENTIFIER"
echo "Endpoint: $DB_ENDPOINT"
echo "SSM Parameter: $SSM_PARAM"
echo ""
echo "Next: Test login at https://ironfrontdigital.com/login"
echo "Expected: No DATABASE_URL error"

