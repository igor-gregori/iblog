"""Pastas do post."""

from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]

MANUAIS = RAIZ / "dados" / "manuais"  # dados coletados ou transcritos à mão
AMOSTRAS = MANUAIS / "amostras"  # os textos que o post mede
PAGINA = RAIZ / "pagina"  # onde fica o dados.json que a página lê
TESTES = RAIZ / "testes"  # casos de teste que o TypeScript confere contra o Python
