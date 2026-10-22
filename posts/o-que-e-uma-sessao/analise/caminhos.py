"""Pastas do post."""

from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]

MANUAIS = RAIZ / "dados" / "manuais"  # dados coletados ou transcritos à mão
SESSAO_REAL = MANUAIS / "sessao-real.csv"  # o uso de tokens de uma sessão real do Claude Code, chamada por chamada
PAGINA = RAIZ / "pagina"  # onde fica o dados.json que a página lê
TESTES = RAIZ / "testes"  # casos de teste que o TypeScript confere contra o Python
