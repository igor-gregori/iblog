"""Amostra de anúncios de apartamentos em Varginha (MG).

A cidade não está no FipeZAP. `data/manual/varginha_anuncios.csv` é uma coleta
pontual, com a origem e a data de cada anúncio; para ampliar a amostra, basta
acrescentar linhas ao arquivo.
"""

from pathlib import Path

import pandas as pd

from ..caminhos import MANUAIS

ARQUIVO = MANUAIS / "varginha_anuncios.csv"

# R$ por m². Fora destas faixas o anúncio só pode ter área ou preço digitados errado
# (em São Paulo, a cidade mais cara do FipeZAP, o m² custa perto de R$ 12 mil).
FAIXAS_PLAUSIVEIS = {"venda": (1_000, 15_000), "aluguel": (8, 60)}


def ler(caminho: Path = ARQUIVO) -> pd.DataFrame:
    """Todos os anúncios, com a coluna `preco_m2` calculada."""
    anuncios = pd.read_csv(caminho)
    anuncios["preco_m2"] = anuncios["preco"] / anuncios["area_m2"]
    return anuncios


def plausivel(anuncios: pd.DataFrame) -> pd.Series:
    """Verdadeiro para os anúncios cujo preço por m² está dentro de `FAIXAS_PLAUSIVEIS`."""
    dentro = pd.Series(False, index=anuncios.index)
    for negocio, (minimo, maximo) in FAIXAS_PLAUSIVEIS.items():
        dentro |= (anuncios["negocio"] == negocio) & anuncios["preco_m2"].between(minimo, maximo)
    return dentro
