"""IPCA, pela API do SIDRA (IBGE), tabela 1737.

Documentação da API: https://apisidra.ibge.gov.br/
"""

import json
from pathlib import Path

import pandas as pd

from comum import http

from ..caminhos import BRUTOS

# Tabela 1737, Brasil (n1), variáveis 2266 (número-índice) e 63 (variação mensal), todos os meses.
URL_IPCA = "https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/2266,63/p/all"
ARQUIVO_IPCA = BRUTOS / "ibge_sidra" / "ipca.json"

VARIAVEIS = {"2266": "ipca_indice", "63": "ipca_var_mes"}


def baixar(atualizar: bool = False) -> Path:
    return http.baixar(URL_IPCA, ARQUIVO_IPCA, atualizar=atualizar)


def ler(caminho: Path = ARQUIVO_IPCA) -> pd.DataFrame:
    """Colunas: data (primeiro dia do mês), ipca_indice, ipca_var_mes (fração)."""
    linhas = json.loads(caminho.read_text())[1:]  # a primeira linha é o cabeçalho
    bruto = pd.DataFrame(linhas)

    bruto["data"] = pd.to_datetime(bruto["D3C"], format="%Y%m")
    bruto["variavel"] = bruto["D2C"].map(VARIAVEIS)
    bruto["valor"] = pd.to_numeric(bruto["V"], errors="coerce")  # "..." = não disponível

    tabela = bruto.pivot(index="data", columns="variavel", values="valor").reset_index()
    tabela.columns.name = None
    tabela["ipca_var_mes"] = tabela["ipca_var_mes"] / 100
    return tabela.dropna(subset="ipca_indice").reset_index(drop=True)
