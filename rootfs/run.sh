#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# run.sh — HA Add-on startup script
#
# Executed as the container's CMD. Steps:
#   1. Read /data/options.json (written by the HA supervisor from config.yaml options)
#   2. Extract ha_url and ha_token via jq
#   3. Fall back to supervisor-provided defaults when values are missing/empty
#   4. Inject values into /usr/share/nginx/html/env-config.js (read by React at runtime)
#   5. Start nginx in the foreground
# ─────────────────────────────────────────────────────────────────────────────
set -e

OPTIONS_FILE="/data/options.json"
WEBROOT="/usr/share/nginx/html"

# ── 1. Read user config ──────────────────────────────────────────────────────
if [ -f "$OPTIONS_FILE" ]; then
    HA_URL=$(jq --raw-output '.ha_url // empty' "$OPTIONS_FILE" 2>/dev/null || true)
    HA_TOKEN=$(jq --raw-output '.ha_token // empty' "$OPTIONS_FILE" 2>/dev/null || true)
else
    echo "[WARN] $OPTIONS_FILE not found – running outside HA supervisor?"
fi

# ── 2. Apply fallbacks ────────────────────────────────────────────────────────
# If ha_url is empty, prefer the supervisor's internal HA endpoint
HA_URL="${HA_URL:-http://supervisor/core}"

# If ha_token is empty, use the supervisor-issued token (requires homeassistant_api: true)
HA_TOKEN="${HA_TOKEN:-${SUPERVISOR_TOKEN:-}}"

if [ -z "$HA_TOKEN" ]; then
    echo "[WARN] No token found (ha_token empty and SUPERVISOR_TOKEN unset). The dashboard may not connect."
fi

# ── 3. Safely JSON-encode values (handles special characters) ─────────────────
# jq -rn outputs a properly escaped JSON string literal (with surrounding quotes)
HA_URL_JSON=$(jq -rn --arg v "$HA_URL" '$v')
HA_TOKEN_JSON=$(jq -rn --arg v "$HA_TOKEN" '$v')

# ── 4. Write runtime env-config.js ───────────────────────────────────────────
cat > "${WEBROOT}/env-config.js" << SCRIPT
// Auto-generated at container startup by run.sh — do not edit manually
window.ENV = {
  HA_URL: ${HA_URL_JSON},
  HA_TOKEN: ${HA_TOKEN_JSON}
};
SCRIPT

echo "[INFO] env-config.js written (HA_URL=${HA_URL})"

# ── 5. Start nginx ────────────────────────────────────────────────────────────
echo "[INFO] Starting nginx..."
exec nginx -g "daemon off;"
