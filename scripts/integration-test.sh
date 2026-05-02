#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

echo "Waiting for services to be healthy..."
for i in {1..30}; do
  if curl -sSf http://localhost/ >/dev/null; then
    echo "NGINX ready"
    break
  fi
  echo "waiting... ($i)"
  sleep 2
done

echo "Posting sample image to /upload"
TMPFILE=$(mktemp --suffix=.png)
cat > "$TMPFILE" <<'PNGBASE64'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=
PNGBASE64
base64 -d "$TMPFILE" > "$TMPFILE.raw" || true
mv "$TMPFILE.raw" "$TMPFILE"

HTTP_STATUS=$(curl -s -o /dev/stderr -w "%{http_code}" -X POST http://localhost/upload -F "image=@$TMPFILE") || true
echo "HTTP status: $HTTP_STATUS"

if [[ "$HTTP_STATUS" != "200" && "$HTTP_STATUS" != "201" ]]; then
  echo "Integration test failed: unexpected status $HTTP_STATUS"
  exit 1
fi

echo "Integration test succeeded"