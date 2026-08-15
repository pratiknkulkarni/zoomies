#!/usr/bin/env bash
#
# One authentication path to Gitea, for everything outside `git` itself:
# issues while using the application, releases while shipping it.
#
# The host, owner and repository are read out of `git remote get-url origin`
# rather than written down here, for the reason `icons.py` reads `global.css`
# and `dummy-data.py` reads `db/seed.ts`: a second copy of a fact is a fact
# that will eventually disagree with the first.
#
# The token is a file, mode 600, outside the repository. Never an argument —
# an argument reaches `ps` and the shell history.
#
#   scripts/gitea.sh issues [open|closed|all]   list issues
#   scripts/gitea.sh issue <n>                  one issue, with its comments
#   scripts/gitea.sh comment <n> <text>         add a comment
#   scripts/gitea.sh close <n>                  close it
#   scripts/gitea.sh labels                     list labels
#   scripts/gitea.sh mklabel <name> <hex> <description>
#   scripts/gitea.sh describe <text>            set the repository description
#   scripts/gitea.sh release <tag> <title> <body-file> <apk>
#
set -euo pipefail

TOKEN_FILE="${ZOOMIES_GITEA_TOKEN_FILE:-$HOME/.config/zoomies/gitea-token}"

if [ ! -f "$TOKEN_FILE" ]; then
  echo "No Gitea token at $TOKEN_FILE" >&2
  echo "Gitea -> Settings -> Applications -> Generate Token, then:" >&2
  echo "  install -m 700 -d ~/.config/zoomies" >&2
  echo "  printf '%s' '<token>' > $TOKEN_FILE && chmod 600 $TOKEN_FILE" >&2
  exit 1
fi
TOKEN="$(tr -d ' \n' < "$TOKEN_FILE")"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ORIGIN="$(git -C "$REPO_ROOT" remote get-url origin)"
HOST="$(printf '%s' "$ORIGIN" | sed -E 's#^https?://([^/]+)/.*#\1#')"
OWNER="$(printf '%s' "$ORIGIN" | sed -E 's#^https?://[^/]+/([^/]+)/.*#\1#')"
REPO="$(basename "$ORIGIN" .git)"
API="https://$HOST/api/v1/repos/$OWNER/$REPO"

api() {
  local method="$1" path="$2"
  shift 2
  curl -sS -m 30 -X "$method" \
    -H "Authorization: token $TOKEN" \
    -H "Content-Type: application/json" \
    "$API$path" "$@"
}

# Every body goes through json.dumps from argv or stdin, so no user text is
# ever interpolated into a shell word or a hand-built JSON string.
py() { python3 "$REPO_ROOT/scripts/gitea.py" "$@"; }

case "${1:-}" in
  issues)
    api GET "/issues?state=${2:-open}&type=issues&limit=50" | py list-issues
    ;;
  issue)
    api GET "/issues/$2" | py show-issue
    api GET "/issues/$2/comments" | py show-comments
    ;;
  comment)
    n="$2"; shift 2
    py encode body "$*" | api POST "/issues/$n/comments" -d @- >/dev/null
    echo "Commented on #$n."
    ;;
  close)
    api PATCH "/issues/$2" -d '{"state":"closed"}' >/dev/null
    echo "Closed #$2."
    ;;
  labels)
    api GET "/labels" | py list-labels
    ;;
  mklabel)
    py encode name "$2" color "$3" description "$4" | api POST "/labels" -d @- >/dev/null
    echo "Label $2 created."
    ;;
  describe)
    shift
    py encode description "$*" | curl -sS -m 30 -X PATCH \
      -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
      "$API" -d @- >/dev/null
    echo "Description set."
    ;;
  release)
    tag="$2"; title="$3"; body_file="$4"; apk="$5"
    [ -f "$apk" ] || { echo "No APK at $apk" >&2; exit 1; }
    id="$(py encode tag_name "$tag" name "$title" body @"$body_file" \
            --bool draft false --bool prerelease false \
          | api POST "/releases" -d @- | py release-id)"
    curl -sS -m 600 -X POST \
      -H "Authorization: token $TOKEN" \
      -F "attachment=@$apk" \
      "$API/releases/$id/assets?name=$(basename "$apk")" >/dev/null
    echo "Released $tag -> https://$HOST/$OWNER/$REPO/releases/tag/$tag"
    ;;
  *)
    sed -n '3,22p' "${BASH_SOURCE[0]}" | sed 's/^#\{0,1\} \{0,1\}//'
    exit 1
    ;;
esac
