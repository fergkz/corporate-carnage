---
name: create-update-todo
description: Cria ou aperfeiçoa um item numerado (TODO-NNN) do backlog em to-do/, a partir de uma ideia, resposta ou pedido de ajuste do Fernando — pesquisa o código e a internet pelo melhor caminho de implementação, mas nunca implementa a mudança em si. Edita numa git worktree isolada do checkout principal, pra não colidir com outras sessões rodando em paralelo.
---

Você está mantendo o backlog do jogo Corporate Carnage na pasta `to-do/` na
raiz do projeto — **um arquivo markdown por item**, nunca um documento
único. Leia `to-do/README.md` primeiro se ainda não conhece o formato
esperado. Esta skill tem **dois modos** — decida qual se aplica antes de
tocar em qualquer arquivo. **Em nenhum dos dois modos você implementa a
mudança pedida** — só pesquisa e escreve/edita o item. A implementação de
cada item só acontece quando o Fernando pedir explicitamente depois (ex.:
"faz o TODO-003").

## Onde as coisas ficam

- Cada item: `to-do/TODO-NNN - {título curto}.md` (o hífen entre ID e
  título é literal, com espaços ao redor, igual aos itens já existentes).
- Anexos (imagem, print, referência, arquivo de exemplo): `to-do/anexos/`,
  nomeados com o prefixo do ID a que pertencem (ex.:
  `anexos/TODO-004-mockup-hud.png`), linkados a partir do arquivo do item
  numa seção **Anexos**.
- `to-do/README.md`: legenda do formato — mantenha-a atualizada se o
  formato dos itens mudar.

## Antes de tudo: trabalhe numa worktree isolada, nunca no checkout compartilhado

O backlog é documentação, não precisa do fluxo completo de branch+PR como
o código de `execute-todo` — mas o diretório principal do repo é
**compartilhado**: pode ter uma sessão de `execute-todo` (ou outra
conversa do Fernando) usando aquele mesmo checkout ao mesmo tempo. Editar
`to-do/` e dar `git commit`/`git push` direto ali arrisca pisar no que a
outra sessão está fazendo (foi exatamente essa mistura que bagunçou o
backlog antes: itens e código de TODOs diferentes acumulando no mesmo
checkout sem querer).

1. Rode `bash .claude/skills/lib/create-worktree.sh docs/backlog-update-<algo-único>
   <diretório-de-scratchpad-desta-sessão>/backlog-update` — cria uma
   worktree isolada a partir de `origin/main` atualizado, sem tocar no
   checkout de nenhuma outra worktree/sessão. Use o caminho de scratchpad
   desta sessão (do seu próprio system prompt) como base, e qualquer
   sufixo único no nome da branch (ex.: um timestamp). **Guarde o
   `BRANCH=` e o `WORKTREE=` que o script imprime** — são os valores
   exatos a passar pro `finish-worktree.sh` no final, não recalcule.
2. Siga pro Modo 1 ou Modo 2 abaixo, fazendo **todas** as leituras/edições
   de arquivo dentro do caminho da worktree impresso pelo script (não no
   diretório principal do repo).
3. No final (depois de editar o(s) arquivo(s) do item), commit ainda
   dentro da worktree e finalize com `finish-worktree.sh` — ver seção
   "Scripts" abaixo.

## Scripts (use-os em vez de fazer a parte mecânica na mão)

Ficam em `.claude/skills/lib/`, compartilhados com a skill `execute-todo`:

- `create-worktree.sh nome-da-branch caminho` — cria a worktree isolada
  (ver seção acima).
- `find-item.sh TODO-NNN` — acha o arquivo de um item (ativo em `to-do/`
  ou já arquivado em `to-do/done/`), imprime `STATUS=` e `PATH=`. Rode de
  dentro da worktree criada no passo acima.
- `scaffold-item.sh "Título curto"` — calcula o próximo ID livre (olhando
  `to-do/` **e** `to-do/done/`) e já cria o arquivo com o esqueleto/
  template pronto, imprimindo o caminho criado. Rode de dentro da
  worktree.
- `finish-worktree.sh nome-da-branch caminho-da-worktree` — mescla a
  branch (já commitada) em `origin/main` via uma worktree temporária
  destacada, dá push, e remove a worktree e a branch local. Não depende de
  `main` estar livre em checkout nenhum — rode de fora da worktree que
  está sendo removida (ex.: do diretório principal do repo).

Chame-os com `bash .claude/skills/lib/<script>.sh ...`. Isso evita ficar
listando diretório e computando o próximo número manualmente — só rode o
script e edite o conteúdo do arquivo que ele criar.

