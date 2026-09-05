# TODO-024 — Modo espectador após morte no Battle Royale

**Status**: concluído

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu "quem morre em battle royale fica parado sem indicação até o fim — seguir a câmera de um jogador vivo resolveria isso". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- Confirmado lendo o código: em `killPlayer()` ([server.js:623-639](../server.js)), o respawn automático só é agendado `if (room.config.lifeMode === 'respawn')` — em `battleRoyale`, o jogador morto fica `alive: false` permanentemente até `checkRoundEnd`/`resetMatch`, sem nenhum tratamento especial.
- `player.ready` nunca é setado para `false` na morte (só é definido `true` uma vez, na entrada da sala) — então o jogador morto continua na lista `players` enviada ao cliente (`[...room.players.values()].filter((player) => player.ready)`, linha 1607), só com `alive: false`.
- No cliente, a câmera vem de `render()`: `const self = entities.get(selfId); const camX = self ? self.x : 0` ([public/game.js:1138-1140](../public/game.js)) — como o jogador morto continua na lista `players`/`entities` (só com `alive: false`), a câmera simplesmente para de se mover (ele já não processa mais movimento — `if (!player.alive || !player.ready) continue;` no laço de aplicação de input do servidor, por volta da linha 1583, ignora input de quem está morto). Resultado confirmado: a câmera do jogador morto fica congelada na posição exata da morte, sem nenhuma indicação do que fazer, exatamente como relatado no brainstorm.
- Não existe hoje nenhuma UI de "modo espectador" nem forma de trocar de câmera/alvo seguido.

**Proposta técnica**:
- No cliente, detectar `selfState.alive === false` (já disponível via `updateHud`, que atualiza `selfState` a cada snapshot) e `room.config.lifeMode === 'battleRoyale'` pra entrar num modo de câmera "espectador": em vez de usar a posição do próprio jogador morto (`self.x`/`self.y`), seguir a posição de outro jogador vivo (`entities` filtradas por `alive: true`, excluindo bots se preferir priorizar humanos).
- Adicionar uma pequena UI de troca de alvo (ex. setas `←`/`→` ou clique num nome no placar) pra alternar entre jogadores vivos disponíveis, com um texto fixo tipo "ASSISTINDO: {nome}" no topo — reaproveitando o mesmo canal de HUD já usado pro resto da interface.
- Esconder elementos de HUD que não fazem sentido pra quem está só assistindo (vida, munição, inventário) e trocar por um aviso "Você foi eliminado — aguardando fim da partida" (ou o nome de quem eliminou, já disponível via `killfeed`).
- Isso é puramente client-side (o servidor já envia a posição de todo mundo `ready`, vivo ou não, então nenhuma mudança de protocolo é necessária) — o único ajuste do lado servidor é garantir que o jogador morto continue recebendo snapshots normalmente mesmo sem processar input dele (já é o comportamento atual).
- Este item é a base de UI reaproveitável pelo TODO-022 (fila de espectador) — implementar aqui primeiro, documentado de forma que o TODO-022 só precise ligar sua fila de entrada a este mesmo modo de câmera.

**Riscos / decisões em aberto**:
1. Q1 - A troca de alvo deve ser manual (jogador escolhe quem seguir) ou automática (segue sempre quem está mais perto da ação/com mais pontos), ou as duas (automática por padrão, manual como opção)?
