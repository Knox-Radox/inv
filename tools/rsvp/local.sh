#!/usr/bin/env bash
# What Supabase gives the RSVP, stood up on this machine: a Postgres with the
# three API roles, and PostgREST in front of it.
#
#   tools/rsvp/local.sh up      # fresh database, schema applied, REST on :54330
#   tools/rsvp/local.sh env     # the two lines to put in .env.local
#   tools/rsvp/local.sh down
#
# Needs a Postgres it can create a database in, and the `postgrest` binary
# (https://github.com/PostgREST/postgrest/releases — Supabase runs v14):
#
#   PGHOST PGPORT PGUSER   default 127.0.0.1 54329 postgres
#   POSTGREST              default `postgrest` on the PATH
#
# The database is dropped and recreated every time. It holds nothing real.
set -euo pipefail
cd "$(dirname "$0")/../.."

export PGHOST="${PGHOST:-127.0.0.1}" PGPORT="${PGPORT:-54329}" PGUSER="${PGUSER:-postgres}"
POSTGREST="${POSTGREST:-postgrest}"
REST_PORT="${REST_PORT:-54330}"
DB=rsvp_local
RUN="${TMPDIR:-/tmp}/rsvp-local"
# Signs the two test tokens below. It protects nothing: the database is local
# and empty, and this string appears nowhere else.
SECRET="local-only-secret-for-tools-rsvp-0123456789abcdef"

token () { # role
  node -e '
    const c = require("node:crypto");
    const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const body = b({ alg: "HS256", typ: "JWT" }) + "." + b({ role: process.argv[1], iss: "local" });
    console.log(body + "." + c.createHmac("sha256", process.argv[2]).update(body).digest("base64url"));
  ' "$1" "$SECRET"
}

case "${1:-up}" in
  up)
    "$0" down >/dev/null 2>&1 || true
    mkdir -p "$RUN"
    psql -qAt -d postgres -c "drop database if exists $DB" -c "create database $DB"
    psql -q -d "$DB" -v ON_ERROR_STOP=1 -f tools/rsvp/roles.sql
    psql -q -d "$DB" -v ON_ERROR_STOP=1 -f supabase/schema.sql
    PGRST_DB_URI="postgres://authenticator:local@$PGHOST:$PGPORT/$DB" \
    PGRST_DB_SCHEMAS=public PGRST_DB_ANON_ROLE=anon \
    PGRST_JWT_SECRET="$SECRET" PGRST_SERVER_PORT="$REST_PORT" \
      "$POSTGREST" > "$RUN/postgrest.log" 2>&1 &
    echo $! > "$RUN/postgrest.pid"
    # Ready means it can run a function, not that the port is open: PostgREST
    # answers on `/` before it has read the schema, and for that moment every
    # call is a 503 — which the site correctly reports as "unavailable" and
    # which once ate the first two replies of a seeding run.
    KEY="$(token service_role)"
    for _ in $(seq 1 80); do
      code="$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $KEY" \
        -H 'Content-Type: application/json' -d '{}' "http://127.0.0.1:$REST_PORT/rpc/rsvp_ping" || true)"
      [ "$code" = "200" ] && break
      sleep 0.1
    done
    echo "rest:  http://127.0.0.1:$REST_PORT   (log: $RUN/postgrest.log)"
    ;;
  env)
    echo "SUPABASE_REST_URL=http://127.0.0.1:$REST_PORT"
    echo "SUPABASE_SECRET_KEY=$(token service_role)"
    ;;
  anon)
    token anon
    ;;
  down)
    [ -f "$RUN/postgrest.pid" ] && kill "$(cat "$RUN/postgrest.pid")" 2>/dev/null || true
    rm -f "$RUN/postgrest.pid"
    ;;
  *)
    echo "usage: $0 up | env | anon | down" >&2
    exit 2
    ;;
esac
