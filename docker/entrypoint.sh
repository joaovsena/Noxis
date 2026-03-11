#!/bin/sh
set -e

if [ "${PRISMA_DB_PUSH:-1}" = "1" ]; then
  echo "[app] Waiting for database and syncing schema..."
  until npx prisma db push; do
    echo "[app] Database not ready yet. Retrying in 2s..."
    sleep 2
  done
else
  echo "[app] Skipping prisma db push."
fi

if [ ! -f /app/node_modules/.prisma/client/index.js ]; then
  echo "[app] Prisma client missing. Generating..."
  npx prisma generate
else
  echo "[app] Prisma client already present. Skipping generate."
fi

echo "[app] Starting server..."
exec node dist/server/index.js

