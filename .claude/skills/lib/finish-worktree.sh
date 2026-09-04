#!/usr/bin/env bash
# Mescla uma branch já commitada em origin/main e publica, sem depender do
# checkout de `main` estar livre em nenhuma worktree.
#
# Como: cria uma worktree temporária e "destacada" (detached HEAD em cima
# de origin/main), faz o merge --no-ff ali dentro, dá push direto pra
# origin/main, e só então remove a worktree temporária, a worktree de
# trabalho do chamador e a branch local. Em nenhum momento faz `checkout`
# de `main` em worktree nenhuma — outra sessão pode estar usando qualquer
# checkout compartilhado ao mesmo tempo sem nenhuma interferência.
#
# Uso: finish-worktree.sh nome-da-branch caminho-da-worktree-do-chamador
#
# Se der conflito, o script para com a worktree temporária de merge aberta
# pra inspeção/resolução manual — não resolve sozinho.
set -euo pipefail

branch="${1:?uso: finish-worktree.sh nome-da-branch caminho-da-worktree}"
todo_worktree="${2:?uso: finish-worktree.sh nome-da-branch caminho-da-worktree}"

git fetch origin --quiet
merge_wt="$(mktemp -d)/merge-main"
git worktree add --detach "$merge_wt" origin/main > /dev/null

if ! git -C "$merge_wt" merge --no-ff --no-edit "$branch"; then
  echo "CONFLITO ao mesclar '$branch' em origin/main." >&2
  echo "Resolva manualmente em: $merge_wt" >&2
  echo "Depois de resolver:" >&2
  echo "  git -C \"$merge_wt\" push origin HEAD:main" >&2
  echo "  git worktree remove \"$merge_wt\"" >&2
  echo "  git worktree remove \"$todo_worktree\"" >&2
  echo "  git branch -d \"$branch\"" >&2
  exit 1
fi

git -C "$merge_wt" push origin HEAD:main
merge_commit="$(git -C "$merge_wt" rev-parse HEAD)"

git worktree remove "$merge_wt" --force
git worktree remove "$todo_worktree"
git branch -d "$branch"

echo "$merge_commit"
