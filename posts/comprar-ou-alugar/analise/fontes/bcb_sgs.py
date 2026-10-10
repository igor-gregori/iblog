"""Séries temporais do Banco Central (SGS).

Usa o serviço SOAP do SGS. A API REST mais conhecida (`api.bcb.gov.br`) não
resolvia DNS em 03/10/2026, quando este módulo foi escrito; o SOAP entrega as
mesmas séries.
"""

import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

import pandas as pd

from comum import http

from ..caminhos import BRUTOS

URL = "https://www3.bcb.gov.br/wssgs/services/FachadaWSSGS"
PASTA = BRUTOS / "bcb_sgs"

# nome usado no projeto → código da série no SGS
SERIES = {
    "cdi_var_mes": 4391,  # CDI acumulado no mês, % a.m.
    "igpm_var_mes": 189,  # IGP-M, % a.m.
    "ivgr": 21340,  # índice de valores de garantia de imóveis residenciais financiados
    "juros_financiamento_aa": 20774,  # financiamento imobiliário PF, total, % a.a.
    "juros_financiamento_mercado_aa": 20772,  # idem, só taxas de mercado
    "juros_financiamento_regulado_aa": 20773,  # idem, só taxas reguladas (SFH, inclui MCMV)
}
SERIES_EM_PERCENTUAL = set(SERIES) - {"ivgr"}

ENVELOPE = """<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:pub="http://publico.ws.casosdeuso.sgs.pec.bcb.gov.br">
  <soapenv:Body>
    <pub:getValoresSeriesXML>
      <in0><item>{codigo}</item></in0>
      <in1>{inicio:%d/%m/%Y}</in1>
      <in2>{fim:%d/%m/%Y}</in2>
    </pub:getValoresSeriesXML>
  </soapenv:Body>
</soapenv:Envelope>"""


def baixar(atualizar: bool = False, inicio: date = date(2000, 1, 1)) -> list[Path]:
    arquivos = []
    for nome, codigo in SERIES.items():
        corpo = ENVELOPE.format(codigo=codigo, inicio=inicio, fim=date.today())
        arquivos.append(
            http.baixar(
                URL,
                PASTA / f"{codigo}_{nome}.xml",
                atualizar=atualizar,
                dados=corpo.encode(),
                cabecalhos={"Content-Type": "text/xml; charset=utf-8", "SOAPAction": '""'},
            )
        )
    return arquivos


def ler(pasta: Path = PASTA) -> pd.DataFrame:
    """Uma coluna por série de `SERIES`, uma linha por mês. Percentuais viram fração."""
    colunas = []
    for nome, codigo in SERIES.items():
        serie = _ler_serie(pasta / f"{codigo}_{nome}.xml").rename(nome)
        if nome in SERIES_EM_PERCENTUAL:
            serie = serie / 100
        colunas.append(serie)
    return pd.concat(colunas, axis=1).sort_index().rename_axis("data").reset_index()


def _ler_serie(caminho: Path) -> pd.Series:
    # A resposta é um envelope SOAP cujo conteúdo é outro XML, guardado como texto.
    envelope = ET.parse(caminho).getroot()
    interno = ET.fromstring(envelope.find(".//getValoresSeriesXMLReturn").text.strip().encode("latin-1"))

    datas, valores = [], []
    for item in interno.iter("ITEM"):
        valor = item.findtext("VALOR")
        if valor:
            datas.append(_data(item.findtext("DATA")))
            valores.append(float(valor))
    return pd.Series(valores, index=pd.DatetimeIndex(datas))


def _data(texto: str) -> pd.Timestamp:
    """Séries mensais vêm como 'm/aaaa'; diárias, como 'd/m/aaaa'."""
    partes = [int(p) for p in texto.split("/")]
    if len(partes) == 2:
        mes, ano = partes
        return pd.Timestamp(year=ano, month=mes, day=1)
    dia, mes, ano = partes
    return pd.Timestamp(year=ano, month=mes, day=dia)
