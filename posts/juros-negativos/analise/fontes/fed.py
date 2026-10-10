"""Federal Reserve: dinheiro em circulação (H.6) e juros (H.15) dos Estados Unidos.

São os pacotes completos do Data Download Program, os mesmos números que o
FRED republica como M1SL, M2SL, FEDFUNDS e DFII10.
https://www.federalreserve.gov/datadownload/
"""

import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

import pandas as pd

from comum import http

from ..caminhos import BRUTOS

URL = "https://www.federalreserve.gov/datadownload/Output.aspx?rel={pacote}&filetype=zip"
PASTA = BRUTOS / "fed"

# nome usado no projeto → (pacote, nome da série no pacote)
SERIES = {
    "m1": ("H6", "M1.M"),  # US$ bilhões, com ajuste sazonal
    "m2": ("H6", "M2.M"),  # US$ bilhões, com ajuste sazonal
    "papel_moeda": ("H6", "RESMOC14A_N.M"),  # cédulas e moedas em circulação, US$ bilhões
    "base_monetaria": ("H6", "RESMO14A_N.M"),  # papel-moeda mais as reservas dos bancos no Fed, US$ bilhões
    "fed_funds_aa": ("H15", "RIFSPFF_N.M"),  # juro básico efetivo, média do mês, % a.a.
    "tips_10_anos_aa": ("H15", "RIFLGFCY10_XII_N.M"),  # título de 10 anos corrigido pela inflação, % a.a.
}
EM_PERCENTUAL = {"fed_funds_aa", "tips_10_anos_aa"}
SEM_DADO = "ND"  # marca as observações vazias


def baixar(atualizar: bool = False) -> list[Path]:
    pacotes = sorted({pacote for pacote, _ in SERIES.values()})
    return [http.baixar(URL.format(pacote=p), PASTA / f"{p}.zip", atualizar=atualizar) for p in pacotes]


def ler(pasta: Path = PASTA) -> pd.DataFrame:
    """Uma coluna por série de `SERIES`, uma linha por mês. Percentuais viram fração."""
    colunas = []
    for pacote in sorted({pacote for pacote, _ in SERIES.values()}):
        procuradas = {serie: nome for nome, (p, serie) in SERIES.items() if p == pacote}
        with zipfile.ZipFile(pasta / f"{pacote}.zip") as arquivo, arquivo.open(f"{pacote}_data.xml") as xml:
            colunas += _ler_series(xml, procuradas)

    tabela = pd.concat(colunas, axis=1)
    tabela[list(EM_PERCENTUAL)] = tabela[list(EM_PERCENTUAL)] / 100
    return tabela.sort_index().rename_axis("data").reset_index()


def _ler_series(xml, procuradas: dict[str, str]) -> list[pd.Series]:
    """Percorre o XML (dezenas de megabytes) sem carregar tudo na memória."""
    encontradas: dict[str, pd.Series] = {}
    for _, elemento in ET.iterparse(xml, events=("end",)):
        if not elemento.tag.endswith("}Series"):
            continue
        nome = procuradas.get(elemento.get("SERIES_NAME"))
        if nome and nome not in encontradas:  # a mesma série aparece em mais de uma tabela do pacote
            observacoes = {
                pd.Timestamp(obs.get("TIME_PERIOD")).replace(day=1): float(obs.get("OBS_VALUE"))
                for obs in elemento
                if obs.tag.endswith("}Obs") and obs.get("OBS_STATUS") != SEM_DADO
            }
            encontradas[nome] = pd.Series(observacoes, name=nome)
        elemento.clear()

    faltando = set(procuradas.values()) - set(encontradas)
    if faltando:
        raise ValueError(f"Séries não encontradas no pacote do Fed: {sorted(faltando)}")
    return list(encontradas.values())