Depois de criar/editar um item (ainda dentro da worktree), commite e
finalize:
```
git add to-do/
git commit -m "docs: {resumo curto do que mudou no backlog}"
```
E então, de fora da worktree:
```
bash .claude/skills/lib/finish-worktree.sh <BRANCH= do passo 1> <WORKTREE= do passo 1>
```
(sem branch de feature de verdade, sem PR — é só documentação sendo
mesclada direto; o script cuida do merge + push + limpeza).

## Modo 1 — Criar item novo

Use quando a mensagem **não** referenciar um `TODO-NNN` existente (ou
referenciar um número que não existe na pasta).

1. **Rode `scaffold-item.sh "Título curto"`** com um título específico pro
   pedido — ele cria `to-do/TODO-NNN - Título curto.md` já com o ID certo
   e o esqueleto da estrutura abaixo, com `PREENCHER` em cada seção.
2. **Pesquise o código.** Use Grep/Read (ou o agente Explore, se a busca for
   ampla) pra entender como o que foi pedido se comporta *hoje* no projeto —
   funções, arquivos e linhas relevantes em `server.js`/`public/game.js`
   (ou outros, se for o caso). Nunca escreva "Situação atual" de memória;
   toda afirmação técnica vem de algo que você realmente leu agora.
3. **Pesquise o melhor caminho de implementação — inclusive na internet.**
   Este passo é obrigatório sempre que a pesquisa no código não for
   suficiente pra saber *como* implementar bem, não só *onde*. Use
   WebSearch/WebFetch pra buscar:
   - **Se envolver algo gráfico/visual e faltar asset** (sprite, ícone, som,
     efeito): procure packs/assets compatíveis com o estilo já usado no
     projeto (pixel art, ver `CONTEXT.md` pra saber a licença/origem do
     pack atual — "Zombie Apocalypse Tileset" de Ittai Manero, itch.io) —
     mesma linha de raciocínio já usada nas leiras anteriores de zumbis
     especiais: primeiro ver se o pacote já baixado
     (`~/Downloads/Zombie Apocalypse Tileset.zip`) tem algo aproveitável
     antes de sugerir baixar coisa nova. Se sugerir um pack novo, confirme
     que a licença permite uso comercial/pessoal livre antes de recomendar.
   - **Se envolver uma técnica/algoritmo não trivial** (física, IA,
     networking, otimização): busque como projetos/artigos de referência
     resolvem isso — ex. "top-down shooter homing missile lock-on
     algorithm", "canvas 2d performance culling", "socket.io room
     architecture best practices" — o que fizer sentido pro pedido
     específico.
   - **Se envolver performance**: busque práticas recomendadas
     especificamente pro que já é usado aqui (Canvas 2D no cliente,
     Node.js/Socket.IO no servidor a 20Hz) — não sugira trocar de stack,
     foque em como otimizar dentro do que já existe.
   - Registre o que encontrou numa seção **Pesquisa externa** no item,
     com link da fonte pra cada referência usada, e traga a conclusão
     prática (o que aplicar, o que descartar e por quê) pra dentro de
     "Proposta técnica" — não deixe a pesquisa solta sem virar decisão.
   - Se a busca não achar nada de útil além do óbvio, não force uma seção
     de pesquisa vazia — omita "Pesquisa externa" e siga só com o raciocínio
     próprio.
4. **Preencha o arquivo** que o `scaffold-item.sh` já criou (troque cada
   `PREENCHER` pelo conteúdo real, com `Edit`) seguindo esta estrutura
   (mesmo padrão dos itens já existentes):

   ```markdown
   # TODO-NNN — {título curto e específico da melhoria}

   **Status**: pendente

   **Pedido original**: "{a ideia, nas palavras do Fernando; pode resumir
   levemente se ele mandou em várias mensagens, mas não reescreva o
   sentido}"

   **Situação atual**:
   - Como o jogo se comporta hoje em relação a isso, com referências
     concretas de arquivo/função/linha (ex.: `handleShot()` em
     [server.js](../server.js)). Cite código quando ajudar a entender.

   **Pesquisa externa**: *(só se o passo 3 achou algo relevante)*
   - Achado + link da fonte + o que isso implica pra proposta abaixo.

   **Proposta técnica**:
   - O que mudar, onde, e por quê — passo a passo executável, não só a
     ideia em alto nível. Se envolver escolher entre abordagens, explique o
     trade-off e recomende uma (incorporando o que a pesquisa externa
     trouxer).

   **Riscos / decisões em aberto**:
   1. Q1 - {uma pergunta/decisão específica em aberto, formulada de um
      jeito que dê pra responder direto — não uma observação vaga}.
   2. Q2 - {a próxima, se houver}.
   ```

   Cada item da lista é uma pergunta/decisão **numerada com prefixo `Qn -`**
   (`Q1`, `Q2`, ...), não só uma observação solta — é o que permite o
   Fernando responder depois citando o número (“Q2 do TODO-005: usa
   10”). Se não houver nenhum risco/decisão real, omita a seção inteira
   em vez de forçar um `Q1` artificial.

