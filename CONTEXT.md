# Contexto do projeto — Corporate Carnage

## Origem

Este projeto está sendo desenvolvido para o hackathon de jogos no navegador baseado no repositório público:

- https://github.com/fergkz/hackaton-2026-08-21

O repositório original foi baixado para:

```text
/home/fernando/Documents/ChatGPT/Jogo Hackaton
```

O trabalho atual está na branch:

```text
codex/corporate-carnage
```

As alterações ainda não foram commitadas nem enviadas ao GitHub.

## Regras do hackathon consideradas

- O jogo deve rodar no navegador.
- Deve ser multiplayer em tempo real para pelo menos duas pessoas.
- Precisa ter competição direta e uma condição objetiva de vitória.
- A partida deve durar no máximo cinco minutos e permitir reinício simples.
- Cliente, servidor e Cloudflare Quick Tunnel devem iniciar com `docker compose up --build`.
- A URL temporária do Cloudflare é a única entrada utilizada pelos jogadores.
- Não são necessários login, banco de dados, persistência ou ranking permanente.

## Pedido inicial

Fernando pediu ajuda para criar um jogo divertido para o hackathon. A ideia original era um jogo de tiro 3D com zumbis em ambientes corporativos, que tivesse:

- visual bonito e cenário não limitado a caixas sem acabamento;
- colisões estáveis;
- múltiplas armas;
- zumbis para enfrentar;
- competição entre vários jogadores;
- jogadores lutando simultaneamente entre si e contra os zumbis.

O conceito elaborado foi um FPS competitivo PvPvE chamado **Corporate Carnage**: agentes ficam presos em um escritório durante um surto, enfrentam infectados e rivais e disputam a maior pontuação da rodada.

## Conceito atual

- Nome: **Corporate Carnage**.
- Gênero: FPS 3D multiplayer PvPvE.
- Cenário: escritório corporativo futurista tomado por infectados.
- Participantes: pensado para 2 a 5 jogadores.
- Duração da rodada: 3 minutos.
- Zumbi eliminado: 1 ponto.
- Jogador rival eliminado: 5 pontos.
- Vitória: maior pontuação quando o cronômetro termina.
- Reinício: automático após o anúncio do vencedor.

## Direção visual

Inicialmente foi criada uma apresentação 3D corporativa mais detalhada, com materiais físicos, iluminação, vidros, plantas e modelos procedurais.

Durante os testes, Fernando informou que o jogo estava pesado e pediu um resultado parecido com Minecraft. A direção foi então alterada para um estilo **voxel corporativo**, mantendo uma identidade adulta e legível, mas reduzindo bastante o custo gráfico.

O corte atual utiliza:

- personagens e zumbis construídos com blocos;
- móveis e objetos com geometrias simples;
- materiais Lambert leves;
- resolução interna limitada a pixel ratio 1;
- sombras dinâmicas desativadas;
- apenas iluminação essencial;
- menos geometrias arredondadas e materiais transparentes complexos;
- névoa e paleta escura corporativa para preservar atmosfera.

## Escritório

O cenário contém atualmente:

- recepção central em blocos;
- divisórias e salas envidraçadas;
- estações de trabalho;
- mesas e cadeiras;
- monitores e teclados;
- sofás de espera;
- armários corporativos;
- mesa e cadeiras de reunião;
- copiadoras;
- plantas decorativas;
- luminárias de teto;
- letreiro da Helix Dynamics.

Os móveis relevantes para a movimentação possuem colisões equivalentes no servidor. As balas também são interrompidas pelos obstáculos registrados no mapa.

## Armas, inventário e munição

Fernando definiu que o jogador deve sempre começar com uma faca e nunca perdê-la. Outras armas e munições precisam ser coletadas durante a fase.

Comportamento implementado:

