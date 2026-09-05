# TODO-021 — Evento ambiental de apagão ou alarme

**Status**: pendente

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu "um evento ambiental: alavanca de apagão que reduz o raio de visão de todo mundo por alguns segundos, ou alarme que atrai zumbis pra um ponto — dá ferramenta tática além de atirar". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- `visionRadius` (cliente, usado em `drawFogOfWar`) já é uma variável que muda dinamicamente hoje só em função de `self.visionBoostUntil` (o especial de visão): `visionRadius = (self.visionBoostUntil > Date.now()) ? BOOSTED_VISION : BASE_VISION` ([public/game.js:1312](../public/game.js)) — o mecanismo de "raio de visão temporário diferente do padrão" já existe e pode ser reaproveitado por um evento global em vez de um pickup individual.
- `room.hazards` ([server.js](../server.js), usado por `spawnGasCloud()` linha 1227-1229 e o laço de aplicação de dano por volta da linha 1233-1238) já é um Map por sala de zonas com efeito por tempo — é o padrão mais próximo de "evento temporário afetando a sala inteira", mas hoje só aplica dano de área, não afeta visão nem atrai zumbis.
- Não existe hoje nenhum objeto interativo no cenário (alavanca, botão) nem estado de "evento ativo na sala" — a única coisa parecida é o pickup especial `aggro`, que já força **todos os zumbis a perseguir o rival vivo mais próximo de quem coletou, por 5s** (documentado em [CONTEXT.md](../CONTEXT.md), seção "Ajustes finos pós-rodada de subagentes") — ou seja, o "alarme que atrai zumbis" já existe como mecânica individual (`aggro`), só não como evento ambiental de mapa/alavanca.

**Proposta técnica**:
- **Apagão** (novo): um objeto de mapa fixo (ex. `{ id: 'breaker', x, y }` num painel elétrico, reaproveitando o mesmo padrão de interação por proximidade+tecla proposto no TODO-020 pra portas) que, ao ser ativado, seta `room.blackoutUntil = Date.now() + N segundos` — o snapshot já enviado ao cliente carrega isso, e o cliente troca `BASE_VISION` por um raio bem menor (reaproveitando exatamente o mesmo mecanismo condicional já usado pra `visionBoostUntil`, só que reduzindo em vez de aumentar, e afetando todo mundo na sala, não só quem ativou).
- **Alarme** (reaproveitar mecânica existente em vez de criar do zero): em vez de um efeito totalmente novo, um segundo objeto de mapa fixo que, ao ser ativado, aplica o mesmo efeito do especial `aggro` (força zumbis a perseguir o jogador vivo mais próximo de quem ativou) só que a um ponto fixo do mapa (a posição do próprio alarme) em vez de "do jogador que coletou" — atrai zumbis pra lá, não pro ativador, criando uma isca tática real (bom pra separar zumbis do resto do grupo).
- Ambos os eventos precisam de cooldown por sala (evitar ativação repetida instantânea) e de feedback sonoro/visual claro (reaproveitando `announcement`/`killfeed` já existentes) pra os outros jogadores saberem que o evento foi ativado, já que afeta todo mundo, não só quem ativou.

**Riscos / decisões em aberto**:
1. Q1 - Confirma implementar os dois eventos (apagão + alarme) neste mesmo item, ou prefere separar em dois TODOs distintos já que são mecânicas independentes?
2. Q2 - Onde no mapa esses dois objetos interativos deveriam ficar — um por sala interna (ex. apagão na Sala de Servidores, alarme na Copa) ou em posições novas dedicadas?
