# Release notes — TODO-008

## O que foi feito
Zumbis agora ignoram completamente um jogador que ainda está dentro da janela de invulnerabilidade de spawn/respawn (1,8s) na hora de escolher quem perseguir — antes eles continuavam perseguindo e ficavam "colados" esperando a invulnerabilidade acabar pra golpear no instante seguinte.

## O que mudou em relação à versão anterior
- `server.js`, `updateZombies()`: o laço de escolha de alvo (que já ignorava jogadores com `repelUntil` ativo) ganhou uma linha a mais: `if (now < player.invulnerableUntil) continue;` — mesmo padrão já usado pelo especial `repel`, só que amarrado ao campo `invulnerableUntil` que já existia.
- Nenhuma outra mudança — a duração da invulnerabilidade (1800ms) e o restante da lógica de dano/ataque não foram alterados, conforme a ordem recomendada no item (resolver o problema de perseguição primeiro, só aumentar a duração depois se ainda for insuficiente).
- Implementação seguiu exatamente a proposta do item (Q1: aplicar só a mudança de alvo, sem o empurrão físico do `repel` — ver Decisões abaixo).

## Decisões tomadas
- Q1 do item: aplicada só a mudança de escolha de alvo, sem o empurrão físico adicional (reaproveitar o "push" do `repel`) — a evidência de teste abaixo mostrou que só a mudança de alvo já foi suficiente pra fazer zumbis colados no jogador se afastarem sozinhos durante a janela, sem precisar de empurrão.
- Q2 do item (aumentar duração dos 1800ms): não foi necessário — evidência de teste mostrou jogador com 100 de vida preservada ao longo de toda a janela mesmo com zumbis a menos de 0.7 unidades no instante do respawn.

## Evidências de teste
Testado via Docker isolado (`docker-up.sh todo-008`, `npm run check` ok). Como o comportamento é uma interação temporal entre servidor e IA (não uma tela pra olhar), o teste foi feito com um cliente `socket.io-client` real conectado ao servidor rodando no container — cria sala, inicia partida, fica parado (sem input, como um jogador que acabou de nascer) até morrer para um zumbi de verdade, espera o respawn, e mede a distância dos zumbis que estavam próximos no instante do respawn ao longo dos ~1.7s seguintes:
- No respawn, 2 zumbis estavam a 0.49 e 0.67 unidades do jogador (colados, dentro do alcance de mordida) — no código antigo, isso significaria morte quase instantânea assim que a invulnerabilidade expirasse.
- 1.7s depois (quase no fim da janela de 1.8s), a distância desses mesmos zumbis tinha **aumentado** para 1.30 e 0.93 unidades (afastamento de -0.81 e -0.26, respectivamente) — comportamento de "perdeu o interesse e vagueia" em vez de perseguição.
- Vida do jogador se manteve em 100 (cheia) ao longo de toda a janela pós-respawn observada.
- Logs do servidor (`docker compose logs game`) sem erros durante o teste.

## Commits
- `4443e9d` — fix: zumbis ignoram jogador durante a invulnerabilidade de spawn (TODO-008)
