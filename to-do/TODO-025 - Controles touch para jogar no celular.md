# TODO-025 — Controles touch para jogar no celular

**Status**: pendente

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu "controles touch pro celular (joystick virtual + botão de tiro) — o jogo vai pro público geral do evento, alguém vai tentar no celular mesmo sem isso ter sido pensado ainda". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- Toda a entrada hoje é de teclado/mouse: `addEventListener('keydown'/'keyup', ...)` ([public/game.js:1649-1661](../public/game.js)) monta o conjunto `keys` usado pra calcular `moveX`/`moveY` enviados via `socket.emit('input', { x: moveX, y: moveY, angle: aimAngle() })` (linha 1682); mira vem de `addEventListener('mousemove', ...)` (linha 1633, `mouseX`/`mouseY` brutos da tela) processados por `aimAngle()` ([public/game.js:1180-1182](../public/game.js): `Math.atan2(mouseY - height/2, mouseX - width/2)`); disparo/ataque vem de `addEventListener('mousedown', ...)` (linha 1634: `firing = true; attemptFire()`); troca de arma usa `1`-`6`/scroll; granada rápida usa tecla `G`.
- O protocolo de rede já é abstrato o suficiente pra não precisar mudar: o servidor só recebe `{ x, y }` normalizado (magnitude do vetor de movimento) e um `angle` de mira — não importa se isso veio de teclado+mouse ou de um joystick virtual, o `handleInput`/`handleShot` do servidor não fazem nenhuma suposição sobre a origem.
- Não existe hoje nenhuma detecção de dispositivo touch nem elemento de UI touch — `public/index.html`/`public/game.js` assumem desktop com mouse.
- `resize()`/`devicePixelRatio` (ver TODO-011) já lidam com tamanhos de tela variáveis, então a base de responsividade de canvas já existe; falta só a camada de input.

**Proposta técnica**:
- Detectar touch (`'ontouchstart' in window` ou `navigator.maxTouchPoints > 0`) na inicialização e, se verdadeiro, mostrar dois controles overlay fixos sobre o canvas: um joystick virtual no canto inferior esquerdo (área de toque que, ao ser arrastada, calcula um vetor normalizado igual ao `moveX`/`moveY` de hoje) e um botão de disparo no canto inferior direito (equivalente ao `mousedown`/`mouseup` do botão esquerdo).
- Mira num controle touch não pode depender de "posição do mouse na tela" (não existe cursor) — duas opções: (a) mira automática no zumbi/jogador vivo mais próximo dentro de um cone frontal (mais simples, character-action-mobile-friendly), ou (b) um segundo "joystick" virtual no lado direito da tela dedicado só à mira (mais fiel ao controle atual, mas ocupa mais tela e exige mais destreza). Recomendo (b) por manter a paridade de controle com desktop (jogadores mistos numa mesma sala competem em igualdade), com (a) como fallback mais simples se (b) se provar difícil de acertar em telas pequenas.
- Granada rápida (`G`) e troca de arma (`1`-`6`) precisam de equivalentes touch — uma barra de slots tocável (reaproveitando os ícones de inventário já existentes no HUD, que hoje são só decorativos) resolve a troca de arma; um botão extra dedicado resolve a granada rápida.
- Ajustar o layout do HUD (`public/index.html`) pra não sobrepor os novos controles nas áreas de toque inferiores — testar em `resize_window` com preset mobile (375x812) antes de considerar pronto.
- Zero mudança necessária no servidor — toda a adaptação é client-side, emitindo os mesmos eventos (`input`, `fire`, `equip`) que já existem hoje.

**Riscos / decisões em aberto**:
1. Q1 - Confirma a recomendação de joystick duplo (movimento + mira, paridade com desktop) em vez de mira automática mais simples? Mira automática é mais rápido de implementar e mais fácil pra quem nunca jogou, mas favorece quem joga no celular de forma diferente do PC.
2. Q2 - Vale a pena investir nisso agora (esforço razoavelmente alto de UI touch) sabendo que o jogo não foi desenhado pra telas pequenas desde o início (HUD, tamanho de sprite, densidade de informação), ou prefere tratar como "melhor esforço" (funciona, mas não necessariamente confortável) pra essa primeira versão?
