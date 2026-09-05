# TODO-018 — Escalar área jogável pelo número de jogadores

**Status**: pendente

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu "hoje o mesmo mapa fixo serve tanto 2 quanto 8 jogadores; bloquear áreas (portas temporárias/portas trancadas) para partidas de 2 jogadores manteria densidade de encontro similar independente do headcount". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- O mapa (`walls`/`props`/`ARENA = 30`) é fixo e único (mesma limitação de constante global de módulo documentada no TODO-017) — `room.config.maxPlayers` (2, 4, 6 ou 8, conforme o preset `JOGADORES` em `public/index.html:132`) não influencia em nada o tamanho da área acessível, só o número de bots/zumbis via `npcCount`/`zombieBaseCount`.
- `spawnPoint()` ([server.js:257-267](../server.js)) sorteia entre 6 pontos fixos espalhados pelos cantos do mapa inteiro, independente de `maxPlayers` — numa sala de 2 jogadores, os dois podem nascer em extremos opostos do mapa de 60x60 unidades (ARENA=30, então o mundo vai de -30 a 30) e levar um tempo considerável só pra se encontrar.
- Este item depende da mesma base do TODO-017 (extrair mapa/paredes de constante global pra algo manipulável por sala) e do TODO-020 (portas trancáveis) — "bloquear área" na prática precisa de uma forma de fechar uma passagem que hoje não existe (o gap de porta é só um espaço vazio no array `walls`, não um objeto interativo).

**Proposta técnica**:
- Depois que o TODO-017 (mapa por sala) e/ou TODO-020 (portas trancáveis) estiverem implementados, definir 1-2 "linhas de corte" no mapa (ex. uma parede extra fechando o corredor central que liga a metade norte à metade sul) que, quando `room.config.maxPlayers <= 2`, entram ativas na lista de paredes da sala — reduzindo a área jogável à metade do mapa (a que tiver melhor distribuição de pickups/zumbis) só para partidas pequenas.
- Restringir também `spawnPoint()`: filtrar os 6 pontos fixos para só os que caem dentro da área ativa da sala (reaproveitando o mesmo `room.config.maxPlayers` já disponível na função, que hoje é uma função solta sem acesso a `room` — precisa passar `room` como parâmetro).
- Alternativa mais simples que não depende do TODO-017/020: em vez de literalmente bloquear área com parede, só restringir os `spawnPoint()`/pontos de pickup pra uma metade do mapa quando `maxPlayers` for baixo — os jogadores continuam podendo andar pelo mapa inteiro (nenhuma parede nova), mas a ação (zumbis, pickups, outros jogadores) fica concentrada numa área menor. Mais barato de implementar, resolve boa parte do problema de "correr demais sem encontrar ninguém" sem mexer em colisão nenhuma.
- Recomendo começar pela alternativa mais simples (restringir spawn/pickup a uma sub-área, sem parede nova) e só evoluir pra bloqueio físico de verdade se, jogando, ainda parecer que o mapa está grande demais pra 2 jogadores.

**Riscos / decisões em aberto**:
1. Q1 - Começar pela versão simples (restringir spawn/pickup a uma sub-área do mapa, sem parede nova) ou já ir para o bloqueio físico com parede temporária (que depende do TODO-017 e/ou TODO-020 estarem prontos antes)?
2. Q2 - Qual o corte de `maxPlayers` pra considerar "sala pequena" — só o preset "2", ou também "4"?
