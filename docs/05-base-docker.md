# Base Docker e multiplayer

Esta base fornece uma referência executável em JavaScript: servidor HTTP, Socket.IO, uma página web mínima e Cloudflare Quick Tunnel. JavaScript não é obrigatório no hackathon.

## Iniciar

Com Docker e Docker Compose instalados, execute:

```bash
docker compose up --build
```

Na primeira execução, não use `-d`: o terminal exibirá uma caixa com o título **URL PÚBLICA DO JOGO**. Copie esse link e compartilhe com os jogadores. Esta URL é o único endereço de acesso à partida.

Se o Compose estiver em segundo plano, recupere a mesma URL com:

```bash
docker compose logs -f tunnel
```

## Adaptar para o seu jogo

- Substitua `public/index.html` pela interface do jogo.
- Troque os eventos `move` e `player-moved` em `server.js` pelos eventos necessários.
- Mantenha no servidor o estado compartilhado e as regras que precisam ser validadas.

## Usar outra linguagem

Você pode substituir a implementação de referência por qualquer linguagem ou framework. Mantenha apenas estes contratos:

- escolha qualquer porta interna para o jogo;
- altere uma única linha no serviço `tunnel` para apontar para `http://game:SUA_PORTA`;
- o projeto deve responder `GET /health` com sucesso, pois o Compose espera o jogo iniciar antes de abrir o túnel.

Ao trocar de linguagem, atualize `Dockerfile`, `compose.yaml` e o README do jogo. Não é necessário preservar `server.js`, `package.json` ou a página de exemplo.

## Escolher porta

A referência executável usa 8080, mas essa escolha não é obrigatória. Quando seu jogo usar outra porta, altere diretamente a linha abaixo no `compose.yaml`:

```yaml
command: tunnel --no-autoupdate --url http://game:SUA_PORTA
```

Se o comando de saúde da referência também não servir para sua linguagem, adapte-o para consultar o endpoint de saúde do seu jogo.

Não há login, banco de dados ou persistência nesta base. Esses itens não são necessários para o hackathon.

## Antes de entregar

Teste o caminho que a organização usará: em uma cópia limpa do repositório, execute `docker compose up --build`, localize a URL pública nos logs e abra-a em outro navegador. Não dependa de arquivos fora do Git, de variáveis locais não documentadas ou de uma porta exposta na máquina.

---

[← Spec do jogo](04-template-spec-do-jogo.md) · [Início](../README.md)
