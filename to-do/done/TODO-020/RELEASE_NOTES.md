# Release notes — TODO-020

## O que foi feito
As duas entradas em L do escritório (Sala de Servidores e Copa) ganharam portas de verdade, trancáveis com a tecla `E` por proximidade — trancar bloqueia a passagem (jogadores e zumbis) como uma parede real.

## O que mudou em relação à versão anterior
- **Achado ao reconfirmar a situação atual**: a mesma refatoração de mapa-por-sala que faltava na proposta original (feita em paralelo pela campanha por estágios, e já corrigida no detalhe de cópia por sala durante o TODO-019) já dava a base necessária — não foi preciso nenhuma refatoração adicional de arquitetura.
- `server.js`:
  - Novo array `doors` em `STAGES[0]` (só o escritório tem portas): `porta-servidores` (`x:-2.8,y:9.8,w:0.5,h:6.4`) e `porta-copa` (`x:8,y:-2.9,w:6,h:0.5`) — coordenadas calculadas a partir da lacuna real entre as paredes existentes de cada sala.
  - `collides()` agora também bloqueia contra portas com `locked: true` (portas destrancadas não colidem, igual ao vão vazio de sempre) — como zumbis e jogadores já passam pelo mesmo `collides()`/`moveWithCollision()`, zumbis já respeitam portas trancadas de graça, sem código de IA novo.
  - `applyStage()`/`buildRoom()` copiam `room.doors` por sala (mesmo padrão de `walls`/`props`).
  - Novo handler `socket.on('toggleDoor', ...)`: acha a porta mais próxima do jogador (autoridade do servidor, não confia em id vindo do cliente), só age se estiver a até 2.2 unidades; alterna `locked` e emite `doorUpdate { id, locked }` pra sala inteira.
  - `welcome`/`stageChange` passaram a incluir `doors` no payload.
- `public/game.js`: nova `drawDoors()` (porta aberta quase invisível, trancada vermelha sólida, com dica "[E] TRANCAR/DESTRANCAR" quando o jogador está a menos de 2.2 unidades); tecla `E` emite `toggleDoor`; listener `doorUpdate` atualiza o estado local. Rodapé de comandos atualizado.

## Decisões tomadas
- Q1 do item (refatoração de base primeiro): não foi necessária — a base já existia (mesmo achado do TODO-019).
- Q2 do item (só as 2 portas existentes vs. adicionar novas): implementadas só as 2 já existentes (Servidores/Copa), conforme a opção mais simples do item.
- Simplificação não prevista na proposta original: portas trancadas bloqueiam **movimento**, mas não foram estendidas às funções de ray-casting de tiro/linha-de-visão de zumbi (que iteram `room.walls` diretamente) — um tiro ainda atravessa uma porta trancada. Documentado aqui como escopo reduzido consciente, dado o volume de trabalho restante nesta rodada.

## Evidências de teste
Testado via Docker isolado (`docker-up.sh todo-020`, `npm run check` ok) com um cliente `socket.io-client` real, jogando de verdade (movimento real via `input`, sem atalhos):
- `welcome` confirmou as 2 portas com `locked: false` por padrão.
- Jogador destrancado atravessou livremente a porta dos Servidores.
- Ao trancar a distância seguindo pro lado de dentro da sala, o jogador tentou voltar e ficou **fisicamente bloqueado** a ~0,84 unidades da porta por quase 5 segundos contínuos de tentativa de movimento — confirma colisão real, não só visual.
- Ao destrancar de novo, o movimento retomou imediatamente e o jogador fechou a distância restante na primeira leitura seguinte.
- Logs do servidor sem erros durante todo o teste.

## Commits
- `73c5a32` — feat: portas trancáveis nas entradas de Servidores e Copa (TODO-020)
