#!/usr/bin/env bash
# Derruba a stack Docker isolada criada por docker-up.sh nesta worktree.
# Uso: docker-down.sh slug-curto
set -euo pipefail

slug="${1:?uso: docker-down.sh slug-curto}"
project="cc-$(echo "$slug" | tr -c 'a-z0-9' '-' | sed 's/-\+/-/g' | sed 's/^-\|-$//g')"

docker compose -p "$project" -f compose.yaml -f docker-compose.worktree-override.yml down -v 2>/dev/null || true
rm -f docker-compose.worktree-override.yml
