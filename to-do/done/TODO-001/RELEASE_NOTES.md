# Release notes — TODO-001

## O que foi feito
A munição continua sendo um pool universal único (`player.ammo`), mas
agora cada arma consome uma quantidade diferente por tiro (`ammoCost`) e o
HUD mostra "quantos tiros restam com a arma atual" (pool ÷ custo), não mais
o número cru do pool.

## O que mudou em relação à versão anterior
- `server.js` — tabela `weapons`: `shotgun.ammoCost` `2 → 3`,
  `rocket.ammoCost` `4 → 10` (pistola e rifle continuam `1`). Sem outra
  mudança no servidor: `handleShot()` já debitava `weapon.ammoCost` do pool
  compartilhado antes deste TODO, só os valores mudaram.
- `public/game.js` — nova constante `AMMO_COST` (espelha os valores do
  servidor, mesmo padrão já usado por `cooldowns`) e `updateHud()` passa a
  calcular `Math.floor((self.ammo ?? 0) / (AMMO_COST[currentWeapon] || 1))`
  em vez de mostrar `self.ammo` cru.
- Exemplo prático: 20 pontos de munição no pool agora mostram "20" na
  pistola/rifle, "6" na escopeta (`Math.floor(20/3)`), "2" no míssil
  (`20/10`) — bate com o exemplo do pedido original.

## Decisões tomadas
- Confirmados os valores de `ammoCost` propostos (`shotgun: 3`,
  `rocket: 10`) — primeira calibragem, não testada contra feedback real de
  jogo ainda.
- Aceito o comportamento de `Math.floor` mostrar "0" quando sobra munição
  insuficiente pra mais um tiro (consistente com a regra do servidor).
- **Não implementado**: pickups de munição virarem valores "redondos"
  pensando no míssil — fica registrado no item arquivado como possível
  ajuste futuro, não bloqueou este TODO.

## Evidências de teste
- `node --check server.js` e `node --input-type=module --check < public/game.js`: OK.
- `docker compose up -d --build` + `npm run check` dentro do container: OK,
  container `game` saudável.
- Servidor rodou uma sessão de teste prolongada (sala criada via navegador,
  partida iniciada, timer/pontuação avançando) sem nenhuma linha de erro
  nos logs do container (`docker compose logs game`, filtrado por
  error/throw/exception: vazio).
- **Limitação encontrada durante o teste**: a aba do navegador automatizado
  ficou com `document.hidden = true` nesta sessão, o que suspende o
  `requestAnimationFrame` do próprio jogo (loop de input/render do
  cliente) e bloqueia a captura de screenshot ("Browser pane não está
  sendo exibido"). Isso impediu confirmar visualmente, com print, o número
  exato de munição no HUD em tempo real dentro desta sessão — é uma
  limitação do ambiente de teste automatizado, não um erro observado no
  código. A lógica foi conferida por leitura direta do código-fonte já
  deployado no container (linha por linha, ver "O que mudou" acima) e não
  produziu nenhum erro de sintaxe ou runtime. Recomenda-se um spot-check
  visual manual rápido quando conveniente.

## Commits
- `76460ea` — feat: munição com peso por arma no HUD e fog of war com
  memória do cenário (implementação combinada com TODO-004, ver
  `to-do/done/TODO-004/RELEASE_NOTES.md`)
