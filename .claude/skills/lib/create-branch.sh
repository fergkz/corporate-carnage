#!/usr/bin/env bash
# OBSOLETO — substituído por create-worktree.sh.
#
# Este script fazia `git checkout -b` direto no diretório compartilhado do
# repo, o que faz duas tarefas/sessões rodando em paralelo colidirem no
# mesmo checkout (uma pisa no branch/arquivos da outra). Use
# `create-worktree.sh nome-da-branch caminho-do-diretorio` no lugar — cria
# uma worktree git isolada a partir de origin/main, sem tocar no checkout
# de nenhuma outra worktree/sessão.
echo "OBSOLETO: use create-worktree.sh (isolamento via git worktree) em vez de create-branch.sh." >&2
exit 1
