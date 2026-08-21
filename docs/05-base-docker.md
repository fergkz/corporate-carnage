# Base Docker e multiplayer

Esta base fornece uma referência executável em JavaScript: servidor HTTP, Socket.IO, uma página web mínima e Cloudflare Quick Tunnel. JavaScript não é obrigatório no hackathon.

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

## Usar outra linguagem

Você pode substituir a implementação de referência por qualquer linguagem ou framework. Mantenha apenas estes contratos:

- o serviço principal deve atender na porta `8080` dentro do container;
- o `compose.yaml` deve expor `8080:8080` para facilitar o teste local;
- o serviço `tunnel` deve encaminhar para `http://game:8080`;
- o projeto deve responder `GET /health` com sucesso, pois o Compose espera o jogo iniciar antes de abrir o túnel.

Ao trocar de linguagem, atualize `Dockerfile`, `compose.yaml` e o README do jogo. Não é necessário preservar `server.js`, `package.json` ou a página de exemplo.

Não há login, banco de dados ou persistência nesta base. Esses itens não são necessários para o hackathon.
