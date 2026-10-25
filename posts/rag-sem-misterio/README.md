# O que é RAG, e quando você não precisa dele?

O sétimo post da série "IA para quem já programa": RAG montado em TypeScript e medido nos documentos do próprio
blog, com 32 perguntas de teste. Divisão em pedaços, busca por palavras (BM25), por significado (embeddings) e
híbrida, e quando pôr tudo no contexto ou deixar o agente usar o `grep` resolve.

- **O corpus.** `dados/corpus/`: os `CLAUDE.md` e `README.md` do blog e o plano da série, copiados em 24/10/2026.
- **As perguntas.** `dados/manuais/perguntas.csv`, cada uma com o trecho que a responde.
- **As contas.** `analise/pedacos.py`, `analise/busca.py` e `analise/conta.py`, repetidas em `pagina/*.ts`.
- **Os embeddings.** `analise/embeddings.py`, com o `intfloat/multilingual-e5-large` rodando na máquina; o resultado
  fica em `dados/manuais/similaridades.csv`; o mapa dos vetores e a busca sem o arquivo e os títulos, em
  `mapa.csv` e `sem_lugar.csv`.
- **A sessão real.** `dados/manuais/sessao.json`: quantas vezes o agente procurou com `grep`, `find` ou `ls`, só os
  números.

```bash
uv run python -m rag_sem_misterio                                   # gera pagina/dados.json e testes/casos.json
uv run --group embeddings python -m rag_sem_misterio --embeddings   # calcula de novo os embeddings (baixa 2,2 GB)
uv run python -m rag_sem_misterio --registro <sessão.jsonl>         # conta de novo as buscas da sessão real
```

O plano da série está em [`planos/serie-ia.md`](../../planos/serie-ia.md).
