"""IFIX: índice de fundos imobiliários da B3.

É um índice de retorno total, ou seja, já considera os rendimentos distribuídos
reinvestidos. Começa em 1.000 pontos em 30/12/2010.

A B3 não documenta este endereço; ele é o que alimenta a página
https://sistemaswebb3-listados.b3.com.br/indexStatisticsPage/daily-evolution/IFIX
Por isso as respostas brutas ficam versionadas em `data/raw/b3_ifix`.
"""

import base64
import json
from datetime import date
from pathlib import Path

import pandas as pd

from comum import http

from ..caminhos import BRUTOS

URL = "https://sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetPortfolioDay/"
PASTA = BRUTOS / "b3_ifix"
PRIMEIRO_ANO = 2010


def baixar(atualizar: bool = False) -> list[Path]:
    """Uma chamada por ano: a resposta é uma grade de dia × mês com o fechamento."""
    arquivos = []
    for ano in range(PRIMEIRO_ANO, date.today().year + 1):
        consulta = json.dumps({"index": "IFIX", "language": "pt-br", "year": str(ano)}, separators=(",", ":"))
        parametros = base64.b64encode(consulta.encode()).decode()
        arquivos.append(http.baixar(URL + parametros, PASTA / f"ifix_{ano}.json", atualizar=atualizar))
    return arquivos


def ler(pasta: Path = PASTA) -> pd.DataFrame:
    """Fechamento diário do IFIX. Colunas: data, ifix."""
    registros = []
    for arquivo in sorted(pasta.glob("ifix_*.json")):
        ano = int(arquivo.stem.removeprefix("ifix_"))
        for linha in json.loads(arquivo.read_text())["results"]:
            for mes in range(1, 13):
                pontos = linha[f"rateValue{mes}"]
                if pontos:
                    registros.append((date(ano, mes, linha["day"]), _numero_br(pontos)))

    tabela = pd.DataFrame(registros, columns=["data", "ifix"])
    tabela["data"] = pd.to_datetime(tabela["data"])
    return tabela.sort_values("data", ignore_index=True)


def _numero_br(texto: str) -> float:
    """'3.771,85' → 3771.85"""
    return float(texto.replace(".", "").replace(",", "."))