- Todo jogador nasce com a **faca tática**.
- A faca não utiliza munição e está sempre disponível.
- Pistola, rifle e escopeta aparecem como pickups no escritório.
- Cada arma coletada concede uma quantidade inicial de munição.
- Caixas adicionais de munição estão distribuídas pelo mapa.
- Uma caixa de munição só pode ser coletada se o jogador já possuir a arma correspondente.
- Pickups reaparecem 15 segundos depois de coletados.
- Ao morrer, o jogador perde armas e munições coletadas.
- Após o respawn, o jogador volta a ter somente a faca.
- A interface mostra a arma ativa, a munição e os slots bloqueados ou disponíveis.

Controles do inventário:

| Tecla | Equipamento |
| --- | --- |
| `1` | Faca tática |
| `2` | Pistola P9 |
| `3` | Rifle AR-21 |
| `4` | Escopeta M12 |

## Controles gerais

| Ação | Controle |
| --- | --- |
| Movimento | `WASD` |
| Mira | Mouse |
| Atacar ou disparar | Botão esquerdo do mouse |
| Trocar equipamento | `1` a `4` |
| Liberar o mouse | `Esc` |

Uma instrução discreta desses comandos fica permanentemente visível na parte inferior da tela de jogo.

## Zumbis

O primeiro comportamento fazia os zumbis apenas seguirem diretamente o jogador e eles podiam ficar presos nos móveis e divisórias.

O comportamento atual inclui:

- busca pelo jogador vivo mais próximo;
- perseguição contínua;
- avaliação periódica de diferentes direções;
- desvio dos obstáculos registrados no servidor;
- separação para reduzir aglomeração entre zumbis;
- orientação visual na direção do movimento;
- ataque por proximidade com intervalo entre golpes;
- respawn de zumbis eliminados.

Durante o teste publicado, um zumbi conseguiu navegar até o jogador e reduzir sua vida de 100 para 40 em aproximadamente 12 segundos, confirmando que os NPCs não permanecem parados.

## Multiplayer e autoridade do servidor

O servidor Node.js com Socket.IO controla:

- conexões e entrada dos jogadores na rodada;
- posições e movimentação;
- colisões com limites, paredes e móveis;
- arma ativa e inventário válido;
- consumo e coleta de munição;
- tiros, alcance e cadência;
- bloqueio de tiros pela geometria;
- dano entre jogadores;
- dano e morte dos zumbis;
- vida, morte e respawn;
- pontuação;
- pickups e tempo de reaparecimento;
- cronômetro, vencedor e reinício da rodada.

Os clientes enviam apenas intenção de movimento, mira, seleção de arma e ataque. O servidor valida o estado compartilhado.

Foi corrigido um problema em que o jogador podia ser atacado pelos zumbis enquanto ainda estava na tela inicial. Agora ele só entra na simulação após clicar em **Iniciar operação**.

## Colisões

As colisões foram mantidas simples e determinísticas para reduzir bugs em rede:

- jogadores e zumbis usam volumes circulares no plano do chão;
- paredes e móveis usam caixas alinhadas aos eixos;
- movimento nos eixos X e Z é resolvido separadamente para permitir deslizamento pelas paredes;
- a autoridade da posição fica no servidor;
- tiros usam interseções 2D com personagens, zumbis e caixas do cenário;
- não há pulo, escadas físicas ou plataformas móveis.

## Interface

A interface atual contém:

- tela inicial com nome do jogo e campo de codinome;
- cronômetro central;
- indicador de conexão;
- barra e valor de vida;
- placar dos jogadores;
- equipamento ativo;
- contador de munição;
- slots de inventário bloqueados ou liberados;
- mira central;
- anúncios de entrada, nova rodada e vitória;
- kill feed;
- notificação de coleta;
- instruções discretas dos comandos.

## Arquitetura e arquivos principais

