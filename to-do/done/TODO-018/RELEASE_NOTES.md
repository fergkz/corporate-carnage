# Release notes — TODO-018

## O que foi feito
Salas configuradas para no máximo 2 jogadores agora sorteiam pontos de spawn e de pickup só entre os mais próximos do centro do mapa, em vez do conjunto inteiro (pensado para até 16 jogadores) — evita dois jogadores nascerem/correrem entre extremos opostos de um mapa grande demais para o tamanho da sala.

## O que mudou em relação à versão anterior
- Implementada a versão mais simples recomendada no item (Q1): só restringe **onde** jogadores/pickups aparecem, sem bloquear nenhuma área com parede nova — nenhuma dependência do TODO-017/020 foi necessária.
- `server.js`: nova função `limitedList(list, maxPlayers)` — se `maxPlayers > 2` (ou a lista já for pequena), devolve a lista original sem alteração; caso contrário, ordena os pontos por distância ao centro `(0,0)` e devolve só a metade mais próxima (arredondando pra cima, mínimo 2).
- `spawnPoint(room)` e `randomPickupPosition(room, exclude)` agora chamam `limitedList(...)` antes de sortear, em vez de usar `room.spawnPoints`/`room.pickupSpawnPool` diretamente.
- Generalizado por **distância ao centro** em vez de um raio fixo — funciona igual nos 3 estágios/2 mapas que já existem hoje (escritório, garagem, sala final), sem precisar de uma constante ajustada por mapa.

## Decisões tomadas
- Q1 do item: implementada a versão simples (sem bloqueio físico), conforme já recomendado no próprio item.
- Q2 do item (limite de "sala pequena"): fixado em `maxPlayers <= 2` (só o preset "2" da tela de criação) — não estendido pro preset "4", que já tem entre 3-4 ocupantes reais (bots + humanos) e não sofre tanto do problema original.

## Evidências de teste
Testado via Docker isolado (`docker-up.sh todo-018`, `npm run check` ok) com clientes `socket.io-client` reais, amostrando 20 spawns em salas `maxPlayers=2` e 20 em `maxPlayers=4`:
- Salas de 2 jogadores: distância do spawn ao centro do mapa variou entre 19,0 e 23,6 (média 20,36) — nunca alcançou os pontos mais distantes do conjunto original.
- Salas de 4 jogadores: distância variou entre 19,0 e 24,7 (média 22,58) — usando o conjunto completo de pontos de spawn, incluindo os mais distantes, confirmando que a restrição não afeta salas maiores.
- Logs do servidor sem erros durante o teste.

## Commits
- `5836b72` — feat: escala área de spawn/pickup pelo número de jogadores (TODO-018)
