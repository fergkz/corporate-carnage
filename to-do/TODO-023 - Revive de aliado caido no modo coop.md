# TODO-023 — Revive de aliado caído no modo Coop

**Status**: pendente

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu "hoje morte = respawn automático sozinho depois de 2,2s; um aliado reanimar mais rápido chegando perto cria cooperação de verdade em vez de cada um por si". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- `killPlayer()` ([server.js:623-639](../server.js)): ao morrer, se `room.config.lifeMode === 'respawn'`, agenda `resetPlayer(target, true)` incondicionalmente depois de `2200`ms fixos — não há como isso ser antecipado por nenhuma ação de outro jogador, nem diferencia modo COOP de VERSUS (o respawn automático de 2,2s vale pros dois hoje).
- Não existe hoje nenhum estado de "jogador caído mas reanimável" — a morte é binária (`alive: false` → depois de 2,2s, `alive: true` de novo via `resetPlayer`); não há uma janela intermediária em que o jogador derrubado poderia ser reanimado por um aliado em vez de simplesmente esperar o timer.
- `room.config.mode` já diferencia `'coop'` de `'versus'` em vários pontos do código (ex. `checkRoundEnd`, linha 1276-1277) — a infraestrutura pra "isso só vale em coop" já existe e é só mais uma checagem de `room.config.mode === 'coop'`.

**Proposta técnica**:
- Só em modo COOP: ao morrer, em vez de agendar respawn automático fixo de 2,2s, colocar o jogador num estado "caído" (`player.downedUntil = Date.now() + DOWNED_TIMEOUT_MS`, ex. 15-20s) em que ele fica `alive: false` mas visível no chão (reaproveitando o mesmo sprite de "corpo caído" já usado pros efeitos de morte, [CONTEXT.md](../CONTEXT.md) seção "Animações de morte e explosão") — se ninguém o reanimar dentro desse prazo, aí sim cai no respawn automático de sempre (rede de segurança, ninguém fica preso pra sempre).
- Reanimação: um jogador vivo que fique parado perto de um aliado caído por N segundos (ex. 3s de "canalização", similar ao padrão já usado pelo zumbi `stretcher` de janela de fase com `windupMs`/`phaseAt`) completa o revive — `resetPlayer` chamado antes do timeout de queda, restaurando o aliado com uma fração da vida (ex. 50), não vida cheia, pra não anular o risco da morte.
- Em modo VERSUS, nada muda — a mecânica de revive não faz sentido entre rivais (e mesmo em VERSUS com bots aliados não existe "time", é todo mundo contra todo mundo) — continuar com o respawn automático fixo de 2,2s exatamente como hoje.
- Cliente: barra de progresso visual sobre o jogador caído durante a canalização de revive (reaproveitando o padrão já usado pra barra de vida/escudo), e o próprio jogador caído vendo uma mensagem tipo "Aguardando resgate..." em vez do respawn instantâneo.

**Riscos / decisões em aberto**:
1. Q1 - Quanto tempo de janela "caído" antes do respawn automático de segurança (a proposta sugere 15-20s) e quanto tempo de canalização pra reanimar (sugerido 3s) fazem sentido pro ritmo do jogo?
2. Q2 - O aliado reanimado volta com vida parcial (ex. 50, como sugerido) ou vida cheia? Vida parcial mantém risco, mas pode frustrar se o grupo já estava sob pressão.
