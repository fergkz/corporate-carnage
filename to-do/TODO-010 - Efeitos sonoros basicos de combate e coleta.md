# TODO-010 — Efeitos sonoros básicos de combate e coleta

**Status**: pendente

**Pedido original**: já listado como próxima evolução no [CONTEXT.md](../CONTEXT.md) ("Adicionar sons leves para armas, faca, dano e coleta") antes deste playtest; reforçado no relatório que o assistente entregou a Fernando, que pediu para transformar esse achado (e os outros do mesmo relatório) em itens de backlog.

**Situação atual**:
- Confirmado por busca no repositório: não há nenhuma referência a `Audio`, `.mp3`, `.ogg`, `.wav` ou qualquer biblioteca de áudio em `public/game.js` ou `public/index.html` — o jogo hoje é 100% mudo. `public/assets/` só tem a subpasta `sprites/` (sem `audio/` ou `sfx/`).
- Os eventos que já existem hoje e que fariam sentido disparar som são todos recebidos pelo cliente via socket ou gerados localmente, sem precisar de nenhum protocolo novo:
  - `socket.on('shot', ...)` ([public/game.js:1609](../public/game.js)) — disparo de cada arma (o payload já inclui `weapon`, então dá pra escolher o som certo por tipo).
  - `socket.on('killfeed', ...)` ([public/game.js:1599](../public/game.js)) — morte de jogador/zumbi (o texto já diz quem matou quem, mas não diferencia explicitamente "zumbi morreu" de "jogador morreu"; a checagem de dano em `updateHud` via `self.hp < lastHp` (linha 1315) já é usada para o flash vermelho de dano e serve igualmente para disparar som de "levou dano").
  - `socket.on('pickup', ...)` ([public/game.js:1606](../public/game.js)) — coleta de item, já mostra um toast (`showToast`).
  - Golpe de faca: já tratado localmente em `attemptShoot`/animação de arma (arco/corte do sprite), pode tocar som no mesmo instante do golpe local em vez de esperar confirmação do servidor, pela mesma lógica de responsividade já usada no disparo.
- Não existe hoje nenhum sistema de áudio no cliente (nem `<audio>` tags, nem Web Audio API) — a implementação parte do zero.

**Pesquisa externa**:
- [Kenney — Blaster Kit](https://kenney.nl/assets/blaster-kit) (também espelhado em [itch.io](https://kenney-assets.itch.io/blaster-kit)): pacote de 40 efeitos sonoros de armas estilo blaster/sci-fi, licença **CC0** (domínio público, uso livre pessoal/comercial, sem necessidade de crédito) — dá pra usar como base para pistola/rifle/espingarda, adaptando o tom pra soar menos "laser" e mais "arma de fogo" estilizada, o que já combina com a estética "voxel/pixel corporativo" do jogo (nada aqui pretende ser realista).
- [Kenney — Impact Sounds](https://kenney.nl/assets/impact-sounds): pacote de 130 sons de impacto, também **CC0** — boa fonte para golpe de faca, dano recebido, morte de zumbi e som de coleta de pickup (thuds/hits variados).
- Ambos os pacotes seguem a mesma linha de raciocínio já usada para os sprites atuais (pacote pronto, gratuito, licença permissiva — ver [CONTEXT.md](../CONTEXT.md), seção "Sprites reais integrados (itch.io)"), mas com uma vantagem: CC0 dispensa até o crédito opcional que o pacote de sprites atual pede, simplificando a atribuição no README.
- Conclusão prática: usar `Blaster Kit` para os disparos de arma (pistola/rifle/escopeta/míssil, escolhendo entre as variações do pacote a que soar mais adequada a cada arma) e `Impact Sounds` para faca, dano, morte e coleta — evita ter que gravar/produzir áudio do zero e mantém consistência de licença com o resto do projeto.

**Proposta técnica**:
- Criar `public/assets/audio/` e baixar de `Blaster Kit`/`Impact Sounds` só os arquivos necessários (um por evento: disparo de pistola, rifle, escopeta, míssil, faca, dano recebido, morte de zumbi, morte de jogador, coleta de item, "clique vazio" de sem munição — este último reaproveitável do TODO-009).
- Implementar um player simples de efeitos via `HTMLAudioElement` (`new Audio(src)`), sem necessidade de Web Audio API completa (não há mixagem/espacialização 3D no jogo, é só top-down 2D com poucos sons simultâneos) — um helper tipo `playSfx(name)` que clona o elemento de áudio pré-carregado (`audio.cloneNode()` ou um pequeno pool de instâncias por som) para permitir sobreposição quando o mesmo som precisa tocar mais de uma vez rapidamente (ex. rajada de rifle).
- Disparar os sons a partir dos pontos que já existem e foram mapeados acima: `socket.on('shot', ...)`, `socket.on('killfeed', ...)` (diferenciando morte de zumbi vs. jogador pelo prefixo do nome do atacante, que já está disponível no payload), a checagem `self.hp < lastHp` em `updateHud` para dano, e `socket.on('pickup', ...)` para coleta.
- Pré-carregar os áudios na inicialização do jogo (junto com `loadImage(...)` dos sprites, mesmo padrão já usado) para evitar atraso na primeira reprodução.
- Adicionar um controle de volume/mudo simples no HUD (o jogo já usa `localStorage` implicitamente através de outros ajustes de UI — se não usar, considerar adicionar para persistir a preferência de som entre partidas) — importante para um evento ao vivo com várias pessoas jogando ao mesmo tempo em notebooks próximos.
- Creditar os pacotes Kenney no README mesmo sendo CC0 (não obrigatório, mas mantém o padrão já adotado para o pacote de sprites).

**Riscos / decisões em aberto**:
1. Q1 - Confirma o uso dos pacotes Kenney (`Blaster Kit` + `Impact Sounds`, ambos CC0) como fonte dos sons, ou prefere que eu pesquise outras opções (ex. sons mais "realistas" de armas de fogo em vez do estilo blaster/sci-fi)?
2. Q2 - Quer um controle de volume/mudo visível no HUD desde já, ou um volume fixo é suficiente para a primeira versão com som?
