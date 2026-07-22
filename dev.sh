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

until docker exec smallmanagement-dev-db pg_isready -U postgres >/dev/null 2>&1; do sleep 0.3; done

# ponytail: git worktrees don't get their own .venv — point at the main checkout's
main_root="$(dirname "$(git rev-parse --git-common-dir)")"
[ -e .venv ] || ln -s "$main_root/.venv" .venv

trap 'kill 0' EXIT INT TERM

(
  source .venv/bin/activate
  cd backend
  python manage.py migrate
  python manage.py runserver
) &

(cd frontend && npm run dev) &

for port in 8000 5173; do
  until (echo > "/dev/tcp/127.0.0.1/$port") >/dev/null 2>&1; do sleep 0.3; done
done
echo "ready: http://localhost:5173"

wait