- `server.js`: servidor HTTP, Socket.IO, simulação 2D top-down, colisões, combate, pickups, inventário, zumbis e regras da rodada.
- `public/game.js`: renderização Canvas 2D, câmera que segue o jogador, escritório desenhado em 2D, controles, efeitos, HUD e sincronização visual.
- `public/index.html`: estrutura e estilos da interface.
- `package.json`: dependências e comandos.
- `package-lock.json`: versões reproduzíveis das dependências.
- `Dockerfile`: imagem Node.js, instalação via `npm ci` e inicialização do servidor.
- `compose.yaml`: jogo e Cloudflare Quick Tunnel.
- `README.md`: instruções do jogo e execução.

Tecnologias (estado atual, pós-reformulação top-down — ver seção "Reformulação para top-down 2D (Canvas)" acima):

- Node.js;
- Express;
- Socket.IO;
- Canvas 2D nativo (sem Three.js/WebGL);
- Docker e Docker Compose;
- Cloudflare Quick Tunnel.

> Nota histórica: as seções "Direção visual" e "Escritório" acima descrevem a fase anterior, em Three.js/voxel 3D, que foi descontinuada.

## Validações já executadas

- Build completo da imagem Docker.
- Inicialização pelo Docker Compose.
- Healthcheck do serviço `game`.
- Verificação de sintaxe executada dentro do container com `npm run check`.
- Acesso ao endpoint `/health` pela URL pública.
- Renderização real no navegador.
- Entrada de dois jogadores na mesma rodada.
- Exibição dos dois jogadores no mesmo placar.
- Vida inicial correta após entrar na partida.
- Faca tática inicial com munição infinita.
- Zumbis navegando e causando dano.
- Reinicializações do container preservando o funcionamento do túnel.

O erro de Pointer Lock eventualmente exibido durante automação de navegador pertence ao ambiente automatizado. O Pointer Lock funciona quando o usuário clica normalmente na página em um navegador interativo.

## Regra operacional obrigatória

Fernando determinou explicitamente:

> O jogo deve sempre rodar dentro do Docker. Toda alteração deve ser enviada ao Docker também.

Portanto, depois de qualquer alteração no código ou documentação do projeto, deve-se:

1. Executar `docker compose up -d --build`.
2. Confirmar que o container `game` está saudável.
3. Executar as validações dentro do container.
4. Confirmar o funcionamento da URL pública do Cloudflare.
5. Informar a URL ativa ao Fernando.

Não se deve iniciar o servidor Node.js diretamente na máquina para validar uma alteração.

## Estado do Docker e URL atual

Na última validação, os serviços `game` e `tunnel` estavam ativos e o endpoint público respondia com `{"ok":true}`.

URL pública vigente no momento deste registro:

- https://true-satellite-aerial-handmade.trycloudflare.com

Essa URL é temporária e pode mudar quando o container do túnel for recriado. Sempre consultar os logs atuais antes de compartilhar:

```bash
docker compose logs --no-color tunnel
```

## Reformulação para top-down 2D (Canvas)

O visual voxel em Three.js continuava pesado. Fernando pediu a reformulação completa do jogo do zero, trocando a perspectiva 3D em primeira pessoa por uma visão de cima, estilo **Project Zomboid**, mantendo todas as regras de jogabilidade já validadas (armas, munição, pickups, zumbis, pontuação, duração da rodada, autoridade do servidor).

Decisões confirmadas com Fernando antes da reformulação:

- Perspectiva: **top-down 2D** (visão de cima, movimento livre em 8 direções, sem salto nem gravidade) — não um platformer lateral.
- Motor gráfico: **Canvas 2D nativo**, sem Three.js e sem WebGL.

Mudanças técnicas:

