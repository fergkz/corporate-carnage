#!/usr/bin/env bash
# Move o item (e seus anexos) pra to-do/done/TODO-NNN/, com git mv (preserva
# histórico), e cria o esqueleto de RELEASE_NOTES.md se ainda não existir.
# Rode isso DEPOIS de editar o campo **Status** do item pra `concluído`.
# Uso: archive-item.sh TODO-NNN
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

id="${1:?uso: archive-item.sh TODO-NNN}"

src="$(find to-do -maxdepth 1 -iname "${id} - *.md" | head -1)"
if [ -z "$src" ]; then
  echo "Item ativo não encontrado em to-do/ para $id" >&2
  exit 1
fi

dest_dir="to-do/done/${id}"
mkdir -p "$dest_dir/anexos"

dest="$dest_dir/$(basename "$src")"
git mv "$src" "$dest"

shopt -s nullglob
for f in to-do/anexos/"${id}"-*; do
  git mv "$f" "$dest_dir/anexos/$(basename "$f")"
done
shopt -u nullglob

notes="$dest_dir/RELEASE_NOTES.md"
if [ ! -e "$notes" ]; then
  cat > "$notes" <<EOF
# Release notes — ${id}

## O que foi feito
PREENCHER

## O que mudou em relação à versão anterior
PREENCHER

## Decisões tomadas
PREENCHER

## Evidências de teste
PREENCHER

## Commits
PREENCHER
EOF
fi

echo "$dest"
echo "$notes"
