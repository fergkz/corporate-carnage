# Release notes — TODO-022

## O que foi feito
Tentar entrar numa sala já cheia de jogadores humanos (sem bot pra substituir) não é mais recusado — o jogador entra numa fila de espectador e é promovido automaticamente a jogador de verdade assim que alguém sair.

## O que mudou em relação à versão anterior
- `server.js`:
  - Novo `room.spectators` (Map, por ordem de chegada).
  - `attemptJoin()`: quando a sala está cheia e não há bot pra substituir, em vez de `safeAck(ack, {ok:false, reason:'full'})`, chama a nova `joinAsSpectator()` — entra no socket.io room (recebe `lobbyUpdate`/broadcasts normalmente) sem entrar em `room.players`, e devolve `{ok:true, spectating:true, ...}`.
  - Nova `broadcastSpectatorQueue(room)`: emite `spectatorQueue {position, total}` individualmente pra cada espectador sempre que a fila muda.
  - `removePlayerFromRoom()`: no topo, se o socket que saiu era um espectador (não um jogador), só remove da fila e recalcula posições — não passa pelo resto da lógica de remoção de jogador (host, bots, etc). Na saída de um jogador de verdade, antes de spawnar um bot pra reabrir a vaga, agora verifica se há espectador na fila — se houver, promove o mais antigo (`joinRoomSocket`, mesmo caminho de entrada normal) e emite `promotedToPlayer`; só spawna bot se a fila estiver vazia.
- `public/game.js`: reaproveita a tela de lobby normal pra quem está na fila (já esconde os controles de host, já mostra "AGUARDANDO...") — só troca esse texto por "FILA DE ESPECTADOR: posição N de M" (`socket.on('spectatorQueue', ...)`) até a promoção (`socket.on('promotedToPlayer', ...)`, que já reaproveita o mesmo evento `welcome` reenviado pelo servidor pra sincronizar o cliente como jogador de verdade).

## Decisões tomadas
- Q1 do item (espectador vê a partida em andamento em tempo real antes da vez, ou só quando promovido): implementado o caminho mais simples — o espectador entra no socket.io room e recebe os mesmos broadcasts de lobby de todo mundo, mas a tela de "assistir a partida ao vivo" (câmera seguindo jogadores, reaproveitando a base do TODO-024) não foi conectada a este fluxo por escopo/tempo — o espectador vê a tela de lobby (com a fila) até ser promovido, não a partida em andamento se ela já tiver começado.

## Evidências de teste
Testado via Docker isolado (`docker-up.sh todo-022`, `npm run check` ok) com 3 clientes `socket.io-client` reais simulando 3 jogadores:
- Sala criada com `maxPlayers: 2`; 2º jogador entrou normalmente, preenchendo a sala com 2 humanos reais (0 bots).
- 3º jogador tentou entrar: recebido `{ok:true, spectating:true}` (não mais recusado) e o evento `spectatorQueue {position:1, total:1}`.
- Ao 2º jogador sair da sala (`leaveRoom`), o 3º jogador foi promovido automaticamente: recebeu um novo `welcome` (com `isHost:false`, correto) e o evento `promotedToPlayer`.
- Logs do servidor sem erros durante todo o teste.

## Commits
- `6695732` — feat: fila de espectador quando a sala está cheia (TODO-022)
