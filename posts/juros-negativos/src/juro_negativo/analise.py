"""As contas da análise: quanto cada investimento rendeu e contra qual régua.

Tudo parte de uma tabela de **níveis**: uma coluna por investimento ou régua,
uma linha por mês, com o valor no fim daquele mês. A variação entre dois meses
é a divisão de um nível pelo outro, seja qual for a coluna.

Os períodos seguem a convenção do texto analisado: "de jan/2008 a jan/2018" vai
da abertura de janeiro de 2008 à abertura de janeiro de 2018, ou seja, do fim de
dezembro de 2007 ao fim de dezembro de 2017.
"""

import numpy as np
import pandas as pd

# O que o texto chama de investimento ou de proteção.
ATIVOS = {
    "selic": "Selic",
    "cdi": "CDI",
    "ibovespa": "Ibovespa",
    "ouro": "Ouro",
    "dolar": "Dólar",
    "bitcoin": "Bitcoin",
}
# Contra o que medir: cada régua é uma definição diferente de "não perder".
REGUAS = {
    "ipca": "Preços (IPCA)",
    "pib": "PIB nominal",
    "base_monetaria": "Base monetária",
    "m1": "M1",
    "m2": "M2",
    "m3": "M3",
    "m4": "M4",
}
# Em que medir o poder de compra de uma aplicação: bens, salários, outros ativos e fatias da economia.
COMPRAS = {
    "ipca": "Cesta de consumo (IPCA)",
    "salario_minimo": "Salários mínimos",
    "imoveis": "Imóveis (índice IVG-R)",
    "ibovespa": "Ações (Ibovespa)",
    "dolar": "Dólares",
    "ouro": "Ouro",
    "pib": "Fatia do PIB",
    "m2": "Fatia do M2",
}
ATIVOS_EUA = {"sp500": "S&P 500 (só preço)", "sp500_total": "S&P 500 com dividendos", "ouro": "Ouro"}
REGUAS_EUA = {
    "cpi": "Preços (CPI)",
    "papel_moeda": "Papel-moeda em circulação",
    "base_monetaria": "Base monetária",
    "m1": "M1",
    "m2": "M2",
}


def niveis_do_brasil(brasil: pd.DataFrame) -> pd.DataFrame:
    """Níveis mensais de cada ativo e de cada régua, desde jun/1994 (a véspera do real)."""
    mensal = brasil.set_index("data")
    acumulados = (1 + mensal[["selic_var_mes", "cdi_var_mes", "ipca_var_mes"]]).cumprod()
    niveis = pd.DataFrame(
        {
            "selic": acumulados["selic_var_mes"],
            "cdi": acumulados["cdi_var_mes"],
            "ibovespa": mensal["ibov"],
            "ouro": mensal["ouro_brl"],
            "dolar": mensal["dolar_fim"],
            "bitcoin": mensal["btc_brl"],
            "ipca": acumulados["ipca_var_mes"],
            "pib": mensal["pib_12m"],
            "base_monetaria": mensal["base_monetaria"],
            "m1": mensal["m1"],
            "m2": mensal["m2"],
            "m3": mensal["m3"],
            "m4": mensal["m4"],
            "salario_minimo": mensal["salario_minimo"],
            "imoveis": mensal["ivgr"],
        }
    )
    # Os índices acumulados valem 1 no mês anterior ao primeiro.
    vespera = niveis.index[0] - pd.DateOffset(months=1)
    niveis.loc[vespera, ["selic", "cdi", "ipca"]] = 1.0
    return niveis.sort_index()


def niveis_dos_eua(eua: pd.DataFrame) -> pd.DataFrame:
    """Níveis mensais para os Estados Unidos. Ações, ouro e dinheiro são todos médias do mês."""
    mensal = eua.set_index("data")
    return pd.DataFrame(
        {
            "sp500": mensal["sp500"],
            "sp500_total": mensal["sp500_retorno_total"],
            "ouro": mensal["ouro_usd"],
            "cpi": mensal["precos_indice"],
            "papel_moeda": mensal["papel_moeda"],
            "base_monetaria": mensal["base_monetaria"],
            "m1": mensal["m1"],
            "m2": mensal["m2"],
        }
    )


def variacao(niveis: pd.DataFrame, inicio, fim) -> pd.Series:
    """Variação de cada coluna da abertura do mês `inicio` à abertura do mês `fim`."""
    um_mes = pd.DateOffset(months=1)
    return niveis.loc[pd.Timestamp(fim) - um_mes] / niveis.loc[pd.Timestamp(inicio) - um_mes] - 1


def anualizar(variacao_total, meses: int):
    """Variação acumulada em `meses` → taxa anual equivalente."""
    return (1 + variacao_total) ** (12 / meses) - 1


def descontar(variacao_total, regua):
    """Quanto sobra de uma variação depois de descontada a régua: (1 + ativo) ÷ (1 + régua) − 1."""
    return (1 + variacao_total) / (1 + regua) - 1


