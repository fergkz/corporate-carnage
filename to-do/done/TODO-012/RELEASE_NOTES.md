# Release notes — TODO-012

## O que foi feito
O modo de reposição "constant" (dificuldades NORMAL e DIFÍCIL) agora acelera a reposição de zumbis conforme o objetivo de eliminação do estágio avança, com um aviso único de "ONDA FINAL" ao cruzar 80% do objetivo — dá um arco de tensão perceptível dentro do próprio estágio.

## O que mudou em relação à versão anterior
- **Desvio consciente da proposta original, documentado conforme pedido pelo item**: a proposta original do TODO-012 foi escrita antes da "campanha por estágios" (que substituiu o cronômetro de partida por progressão via objetivo) ter sido implementada por outra sessão em paralelo. Reconfirmando a situação atual do código antes de implementar (passo obrigatório da skill), constatei que `room.matchEndsAt`/duração de partida **não existem mais** — o jogo hoje avança por `room.stageProgress` (objetivo do estágio, ex. "eliminar 20 infectados"), não por tempo decorrido. Adaptei a métrica de "quão perto do fim" de **fração de tempo decorrido** para **fração do objetivo cumprido**, mantendo a mesma estrutura de 3 fases (0-40% / 40-80% / 80%+) e o aviso de onda final pedidos originalmente.
- `server.js`:
  - Nova função `stageProgressFraction(room)`: calcula `count/target` do `room.stageProgress` (só pra objetivos do tipo `'eliminate'`; devolve 0 para `'boss_kill'` ou ausência de estágio).
  - `scheduleZombieRespawn()`: o atraso de reposição de zumbi (antes fixo, `5000 + random*10000`) agora varia pela fase — fase 1 (0-40%) mantém o atraso original; fase 2 (40-80%) usa `3500 + random*5500`; fase 3 (80%+) usa `1500 + random*2500` e dispara `announcement` com título "ONDA FINAL" uma única vez por estágio (`room.finalWaveAnnounced`, resetado em `applyStage` a cada novo estágio).
  - Escopo mantido restrito ao modo `constant` (NORMAL/DIFÍCIL), como a proposta original recomendava — `fixed` (FÁCIL) continua sem reposição nenhuma (decisão de dificuldade preexistente) e `evolution` (INSANO) já tem sua própria escalada por ondas, sem alteração.

## Decisões tomadas
- Q1 do item (pontuação em dobro na fase final): não implementado nesta rodada — o foco ficou na escalada de zumbis/aviso, que já é o núcleo do pedido; pontuação em dobro pode ser um incremento futuro se Fernando quiser.
- Q2 do item (pico de zumbis também no Battle Royale): não diferenciado — a escalada se aplica a qualquer sala em modo `constant`, incluindo Battle Royale, já que o risco de "matar todo mundo de uma vez" citado na pergunta original é atenuado pelo fato de a escalada ser gradual (3 fases) e não um pico súbito.

## Evidências de teste
Testado via Docker isolado (`docker-up.sh todo-012`, `npm run check` ok) com um cliente `socket.io-client` real (sala COOP, 4 jogadores/3 bots, dificuldade NORMAL — objetivo 20 eliminações), observando o progresso ao longo de ~2 minutos de partida real:
- Aviso **"ONDA FINAL"** disparado exatamente uma vez, exatamente na transição 15/20 → 16/20 (80%), como projetado.
- Ritmo de eliminação visivelmente mais rápido depois do aviso: as mortes 16→17→18→19→20 aconteceram em poucos segundos (uma delas em 0,05s de diferença), contra ritmo bem mais lento nas eliminações 6-13.
- Ao completar o estágio 1 (20/20), a campanha avançou automaticamente pro estágio 2 ("Sala de Reunião — Confronto Final", objetivo `boss_kill`) sem nenhum "ONDA FINAL" espúrio ali (campo resetado corretamente por `applyStage`), e a campanha terminou normalmente com "CAMPANHA CONCLUÍDA".
- Logs do servidor sem erros durante todo o teste.

## Commits
- `fa14fb5` — feat: escalada de tensão por fases dentro do estágio (TODO-012)
