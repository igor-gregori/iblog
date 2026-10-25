# O que é uma sessão, e por que ela fica mais cara a cada passo?

O quarto post da série "IA para quem já programa": por que cada chamada de um agente reenvia a conversa inteira,
por que o custo de uma sessão cresce em curva e como o cache de prompt de Anthropic, OpenAI e Google achata essa
curva. Com uma sessão simulada e uma sessão real do Claude Code, de 214 chamadas.

- **A conta.** `analise/sessao.py` (Python, a referência) e `pagina/sessao.ts` (a mesma conta no navegador).
  `npm test` confere que as duas dão os mesmos números.
- **A sessão real.** `dados/manuais/sessao-real.csv`: os tokens de cada chamada (fora do cache, gravados, lidos e
  de saída) e os minutos desde o início, extraídos do registro do Claude Code por `analise/registro.py`. Nenhum
  texto da conversa sai do registro.
- **Preços.** `comum/precos.csv` (compartilhado com o post 3), com a gravação no cache conferida em 21/10/2026.

```bash
uv run python -m o_que_e_uma_sessao                            # gera pagina/dados.json e testes/casos.json
uv run python -m o_que_e_uma_sessao --registro <sessão.jsonl>  # extrai de novo a sessão real
```

O plano da série está em [`planos/serie-ia.md`](../../planos/serie-ia.md).
