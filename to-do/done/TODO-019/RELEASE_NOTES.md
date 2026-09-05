# Release notes — TODO-019

## O que foi feito
Duas mesas emparelhadas do escritório (uma na ala oeste, uma na ala leste) agora quebram de verdade com explosão (granada, míssil ou zumbi-bomba) — a colisão é removida do servidor (abre linha de visão/movimento pra valer, não só visualmente) e a decoração some do lado do cliente com um efeito de estilhaço.

## O que mudou em relação à versão anterior
- **Achado importante ao reconfirmar a situação atual**: a proposta original previa uma refatoração grande (`room.walls`/`room.props` deixarem de ser globais compartilhados) como pré-requisito. Essa refatoração **já existia**, feita pela campanha por estágios em paralelo — só faltava um detalhe: `applyStage()` atribuía `room.walls = stage.walls` (a mesma referência do array do `STAGES` compartilhado, não uma cópia). Sem corrigir isso, destruir uma mesa nesta sala destruiria a mesma mesa em **toda sala futura** que usasse aquele estágio — corrigido copiando os arrays (`stage.walls.map((w) => ({...w}))`) em `applyStage`.
- `server.js`:
  - `desk-oeste`/`desk-leste`: as duas entradas de parede correspondentes em `STAGES[0].walls` ganharam `id`, `destructible: true, hp: 40`; os props de mesa correspondentes (2 cada, mesas emparelhadas) ganharam o mesmo `id`.
  - Nova função `damageDestructiblesNear(room, x, y, radius)`: para cada parede destrutível dentro do raio, desconta `GRENADE_DAMAGE`; ao chegar a 0, remove a parede de `room.walls` e todos os props com o mesmo `id` de `room.props`, emitindo `propDestroyed { id, x, y }`.
  - Chamada nos 3 pontos que já emitem o evento `grenade` (granada de jogador, zumbi-bomba, impacto de míssil) — cobre "escopeta/explosão" reduzido só a explosão (ver decisão abaixo).
- `public/game.js`: novo listener `propDestroyed` — remove o prop de `world.props` e toca um efeito de explosão pequeno (reaproveitando `explosions`/`playSfx('explosion')` já existentes).

## Decisões tomadas
- Q1 do item (fazer a refatoração de base primeiro): não foi necessário fazer a refatoração inteira — só corrigir o detalhe de cópia por sala que faltava (ver achado acima).
- Q2 do item (valer só pra escopeta/explosão vs. também dano acumulado de rifle/pistola): implementado **só explosão** (granada/míssil/zumbi-bomba) — reduz escopo em relação à pergunta original (que também cogitava escopeta), evitando ter que rastrear dano por-tiro em várias armas diferentes pra um recurso decorativo; explosão já cobre o caso de uso principal (abrir linha de visão de forma dramática).

## Evidências de teste
Testado via Docker isolado (`docker-up.sh todo-019`, `npm run check` ok) com um cliente `socket.io-client` real, ponta a ponta:
- Jogador tentou andar até o centro exato da mesa `desk-oeste` e ficou bloqueado a 1,25 unidades de distância (colisão ativa).
- Coletou uma granada de verdade (pickup no mapa) e jogou nela a curta distância.
- Evento `propDestroyed` recebido com `id: "desk-oeste"` e coordenadas corretas.
- Jogador andou até o mesmo ponto de novo e desta vez chegou a 0,16 unidades do centro — confirma que a colisão foi removida de verdade no servidor, não só escondida visualmente.
- Logs do servidor sem erros durante o teste.

## Commits
- `98a422f` — feat: cobertura destrutível em mesas do escritório (TODO-019)
