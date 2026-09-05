# TODO-013 — Zumbi Alfa como alvo secundário recompensado

**Status**: concluído

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu "um zumbi Alfa/elite que aparece de tempos em tempos, anunciado no HUD, com recompensa alta — dá objetivo além de atire em tudo, funciona em COOP e VERSUS". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- `ZOMBIE_TYPES` ([server.js:140-152](../server.js)) já tem variantes com atributos bem diferentes (ex. `tank`: `hp: 260`, `meleeDamage: 26`; `leaper`, `stretcher`, `screamer`, `gasser`, cada um com `special` próprio) e `pickWeightedZombieType()` (por volta da linha 157-163) sorteia por peso (`weight`) a cada spawn — a infraestrutura de "zumbi diferente do normal" já existe, só não há nenhum tipo marcado como "único"/rastreado especificamente pelo servidor ou anunciado ao cliente.
- `grantZombieKillReward()` (por volta da linha 660-671) já dá pontos/vida/munição/chance de item especial ao matar um zumbi, com `specialChance = (type && type.special) ? 1 : 0.12` — zumbis com `special` já garantem soltar item especial; um "zumbi Alfa" poderia reaproveitar esse mesmo caminho de recompensa, só com valores maiores.
- Não existe hoje nenhum conceito de "zumbi único ativo na sala" nem de anúncio dedicado no HUD além de `killfeed`/`announcement` (usados para "NOVA RODADA" e vencedor) — precisaria de um evento novo.
- `spawnZombie()`/`spawnBotsForRoom()` não têm noção de intervalo/temporizador próprio por zumbi individual, só o `scheduleZombieRespawn()` (repõe zumbis mortos) e o `advanceEvolution()` (ondas do modo insano) — nenhum dos dois é "spawna um zumbi específico a cada X segundos".

**Proposta técnica**:
- Adicionar um novo tipo de zumbi de alto risco/recompensa em `ZOMBIE_TYPES` (ex. `id: 'alpha'`, `weight: 0` — para nunca ser sorteado pelo spawn aleatório normal — com HP e dano bem acima do `tank`, e um multiplicador de pontos/recompensa próprio, ex. `scoreValue: 10` em vez do `+1` padrão de zumbi comum).
- Um temporizador por sala (`room.alphaSpawnAt`, similar ao padrão de `room.evolutionState`) dispara a cada N segundos (ex. 60-90s) desde que não haja um Alfa vivo (`room.alphaZombieId` rastreando se já existe um ativo) — ao disparar, `spawnZombie(room, { forceType: 'alpha' })` (pequeno ajuste em `spawnZombie` pra aceitar um tipo forçado em vez de sempre sortear por peso) e `io.to(room.id).emit('announcement', { title: 'ZUMBI ALFA DETECTADO', subtitle: 'Elimine para pontos extras' })`, reaproveitando o mesmo canal já usado pra "NOVA RODADA".
- Ao morrer, `killPlayer`/`applyDamage` (fluxo de morte de zumbi, [server.js:678-686](../server.js)) já limpa `room.zombies` e chama `grantZombieKillReward` — só precisa limpar também `room.alphaZombieId` pra liberar o próximo spawn do temporizador.
- Visualmente, o cliente pode reaproveitar o mesmo recurso do zumbi "bomba" (variante especial que já reusa o sprite do zumbi grande com um brilho por cima, conforme documentado em [CONTEXT.md](../CONTEXT.md), seção "Ajustes finos pós-rodada de subagentes") — dar ao Alfa uma tintura/brilho diferenciado (ex. dourado/vermelho) sem precisar de sprite novo dedicado, mesma lógica de reaproveitamento já usada no projeto.

**Riscos / decisões em aberto**:
1. Q1 - Qual intervalo de spawn faz sentido (60s? 90s?) e isso deve escalar com a dificuldade da sala (mais frequente no INSANO que no FÁCIL)?
2. Q2 - A recompensa do Alfa deve valer só para quem dá o golpe final (como já funciona hoje com zumbi comum), ou o jogo deve incentivar "focar fogo" em grupo dando alguma recompensa também a quem participou do combate mesmo sem dar o último golpe?
