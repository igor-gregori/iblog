"""Informe mensal dos fundos imobiliários (dados abertos da CVM).

Fonte: https://dados.cvm.gov.br/dataset/fii-doc-inf_mensal
Daqui sai o rendimento distribuído pelos fundos (dividend yield), que o IFIX,
por ser de retorno total, não mostra separado.

Atenção: o dividend yield do informe é calculado sobre o valor patrimonial da
cota, não sobre o preço na bolsa.
"""

import zipfile
from datetime import date
from pathlib import Path

import pandas as pd

from comum import http

from ..caminhos import BRUTOS

URL = "https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_{ano}.zip"
PASTA = BRUTOS / "cvm_fii"
PRIMEIRO_ANO = 2016

# Em 2023 a CVM passou a identificar "fundo ou classe" e renomeou duas colunas.
NOMES_ANTIGOS = {"CNPJ_Fundo": "CNPJ_Fundo_Classe", "Nome_Fundo": "Nome_Fundo_Classe"}
CHAVE = ["CNPJ_Fundo_Classe", "Data_Referencia", "Versao"]

COLUNAS = {
    "Data_Referencia": "data",
    "CNPJ_Fundo_Classe": "cnpj",
    "Nome_Fundo_Classe": "nome",
    "Segmento_Atuacao": "segmento",
    "Mercado_Negociacao_Bolsa": "negociado_em_bolsa",
    "Total_Numero_Cotistas": "cotistas",
    "Patrimonio_Liquido": "patrimonio_liquido",
    "Percentual_Dividend_Yield_Mes": "dividend_yield_mes",
}


def baixar(atualizar: bool = False) -> list[Path]:
    return [
        http.baixar(URL.format(ano=ano), PASTA / f"inf_mensal_fii_{ano}.zip", atualizar=atualizar)
        for ano in range(PRIMEIRO_ANO, date.today().year + 1)
    ]


def ler(pasta: Path = PASTA) -> pd.DataFrame:
    """Uma linha por fundo e mês, com as colunas de `COLUNAS`."""
    anos = []
    for arquivo in sorted(pasta.glob("inf_mensal_fii_*.zip")):
        ano = arquivo.stem.removeprefix("inf_mensal_fii_")
        with zipfile.ZipFile(arquivo) as pacote:
            geral = _ler_csv(pacote, f"inf_mensal_fii_geral_{ano}.csv")
            complemento = _ler_csv(pacote, f"inf_mensal_fii_complemento_{ano}.csv")
        anos.append(geral.merge(complemento, on=CHAVE))

    tabela = pd.concat(anos, ignore_index=True)
    # Um informe reapresentado ganha um número de versão maior: fica só o último.
    tabela = tabela.sort_values("Versao").drop_duplicates(["CNPJ_Fundo_Classe", "Data_Referencia"], keep="last")

    tabela = tabela[list(COLUNAS)].rename(columns=COLUNAS)
    tabela["data"] = pd.to_datetime(tabela["data"])
    tabela["negociado_em_bolsa"] = tabela["negociado_em_bolsa"] == "S"
    return tabela.sort_values(["data", "cnpj"], ignore_index=True)


def _ler_csv(pacote: zipfile.ZipFile, nome: str) -> pd.DataFrame:
    with pacote.open(nome) as arquivo:
        tabela = pd.read_csv(arquivo, sep=";", encoding="latin-1", low_memory=False)
    return tabela.rename(columns=NOMES_ANTIGOS)
