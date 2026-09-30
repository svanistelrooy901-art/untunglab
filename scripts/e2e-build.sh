#!/usr/bin/env bash
# Builds the app with a throw-away licence key and a fake API host into dist-e2e (never deployed).
set -euo pipefail
cd "$(dirname "$0")/.."
node server/scripts/gen-keys.mjs --json > /tmp/e2e-keys.json
PUB=$(node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('/tmp/e2e-keys.json','utf8')).publicJwk))")
VITE_LICENSE_PUBLIC_KEY="$PUB" VITE_LICENSE_API_URL="https://license.test" VITE_BUY_URL="https://beli.test/beli" npx vite build --outDir dist-e2e --emptyOutDir >/dev/null
echo "built dist-e2e"
