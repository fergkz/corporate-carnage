# Formato e regras

## Agenda sugerida

| Horário | Atividade |
| --- | --- |
| 16:00–16:10 | Treinamento rápido: especificação e trabalho com IA |
| 16:10–16:20 | Escolha da ideia e fechamento da especificação |
| 16:20–17:20 | Desenvolvimento do protótipo |
| 17:20–17:50 | Teste coletivo dos jogos |
| 17:50–18:00 | Votação e retrospectiva curta |

## Requisitos obrigatórios

- Rodar no navegador.
- Ser multiplayer em tempo real para pelo menos duas pessoas.
- Ter interação competitiva direta e condição objetiva de vitória.
- Ter partidas de até cinco minutos e permitir reinício simples.
- Subir cliente, servidor e Cloudflare Quick Tunnel via `docker compose up --build`.

## Escopo e execução

- O jogo pode ser 2D ou 3D. Cada participante escolhe linguagem, framework e bibliotecas.
- A única dependência local é Docker com Docker Compose. Dependências de aplicação e servidor ficam dentro dos containers.
- Inclua `compose.yaml`. É obrigatório que `docker compose up --build` deixe o jogo pronto para jogar e crie a URL pública.
- Inclua e mantenha ativo o serviço Cloudflare Quick Tunnel. O jogo deve ser acessado **somente** pela URL pública temporária gerada pelo túnel.
- A porta do jogo é livre. Ao escolher uma porta, informe-a na linha de comando do serviço `tunnel` no `compose.yaml`.
- Não exponha portas do container para acesso dos jogadores; o túnel é a única entrada da partida.
- Não são exigidos login, banco de dados, persistência, ranking ou publicação profissional.

## Marcos de desenvolvimento

Use estes marcos para reduzir escopo cedo caso o jogo esteja atrasado. O relógio abaixo começa às 16:20.

| Tempo decorrido | Resultado esperado | Se não chegou lá |
| --- | --- | --- |
| 15 minutos | A spec está fechada; `docker compose up --build` conclui e mostra uma URL pública do túnel. | Pare de criar funcionalidades e resolva execução/Docker primeiro. |
| 30 minutos | Dois navegadores acessam a URL do túnel e enxergam estado compartilhado. | Simplifique o jogo para movimento ou uma única ação sincronizada. |
| 45 minutos | A mecânica competitiva principal funciona de ponta a ponta. | Corte mecânicas secundárias, mapas extras e efeitos visuais. |
| 55 minutos | Vitória, derrota e reinício funcionam; uma partida completa pode ser testada. | Pare de adicionar recursos e corrija apenas bloqueios da partida. |
| 60 minutos | README revisado, repositório atualizado e teste final por outra pessoa concluído. | Priorize a entrega versionada e um jogo estável. |

## Entrega e teste

- O README do projeto deve informar comando Docker, como localizar a URL do túnel, controles, quantidade de jogadores e objetivo do jogo.
- Cada participante deve entregar o jogo em um repositório **público** no GitHub até o horário de corte definido para o evento.
- A versão avaliada será a última versão disponível no repositório no horário de corte. Atualizações enviadas depois desse horário não serão consideradas.
- A pessoa organizadora clonará e executará cada repositório em sua própria máquina. Portanto, a versão publicada deve funcionar sem arquivos locais não versionados e sem instruções particulares da máquina do participante.
- Bibliotecas e exemplos técnicos são permitidos. Não parta de um jogo pronto ou de uma mecânica principal já entregue por um template.
- Após cerca de 30 minutos, dois navegadores devem entrar na mesma sala e visualizar algum estado compartilhado.
- Antes da apresentação, teste a partida a partir de outra máquina ou celular.

## Avaliação

| Critério | Peso |
| --- | ---: |
| Jogabilidade e diversão | 40% |
| Multiplayer funcionando | 30% |
| Clareza da ideia e acabamento | 20% |
| Uso de IA e explicação do processo | 10% |

Além da avaliação geral, cada pessoa pode votar em: mais divertido, melhor uso de IA e melhor acabamento.

---

[Início](../README.md) · [Próximo: treinamento →](02-treinamento-spec-e-ia.md)
