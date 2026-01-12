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
STAGE_NAME="${APP_NAME}-stage-${APP_VERSION}"

echo "[deploy] building image ${IMAGE_TAG}"
docker build -t "${IMAGE_TAG}" --build-arg APP_VERSION="${APP_VERSION}" .

OLD_CONTAINER_ID="$(docker ps -aqf "name=^${APP_NAME}$" || true)"
OLD_IMAGE_ID=""
if [[ -n "${OLD_CONTAINER_ID}" ]]; then
  OLD_IMAGE_ID="$(docker inspect --format='{{.Image}}' "${OLD_CONTAINER_ID}" || true)"
fi

echo "[deploy] starting staged container on :${PORT_STAGE}"
docker rm -f "${STAGE_NAME}" >/dev/null 2>&1 || true

ENVFILE_ARGS=()
if [[ -f "${APP_DIR}/.env" ]]; then
  ENVFILE_ARGS+=(--env-file "${APP_DIR}/.env")
fi

docker run -d --name "${STAGE_NAME}" \
  -p "${PORT_STAGE}:3000" \
  -e "APP_VERSION=${APP_VERSION}" \
  -e "DB_PATH=/data/ifd.db" \
  -v "${DATA_DIR}:/data" \
  "${ENVFILE_ARGS[@]}" \
  --restart unless-stopped \
  "${IMAGE_TAG}" >/dev/null

echo "[deploy] waiting for staged health/ready/version..."
for i in {1..30}; do
  if curl -fsS "http://127.0.0.1:${PORT_STAGE}/health" >/dev/null \
  && curl -fsS "http://127.0.0.1:${PORT_STAGE}/ready" >/dev/null \
  && curl -fsS "http://127.0.0.1:${PORT_STAGE}/version" | grep -q "${APP_VERSION}"; then
    echo "[deploy] staged is healthy+ready and version matches"
    break
  fi
  sleep 2
  if [[ "${i}" == "30" ]]; then
    echo "[deploy] staged failed gates; dumping logs"
    docker logs --tail 200 "${STAGE_NAME}" || true
    docker rm -f "${STAGE_NAME}" || true
    exit 1
  fi
done

echo "[deploy] swapping to port :${PORT_MAIN}"
if [[ -n "${OLD_CONTAINER_ID}" ]]; then
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

echo "[deploy] verifying main gates..."
if ! curl -fsS "http://127.0.0.1:${PORT_MAIN}/health" >/dev/null \
|| ! curl -fsS "http://127.0.0.1:${PORT_MAIN}/ready" >/dev/null \
|| ! curl -fsS "http://127.0.0.1:${PORT_MAIN}/version" | grep -q "${APP_VERSION}"; then
  echo "[deploy] NEW container failed gates — attempting rollback"
  docker logs --tail 200 "${APP_NAME}" || true
  docker rm -f "${APP_NAME}" >/dev/null 2>&1 || true

  if [[ -n "${OLD_IMAGE_ID}" ]]; then
    echo "[deploy] rolling back to previous image ${OLD_IMAGE_ID}"
    docker run -d --name "${APP_NAME}" \
      -p "${PORT_MAIN}:3000" \
      -v "${DATA_DIR}:/data" \
      "${ENVFILE_ARGS[@]}" \
      --restart unless-stopped \
      "${OLD_IMAGE_ID}" >/dev/null
    curl -fsS "http://127.0.0.1:${PORT_MAIN}/health" >/dev/null || true
  fi

  docker rm -f "${STAGE_NAME}" >/dev/null 2>&1 || true
  exit 1
fi

docker rm -f "${STAGE_NAME}" >/dev/null 2>&1 || true
echo "[deploy] success — version=${APP_VERSION}"
