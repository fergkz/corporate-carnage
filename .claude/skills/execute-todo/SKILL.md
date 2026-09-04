---
name: execute-todo
description: Implementa um item do backlog (to-do/TODO-NNN) — pergunta o necessário, cria uma git worktree isolada (nunca o checkout compartilhado, pra rodar em paralelo com outras sessões sem interferência), desenvolve, testa como jogador via Docker/navegador, comita, faz merge com main e envia ao GitHub, e arquiva o item em to-do/done/ com release notes.
---

Você vai implementar de ponta a ponta um item específico do backlog em
`to-do/`. A entrada é um ID (`TODO-NNN`, aceite variações como "todo 3" ou
"TODO-003") e, opcionalmente, uma instrução extra do Fernando complementando
ou ajustando o que fazer.

Esta skill **só executa um item por vez**. Se o Fernando pedir mais de um
ID na mesma mensagem, confirme se é pra rodar em sequência (uma
worktree/branch/commit/merge por item, nessa ordem) antes de começar.

## Regra de isolamento: sempre em worktree própria, nunca no checkout compartilhado

**Todo o trabalho de implementação (passos 3 em diante) roda numa `git
worktree` isolada, nunca no diretório principal do repo.** O diretório
principal é compartilhado — pode ter outra sessão do Claude Code (ou uma
segunda conversa do Fernando) trabalhando em outro TODO ao mesmo tempo, ou
a skill `create-update-todo` mexendo no backlog. Fazer `git checkout -b`
ali faz uma tarefa pisar no branch/arquivos da outra assim que rodam em
paralelo — já aconteceu nesse projeto (TODO-002 e TODO-003 ficaram
misturados, não commitados, no mesmo checkout, numa execução anterior).

Isso significa:
- **Nunca** rode `git checkout`/`git switch` no diretório principal do
  repo como parte desta skill.
- Cada execução ganha seu próprio diretório de trabalho, criado com
  `create-worktree.sh` (abaixo), dentro do **diretório de scratchpad desta
  sessão** (o caminho que aparece no seu próprio system prompt como
  "Scratchpad Directory" — cada sessão tem o seu, então worktrees de
  sessões diferentes nunca colidem de caminho).
- Docker também roda isolado por worktree (nome de projeto + porta
  próprios), pra duas sessões testando em paralelo não competirem pela
  mesma porta nem acabarem testando o código uma da outra.
- Se ao investigar o repo (passo 3) você notar mudanças não commitadas
  **no diretório principal** que não são desta execução, é sinal de uma
  sessão concorrente ou de sobra de uma execução antiga que não seguia
  essa regra — não mexa nelas, apenas avise o Fernando.

## Scripts (use-os em vez de fazer a parte mecânica na mão)

Ficam em `.claude/skills/lib/`, compartilhados com a skill `create-update-todo` —
chame com `bash .claude/skills/lib/<script>.sh ...`:

- `find-item.sh TODO-NNN` — acha o item (ativo ou já arquivado). Rode a
  partir do diretório principal do repo (só leitura, não precisa de
  worktree pra isso).
- `slugify.sh "Título"` — vira slug kebab-case curto pra nome de
  branch/diretório.
- `create-worktree.sh nome-da-branch caminho` — cria uma worktree a partir
  de `origin/main` atualizado, sem tocar no checkout de nenhuma outra
  worktree/sessão. `caminho` deve ficar dentro do scratchpad desta sessão
  (ver regra acima).
- `archive-item.sh TODO-NNN` — move o item e seus anexos (com `git mv`,
  preservando histórico) pra `to-do/done/TODO-NNN/` e cria o esqueleto de
  `RELEASE_NOTES.md`. Rode **de dentro da worktree do TODO**, só depois de
  já ter editado o `**Status**` do item pra `concluído`.
- `docker-up.sh slug` / `docker-down.sh slug` — sobem/derrubam uma stack
  Docker isolada (nome de projeto + porta efêmera, só o serviço `game`)
  pra essa worktree. Rode de dentro da worktree do TODO.
- `finish-worktree.sh nome-da-branch caminho-da-worktree` — mescla a
  branch (já commitada) em `origin/main` via uma worktree temporária
  destacada, dá push, e remove a worktree do TODO e a branch local. Não
  depende de `main` estar livre em checkout nenhum. Para com a worktree de
  merge aberta se der conflito (não resolve sozinho).

## 0. Localizar o item

- Rode `find-item.sh TODO-NNN`.
- Se `STATUS=not_found`: liste os IDs disponíveis em `to-do/` e pergunte —
  nunca invente o conteúdo de um item que não existe.
