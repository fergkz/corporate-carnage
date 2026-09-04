#!/usr/bin/env bash
# Sincroniza main com origin e cria a branch do TODO a partir dele.
# Só rode depois de já ter decidido (via git-precheck.sh) que é seguro.
# Uso: create-branch.sh TODO-NNN slug-curto
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
lib_dir="$(dirname "${BASH_SOURCE[0]}")"

id="${1:?uso: create-branch.sh TODO-NNN slug-curto}"
slug="${2:?uso: create-branch.sh TODO-NNN slug-curto}"

"$lib_dir/ensure-main.sh" > /dev/null

branch="todo/${id,,}-${slug}"
git checkout -b "$branch"
echo "$branch"
