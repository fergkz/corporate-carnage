# Base Docker e multiplayer

Esta base fornece uma referência executável em JavaScript: servidor HTTP, Socket.IO, uma página web mínima e Cloudflare Quick Tunnel. JavaScript não é obrigatório no hackathon.

## Iniciar

Com Docker e Docker Compose instalados, execute:

```bash
docker compose up --build
```

O jogo estará disponível na porta local configurada. Por padrão, a base usa `http://localhost:8080`, mas essa porta não é obrigatória.

O serviço obrigatório `tunnel` exibirá uma URL pública temporária nos logs. Essa URL é o acesso padrão que deve ser compartilhado com os jogadores:

```bash
docker compose logs -f tunnel
```

## Adaptar para o seu jogo

- Substitua `public/index.html` pela interface do jogo.
- Troque os eventos `move` e `player-moved` em `server.js` pelos eventos necessários.
- Mantenha no servidor o estado compartilhado e as regras que precisam ser validadas.

## Usar outra linguagem

Você pode substituir a implementação de referência por qualquer linguagem ou framework. Mantenha apenas estes contratos:

- defina a porta interna do jogo em `GAME_PORT`;
- se desejar acesso local, defina `HOST_PORT`; ele pode ser diferente da porta interna;
- o serviço obrigatório `tunnel` deve encaminhar para `http://game:${GAME_PORT}`;
- o projeto deve responder `GET /health` com sucesso, pois o Compose espera o jogo iniciar antes de abrir o túnel.

Ao trocar de linguagem, atualize `Dockerfile`, `compose.yaml` e o README do jogo. Não é necessário preservar `server.js`, `package.json` ou a página de exemplo.

## Escolher portas

Sem configuração adicional, a referência usa a porta 8080 dentro e fora do container. Para usar outra porta, informe as variáveis ao iniciar:

```bash
GAME_PORT=3000 HOST_PORT=3001 docker compose up --build
```

Nesse exemplo, o jogo atende em 3000 dentro do container, pode ser aberto localmente em `http://localhost:3001` e o Quick Tunnel encaminha para a porta 3000. Se a aplicação usar outra variável para definir sua porta, adapte o serviço `game` no `compose.yaml`.

Não há login, banco de dados ou persistência nesta base. Esses itens não são necessários para o hackathon.
