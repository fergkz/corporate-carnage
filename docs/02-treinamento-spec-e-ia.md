# Treinamento rápido: use uma spec para trabalhar com IA

> Leitura estimada: 6 a 7 minutos.

## O objetivo

O jogo é o exercício; o aprendizado é sair de uma ideia vaga, definir um recorte viável e orientar uma ferramenta de IA até chegar a uma entrega funcional. A ferramenta pode ser um chat no navegador, um agente no editor ou qualquer assistente de código. O método é o mesmo: **decidir o que fazer antes de pedir para gerar código**.

Uma *spec* (especificação) é uma descrição curta e objetiva do que será construído. Ela evita respostas genéricas, reduz retrabalho e dá um critério claro para decidir o que fica de fora.

Você não precisa saber tudo antes de começar. O papel da IA é ajudar a explicar opções, criar a primeira versão e corrigir problemas; o seu papel é manter o objetivo pequeno, executar o que foi proposto e verificar se o resultado atende à spec.

## Antes de pedir código

Se você nunca criou um jogo ou trabalhou com IA, siga esta ordem:

1. Abra o repositório e rode `docker compose up --build` para entender a base que já funciona.
2. Abra a URL pública exibida pelo terminal; ela é o endereço que os jogadores usarão.
3. Preencha a spec antes de alterar arquivos.
4. Só então peça uma alteração pequena para a IA.

Quando algo não estiver claro, pergunte antes de mandar implementar: “explique este arquivo”, “qual é a responsabilidade deste serviço?” ou “qual é a menor alteração para fazer X?”. Entender o próximo passo é mais útil do que aceitar uma grande mudança sem saber como testá-la.

## Fase 1 — Escolha a menor partida possível

Antes de abrir a ferramenta de IA, escreva uma frase para o jogo:

> De 2 a 5 jogadores disputam uma arena; vence quem fizer mais pontos em três minutos.

Em seguida, responda quatro perguntas:

1. Quem são os jogadores e quantos podem participar?
2. O que cada um faz repetidamente durante uma partida?
3. Como alguém vence ou perde?
4. O que duas pessoas precisam enxergar uma na outra em tempo real?

Não comece com história, personagens, ranking, login ou efeitos. Comece pela ação que torna a partida competitiva. Se essa ação não estiver pronta, o resto não importa.

## Fase 2 — Escreva a spec de uma página

Use o [modelo de especificação](04-template-spec-do-jogo.md). Ela deve conter apenas decisões necessárias para construir e testar o jogo:

```text
Nome: Arena de Impulso
Jogadores: 2 a 4
Objetivo: empurrar os adversários para fora da arena.
Vitória: último jogador dentro da arena.
Controles: WASD para mover; espaço para impulso.
Tempo de partida: até 3 minutos.
Estado compartilhado: posição, jogador eliminado e fim de partida.
Primeiro marco: dois jogadores conectam, se veem e se movimentam.
Fora do escopo: login, ranking, itens, áudio e persistência.
```

Essa spec não é um documento burocrático. Ela é o contexto que será repetido para a IA sempre que surgir uma decisão ou mudança de rumo.

## Fase 3 — Peça um plano, não o jogo inteiro

Em um chat no navegador, envie a spec e peça primeiro uma arquitetura mínima. Em um agente de código, salve a spec no repositório e peça que ele a leia antes de alterar arquivos.

```text
Leia esta especificação e proponha o menor plano técnico para entregar o primeiro marco.
O jogo deve rodar no navegador, ter servidor multiplayer e iniciar com Docker Compose.
Escolha apenas recursos necessários para dois jogadores entrarem na mesma sala,
verem um ao outro e se moverem. Explique os arquivos que serão criados antes de escrever código.
```

Revise a resposta. Se ela sugerir banco de dados, autenticação ou arquitetura complexa, corte. Para este evento, uma solução simples que roda vale mais que uma solução completa no papel.

Também confirme que o plano preserva o Quick Tunnel. O Compose precisa continuar subindo o jogo e mostrando uma URL pública; os jogadores não devem usar uma porta exposta diretamente na máquina.

## Fase 4 — Desenvolva por marcos curtos

Peça uma mudança por vez, execute e teste. Uma sequência recomendada é:

1. Página do jogo abre pelo navegador dentro do Docker.
2. Servidor aceita duas conexões.
3. Os dois jogadores enxergam movimento ou estado compartilhado.
4. A mecânica competitiva funciona.
5. Existe vitória, derrota e reinício.

```text
Implemente somente o marco 2. Preserve o que já funciona.
Adicione uma sala única com dois jogadores e envie ao navegador o estado necessário.
Não implemente placar, tela final ou efeitos visuais ainda.
Ao terminar, diga como testar em dois navegadores.
```

Se der erro, informe o erro completo e o que você esperava que acontecesse. Não peça apenas “corrija”; diga em qual comando ou tela o problema apareceu.

## Sprites e recursos visuais

Você pode procurar sprites, ícones, tilesets, sons e efeitos online para não gastar o hackathon desenhando tudo do zero. Comece com uma busca objetiva, como “pixel art spaceship sprite”, “top-down arena tileset” ou “platformer character sprite”. Baixe poucos recursos e implemente primeiro a mecânica; trocar quadrados e círculos por arte vem depois que a partida estiver funcionando.

Verifique a licença do material e mantenha os créditos necessários no README. Não use marcas, personagens ou artes de terceiros sem permissão.

## Fase 5 — Use a ferramenta no lugar certo

| Situação | Melhor uso da IA |
| --- | --- |
| Ideia ainda incerta | Chat no navegador para comparar regras e cortar escopo. |
| Projeto local aberto | Agente de código para criar arquivos, alterar código e explicar comandos. |
| Erro de execução | Envie a mensagem de erro, o arquivo envolvido e o comportamento esperado. |
| Falta pouco tempo | Peça para priorizar uma partida completa e listar o que deve ser removido. |

Você não precisa usar uma linguagem específica. Informe a linguagem escolhida na primeira conversa e peça para a IA respeitar o Docker Compose do projeto. Se mudar de ferramenta no meio do hackathon, leve junto a spec e o estado atual do projeto.

## Fase 6 — Feche com teste real

Até 17:00, duas pessoas já devem conseguir abrir o jogo e compartilhar estado. Das 17:25 às 17:40, prepare o repositório para ser executado pela organização. O teste coletivo será feito a partir da URL pública temporária gerada na máquina da organização.

O último pedido à IA pode ser: “revise o projeto contra esta spec; corrija somente impedimentos para uma partida completa e liste o que ficou fora do escopo”.

---

[← Formato e regras](01-formato-e-regras.md) · [Início](../README.md) · [Próximo: bibliotecas →](03-bibliotecas.md)
