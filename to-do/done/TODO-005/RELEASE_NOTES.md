# Release notes — TODO-005

## O que foi feito
Substituída a tela de criação de sala (10 campos manuais) por 5 grupos de opções clicáveis — visibilidade, modo, jogadores, condição de fim (com sub-seleção de duração) e dificuldade — e ajustado o lobby pra nunca revelar a presença de bots, com preenchimento automático de vagas vazias, substituição bot↔jogador real, início manual da partida e link de sala com botão de copiar.

## O que mudou em relação à versão anterior
- **`public/index.html`**: `#createRoom` perdeu os campos `room-name`, `room-max`, `opt-zombiemode`, `zombie-count`, `npc-count`, `opt-npcdiff` e `score-limit`; ganhou `#opt-players` (2/4/6/8), `#opt-duration` (5/10/15 min, dentro de `#duration-row`) e `#opt-difficulty` (Fácil/Normal/Difícil/Insano). `#lobby` trocou o `<span>` de código da sala por um `<input readonly id="lobby-link">` com a URL completa ao lado do botão "COPIAR LINK". Nova regra CSS `.player-row.open` centraliza a linha de vaga vazia.
- **`public/game.js`**: `roomConfig`/`DEFAULT_ROOM_CONFIG` passam a guardar `players`/`duration`/`difficulty` em vez de `zombieSpawnMode`/`npcDifficulty` isolados; nova função `updateDurationVisibility()` esconde `#duration-row` quando o modo é `battleRoyale`; `applySettingsToForm` e o payload de `#room-create-submit` foram reescritos pros novos eixos; `renderLobby` renderiza qualquer vaga com `isBot` como uma linha centralizada "aguardando jogador" (sem nome, sem tag, sem numeração) e passou a popular `#lobby-link` em vez de `#lobby-room-code`; `renderRoomList` troca `ZOMBIE_MODE_LABEL` por `DIFFICULTY_LABEL`.
- **`server.js`**: nova constante `DIFFICULTY_PRESETS` (easy/normal/hard/insane → `zombieSpawnMode`+`zombieBaseCount`+`npcDifficulty`) usada em `buildRoom` e `updateRoomSettings`; `MATCH_SECONDS` fixo (180s) virou `room.config.matchDurationSeconds` configurável (300-900s, default 600s) usado em `resetMatch`; `room.config.npcCount` passa a ser sempre `maxPlayers - 1` na criação; `room.config.scoreLimit` passa a ser automático (`VERSUS_SCORE_LIMIT = 30` no modo Versus, `0` no Coop) em vez de campo manual; `attemptJoin` agora remove um bot pra abrir vaga quando a sala está cheia só de bots, em vez de rejeitar como `full`; `removePlayerFromRoom` agora repõe um bot (`spawnSingleBot`) quando um humano sai e a sala ainda está em `lobby` com vaga aberta; `serializeRoomForList` expõe `difficulty` em vez de `zombieSpawnMode`. Removidas a função `sanitizeRoomName` (sem uso, campo de nome não existe mais) e `syncBotsToConfig` (sua lógica foi inlined em `updateRoomSettings`, único chamador).
- Sem mudança de comportamento na simulação de zumbis/combate/física — só nos parâmetros de configuração da sala e no fluxo de lobby.

## Decisões tomadas
- Q1 (presets de dificuldade): usar os valores propostos como ponto de partida — fácil: `fixed`/8 zumbis/bots `low`; normal: `constant`/14/`standard`; difícil: `constant`/22/`standard`; insano: `evolution`/18/`high`.
- Q2 (jogador sai antes da partida começar): um bot reaparece pra manter a sala cheia, simétrico ao caso de entrada.
- Q3 (pontuação limite): Versus ganha `scoreLimit` automático de 30 pontos como critério extra de vitória; Coop fica em 0 (só tempo/eliminação).
- Q4 (duração padrão "por tempo"): 10 minutos, substituindo os 3 minutos fixos anteriores (válido pra toda sala nova).

## Evidências de teste
Testado de ponta a ponta via Docker (`docker-up.sh`) + navegador real, contra o servidor rodando (não mock):
- `npm run check` passou limpo (`node --check server.js` + `node --input-type=module --check public/game.js`).
- Criação de sala privada (4 jogadores, dificuldade normal, 10 min): lobby mostrou 3 vagas como "aguardando jogador" (sem nenhuma menção a bot) + o host, e o link `http://localhost:<porta>/?room=BMVQU` populado no campo de copiar.
- Um segundo jogador real entrando pela URL do link assumiu uma vaga (virou de 3 "aguardando jogador" pra 2 + "Segundo Jogador"), confirmado em tempo real nas duas abas via `lobbyUpdate`.
- Cenário do Q2: em sala nova (AR5ZG), um jogador entrou (3→2 vagas abertas) e depois saiu antes do início — a vaga voltou a aparecer como "aguardando jogador" (2→3), confirmando a reposição automática de bot.
- Clique em "INICIAR PARTIDA" iniciou a partida sem nenhuma contagem regressiva prévia; o timer do HUD mostrou `10:00` (default) e, depois de editar a sala via "AJUSTAR CONFIGURAÇÕES" pra duração de 5 min + modo Versus + dificuldade Insano, o timer mostrou `05:00` na rodada seguinte — confirmando que a duração configurável chega ao `matchEndsAt` real.
- "AJUSTAR CONFIGURAÇÕES" reabriu o formulário com os valores reais da sala pré-marcados (`opt-mode=coop, opt-players=4, opt-duration=10, opt-difficulty=normal` antes da edição; `opt-mode=versus, opt-duration=5, opt-difficulty=insane` depois de salvar), confirmando o round-trip do `updateRoomSettings`.
- A lista de salas públicas (`#public-rooms`) mostrou `"Sala de Host2" — 4/4 · VERSUS · POR TEMPO · INSANO`, confirmando o nome auto-gerado (sem campo manual) e o novo rótulo de dificuldade substituindo o antigo modo de zumbi.
- Mostrar/esconder `#duration-row` testado nas duas direções (`respawn`→`block`, `battleRoyale`→`none`, volta pra `respawn`→`block`).
- Console do navegador (3 abas) e logs do servidor sem nenhum erro durante toda a sessão de teste.

## Commits
- `c0035f3` — feat: simplifica criação de sala com presets clicáveis (TODO-005)