- `server.js` foi reescrito com coordenadas `x, y` (antes `x, z`) e um campo `angle` de mira que independe do movimento — antes o `yaw` também definia a base do deslocamento (câmera FPS), agora WASD move em eixos absolutos do mundo e a mira segue o mouse livremente.
- As colisões, o layout de paredes do escritório, as armas, os pickups e a IA dos zumbis foram preservados quase inalterados, porque a simulação já era matematicamente 2D (plano X/Z) — só a renderização era 3D.
- `public/game.js` foi reescrito do zero: renderização via `<canvas>` 2D, câmera que segue o jogador local, interpolação de posição/ângulo entre snapshots, desenho do escritório (paredes, recepção, mesas, plantas, sofás, armários, balcão de reunião) como formas 2D, projéteis como traços que desaparecem, mira (reticle) desenhada na posição real do mouse.
- O **Pointer Lock foi removido** — o mouse não é mais capturado, pois a mira em visão de cima não precisa de captura de cursor. Isso também elimina o erro de Pointer Lock que aparecia em navegadores automatizados.
- A dependência `three` foi removida do `package.json`/`package-lock.json` e a rota estática `/vendor` (que servia o Three.js) foi removida do `server.js`.
- `index.html` perdeu os elementos exclusivos da visão em primeira pessoa (crosshair fixo central, aviso de "clique para retomar", instrução de `Esc`) e passou a usar um único `<canvas id="scene">` em tela cheia.

Validado após a reformulação:

- `npm run check` (sintaxe de `server.js` e `public/game.js`) dentro do container.
- `docker compose up -d --build` com o serviço `game` saudável.
- Endpoint `/health` respondendo tanto localmente quanto pela URL pública do túnel.
- Teste em navegador real: tela inicial, entrada na partida, câmera seguindo o jogador, zumbis se movendo e causando dano, morte e respawn com apenas a faca, pickups visíveis e girando, mira acompanhando o cursor do mouse.

## Sprites reais e mapa mais denso (visual)

Fernando avaliou o resultado do top-down como "muito simplista" (bolinhas e ícones lisos) e pediu sprites de verdade e mais paredes/mobília, mantendo o mapa próprio do jogo.

- `public/game.js` passou a pré-renderizar cada personagem, zumbi e móvel uma única vez num canvas fora da tela (sombreado, gradiente, contorno) e "colar" com `drawImage` a cada quadro, em vez de desenhar bolinhas/ícones simples todo frame.
- Corrigido um bug do servidor: os zumbis nunca tinham um campo `angle` de fato preenchido, então nunca giravam de frente para o alvo — agora `zombie.angle` é atualizado tanto ao perseguir quanto ao atacar.
- `server.js` ganhou duas salas novas (Servidores e Copa, com paredes reais e porta aberta), mais divisórias no salão aberto e mais mobília (desks emparelhados, quadro branco, bebedouro, rack de servidor).
- Ícones de pickup pararam de ser quadrados girando: armas mostram a silhueta da arma, munição mostra uma caixa com cartuchos.

## Bug do jogador travado na parede (corrigido)

Fernando relatou que o personagem às vezes nascia travado, sem conseguir se mover. Causa raiz: dois dos seis pontos de spawn (`[-17,16]` e `[17,-16]`, herdados da versão original do jogo) caíam dentro da margem de colisão (raio do jogador) de duas paredes do mapa. Como `moveWithCollision` resolve os eixos X e Y de forma independente usando a posição atual do outro eixo, um spawn já colidindo podia bloquear qualquer movimento nos dois eixos ao mesmo tempo — um deadlock real, não só um bug visual.

Correção em `server.js`: os dois pontos de spawn problemáticos foram afastados das paredes, e `spawnPoint()` ganhou uma rede de segurança que empurra o ponto para fora do centro do mapa se ele ainda colidir (protege contra futuros ajustes no mapa reintroduzirem o problema).

## Itens especiais (escudo, vida, granada)

Fernando pediu itens especiais além de armas/munição: escudo que absorve dano até quebrar, corações que restauram vida, e granadas.

Implementado em `server.js`:

