"""Ibovespa: o principal índice de ações da B3.

É um índice de retorno total: os dividendos são reinvestidos na carteira.

A B3 não documenta este endereço; ele é o que alimenta a página
https://sistemaswebb3-listados.b3.com.br/indexStatisticsPage/daily-evolution/IBOV
Por isso as respostas brutas ficam versionadas em `data/raw/b3_ibovespa`.
"""

import base64
import json
from datetime import date
from pathlib import Path

import pandas as pd

from ..caminhos import BRUTOS
from . import http

URL = "https://sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetPortfolioDay/"
PASTA = BRUTOS / "b3_ibovespa"
PRIMEIRO_ANO = 1994

# Nestas datas a bolsa dividiu o índice por 10. A série da B3 traz os pontos como
# eram divulgados em cada dia; aqui os valores antigos são trazidos para a escala atual.
DIVISOES_POR_DEZ = ["1994-02-10", "1997-03-03"]


def baixar(atualizar: bool = False) -> list[Path]:
    """Uma chamada por ano: a resposta é uma grade de dia × mês com o fechamento."""
    arquivos = []
    for ano in range(PRIMEIRO_ANO, date.today().year + 1):
        consulta = json.dumps({"index": "IBOV", "language": "pt-br", "year": str(ano)}, separators=(",", ":"))
        parametros = base64.b64encode(consulta.encode()).decode()
        arquivos.append(http.baixar(URL + parametros, PASTA / f"ibov_{ano}.json", atualizar=atualizar))
    return arquivos


def ler(pasta: Path = PASTA) -> pd.DataFrame:
    """Fechamento diário do Ibovespa, na escala de pontos de hoje. Colunas: data, ibov."""
    registros = []
    for arquivo in sorted(pasta.glob("ibov_*.json")):
        ano = int(arquivo.stem.removeprefix("ibov_"))
        for linha in json.loads(arquivo.read_text())["results"]:
            for mes in range(1, 13):
                pontos = linha[f"rateValue{mes}"]
                if pontos:
                    registros.append((date(ano, mes, linha["day"]), _numero_br(pontos)))

    tabela = pd.DataFrame(registros, columns=["data", "ibov"])
    tabela["data"] = pd.to_datetime(tabela["data"])
    for divisao in DIVISOES_POR_DEZ:
        tabela.loc[tabela["data"] < divisao, "ibov"] /= 10
    return tabela.sort_values("data", ignore_index=True)


def _numero_br(texto: str) -> float:
    """'109.523,85' → 109523.85"""
    return float(texto.replace(".", "").replace(",", "."))
