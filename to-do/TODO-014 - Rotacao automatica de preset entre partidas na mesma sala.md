# TODO-014 — Rotação automática de preset entre partidas na mesma sala

**Status**: pendente

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu "rotação automática de preset entre partidas na mesma sala (Coop → Versus → Battle Royale) pra variar sem o host reconfigurar toda vez". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- Ao fim de uma rodada, `finishRound()` ([server.js:1255-1262](../server.js)) muda `room.state` para `'roundEnd'`; quando todos os jogadores confirmam via `socket.on('readyNext', ...)` ([server.js:1543-1550ish](../server.js), contando `humans.filter((p) => p.wantsNextRound).length`), o servidor chama `startMatch(room)` de novo, que chama `resetMatch(room)` ([server.js:509-531](../server.js)) — mas `room.config` (modo, lifeMode, dificuldade, etc.) nunca muda sozinho nesse fluxo; continua exatamente com a configuração escolhida na criação da sala (ou na última vez que o host mexeu em "AJUSTAR CONFIGURAÇÕES").
- O host já pode mudar `room.config` manualmente entre partidas pelo mesmo caminho usado na criação: `updateSettings`-like handler (por volta da linha 1490-1510) reaplica `mode`/`lifeMode`/`difficulty`/`maxPlayers`, incluindo o recálculo de `scoreLimit`/`npcCount` — ou seja, a troca de preset "no meio do caminho" já é suportada manualmente, só não é automática.
- Não existe hoje nenhum conceito de "lista de presets" ou "índice da rodada atual" guardado na sala — `room.config` é um objeto único, sobrescrito diretamente.

**Proposta técnica**:
- Adicionar um campo opcional na criação de sala, ex. `room.config.autoRotate: boolean` (desligado por padrão) e, se ligado, uma lista fixa de presets a alternar (ex. `[{mode:'coop', lifeMode:'respawn'}, {mode:'versus', lifeMode:'respawn'}, {mode:'versus', lifeMode:'battleRoyale'}]`) e um contador `room.roundIndex`.
- No ponto em que o servidor decide reiniciar a partida depois de todos confirmarem `readyNext` (antes de chamar `startMatch(room)`), se `room.config.autoRotate` estiver ligado: incrementar `room.roundIndex`, aplicar o próximo preset da lista (reaproveitando a mesma função que já normaliza `mode`/`lifeMode`/`scoreLimit`/`npcCount` usada em `updateSettings`, em vez de duplicar essa lógica) e emitir a mudança de configuração pro cliente (o payload de `lobbyUpdate`/`matchStarted` já carrega `settings: room.config`, então o cliente só precisa reagir e atualizar os rótulos do HUD).
- Anunciar a mudança de preset ao entrar na nova rodada (reaproveitando `announcement`, ex. "PRÓXIMA RODADA: VERSUS · BATTLE ROYALE" em vez de só "NOVA RODADA").
- Manter a dificuldade (`zombieBaseCount`/etc.) e `maxPlayers` fixos entre rotações (só alternar `mode`/`lifeMode`, que são os dois eixos citados no pedido) — mudar `maxPlayers` no meio de uma sequência de rodadas teria efeito colateral em jogadores já conectados (ver TODO-006/npcCount) e foge do escopo pedido.

**Riscos / decisões em aberto**:
1. Q1 - A lista de presets pra rotação deve ser fixa (a sequência sugerida Coop → Versus/Respawn → Versus/Battle Royale) ou o host deve poder escolher quais entram na rotação na tela de criação?
2. Q2 - Se um jogador entrar no meio de uma sequência de rotação (sala pública, alguém entra depois da 2ª rodada), ele só vê a configuração atual ou faz sentido mostrar "próxima: X" antecipadamente no lobby entre rodadas?
