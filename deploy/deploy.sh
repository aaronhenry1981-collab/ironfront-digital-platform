#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/ifd-app"
APP_NAME="ifd-app"
PORT_MAIN="3000"
PORT_STAGE="3001"
LOCK_FILE="/tmp/ifd-deploy.lock"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[deploy] another deployment is running; exiting"
  exit 0
fi

cd "$APP_DIR"

# Try to detect version from git (if present) or env passed by workflow
GIT_SHA="${APP_VERSION:-}"
if [[ -z "${GIT_SHA}" ]]; then
  if command -v git >/dev/null 2>&1 && [[ -d .git ]]; then
    GIT_SHA="$(git rev-parse --short HEAD || true)"
  fi
fi
GIT_SHA="${GIT_SHA:-unknown}"

IMAGE_TAG="${APP_NAME}:${GIT_SHA}"
STAGE_NAME="${APP_NAME}-stage-${GIT_SHA}"

echo "[deploy] building image ${IMAGE_TAG}"
docker build -t "${IMAGE_TAG}" --build-arg APP_VERSION="${GIT_SHA}" .

OLD_CONTAINER_ID="$(docker ps -aqf "name=^${APP_NAME}$" || true)"
OLD_IMAGE_ID=""
if [[ -n "${OLD_CONTAINER_ID}" ]]; then
  OLD_IMAGE_ID="$(docker inspect --format='{{.Image}}' "${OLD_CONTAINER_ID}" || true)"
fi

echo "[deploy] starting staged container on :${PORT_STAGE}"
docker rm -f "${STAGE_NAME}" >/dev/null 2>&1 || true

ENV_ARGS=(-e "APP_VERSION=${GIT_SHA}")
if [[ -f "${APP_DIR}/.env" ]]; then
  ENV_ARGS+=(--env-file "${APP_DIR}/.env")
fi

docker run -d --name "${STAGE_NAME}" \
  -p "${PORT_STAGE}:3000" \
  "${ENV_ARGS[@]}" \
  --restart unless-stopped \
  "${IMAGE_TAG}" >/dev/null

echo "[deploy] waiting for staged health..."
for i in {1..24}; do
  if curl -fsS "http://127.0.0.1:${PORT_STAGE}/health" >/dev/null; then
    echo "[deploy] staged is healthy"
    break
  fi
  sleep 2
  if [[ "${i}" == "24" ]]; then
    echo "[deploy] staged failed health; dumping logs"
    docker logs --tail 200 "${STAGE_NAME}" || true
    docker rm -f "${STAGE_NAME}" || true
    exit 1
  fi
done

echo "[deploy] swapping to port :${PORT_MAIN}"
if [[ -n "${OLD_CONTAINER_ID}" ]]; then
  echo "[deploy] stopping old container ${APP_NAME}"
  docker stop "${APP_NAME}" >/dev/null || true
  docker rm "${APP_NAME}" >/dev/null || true
fi

ENV_ARGS=(-e "APP_VERSION=${GIT_SHA}")
if [[ -f "${APP_DIR}/.env" ]]; then
  ENV_ARGS+=(--env-file "${APP_DIR}/.env")
fi

docker run -d --name "${APP_NAME}" \
  -p "${PORT_MAIN}:3000" \
  "${ENV_ARGS[@]}" \
  --restart unless-stopped \
  "${IMAGE_TAG}" >/dev/null

echo "[deploy] verifying main health..."
if ! curl -fsS "http://127.0.0.1:${PORT_MAIN}/health" >/dev/null; then
  echo "[deploy] NEW container failed health — attempting rollback"
  docker logs --tail 200 "${APP_NAME}" || true
  docker rm -f "${APP_NAME}" >/dev/null 2>&1 || true

  if [[ -n "${OLD_IMAGE_ID}" ]]; then
    echo "[deploy] rolling back to previous image ${OLD_IMAGE_ID}"
    ENV_ARGS_ROLLBACK=()
    if [[ -f "${APP_DIR}/.env" ]]; then
      ENV_ARGS_ROLLBACK+=(--env-file "${APP_DIR}/.env")
    fi
    docker run -d --name "${APP_NAME}" \
      -p "${PORT_MAIN}:3000" \
      "${ENV_ARGS_ROLLBACK[@]}" \
      --restart unless-stopped \
      "${OLD_IMAGE_ID}" >/dev/null
    curl -fsS "http://127.0.0.1:${PORT_MAIN}/health" >/dev/null && echo "[deploy] rollback healthy" || true
  fi

  docker rm -f "${STAGE_NAME}" >/dev/null 2>&1 || true
  exit 1
fi

docker rm -f "${STAGE_NAME}" >/dev/null 2>&1 || true
echo "[deploy] success — version=${GIT_SHA}"
