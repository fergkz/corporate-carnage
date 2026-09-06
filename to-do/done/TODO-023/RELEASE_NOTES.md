# Release notes — TODO-023

## O que foi feito
Em modo Coop com `lifeMode: 'respawn'`, morrer não respawna mais
instantaneamente após 2,2s: o jogador entra num estado "caído"
(`downedUntil`, 18s de janela) — visível no chão, incapacitado — que pode
ser antecipado por um aliado vivo (humano ou bot) que fique parado perto
(`REVIVE_RANGE`, 1,8 unidades) por 3s de canalização. O revive restaura o
aliado com vida parcial (50, não cheia) para preservar o risco da morte.
Se ninguém reanimar dentro da janela, cai no respawn automático de sempre
(rede de segurança). Modo Versus e Coop+Battle Royale continuam
exatamente como antes (respawn fixo de 2,2s ou permadeath, sem estado de
caído).

## O que mudou em relação à versão anterior
- `server.js`:
  - Novas constantes `DOWNED_TIMEOUT_MS` (18000), `REVIVE_CHANNEL_MS`
    (3000), `REVIVE_RANGE` (1.8), `REVIVE_HP` (50).
  - `makePlayer()`/`resetPlayer()`: novos campos `downedUntil`,
    `reviverId`, `reviveStartedAt` (zerados em todo respawn/revive).
  - `killPlayer()`: quando `room.config.mode === 'coop' && room.config.lifeMode === 'respawn'`,
    marca o alvo como caído (`downedUntil`) em vez de agendar o respawn
    fixo de 2,2s; agenda o respawn de segurança pro fim da janela (só
    dispara se o jogador continuar `!alive` até lá, ou seja, se não foi
    reanimado antes). Fora dessa combinação de modo/lifeMode, comportamento
    idêntico ao anterior.
  - Nova `updateReviveChannels(room, now)`, chamada no tick só quando
    `room.config.mode === 'coop'`: procura, pra cada jogador caído dentro
    da janela, um aliado vivo e pronto a `REVIVE_RANGE` ou menos; inicia/
    reinicia a canalização (`reviveStartedAt`) quando o aliado muda ou sai
    de alcance, e completa o revive (via `resetPlayer` + `hp = REVIVE_HP`)
    quando a canalização atinge `REVIVE_CHANNEL_MS`. Emite `killfeed` tanto
    ao cair ("derrubou ... — reanime-o!") quanto ao reanimar ("reanimou").
- `public/game.js`:
  - `interpolate()` agora propaga `downedUntil`/`reviverId`/
    `reviveStartedAt` do snapshot pras entidades locais.
  - Nova `drawDownedPlayers()` (chamada em `render()`, entre
    `drawCorpses()` e `drawPlayers()`): desenha o corpo estático do
    jogador caído enquanto `downedUntil` não expirou (sem o fade de
    4,2s do efeito decorativo `corpses[]`) e uma barra de progresso verde
    sobre ele quando há canalização de revive em andamento.
  - `updateHud()`: reaproveita o `#spectator-banner` (já usado pelo modo
    espectador de Battle Royale) pra mostrar "CAÍDO — AGUARDANDO
    RESGATE..." ao próprio jogador caído, e a mesma classe `spectating`
    do HUD esconde vida/arma nesse estado.

## Decisões tomadas
- Q1 (janela caído / tempo de canalização): usados os valores sugeridos
  na proposta — 18s de janela caído, 3s de canalização.
- Q2 (vida no revive): parcial (50), não cheia, mantendo o risco da morte
  conforme sugerido.
- Revive não exige o aliado literalmente parado (zero input) — a
  aproximação contínua dentro de `REVIVE_RANGE` já é a ação de "canalizar"
  (mais simples e robusto em rede do que exigir input zerado, sem
  precisar de um novo evento de socket ou botão dedicado).
- Bots também podem reanimar (não há distinção humano/bot em
  `updateReviveChannels`) — é o mesmo aliado de equipe que a proposta
  original menciona genericamente.
- O jogador reanimado é teleportado pro spawn point (via `resetPlayer`,
  igual ao respawn automático) em vez de ficar no lugar onde caiu — decisão
  explícita da proposta original ("`resetPlayer` chamado antes do
  timeout"), não uma simplificação minha.

## Evidências de teste
- Testado via Docker (`docker-up.sh todo023`) + dois clientes
  `socket.io-client` reais (não mockados):
  - **Cenário revive em Coop**: sala Coop/respawn 2 jogadores, Alice
    provocada a andar contra o zumbi mais próximo até morrer; confirmado
    `downedUntil` setado no futuro. Bob então navegado (com detecção de
    "preso na parede" + esquiva perpendicular) até a posição de morte de
    Alice, ficou parado por ~3s: Alice foi reanimada com `hp === 50`,
    `downedUntil === 0`, e o killfeed emitiu "Bob reanimou Alice". Guard
    explícito garantindo que não foi a rede de segurança quem respawnou
    (checagem de que `downedUntil` ainda não tinha expirado quando Bob
    chegou).
  - **Cenário Versus inalterado**: sala Versus/respawn, Alice provocada a
    morrer; confirmado `downedUntil` nunca setado (`0`/falsy) e respawn
    automático ocorreu em ~2209ms com `hp === 100` (vida cheia), igual ao
    comportamento anterior à mudança.
  - Logs do container Docker limpos durante os dois testes (sem
    exceptions/erros).
- Verificação visual real via navegador (`mcp__Claude_Browser__*`): sala
  Coop solo criada e partida iniciada; após o jogador cair, inspecionado
  via `javascript_tool` o DOM ao vivo — confirmado `#hud` ganhando a
  classe `spectating` e `#spectator-banner` exibindo exatamente "CAÍDO —
  AGUARDANDO RESGATE...", alternando de volta ao normal quando o jogador
  foi reanimado/respawnado. Não foi verificado visualmente o desenho da
  barra de progresso de canalização em si (`drawDownedPlayers`) por ser
  renderização em canvas de curta duração (3s) — coberta indiretamente
  pela suíte de protocolo acima, que confirma que o servidor emite os
  campos corretos (`reviverId`/`reviveStartedAt`) consumidos por ela.
- `node --check` limpo em `server.js` e `public/game.js`.

## Commits
- `797197f` — feat: revive de aliado caído no modo Coop (TODO-023)
