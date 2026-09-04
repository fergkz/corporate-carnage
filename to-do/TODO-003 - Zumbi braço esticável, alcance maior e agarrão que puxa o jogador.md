# TODO-003 — Zumbi braço esticável: alcance maior e agarrão que puxa o jogador

**Status**: pendente

**Pedido original**: "O zumbi que estica deve ter um alcance um pouco maior
e, ao conseguir 'agarrar' o jogador, ele puxa o jogador para próximo de si
e dá dano."

**Situação atual**:
- O zumbi "braço esticável" (`stretcher`, tipo especial `stretch`) está
  definido em `ZOMBIE_TYPES` ([server.js:143](../server.js)):
  ```js
  { id: 'stretcher', weight: 6, hp: 70, speed: [1.35, 1.75], radius: 0.48,
    special: 'stretch', meleeDamage: 16, meleeRange: 2.6,
    windupMs: 550, strikeMs: 180, recoverMs: 650 }
  ```
  `meleeRange: 2.6` é o alcance atual do golpe — bem maior que o alcance
  melee normal (`1.15`), mas hoje é só um "soco à distância": acerta dano,
  não desloca ninguém.
- A máquina de estados do ataque é `runStretchLogic()`
  ([server.js:906-933](../server.js)): `idle → windup (550ms, zumbi para e
  encara o alvo) → strike (180ms, aplica dano se `distance <= meleeRange`
  no instante em que a fase começa) → recover (650ms) → idle`. Durante
  `windup`/`strike`/`recover` o zumbi **não se move** — é o gancho que dá a
  janela de esquiva (ver `updateZombies()`,
  [server.js:1007-1010](../server.js): enquanto `stretchPhase !== 'idle'`,
  o loop principal só chama `runStretchLogic` e `continue`, pulando
  qualquer movimento).
- O dano em si (`applyDamage(room, target, type.meleeDamage, null, false)`,
  [server.js:919](../server.js)) só aplica `damageHp` no alvo — não mexe na
  posição de ninguém. Não existe hoje nenhum "puxão"/deslocamento do
  jogador em direção ao zumbi.
- `moveWithCollision(entity, dx, dy, radius)` ([server.js](../server.js))
  já é genérica e já é usada tanto pra zumbis quanto pra jogadores (o loop
  principal de `update()` já move `player` com ela todo tick) — resolve
  colisão com paredes em cada eixo separadamente, então já "trava" sozinha
  se houver uma parede no caminho do puxão, sem precisar de nenhum tratamento
  extra.
- No cliente, o único feedback visual do ataque hoje é durante o `windup`:
  `drawStretchTelegraph()` ([public/game.js](../public/game.js)) desenha uma
  linha esticando/avermelhando na direção do alvo, só quando
  `entity.stretchPhase === 'windup'`. Nas fases `strike`/`recover` não tem
  nenhum efeito visual — o jogador só vê o dano/hp cair.
- A interpolação de posição no cliente (`interpolate()`,
  [public/game.js](../public/game.js), fator `dt * 12`) suaviza qualquer
  mudança de posição do jogador ao longo de alguns quadros — um
  deslocamento pontual e não muito grande vai renderizar como um "puxão"
  visível em vez de um teleporte seco, sem precisar de nenhuma animação
  nova no cliente.

