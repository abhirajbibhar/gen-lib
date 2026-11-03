#!/usr/bin/env bash
# Build the site and sync dist/ to Cloudflare R2 with per-file cache headers.
#
#   PREVIEW_SLUG=gentelella npm run deploy:preview
#   DRY_RUN=1 PREVIEW_SLUG=gentelella npm run deploy:preview   # print, don't upload
#
# Required: wrangler installed and authenticated (npx wrangler login), plus the
# bucket name. Everything else has a sane default.
#
#   R2_BUCKET     bucket to sync into            (required)
#   PREVIEW_SLUG  deploy under /theme/<slug>/    (optional, default: site root)
#   DIST          directory to upload            (default: dist)
#
# Three passes, because one cache policy for every file is what pins stale
# HTML at hashed asset URLs that a later build deleted:
#
#   1. everything immutable (images, fonts)      max-age=1y, immutable
#   2. hashed JS/CSS + HTML                      short cache so a new build wins
#   3. sw.js and site.webmanifest                no-cache, must revalidate
set -euo pipefail

DRY_RUN="${DRY_RUN:-0}"
DIST="${DIST:-dist}"
BUCKET="${R2_BUCKET:-}"
SLUG="${PREVIEW_SLUG:-}"

if [[ ! -d "$DIST" ]]; then
  echo "✖ $DIST/ not found — run the build first (npm run build)." >&2
  exit 1
fi

if [[ -z "$BUCKET" && "$DRY_RUN" != "1" ]]; then
  echo "✖ R2_BUCKET is not set." >&2
  echo "  R2_BUCKET=my-bucket PREVIEW_SLUG=gentelella npm run deploy:preview" >&2
  exit 1
fi

if [[ -n "$SLUG" ]]; then
  BASE_PATH="/theme/$SLUG/"
  export BASE_PATH
  echo "→ building for subpath $BASE_PATH"
else
  echo "→ building for the site root"
fi

if [[ "$DRY_RUN" != "1" ]] || [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  npm run build
fi

PREFIX="${SLUG:+theme/$SLUG}"

put() {
  local file="$1" cache="$2"
  # Keys are relative to the dist root: dist/js/x.js → theme/slug/js/x.js.
  local rel="${file#"$DIST"/}"
  local key="${PREFIX:+$PREFIX/}${rel}"
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "  put ${key}  [${cache}]"
    return
  fi
  npx wrangler r2 object put "${BUCKET}/${key}" \
    --file "$file" \
    --content-type "$(content_type "$file")" \
    --cache-control "$cache" \
    --remote > /dev/null
}

content_type() {
  case "${1##*.}" in
    html) echo 'text/html; charset=utf-8' ;;
    js)   echo 'text/javascript; charset=utf-8' ;;
    css)  echo 'text/css; charset=utf-8' ;;
    json | webmanifest) echo 'application/json' ;;
    svg)  echo 'image/svg+xml' ;;
    png)  echo 'image/png' ;;
    jpg | jpeg) echo 'image/jpeg' ;;
    webp) echo 'image/webp' ;;
    woff2) echo 'font/woff2' ;;
    woff) echo 'font/woff' ;;
    txt)  echo 'text/plain; charset=utf-8' ;;
    xml)  echo 'application/xml' ;;
    map)  echo 'application/json' ;;
    ico)  echo 'image/x-icon' ;;
    *)    echo 'application/octet-stream' ;;
  esac
}

echo "→ pass 1/3: immutable assets"
while IFS= read -r -d '' f; do
  put "$f" 'public, max-age=31536000, immutable'
done < <(find "$DIST" -type f \( -name '*.woff2' -o -name '*.woff' -o -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' -o -name '*.svg' -o -name '*.ico' \) -print0)

echo "→ pass 2/3: hashed JS/CSS and HTML"
while IFS= read -r -d '' f; do
  # sw.js is uploaded in pass 3 with must-revalidate, not as immutable.
  [[ "$(basename "$f")" == 'sw.js' ]] && continue
  put "$f" 'public, max-age=31536000, immutable'
done < <(find "$DIST" -type f \( -name '*.js' -o -name '*.css' \) -print0)
while IFS= read -r -d '' f; do
  # stats.html is the bundle analyzer report, not part of the site.
  [[ "$(basename "$f")" == 'stats.html' ]] && continue
  put "$f" 'public, max-age=300, must-revalidate'
done < <(find "$DIST" -type f \( -name '*.html' -o -name '*.xml' -o -name '*.txt' \) -print0)

echo "→ pass 3/3: service worker and manifest"
for f in "$DIST/sw.js" "$DIST/site.webmanifest"; do
  [[ -f "$f" ]] && put "$f" 'no-cache, must-revalidate'
done

if [[ "$DRY_RUN" == "1" ]]; then
  echo "✓ dry run complete (nothing uploaded)"
else
  echo "✓ deployed $DIST/ to r2://$BUCKET/${PREFIX:+$PREFIX/}"
fi
