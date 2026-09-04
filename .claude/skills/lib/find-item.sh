#!/usr/bin/env bash
# Localiza o arquivo de um item, ativo ou já arquivado.
# Uso: find-item.sh TODO-NNN
# Saída: STATUS=active|done|not_found  e  PATH=... (se achou)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

id="${1:?uso: find-item.sh TODO-NNN}"

active="$(find to-do -maxdepth 1 -iname "${id} - *.md" 2>/dev/null | head -1)"
if [ -n "$active" ]; then
  echo "STATUS=active"
  echo "PATH=$active"
  exit 0
fi

done_match="$(find "to-do/done/${id}" -maxdepth 1 -iname "${id} - *.md" 2>/dev/null | head -1)"
if [ -n "$done_match" ]; then
  echo "STATUS=done"
  echo "PATH=$done_match"
  exit 0
fi

echo "STATUS=not_found"
exit 1
