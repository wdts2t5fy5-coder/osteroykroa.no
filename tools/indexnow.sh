#!/usr/bin/env bash
# Varsler Bing, Yandex og Seznam om at sidene er endret, via IndexNow.
# Google deltar ikke i IndexNow - der er sitemap og Search Console veien.
#
# Kjør etter en deploy som endrer innhold:
#   ./tools/indexnow.sh
#
# Nøkkelen må ligge som <nøkkel>.txt i rota og være tilgjengelig på
# https://fjordfix.no/<nøkkel>.txt, ellers avvises innsendingen.
set -euo pipefail

HOST="xn--osterykroa-4cb.no"
KEY="8b5c92cce4cc9b23151bc63873d0a2a6"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# URL-ene hentes fra sitemapet, så lista holder seg selv oppdatert.
# macOS har bash 3.2 uten mapfile, derfor while/read.
URLS=()
while IFS= read -r u; do URLS+=("$u"); done < <(
  grep -oE '<loc>[^<]+</loc>' "$ROOT/sitemap.xml" | sed -E 's|</?loc>||g'
)
case "${URLS[0]}" in
  https://*) ;;
  *) echo "uttrekk fra sitemapet ga ugyldig URL: ${URLS[0]}" >&2; exit 1 ;;
esac
[ ${#URLS[@]} -gt 0 ] || { echo "fant ingen URL-er i sitemap.xml" >&2; exit 1; }

# Nøkkelfila må ligge ute før innsending
if ! curl -sf -o /dev/null "https://$HOST/$KEY.txt"; then
  echo "https://$HOST/$KEY.txt svarer ikke - push og vent på deploy først" >&2
  exit 1
fi

payload=$(python3 -c '
import json, sys
host, key, urls = sys.argv[1], sys.argv[2], sys.argv[3:]
print(json.dumps({
    "host": host,
    "key": key,
    "keyLocation": f"https://{host}/{key}.txt",
    "urlList": urls,
}))' "$HOST" "$KEY" "${URLS[@]}")

code=$(curl -s -o /tmp/indexnow.out -w '%{http_code}' \
  -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data "$payload")

case "$code" in
  200|202) echo "IndexNow: ${#URLS[@]} URL-er sendt inn (HTTP $code)" ;;
  *)       echo "IndexNow avviste innsendingen (HTTP $code)" >&2
           cat /tmp/indexnow.out >&2; exit 1 ;;
esac
