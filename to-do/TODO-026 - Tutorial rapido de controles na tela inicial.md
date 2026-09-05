# TODO-026 — Tutorial rápido de controles na tela inicial

**Status**: pendente

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu "um tutorial de 5-10s opcional na primeira tela — os comandos já aparecem discretos no rodapé, mas coisas como a tecla G de granada rápida ou o slot do míssil (5) são fáceis de passar batido pra quem nunca jogou". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- A única referência de controles hoje é uma linha discreta fixa no rodapé da tela de jogo: `WASD MOVER · MOUSE MIRAR · SCROLL/1–6 TROCAR ITEM · CLIQUE ATACAR/LANÇAR · G GRANADA RÁPIDA · ESC SAIR` (visto no HUD durante o playtest, gerado a partir de `public/index.html`) — aparece **durante a partida**, não na tela inicial, e é pequena/permanente, fácil de ignorar quando a ação já começou.
- A tela inicial (`#start`/tela de "Codinome" + criar/entrar em sala) não tem nenhuma menção a controles — quem nunca jogou só descobre "G é granada" ou "5 é míssil" se ler o rodapé durante o jogo (quando já está sob pressão de zumbis) ou por tentativa e erro.
- Não existe hoje nenhum estado de "primeira visita"/tutorial já visto — não há uso de `localStorage` para lembrar preferências do jogador (confirmado por busca no arquivo).

**Proposta técnica**:
- Adicionar um pequeno painel/modal opcional na tela inicial (antes de criar/entrar em sala), com os controles já listados no rodapé formatados de forma mais legível (ícones de tecla + descrição curta), fechável com um botão "Entendi" ou clicando fora — sem bloquear o fluxo de quem já conhece o jogo (dispensável com um clique, não uma tela obrigatória).
- Persistir "já visto" em `localStorage` (ex. `localStorage.setItem('cc_tutorial_seen', '1')`) pra não mostrar de novo a cada visita — mas manter um pequeno link/botão "Ver controles" sempre acessível na tela inicial pra quem quiser reabrir de propósito.
- Focar o conteúdo do tutorial nos pontos menos óbvios citados no pedido (granada rápida `G`, slot de míssil `5`, granada no slot `6`) em vez de repetir tudo que já está intuitivo (WASD/mouse) — um tutorial longo demais tem o efeito oposto do pretendido (ninguém lê).
- Não depende de nenhuma mudança de servidor — é inteiramente client-side, em `public/index.html`/`public/game.js`.

**Riscos / decisões em aberto**:
1. Q1 - O conteúdo deve ser só texto/ícones estáticos (mais rápido de implementar) ou uma pequena animação/GIF mostrando cada ação (mais claro, mais trabalho de produção)? Recomendo começar pelo estático dado o prazo do evento.
