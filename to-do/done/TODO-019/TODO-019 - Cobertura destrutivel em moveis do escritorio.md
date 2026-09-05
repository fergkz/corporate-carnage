# TODO-019 — Cobertura destrutível em móveis do escritório

**Status**: concluído

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu "mesas/plantas que podem ser derrubadas/quebradas por tiros de escopeta/explosão, criando variação dinâmica de linha de visão dentro da mesma sala". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- `props` ([server.js:64-101](../server.js)) é só decoração enviada ao cliente pra desenho (comentário na linha 63: "Apenas decoração enviada ao cliente para desenhar o escritório; não colide") — a colisão real de cada móvel relevante pra movimento vem de uma entrada **separada e nas mesmas coordenadas** dentro de `walls` (ex. os `desk` das linhas 66-77 têm par exato em `walls` nas linhas 29-39). Ou seja, hoje um "móvel" é dois registros paralelos (um decorativo, um de colisão) que precisam ficar sincronizados manualmente.
- `walls`/`props` são globais e compartilhados por todas as salas (mesmo achado do TODO-017/018) — nenhuma sala tem uma cópia própria que possa divergir da outra por causa de destruição.
- Não existe hoje nenhum conceito de "HP de objeto" nem de projétil/explosão afetando cenário — `applyDamage()` ([server.js:673-691](../server.js)) só aceita `target` como jogador ou zumbi (`isZombieTarget` booleano); granada (`GRENADE_RADIUS`/`GRENADE_DAMAGE`) e o zumbi-bomba já aplicam dano em área a jogadores/zumbis dentro do raio, mas nunca a props/paredes.

**Proposta técnica**:
- Pré-requisito arquitetural: assim como o TODO-017, isso só funciona bem com `walls`/`props` deixando de ser globais e passando a ser uma cópia por sala (`room.walls`/`room.props`, inicializada a partir do mapa base em `buildRoom()`) — sem isso, destruir uma mesa numa sala derrubaria a mesma mesa em todas as salas simultâneas do processo.
- Marcar um subconjunto de `props`/`walls` como destrutível (ex. `destructible: true, hp: 40` nos tipos `desk`/`plant`/`table`, não em paredes estruturais/divisórias) — ao sofrer dano de explosão (granada, zumbi-bomba) ou de escopeta num raio pequeno, reduzir esse HP; ao chegar a 0, remover a entrada correspondente de `room.walls` (abre a linha de visão/movimento) e marcar o prop equivalente em `room.props` com um estado `destroyed: true` pro cliente desenhar como destroços em vez do móvel intacto.
- Reaproveitar o padrão visual já usado para corpos/destroços (`corpse.png`/manchas de sangue, documentado em [CONTEXT.md](../CONTEXT.md) seção "Animações de morte e explosão") como referência de como desenhar um estado "quebrado" persistente sem precisar de asset novo dedicado pra cada móvel — pode ser um sprite genérico de destroços/madeira quebrada sobreposto, ou só um desenho simplificado "tombado".
- Escopo inicial pequeno e seguro: só mesas (`desk`/`table`) e plantas — não estender a paredes estruturais nem a móveis que hoje servem de referência espacial importante (ex. `server_rack`, `whiteboard`), pra não abrir buracos onde a IA de zumbi/spawn de pickup não espera.

**Riscos / decisões em aberto**:
1. Q1 - Este item depende da mesma extração de mapa-por-sala do TODO-017 — confirma que vale fazer essa refatoração de base primeiro (ela beneficia os dois itens), ou prefere uma versão mais limitada que funcione sem mexer na arquitetura global (ex.: destruição é só visual/client-side, sem remover a colisão de verdade — abre linha de visão aparente mas o jogador ainda não atravessa por ali)?
2. Q2 - Vale valer só pra escopeta/explosão (como sugerido) ou também pra rifle/pistola em dano acumulado (mais tiros = mesa quebra igual)?
