# Backlog — Corporate Carnage

Cada ideia de melhoria/correção vira **um arquivo** nesta pasta, no formato:

```
TODO-NNN - {título curto}.md
```

Gerenciado pela skill `/create-update-todo` (definida em
`.claude/skills/create-update-todo/SKILL.md`). Nada aqui é implementado
automaticamente — cada item só vira código quando pedido individualmente
(ex.: "faz o TODO-003").

## Formato de cada item

- **ID**: `TODO-NNN`, sequencial, nunca reaproveitado mesmo se o item for
  descartado — é também o prefixo do nome do arquivo.
- **Status**: `pendente` | `em andamento` | `concluído` | `descartado`.
- **Pedido original**: a ideia como o Fernando descreveu, entre aspas —
  registro histórico, não é reescrito depois (complementos viram uma linha
  **Complemento** própria, sem editar a citação original).
- **Situação atual**: como o código se comporta hoje, com arquivo/função/
  linha de referência — vem de pesquisa real no repositório, nunca de
  memória.
- **Pesquisa externa** *(quando aplicável)*: melhores práticas, bibliotecas,
  assets compatíveis, referências de performance etc. encontradas na
  internet, com link da fonte.
- **Proposta técnica**: o que mudar e onde, com raciocínio — passo a passo
  executável.
- **Riscos / decisões em aberto**: lista numerada, prefixo `Qn -` (`Q1 -
  ...`, `Q2 - ...`), uma decisão/pergunta por item — dá pra responder
  depois citando o número (ex.: "Q2 do TODO-005: usa 10"). Quando uma
  pergunta é respondida, o `Qn` some da lista mas os números que sobram
  **não são renumerados** (referências antigas continuam válidas); a
  seção inteira some quando não sobrar nenhuma pendente.

## Anexos

Se um item precisar de imagem, referência, print, arquivo de exemplo etc.,
o anexo vai em `to-do/anexos/`, nomeado com o prefixo do ID do item pra
ficar rastreável (ex.: `anexos/TODO-004-mockup-hud.png`), e é linkado a
partir do arquivo do item numa seção **Anexos**.
