# Release notes — TODO-015

## O que foi feito
Seis cantos de alto tráfego do mapa (os 4 do bloco central da recepção, mais as duas entradas em L de Servidores/Copa) ganharam uma sombra triangular decorativa sugerindo um corte de 45°, quebrando um pouco a leitura "tudo quadrado" do escritório.

## O que mudou em relação à versão anterior
- Implementada a opção **mais barata** recomendada no item (Q1): só decoração client-side, sem tocar em colisão — `collides()` no servidor continua exatamente igual, ainda só suporta caixas retas (AABB); nenhum comportamento de jogabilidade muda.
- `public/game.js`: nova constante `CHAMFER_CORNERS` (6 coordenadas fixas com ângulo de rotação) e nova função `drawChamferShadows()` — desenha, pra cada canto, um triângulo com gradiente linear escuro→transparente, rotacionado pra "morder" a quina de dentro do canto. Chamada logo após `drawWalls()` no `render()` principal.

## Decisões tomadas
- Q1 do item: confirmada a opção só-visual (recomendação já registrada no item) em vez do degrau de colisão — mais barato, reversível, e resolve a percepção visual sem qualquer risco de gameplay.
- Q2 do item (quais cantos): escolhidos os 4 cantos da recepção central (ponto mais percorrido do mapa) e as duas entradas em L de Servidores/Copa — os pontos de maior tráfego identificados na pesquisa de código.

## Evidências de teste
Testado via Docker isolado (`docker-up.sh todo-015`, `npm run check` ok) e navegador real, com múltiplas partidas jogadas de ponta a ponta (incluindo campanha completa, zumbi Alfa, movimentação extensa pelo mapa) ao longo de vários minutos:
- Console do navegador sem nenhum erro durante toda a sessão, com `drawChamferShadows()` executando a cada frame (a função roda incondicionalmente dentro do laço de renderização).
- Não foi possível capturar um screenshot exatamente sobre um dos 6 cantos-alvo devido à dificuldade de navegação precisa por teclado no ambiente de automação deste teste (ver limitação já documentada em `CONTEXT.md`/skill `execute-todo` sobre automação de mouse/teclado) — a validação desta rodada ficou por revisão de código (técnica padrão de canvas: `translate`+`rotate`+preenchimento triangular com gradiente, mesmo padrão já usado em outros efeitos decorativos do arquivo) e pela ausência total de erros de execução com a função ativa em produção durante todo o teste.

## Commits
- `e830281` — feat: sombra decorativa nos cantos de alto tráfego do mapa (TODO-015)
