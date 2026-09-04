# Release notes — TODO-003

## O que foi feito
O zumbi "braço esticável" (`stretcher`) agora tem alcance de golpe maior e,
ao acertar o jogador, o puxa sustentadamente pra perto de si (em vez de só
bater à distância como antes).

## O que mudou em relação à versão anterior
- `meleeRange` do `stretcher` subiu de `2.6` pra `3.2` (~+23%).
- `windupMs` subiu de `550` pra `650`, dando mais tempo de reação ao
  jogador já que o alcance aumentou.
- Nova fase `pull` na máquina de estados de `runStretchLogic()`
  (`server.js`), entre `strike` e `recover`: ao conectar o golpe, o zumbi
  passa a puxar o jogador sustentadamente ao longo de vários ticks (a
  `pullSpeed: 6.5`/s) até `pullLandingDistance: 1.0`, em vez do puxão
  instantâneo original proposto no item. Essa versão sustentada (decisão
  do Fernando, ver abaixo) cancela sozinha se o alvo morrer, desconectar
  ou sair de jogo no meio do caminho, e tem um timeout de segurança
  (`pullMs: 400`) que também cobre o caso raro de mais de um `stretcher`
  agarrar o mesmo alvo ao mesmo tempo puxando em direções diferentes.
- Novo campo `grabTargetId` no zumbi, pra rastrear quem foi agarrado
  independente do alvo recalculado a cada tick pela IA normal.
- Cliente (`public/game.js`): `STRETCH_WINDUP_MS` atualizado pra 650ms
  (espelha o servidor); `drawStretchTelegraph()` agora também desenha um
  "braço conectado" (traço vermelho grosso) durante as fases `strike` e
  `pull`, não só durante o `windup` — reforço de feedback sugerido pela
  pesquisa de telegraphing do item, já que antes o acerto em si não tinha
  nenhum efeito visual próprio.

## Decisões tomadas
Respostas do Fernando às perguntas em aberto do item:
- Q1 (valores): usar os valores sugeridos, `meleeRange: 3.2` e
  `pullLandingDistance: 1.0`.
- Q2 (windup): aumentar para `650ms` (em vez de manter `550ms`), pra
  compensar o alcance maior.
- Q3 (mecânica do puxão): implementar a versão **sustentada e cancelável**
  (estilo Smoker de *Left 4 Dead*), não o puxão instantâneo que era a
  proposta padrão do item — dá uma janela de resgate real.
- Q4 (contraplay de soltar-se) não foi levantada de novo por já ter
  resposta implícita no item (mantido simples por ora, sem mecânica de
  soltar-se nesta v1).

## Evidências de teste
Testado via Docker (`docker compose up -d --build` + `npm run check`,
ambos limpos) em worktree isolado, pela ferramenta de navegador, com uma
sala criada e uma partida real rodando contra o servidor. Captura de tela
não foi possível nesta sessão (o pane do navegador não estava compondo
frames), então a validação foi feita lendo o HUD (INTEGRIDADE, timer) e os
logs do servidor em tempo real (log temporário de depuração, removido
antes do commit) durante o jogo real:

- Com o peso real do `stretcher` (6, ~4% dos zumbis) e uma partida de 3
  min, ocorreu um agarrão natural completo e limpo:
  `windup start, dist=3.15` → `HIT dist=3.15 <= range=3.2` → `pull start`
  → puxão em passos de `0.325`/tick (`pullSpeed * dt`) reduzindo a
  distância de `3.15` até `1.20` → `pull end, final dist=1.00` (parou
  exatamente na distância de pouso configurada).
- Em um teste de estresse à parte (peso do `stretcher` elevado
  temporariamente só para o teste, revertido antes do commit), com várias
  `stretcher` perseguindo o único jogador simultaneamente, um caso de dois
  zumbis agarrando o mesmo alvo ao mesmo tempo foi observado: o puxão de
  um deles não conseguiu chegar à distância de pouso (porque o outro zumbi
  puxava o jogador pra longe) e terminou corretamente pelo timeout de
  segurança (`pull end, final dist=10.90` após ~400ms), sem travar o
  servidor nem o cliente.
- HUD confirmou dano reduzindo INTEGRIDADE a cada acerto (100 → 16 em uma
  sequência de golpes), morte e respawn do jogador ocorrendo normalmente
  (`Um zumbi neutralizou Testador`, INTEGRIDADE de volta a 100 após
  respawn), sem erros no console do navegador nem stack traces nos logs
  do servidor durante toda a sessão de teste.

## Commits
08b4a99 — feat: zumbi braço esticável agora agarra e puxa o jogador ao acertar
