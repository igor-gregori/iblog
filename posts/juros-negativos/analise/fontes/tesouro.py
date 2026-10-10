"""Taxas do Tesouro Direto (Tesouro Transparente).

A taxa do Tesouro IPCA+ (sem juros semestrais) é o juro real que o investidor
contrata no dia da compra: quanto o título paga acima da inflação até o vencimento.
"""

from pathlib import Path

import pandas as pd

from comum import http

from ..caminhos import BRUTOS

URL = (
    "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/"
    "resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv"
)
ARQUIVO = BRUTOS / "tesouro" / "PrecoTaxaTesouroDireto.csv"


def baixar(atualizar: bool = False) -> Path:
    return http.baixar(URL, ARQUIVO, atualizar=atualizar)


def ler(caminho: Path = ARQUIVO) -> pd.DataFrame:
    """Taxa real média do Tesouro IPCA+ em cada mês. Colunas: data, tesouro_ipca_taxa_aa (fração).

    Em cada dia há vários vencimentos à venda; a taxa do dia é a média entre eles,
    e a do mês é a média dos dias.
    """
    bruto = pd.read_csv(caminho, sep=";", decimal=",", usecols=["Tipo Titulo", "Data Base", "Taxa Compra Manha"])
    ipca = bruto[bruto["Tipo Titulo"] == "Tesouro IPCA+"]

    dias = pd.to_datetime(ipca["Data Base"], format="%d/%m/%Y")
    por_dia = ipca.groupby(dias)["Taxa Compra Manha"].mean()
    por_mes = por_dia.groupby(por_dia.index.to_period("M")).mean() / 100

    tabela = por_mes.rename("tesouro_ipca_taxa_aa").rename_axis("data").reset_index()
    tabela["data"] = tabela["data"].dt.to_timestamp()
    return tabela
