# TODO-002 — Míssil deve mirar na direção da mira, não no alvo mais próximo do mapa

**Status**: concluído

**Pedido original**: "O míssil deve ser disparado para onde o personagem
está olhando (pra frente) e atingir o próximo algo que estiver naquela
direção."

**Situação atual**:
- O míssil já nasce com o ângulo da mira (`handleShot()` em
  [server.js](../server.js), branch `if (weapon.projectile)`: `angle: baseAngle`,
  onde `baseAngle` é o ângulo de mira do jogador) — o disparo em si já sai
  na direção certa.
- O problema é o **homing**: a cada tick, `updateRocket()` chama
  `findNearestEnemyForProjectile(room, proj)`
  ([server.js](../server.js), logo acima de `explodeRocket()`), que escolhe o
  zumbi/jogador **fisicamente mais perto da posição atual do projétil**,
  sem levar em conta se esse alvo está na direção pra onde o míssil foi
  disparado. Isso já vale desde o primeiro tick (o projétil nasce com
  `targetId: null`, então a primeira coisa que `updateRocket` faz é rodar
  essa busca "mais perto de qualquer direção").
- Resultado: um míssil disparado mirando num zumbi longe, à frente, pode
  curvar pra trás/lado se houver outro zumbi mais próximo do ponto de
  disparo — não é o comportamento "acerta o próximo algo naquela direção"
  pedido.
- `updateRocket` já tem uma curva suave (`lerpAngleServer`, taxa `3.2 rad/s`)
  em vez de grudar instantaneamente no alvo — essa parte do "sente-se como
  míssil perseguidor, não teleporte" está OK e deve ser mantida.

**Proposta técnica**:
1. Trocar a seleção de alvo por uma busca **direcional**, reaproveitando a
   função `rayCircle(originX, originY, dirX, dirY, centerX, centerY, radius,
   range)` que já existe em [server.js](../server.js) e é usada pelas armas
   hitscan — ela já calcula exatamente "está esse círculo à frente, dentro
   de um raio de tolerância, e a que distância ao longo do raio". Criar:
   ```js
   function findTargetInDirection(room, originX, originY, angle, range, excludeId) {
     const dirX = Math.cos(angle), dirY = Math.sin(angle);
     const lockRadius = 1.6; // "cone" de travamento — não precisa acertar em cheio
     let best = null, bestAlong = range;
     const pool = room.config.mode === 'versus'
       ? [...room.zombies.values(), ...[...room.players.values()].filter(p => p.id !== excludeId && p.alive)]
       : room.zombies.values();
     for (const candidate of pool) {
       const along = rayCircle(originX, originY, dirX, dirY, candidate.x, candidate.y, lockRadius, range);
       if (along !== null && along < bestAlong) { bestAlong = along; best = candidate; }
     }
     return best;
   }
   ```
   (o modo coop ignora jogadores como alvo, igual ao resto do código de
   fogo amigo já existente).
2. Usar essa função só na **seleção inicial** do alvo, no momento do disparo
   (dentro do branch `weapon.projectile` de `handleShot()`), gravando o
   resultado direto em `targetId` ao criar a entrada em `room.projectiles`.
3. Em `updateRocket()`, manter o comportamento de "se o alvo travado ainda
   está vivo, persegue ele" (já existe), mas trocar o fallback quando o alvo
   morre/some: em vez de `findNearestEnemyForProjectile` (busca global), usar
   de novo `findTargetInDirection`, agora a partir da posição **atual** do
   míssil e do seu ângulo **atual** de voo (não mais o ângulo de disparo
   original) — assim, se perder o alvo, ele recalcula "o que está na minha
   frente agora" em vez de puxar pra qualquer canto do mapa.
4. Se `findTargetInDirection` não achar nada (nem no disparo, nem depois),
   o míssil simplesmente voa reto no ângulo atual até bater em parede ou
   esgotar o alcance (`proj.range`) — vira um "dumbfire" nesse caso, o que
   já é o comportamento natural do loop de movimento de `updateRocket` quando
   `liveTarget` é `null` (ele só pula a parte de recalcular `desiredAngle`).
5. `findNearestEnemyForProjectile` pode ser removida depois que
   `findTargetInDirection` cobrir os dois usos (seleção inicial e
   reaquisição), pra não manter duas funções de escolha de alvo divergentes
   no arquivo.

**Riscos / decisões em aberto**:
1. Q1 - `lockRadius` (tolerância do "cone" de mira) de `1.6` unidades de
   mundo é um chute inicial — mira precisa demais frustra o jogador, mira
   frouxa demais volta a parecer "gruda em qualquer coisa perto da linha".
   Confirma esse valor ou prefere calibrar depois de jogar?
2. Q2 - Ao reaquisitar alvo em pleno voo (passo 3), o míssil pode
   "abandonar" um alvo que ainda está tecnicamente vivo mas saiu da frente
   dele, se o alvo original morrer exatamente nesse instante — comportamento
   aceitável e condizente com o pedido ("atinge o próximo algo naquela
   direção"), mas vale confirmar: tudo bem assim?
3. Q3 - Vale decidir se granada e outras mecânicas de mira "na direção"
   (nenhuma outra arma hoje é homing) deveriam usar essa mesma função no
   futuro, por consistência — fora do escopo deste item, só uma observação.
   Quer que isso vire outro TODO?
