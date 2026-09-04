#!/usr/bin/env bash
# Sobe uma stack Docker isolada (nome de projeto próprio + porta
# efêmera) pra testar o jogo desta worktree, sem colidir com uma stack de
# teste de outra worktree/sessão rodando ao mesmo tempo na mesma máquina.
#
# Rode de DENTRO da worktree do TODO (usa o compose.yaml/Dockerfile dessa
# worktree, não da worktree principal). Só sobe o serviço `game` — o túnel
# Cloudflare não é necessário pra teste local e cada instância dele
# competiria por nada em comum, então é pulado.
#
# Uso: docker-up.sh slug-curto
set -euo pipefail

slug="${1:?uso: docker-up.sh slug-curto}"
project="cc-$(echo "$slug" | tr -c 'a-z0-9' '-' | sed 's/-\+/-/g' | sed 's/^-\|-$//g')"

cat > docker-compose.worktree-override.yml <<'EOF'
services:
  game:
    ports: !override
      - "8080"
EOF

docker compose -p "$project" -f compose.yaml -f docker-compose.worktree-override.yml up -d --build game
port_line="$(docker compose -p "$project" -f compose.yaml -f docker-compose.worktree-override.yml port game 8080)"

echo "PROJECT=$project"
echo "URL=http://localhost:${port_line##*:}"
