# TODO-017 — Mapa alternativo de garagem/estacionamento

**Status**: concluído

**Pedido original**: no brainstorm de melhorias pós-playtest, o assistente sugeriu "um mapa alternativo pra variar o evento (ex. garagem/estacionamento, pilares em vez de cubículos), mesmas regras, cenário diferente, bom pra não cansar visualmente num dia inteiro de partidas". Fernando pediu para implementar tudo o que foi sugerido no brainstorm.

**Situação atual**:
- **Achado estrutural importante**: `walls`, `props` e `ARENA` são hoje constantes **de módulo, globais e compartilhadas por todas as salas do processo** ([server.js:20](../server.js), [server.js:24](../server.js), [server.js:64](../server.js)) — não existe "mapa por sala". `collides()` (linha 244) e `moveWithCollision()` (linha 250) fecham sobre a constante `walls` diretamente; o payload `welcome` envia os mesmos `walls`/`props`/`arena` globais pra todo cliente que entra em qualquer sala (linha 444: `id: socket.id, walls, props, arena: ARENA, ...`); e há mais duas leituras diretas de `walls` no restante do arquivo (ray casting de tiro por volta da linha 725, e checagem de linha de visão de zumbi por volta da linha 842).
- Isso significa que "mapa alternativo" **não é só desenhar um layout novo** — é uma mudança de arquitetura: hoje literalmente não há como duas salas simultâneas terem geometrias diferentes, porque todo o servidor assume um único mapa fixo compartilhado.
- `buildRoom()` ([server.js:386-431](../server.js)) já guarda um `room.config` por sala (modo, dificuldade, etc.) — o padrão de "cada sala tem sua config" já existe e é o lugar natural pra guardar também qual mapa a sala usa.

**Proposta técnica**:
- Extrair `walls`/`props`/`ARENA` (e os pontos de `spawnPoint()`/`PICKUP_SPAWN_POOL`, que também assumem o layout atual) para um objeto de "definição de mapa" nomeado (ex. `MAPS = { office: { walls, props, arena, spawnPoints, pickupSpawnPool }, garage: { ... } }`), e adicionar `room.mapId` em `buildRoom()` (escolhido na criação da sala, um novo eixo de preset ao lado de modo/dificuldade/etc., default `'office'` pra não quebrar salas existentes).
- Trocar as 5 leituras diretas de `walls`/`props`/`ARENA` identificadas acima para ler do mapa da sala em questão: `collides()`/`moveWithCollision()` passam a receber o mapa como parâmetro (ou uma referência de sala), o `welcome` envia `MAPS[room.mapId].walls/props/arena`, e as duas leituras de ray casting/linha-de-visão fazem o mesmo.
- Só depois dessa extração (que já vale por si só, mesmo sem o segundo mapa, porque corrige a limitação estrutural) desenhar o layout de garagem: pilares circulares (simulados como caixas quadradas pequenas bem espaçadas, já que a colisão é só AABB — mesma limitação identificada no TODO-015 de cantos chanfrados), vagas de estacionamento como referência visual (sem colisão, só decoração como os `props` puramente visuais de hoje), corredores mais retos e longos que o escritório atual (bom pra escopeta/faca em confronto direto, conforme o pedido original).
- Ícone/preview do mapa na tela de criação de sala (novo `opt-group` ao lado de "DIFICULDADE", reaproveitando `setupOptGroup()` já existente em `public/game.js`).

**Riscos / decisões em aberto**:
1. Q1 - Este item é bem maior do que os outros de mapa (015/016/018/019/020) porque exige primeiro uma refatoração estrutural (extrair o mapa de constantes globais pra config por sala) antes de desenhar qualquer coisa nova — confirma que vale fazer essa refatoração agora, ou prefere adiar o "mapa alternativo" e primeiro aplicar as mudanças de geometria mais pontuais (chanfro, átrio, cobertura destrutível) direto no mapa único atual?
2. Q2 - Se for adiante, o tema "garagem/estacionamento" está confirmado, ou prefere outro cenário pra variar (ex. andar superior do mesmo prédio, telhado)?
