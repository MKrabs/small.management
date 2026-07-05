#!/usr/bin/env bash
# Starts local Postgres (docker), Django, and Vite for local dev.
# ponytail: plain background jobs, swap for honcho/overmind if this grows past 2 services
set -euo pipefail
cd "$(dirname "$0")"

docker start smallmanagement-dev-db >/dev/null 2>&1 || docker run -d \
  --name smallmanagement-dev-db \
  -e POSTGRES_DB=smallmanagement \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v smallmanagement-dev-db:/var/lib/postgresql/data \
  postgres:16 >/dev/null

trap 'kill 0' EXIT INT TERM

(
  source .venv/bin/activate
  cd backend
  python manage.py migrate
  python manage.py runserver
) &

(cd frontend && npm run dev) &

wait
