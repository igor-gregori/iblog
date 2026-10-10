"""Séries temporais do Banco Central (SGS).

Usa o serviço SOAP do SGS. A API REST mais conhecida (`api.bcb.gov.br`) não
resolvia DNS em 04/10/2026, quando este módulo foi escrito; o SOAP entrega as
mesmas séries.
"""

import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

import pandas as pd

from ..caminhos import BRUTOS
from . import http

URL = "https://www3.bcb.gov.br/wssgs/services/FachadaWSSGS"
PASTA = BRUTOS / "bcb_sgs"
INICIO = date(1994, 7, 1)  # o primeiro mês do real

# nome usado no projeto → código da série no SGS
SERIES = {
    "selic_var_mes": 4390,  # Selic acumulada no mês, % a.m.
    "cdi_var_mes": 4391,  # CDI acumulado no mês, % a.m.
    "ipca_var_mes": 433,  # IPCA, % a.m.
    "selic_meta_aa": 432,  # meta da Selic definida pelo Copom, % a.a. (diária)
    "dolar_fim": 3696,  # dólar PTAX de venda, fim do mês, R$
    "dolar_medio": 3698,  # dólar PTAX de venda, média do mês, R$
    "base_monetaria": 1788,  # papel-moeda emitido + reservas dos bancos, saldo no fim do mês, R$ mil
    "m1_antigo": 1824,  # M1 na metodologia anterior a 2018, R$ mil (vai até jun/2018)
    "m2_antigo": 1837,  # M2 na metodologia anterior a 2018, R$ mil (vai até jun/2018)
    "m1": 27791,  # papel-moeda em poder do público + depósitos à vista, R$ mil (desde dez/2001)
    "m2": 27810,  # M1 + poupança + títulos emitidos pelos bancos, R$ mil (desde dez/2001)
    "m3": 27813,  # M2 + cotas de fundos + operações compromissadas, R$ mil
    "m4": 27815,  # M3 + títulos públicos em poder do público, R$ mil
    "pib_12m": 4382,  # PIB nominal acumulado em 12 meses, R$ milhões
    "salario_minimo": 1619,  # salário mínimo, R$
    "ivgr": 21340,  # índice de valores de garantia de imóveis residenciais financiados (desde mar/2001)
}
EM_PERCENTUAL = {"selic_var_mes", "cdi_var_mes", "ipca_var_mes", "selic_meta_aa"}
# Divisor que leva cada série para bilhões de reais.
PARA_BILHOES = {
    "base_monetaria": 1e6,
    "m1_antigo": 1e6,
    "m2_antigo": 1e6,
    "m1": 1e6,
    "m2": 1e6,
    "m3": 1e6,
    "m4": 1e6,
    "pib_12m": 1e3,
}

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


def baixar(atualizar: bool = False, inicio: date = INICIO) -> list[Path]:
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
    """Uma coluna por série de `SERIES`, uma linha por mês.

    Percentuais viram fração e saldos viram bilhões de reais. A série diária
    (meta da Selic) entra com o valor do último dia de cada mês.
    """
    colunas = []
    for nome, codigo in SERIES.items():
        serie = _ler_serie(pasta / f"{codigo}_{nome}.xml")
        serie = serie.groupby(serie.index.to_period("M")).last()
        serie.index = serie.index.to_timestamp()
        if nome in EM_PERCENTUAL:
            serie = serie / 100
        serie = serie / PARA_BILHOES.get(nome, 1)
        colunas.append(serie.rename(nome))
    return pd.concat(colunas, axis=1, sort=True).rename_axis("data").reset_index()


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
