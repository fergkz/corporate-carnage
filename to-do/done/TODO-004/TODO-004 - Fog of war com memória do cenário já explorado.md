# TODO-004 — Fog of war com memória do cenário já explorado

**Status**: concluído

**Pedido original**: "O cenário está muito escuro agora.. Basicamente, por onde já
passei e visualizei, deve deixar escuro, mas mostrar a silhueta dos objetos
ok? mas sem mostrar os personagens npcs, intes etc.. ou seja, é como se eu
tivesse passado por ali, eu lembrasse de como era o cenário"

**Situação atual**:
- O jogo já tem um cone/raio de visão (estilo Project Zomboid, conforme o
  comentário em [game.js:11](../public/game.js#L11)), com `BASE_VISION = 8` e
  `BOOSTED_VISION = 15` unidades de mundo ([game.js:11-12](../public/game.js#L11)).
- `render()` ([game.js:1018](../public/game.js#L1018)) desenha a cena inteira
  (chão, paredes, props, pickups, corpos, zumbis, jogadores, tracers,
  explosões) normalmente em `drawFloor`/`drawWalls`/`drawProps`/`drawZombies`/
  `drawPlayers` etc., e só depois, por cima de tudo, `drawFogOfWar(visionRadius,
  aimAngle())` ([game.js:1000-1016](../public/game.js#L1000-L1016)) pinta um
  gradiente radial elíptico escuro (quase preto, `rgba(2,5,6,*)`) centrado no
  jogador e deslocado na direção da mira, cobrindo a tela inteira fora do
  raio de visão.
- Ou seja, **não existe nenhuma memória do que já foi visto**: a cada frame a
  cena inteira é redesenhada do zero e o "escuro" é só uma máscara de
  gradiente recalculada a cada frame a partir da posição/mira atual — assim
  que o jogador se afasta ou vira a mira, a área que ele acabou de ver some
  de volta para o preto total, igual a áreas nunca visitadas. Isso é o que o
  Fernando está chamando de "muito escuro": não há diferença visual entre
  "nunca estive aqui" e "já passei por aqui".
- `world.walls` e `world.props` ([game.js:172](../public/game.js#L172),
  atribuídos uma única vez em
  [game.js:1404](../public/game.js#L1404)) são estáticos durante a partida —
  não mudam de posição depois que o mundo é recebido do servidor — o que
  facilita desenhar uma versão "lembrada" deles sem precisar sincronizar
  estado adicional do servidor.
- O projeto já usa a técnica de pré-renderizar sprites em canvas offscreen e
  colar (`bakeSprite`/`paintSprite`,
  [game.js:218-233](../public/game.js#L218-L233)) para móveis, então usar um
  canvas offscreen adicional para a "máscara de exploração" segue um padrão
  já existente no código, não introduz uma técnica nova ao projeto.

**Pesquisa externa**:
- O padrão clássico de fog-of-war (RTS/top-down) usa **três estados** por
  célula do mapa: nunca visto (preto sólido), já visto mas fora da visão
  atual (escurecido, mostrando só geometria estática), e visível agora
  (sem escurecimento) — confirmado em várias implementações de referência
  (ex. discussão de arquitetura em
  [Fog of War research (FOW-research)](https://petermcp.github.io/FOW-research/)
  e [Fog Of War — Brendan Keesing](https://brendankeesing.com/blog/fog_of_war/)).
  Isso bate exatamente com o pedido do Fernando (3 estados, não 2).
  Implementação prática: manter uma "máscara de revelação" em canvas offscreen
  de baixa resolução (grid, não pixel-a-pixel) e usar
  `globalCompositeOperation = 'destination-out'` para "queimar" um círculo na
  máscara sempre que o jogador visita uma área — é a técnica descrita em
  [Fog of War test (codepen)](https://codepen.io/zyklus/pen/nzwROM) e é o
  jeito padrão de fazer isso em Canvas 2D sem WebGL.
  Recomendação de performance da mesma pesquisa: reduzir a resolução da
  grade da máscara é o ganho mais importante (não precisa granularidade de
  pixel, células de ~0.5–1 unidade de mundo bastam) — evita custo por frame
  desenhando um gradiente radial por célula.
- Aplicado à proposta abaixo: a máscara de revelação vira a fonte da verdade
  de "onde eu já passei"; a cena "lembrada" (silhueta estática) é só chão +
  paredes + props redesenhados escurecidos e recortados por essa máscara —
  sem entidades dinâmicas.

**Proposta técnica**:
1. **Criar uma "máscara de exploração" persistente** por partida (reset ao
   entrar em uma sala nova / `world` mudar): um canvas offscreen do tamanho
   do mundo (`world.arena * 2` unidades × alguma resolução de célula, ex.
   0.5 unidade/célula — não precisa ser por-pixel de tela) inicializado
   totalmente opaco (preto, representa "nunca visto"). Guardar como estado
   de módulo tipo `exploredMask` (canvas + ctx 2D), do mesmo jeito que
   `bakeSprite` guarda canvases pré-renderizados.
2. **A cada frame**, quando `deployed` (jogador em campo), "queimar" um
   círculo na máscara na posição atual do jogador com raio = `visionRadius`,
   usando `ctx.globalCompositeOperation = 'destination-out'` com um
   gradiente radial suave (centro totalmente transparente, borda com fade)
   — isso deixa permanentemente "menos preto" a área visitada, célula por
   célula, sem apagar o que já foi revelado antes (a operação só soma
   transparência, nunca volta a escurecer).
3. **Reordenar o pipeline de `render()`** ([game.js:1018](../public/game.js#L1018))
   para três camadas em vez de duas:
   - **Camada base "lembrada"**: desenhar `drawFloor` + `drawWalls` +
     `drawProps` (sem zumbis, jogadores, pickups, corpos, tracers etc.) numa
     versão escurecida (ex. um retângulo preto semi-transparente por cima,
     tipo `rgba(0,0,0,0.72)`, ou reduzir `globalAlpha` da cena estática antes
     de desenhar) — essa é a silhueta "eu lembro de como era aqui".
   - **Aplicar a `exploredMask`** por cima dessa camada com
     `globalCompositeOperation = 'destination-in'` (ou desenhando a máscara
     como um recorte) para apagar de vez as áreas nunca visitadas — vira
     preto total onde a máscara ainda está opaca.
   - **Camada "visão atual"**: redesenhar a cena completa (chão + paredes +
     props na versão normal/clara + pickups + corpos + zumbis + jogadores +
     tracers + projéteis + explosões, ou seja, tudo que já é desenhado hoje)
     recortada pelo cone/raio de visão atual (reaproveitar a mesma forma
     elíptica de `drawFogOfWar`, mas em vez de pintar preto por cima, usar
     como clip/máscara positiva — ex. `ctx.save(); ctx.clip(...)` com o
     path da elipse de visão antes de desenhar a cena completa, ou desenhar
     a cena completa num canvas offscreen à parte e compor com
     `destination-in` usando o gradiente de visão).
   - Isso garante a regra pedida: fora da visão atual mas já visitado →
     escuro com silhueta estática; fora da visão atual e nunca visitado →
     preto total; dentro da visão atual → tudo normal, incluindo zumbis/
     jogadores/pickups.
4. **Resetar `exploredMask`** sempre que `world` for reatribuído
   ([game.js:1404](../public/game.js#L1404), quando o jogador entra numa
   sala/partida nova) para não vazar exploração de uma partida pra outra.
5. Manter `visionRadius` e a lógica de `BASE_VISION`/`BOOSTED_VISION`
   exatamente como estão — o pedido é sobre o que acontece *fora* do raio de
   visão, não sobre o tamanho do raio em si.

_Q1, Q2 e Q3 foram resolvidas na implementação (nenhuma decisão ficou em
aberto): a máscara é **só local do cliente**, por jogador, sem
sincronização via servidor (Q1); o escurecimento usa
`rgba(0,0,0,0.72)` sobre a cena estática (Q2); e a máscara **persiste a
partida inteira**, resetando só quando `world` é reatribuído (nova sala),
não a cada respawn (Q3) — exatamente como a proposta descrevia por
padrão._
