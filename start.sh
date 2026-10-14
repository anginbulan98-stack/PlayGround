#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${OPENCODE_WEB_DIR:?OPENCODE_WEB_DIR must be set}"
PORT="${PORT:-3000}"
PROJECT_ROOT="$(pwd)"
DIST_DIR="$PROJECT_ROOT/dist"
export PROJECT_ROOT DIST_DIR
/usr/bin/time -p test -f "$DIST_DIR/index.html"
/usr/bin/time -p mkdir -p "$OPENCODE_WEB_DIR"
if /usr/bin/time -p test -f "$PROJECT_ROOT/package.json"; then
  if /usr/bin/time -p test -f "$PROJECT_ROOT/package-lock.json"; then
    /usr/bin/time -p npm ci --no-audit --no-fund
  else
    /usr/bin/time -p npm install --no-audit --no-fund
  fi
  if /usr/bin/time -p node -e "process.exit(require('./package.json').scripts&&require('./package.json').scripts.build?0:1)"; then
    /usr/bin/time -p npm run build
  fi
  /usr/bin/time -p test -f "$DIST_DIR/index.html"
fi
/usr/bin/time -p python3 -c "import json,os; d=json.dumps({'project': os.environ['PROJECT_ROOT'], 'directory': os.environ['DIST_DIR']}); open(os.path.join(os.environ['OPENCODE_WEB_DIR'], 'deployment-output.json'), 'w').write(d)" 
/usr/bin/time -p cat "$OPENCODE_WEB_DIR/deployment-output.json"
/usr/bin/time -p python3 -m http.server "$PORT" --directory "$DIST_DIR"
