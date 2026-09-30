#!/usr/bin/env bash
# Author new drafts (nothing is published).
# Usage: bash scripts/draft.sh [count]
set -euo pipefail

cd "$(dirname "$0")/.."

node scripts/generate-post.cjs --count "${1:-2}"
