# Escrever a especificação antes do código compensa?

O décimo post da série "IA para quem já programa", e o primeiro experimento: três tarefas numa API de exemplo
(`kit/projeto`), cada uma pedida de três jeitos ao Claude Code (pedido solto, modo de plano, especificação completa),
três vezes cada, com testes escondidos que dizem se a tarefa ficou pronta.

- **As execuções.** `dados/execucoes/`: um `.json` por execução (só números: testes, correções, tokens e custo por
  etapa), o código no fim (`.diff`) e na primeira entrega (`.entrega.diff`). `primeiro-lote/` tem as execuções de A e
  B com a primeira versão da mensagem de correção.
- **A análise.** `analise/exportar_site.py` resume as execuções por tarefa e jeito de pedir; `analise/regras.py`
  classifica cada regra testada pelo tipo de decisão.
- **O experimento.** O projeto, as tarefas e os testes estão em `kit/`; o script que roda tudo, em `comum/kit.py`; o
  desenho e as decisões, em `planos/kit-de-medicao.md`.

```bash
uv run python -m especificacao_antes_do_codigo   # gera pagina/dados.json a partir de dados/execucoes/
uv run python -m comum.kit validar                # confere os testes escondidos (sem gastar uso)
```

Rodar as execuções de novo (`uv run python -m comum.kit lote --saida <pasta>`) gasta o uso do Claude Code e dá números
um pouco diferentes.

O plano da série está em [`planos/serie-ia.md`](../../planos/serie-ia.md).
