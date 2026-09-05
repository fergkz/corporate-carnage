# Release notes — TODO-017

## O que foi feito
A tela de criação de sala ganhou um seletor "MAPA: ESCRITÓRIO / ESTACIONAMENTO". O mapa de garagem tem os mesmos objetivos/regras do escritório, mas com corredores retos e longos com pilares de cobertura pontual, em vez das salas compartimentadas.

## O que mudou em relação à versão anterior
- **Achado importante ao reconfirmar a situação atual (passo obrigatório antes de implementar)**: a proposta original deste item (escrita antes da "campanha por estágios" existir) previa uma refatoração grande — extrair `walls`/`props`/`ARENA` de constantes globais únicas pra algo por sala, porque "hoje não há como duas salas terem geometrias diferentes". Isso **já não é verdade**: essa mesma refatoração já foi feita por outra sessão em paralelo, criando `STAGES[]` (cada estágio da campanha já tem seu próprio `walls`/`props`/`arena`/`pickupSpawnPool`/`spawnPoints`). Não foi necessário fazer a refatoração de base prevista — só reaproveitar a que já existia.
- `server.js`:
  - Novo `GARAGE_STAGE`: `arena: 26`, 8 pilares (`1.6x1.6`) em grade, sem cubículos — corredores retos entre eles.
  - Novo `MAP_STAGE_SETS = { office: STAGES, garage: [GARAGE_STAGE, STAGES[1]] }` — a garagem reaproveita a mesma "Sala de Reunião — Confronto Final" do escritório como estágio 2, em vez de desenhar uma segunda arena de chefe do zero.
  - Nova função `stagesFor(room)`, que lê `room.config.map` — todas as 5 referências diretas a `STAGES[...]`/`STAGES.length` no arquivo foram trocadas por `stagesFor(room)[...]`/`stagesFor(room).length`.
  - `room.config.map` (`'office'` por padrão, aceito em `createRoom` e `updateRoomSettings`) — novo campo de config, mesmo padrão dos outros (`mode`, `difficulty`, etc.).
- `public/game.js`: novo `case 'pillar'` em `drawDynamicProp` (concreto simples com halo de luz pontual, mesma paleta das paredes) — os pilares da garagem reaproveitam esse desenho.
- `public/index.html`/`public/game.js`: novo grupo de opção "MAPA" na criação de sala, seguindo o mesmo padrão de `autoRotate`/demais eixos.

## Decisões tomadas
- Q1 do item (fazer a refatoração de base primeiro): não foi mais necessário — a base já existia (ver achado acima). Implementação ficou bem mais simples do que a proposta original previa.
- Q2 do item (tema "garagem/estacionamento" confirmado): mantido conforme sugerido — corredores retos e pilares, bom contraste com os corredores compartimentados do escritório.

## Evidências de teste
Testado via Docker isolado (`docker-up.sh todo-017`, `npm run check` ok) com um cliente `socket.io-client` real, sala criada com `map: 'garage'`, dificuldade INSANO:
- `welcome` confirmou `arena: 26`, 8 paredes de pilar (`1.6x1.6`) nas coordenadas certas, e os props incluindo `pillar` x8 + `sign`.
- Partida real: zumbi Alfa (TODO-013) funcionou normalmente no novo mapa; ao completar o objetivo do estágio 1, a transição pro estágio 2 ("Sala de Reunião — Confronto Final", compartilhado com o escritório, `arena: 16`) aconteceu sem erro; campanha terminou normalmente com "CAMPANHA CONCLUÍDA".
- Logs do servidor sem erros durante todo o teste (~2 minutos de partida ativa).

## Commits
- `218e210` — feat: mapa alternativo de garagem/estacionamento (TODO-017)
