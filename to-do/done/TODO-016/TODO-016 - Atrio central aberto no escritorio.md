# TODO-016 — Átrio central aberto no escritório

**Status**: concluído

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu "um espaço central mais aberto (tipo átrio), em contraste com o mapa atual que é bem compartimentado — cria uma zona boa pra rifle/míssil de longo alcance, opondo aos corredores estreitos que já favorecem faca/escopeta". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- O centro do mapa hoje é ocupado pela recepção (`{ type: 'reception', x: 0, y: 0, w: 6.6, h: 5.2 }`, com colisão equivalente em `walls` na linha 37: `{ x: 0, y: 0, w: 6.6, h: 5.2 }`) — um bloco sólido, não uma área atravessável, cercado de divisórias extras nas linhas 56-60 (`{ x: -6, y: -7.6, ... }` etc.) que já servem pra "partir a linha de visão" no salão aberto ao redor.
- O restante do mapa é dividido em pods menores conectados por corredores: alas leste/oeste com mesas (linhas 66-77), sala de servidores a sudoeste (linhas 46-49, porta única a leste), Copa a nordeste (linhas 51-54, porta única ao sul), sala de reunião ao norte (linha 40, mesa nas linhas 87-88). Não há hoje nenhuma área grande e vazia — mesmo o "salão aberto" ao redor da recepção é cortado por divisórias.
- `ZOMBIE_SIGHT_RANGE = 11` ([server.js:130](../server.js)) limita o alcance de percepção de zumbis, e o alcance das armas de longo alcance já é bem maior (`rifle.range = 38`, `rocket.range = 24`, [server.js:106-110](../server.js)) — ou seja, as armas de longo alcance já têm alcance nominal suficiente pra um espaço aberto maior; hoje elas simplesmente não têm onde "esticar as pernas" porque o mapa não tem nenhum corredor/salão com mais de ~10-15 unidades de linha reta sem obstrução.

**Proposta técnica**:
- Substituir o bloco sólido da recepção central (ou uma área adjacente a ela, pra não descartar o visual já estabelecido de "recepção da Helix Dynamics") por um espaço mais amplo sem parede central — remover a colisão da linha 37 e redesenhar o prop de recepção como um balcão menor nas bordas do espaço em vez de um bloco central sólido, mantendo só 2-4 pilares finos (colisões pequenas, ex. `{ w: 0.8, h: 0.8 }`) espalhados pelo átrio pra dar cobertura pontual sem quebrar a abertura geral.
- Redimensionar/remover parte das divisórias extras das linhas 56-60 (hoje pensadas pra cortar linha de visão num salão que vai deixar de existir do jeito atual) — ou reposicioná-las nas bordas do novo átrio, não no meio dele.
- Testar a nova área com um confronto rifle/míssil real (dois jogadores em lados opostos do átrio) pra confirmar que o espaço aberto realmente favorece essas armas sem virar um "matadouro" sem chance de cobertura nenhuma — os 2-4 pilares finos sugeridos acima cumprem esse papel.
- Atualizar `public/game.js` (`drawFloor`/`drawWalls`/`drawProps`) pra refletir a nova geometria — como a recepção hoje é desenhada como um bloco decorado (ver `drawProps`, tipo `'reception'`), essa função precisa de ajuste pra desenhar o balcão menor nas bordas em vez do bloco central.

**Riscos / decisões em aberto**:
1. Q1 - Confirma sacrificar o bloco central da recepção (visual já estabelecido) pra abrir o átrio, ou prefere abrir esse espaço em outra área do mapa (ex. expandindo o "salão aberto" existente ao redor, sem mexer na recepção)?
2. Q2 - Quantos pilares/coberturas pontuais dentro do átrio parecem razoáveis pra não virar um espaço "sem chance de esconderijo" — a proposta sugere 2-4, mas é uma escolha de balanceamento que só se confirma jogando.
