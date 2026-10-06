"""Junta as fontes em quatro tabelas tratadas.

- `brasil`: uma linha por mês, de jul/1994 (o primeiro mês do real) ao último mês com todos os dados.
- `eua`: o mesmo para os Estados Unidos, desde 1990.
- `paises`: juro básico, inflação e juro real de cada país, mês a mês.
- `demografia`: fecundidade, população, pirâmide etária e PIB, por ano.

Nas tabelas mensais, os saldos e as cotações são os do **fim** do mês (ou a média
do mês, onde a fonte só publica a média) e as variações são as **do** mês.
"""

import pandas as pd

MESES_DE_EMENDA = 12  # meses em que a série antiga e a nova do Banco Central são comparadas
INICIO_DOS_EUA = "1990-01-01"
INICIO_DOS_PAISES = "1995-01-01"
MAIOR_INFLACAO_COMPARAVEL = 10.0  # acima de 1.000% ao ano o juro real deixa de dizer alguma coisa


def montar_brasil(
    sgs: pd.DataFrame, ibovespa: pd.DataFrame, ouro: pd.DataFrame, bitcoin: pd.DataFrame, tesouro: pd.DataFrame
) -> pd.DataFrame:
    brasil = (
        sgs.merge(fim_de_mes(ibovespa, "ibov"), on="data", how="left")
        .merge(ouro, on="data", how="left")
        .merge(fim_de_mes(bitcoin, "btc_usd"), on="data", how="left")
        .merge(tesouro, on="data", how="left")
        .sort_values("data", ignore_index=True)
    )
    brasil["m1"] = emendar(brasil["m1_antigo"], brasil["m1"])
    brasil["m2"] = emendar(brasil["m2_antigo"], brasil["m2"])
    brasil["ouro_brl"] = brasil["ouro_usd"] * brasil["dolar_medio"]  # média do mês × média do mês
    brasil["btc_brl"] = brasil["btc_usd"] * brasil["dolar_fim"]

    # A análise termina no último mês em que a inflação e o M2 já foram divulgados.
    ultimo = brasil.dropna(subset=["ipca_var_mes", "m2", "selic_var_mes", "ibov"])["data"].max()
    return brasil[brasil["data"] <= ultimo].drop(columns=["m1_antigo", "m2_antigo"]).reset_index(drop=True)


def montar_eua(fed: pd.DataFrame, sp500: pd.DataFrame, ouro: pd.DataFrame, precos: pd.DataFrame) -> pd.DataFrame:
    inflacao = precos[precos["pais"] == "Estados Unidos"][["data", "precos_indice"]]
    eua = (
        sp500.merge(fed, on="data", how="outer")
        .merge(ouro, on="data", how="left")
        .merge(inflacao, on="data", how="left")
        .sort_values("data", ignore_index=True)
    )
    eua["sp500_retorno_total"] = retorno_total(eua["sp500"], eua["sp500_dividendo_12m"])

    ultimo = eua.dropna(subset=["sp500", "m2", "ouro_usd", "precos_indice"])["data"].max()
    return eua[eua["data"].between(INICIO_DOS_EUA, ultimo)].reset_index(drop=True)


def montar_paises(juros: pd.DataFrame, precos: pd.DataFrame) -> pd.DataFrame:
    """Juro real de cada país: o juro básico do mês descontado da inflação dos 12 meses anteriores."""
    precos = precos.sort_values(["pais", "data"]).copy()
    precos["inflacao_12m"] = precos.groupby("pais")["precos_indice"].pct_change(12)

    paises = juros.merge(precos[["pais", "data", "inflacao_12m"]], on=["pais", "data"]).dropna()
    paises = paises[(paises["data"] >= INICIO_DOS_PAISES) & (paises["inflacao_12m"] < MAIOR_INFLACAO_COMPARAVEL)]
    paises["juro_real_aa"] = (1 + paises["juro_aa"]) / (1 + paises["inflacao_12m"]) - 1
    return paises.sort_values(["pais", "data"], ignore_index=True)


def montar_demografia(indicadores: pd.DataFrame, nascimentos: pd.DataFrame, projecao: pd.DataFrame) -> pd.DataFrame:
    """Uma linha por país e ano, uma coluna por indicador.

    Os nascimentos registrados e a projeção do IBGE só existem para o Brasil. A projeção
    vai até 2070, vinte anos além da do Banco Mundial: esses anos entram só com as colunas dela.
    """
    demografia = indicadores.pivot(index=["pais", "ano"], columns="indicador", values="valor").reset_index()
    demografia.columns.name = None
    registros = nascimentos.assign(pais="BRA").rename(columns={"nascimentos": "nascimentos_registrados"})
    return (
        demografia.merge(registros, on=["pais", "ano"], how="left")
        .merge(projecao.assign(pais="BRA"), on=["pais", "ano"], how="outer")
        .sort_values(["pais", "ano"], ignore_index=True)
    )


def fim_de_mes(diario: pd.DataFrame, coluna: str) -> pd.DataFrame:
    """Último valor de cada mês. Colunas: data (primeiro dia do mês) e a coluna pedida.

    O mês do último valor pode estar pela metade, então fica de fora.
    """
    por_mes = diario.groupby(diario["data"].dt.to_period("M"))[coluna].last().iloc[:-1]
    tabela = por_mes.rename_axis("data").reset_index()
    tabela["data"] = tabela["data"].dt.to_timestamp()
    return tabela


def emendar(antiga: pd.Series, nova: pd.Series) -> pd.Series:
    """Estende a série nova para trás com a antiga, ajustada para as duas coincidirem onde se sobrepõem.

    O Banco Central mudou a metodologia dos meios de pagamento em 2018 e só recalculou
    as séries até dez/2001. O ajuste é a razão média entre as duas nos primeiros meses
    em comum (cerca de 1% no M2).
    """
    em_comum = (nova / antiga).dropna().iloc[:MESES_DE_EMENDA]
    return nova.fillna(antiga * em_comum.mean())


def retorno_total(preco: pd.Series, dividendo_12m: pd.Series) -> pd.Series:
    """Índice de retorno total: o preço mais os dividendos reinvestidos mês a mês. Começa em 100.

    Onde o dividendo ainda não foi divulgado, vale o último conhecido.
    """
    dividendo_do_mes = dividendo_12m.ffill() / 12
    variacao = (preco + dividendo_do_mes) / preco.shift(1)
    return 100 * variacao.fillna(1).cumprod()
