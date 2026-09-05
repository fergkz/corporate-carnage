# TODO-006 — Contagem correta de jogadores humanos na lista de salas públicas

**Status**: pendente

**Pedido original**: durante um playtest guiado (jogado dentro de um container Docker isolado, código idêntico ao branch atual), o assistente relatou a Fernando: "a lista de salas públicas mostra a sala como cheia (N/N) mesmo recém-criada, sem nenhum jogador humano além do host". Fernando respondeu "gostei, crie planos de implementação em forma de todo para essas coisas que vc mencionou", pedindo que esse achado (e os outros do mesmo relatório) virassem itens de backlog.

**Situação atual**:
- `buildRoom()` em [server.js](../server.js) define `npcCount: Math.max(0, maxPlayers - 1)` (linha 407) e a criação da sala já chama `spawnBotsForRoom(room)` (linha 428) antes de qualquer humano além do host entrar — ou seja, todas as vagas "vazias" já nascem preenchidas por bots.
- `serializeRoomForList()` (linhas 480-485) expõe `playerCount: room.players.size`, que soma bots e humanos igualmente.
- `publicRoomList()` (linhas 487-489) usa `serializeRoomForList` para montar a lista de salas públicas enviada ao cliente; `public/game.js` renderiza `${room.playerCount}/${room.maxPlayers}` (linha 1415) na tela "SALAS PÚBLICAS".
- Confirmado ao vivo nesta sessão: uma sala VERSUS criada com `maxPlayers = 4` apareceu como "4/4" na listagem pública com 0 jogadores humanos (só bots), depois com 1 (host) e depois com 2 (host + segundo jogador) — o número não mudou em nenhum momento porque os bots sempre completavam o total.
- A infraestrutura para diferenciar humano de bot já existe e é usada em outro lugar: `attemptJoin()` (linhas 450-465) calcula `humanCount` filtrando `!p.isBot` (linha 460) para nomear jogadores sem nome (`Agente N`). Só não é reaproveitada na serialização da lista pública.

**Proposta técnica**:
- Em `serializeRoomForList()` (server.js, linha ~482), trocar o valor exposto como `playerCount` de `room.players.size` para uma contagem só de humanos: `[...room.players.values()].filter((p) => !p.isBot).length`.
- Não alterar mais nada: `room.players.size` continua sendo usado normalmente em todo o resto do jogo (simulação, colisões, substituição de bot ao entrar em `attemptJoin`, etc.) — a mudança fica isolada nesse um campo exposto na listagem pública.
- `public/game.js` não precisa de nenhuma alteração — já renderiza `${room.playerCount}/${room.maxPlayers}` literalmente; só o significado do número que chega via socket muda (de "ocupantes totais incluindo bot" para "jogadores humanos reais").
- Resultado esperado: uma sala com só o host aparece como "1/4" na lista pública (em vez de "4/4"), deixando claro que ainda há espaço para gente de verdade entrar, mesmo que — pela mecânica de bots já implementada — a partida em si já comece cheia de oponentes/aliados.

**Riscos / decisões em aberto**:
1. Q1 - Com esse ajuste, uma sala com só o host vai aparecer como "1/4" — o que pode parecer "quase vazia" mesmo garantindo, pela mecânica de bots, uma partida cheia desde o início. Vale acrescentar algum indicador extra na listagem (tipo um selo "+3 bots" ao lado do "1/4") para deixar isso explícito, ou "1/4" sozinho já resolve a confusão original?
