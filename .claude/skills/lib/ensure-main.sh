#!/usr/bin/env bash
# OBSOLETO — substituído pelo par create-worktree.sh / finish-worktree.sh.
#
# Este script fazia `git checkout main` no diretório compartilhado do
# repo, o que colide com qualquer outra sessão usando aquele mesmo
# checkout. O fluxo novo nunca precisa disso: `create-worktree.sh` cria
# workspace a partir de `origin/main` sem fazer checkout de nada
# compartilhado, e `finish-worktree.sh` mescla/publica numa worktree
# temporária e destacada.
echo "OBSOLETO: use create-worktree.sh / finish-worktree.sh (isolamento via git worktree) em vez de ensure-main.sh." >&2
exit 1