- Se `STATUS=done`: avise que esse item já foi implementado e arquivado, e
  confirme com o Fernando se ele quer mesmo refazer/estender antes de
  prosseguir (não re-execute silenciosamente algo já concluído).

## 1. Entender o pedido

- Leia o arquivo do item inteiro (Pedido original, Situação atual,
  Pesquisa externa, Proposta técnica, Riscos/decisões em aberto,
  Complemento, se houver).
- Confira `to-do/anexos/TODO-NNN-*` — leia qualquer anexo relevante.
- **Reconfira a "Situação atual" contra o código de verdade agora** (Grep/
  Read, ou o agente Explore se for muito código) — o item pode ter sido
  escrito antes de outras mudanças no projeto; não assuma que as
  referências de arquivo/linha do item ainda batem exatamente.

## 2. Perguntar o que for necessário

- Baseie as perguntas nos pontos ainda abertos em "Riscos / decisões em
  aberto" do item, mais qualquer ambiguidade real que a releitura do passo 1
  tenha revelado. Use `AskUserQuestion`, agrupando o que der numa única
  rodada.
- Se a instrução extra que o Fernando mandou junto com o ID já responde
  algum desses pontos, não pergunte de novo — só confirme se ficou algo
  não coberto.
- **Zero perguntas é um resultado válido**: se o item já está totalmente
  acionável (sem riscos em aberto relevantes, proposta clara), não invente
  pergunta só pra ter uma — vá direto pra implementação.

## 3. Preparar a worktree

- Gere o slug com `slugify.sh` a partir do título do item.
- Rode `create-worktree.sh todo/todo-nnn-slug <scratchpad-desta-sessão>/todo-nnn-slug`
  — cria a worktree a partir de `origin/main` atualizado. Isso não toca no
  diretório principal do repo nem no checkout de nenhuma outra
  worktree/sessão, então não precisa checar se o checkout compartilhado
  está limpo antes de rodar isto.
- **A partir daqui, todo comando (Read/Edit/Bash/docker/git) roda dentro
  do caminho da worktree impresso pelo script**, não no diretório
  principal do repo. Use esse caminho absoluto em todas as ferramentas
  pelo resto da execução.

## 4. Implementar

- Siga a "Proposta técnica" do item, já ajustada pelas respostas do passo 2
  e pela instrução extra do Fernando (se houver) — ela tem prioridade sobre
  o que o item registrou, quando conflitarem.
- Mesmo padrão de engenharia já usado no projeto: diffs mínimos, sem
  comentário desnecessário, reaproveite funções/padrões existentes em vez
  de duplicar.
- Se, na prática, a implementação precisar desviar do que o item propôs
  (coisa que só se descobre mexendo no código), tudo bem — só anote a
  diferença pra entrar nas release notes no passo 7.

## 5. Testar como se fosse um jogador

Regra do projeto (já documentada em `CONTEXT.md`): **validar sempre via
Docker**, nunca rodando `node server.js` direto no host. Tudo isto roda de
dentro da worktree do passo 3.

1. `docker-up.sh slug` — sobe uma stack isolada (nome de projeto + porta
   própria) só com o serviço `game`, construído a partir do código desta
   worktree. Confirme o container saudável e anote a `URL=` impressa.
2. Rode `npm run check` dentro do container (`docker compose -p <project>
   exec game npm run check`, usando o `PROJECT=` impresso pelo
   `docker-up.sh`).
