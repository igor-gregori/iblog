"""Pastas do post."""

from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
REPOSITORIO = RAIZ.parents[1]  # a raiz do iblog
TAREFAS = REPOSITORIO / "kit" / "tarefas"  # pedido, especificação e testes escondidos de cada tarefa

EXECUCOES = RAIZ / "dados" / "execucoes"  # um .json por execução (números) e os diffs do código que o agente escreveu
PRIMEIRO_LOTE = EXECUCOES / "primeiro-lote"  # as execuções de A e B com a mensagem de correção antiga
PAGINA = RAIZ / "pagina"  # onde fica o dados.json que a página lê
