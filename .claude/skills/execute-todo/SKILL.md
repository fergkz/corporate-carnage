---
name: execute-todo
description: Implementa um item do backlog (to-do/TODO-NNN) — pergunta o necessário, cria uma branch, desenvolve, testa como jogador via Docker/navegador, comita, faz merge com main e envia ao GitHub, e arquiva o item em to-do/done/ com release notes.
---

Você vai implementar de ponta a ponta um item específico do backlog em
`to-do/`. A entrada é um ID (`TODO-NNN`, aceite variações como "todo 3" ou
"TODO-003") e, opcionalmente, uma instrução extra do Fernando complementando
ou ajustando o que fazer.

Esta skill **só executa um item por vez**. Se o Fernando pedir mais de um
ID na mesma mensagem, confirme se é pra rodar em sequência (uma
branch/commit/merge por item, nessa ordem) antes de começar.

## Scripts (use-os em vez de fazer a parte mecânica na mão)

Ficam em `.claude/skills/lib/`, compartilhados com a skill `create-update-todo` —
chame com `bash .claude/skills/lib/<script>.sh ...`:

- `find-item.sh TODO-NNN` — acha o item (ativo ou já arquivado).
- `slugify.sh "Título"` — vira slug kebab-case curto pra nome de branch.
- `git-precheck.sh` — só relata: status do working tree, branch atual, e
  se `main` local está atrás/à frente de `origin/main`. Não decide nada
  por você.
- `create-branch.sh TODO-NNN slug` — sincroniza `main` com `origin/main` e
  cria `todo/todo-nnn-slug` a partir dele. Só rode depois de já ter
  avaliado o `git-precheck.sh`.
- `archive-item.sh TODO-NNN` — move o item e seus anexos (com `git mv`,
  preservando histórico) pra `to-do/done/TODO-NNN/` e cria o esqueleto de
  `RELEASE_NOTES.md`. Rode só depois de já ter editado o `**Status**` do
  item pra `concluído`.
- `finish-merge.sh nome-da-branch` — checkout `main`, `merge --no-ff`,
  `push origin main`, apaga a branch local. Para com a merge em aberto se
  der conflito (não resolve sozinho).

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

## 3. Preparar a branch

- Rode `git-precheck.sh` e avalie a saída:
  - Se houver mudanças não commitadas que **não** têm a ver com este TODO
    (sobra de trabalho anterior), **pare e pergunte** ao Fernando o que
    fazer com elas (commitar à parte, incluir neste TODO, ou deixar como
    está) antes de continuar — nunca misture trabalho não relacionado no
    commit deste item, e nunca descarte nada sem confirmar.
  - Se `main` local estiver atrás de `origin/main`, ou à frente (commits
    locais não enviados que não são deste TODO), avise o Fernando antes de
    seguir — `create-branch.sh` só faz fast-forward simples e falha se
    houver divergência real.
- Rode `create-branch.sh TODO-NNN slug` (gere o slug com `slugify.sh` a
  partir do título do item) — cria `todo/todo-nnn-slug` a partir do `main`
  já sincronizado.

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
Docker**, nunca rodando `node server.js` direto no host.

1. `docker compose up -d --build`, confirme o container `game` saudável.
2. Rode `npm run check` dentro do container.
3. **Jogue de verdade** pela ferramenta de navegador — abra a sala, entre
   numa partida configurada especificamente pra exercitar a funcionalidade
   do TODO (reproduza o cenário do "Pedido original", não só "abriu e
   carregou"). Ex.: se o item é sobre munição por arma, pegue munição e
   confira o número em cada arma; se é sobre o míssil, dispare em
   situações diferentes e observe o comportamento descrito no pedido.
4. Confira o console do navegador (sem erros) e os logs do servidor
   (`docker compose logs game`) durante o teste, procurando stack trace.
5. Capture evidência visual quando a ferramenta de navegador permitir
   (screenshot). **Seja honesto sobre limitações**: se não for possível
   persistir a imagem como arquivo (ex.: pane não exibido/comprimindo o
   frame), não invente print — descreva por escrito, com precisão, o que
   foi observado (valores exatos no HUD, mensagens de log, sequência de
   ações testada). As release notes do passo 7 devem refletir só evidência
   real.
6. **Se o teste revelar um problema**: corrija e teste de novo. Se travar
   de verdade, pare, explique o problema ao Fernando e não prossiga para
   commit/merge/push — a branch e o trabalho ficam como estão até ele
   decidir o próximo passo.

## 6. Commit

- `git add` só os arquivos relevantes a este TODO (nunca `git add -A`
  cego) — revise `git status` depois de dar stage.
- Commit seguindo as convenções de commit já ativas no projeto.

## 7. Arquivar o item (ainda na branch do TODO)

1. Edite o arquivo do item: campo `**Status**` para `concluído`.
2. Rode `archive-item.sh TODO-NNN` — move o item e os anexos com prefixo
   `TODO-NNN-` pra `to-do/done/TODO-NNN/` (via `git mv`) e cria o esqueleto
   de `to-do/done/TODO-NNN/RELEASE_NOTES.md`.
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

1. Rode `finish-merge.sh todo/todo-nnn-slug` (o nome de branch que
   `create-branch.sh` imprimiu no passo 3) — faz checkout de `main`,
   `merge --no-ff`, `push origin main`, apaga a branch local, e imprime o
   hash do commit de merge.
2. Se o script parar com conflito de merge, **pare e peça ajuda ao
   Fernando** em vez de resolver sozinho (`git merge --abort` se precisar
   desfazer e reavaliar).
3. Reporte ao Fernando: o que foi implementado, o hash do commit de merge
   (saída do script), e onde ficaram as release notes
   (`to-do/done/TODO-NNN/RELEASE_NOTES.md`).

## Regras importantes

- Nunca force push, nunca pule hooks (`--no-verify`), nunca descarte
  trabalho não commitado sem perguntar antes.
- Nunca faça merge/push se o teste do passo 5 não passou — pare e reporte.
- Nunca invente evidência de teste (print, log, resultado) que não foi de
  fato observada nesta execução.
- Uma execução desta skill = uma branch = um TODO. Não empacote vários
  TODOs no mesmo commit/branch/merge mesmo que pareçam relacionados — rode
  a skill de novo pra cada um.
