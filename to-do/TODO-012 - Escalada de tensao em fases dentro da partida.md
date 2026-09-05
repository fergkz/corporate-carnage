# TODO-012 — Escalada de tensão em fases dentro da partida

**Status**: pendente

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu a Fernando: "arco de tensão dentro da própria rodada — início mais calmo pra explorar/pegar arma, pressão crescendo no meio, minuto final com um pico de zumbis ou pontuação em dobro". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- Só o modo `insane` já tem uma escalada real: `DIFFICULTY_PRESETS.insane` usa `zombieSpawnMode: 'evolution'` ([server.js:213](../server.js)), tratado por `advanceEvolution()` (por volta da linha 1245-1253) — a cada `EVOLUTION_INTERVAL_MS` (25s), nasce um lote de zumbis (`batchSize`, começando em `EVOLUTION_BATCH_BASE = 2`) até um teto (`currentCap = zombieBaseCount * EVOLUTION_CAP_MULTIPLIER`), e o lote cresce a cada 3 ondas (`state.waveIndex % 3 === 0`).
- Os outros modos (`fixed` no fácil, `constant` no normal/difícil) mantêm a contagem de zumbis estável a partida inteira: `fixed` nunca repõe zumbis mortos (checado em `scheduleZombieRespawn()`, linha 642: `if (room.config.zombieSpawnMode === 'fixed' || ...) return;`), `constant` repõe um de cada vez com atraso aleatório (linhas 643+).
- `resetMatch()` ([server.js:509-531](../server.js)) já guarda `room.matchEndsAt` (timestamp absoluto de fim) — dá pra calcular a fração decorrida da partida a qualquer momento (`(Date.now() - (matchEndsAt - duration*1000)) / duration`), sem precisar de novo estado.
- Não existe hoje nenhuma lógica que reaja a "quanto falta pra acabar" além do próprio `checkRoundEnd()` — nenhum modo (nem o `evolution`) acelera especificamente perto do fim, só cresce com o tempo de forma linear/constante.

**Proposta técnica**:
- Generalizar o padrão de ondas do `evolution` para todos os modos, calculando a fase a partir da fração decorrida da partida em vez de só contar ondas por tempo fixo:
  - Fase 1 (0-40% da duração): `zombieBaseCount` normal, sem alteração — foco em explorar e pegar arma/pickup.
  - Fase 2 (40-80%): aumento gradual do teto de zumbis simultâneos (reaproveitando a mesma ideia de `currentCap` do `evolution`, mas aplicada a `fixed`/`constant` também).
  - Fase 3 (últimos 20%, ou último minuto): pico de spawn (lote maior, ou reduzir o atraso de `scheduleZombieRespawn`) e opcionalmente pontuação em dobro por zumbi/kill nesse trecho — cria um "final por adrenalina" perceptível.
- Implementar como uma função `matchPhase(room, now)` que devolve `1`/`2`/`3` a partir de `room.matchEndsAt` e `room.config.matchDurationSeconds`, chamada dentro do laço principal de atualização (`update(room)`, por volta da linha 1572-1578) para ajustar os parâmetros de spawn/pontuação correntes sem duplicar a lógica de cada `zombieSpawnMode`.
- Sinalizar a mudança de fase no cliente (ex. um evento `matchPhase` ou embutido no snapshot já enviado) pra eventualmente mostrar um aviso tipo "ONDA FINAL" no HUD — reaproveitando o mesmo `announcement` já usado pra "NOVA RODADA"/vencedor.
- Cuidado para não conflitar com o modo Battle Royale (que já termina por eliminação, não por tempo corrido igual) — a fase 3/pico faz mais sentido pro modo `respawn`/`POR TEMPO`; avaliar se cabe também no Battle Royale ou se fica restrito ao outro `lifeMode`.

**Riscos / decisões em aberto**:
1. Q1 - A pontuação em dobro na fase final vale só para VERSUS (que já usa pontuação como condição de vitória) ou também para COOP (que não tem um "score limit", só é decorativo no placar)?
2. Q2 - O pico de zumbis da fase 3 deve se aplicar ao Battle Royale também, ou só ao modo POR TEMPO (já que Battle Royale termina por eliminação e um pico de zumbis no fim pode matar todo mundo de uma vez de forma frustrante)?
