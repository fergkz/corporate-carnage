# TODO-015 — Cantos chanfrados para quebrar a geometria reta do mapa

**Status**: concluído

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu "quebrar a monotonia dos ângulos retos — hoje quase todo corredor/sala é um retângulo alinhado a eixo; cantos chanfrados criam ângulos de tiro diferentes e visual menos grid". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- `walls` ([server.js:24-61](../server.js)) é hoje inteiramente composto de retângulos alinhados aos eixos X/Y (`{ x, y, w, h }`), e `collides()` ([server.js:242-248](../server.js)) só sabe testar colisão contra caixas alinhadas aos eixos (`x > wall.x - wall.w/2 - radius && ...`) — não existe suporte a geometria rotacionada/diagonal na colisão.
- `props` ([server.js:64-101](../server.js)) tem um campo `rot` usado só para decidir a orientação do desenho no cliente (ex. `{ type: 'desk', x: -15, y: -6, rot: 0 }`), mas isso é puramente visual — a colisão real de cada móvel vem de uma entrada separada em `walls` nas mesmas coordenadas, sempre como caixa reta.
- `public/game.js` desenha paredes com `drawWalls()`/formas específicas por tipo de prop em `drawProps()` (por volta da linha 630) — também assume retângulos.
- Um "chanfro" de verdade (corte diagonal de 45°) exigiria colisão poligonal, que não existe hoje em nenhuma das duas pontas (servidor e cliente) — implementar isso do zero é uma mudança estrutural grande pra um ganho puramente estético.

**Proposta técnica**:
- Em vez de colisão poligonal real, simular o efeito visual/tático de um canto chanfrado com **duas ou três caixas retas pequenas em degrau** substituindo o canto reto de 90° (técnica comum em jogos 2D com colisão AABB) — ex. no canto de uma sala, trocar uma única parede em L por duas paredes menores formando um "degrau" de 2-3 segmentos que se aproxima visualmente de uma diagonal quando vista de longe/em movimento, sem exigir nenhuma mudança em `collides()`/`moveWithCollision()`.
- Escolher 2-3 cantos do mapa atual com boa visibilidade e tráfego (ex. entrada da recepção central, esquinas dos corredores nordeste/sudoeste perto de Copa/Servidores) pra aplicar esse tratamento primeiro, em vez de reescrever o mapa inteiro de uma vez — mudança incremental e testável.
- Ajustar `drawWalls()`/`drawProps()` no cliente pra desenhar esse conjunto de segmentos com uma textura/sombreado contínuo (em vez de parecer literalmente "paredes em escada"), fechando a lacuna entre a colisão em degrau e a leitura visual de canto chanfrado.
- Alternativa mais simples ainda, se o objetivo for só "menos grid" visualmente sem mexer em colisão: manter a colisão reta como está e só variar a decoração/textura do chão e das quinas (sombra diagonal desenhada por cima) — resolve a percepção visual sem tocar em gameplay/colisão nenhuma. Recomendo começar por essa opção mais barata e avaliar se já resolve a sensação de "tudo quadrado" antes de partir para o degrau de colisão.

**Riscos / decisões em aberto**:
1. Q1 - Prefere começar pela opção só-visual (sombra/textura diagonal sem mexer em colisão) ou já ir direto para o degrau de colisão em 2-3 cantos escolhidos? A primeira é bem mais barata e reversível.
2. Q2 - Se for pelo degrau de colisão, quais cantos específicos do mapa valem a pena (posso sugerir 2-3 candidatos por tráfego observado no playtest, mas a escolha final de "onde" é estética/de gameplay).
