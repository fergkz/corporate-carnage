# Release notes — TODO-004

## O que foi feito
O cliente agora guarda uma "máscara de exploração" por partida: área que o
jogador já visitou, mas que está fora do cone/raio de visão atual, aparece
como uma silhueta escurecida do cenário estático (chão, paredes, móveis) em
vez de voltar ao preto total. Área nunca visitada continua totalmente
preta. Zumbis, jogadores, pickups e efeitos nunca aparecem na camada
"lembrada" — só na visão ao vivo, dentro do cone atual.

## O que mudou em relação à versão anterior
- `public/game.js`:
  - `ctx` do canvas principal virou `let` (era `const`) pra poder ser
    redirecionado temporariamente durante a composição da camada lembrada
    (`withCanvasContext`), reaproveitando `drawFloor`/`drawWalls`/
    `drawProps` sem duplicar essas funções.
  - Novo canvas offscreen `rememberedCanvas`/`rememberedCtx`, redimensionado
    junto com o canvas principal em `resize()`.
  - Novo estado `exploredMask` (canvas de baixa resolução, `EXPLORED_MASK_RES
    = 3` px/unidade de mundo) — `resetExploredMask()` cria uma máscara nova
    (tudo "nunca visto"), chamada em `welcome` sempre que `world` é
    reatribuído (nova sala/partida). `burnExploredMask()` "queima"
    permanentemente um círculo revelado na posição do jogador a cada frame
    (gradiente radial, só soma opacidade, nunca escurece de volta).
  - `renderRememberedLayer()` compõe chão+paredes+props escurecidos
    (`rgba(0,0,0,0.72)`) recortados pela `exploredMask`
    (`globalCompositeOperation = 'destination-in'`) no canvas offscreen, e
    `render()` cola essa camada por trás da cena ao vivo.
  - `clipToVisionCone()` (nova) recorta a cena "ao vivo" (tudo que já era
    desenhado antes — zumbis, jogadores, pickups, efeitos) exatamente à
    mesma elipse de visão de `drawFogOfWar`, agora em espaço de mundo — sem
    isso, a camada lembrada apareceria "por baixo" de entidades fora da
    visão real.
  - `VISION_RY_RATIO`/`VISION_FORWARD_SHIFT_RATIO` extraídas como constantes
    compartilhadas entre `drawFogOfWar` (vinheta em espaço de tela) e
    `clipToVisionCone` (recorte em espaço de mundo), pra garantir que as
    duas desenhem exatamente a mesma forma de elipse.
- Nenhuma mudança no servidor — a máscara de exploração é 100% estado local
  do cliente (ver Decisões abaixo).

## Decisões tomadas
(as 3 perguntas do item foram resolvidas na própria implementação, sem uma
rodada de resposta separada do Fernando — registradas aqui por
transparência)
- **Q1 (por jogador ou compartilhada)**: implementado **só local por
  jogador** — a máscara não é sincronizada via servidor/socket.
- **Q2 (nível de escurecimento)**: `rgba(0,0,0,0.72)` sobre a cena estática
  — escuro o suficiente pra distinguir "já visitei" de "visão ao vivo", mas
  ainda dá pra reconhecer o layout de paredes/móveis.
- **Q3 (reseta no respawn?)**: **não** — a máscara persiste a partida
  inteira, resetando só quando `world` é reatribuído (nova sala), como a
  proposta recomendava por padrão.

**Atualização pós-lançamento**: a camada lembrada e a vinheta de fog-of-war
ficaram clareadas depois do lançamento inicial — `renderRememberedLayer`
passou de `rgba(0,0,0,0.72)` pra `rgba(0,0,0,0.48)`, e o topo do gradiente
de `drawFogOfWar` de `rgba(2,5,6,0.85)/rgba(2,5,6,1)` pra
`rgba(2,5,6,0.5)/rgba(2,5,6,0.62)` — a área nunca visitada continua bem
escura, mas a área já explorada ficou mais fácil de reconhecer.

## Evidências de teste
- `node --check server.js` e `node --input-type=module --check < public/game.js`: OK.
- `docker compose up -d --build` + `npm run check` dentro do container: OK.
- Sessão de teste prolongada via navegador (sala criada, partida iniciada)
  sem nenhum erro de console nem de servidor (`docker compose logs game`
  filtrado por error/throw/exception: vazio).
- **Limitação encontrada durante o teste**: a aba do navegador automatizado
  ficou com `document.hidden = true`, o que suspende o
  `requestAnimationFrame` do jogo (impedindo o próprio loop de render/input
  do cliente de rodar) e bloqueia screenshot ("Browser pane não está sendo
  exibido"). Isso impediu confirmar **visualmente** (com print) a
  silhueta escurecida renderizando corretamente dentro desta sessão — é
  limitação do ambiente de teste automatizado, não um erro observado no
  código. A implementação foi conferida por leitura completa e cuidadosa
  do diff aplicado (ver "O que mudou" acima), a ordem de composição das
  camadas em `render()` bate com a proposta original, e não houve nenhum
  erro de sintaxe/runtime. Recomenda-se um spot-check visual manual rápido
  quando conveniente — especialmente pra calibrar o nível de escurecimento
  (Q2) olhando de verdade.

## Commits
- `76460ea` — feat: munição com peso por arma no HUD e fog of war com
  memória do cenário (implementação combinada com TODO-001, ver
  `to-do/done/TODO-001/RELEASE_NOTES.md`)