def meses_entre(inicio, fim) -> int:
    inicio, fim = pd.Timestamp(inicio), pd.Timestamp(fim)
    return (fim.year - inicio.year) * 12 + fim.month - inicio.month


def conferir(afirmacoes: pd.DataFrame, niveis_por_pais: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Refaz cada número citado no texto. Acrescenta `variacao_calculada` e `diferenca` (em pontos de variação)."""
    calculadas = [
        variacao(niveis_por_pais[linha.pais], linha.inicio, linha.fim)[linha.serie] for linha in afirmacoes.itertuples()
    ]
    conferidas = afirmacoes.assign(variacao_calculada=calculadas)
    conferidas["diferenca"] = conferidas["variacao_calculada"] - conferidas["variacao_citada"]
    # A distância entre os dois números como fração do valor final: 26,48 vezes contra 24,9 vezes é 6%.
    conferidas["erro_relativo"] = (1 + conferidas["variacao_calculada"]) / (1 + conferidas["variacao_citada"]) - 1
    return conferidas


def janelas(niveis: pd.DataFrame, anos: int) -> pd.DataFrame:
    """Taxa anual de cada coluna em todas as janelas de `anos`, indexada pelo mês em que a janela começa."""
    meses = anos * 12
    acumulada = niveis.shift(-meses) / niveis
    taxas = acumulada ** (1 / anos) - 1
    taxas.index = taxas.index + pd.DateOffset(months=1)  # o nível do fim de dezembro é a abertura de janeiro
    return taxas.dropna(how="all")


def matriz_de_periodos(niveis: pd.DataFrame, ativo: str, regua: str) -> pd.DataFrame:
    """Para cada ano de início (linha) e de fim (coluna): quanto o ativo rendeu ao ano acima da régua.

    Os períodos vão de janeiro a janeiro. Os pares em que o fim não vem depois do início ficam vazios.
    """
    aberturas = niveis.loc[niveis.index.month == 12, [ativo, regua]].dropna()
    aberturas.index = aberturas.index.year + 1  # o fim de dezembro de 2007 é a abertura de 2008
    razao = aberturas[ativo] / aberturas[regua]

    anos = aberturas.index.to_numpy()
    matriz = pd.DataFrame(np.nan, index=anos[:-1], columns=anos[1:])
    for inicio in matriz.index:
        for fim in matriz.columns[matriz.columns > inicio]:
            matriz.loc[inicio, fim] = (razao[fim] / razao[inicio]) ** (1 / (fim - inicio)) - 1
    return matriz.rename_axis(index="inicio", columns="fim")


def ano_a_ano(niveis: pd.DataFrame, ativo: str, regua: str, desde: int) -> pd.DataFrame:
    """Para cada ano completo a partir de `desde`: quanto o ativo rendeu, quanto a régua subiu e o que sobrou.

    Uma linha por ano, com as colunas do ativo, da régua e `acima` (o ativo descontada a régua).
    """
    aberturas = niveis.loc[niveis.index.month == 12, [ativo, regua]].dropna()  # o fim de dezembro abre o ano seguinte
    no_ano = aberturas.pct_change().dropna()
    no_ano.index = no_ano.index.year
    tabela = no_ano.loc[desde:].rename_axis("ano")
    return tabela.assign(acima=descontar(tabela[ativo], tabela[regua]))


def meses_de_juro_nominal_negativo(paises: pd.DataFrame) -> pd.DataFrame:
    """Os países em que o juro básico ficou abaixo de zero, sem descontar nada.

    Colunas: pais, meses (quantos), de e ate (o primeiro e o último mês) e minimo (a menor taxa).
    """
    negativos = paises[paises["juro_aa"] < 0]
    resumo = negativos.groupby("pais").agg(
        meses=("data", "size"), de=("data", "min"), ate=("data", "max"), minimo=("juro_aa", "min")
    )
    return resumo.reset_index()


def parte_das_reservas(niveis_eua: pd.DataFrame, inicio, fim) -> float:
    """Do aumento da base monetária dos EUA no período, a fração que foi reserva dos bancos no Fed.

    A base é o papel-moeda em circulação mais essas reservas: o que não é papel-moeda é reserva.
    """
    um_mes = pd.DateOffset(months=1)
    partida = niveis_eua.loc[pd.Timestamp(inicio) - um_mes]
    chegada = niveis_eua.loc[pd.Timestamp(fim) - um_mes]
    aumento_da_base = chegada["base_monetaria"] - partida["base_monetaria"]
    return float(1 - (chegada["papel_moeda"] - partida["papel_moeda"]) / aumento_da_base)


def decompor_m2(brasil: pd.DataFrame, inicio, fim) -> pd.Series:
    """Separa o crescimento do M2 em três partes que, multiplicadas, dão o total.

    M2 = preços × PIB real × (M2 ÷ PIB). A primeira parte é a inflação; a segunda,
    o crescimento da economia; a terceira, o quanto as pessoas e empresas passaram
    a guardar em depósitos e títulos de bancos em relação à renda do país.
    """
    v = variacao(niveis_do_brasil(brasil), inicio, fim)
    pib_real = descontar(v["pib"], v["ipca"])
    m2_sobre_pib = descontar(v["m2"], v["pib"])
    return pd.Series({"m2": v["m2"], "precos": v["ipca"], "pib_real": pib_real, "m2_sobre_pib": m2_sobre_pib})


def juro_real_12m(brasil: pd.DataFrame) -> pd.DataFrame:
    """A Selic acumulada em 12 meses descontada de cada régua no mesmo período. Indexado pelo último mês."""
    niveis = niveis_do_brasil(brasil)
    em_12m = niveis / niveis.shift(12) - 1
    tabela = pd.DataFrame({"selic_12m": em_12m["selic"]})
    for regua in REGUAS:
        tabela[f"{regua}_12m"] = em_12m[regua]
        tabela[f"real_{regua}"] = descontar(em_12m["selic"], em_12m[regua])
    return tabela.dropna(subset=["selic_12m", "ipca_12m"])


def poupar_todo_mes(niveis: pd.DataFrame, ativo: str, deflator: str, inicio, fim) -> pd.Series:
    """Quem guarda o mesmo valor todo mês (corrigido pelo deflator) e aplica no ativo.

    Devolve o saldo no fim de cada mês como múltiplo do total guardado até ali, tudo
    em valores do mês final: acima de 1, o dinheiro rendeu mais que o deflator.
    """
    um_mes = pd.DateOffset(months=1)
    periodo = niveis.loc[pd.Timestamp(inicio) - um_mes : pd.Timestamp(fim) - um_mes, [ativo, deflator]].dropna()
    cota = periodo[ativo] / periodo[deflator]  # o ativo medido em unidades do deflator
    aportes = len(cota) - 1  # um aporte na abertura de cada mês; o último ponto é só a data da medição

    cotas_compradas = (1 / cota.iloc[:-1]).cumsum()
    saldo = cotas_compradas * cota.iloc[1:].to_numpy()
    multiplo = saldo / np.arange(1, aportes + 1)
    multiplo.index = cota.index[1:]
    return multiplo


def poder_de_compra(niveis: pd.DataFrame, ativo: str, inicio, fim) -> pd.Series:
    """Quantas vezes mais (ou menos) de cada coisa de `COMPRAS` o dinheiro aplicado no ativo compra no fim do período.

    Cada coisa é medida até o último mês em que tem dado: o índice de imóveis sai com um mês de atraso.
    """
    um_mes = pd.DateOffset(months=1)
    partida = niveis.loc[pd.Timestamp(inicio) - um_mes]
    multiplos = {}
    for coisa in COMPRAS:
        chegada = niveis.loc[: pd.Timestamp(fim) - um_mes, [ativo, coisa]].dropna().iloc[-1]
        multiplos[coisa] = (chegada[ativo] / partida[ativo]) / (chegada[coisa] / partida[coisa])
    return pd.Series(multiplos)


def distancia_do_pico(niveis: pd.DataFrame, serie: str, inicio, fim) -> pd.Series:
    """Quanto a série está, em cada mês, abaixo do maior nível atingido desde a abertura de `inicio`.

    Zero no recorde; −0.5 quando vale metade do que já valeu. Os meses sem dado ficam de fora.
    """
    um_mes = pd.DateOffset(months=1)
    periodo = niveis.loc[pd.Timestamp(inicio) - um_mes : pd.Timestamp(fim) - um_mes, serie].dropna()
    return periodo / periodo.cummax() - 1


def quedas(niveis: pd.DataFrame, serie: str, inicio, fim, minima: float = 0.0) -> pd.DataFrame:
    """Cada queda da série entre um recorde e o recorde seguinte (ou o fim do período), do pico ao fundo.

    Colunas: pico e fundo (os meses) e queda (fração negativa). Só entram as quedas de pelo menos
    `minima` (0.5 = perdeu metade do valor). Com níveis de fim de mês, o que cai e volta dentro do
    mês não aparece: as quedas de verdade são um pouco maiores.
    """
    distancia = distancia_do_pico(niveis, serie, inicio, fim)
    trecho = (distancia == 0).cumsum()  # cada recorde abre um trecho, que vai até a véspera do seguinte
    linhas = []
    for _, meses in distancia.groupby(trecho):
        fundo = meses.idxmin()
        if meses[fundo] < 0 and meses[fundo] <= -minima:
            linhas.append({"pico": meses.index[0], "fundo": fundo, "queda": meses[fundo]})
    return pd.DataFrame(linhas, columns=["pico", "fundo", "queda"])


def participacao_remunerada_do_m2(brasil: pd.DataFrame) -> pd.Series:
    """Fração do M2 que não é M1: poupança, CDBs e outros títulos de bancos, que rendem juros."""
    mensal = brasil.set_index("data")
    return (1 - mensal["m1"] / mensal["m2"]).dropna()


def fracao_negativa(serie: pd.Series) -> float:
    """Fração dos meses em que a série ficou abaixo de zero."""
    validos = serie.dropna()
    return float((validos < 0).mean()) if len(validos) else float("nan")
