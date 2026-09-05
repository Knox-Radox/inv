#!/usr/bin/env bash
# Build, serve on a free port, run a command against it, then always stop.
#
# Exists because a previous session started a production server per
# verification run and stopped none of them: 39 leaked `next start` processes,
# ~8 GB of RSS, and the machine ran out of memory mid-task.
#
#   tools/verify/serve.sh node tools/verify/audit.js '$URL'
#   tools/verify/serve.sh 'node tools/verify/lockout.js "$URL" /tmp/shots'
#
# $URL is substituted into the command. Never pkill -f "next start": the
# pattern matches the calling shell's own command line and kills it.
set -euo pipefail

PORT=$(node -e 'const s=require("net").createServer();s.listen(0,()=>{console.log(s.address().port);s.close();});')
URL="http://localhost:${PORT}/"

npm run build >/dev/null 2>&1 || { echo "build failed"; exit 1; }
npx next start -p "$PORT" >/tmp/verify-${PORT}.log 2>&1 &
SERVER=$!
trap 'kill -TERM "$SERVER" 2>/dev/null || true; wait "$SERVER" 2>/dev/null || true' EXIT INT TERM

for _ in $(seq 1 40); do
  curl -sf -o /dev/null "$URL" && break
  sleep 0.5
done
curl -sf -o /dev/null "$URL" || { echo "server never came up; see /tmp/verify-${PORT}.log"; exit 1; }

echo "serving on $URL (pid $SERVER)"
eval "$(printf '%s\n' "$*" | sed "s|\$URL|$URL|g")"
