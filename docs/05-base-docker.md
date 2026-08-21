# Base Docker e multiplayer

Esta base fornece servidor HTTP, Socket.IO, uma página web mínima e Cloudflare Quick Tunnel.

## Iniciar

Com Docker e Docker Compose instalados, execute:

```bash
docker compose up --build
```

O jogo estará em `http://localhost:8080` e em `http://IP-DA-MAQUINA:8080` para testes na rede local.

O serviço `tunnel` exibirá uma URL pública temporária nos logs:

```bash
docker compose logs -f tunnel
```

## Adaptar para o seu jogo

- Substitua `public/index.html` pela interface do jogo.
- Troque os eventos `move` e `player-moved` em `server.js` pelos eventos necessários.
- Mantenha no servidor o estado compartilhado e as regras que precisam ser validadas.

Não há login, banco de dados ou persistência nesta base. Esses itens não são necessários para o hackathon.
