# Release notes — TODO-013

## O que foi feito
Um "Zumbi Alfa" nasce periodicamente em cada sala (a cada 75s, desde que nenhum outro esteja vivo), anunciado no HUD, com 480 de vida e recompensa de 10 pontos ao ser eliminado — bem mais que o 1 ponto de um zumbi comum.

## O que mudou em relação à versão anterior
- Ao reconfirmar a situação atual do código (passo obrigatório antes de implementar), constatei que a infraestrutura de "spawnar um tipo específico de zumbi sob demanda" **já existia** — criada pela campanha por estágios pra spawnar o zumbi-tanque da luta final (`spawnZombie(room, { forceTypeId })`). Reaproveitei exatamente esse mecanismo em vez de criar um novo, como a proposta original já antecipava ("pequeno ajuste em spawnZombie pra aceitar um tipo forçado").
- `server.js`:
  - Novo tipo em `ZOMBIE_TYPES`: `alpha` (`weight: 0`, nunca sorteado por `pickZombieType()`; `hp: 480`, `meleeDamage: 24`, `scoreValue: 10`).
  - Nova constante `ALPHA_SPAWN_INTERVAL_MS = 75000`.
  - Novo campo por sala `room.alphaZombieId`/`room.alphaSpawnAt`, inicializados em `buildRoom()` e resetados em `applyStage()` a cada novo estágio (mesmo padrão do `finalWaveAnnounced` do TODO-012).
  - Nova função `updateAlphaSpawn(room, now)`, chamada no laço principal (`update()`): spawna o Alfa quando o temporizador vence e não há nenhum vivo, anuncia "ZUMBI ALFA DETECTADO", reagenda o próximo spawn.
  - `applyDamage()`: ao matar um zumbi, a pontuação usa `type?.scoreValue || 1` em vez de sempre `+1`; e limpa `room.alphaZombieId` se o morto for o Alfa atual — cobre qualquer fonte de dano (tiro, faca, granada, míssil, lâminas), já que todas passam por essa função.
- `public/game.js`: `alpha` adicionado a `ZOMBIE_TYPE_META` (reaproveita o sprite do tanque, `size: 1.7`) e a `ZOMBIE_GLOW` (brilho dourado `255,215,0`) — reaproveitando o mesmo padrão visual já usado pros outros zumbis especiais "sem sprite dedicado" (screamer/crawler/armored/leaper/gasser).

## Decisões tomadas
- Q1 do item (intervalo de spawn e escala por dificuldade): fixado em 75s para todas as dificuldades, sem escala — simplificação consciente pra manter o escopo controlado; ajustar por dificuldade fica como possível incremento futuro.
- Q2 do item (recompensa só pro golpe final vs. participação em grupo): implementado só recompensa pro golpe final, mesmo padrão já usado por todo o resto do jogo pra zumbis comuns — consistente, sem lógica nova de "dano compartilhado".

## Evidências de teste
Testado via Docker isolado (`docker-up.sh todo-013`, `npm run check` ok) com um cliente `socket.io-client` real jogando de verdade (sala COOP, dificuldade INSANO pra ter bots com IA que também atacam zumbis, perseguindo e atacando o Alfa com a faca):
- "ZUMBI ALFA DETECTADO" anunciado exatamente uma vez.
- O Alfa apareceu no snapshot, foi perseguido e engajado em combate real, e eventualmente foi eliminado (sumiu do snapshot).
- Placar final mostrou o jogador de teste com pontuação compatível com ter recebido o bônus de 10 pontos do Alfa somado a zumbis comuns.
- Logs do servidor sem erros durante todo o teste (~90s de partida ativa).

## Commits
- `d375367` — feat: zumbi Alfa como alvo secundário recompensado (TODO-013)
