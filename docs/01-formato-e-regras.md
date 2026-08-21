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
- Subir cliente e servidor via Docker, com comando documentado.

## Escopo e execução

- O jogo pode ser 2D ou 3D. Cada participante escolhe linguagem, framework e bibliotecas.
- A única dependência local é Docker com Docker Compose. Dependências de aplicação e servidor ficam dentro dos containers.
- Inclua `compose.yaml` e faça o projeto iniciar com `docker compose up --build`.
- Inclua e mantenha ativo o serviço Cloudflare Quick Tunnel. A URL pública temporária é o meio padrão de acesso dos jogadores.
- A porta do jogo é livre. Ao escolher uma porta, informe-a na linha de comando do serviço `tunnel` no `compose.yaml`.
- Não são exigidos login, banco de dados, persistência, ranking ou publicação profissional.

## Entrega e teste

- O README do projeto deve informar comando Docker, URL/porta, controles, quantidade de jogadores e objetivo do jogo.
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
