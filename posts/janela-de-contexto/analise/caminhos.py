"""Pastas do post."""

from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]

MANUAIS = RAIZ / "dados" / "manuais"  # dados coletados ou transcritos à mão
COMPOSICAO = MANUAIS / "composicao.csv"  # do que é feito o pedido de cada chamada da sessão real
CALIBRACAO = MANUAIS / "calibracao.json"  # a calibração da contagem e os números gerais da sessão real
PAGINA = RAIZ / "pagina"  # onde fica o dados.json que a página lê
TESTES = RAIZ / "testes"  # casos de teste que o TypeScript confere contra o Python
