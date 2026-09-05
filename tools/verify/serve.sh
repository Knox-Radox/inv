#!/usr/bin/env bash
# Build, serve on a free port, run a command against it, then always stop.
#
# Exists because a previous session started a production server per
# verification run and stopped none of them: 39 leaked `next start` processes,
# ~8 GB of RSS, and the machine ran out of memory mid-task.
#
#   tools/verify/serve.sh 'node tools/verify/audit.js "$URL"'
#   tools/verify/serve.sh 'node tools/verify/lockout.js "$URL" /tmp/shots'
#
# $URL is substituted into the command.
#
# The server is started with `setsid` in its own process group and the whole
# group is signalled on exit. Killing only the launched pid is not enough:
# `npx next start` execs a child, and the real `next-server` is a grandchild
# that outlives its parent — the first version of this script leaked a server
# doing exactly that.
#
# Never `pkill -f "next start"`: the pattern matches the calling shell's own
# command line and kills it.
set -euo pipefail

cd "$(dirname "$0")/../.."

PORT=$(node -e 'const s=require("net").createServer();s.listen(0,()=>{console.log(s.address().port);s.close();});')
URL="http://localhost:${PORT}/"
LOG="/tmp/verify-${PORT}.log"

npm run build >/dev/null 2>&1 || { echo "build failed"; exit 1; }

setsid npx next start -p "$PORT" >"$LOG" 2>&1 &
LEADER=$!

cleanup() {
  # Negative pid signals the whole process group, so the grandchild goes too.
  kill -TERM -"$LEADER" 2>/dev/null || true
  sleep 1
  kill -KILL -"$LEADER" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _ in $(seq 1 40); do
  curl -sf -o /dev/null "$URL" && break
  sleep 0.5
done
curl -sf -o /dev/null "$URL" || { echo "server never came up; see $LOG"; exit 1; }

echo "serving on $URL (group $LEADER)"
eval "$(printf '%s\n' "$*" | sed "s|\$URL|$URL|g")"
