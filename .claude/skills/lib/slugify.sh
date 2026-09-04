#!/usr/bin/env bash
# Transforma um título em slug kebab-case curto, pra nome de branch.
# Uso: slugify.sh "Título com Acentos e Espaços"
set -euo pipefail
title="${1:?uso: slugify.sh \"Título\"}"

echo "$title" \
  | iconv -f utf8 -t ascii//TRANSLIT 2>/dev/null \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
  | cut -c1-40 \
  | sed -E 's/-+$//'
