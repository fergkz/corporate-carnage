#!/usr/bin/env bash
# OBSOLETO — substituído por finish-worktree.sh.
#
# Este script fazia `git checkout main` direto no diretório compartilhado
# do repo pra mesclar, o que colide com qualquer outra sessão que esteja
# usando aquele mesmo checkout (main pode estar ocupado, ou virar o branch
# errado debaixo dos pés de outra tarefa). Use
# `finish-worktree.sh nome-da-branch caminho-da-worktree` no lugar — faz o
# merge numa worktree temporária e destacada, dá push direto pra
# origin/main, e não depende do checkout de `main` estar livre em lugar
# nenhum.
echo "OBSOLETO: use finish-worktree.sh (isolamento via git worktree) em vez de finish-merge.sh." >&2
exit 1
