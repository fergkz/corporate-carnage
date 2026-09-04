#!/usr/bin/env bash
# Mescla a branch do TODO em main (--no-ff) e envia ao GitHub. Só rode
# depois que o teste do item já passou limpo. Se der conflito, o script
# para com a merge em aberto — resolva manualmente ou `git merge --abort`.
# Uso: finish-merge.sh nome-da-branch
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

branch="${1:?uso: finish-merge.sh nome-da-branch}"

git checkout main
git merge --no-ff --no-edit "$branch"
git push origin main
git branch -d "$branch"
git rev-parse HEAD