3. **Jogue de verdade** pela ferramenta de navegador, apontando pra `URL=`
   impressa (não pro túnel Cloudflare — é mais lento e mais instável pra
   teste automatizado) — abra a sala, entre numa partida configurada
   especificamente pra exercitar a funcionalidade do TODO (reproduza o
   cenário do "Pedido original", não só "abriu e carregou"). Ex.: se o
   item é sobre munição por arma, pegue munição e confira o número em cada
   arma; se é sobre o míssil, dispare em situações diferentes e observe o
   comportamento descrito no pedido.
   - **Se a aba do navegador automatizado não estiver realmente sendo
     exibida/composta** (ex.: screenshot falha com "Browser pane não está
     sendo exibido", `document.hidden === true`), o loop de
     `requestAnimationFrame` do próprio jogo trava e WASD/mouse não geram
     efeito nenhum, mesmo que os eventos de teclado sejam disparados. Isso
     é uma limitação do ambiente de automação, não um bug do jogo. Nesse
     caso, contorne testando via um cliente `socket.io-client` real (Node,
     dentro do container — `npm install socket.io-client --no-save` se
     preciso) que emite os eventos reais do protocolo (`createRoom`,
     `startMatch`, `input`, `fire`) direto contra o servidor rodando,
     como um jogador de verdade faria, só sem depender do render do
     navegador. Isso ainda é teste de ponta a ponta contra o servidor
     real — não é mock.
4. Confira o console do navegador (sem erros) e os logs do servidor
   (`docker compose -p <project> logs game`) durante o teste, procurando
   stack trace.
5. Capture evidência visual quando a ferramenta de navegador permitir
   (screenshot). **Seja honesto sobre limitações**: se não for possível
   persistir a imagem como arquivo, não invente print — descreva por
   escrito, com precisão, o que foi observado (valores exatos no HUD,
   mensagens de log/snapshot do servidor, sequência de ações testada). As
   release notes do passo 7 devem refletir só evidência real.
6. **Se o teste revelar um problema**: corrija e teste de novo. Se travar
   de verdade, pare, explique o problema ao Fernando e não prossiga para
   commit/merge/push — a worktree e o trabalho ficam como estão até ele
   decidir o próximo passo.
7. Depois de terminar os testes (com sucesso ou não), rode `docker-down.sh
   slug` pra não deixar a stack isolada rodando à toa.

## 6. Commit

- Ainda dentro da worktree: `git add` só os arquivos relevantes a este
  TODO (nunca `git add -A` cego) — revise `git status` depois de dar
  stage.
- Commit seguindo as convenções de commit já ativas no projeto.

## 7. Arquivar o item (ainda dentro da worktree do TODO)

1. Edite o arquivo do item: campo `**Status**` para `concluído`.
2. Rode `archive-item.sh TODO-NNN` (de dentro da worktree) — move o item e
   os anexos com prefixo `TODO-NNN-` pra `to-do/done/TODO-NNN/` (via `git
   mv`) e cria o esqueleto de `to-do/done/TODO-NNN/RELEASE_NOTES.md`.
3. Preencha o `RELEASE_NOTES.md` (troque cada `PREENCHER`):
   - **O que foi feito** — resumo direto.
   - **O que mudou em relação à versão anterior** — comportamento antes vs.
     depois, arquivos/funções tocados (isso é changelog de verdade, baseado
     no que foi implementado de fato, não uma cópia da proposta original —
     reflita desvios do passo 4 se houve algum).
   - **Decisões tomadas** — respostas do Fernando às perguntas do passo 2,
     se houve.
   - **Evidências de teste** — prints (se existirem como arquivo real) ou o
     relato escrito do passo 5, sem inventar nada.
   - **Commits** — hash do(s) commit(s) de implementação desta branch.
4. Commit dessa movimentação e do `RELEASE_NOTES.md` preenchido (ex.:
   `docs: archive TODO-NNN`).

## 8. Merge e push

Só chegue aqui se o passo 5 (teste) passou limpo.

1. Rode `finish-worktree.sh todo/todo-nnn-slug <caminho-da-worktree>` (o
   nome de branch e o caminho que `create-worktree.sh` imprimiu no passo
   3) — mescla numa worktree temporária destacada (sem depender do
   checkout de `main` estar livre em lugar nenhum), dá push pra
   `origin/main`, remove a worktree do TODO e a branch local, e imprime o
   hash do commit de merge. **Rode de fora da worktree que está sendo
   removida** (ex.: do diretório principal do repo) — o script apaga esse
   diretório, então não pode ser o `cwd` de quem o chama.
2. Se o script parar com conflito de merge, **pare e peça ajuda ao
   Fernando** em vez de resolver sozinho — a mensagem de erro do script
   aponta o caminho da worktree temporária de merge pra inspecionar/
   resolver manualmente.
3. Reporte ao Fernando: o que foi implementado, o hash do commit de merge
   (saída do script), e onde ficaram as release notes
   (`to-do/done/TODO-NNN/RELEASE_NOTES.md`).

## Regras importantes

- Nunca force push, nunca pule hooks (`--no-verify`), nunca descarte
  trabalho não commitado sem perguntar antes.
- Nunca faça merge/push se o teste do passo 5 não passou — pare e reporte.
- Nunca invente evidência de teste (print, log, resultado) que não foi de
  fato observada nesta execução.
- Uma execução desta skill = uma worktree = uma branch = um TODO. Não
  empacote vários TODOs no mesmo commit/branch/merge mesmo que pareçam
  relacionados — rode a skill de novo (com uma worktree nova) pra cada um.
- **Nunca rode `git checkout`/`git switch` no diretório principal do
  repo** como parte desta skill — toda a implementação vive isolada na
  worktree do passo 3, exatamente pra permitir que outra execução (outra
  sessão, ou outra conversa do Fernando) rode em paralelo sem
  interferência. Se dois TODOs precisarem rodar ao mesmo tempo, cada um
  ganha sua própria worktree — nunca reaproveite a mesma.
