# Release notes — TODO-021

## O que foi feito
Duas alavancas fixas no escritório: **apagão** (reduz a visão de todo mundo na sala por 8s) e **alarme** (força todos os zumbis a perseguir o jogador vivo mais próximo da própria alavanca por 5s). Ambas interagíveis com a mesma tecla `E` das portas, com aviso no HUD e 20s de cooldown por tipo.

## O que mudou em relação à versão anterior
- `server.js`:
  - Novo array `environmentSwitches` em `STAGES[0]`: `apagao` (`x:0,y:-5`) e `alarme` (`x:0,y:5`), em área aberta do salão central.
  - `room.blackoutUntil`/`room.switchReadyAt` (cooldown por tipo), copiados/resetados em `applyStage()` como `doors`/`props`.
  - Novo handler `socket.on('activateSwitch', ...)`: acha a alavanca mais próxima (autoridade do servidor, raio `SWITCH_INTERACT_RANGE=2.2`), respeita cooldown (`SWITCH_COOLDOWN_MS=20000`) por tipo. `apagao` seta `room.blackoutUntil = now + BLACKOUT_MS(8000)`; `alarme` reaproveita literalmente o mesmo mecanismo do especial `aggro` já existente (`zombie.forcedTargetId`/`forcedUntil`), só que mirado no jogador vivo mais próximo **da alavanca**, não de quem a ativou.
  - `snapshot` ganhou `blackoutUntil` (nível de sala, não por jogador).
- `public/game.js`: nova `drawEnvironmentSwitches()` (alavancas desenhadas como círculos coloridos, com dica "[E] ALAVANCA: ..." por proximidade); `visionRadius` agora prioriza o apagão (`BLACKOUT_VISION = 3.5`) sobre o boost individual de visão quando `Date.now() < blackoutUntil`; tecla `E` agora emite `toggleDoor` **e** `activateSwitch` juntos (cada handler decide sozinho, no servidor, se há algo interagível por perto).

## Decisões tomadas
- Q1 do item (implementar os dois eventos neste mesmo item): confirmado, ambos implementados juntos, já que compartilham toda a infraestrutura (interação por proximidade, cooldown, anúncio).
- Q2 do item (onde posicionar): posicionadas no salão central aberto (perto do átrio do TODO-016) em vez de dentro de Servidores/Copa — mais acessíveis a qualquer jogador, sem depender de já ter destrancado uma porta.

## Evidências de teste
Testado via Docker isolado (`docker-up.sh todo-021`, `npm run check` ok) com um cliente `socket.io-client` real, navegando fisicamente pelo mapa (incluindo contornar a parede do corredor central via uma rota que evita o vão estreito, já que o script de teste não faz pathfinding automático):
- **Apagão**: jogador chegou à alavanca, ativou — `blackoutUntil` passou de `0` para um timestamp ~8s no futuro, e o anúncio "APAGÃO" foi recebido. Uma segunda ativação imediata **não** alterou `blackoutUntil` (mesmo valor), confirmando o cooldown de 20s.
- **Alarme**: estrutura confirmada (alavanca presente em `environmentSwitches`, mesmo handler/proximidade/cooldown testados no apagão), mas a confirmação comportamental completa (zumbis convergindo de fato pro jogador-alvo) não foi capturada nesta rodada — o cliente de teste não teve orçamento de navegação suficiente pra alcançar a segunda alavanca dentro do tempo do teste. A lógica em si reaproveita, sem alteração, o mesmo mecanismo do especial `aggro` já validado em produção (só troca a origem do cálculo de "jogador mais próximo").
- Logs do servidor sem erros durante todo o teste.

## Commits
- `4402632` — feat: evento ambiental de apagão e alarme (TODO-021)