- `SHIELD_CAPACITY = 60`: pickup de escudo enche a barra de escudo do jogador; qualquer dano (tiro, faca ou mordida de zumbi) é primeiro absorvido pelo escudo antes de afetar a vida — corrigido também o caminho de dano da mordida do zumbi, que originalmente descontava vida direto sem passar pelo escudo.
- `HEART_HEAL = 25`: pickup de coração restaura vida (até 100), não é coletável se a vida já está cheia.
- Granadas: pickup dá `+1` granada (máximo 3). Tecla `G` lança na direção da mira (emite `throwGrenade`); servidor calcula o alcance até bater numa parede e aplica `GRENADE_DAMAGE = 70` em raio `GRENADE_RADIUS = 2.4` a zumbis e jogadores rivais (não ao próprio lançador).
- Escudo e granadas são perdidos ao morrer, como armas e munição.
- `public/game.js` ganhou ícones novos (coração, escudo, granada), barra de escudo e contador de granadas no HUD, anel azul ao redor de jogadores com escudo ativo, e efeito visual de explosão.

## Sprites reais integrados (itch.io)

Fernando pediu explicitamente para aplicar sprites reais em vez dos desenhos por código, com personagens aleatórios e zumbis/armas/itens "bonitos". O pacote escolhido foi **"Zombie Apocalypse Tileset" de Ittai Manero** (`ittaimanero.itch.io/zombie-apocalypse-tileset`, licença livre para uso pessoal e comercial, crédito bem-vindo mas não obrigatório, proibida a redistribuição do pacote em si — crédito colocado no README).

Como o download via `curl` puro não funciona (o botão da itch.io dispara uma chamada JS autenticada por sessão para gerar a URL assinada do arquivo), Fernando baixou o zip manualmente e avisou que estava em `~/Downloads/Zombie Apocalypse Tileset.zip`. Dali foram extraídos e recortados (com Python/Pillow) apenas os frames necessários para `public/assets/sprites/`: jogador (2 quadros de caminhada), 3 zumbis (fino/criança/grande, batendo com as 3 variantes já existentes), ícones de pistola/escopeta/faca/munição/kit de saúde, e sprites de disparo (flash de pistola/escopeta, golpe de faca). O pacote não trazia rifle nem granada como item — o ícone de rifle foi montado à mão na mesma paleta de cores da pistola; o ícone de granada continua desenhado por código.

Decisão importante: **paredes, piso e mobília continuam sendo desenhados por código**, porque o pacote é todo temático rural/pós-apocalipse (fazenda, posto de gasolina, cercas) e não combinava visualmente com o escritório da Corporate Carnage — usar aqueles tiles teria piorado a coerência visual, não melhorado.

Mudanças técnicas em `public/game.js`:

- Como o pacote só tem UMA arte de personagem (sem variação de roupa/cor), "personagens aleatórios" foi resolvido recolorindo os pixels da camiseta branca e da calça cinza pela cor sorteada de cada jogador (`getTintedPlayerSheet`, troca de pixel exata, não blend, então pele e contorno preto não são afetados). O resultado fica em cache por cor.
- Os sprites do pacote são desenhados sempre de frente (não foram feitos para girar 360° como a mira do jogo permite) — por isso o corpo do personagem/zumbi só espelha esquerda/direita (`drawCreatureSprite`), enquanto a arma na mão gira livremente apontando para o mouse (padrão comum em jogos top-down como Nuclear Throne/Enter the Gungeon).
- `ctx.imageSmoothingEnabled = false` para manter o pixel art nítido ao escalar.
- Muzzle flash real ao disparar pistola/escopeta; o golpe de faca usa o frame de corte do pacote em vez do arco desenhado por código.

## Próximas evoluções possíveis

- Balancear dano, munição, quantidade de zumbis e posição dos pickups.
- Adicionar sons leves para armas, faca, dano e coleta.
- Criar feedback de arma sem munição.
- Melhorar animações voxel de caminhada e ataque.
- Adicionar indicação visual mais clara para pickups próximos.
- Medir FPS em computadores e celulares usados no evento.
- Realizar uma partida completa com vários dispositivos pela URL pública.
- Criar testes automatizados de regras do servidor.
- Commitar e publicar a branch quando Fernando solicitar.
