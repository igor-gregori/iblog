"""BIS (Banco de Compensações Internacionais): juro básico e inflação ao consumidor de dezenas de países.

Os arquivos são as bases completas "Central bank policy rates" e "Consumer
prices", em https://data.bis.org/bulkdownload
"""

import zipfile
from pathlib import Path

import pandas as pd

from ..caminhos import BRUTOS
from . import http

URL = "https://data.bis.org/static/bulk/{base}_csv_flat.zip"
PASTA = BRUTOS / "bis"
BASE_JUROS, BASE_PRECOS = "WS_CBPOL", "WS_LONG_CPI"

FREQUENCIA, PAIS, PERIODO, VALOR, UNIDADE = (
    "FREQ:Frequency",
    "REF_AREA:Reference area",
    "TIME_PERIOD:Time period or range",
    "OBS_VALUE:Observation Value",
    "UNIT_MEASURE:Unit of measure",
)
MENSAL = "M: Monthly"
INDICE = "628: Index, 2010 = 100"

# código do BIS → nome em português
PAISES = {
    "BR": "Brasil",
    "US": "Estados Unidos",
    "XM": "Zona do euro",
    "JP": "Japão",
    "GB": "Reino Unido",
    "CH": "Suíça",
    "SE": "Suécia",
    "CA": "Canadá",
    "AU": "Austrália",
    "KR": "Coreia do Sul",
    "MX": "México",
    "CL": "Chile",
    "CO": "Colômbia",
    "ZA": "África do Sul",
    "IN": "Índia",
    "TR": "Turquia",
    "AR": "Argentina",
}


def baixar(atualizar: bool = False) -> list[Path]:
    return [
        http.baixar(URL.format(base=base), PASTA / f"{base}.zip", atualizar=atualizar)
        for base in (BASE_JUROS, BASE_PRECOS)
    ]


def ler_juros(pasta: Path = PASTA) -> pd.DataFrame:
    """Juro básico de cada país no fim do mês. Colunas: pais, data, juro_aa (fração)."""
    tabela = _ler(pasta / f"{BASE_JUROS}.zip", [FREQUENCIA, PAIS, PERIODO, VALOR])
    return tabela.rename(columns={VALOR: "juro_aa"}).assign(juro_aa=lambda t: t["juro_aa"] / 100)


def ler_precos(pasta: Path = PASTA) -> pd.DataFrame:
    """Índice de preços ao consumidor de cada país. Colunas: pais, data, precos_indice (2010 = 100)."""
    tabela = _ler(pasta / f"{BASE_PRECOS}.zip", [FREQUENCIA, PAIS, PERIODO, VALOR, UNIDADE], unidade=INDICE)
    return tabela.rename(columns={VALOR: "precos_indice"})


def _ler(caminho: Path, colunas: list[str], unidade: str | None = None) -> pd.DataFrame:
    """Só as linhas mensais dos países de `PAISES`. O arquivo de juros tem centenas de megabytes: é lido aos poucos."""
    pedacos = []
    with zipfile.ZipFile(caminho) as arquivo, arquivo.open(arquivo.namelist()[0]) as csv:
        for pedaco in pd.read_csv(csv, usecols=colunas, chunksize=200_000):
            manter = (pedaco[FREQUENCIA] == MENSAL) & pedaco[PAIS].str[:2].isin(PAISES)
            if unidade:
                manter &= pedaco[UNIDADE] == unidade
            pedacos.append(pedaco.loc[manter, [PAIS, PERIODO, VALOR]])

    tabela = pd.concat(pedacos).dropna()
    tabela["pais"] = tabela[PAIS].str[:2].map(PAISES)
    tabela["data"] = pd.to_datetime(tabela[PERIODO], format="%Y-%m")
    return tabela[["pais", "data", VALOR]].sort_values(["pais", "data"], ignore_index=True)
