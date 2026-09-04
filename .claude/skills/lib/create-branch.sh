#!/usr/bin/env bash
# Sincroniza main com origin e cria a branch do TODO a partir dele.
# Só rode depois de já ter decidido (via git-precheck.sh) que é seguro.
# Uso: create-branch.sh TODO-NNN slug-curto
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

id="${1:?uso: create-branch.sh TODO-NNN slug-curto}"
slug="${2:?uso: create-branch.sh TODO-NNN slug-curto}"

git checkout main
git pull --ff-only origin main

branch="todo/${id,,}-${slug}"
git checkout -b "$branch"
echo "$branch"
