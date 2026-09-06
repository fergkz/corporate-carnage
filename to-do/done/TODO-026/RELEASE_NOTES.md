# Release notes — TODO-026

## O que foi feito
A tela inicial ganhou um modal opcional "GUIA RÁPIDO / COMO JOGAR" com os
controles do jogo formatados como lista de "tecla + descrição curta",
priorizando os pontos menos óbvios citados no pedido original (granada
rápida `G`, slot do míssil `5`, granada no slot `6`) sem deixar de
mencionar o básico (WASD/mouse/scroll/clique). Aparece sozinho na
primeira visita, fecha com um clique no botão "ENTENDI" ou clicando fora
do painel, e lembra que já foi visto via `localStorage` pra não repetir
nas próximas vezes — mas um botão "VER CONTROLES" fica sempre disponível
na tela inicial pra quem quiser reabrir de propósito.

## O que mudou em relação à versão anterior
- `public/index.html`:
  - Novo `#tutorial-modal` (mesmo padrão visual de `.start-card` já usado
    em `#landing`/`#roundend`), com duas variantes de conteúdo internas —
    `#tutorial-keyboard` e `#tutorial-touch` — e um botão `#tutorial-close`
    ("ENTENDI").
  - Novo botão `#tutorial-open` ("VER CONTROLES") dentro do
    `.start-card` da tela inicial, abaixo do resumo `.controls` já
    existente.
  - CSS novo: `.tut-row`/`.tut-key`/`.tut-desc` (linhas com um "key cap"
    estilizado + descrição) e `#tutorial-modal { display:none }` /
    `.show { display:grid }`, com `z-index:25` (acima do `#landing`,
    `z-index:20`, pra aparecer por cima dele).
- `public/game.js`:
  - Ao carregar, escolhe qual das duas variantes de conteúdo mostrar
    (`tutorialKeyboard`/`tutorialTouch`) reaproveitando a mesma
    `isTouchDevice` já calculada pelo TODO-025 — sem duplicar a
    detecção.
  - `showTutorial()`/`closeTutorial()`: abrir só alterna a classe
    `.show`; fechar também grava `localStorage.setItem('cc_tutorial_seen', '1')`
    (com `try/catch` pra não quebrar em navegação privada onde
    `localStorage` pode lançar).
  - Ao iniciar, lê `localStorage.getItem('cc_tutorial_seen')` — se
    ausente/diferente de `'1'`, chama `showTutorial()` automaticamente.
  - Clique no botão "VER CONTROLES" sempre chama `showTutorial()`,
    independente do que está salvo.
  - Clique no fundo do modal (fora do `.start-card`) fecha, comparando
    `event.target === tutorialModal`.

## Decisões tomadas
- Q1: conteúdo estático (texto + "key caps" estilizados via CSS), sem
  animação/GIF — conforme recomendado, dado o prazo do evento.
- Escopo do conteúdo: focado nos itens menos óbvios (G, 5, 6) mas sem
  omitir totalmente o básico (WASD/mouse/scroll), pra servir tanto quem
  nunca jogou quanto quem só quer confirmar o atalho da granada rápida —
  evitando o efeito "tutorial longo demais que ninguém lê" citado na
  proposta.
- Adicionado, além do que a proposta original pedia: uma segunda
  variante de conteúdo pra dispositivos touch. Isso não estava na
  proposta original (escrita antes do TODO-025 existir), mas como o
  TODO-025 foi implementado antes deste na mesma leva de "implemente
  tudo", um tutorial que só descrevesse teclado ficaria incorreto pra
  quem joga em celular — corrigido adaptando o conteúdo automaticamente
  em vez de ignorar a mudança de contexto.

## Evidências de teste
- `node --check public/game.js` limpo.
- Testado via Docker + `mcp__Claude_Browser__*`, viewport desktop e
  mobile (375×812):
  - Confirmado por captura de tela que o modal aparece sozinho na
    primeira visita, com o conteúdo de teclado formatado corretamente.
  - Confirmado via JS que clicar "ENTENDI" fecha o modal
    (`classList` perde `show`) e grava `localStorage.cc_tutorial_seen = '1'`.
  - **Recarregada a página** (nova navegação, não só re-render) e
    confirmado que o modal não reaparece sozinho — a persistência via
    `localStorage` realmente sobrevive a um reload, não só ao estado em
    memória da sessão.
  - Confirmado que "VER CONTROLES" reabre o modal mesmo com
    `cc_tutorial_seen` já gravado.
  - Confirmado que clicar no fundo do modal (fora do `.start-card`)
    fecha, exercitando o listener de "clique fora".
  - Limpo `localStorage` e trocado pra viewport mobile (que ativa
    `isTouchDevice`): confirmado por captura de tela que a variante de
    conteúdo touch (stick esquerdo/direito, toque nos ícones) é exibida
    em vez da de teclado, dentro do limite de largura de 375px.
  - Console do navegador e logs do container Docker limpos durante os
    testes, sem erros.

## Commits
- `7f97621` — feat: tutorial rápido de controles na tela inicial (TODO-026)
