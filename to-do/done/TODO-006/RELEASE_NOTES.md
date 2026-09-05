# Release notes — TODO-006

## O que foi feito
A lista de salas públicas (`SALAS PÚBLICAS`, tela inicial) agora mostra o número real de jogadores humanos na sala, não mais o total de ocupantes (humanos + bots que preenchem vagas vazias).

## O que mudou em relação à versão anterior
- `server.js`, `serializeRoomForList()`: `playerCount` deixou de ser `room.players.size` (conta bots e humanos juntos) e passou a ser `[...room.players.values()].filter((p) => !p.isBot).length` (só humanos).
- Nenhuma outra lógica mudou — `room.players.size` continua sendo usado normalmente em todo o resto do jogo (simulação, colisões, substituição de bot ao entrar).
- Implementação seguiu exatamente a proposta do item, sem desvios.

## Decisões tomadas
- Q1 do item (indicador extra tipo "+3 bots" na listagem) não foi implementado nesta rodada — optei pela correção mínima (só a contagem de humanos) primeiro, por recomendação já registrada no próprio item.

## Evidências de teste
Testado via Docker isolado (`docker-up.sh todo-006`, `npm run check` ok) e navegador real, duas abas simulando dois jogadores:
- Sala criada por "Verificador" (host) apareceu na lista pública como **"1/4"** com só o host dentro (antes desta correção, mostraria "4/4" mesmo com só 1 humano).
- Após "Segundo" entrar pela lista pública, a mesma sala passou a mostrar **"2/4"** em tempo real, confirmando a contagem dinâmica de humanos.
- Logs do servidor (`docker compose logs game`) sem erros durante o teste.

## Commits
- `14e275f` — fix: lista de salas públicas conta só jogadores humanos (TODO-006)
