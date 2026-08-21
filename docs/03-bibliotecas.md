# Bibliotecas recomendadas

## Jogos 3D

| Biblioteca | O que é | Quando escolher |
| --- | --- | --- |
| [Three.js](https://threejs.org/) | Biblioteca JavaScript para cenas 3D com WebGL. | FPS simples, arenas e experiências 3D customizadas. |
| [Babylon.js](https://www.babylonjs.com/) | Motor 3D web com recursos de cena, materiais e ferramentas. | Quando recursos de engine acelerarem o protótipo. |
| [PlayCanvas](https://playcanvas.com/) | Engine 3D web com editor visual e runtime JavaScript. | Para montar cenário visualmente e programar as regras. |

## Jogos 2D

| Biblioteca | O que é | Quando escolher |
| --- | --- | --- |
| [Phaser](https://phaser.io/) | Framework 2D com cenas, sprites, entrada, áudio e colisão. | Plataforma, arena, corrida ou shooter top-down. |
| [PixiJS](https://pixijs.com/) | Renderizador 2D rápido, focado em sprites e efeitos. | Quando for desejado mais controle sobre as regras. |
| [Kaboom](https://kaboomjs.com/) | Biblioteca 2D leve para objetos, movimento, colisões e cenas. | Jogos pequenos com código direto. |

## Multiplayer em tempo real

| Tecnologia | O que é | Quando escolher |
| --- | --- | --- |
| [Socket.IO](https://socket.io/) | Biblioteca cliente/servidor baseada em eventos, com reconexão e salas. | Escolha padrão para o hackathon. |
| [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) | Conexão bidirecional nativa do navegador. | Quando a equipe quiser dependências mínimas. |
| [Colyseus](https://colyseus.io/) | Framework de salas e sincronização de estado para jogos. | Jogos com estado compartilhado mais estruturado. |

**Combinações sugeridas:** Phaser + Socket.IO para 2D; Three.js + Socket.IO para 3D. Prefira Socket.IO, salvo experiência prévia clara com outra opção.

## URL pública temporária

O Cloudflare Quick Tunnel cria uma URL HTTPS temporária e é compatível com WebSocket. Nesta base ele é iniciado como um serviço Docker e exibe a URL nos logs. Use-o como contingência de rede; a URL muda quando o túnel reinicia.
