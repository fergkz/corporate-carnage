#!/usr/bin/env bash
# Só coleta informação (nunca decide nada) pra quem chamou julgar se é
# seguro seguir: working tree sujo? main local desatualizado vs origin?
set +e
cd "$(git rev-parse --show-toplevel)"

echo "## branch atual"
git branch --show-current

echo
echo "## git status --short"
git status --short

echo
git fetch origin --quiet
echo "## commits só no origin/main (faltando localmente)"
git log --oneline main..origin/main 2>/dev/null

echo
echo "## commits só no main local (não enviados)"
git log --oneline origin/main..main 2>/dev/null
