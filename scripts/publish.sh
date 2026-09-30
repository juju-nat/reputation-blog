#!/usr/bin/env bash
# Generate new posts, then commit and push to GitHub Pages.
set -euo pipefail

cd "$(dirname "$0")/.."

COUNT="${1:-2}"

export PATH="$HOME/bin:$PATH"

echo "[publish] generating ${COUNT} post(s) at $(date)"
node scripts/generate-post.cjs --count "$COUNT"

git add -A
if git diff --cached --quiet; then
  echo "[publish] no changes to commit"
  exit 0
fi

git -c user.name="juju-nat" -c user.email="juju-nat@users.noreply.github.com" \
  commit -q -m "content: daily post $(date +%Y-%m-%d)"

git push -q origin HEAD
echo "[publish] pushed at $(date)"
