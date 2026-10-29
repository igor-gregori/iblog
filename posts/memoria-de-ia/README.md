# O que é a memória de uma IA, e onde ela fica?

O oitavo post da série "IA para quem já programa": o modelo não aprende com o uso, e toda memória é texto que volta
para o pedido. Os três jeitos de fazer isso (um arquivo lido no começo, um resumo, uma busca), quem escreve a memória
(o `CLAUDE.md` e a memória automática do Claude Code, a dos apps do Claude e a do ChatGPT), quanto ela custou numa
sessão real e como os `CLAUDE.md` deste blog cresceram.

- **A sessão real.** `dados/manuais/cargas.csv` (cada vez que um `CLAUDE.md` entrou no pedido) e
  `dados/manuais/pedidos.csv` (cada chamada, com o uso do cache e a parte que era memória), só números, tirados do
  registro da sessão do Claude Code em que os posts 4 a 7 foram escritos. A calibração entre o `o200k_base` e os tokens
  do Claude fica em `dados/manuais/calibracao.json`.
- **O histórico.** `dados/manuais/historico.csv`: linhas e tokens dos `CLAUDE.md` do blog, dia a dia, pelo git.
- **A memória automática.** `dados/manuais/memoria_automatica.json`: quantas memórias o Claude Code escreveu na
  máquina do Igor, por tipo, sem nomes nem textos.
- **As contas.** `analise/conta.py`, repetida em `pagina/conta.ts`.

```bash
uv run python -m memoria_de_ia                            # gera pagina/dados.json e testes/casos.json
uv run python -m memoria_de_ia --registro <sessão.jsonl>  # mede de novo a memória numa sessão do Claude Code
uv run python -m memoria_de_ia --historico                # mede de novo os CLAUDE.md pelo git
uv run python -m memoria_de_ia --automatica               # conta de novo a memória automática desta máquina
```

O plano da série está em [`planos/serie-ia.md`](../../planos/serie-ia.md).
