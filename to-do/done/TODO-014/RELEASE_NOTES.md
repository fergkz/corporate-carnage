# Release notes — TODO-014

## O que foi feito
Uma sala pode ser criada com "ENTRE RODADAS: REVEZAR MODO" — a cada nova rodada confirmada (todos os jogadores clicando "PRÓXIMA PARTIDA"), o modo/estilo de vida da sala muda sozinho, alternando Coop → Versus (Respawn) → Versus (Battle Royale) → Coop → ..., sem o host precisar reabrir "Ajustar Configurações".

## O que mudou em relação à versão anterior
- `server.js`:
  - Nova constante `AUTO_ROTATE_PRESETS` (sequência fixa de 3 presets).
  - Novo campo `room.config.autoRotate` (default `false`, aceito na criação da sala e em `updateRoomSettings`) e `room.roundIndex` (contador de rodadas).
  - Nova função `applyModeAndLifeMode(room, mode, lifeMode)`, extraída da lógica que já existia em `updateRoomSettings` — agora reaproveitada tanto ali quanto na rotação, sem duplicar a normalização de `mode`/`lifeMode`/`scoreLimit`.
  - `socket.on('readyNext', ...)`: quando todos confirmam e `room.config.autoRotate` está ativo, incrementa `room.roundIndex` e aplica o próximo preset da sequência **antes** de chamar `startMatch(room)`. A primeira partida da sala (via "INICIAR PARTIDA" no lobby) não é afetada — só rodadas seguintes dentro da mesma sala.
- `public/index.html`: novo grupo de opção "ENTRE RODADAS" (MANTER MODO / REVEZAR MODO) na tela de criação de sala.
- `public/game.js`: `roomConfig.autoRotate`, `setupOptGroup('#opt-autorotate', ...)`, incluído no payload de `createRoom`/`updateRoomSettings`, e refletido de volta em `applySettingsToForm` (pra "AJUSTAR CONFIGURAÇÕES" mostrar o estado atual corretamente).

## Decisões tomadas
- Q1 do item (sequência fixa vs. escolhida pelo host): implementada a sequência fixa sugerida na proposta (Coop → Versus/Respawn → Versus/Battle Royale) — só liga/desliga, sem UI pra escolher quais entram. Mais simples pro escopo do item; customização fica como possível incremento futuro.
- Q2 do item (preview do próximo preset antes de começar): não implementado — o jogador vê o novo modo já refletido normalmente (HUD/labels) assim que a rodada começa. Prever o próximo preset **antes** do fim da rodada atual ficaria como polimento futuro; o núcleo do pedido (rotação sem reconfigurar) já funciona sem essa camada extra.

## Evidências de teste
Testado via Docker isolado (`docker-up.sh todo-014`, `npm run check` ok) com um cliente `socket.io-client` real, sala criada com `autoRotate: true`, modo inicial `coop`, dificuldade INSANO (bots com IA que atacam zumbis, pra completar a campanha sem intervenção manual):
- 1ª rodada: terminou via **"CAMPANHA CONCLUÍDA"** (`campaignComplete: true`), sem `kills` de PvP registrados (consistente com COOP) — confirma que a rodada inicial não foi afetada pela rotação.
- Após `readyNext`, a 2ª rodada começou automaticamente (evento `matchStarted`) e terminou de forma **completamente diferente**: **"VIPER NPC VENCEU"** com `campaignComplete: false` e `kills` de PvP > 0 pela primeira vez (6, 2, 0) — assinatura inequívoca do modo VERSUS com `scoreLimit` ativo (o próximo preset da sequência), confirmando que a rotação automática de fato trocou o modo da sala entre rodadas sem nenhuma ação do host.
- Logs do servidor sem erros durante os ~5 minutos de teste (campanha completa + segunda rodada).

## Commits
- `66d6204` — feat: rotação automática de preset entre partidas (TODO-014)
