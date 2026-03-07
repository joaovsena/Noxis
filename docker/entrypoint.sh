#!/bin/sh
set -e

echo "[app] Waiting for database and syncing schema..."
until npx prisma db push; do
  echo "[app] Database not ready yet. Retrying in 2s..."
  sleep 2
done

echo "[app] Generating Prisma client..."
npx prisma generate

echo "[app] Starting server..."
exec node dist/server/index.js
