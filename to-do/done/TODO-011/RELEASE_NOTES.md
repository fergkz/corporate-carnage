# Release notes — TODO-011

## O que foi feito
O jogo ganhou um toggle "GRÁFICOS: ALTO/BAIXO" no HUD que reduz o custo de renderização por frame, mirando hardware fraco/celular, sem mudar nenhuma regra de jogo.

## O que mudou em relação à versão anterior
- `public/game.js`:
  - Novo estado `lowQuality`, persistido em `localStorage` (`cc_quality`), com `setLowQuality()`.
  - `resize()`: o cap de pixel ratio (`Math.min(devicePixelRatio || 1, 2)`) vira `1` fixo no modo baixo.
  - `render()`: a recomposição da camada "lembrada" do fog-of-war (`burnExploredMask`/`renderRememberedLayer`) — antes chamada todo frame — só roda a cada 4 frames no modo baixo (`rememberedFrameCounter % 4 === 0`); o `drawImage` que cola essa camada continua todo frame, só o recálculo caro é que é throttled.
  - Novo helper `glowFill()`: no modo alto, cria o `createRadialGradient` de sempre; no modo baixo, devolve um `rgba(...)` sólido (mesma cor, alpha reduzido). Aplicado aos 4 gradientes por-entidade identificados como mais frequentes (zumbi-bomba, brilho de zumbi especial, projétil de ácido, nuvem de gás) — o `drawFogOfWar` principal (mecânica de visão limitada, não decoração) não foi tocado, conforme a proposta.
  - Novo botão `#quality-toggle` (posição fixa, ao lado do botão de mudo do TODO-010).
- Não implementado nesta rodada (fora do essencial identificado na "Proposta técnica", registrado como desvio consciente): redução de duração/variedade de manchas de sangue, e detecção automática de FPS — o item já apontava a redução de partículas como item 4, secundário aos dois primeiros; e detecção automática como algo "opcional, mais arriscado". Deixados de fora para focar nos dois pontos que a proposta identificou como maior custo (camada lembrada + gradientes por entidade).

## Decisões tomadas
- Q1 do item (toggle manual vs. detecção automática por FPS): implementado o toggle manual, conforme a recomendação já registrada no item.
- Q2 do item (profiling em hardware fraco real antes de implementar): não disponível neste ambiente — a otimização foi guiada por leitura de código (identificando os pontos de maior custo por frame), não por medição real de FPS em dispositivo fraco, como o próprio item já previa como limitação.

## Evidências de teste
Testado via Docker isolado (`docker-up.sh todo-011`, `npm run check` ok) e navegador real:
- Botão alterna corretamente entre "GRÁFICOS: ALTO" e "GRÁFICOS: BAIXO" (confirmado nos dois sentidos), com o estado refletido no texto do botão.
- Partida real em dificuldade INSANO (mais zumbis, incluindo tipos com brilho colorido) com o modo baixo ativo: HUD, fog-of-war, sprites e o brilho simplificado dos zumbis renderizaram sem erro; jogador tomou dano de zumbi normalmente (vida caiu de 100 pra 16), confirmando que a simulação/jogabilidade não foi afetada pela mudança visual.
- Console do navegador sem erros, logs do servidor sem erros.

## Commits
- `e674c44` — feat: modo de qualidade gráfica reduzida (TODO-011)
