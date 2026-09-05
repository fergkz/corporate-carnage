# TODO-009 — Feedback de arma sem munição ao atirar ou trocar

**Status**: pendente

**Pedido original**: já listado como próxima evolução no [CONTEXT.md](../CONTEXT.md) ("Criar feedback de arma sem munição") antes mesmo deste playtest; reforçado no relatório de playtest que o assistente entregou a Fernando, que pediu para transformar esse achado (e os outros do mesmo relatório) em itens de backlog.

**Situação atual**:
- `handleShot()` ([server.js:693-702](../server.js)) é o único ponto que valida munição: `const cost = weapon.ammoCost || 0; if (!weapon.melee && player.ammo < cost) return;` (linhas 698-699) — quando não há munição suficiente, a função simplesmente retorna, **sem emitir nenhum evento** (o `io.to(room.id).emit('shot', ...)` só acontece depois, mais adiante na função, então nunca é disparado nesse caso). O cliente não recebe nenhum sinal de que o disparo foi recusado.
- No cliente, `attemptShoot()` ([public/game.js:1282-1288](../public/game.js)) só verifica cooldown local (`cooldowns[currentWeapon]`) antes de emitir `socket.emit('fire', ...)` — não existe nenhuma checagem de munição no cliente, então o jogador não recebe feedback nem otimista (client-side) nem via confirmação do servidor.
- `updateHud()` ([public/game.js:1319](../public/game.js)) já calcula e exibe a munição atual (`ui.ammo.textContent = ... String(Math.floor((self.ammo ?? 0) / (AMMO_COST[currentWeapon] || 1)))`), então o número "0" já aparece na tela quando a arma fica sem munição — mas não há nenhum destaque visual, sonoro ou mensagem quando o jogador tenta atirar mesmo assim.
- Trocar para uma arma sem munição também não é bloqueado nem sinalizado: `activateSlot()` (referenciado em `updateHud`, linha 1314) troca de arma livremente independente da munição restante — o jogador só percebe que está "sem munição" ao tentar atirar e nada acontecer.

**Proposta técnica**:
- **No cliente** (feedback imediato, sem esperar round-trip do servidor): em `attemptShoot()` ([public/game.js:1282](../public/game.js)), antes de emitir `fire`, checar `selfState.ammo` contra `AMMO_COST[currentWeapon]` (mesma tabela já usada em `updateHud`). Se insuficiente: não emitir o evento, disparar um retorno visual curto (ex. reaproveitar o padrão já existente de `ui.damage` — um flash rápido de opacidade — só que num elemento dedicado tipo `ui.ammoEmpty`, ou piscar `ui.ammo` em vermelho por ~150ms) e tocar um som de "clique vazio" (ver TODO-010, que já está adicionando efeitos sonoros e pode incluir esse "empty click" no mesmo pacote).
- **No servidor** (garantir consistência mesmo se o cliente estiver desatualizado ou for outro tipo de cliente no futuro): em `handleShot()` ([server.js:699](../server.js)), em vez de só `return`, emitir um evento dedicado só para o socket que tentou atirar, ex. `socket.emit('weaponEmpty', { weapon: data.weapon })`, e o cliente escuta esse evento (mesmo padrão dos outros `socket.on(...)` já existentes em `public/game.js`, como `killfeed`/`pickup`) para disparar o mesmo feedback visual/sonoro do item acima — cobre o caso de dessincronia entre o `ammo` local e o real do servidor.
- Recomendo implementar as duas pontas: o feedback client-side responde instantaneamente (sem esperar rede), e o evento do servidor garante que o feedback aconteça mesmo quando a predição do cliente estiver desatualizada (ex. um pickup de munição coletado por outro jogador, ou uma race condition perto do momento exato em que a munição chega a zero).
- Trocar de arma sem munição continuar sendo permitido (o jogador pode querer trocar para reservar itens ou fugir com outra arma na mão) — não é necessário bloquear a troca, só o feedback ao tentar atirar já resolve a confusão relatada.

**Riscos / decisões em aberto**:
1. Q1 - O feedback visual deve ser só um flash no contador de munição, ou também vale um ícone/texto temporário tipo "SEM MUNIÇÃO" perto da mira, para ficar mais visível durante o combate?