**Pesquisa externa**:
- O análogo mais direto desse tipo de inimigo é o **Smoker** de *Left 4
  Dead* — puxa a vítima à distância com a língua. O padrão de design
  documentado é: o inimigo **fica imóvel** enquanto usa o alcance (mesmo
  princípio que o `stretcher` já tem no `windup`/`strike`/`recover`), o
  puxão **para automaticamente se bater num obstáculo** no caminho, e o
  principal contraplay é "atacar o inimigo antes/durante o puxão" — nosso
  jogo já cobre a parte de "antes" com o telegraph de `windup`; a parte de
  "obstáculo interrompe" já sai de graça reaproveitando `moveWithCollision`
  (ela já para sozinha numa parede).
  [The Smoker | Left 4 Dead Wiki](https://left4dead.fandom.com/wiki/The_Smoker)
- Material de design sobre telegraphing de ataques de "agarrão" (ex.:
  reclamações sobre o grab attack de *Lies of P* não ser claramente
  sinalizado) reforça que esse tipo de ataque **precisa** de uma pista
  visual inequívoca — o que já existe aqui (`drawStretchTelegraph`), mas
  vale considerar reforçar o feedback também no momento do acerto (não só
  no aviso), já que hoje o `strike`/`recover` não tem nenhum efeito
  próprio. [Enemy Attacks and Telegraphing](https://www.gamedeveloper.com/design/enemy-attacks-and-telegraphing)
- Conclusão prática pra proposta abaixo: manter o puxão como uma ação
  **instantânea** no momento do acerto (bate com o pedido — "ao conseguir
  agarrar, puxa e dá dano" descreve um evento único, não um cabo-de-guerra
  contínuo tipo Smoker) em vez de implementar um "canal" de puxão
  sustentado por vários ticks — isso é mais simples, mais barato, e já
  aproveita a suavização de `interpolate()` pra parecer um puxão em vez de
  um teleporte. Um "puxão sustentado, interrompível" fica registrado como
  alternativa mais elaborada em Riscos, caso o Fernando prefira depois.

**Proposta técnica**:
1. Aumentar `meleeRange` do tipo `stretcher` de `2.6` pra algo como `3.2`
   (~+23%, "um pouco maior" como pedido) em `ZOMBIE_TYPES`
   ([server.js:143](../server.js)).
2. Adicionar um novo campo ao tipo, `pullLandingDistance` (ex.: `1.0`) —
   a distância final entre zumbi e jogador depois do puxão (não um valor
   fixo de "quanto empurrar", pra o efeito ficar consistente não importa
   se o agarrão conectou na borda do alcance ou bem perto).
3. Em `runStretchLogic()`, no bloco da fase `strike`
   ([server.js:914-920](../server.js)), depois de confirmar
   `distance <= type.meleeRange` e aplicar o dano, puxar o alvo:
   ```js
   if (distance <= type.meleeRange) {
     applyDamage(room, target, type.meleeDamage, null, false);
     const pullTo = type.pullLandingDistance || 0;
     if (pullTo > 0 && distance > pullTo) {
       const angle = Math.atan2(zombie.y - target.y, zombie.x - target.x);
       const pullAmount = distance - pullTo;
       moveWithCollision(target, Math.cos(angle) * pullAmount, Math.sin(angle) * pullAmount, PLAYER_RADIUS);
     }
   }
   ```
   Não precisa de função nova nem de tratamento especial de parede —
   `moveWithCollision` já cuida disso (ver Situação atual).
4. Zumbis com `special !== 'stretch'` não são afetados — o `pullTo` só
   existe no tipo `stretcher`, então o `if` acima nunca dispara pros
   outros tipos (bomba, ácido, etc. já têm seus próprios ramos antes de
   chegar em `runStretchLogic`).
5. *(Opcional, reforça o feedback do acerto conforme a pesquisa de
   telegraphing acima, mas não é necessário pro pedido em si)*: no cliente,
   estender `drawStretchTelegraph()`/`drawZombies()`
   ([public/game.js](../public/game.js)) pra também desenhar algo (ex.: o
   braço "conectado", mais grosso/vermelho, por ~150ms) durante
   `stretchPhase === 'strike'`, não só durante `windup` — hoje o acerto em
   si não tem nenhum efeito visual próprio além do dano.

**Riscos / decisões em aberto**:
1. Q1 - Valores exatos (`meleeRange: 3.2`, `pullLandingDistance: 1.0`) são
   um ponto de partida a calibrar jogando — nem alcance nem força do
   puxão foram especificados com precisão no pedido. Confirma esses
   valores ou já quer outros?
2. Q2 - Com o alcance maior, vale considerar aumentar um pouco o
   `windupMs` (hoje 550ms) também, pra manter a telegraph justa — mais
   alcance sem mais aviso deixa o ataque mais forte "de graça". Aumenta
   o windup junto ou deixa 550ms mesmo?
3. Q3 - Alternativa mais elaborada (ver Pesquisa externa): em vez de
   puxão instantâneo no `strike`, implementar um puxão **sustentado** ao
   longo de vários ticks (como o Smoker de L4D), que para se o zumbi
   morrer ou perder o alvo no meio — daria uma janela de resgate ("mate o
   zumbi que agarrou seu aliado") em vez de ser inevitável uma vez
   conectado. Quer essa versão mais elaborada, ou o puxão instantâneo (a
   proposta padrão acima) já resolve?
4. Q4 - Não há hoje nenhum jeito do próprio jogador "se soltar" do
   agarrão (ex.: dano ao zumbi durante o puxão cancela) — decisão
   consciente de manter simples por enquanto. Quer algum contraplay assim
   já nesta v1, ou fica pra depois?
