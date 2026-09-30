#!/usr/bin/env bash
# Publish approved draft(s) and deploy.
# Usage: bash scripts/approve.sh              # publish all drafts
#        bash scripts/approve.sh <slug>       # publish one draft
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="$HOME/bin:$PATH"

if [ "$#" -gt 0 ]; then
  node scripts/generate-post.cjs --publish "$1"
else
  node scripts/generate-post.cjs --publish
fi

git add -A
if git diff --cached --quiet; then
  echo "[approve] nothing to publish"
  exit 0
fi

git -c user.name="juju-nat" -c user.email="juju-nat@users.noreply.github.com" \
  commit -q -m "content: publish approved posts $(date +%Y-%m-%d)"

git push -q origin HEAD
echo "[approve] pushed at $(date)"
