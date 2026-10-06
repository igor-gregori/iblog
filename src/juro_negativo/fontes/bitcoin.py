"""Preço do bitcoin em dólares, pela API pública de gráficos da Blockchain.com.

É a média diária das principais corretoras. Antes de julho de 2010 não havia
mercado e a série vem zerada.
https://www.blockchain.com/explorer/charts/market-price
"""

import json
from pathlib import Path

import pandas as pd

from ..caminhos import BRUTOS
from . import http

URL = "https://api.blockchain.info/charts/market-price?timespan=all&format=json&sampled=false"
ARQUIVO = BRUTOS / "bitcoin" / "market-price.json"


def baixar(atualizar: bool = False) -> Path:
    return http.baixar(URL, ARQUIVO, atualizar=atualizar)


def ler(caminho: Path = ARQUIVO) -> pd.DataFrame:
    """Preço diário. Colunas: data, btc_usd."""
    pontos = json.loads(caminho.read_text())["values"]
    tabela = pd.DataFrame(pontos).rename(columns={"x": "data", "y": "btc_usd"})
    tabela["data"] = pd.to_datetime(tabela["data"], unit="s").dt.normalize()
    return tabela[tabela["btc_usd"] > 0].reset_index(drop=True)
