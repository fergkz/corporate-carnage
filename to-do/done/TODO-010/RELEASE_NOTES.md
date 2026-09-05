# Release notes — TODO-010

## O que foi feito
O jogo ganhou efeitos sonoros básicos: tiro de cada arma, faca, dano recebido, morte, coleta de item, clique de "sem munição" e explosão — tudo tocado a partir de eventos que já existiam no jogo, sem precisar de protocolo de rede novo. Também ganhou um botão de mudo simples no HUD.

## O que mudou em relação à versão anterior
- **Pesquisa externa executada nesta implementação** (não só planejada): a proposta original do item recomendava o pacote Kenney "Blaster Kit" para os tiros — ao baixar e inspecionar o zip de verdade, descobri que esse pacote é só modelos 3D/texturas, **sem nenhum áudio** (engano da pesquisa anterior, corrigido agora). Troquei por **"Sci-Fi Sounds"** (Kenney, CC0) pros tiros/explosão, mantendo **"Impact Sounds"** pra dano/morte, e adicionei **"RPG Audio"** (Kenney, CC0) pra faca/coleta/clique vazio — todos baixados e verificados de verdade (`kenney.nl`, license CC0 confirmada em cada `License.txt`).
- Novo diretório `public/assets/audio/` com 10 arquivos `.ogg`: `shot_pistol`, `shot_rifle`, `shot_shotgun`, `shot_rocket`, `knife`, `damage`, `death`, `pickup`, `empty_click`, `explosion`.
- `public/game.js`:
  - Novo módulo de áudio (`loadSfx`/`sfx`/`playSfx`/`setSfxMuted`) baseado em `HTMLAudioElement` + `cloneNode()` por reprodução, sem Web Audio API (suficiente pro volume de sons simultâneos do jogo).
  - `playSfx(...)` chamado em: `spawnDeathEffect` (morte de jogador ou zumbi), a checagem existente `self.hp < lastHp` (dano), `socket.on('shot', ...)` (tiro de cada arma e faca, usando `shot.weapon` pra escolher o som certo), `socket.on('grenade', ...)` (explosão — cobre granada, zumbi-bomba e impacto de míssil, que já reusavam esse mesmo evento), `socket.on('pickup', ...)` (coleta) e `flashEmptyAmmo()` (TODO-009, clique vazio).
  - Novo botão `#mute-toggle` (posição fixa, canto superior direito), persistido em `localStorage` (`cc_muted`).
- `README.md`: nova seção de créditos de áudio (Kenney, CC0).
- Nenhuma mudança no servidor — todos os gatilhos já existiam.

## Decisões tomadas
- Q1 do item (confirmar pacotes Kenney): confirmados, com a correção já descrita acima (Blaster Kit não tinha áudio; substituído por Sci-Fi Sounds).
- Q2 do item (controle de volume/mudo desde já): implementado um toggle simples de mudo (liga/desliga), sem controle de volume granular — suficiente pro objetivo citado no item (evitar incômodo num evento com várias pessoas por perto).

## Evidências de teste
Testado via Docker isolado (`docker-up.sh todo-010`, `npm run check` ok):
- Todos os 10 arquivos de áudio respondem `200` via `curl` direto ao servidor.
- Partida real em navegador: os 10 arquivos carregaram (`206 Partial Content`, preload) sem erro; um bot disparando escopeta durante a partida gerou uma nova requisição de `shot_shotgun.ogg`, confirmando que o evento `shot` de qualquer jogador da sala dispara o som corretamente no cliente.
- Botão de mudo alternou visualmente entre "SOM: ON"/"SOM: OFF" ao clicar.
- Console do navegador sem erros, logs do servidor sem erros.

## Commits
- `a470253` — feat: efeitos sonoros básicos de combate e coleta (TODO-010)
