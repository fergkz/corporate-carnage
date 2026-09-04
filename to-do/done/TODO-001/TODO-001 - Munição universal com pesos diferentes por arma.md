# TODO-001 — Munição universal com pesos diferentes por arma

**Status**: concluído

**Pedido original**: "As munições devem ser universais, mas devem aparecer
uma quantidade diferente de munição em cada arma. Por exemplo: eu pego um
loot de 20 munições. Na pistola, aparece 20, na escopeta aparece 7, no
míssil aparece 2, no rifle 20 e assim por diante. Para termos pesos
diferentes, entende?"

**Situação atual**:
- A munição já é um pool único (`player.ammo`, um número, não mais um objeto
  por arma) desde a última leva de mudanças — [server.js](../server.js) em
  `makePlayer()`/`resetPlayer()` (`ammo: 0`), consumida em `handleShot()`
  (`player.ammo -= cost`, onde `cost = weapon.ammoCost`).
- Cada arma já tem um `ammoCost` diferente na tabela `weapons`
  ([server.js:100-108](../server.js)):
  ```js
  pistol:  { ..., ammoCost: 1 },
  rifle:   { ..., ammoCost: 1 },
  shotgun: { ..., ammoCost: 2 },
  rocket:  { ..., ammoCost: 4 },
  ```
- **O que falta**: o HUD do cliente ([public/game.js](../public/game.js),
  função `updateHud()`) mostra sempre o número cru do pool
  (`self.ammo`), igual pra qualquer arma selecionada. Não existe hoje a
  conversão "quantos tiros eu ainda dou com a arma atual" — que é
  exatamente o que o pedido descreve (mesmos 20 pontos de munição "viram"
  20 tiros de pistola, mas só ~7 de escopeta, ~2 de míssil).

**Proposta técnica**:
1. Rebalancear os `ammoCost` pra refletir os pesos do exemplo dado
   (pistola/rifle mais baratos, escopeta intermediária, míssil caro):
   - `pistol: 1`, `rifle: 1` (sem mudança)
   - `shotgun`: subir de `2` pra algo como `3` (20/3 ≈ 6-7 tiros, bate com o
     "aparece 7" do exemplo)
   - `rocket`: subir de `4` pra algo como `10` (20/10 = 2 tiros, bate exatamente
     com o "aparece 2" do exemplo)
2. Espelhar essa tabela de custos no cliente (mesmo padrão já usado pra
   `cooldowns` em `public/game.js`, que replica os cooldowns do servidor só
   pra gating otimista) — um `const AMMO_COST = { pistol:1, rifle:1,
   shotgun:3, rocket:10 }`.
3. Trocar a linha do HUD em `updateHud()`:
   ```js
   // hoje:
   ui.ammo.textContent = ... : String(self.ammo ?? 0);
   // depois:
   const cost = AMMO_COST[currentWeapon] || 1;
   ui.ammo.textContent = ... : String(Math.floor((self.ammo ?? 0) / cost));
   ```
4. Nenhuma mudança no servidor além do rebalanceamento dos `ammoCost` —
   `handleShot()` já debita o custo certo do pool compartilhado a cada tiro,
   então o "número de tiros restantes" mostrado no HUD é só uma conta de
   divisão em cima do mesmo estado que já existe.

**Riscos / decisões em aberto**:
1. Q3 - Vale considerar se o pickup de munição deveria virar sempre um
   valor "redondo" pensando no míssil (ex.: múltiplos de 10) pra não
   sobrar troco invisível no pool — decisão de balanceamento, não é bug.
   **Não implementado nesta rodada** (pickups continuam com os valores
   antigos, ex. 18/30/8) — fica pra um ajuste futuro se incomodar na
   prática.

_Q1 e Q2 foram resolvidas na implementação: `ammoCost` ficou `shotgun: 3` /
`rocket: 10` como proposto (Q1), e o comportamento de `Math.floor` descrito
em Q2 foi aceito como está (mostra "0" quando a munição sobrando não dá pra
mais um tiro, mesmo que o pool não esteja zerado)._
