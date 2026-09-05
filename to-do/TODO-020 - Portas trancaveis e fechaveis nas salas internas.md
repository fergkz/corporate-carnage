# TODO-020 — Portas trancáveis e fecháveis nas salas internas

**Status**: pendente

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu "portas trancáveis/fecháveis — já existe o conceito de porta aberta fixa (Servidores/Copa); torná-la interativa cria tática real (trancar zumbi fora, ou rival fora)". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- As duas "portas" citadas no pedido são hoje só **lacunas fixas no array `walls`**, sem nenhum objeto de porta de verdade: a Sala de Servidores ([server.js:46-49](../server.js)) tem 3 paredes formando um "U" com abertura a leste, e a Copa ([server.js:51-54](../server.js)) tem 3 paredes com abertura ao sul — a "porta" é simplesmente onde a `walls` não tem segmento nenhum. Não há estado (aberta/fechada), nem objeto que o jogador possa interagir.
- `walls`/`props` são globais e compartilhados por todas as salas do processo (mesmo achado do TODO-017/019) — uma porta "fechada" precisaria adicionar um segmento de colisão que hoje não existe, e isso só pode ser feito com segurança se cada sala tiver sua própria cópia mutável do mapa (não a constante global compartilhada).
- Não existe hoje nenhuma tecla/ação de interação com o cenário — as únicas ações do jogador são movimento (WASD), mira (mouse), troca de item (`1`-`6`/scroll) e ataque/granada (clique/`G`). Uma porta interativa precisaria de uma tecla nova (ex. `E`) e um evento de socket novo (`interact`).

**Proposta técnica**:
- Pré-requisito: mesma extração de `room.walls`/`room.props` por sala do TODO-017/019 — sem isso, uma porta fechada por um jogador afetaria todas as salas simultâneas.
- Modelar cada porta como um objeto author explícito (não mais uma simples lacuna): `{ id, x, y, w, h, locked: false }` numa lista `room.doors`, posicionado exatamente no vão hoje vazio (leste da Sala de Servidores, sul da Copa). Quando `locked: true`, esse retângulo entra temporariamente na checagem de `collides()`/`moveWithCollision()` (que precisa passar a considerar `room.doors` filtradas por `locked`, além de `room.walls`); quando `locked: false`, o vão volta a ficar livre como hoje.
- Interação: jogador próximo de uma porta (raio pequeno, ex. 1.5 unidades) e tecla `E` alterna `locked` — evento de socket `toggleDoor` com o `id` da porta mais próxima (calculado no servidor, não confiando em coordenadas vindas do cliente, mesmo padrão de autoridade do servidor já usado em todo o resto do jogo).
- Zumbis devem respeitar portas trancadas na hora de decidir caminho/perseguição (mesma lógica de `zombieDirection`/desvio de obstáculos que já existe pra `walls` — precisa incluir `room.doors` travadas na mesma checagem).
- Cliente: `public/game.js` desenha a porta (aberta/fechada) como um prop simples com dois estados visuais, e mostra uma dica contextual (ex. "[E] destrancar porta") quando o jogador estiver perto o suficiente, reaproveitando o padrão de toast já usado em `showToast()`.

**Riscos / decisões em aberto**:
1. Q1 - Este item também depende da extração de mapa-por-sala (mesmo pré-requisito do TODO-017/019) — as três mudanças de mapa que dependem disso (mapa alternativo, cobertura destrutível, portas) podem ser feitas na mesma refatoração de base, mas cada uma continua sendo implementada/testada como um TODO separado depois. Confirma essa ordem (refatoração de base primeiro, depois os três itens em sequência)?
2. Q2 - Só as duas portas já existentes (Servidores/Copa) ou vale adicionar portas novas em outros pontos do mapa como parte deste item?
