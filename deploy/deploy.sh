#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/ifd-app"
DATA_DIR="/opt/ifd-data"
APP_NAME="ifd-app"
PORT_MAIN="3000"
PORT_STAGE="3001"
LOCK_FILE="/tmp/ifd-deploy.lock"

# Require APP_VERSION (no more unknown/timestamps unless explicitly set by caller)
: "${APP_VERSION:?APP_VERSION is required}"

mkdir -p "$DATA_DIR"
chmod 700 "$DATA_DIR" || true

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[deploy] another deployment is running; exiting"
  exit 0
fi

cd "$APP_DIR"

IMAGE_TAG="${APP_NAME}:${APP_VERSION}"
STAGE_NAME="${APP_NAME}-new"

echo "[deploy] building image ${IMAGE_TAG}"
docker build -t "${IMAGE_TAG}" --build-arg APP_VERSION="${APP_VERSION}" .

OLD_CONTAINER_ID="$(docker ps -aqf "name=^${APP_NAME}$" || true)"
OLD_IMAGE_ID=""
if [[ -n "${OLD_CONTAINER_ID}" ]]; then
  OLD_IMAGE_ID="$(docker inspect --format='{{.Image}}' "${OLD_CONTAINER_ID}" || true)"
fi

# Ensure .env file exists (with placeholders if needed)
if [[ ! -f "${APP_DIR}/.env" ]]; then
  echo "[deploy] .env file not found, initializing..."
  mkdir -p "${APP_DIR}"
  touch "${APP_DIR}/.env"
  chmod 600 "${APP_DIR}/.env"
  echo "# Iron Front Digital - Environment Variables" >> "${APP_DIR}/.env"
  echo "# Required: DATABASE_URL (PostgreSQL connection string)" >> "${APP_DIR}/.env"
  echo "# Format: postgresql://username:password@host:5432/database_name" >> "${APP_DIR}/.env"
  echo "# DATABASE_URL=postgresql://user:password@host:5432/dbname" >> "${APP_DIR}/.env"
  echo "[deploy] WARNING: .env file created with placeholder. Please set DATABASE_URL for authentication to work."
fi

# Prepare env file args
ENVFILE_ARGS=()
if [[ -f "${APP_DIR}/.env" ]]; then
  ENVFILE_ARGS+=(--env-file "${APP_DIR}/.env")
  
  # Warn if DATABASE_URL is not set or is a placeholder
  if grep -q "^# DATABASE_URL=" "${APP_DIR}/.env" || ! grep -q "^DATABASE_URL=postgres" "${APP_DIR}/.env"; then
    echo "[deploy] WARNING: DATABASE_URL may not be configured. Authentication will not work."
    echo "[deploy] Set DATABASE_URL in ${APP_DIR}/.env or use GitHub Actions workflow 'Set DATABASE_URL in Production'"
  fi
fi

# Helper function to log deploy events (non-blocking)
log_deploy_event() {
  local event_type=$1
  local reason=$2
  docker run --rm \
    -e "DB_PATH=/data/ifd.db" \
    -v "${DATA_DIR}:/data" \
    "${ENVFILE_ARGS[@]}" \
    "${IMAGE_TAG}" \
    node -e "
      const Database = require('better-sqlite3');
      const db = new Database(process.env.DB_PATH);
      try {
        const stmt = db.prepare('INSERT INTO events (id, type, lead_id, meta_json, created_at) VALUES (?, ?, ?, ?, ?)');
        stmt.run(
          require('crypto').randomUUID(),
          '${event_type}',
          null,
          JSON.stringify({ version: '${APP_VERSION}', reason: '${reason}' }),
          new Date().toISOString()
        );
        console.log('Deploy event logged');
      } catch (e) {
        console.error('Failed to log deploy event (non-fatal):', e.message);
      }
      db.close();
    " >/dev/null 2>&1 || echo "[deploy] deploy event logging failed (non-fatal)"
}

# Run migrations in one-off container BEFORE swap
echo "[deploy] running migrations..."
MIGRATE_CONTAINER="${APP_NAME}-migrate-${APP_VERSION}"
docker rm -f "${MIGRATE_CONTAINER}" >/dev/null 2>&1 || true

# SQLite migrations run automatically on server start, but we verify schema here
# For future PostgreSQL migrations, this is where npm run db:migrate would run
if ! docker run --rm \
  --name "${MIGRATE_CONTAINER}" \
  -e "APP_VERSION=${APP_VERSION}" \
  -e "DB_PATH=/data/ifd.db" \
  -v "${DATA_DIR}:/data" \
  "${ENVFILE_ARGS[@]}" \
  "${IMAGE_TAG}" \
  npm run db:migrate; then
  echo "[deploy] migration failed; aborting deploy"
  docker rm -f "${MIGRATE_CONTAINER}" >/dev/null 2>&1 || true
  log_deploy_event "deploy_failed" "migration_failed"
  exit 1
