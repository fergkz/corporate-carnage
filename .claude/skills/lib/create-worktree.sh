#!/usr/bin/env bash
# Cria uma worktree git isolada a partir de origin/main atualizado.
#
# Não faz `checkout` em nenhuma worktree existente e não precisa que
# `main` esteja livre em lugar nenhum — só lê o ref remoto e cria um
# diretório de trabalho novo. Isso é o que permite duas tarefas (ou duas
# sessões do Claude Code) rodarem em paralelo no mesmo repositório sem uma
# pisar no checkout/arquivos da outra: cada uma ganha sua própria worktree.
#
# Uso: create-worktree.sh nome-da-branch caminho-do-diretorio
#
# Convenção: `caminho-do-diretorio` deve ficar no diretório de scratchpad
# da sessão atual (cada sessão do Claude Code tem o seu, então worktrees de
# sessões diferentes nunca colidem de caminho).
set -euo pipefail

branch="${1:?uso: create-worktree.sh nome-da-branch caminho-do-diretorio}"
path="${2:?uso: create-worktree.sh nome-da-branch caminho-do-diretorio}"

git fetch origin --quiet
mkdir -p "$(dirname "$path")"
git worktree add "$path" -b "$branch" origin/main

echo "BRANCH=$branch"
echo "WORKTREE=$path"
