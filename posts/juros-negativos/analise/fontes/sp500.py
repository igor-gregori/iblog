"""S&P 500 mensal, com dividendos.

Base aberta mantida em https://github.com/datasets/s-and-p-500, que reúne a
série do economista Robert Shiller (preço médio do mês e dividendos dos últimos
12 meses) e a completa com os meses recentes.
"""

from pathlib import Path

import pandas as pd

from comum import http

from ..caminhos import BRUTOS

URL = "https://raw.githubusercontent.com/datasets/s-and-p-500/main/data/data.csv"
ARQUIVO = BRUTOS / "sp500" / "data.csv"


def baixar(atualizar: bool = False) -> Path:
    return http.baixar(URL, ARQUIVO, atualizar=atualizar)


def ler(caminho: Path = ARQUIVO) -> pd.DataFrame:
    """Colunas: data, sp500 (média do mês, em pontos), sp500_dividendo_12m (em pontos; vazio se não divulgado)."""
    bruto = pd.read_csv(caminho, usecols=["Date", "SP500", "Dividend"], parse_dates=["Date"])
    tabela = bruto.rename(columns={"Date": "data", "SP500": "sp500", "Dividend": "sp500_dividendo_12m"})
    # Nos meses mais recentes o dividendo ainda não foi divulgado e vem como zero.
    tabela["sp500_dividendo_12m"] = tabela["sp500_dividendo_12m"].where(tabela["sp500_dividendo_12m"] > 0)
    return tabela[tabela["sp500"] > 0].reset_index(drop=True)