fi

docker rm -f "${MIGRATE_CONTAINER}" >/dev/null 2>&1 || true
echo "[deploy] migrations complete"

# Start new container on staging port
echo "[deploy] starting staged container on :${PORT_STAGE}"
docker rm -f "${STAGE_NAME}" >/dev/null 2>&1 || true

docker run -d --name "${STAGE_NAME}" \
  -p "${PORT_STAGE}:3000" \
  -e "APP_VERSION=${APP_VERSION}" \
  -e "DB_PATH=/data/ifd.db" \
  -v "${DATA_DIR}:/data" \
  "${ENVFILE_ARGS[@]}" \
  --restart unless-stopped \
  "${IMAGE_TAG}" >/dev/null

# Wait for BOTH /health AND /ready endpoints
echo "[deploy] waiting for staged health + ready gates..."
for i in {1..30}; do
  HEALTH_OK=false
  READY_OK=false
  
  if curl -fsS "http://127.0.0.1:${PORT_STAGE}/health" >/dev/null 2>&1; then
    HEALTH_OK=true
  fi
  
  if curl -fsS "http://127.0.0.1:${PORT_STAGE}/ready" >/dev/null 2>&1; then
    READY_OK=true
  fi
  
  if [[ "$HEALTH_OK" == "true" && "$READY_OK" == "true" ]]; then
    echo "[deploy] staged is healthy+ready"
    break
  fi
  
  if [[ "${i}" == "30" ]]; then
    echo "[deploy] staged failed gates (health=${HEALTH_OK}, ready=${READY_OK}); dumping logs"
    docker logs --tail 200 "${STAGE_NAME}" || true
    docker rm -f "${STAGE_NAME}" >/dev/null 2>&1 || true
    log_deploy_event "deploy_failed" "staged_gates_failed: health=${HEALTH_OK}, ready=${READY_OK}"
    exit 1
  fi
  
  sleep 2
done

# Swap to main port
echo "[deploy] swapping to port :${PORT_MAIN}"
if [[ -n "${OLD_CONTAINER_ID}" ]]; then
  echo "[deploy] stopping old container ${APP_NAME}"
  docker stop "${APP_NAME}" >/dev/null || true
  docker rm "${APP_NAME}" >/dev/null || true
fi

docker run -d --name "${APP_NAME}" \
  -p "${PORT_MAIN}:3000" \
  -e "APP_VERSION=${APP_VERSION}" \
  -e "DB_PATH=/data/ifd.db" \
  -v "${DATA_DIR}:/data" \
  "${ENVFILE_ARGS[@]}" \
  --restart unless-stopped \
  "${IMAGE_TAG}" >/dev/null

# Verify main container gates
echo "[deploy] verifying main health + ready gates..."
sleep 3

HEALTH_OK=false
READY_OK=false

if curl -fsS "http://127.0.0.1:${PORT_MAIN}/health" >/dev/null 2>&1; then
  HEALTH_OK=true
fi

if curl -fsS "http://127.0.0.1:${PORT_MAIN}/ready" >/dev/null 2>&1; then
  READY_OK=true
fi

if [[ "$HEALTH_OK" != "true" || "$READY_OK" != "true" ]]; then
  echo "[deploy] NEW container failed gates (health=${HEALTH_OK}, ready=${READY_OK}) — attempting rollback"
  docker logs --tail 200 "${APP_NAME}" || true
  docker rm -f "${APP_NAME}" >/dev/null 2>&1 || true

  if [[ -n "${OLD_IMAGE_ID}" ]]; then
    echo "[deploy] rolling back to previous image ${OLD_IMAGE_ID}"
    docker run -d --name "${APP_NAME}" \
      -p "${PORT_MAIN}:3000" \
      -e "DB_PATH=/data/ifd.db" \
      -v "${DATA_DIR}:/data" \
      "${ENVFILE_ARGS[@]}" \
      --restart unless-stopped \
      "${OLD_IMAGE_ID}" >/dev/null
    sleep 3
    curl -fsS "http://127.0.0.1:${PORT_MAIN}/health" >/dev/null 2>&1 && echo "[deploy] rollback healthy" || true
  fi

  docker rm -f "${STAGE_NAME}" >/dev/null 2>&1 || true
  log_deploy_event "deploy_failed" "main_gates_failed: health=${HEALTH_OK}, ready=${READY_OK}"
  exit 1
fi

# Cleanup staging container
docker rm -f "${STAGE_NAME}" >/dev/null 2>&1 || true

# Log deploy success event (non-blocking)
echo "[deploy] logging deploy success event..."
log_deploy_event "deploy_success" ""

echo "[deploy] success — version=${APP_VERSION}"
