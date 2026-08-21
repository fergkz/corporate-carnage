# Formato e regras

## Agenda

| Horário | Atividade |
| --- | --- |
| 16:00–16:10 | Treinamento rápido: especificação e trabalho com IA |
| 16:10–16:20 | Escolha da ideia e fechamento da especificação |
| 16:20–17:50 | Desenvolvimento do protótipo |
| 17:50 | Horário de corte para atualização do repositório público no GitHub |
| 17:50–18:20 | Teste coletivo dos jogos na máquina da organização e preenchimento do formulário |
| 18:20–18:30 | Apuração, anúncio do resultado e retrospectiva curta |

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

A base Docker já está disponível e funcionando; ela não precisa ser recriada. O relógio abaixo começa às 16:20 e serve para mostrar exatamente quando o desenvolvimento do jogo começa e quando é hora de cortar escopo.

| Horário | Fase | Resultado esperado | Se não chegou lá |
| --- | --- | --- | --- |
| 16:20–16:30 | Preparação da base | Rodar a base, abrir a URL do túnel e criar o repositório público do jogo. | Não altere o jogo ainda: faça o Compose funcionar e publique o repositório primeiro. |
| 16:30–16:45 | Primeiro código do jogo | Substituir ou adaptar a tela de exemplo; controles locais e cenário básico já aparecem no navegador. | Use formas simples e uma única tela. Não procure arte nem crie menus. |
| 16:45–17:05 | Multiplayer | Dois navegadores acessam a mesma URL e enxergam movimento ou estado compartilhado. | Reduza para uma sala e uma única ação sincronizada. |
| 17:05–17:25 | Mecânica competitiva | A ação que define o jogo funciona: atacar, empurrar, coletar, correr ou pontuar. | Remova poderes, mapas extras, itens e mecânicas secundárias. |
| 17:25–17:40 | Partida completa | Vitória, derrota e reinício funcionam em uma partida de até cinco minutos. | Pare de adicionar recursos; corrija apenas o caminho principal da partida. |
| 17:40–17:50 | Entrega | README revisado, última versão enviada ao GitHub e repositório pronto para ser clonado. | Priorize o `git push`, o Docker Compose e a instrução de execução. |

## Entrega e teste

- O README do projeto deve informar comando Docker, como localizar a URL do túnel, controles, quantidade de jogadores e objetivo do jogo.
- Cada participante deve entregar o jogo em um repositório **público** no GitHub até o horário de corte definido para o evento.
- A versão avaliada será a última versão disponível no repositório no horário de corte. Atualizações enviadas depois desse horário não serão consideradas.
- A pessoa organizadora clonará e executará cada repositório em sua própria máquina. Portanto, a versão publicada deve funcionar sem arquivos locais não versionados e sem instruções particulares da máquina do participante.
- No teste coletivo, a pessoa organizadora iniciará cada servidor em sua própria máquina. Todos os participantes entrarão juntos na partida pela URL do túnel gerada nessa máquina.
- Bibliotecas e exemplos técnicos são permitidos. Não parta de um jogo pronto ou de uma mecânica principal já entregue por um template.
- Após cerca de 30 minutos, dois navegadores devem entrar na mesma sala e visualizar algum estado compartilhado.
- Antes da apresentação, teste a partida a partir de outra máquina ou celular.

## Avaliação

Um jogo só segue para avaliação se o repositório público estiver disponível até o horário de corte e a organização conseguir iniciá-lo com `docker compose up --build`. Cada participante que jogou preenche um formulário após cada partida, sem avaliar o próprio jogo.

### Formulário por partida

**Jogo avaliado:** ____________________

**Avaliador:** ____________________

Marque uma nota de 0 a 5 para cada item:

| Item | Nota | O que observar |
| --- | ---: | --- |
| Diversão e vontade de jogar novamente | 0–5 | A partida teve ritmo e foi agradável? |
| Clareza das regras e controles | 0–5 | Foi possível entender o que fazer e como vencer? |
| Multiplayer e competição | 0–5 | Os jogadores interagiram entre si e o estado ficou consistente? |
| Partida completa e estabilidade | 0–5 | Começou, terminou e reiniciou sem bloquear? |
| Acabamento e comunicação visual | 0–5 | Cenário, feedback e interface ajudaram a jogar? |
| Uso de IA e decisões de escopo | 0–5 | A solução foi bem direcionada e compatível com o tempo do hackathon? |

**Comentário obrigatório:** uma coisa que funcionou bem e uma melhoria que faria no jogo.
____________________________________________________________________________

### Fórmula da nota final

Para cada formulário, a nota é calculada em uma escala de 0 a 100:

```text
Nota = 20 × (
  diversão × 0,30 + clareza × 0,15 + multiplayer × 0,25 +
  partida completa × 0,15 + acabamento × 0,05 + uso de IA e escopo × 0,10
)
```

A nota final do jogo é a média das notas válidas recebidas. Em caso de empate, vence o jogo com maior média no item **multiplayer e competição**; persistindo o empate, usa-se a maior média em **diversão e vontade de jogar novamente**.

---

[Início](../README.md) · [Próximo: treinamento →](02-treinamento-spec-e-ia.md)
