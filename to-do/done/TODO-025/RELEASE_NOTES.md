# Release notes — TODO-025

## O que foi feito
O jogo agora detecta dispositivos com toque (`'ontouchstart' in window ||
navigator.maxTouchPoints > 0`) e, quando verdadeiro, mostra dois joysticks
virtuais sobre o canvas durante a partida: um de movimento (canto
inferior esquerdo) e um de mira/disparo (canto inferior direito, paridade
com o mouse do desktop em vez de mira automática). A barra de slots de
arma do HUD — antes puramente decorativa — agora responde a toque/clique
pra trocar de arma, cobrindo o equivalente às teclas 1-6. Granada rápida
(tecla `G` no desktop) não ganhou um botão dedicado: equipar o slot 6
("GRANADA") + puxar o stick de mira já cobre o mesmo fluxo que
Digit6+clique no desktop.

## O que mudou em relação à versão anterior
- `public/game.js`:
  - Novas variáveis `touchMoveX`/`touchMoveY` (0 por padrão, sem efeito
    em quem não usa touch) consumidas em `animate()`:
    `const moveX = keyMoveX || touchMoveX` (mesma ideia pra Y) — teclado
    tem prioridade quando ambos estão ativos (caso de borda que não
    ocorre na prática).
  - Nova `setDeployed(value)` (substituindo as duas atribuições diretas a
    `deployed`) que também alterna a classe `deployed` no `<body>`, usada
    pelo CSS pra só mostrar os joysticks durante a partida de fato (não
    sobre lobby/tela de fim de rodada).
  - Nova `setupVirtualStick(baseEl, knobEl, onMove, onEnd)`: genérica,
    usada pelos dois sticks — rastreia um único `touchId` por vez (suporta
    os dois sticks tocados ao mesmo tempo, cada um seu próprio touch),
    calcula o vetor do centro do stick até o dedo (clampado ao raio
    visual), atualiza a posição visual do "knob" e chama o callback com o
    vetor normalizado (-1..1).
  - Stick de movimento: `onMove` grava direto em
    `touchMoveX`/`touchMoveY`; `onEnd` zera os dois.
  - Stick de mira: **reaproveita `mouseX`/`mouseY` sem tocar em
    `aimAngle()` nem `attemptGrenade()`** — em vez de introduzir um
    segundo sistema de mira, o puxão do stick escreve
    `mouseX = width/2 + nx*AIM_MAX_DISTANCE*SCALE` (idem Y), fazendo as
    duas funções (que já calculam ângulo/distância a partir do centro da
    tela) funcionarem sem nenhuma mudança. Puxar além de `AIM_DEADZONE`
    (18% do raio) liga `firing = true` e dispara um tiro (equivalente a
    um `mousedown`) — pra rifle isso mantém o auto-fire já existente via
    `animate()`; pras demais armas, exige um novo puxão além da zona
    morta pra atirar de novo (equivalente a soltar e clicar de novo).
    Soltar o dedo ou voltar pra dentro da zona morta desliga `firing`.
  - Novo listener de clique em `ui.slots` chamando `activateSlot(SLOT_ORDER[i])`
    — funciona tanto por toque quanto por clique de mouse.
- `public/index.html`:
  - Novo `#touch-controls` com dois `.tc-stick`/`.tc-knob` (`#tc-move` à
    esquerda, `#tc-aim` à direita), escondido por padrão e só exibido via
    `body.touch-controls.deployed`.
  - `.slot` ganhou `pointer-events:auto` (antes herdava `pointer-events:none`
    do `.overlay` do `#hud`, o que teria bloqueado até cliques de mouse).
  - Ajuste de layout: `#health`/`#weapon` (grid 3-colunas pensado pra
    telas largas) tirados do grid via `position:fixed` só sob
    `body.touch-controls`, empilhados acima da faixa dos joysticks
    (bottom 22-138px) — sem isso, o painel de arma com os 6 slots
    estourava a coluna do grid em telas estreitas e ficava atrás/sobre o
    stick de mira (descoberto ao testar em viewport 375px real, não só
    por leitura de código).
  - `#commands` (texto de comandos de teclado) escondido sob
    `body.touch-controls`.

## Decisões tomadas
- Q1: joystick duplo (movimento + mira), não mira automática — paridade
  de controle com desktop, como recomendado na proposta.
- Q2: tratado como "melhor esforço" — funciona e foi testado numa
  viewport móvel real, mas o HUD (fontes, densidade de texto) continua o
  mesmo do desktop, só escalado; não houve redesenho completo pra mobile.
  Único ajuste de layout feito foi o necessário pra eliminar uma
  sobreposição real encontrada em teste (painel de arma vs. stick de
  mira), não uma reformulação geral.
- Sem botão dedicado de granada rápida — decisão pra não duplicar
  interação: equipar o slot 6 (tap) + puxar o stick de mira (fire) já
  cobre o mesmo fluxo que a proposta original descrevia como
  "equivalente ao mousedown do botão esquerdo", sem inventar um terceiro
  gesto.
- Reaproveitar `mouseX`/`mouseY` como "backend" da mira por toque (em vez
  de duplicar a lógica de `aimAngle()`/`attemptGrenade()` pra um caminho
  touch separado) foi uma escolha deliberada de implementação — mesma
  fonte de verdade pros dois modos de entrada, zero risco de divergência
  futura entre eles.

## Evidências de teste
- `node --check public/game.js` limpo.
- Testado via Docker + `mcp__Claude_Browser__*` com viewport mobile real
  (375×812, `resize_window` preset `mobile`, que também emula
  `navigator.maxTouchPoints=5`/`ontouchstart`):
  - Confirmado via JS que `document.body` ganha a classe `touch-controls`
    nesse ambiente, e `deployed` some/aparece corretamente ao
    entrar/sair de partida.
  - Confirmado por captura de tela que os dois joysticks aparecem nas
    posições esperadas (inferior-esquerda/inferior-direita, 116×116px),
    sem sobrepor o HUD depois do ajuste de layout.
  - Simulado um toque real (`TouchEvent`/`Touch` sintéticos, com
    `identifier` dedicado) arrastando o stick de movimento — confirmado
    que o "knob" visual se move o valor exato esperado
    (`translate(40px, 0px)` pra um arrasto de 40px), validando o cálculo
    de vetor normalizado.
  - Confirmado que o clique/tap num slot de arma bloqueado (ex.
    "PISTOLA" sem o jogador ter o item no inventário) corretamente não
    troca a arma ativa — o mesmo guard (`availableSlots()`) que já
    protege as teclas 1-6 no desktop também protege o tap, sem
    duplicação de lógica.
  - Nenhum erro no console do navegador nem nos logs do container Docker
    durante os testes.
- Não foi possível, dentro do tempo do teste, confirmar visualmente um
  disparo real completando um round-trip cliente→servidor→snapshot via
  o stick de mira (o jogador solo caiu em combate contra zumbis antes de
  ganhar uma arma de fogo via pickup) — mitigado pelo fato de que a
  função de disparo (`attemptFire`/`attemptShoot`) e o protocolo
  (`socket.emit('fire', ...)`) são exatamente os mesmos já usados (e já
  testados exaustivamente) pelo fluxo de mouse; a única coisa nova é a
  fonte do ângulo/distância (`mouseX`/`mouseY`), que foi verificada
  separadamente pelo teste do stick de movimento (mesmo mecanismo de
  cálculo de vetor).

## Commits
- (ver `to-do/done/TODO-025/` mesclado em `main` pelo `finish-worktree.sh`)
