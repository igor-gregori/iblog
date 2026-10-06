"""Banco Mundial: preço do ouro (Pink Sheet) e indicadores de população e PIB (API).

O ouro vem da planilha mensal de preços de commodities, a "Pink Sheet": é a
média do mês em Londres, em dólares por onça troy. Os indicadores de população
vêm da base "Population estimates and projections", que segue as projeções da
ONU e vai até 2050.

Documentação da API: https://datahelpdesk.worldbank.org/knowledgebase/topics/125589
"""

import json
import re
from pathlib import Path

import pandas as pd

from ..caminhos import BRUTOS
from . import http

PASTA = BRUTOS / "banco_mundial"

PAGINA_COMMODITIES = "https://www.worldbank.org/en/research/commodity-markets"
# O endereço da planilha muda de tempos em tempos; a página acima sempre aponta para o atual.
URL_PINK_SHEET = (
    "https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/"
    "related/CMO-Historical-Data-Monthly.xlsx"
)
ARQUIVO_PINK_SHEET = PASTA / "CMO-Historical-Data-Monthly.xlsx"

API = "https://api.worldbank.org/v2/country/{paises}/indicator/{indicadores}?source={base}&format=json&per_page=20000"
BASE_WDI, BASE_POPULACAO = 2, 40

FAIXAS_DE_IDADE = [f"{i:02d}{i + 4:02d}" for i in range(0, 80, 5)] + ["80UP"]  # "0004", "0509", ..., "7579", "80UP"
PAISES_DEMOGRAFIA = ["BRA", "JPN", "USA", "CHN", "KOR", "ITA", "ARG", "WLD"]

# Uma chamada por consulta: (base, países, {código do indicador: nome usado no projeto}).
CONSULTAS = {
    "demografia": (
        BASE_POPULACAO,
        PAISES_DEMOGRAFIA,
        {
            "SP.DYN.TFRT.IN": "fecundidade",  # filhos por mulher
            "SP.POP.TOTL": "populacao",
            "SP.POP.DPND.OL": "dependencia_idosos",  # pessoas de 65 anos ou mais para cada 100 de 15 a 64
        },
    ),
    "idades": (
        BASE_POPULACAO,
        ["BRA"],
        {
            f"SP.POP.{faixa}.{codigo}": f"idade_{faixa}_{sexo}"
            for faixa in FAIXAS_DE_IDADE
            for sexo, codigo in (("homens", "MA"), ("mulheres", "FE"))
        },
    ),
    "economia": (
        BASE_WDI,
        ["BRA"],
        {
            "NY.GDP.MKTP.CD": "pib_dolares",  # PIB em dólares correntes
            "NY.GDP.MKTP.KN": "pib_real",  # PIB em reais constantes
            "NY.GDP.PCAP.KN": "pib_real_por_pessoa",
            "SM.POP.NETM": "migracao_liquida",  # entradas menos saídas de pessoas no ano
        },
    ),
}


def baixar(atualizar: bool = False) -> list[Path]:
    arquivos = [http.baixar(_url_da_pink_sheet(atualizar), ARQUIVO_PINK_SHEET, atualizar=atualizar)]
    for nome, (base, paises, indicadores) in CONSULTAS.items():
        url = API.format(paises=";".join(paises), indicadores=";".join(indicadores), base=base)
        arquivos.append(http.baixar(url, PASTA / f"{nome}.json", atualizar=atualizar))
    return arquivos


def _url_da_pink_sheet(procurar: bool) -> str:
    if not procurar and ARQUIVO_PINK_SHEET.exists():
        return URL_PINK_SHEET  # não vai ser usado: o arquivo já está em disco
    try:
        pagina = http.texto(PAGINA_COMMODITIES)
        return re.search(r'https://thedocs\.worldbank\.org[^"]+CMO-Historical-Data-Monthly\.xlsx', pagina).group(0)
    except Exception:  # noqa: BLE001 - qualquer falha aqui cai no último endereço conhecido
        return URL_PINK_SHEET


def ler_ouro(caminho: Path = ARQUIVO_PINK_SHEET) -> pd.DataFrame:
    """Preço médio do ouro em cada mês. Colunas: data, ouro_usd (dólares por onça troy)."""
    planilha = pd.read_excel(caminho, sheet_name="Monthly Prices", header=None)
    titulos = planilha.iloc[4].astype("string")
    coluna = titulos[titulos == "Gold"].index
    if len(coluna) != 1 or "troy oz" not in str(planilha.iloc[5, coluna[0]]):
        raise ValueError("A Pink Sheet mudou de formato: a coluna 'Gold ($/troy oz)' não está onde deveria.")

    meses = planilha[0].astype("string")
    linhas = meses.str.fullmatch(r"\d{4}M\d{2}", na=False)
    tabela = pd.DataFrame(
        {
            "data": pd.to_datetime(meses[linhas].str.replace("M", "-"), format="%Y-%m"),
            "ouro_usd": pd.to_numeric(planilha.loc[linhas, coluna[0]], errors="coerce"),
        }
    )
    return tabela.dropna().reset_index(drop=True)


def ler_indicadores(pasta: Path = PASTA) -> pd.DataFrame:
    """Uma linha por indicador, país e ano. Colunas: indicador, pais (código ISO de 3 letras), ano, valor."""
    linhas = []
    for consulta, (_, _, indicadores) in CONSULTAS.items():
        _, registros = json.loads((pasta / f"{consulta}.json").read_text())
        for registro in registros:
            if registro["value"] is not None:
                nome = indicadores[registro["indicator"]["id"]]
                linhas.append((nome, registro["countryiso3code"], int(registro["date"]), float(registro["value"])))
    tabela = pd.DataFrame(linhas, columns=["indicador", "pais", "ano", "valor"])
    return tabela.sort_values(["indicador", "pais", "ano"], ignore_index=True)
