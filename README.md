# Corporate Carnage

Shooter top-down multiplayer competitivo no navegador, visto de cima como um plano de escritório. Agentes disputam uma operação de contenção em um escritório tomado por infectados. Elimine zumbis e jogadores rivais antes do fim da rodada.

## Executar

```bash
docker compose up --build
```

Copie a **URL PÚBLICA DO JOGO** mostrada pelo serviço `tunnel` e envie aos jogadores. O acesso da partida deve ser feito por essa URL.

## Partida

- 2 a 5 jogadores em uma única arena.
- Rodadas de 3 minutos com reinício automático.
- Zumbi eliminado: **+1 ponto**.
- Jogador rival eliminado: **+5 pontos**.
- Vence quem tiver mais pontos quando o cronômetro terminar.
- Vida, dano, movimentação, zumbis, pontuação e resultado são validados pelo servidor.
- Todo jogador começa somente com uma faca, que nunca é perdida.
- Pistola, rifle, escopeta e suas munições precisam ser coletados no escritório.
- Escudo, curativos e granadas também aparecem como pickups pelo mapa.
- Escudo absorve dano (de tiro, faca ou mordida) até se esgotar.
- Curativos restauram parte da vida; granadas causam dano em área ao redor do impacto.
- Armas, escudo e granadas coletados são perdidos ao morrer; a faca permanece disponível.
- Os itens retornam ao cenário algum tempo depois de serem coletados.

## Controles

| Ação | Controle |
| --- | --- |
| Mover | `WASD` |
| Mirar | Mouse |
| Atirar | Botão esquerdo |
| Faca tática | `1` |
| Pistola P9 | `2` |
| Rifle AR-21 | `3` |
| Escopeta M12 | `4` |
| Lançar granada | `G` |

O mouse não é capturado: a mira segue o cursor livremente pela tela, como em Project Zomboid.

## Tecnologia

- Canvas 2D nativo para renderização top-down (sem motor 3D).
- Socket.IO para sincronização em tempo real.
- Node.js/Express como servidor autoritativo.
- Docker Compose e Cloudflare Quick Tunnel para entrega.

## Estrutura

- `server.js`: simulação 2D, colisões, combate, zumbis e regras da rodada.
- `public/game.js`: renderização Canvas 2D, câmera que segue o jogador, controles e sincronização visual.
- `public/index.html`: interface e HUD.
- `public/assets/sprites/`: sprites de personagens, zumbis, armas e itens (ver créditos abaixo).

O endpoint `GET /health` é usado pelo Compose antes de iniciar o túnel.

## Créditos de arte

Os sprites de personagem, zumbis, armas e itens vêm do pacote **"Zombie Apocalypse Tileset"** de **Ittai Manero** (itch.io), licenciado para uso livre em projetos pessoais e comerciais. O ícone de rifle foi montado à mão na mesma paleta, já que o pacote original não incluía essa arma. Paredes, piso e mobília do escritório continuam sendo desenhados por código.
