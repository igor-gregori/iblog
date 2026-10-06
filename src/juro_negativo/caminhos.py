"""Pastas do projeto."""

from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]

BRUTOS = RAIZ / "data" / "raw"  # arquivos como vieram da fonte (cache de download)
TRATADOS = RAIZ / "data" / "processed"  # tabelas limpas, em parquet
MANUAIS = RAIZ / "data" / "manual"  # dados transcritos à mão (os números citados no texto analisado)
SITE_DADOS = RAIZ / "site" / "public" / "data"  # JSON consumido pela página
SITE_TESTES = RAIZ / "site" / "test"  # casos de teste da conta em TypeScript
