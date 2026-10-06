"""Projeções da população do IBGE (revisão 2024), de 2000 a 2070.

É a projeção oficial brasileira, já ajustada ao Censo de 2022. A planilha de
indicadores traz, para cada ano, a população, os nascimentos, a taxa de
fecundidade e as razões de dependência, para o Brasil e para cada estado.
https://www.ibge.gov.br/estatisticas/sociais/populacao/9109-projecao-da-populacao.html
"""

from pathlib import Path

import pandas as pd

from ..caminhos import BRUTOS
from . import http

URL = "https://ftp.ibge.gov.br/Projecao_da_Populacao/Projecao_da_Populacao_2024/projecoes_2024_tab4_indicadores.xlsx"
ARQUIVO = BRUTOS / "ibge_projecoes" / "projecoes_2024_tab4_indicadores.xlsx"

ABA = "4) INDICADORES"
LINHA_DOS_CODIGOS = 6  # a linha com o código de cada coluna (ANO, SIGLA, POP_T...); os dados começam na seguinte
BRASIL = "BR"

# código da coluna na planilha → nome usado no projeto
COLUNAS = {
    "POP_T": "populacao_ibge",
    "NASC_T": "nascimentos_ibge",
    "TFT": "fecundidade_ibge",  # filhos por mulher
    "RDI65": "dependencia_idosos_ibge",  # pessoas de 65 anos ou mais para cada 100 de 15 a 64
}


def baixar(atualizar: bool = False) -> Path:
    return http.baixar(URL, ARQUIVO, atualizar=atualizar)


def ler(caminho: Path = ARQUIVO) -> pd.DataFrame:
    """A projeção para o Brasil, uma linha por ano. Colunas: ano e as de `COLUNAS`."""
    planilha = pd.read_excel(caminho, sheet_name=ABA, header=None)
    codigos = planilha.iloc[LINHA_DOS_CODIGOS].astype("string")
    faltando = {"ANO", "SIGLA", *COLUNAS} - set(codigos.dropna())
    if faltando:
        raise ValueError(f"A planilha de projeções do IBGE mudou de formato: faltam as colunas {sorted(faltando)}.")

    dados = planilha.iloc[LINHA_DOS_CODIGOS + 1 :].set_axis(codigos.tolist(), axis=1)
    brasil = dados.loc[dados["SIGLA"] == BRASIL, ["ANO", *COLUNAS]].rename(columns={"ANO": "ano"} | COLUNAS)
    return brasil.apply(pd.to_numeric).astype({"ano": int}).sort_values("ano", ignore_index=True)
