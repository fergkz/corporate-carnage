#!/usr/bin/env bash
# Cria to-do/TODO-NNN - {título}.md a partir de um template, com o próximo
# ID livre já calculado. Imprime o caminho do arquivo criado.
# Uso: scaffold-item.sh "Título curto do item"
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
lib_dir="$(dirname "${BASH_SOURCE[0]}")"

title="${1:?uso: scaffold-item.sh \"Título curto do item\"}"
id="$("$lib_dir/next-id.sh")"
file="to-do/${id} - ${title}.md"

if [ -e "$file" ]; then
  echo "Já existe: $file" >&2
  exit 1
fi

cat > "$file" <<EOF
# ${id} — ${title}

**Status**: pendente

**Pedido original**: "PREENCHER"

**Situação atual**:
- PREENCHER

**Proposta técnica**:
- PREENCHER

**Riscos / decisões em aberto**:
- PREENCHER
EOF

echo "$file"
