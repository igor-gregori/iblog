"""Pastas do post."""

from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
REPOSITORIO = RAIZ.parents[1]  # a raiz do iblog, onde ficam o git e o CLAUDE.md principal

MANUAIS = RAIZ / "dados" / "manuais"  # dados medidos uma vez e guardados (só números)
CARGAS = MANUAIS / "cargas.csv"  # cada vez que um CLAUDE.md entrou num pedido da sessão real
PEDIDOS = MANUAIS / "pedidos.csv"  # cada chamada da sessão real: tamanho, cache e quanto era memória
CALIBRACAO = MANUAIS / "calibracao.json"  # o fator entre o o200k_base e os tokens do Claude nessa sessão
HISTORICO = MANUAIS / "historico.csv"  # o tamanho dos CLAUDE.md do blog, dia a dia, pelo git
AUTOMATICA = MANUAIS / "memoria_automatica.json"  # o que a memória automática do Claude Code guardou na máquina
PAGINA = RAIZ / "pagina"  # onde fica o dados.json que a página lê
TESTES = RAIZ / "testes"  # casos de teste que o TypeScript confere contra o Python
