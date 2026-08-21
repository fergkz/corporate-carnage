# Treinamento rápido: especificação e IA

## Roteiro de 10 minutos

1. **Ideia em uma frase:** quem joga, o que tenta fazer e qual é a disputa.
2. **Regras essenciais:** jogadores, controles, vitória e derrota.
3. **Primeiro jogável:** a menor versão em que duas pessoas já competem.
4. **Plano por etapas:** conexão, mecânica principal, fim de partida e polimento.
5. **Trabalho com IA:** peça uma etapa por vez, execute e teste antes de avançar.

## Prompt inicial

```text
Quero criar um jogo web multiplayer competitivo para 2 a 5 jogadores.

Conceito: [descreva em uma frase].
Vitória: [condição objetiva].
Controles: [teclas/mouse].
Primeiro marco jogável: duas pessoas entram na mesma sala, veem uma à outra,
movem-se e conseguem concluir uma partida.

Sugira uma arquitetura mínima usando [biblioteca] e [tecnologia multiplayer].
Implemente primeiro o marco mínimo em containers Docker. Inclua compose.yaml
para que `docker compose up --build` inicie tudo e documente a URL de acesso.
Não adicione login, banco de dados ou recursos fora desse escopo.
```

## Boas práticas

- Mantenha a especificação atualizada.
- Faça pedidos pequenos e teste cada marco.
- Suba o ambiente Docker cedo.
- Aos 30 minutos, valide dois navegadores na mesma sala.
- Corte funcionalidades que ameaçarem a partida completa.
