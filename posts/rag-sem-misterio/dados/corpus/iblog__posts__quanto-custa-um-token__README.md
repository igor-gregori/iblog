# O que é um token, e quanto ele custa?

O terceiro post da série "IA para quem já programa": o que é um token, o que faz um texto gastar mais tokens e
quanto custa um pedido em dez modelos da Anthropic, da OpenAI e do Google.

- **Contagem.** O tokenizador aberto `o200k_base` (o do GPT-4o e da família GPT-5): em Python pelo `tiktoken`
  (`analise/tokens.py`) e no navegador pelo `gpt-tokenizer` (`pagina/tokens.ts`). `npm test` confere que os dois
  dão os mesmos tokens.
- **Amostras.** `dados/manuais/amostras/`: o mesmo parágrafo em português e em inglês, um pedido em JSON (com e
  sem recuo) e uma função TypeScript.
- **Preços.** `comum/precos.csv` (compartilhado com o post 4), transcritos das páginas oficiais em 18/10/2026. Mudam com frequência.

```bash
uv run python -m quanto_custa_um_token   # mede as amostras e gera pagina/dados.json e testes/casos.json
```

O plano da série está em [`planos/serie-ia.md`](../../planos/serie-ia.md).
