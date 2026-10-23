# O que é a janela de contexto, e por que o agente esquece no meio da tarefa?

O quinto post da série "IA para quem já programa": o limite de cerca de 1 milhão de tokens dos modelos de ponta, o
que enche essa janela numa sessão real do Claude Code, por que contexto longo piora a resposta, quanto ele custa e
o que a compactação descarta.

- **A medição.** `analise/composicao.py` divide o pedido de cada chamada da sessão real por tipo (instruções,
  respostas do modelo, saídas de comandos, imagens e o resto). O tamanho é o que a API cobrou; a divisão é estimada
  pelo texto, com um fator calibrado na própria sessão. Resultado em `dados/manuais/composicao.csv` e
  `dados/manuais/calibracao.json`, só com números.
- **Janelas e preços.** `comum/precos.csv`, com a janela, a saída máxima e a faixa longa de cada modelo, conferidos
  em 22/10/2026. A conta da faixa longa está em `comum/precos.py` e `site/base/precos.ts`.

```bash
uv run python -m janela_de_contexto                            # gera pagina/dados.json e testes/casos.json
uv run python -m janela_de_contexto --registro <sessão.jsonl>  # mede de novo a partir do registro do Claude Code
```

O plano da série está em [`planos/serie-ia.md`](../../planos/serie-ia.md).
