#!/usr/bin/env bash
# Garante que o repo está em cima de `main`, sincronizado com origin/main,
# antes de mexer no backlog em to-do/. Só chame isso depois de já ter
# conferido `git status` e decidido que é seguro (working tree limpo, ou
# só com mudanças dentro de to-do/) — este script não checa isso sozinho.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

git fetch origin --quiet
current="$(git branch --show-current)"
if [ "$current" != "main" ]; then
  git checkout main
fi
git pull --ff-only origin main
git branch --show-current
