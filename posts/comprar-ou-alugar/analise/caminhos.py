"""Pastas do post."""

from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]

BRUTOS = RAIZ / "dados" / "brutos"  # arquivos como vieram da fonte (cache de download)
TRATADOS = RAIZ / "dados" / "tratados"  # tabelas limpas, em parquet
MANUAIS = RAIZ / "dados" / "manuais"  # dados coletados ou transcritos à mão
PAGINA = RAIZ / "pagina"  # onde fica o dados.json que a página lê
TESTES = RAIZ / "testes"  # casos de teste que o TypeScript confere contra o Python