## Modo 2 — Aperfeiçoar um item existente

Use quando a mensagem citar um `TODO-NNN` que já existe em `to-do/` — ex.:
"no TODO-002, o cone de mira pode ser 2.0", ou o Fernando responde a uma
pergunta que estava em "Riscos / decisões em aberto", ou pede pra
incrementar/corrigir algo na proposta de um item já registrado.

1. **Rode `find-item.sh TODO-NNN`** pra achar o caminho e o status. Se
   `STATUS=done` (já arquivado em `to-do/done/`), avise o Fernando que
   esse item já foi implementado/arquivado e confirme se ele quer mesmo
   reabrir/editar antes de mexer nele. Se `STATUS=not_found`, avise que o
   ID não existe em vez de criar algo novo sem confirmar. Leia o arquivo
   inteiro antes de seguir.
2. Se a resposta/pedido depender do estado atual do código, ou se fizer
   sentido revisitar a pesquisa externa (ex.: o Fernando quer uma
   abordagem diferente da sugerida), **pesquise de novo** antes de editar —
   não presuma que a pesquisa antiga ainda vale.
3. **Edite o arquivo in-place** (não crie um item novo, não duplique) de
   acordo com o que o Fernando mandou:
   - **Resposta a uma pergunta em aberto** (o Fernando pode citar o número,
     tipo "Q2 do TODO-005: ..." — ou só descrever, aí ache qual `Qn` bate):
     incorpore a decisão na "Proposta técnica" (ajustando valores/abordagem
     conforme a resposta) e **remova esse `Qn` específico** da lista — ele
     deixou de ser uma decisão pendente. Se a lista ficar vazia, remova a
     seção inteira. **Não renumere os `Qn` que sobraram** (se remover `Q2`
     de uma lista `Q1`/`Q2`/`Q3`, o resultado é `Q1`/`Q3`, não `Q1`/`Q2` de
     novo) — isso mantém as referências antigas em conversas passadas
     ainda válidas. Se este mesmo ajuste levantar uma pergunta nova,
     numere-a continuando do maior `Qn` **que já existiu** naquele item
     (não reaproveite número de um `Qn` já removido).
   - **Pedido de ajuste/incremento na proposta**: atualize "Proposta
     técnica" (e "Situação atual"/"Pesquisa externa", se pesquisa nova
     mudar algo) mantendo o resto da estrutura intacta.
   - **Informação nova que só enriquece contexto**: acrescente onde fizer
     mais sentido, sem reescrever o que já estava correto.
   - **Nunca reescreva o campo "Pedido original"** — é o registro histórico
     do pedido inicial. Se o Fernando adicionar escopo genuinamente novo,
     acrescente uma linha depois dele, tipo `**Complemento**: "{o que ele
     acabou de adicionar}"`, em vez de editar a citação original.
   - **Não renomeie o arquivo** mesmo que o título pareça datado depois do
     ajuste — o nome do arquivo é fixado na criação; se o título realmente
     precisar mudar, avise o Fernando em vez de renomear sozinho.
   - **Não mexa no `Status`** a menos que o próprio Fernando diga
     explicitamente que o item deve mudar de status (ex.: "descarta o
     TODO-004").
4. **Anexos**: se o Fernando mandar/citar um arquivo (print, referência),
   salve em `to-do/anexos/` com o prefixo do ID e linke numa seção
   **Anexos** do item.
5. Depois de salvar, responda em 1–2 frases dizendo **o que mudou** naquele
   item (não repita o arquivo inteiro no chat).

## Regras importantes

- **Nunca implemente código** nesta skill, mesmo que a ideia/ajuste pareça
  simples — só pesquisa + documentação, nos dois modos. Se o Fernando
  quiser implementar na mesma mensagem, confirme que você só está
  documentando agora e pergunte se ele quer que implemente também (fora do
  escopo desta skill).
- **Nunca marque um item como `concluído`** por esta skill — status muda
  só quando a implementação de fato acontecer (em outra conversa/pedido).
- Se não estiver claro se é modo 1 ou modo 2 (ex.: ele menciona um número
  que não existe, ou o pedido é ambíguo sobre qual item se refere),
  pergunte antes de escrever em vez de adivinhar.
- Mantenha o tom e o nível de detalhe técnico dos itens já existentes na
  pasta — eles são a referência de qualidade esperada, nos dois modos.
