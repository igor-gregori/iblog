"""Nascimentos registrados em cartório, pela API do SIDRA (IBGE), tabela 2609.

É a Estatística do Registro Civil: quantas crianças nascidas vivas foram
registradas em cada ano. Documentação da API: https://apisidra.ibge.gov.br/
"""

import json
from pathlib import Path

import pandas as pd

from ..caminhos import BRUTOS
from . import http

# Tabela 2609, Brasil (n1), nascidos vivos registrados no ano (todas as variáveis absolutas), todos os anos.
URL = "https://apisidra.ibge.gov.br/values/t/2609/n1/all/v/allxp/p/all"
ARQUIVO = BRUTOS / "ibge_sidra" / "nascimentos.json"


def baixar(atualizar: bool = False) -> Path:
    return http.baixar(URL, ARQUIVO, atualizar=atualizar)


def ler(caminho: Path = ARQUIVO) -> pd.DataFrame:
    """Colunas: ano, nascimentos."""
    linhas = json.loads(caminho.read_text())[1:]  # a primeira linha é o cabeçalho
    bruto = pd.DataFrame(linhas)
    tabela = pd.DataFrame({"ano": bruto["D3C"].astype(int), "nascimentos": pd.to_numeric(bruto["V"], errors="coerce")})
    return tabela.dropna().astype({"nascimentos": int}).sort_values("ano", ignore_index=True)
