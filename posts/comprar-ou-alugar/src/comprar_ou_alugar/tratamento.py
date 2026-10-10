"""Junta as fontes em três tabelas tratadas.

- `mensal`: uma linha por mês com os indicadores nacionais (IPCA, CDI, IFIX...).
- `cidades`: o FipeZAP por cidade, com os preços também em valores reais.
- `fiis`: o informe mensal da CVM, um fundo por linha.
"""

import pandas as pd

# Filtros para o dividend yield "do mercado": fundos de varejo listados em bolsa,
# descartando valores que só podem ser erro de preenchimento do informe.
MINIMO_COTISTAS = 1000
DY_MAXIMO_MES = 0.05
MINIMO_FUNDOS_NO_MES = 50


def montar_mensal(
    ipca: pd.DataFrame, sgs: pd.DataFrame, ifix: pd.DataFrame, tesouro: pd.DataFrame, fiis: pd.DataFrame
) -> pd.DataFrame:
    """Indicadores nacionais, do primeiro mês do IPCA em 2000 ao último mês completo do IFIX."""
    ifix_mensal = ifix_fim_de_mes(ifix)

    mensal = (
        ipca.merge(sgs, on="data", how="outer")
        .merge(ifix_mensal, on="data", how="outer")
        .merge(tesouro, on="data", how="outer")
        .merge(dividend_yield_do_mercado(fiis), on="data", how="outer")
        .sort_values("data", ignore_index=True)
    )
    mensal["ifix_var_mes"] = mensal["ifix"].pct_change(fill_method=None)

    periodo = mensal["data"].between("2000-01-01", ifix_mensal["data"].max())
    return mensal[periodo].reset_index(drop=True)


def ifix_fim_de_mes(ifix: pd.DataFrame) -> pd.DataFrame:
    """Último fechamento de cada mês. Colunas: data (primeiro dia do mês), ifix.

    O mês da última cotação pode estar pela metade, então fica de fora.
    """
    por_mes = ifix.groupby(ifix["data"].dt.to_period("M"))["ifix"].last().iloc[:-1]
    tabela = por_mes.rename_axis("data").reset_index()
    tabela["data"] = tabela["data"].dt.to_timestamp()
    return tabela


def dividend_yield_do_mercado(fiis: pd.DataFrame) -> pd.DataFrame:
    """Dividend yield mensal dos FIIs, ponderado pelo patrimônio. Colunas: data, fii_dividend_yield_mes."""
    validos = fiis[
        fiis["negociado_em_bolsa"]
        & (fiis["cotistas"] >= MINIMO_COTISTAS)
        & (fiis["patrimonio_liquido"] > 0)
        & fiis["dividend_yield_mes"].between(0, DY_MAXIMO_MES)
    ]
    distribuido = (validos["dividend_yield_mes"] * validos["patrimonio_liquido"]).groupby(validos["data"]).sum()
    patrimonio = validos.groupby("data")["patrimonio_liquido"].sum()
    fundos = validos.groupby("data").size()

    # Meses com poucos informes (o começo da série e o mês mais recente,
    # que ainda está sendo entregue) não representam o mercado.
    dy = (distribuido / patrimonio)[fundos >= MINIMO_FUNDOS_NO_MES]
    dy = dy[fundos.reindex(dy.index) >= 0.9 * fundos.reindex(dy.index).rolling(3, min_periods=1).max()]
    return dy.rename("fii_dividend_yield_mes").reset_index()


def montar_cidades(fipezap: pd.DataFrame, mensal: pd.DataFrame) -> pd.DataFrame:
    """Acrescenta ao FipeZAP os preços em reais do último mês com IPCA divulgado."""
    ipca = mensal.set_index("data")["ipca_indice"].dropna()
    correcao = fipezap["data"].map(ipca.iloc[-1] / ipca)  # fica vazio nos meses ainda sem IPCA

    cidades = fipezap.copy()
    cidades["venda_preco_m2_real"] = cidades["venda_preco_m2"] * correcao
    cidades["aluguel_preco_m2_real"] = cidades["aluguel_preco_m2"] * correcao
    return cidades
