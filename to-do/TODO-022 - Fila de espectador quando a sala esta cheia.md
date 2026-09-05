# TODO-022 — Fila de espectador quando a sala está cheia

**Status**: pendente

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu "hoje, se não sobra bot pra substituir, `attemptJoin` simplesmente recusa (`reason: 'full'`) — pro público de um evento, entrar como espectador esperando vaga é bem melhor que ser rejeitado". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- `attemptJoin()` ([server.js:450-465](../server.js)): se `room.players.size >= room.config.maxPlayers`, procura um bot pra substituir (`[...room.players.values()].find((p) => p.isBot)`); se não encontra nenhum bot (sala cheia só de humanos), devolve `safeAck(ack, { ok: false, reason: 'full' })` e a conexão simplesmente não entra na sala.
- `public/game.js` trata esse retorno via `JOIN_ERROR_LABEL` ([public/game.js:1341-1344](../public/game.js)): `full: 'Sala cheia'` — mostra a mensagem e o jogador fica preso na tela de entrada, sem alternativa nenhuma além de tentar outra sala.
- Não existe hoje nenhum conceito de "espectador" no modelo de dados: `room.players` só guarda jogadores de verdade (humanos `ready` ou bots); não há uma lista separada de observadores nem um estado de socket pra alguém que está "olhando" uma sala sem participar.
- O evento `welcome` ([server.js:443-446](../server.js)) e o restante do protocolo assumem que quem está na sala é um `player` com posição/vida/inventário — um espectador precisaria de um caminho diferente (recebe snapshots pra desenhar a cena, mas não tem entidade própria nem inventário).

**Proposta técnica**:
- Adicionar `room.spectators` (Map de socket.id → nome), separado de `room.players`. Quando `attemptJoin` cair no caso "cheia e sem bot pra substituir", em vez de recusar, colocar o socket em `room.spectators` e devolver `ack` com um novo status (ex. `{ ok: true, spectating: true, ... }`) — o cliente entra na sala em modo espectador (recebe os snapshots de posição/estado pra desenhar a cena e o placar, mas sem HUD de vida/munição/inventário próprio, câmera livre ou seguindo um jogador à escolha).
- Fila de promoção: quando um jogador humano sai da sala (`leaveCurrentRoom`/desconexão) ou quando `room.config.maxPlayers` aumenta via ajuste de configuração, promover o espectador mais antigo da fila (`room.spectators`, ordenado por ordem de entrada) para `room.players` automaticamente, reaproveitando o mesmo caminho de `joinRoomSocket()` já usado pra entrada normal.
- Notificar espectadores da posição na fila (ex. "2º na fila, aguardando vaga") via um evento dedicado, atualizado a cada mudança em `room.spectators`.
- Este item se conecta naturalmente ao TODO-024 (espectador pós-morte em Battle Royale) — a UI de "modo espectador" (câmera livre/seguindo alguém, sem HUD de jogador) pode e deve ser a mesma base de código nos dois casos, só a origem (fila de entrada vs. morte em partida) é diferente. Recomendo implementar o TODO-024 primeiro (menor escopo) e reaproveitar a mesma UI de espectador aqui.

**Riscos / decisões em aberto**:
1. Q1 - Espectadores devem poder ver a partida em andamento em tempo real (recebendo snapshots normalmente) mesmo antes de vir sua vez, ou só entram na visualização quando promovidos a jogador?
2. Q2 - Confirma a ordem sugerida (implementar primeiro o TODO-024, que já cobre a base de "modo espectador", e depois reaproveitar aqui só a lógica de fila/promoção)?
