#!/usr/bin/env bash
# Imprime o próximo TODO-NNN livre, olhando to-do/ e to-do/done/*/.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

max=0
shopt -s nullglob
for f in to-do/TODO-*.md to-do/done/*/TODO-*.md; do
  base="$(basename "$f")"
  num="$(echo "$base" | sed -nE 's/^TODO-([0-9]{3,})[^0-9].*/\1/p')"
  [ -z "$num" ] && continue
  num=$((10#$num))
  if [ "$num" -gt "$max" ]; then max=$num; fi
done
shopt -u nullglob

printf "TODO-%03d\n" $((max + 1))
