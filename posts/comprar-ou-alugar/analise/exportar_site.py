"""Gera os arquivos que a página consome.

- `pagina/dados.json`: as séries e os resultados já calculados.
- `testes/casos_simulador.json`: entradas e saídas do simulador em Python,
  para os testes do site conferirem que o simulador em TypeScript dá os mesmos números.
"""

import json
from dataclasses import asdict

import pandas as pd

from . import analise, cenarios
from .caminhos import PAGINA, TESTES
from .fontes import varginha
from .fontes.fipezap import NACIONAL
from .simulador import Cenario, Parametros, simular

CIDADES = ["São Paulo", "Rio de Janeiro", "Belo Horizonte"]
ALUGUEL_LIQUIDO = 0.70  # fração do aluguel bruto que chega ao dono (ver notebook 3)


def exportar(mensal: pd.DataFrame, cidades: pd.DataFrame) -> None:
    series = {cidade: cenarios.serie_da_cidade(cidades, mensal, cidade) for cidade in [*CIDADES, NACIONAL]}
    dados = {
        "hoje": _hoje(series),
        "taxas": _taxas(mensal, series["São Paulo"]),
        "precos": _precos(cidades),
        "rendimento_fiis": _rendimento_fiis(mensal),
        "ativos": _ativos(series["São Paulo"]),
    }
    PAGINA.mkdir(parents=True, exist_ok=True)
    (PAGINA / "dados.json").write_text(json.dumps(dados, ensure_ascii=False, separators=(",", ":")))

    TESTES.mkdir(parents=True, exist_ok=True)
    (TESTES / "casos_simulador.json").write_text(json.dumps(_casos_de_teste(), ensure_ascii=False, indent=1))


def _hoje(series: dict[str, pd.DataFrame]) -> dict:
    """Preço e aluguel por m² de cada cidade no último mês com os dois dados."""
    hoje = {}
    for cidade in CIDADES:
        ultimo = series[cidade].dropna(subset=["venda_preco_m2", "aluguel_preco_m2"]).iloc[-1]
        hoje[cidade] = {
            "preco_m2": round(float(ultimo["venda_preco_m2"])),
            "aluguel_m2": round(float(ultimo["aluguel_preco_m2"]), 2),
            "area_m2": cenarios.AREA_PADRAO_M2,
            "mes": f"{ultimo.name:%Y-%m}",
        }

    anuncios = varginha.ler()
    amostra = anuncios[varginha.plausivel(anuncios)]
    medianas = amostra.groupby("negocio")["preco_m2"].median()
    hoje["Varginha"] = {
        "preco_m2": round(float(medianas["venda"])),
        "aluguel_m2": round(float(medianas["aluguel"]), 2),
        "area_m2": float(amostra["area_m2"].median()),
        "mes": anuncios["coletado_em"].max()[:7],
        "anuncios": len(amostra),
    }
    return hoje


def _taxas(mensal: pd.DataFrame, serie: pd.DataFrame) -> dict:
    indicadores = mensal.set_index("data")
    amostra = serie.loc["2011-01":, ["ifix_var_mes", "cdi_var_mes", "ipca_var_mes"]].dropna()
    acumulado = (1 + amostra).prod() ** (12 / len(amostra))

    # Seis casas: arredondar antes da hora faria a página e os notebooks mostrarem números diferentes.
    def ultimo(coluna: str) -> float:
        return round(float(indicadores[coluna].dropna().iloc[-1]), 6)

    return {
        "juros_financiamento_aa": ultimo("juros_financiamento_aa"),
        "juros_financiamento_mercado_aa": ultimo("juros_financiamento_mercado_aa"),
        "juros_financiamento_regulado_aa": ultimo("juros_financiamento_regulado_aa"),
        "tesouro_ipca_aa": ultimo("tesouro_ipca_taxa_aa"),
        "fii_rendimento_aa": round(float(indicadores["fii_dividend_yield_mes"].dropna().iloc[-12:].sum()), 6),
        "fii_real_aa": round(float(acumulado["ifix_var_mes"] / acumulado["ipca_var_mes"] - 1), 6),
        "cdi_real_aa": round(float(acumulado["cdi_var_mes"] / acumulado["ipca_var_mes"] - 1), 6),
        "inflacao_12m": round(float((1 + indicadores["ipca_var_mes"].dropna().iloc[-12:]).prod() - 1), 6),
    }


def _precos(cidades: pd.DataFrame) -> dict:
    """Preço real do m² (nas quatro séries) e o nominal do índice nacional."""
    total = cidades[cidades["quartos"] == "total"]
    real = total.pivot(index="data", columns="cidade", values="venda_preco_m2_real")[[NACIONAL, *CIDADES]]
    real = real.dropna(how="all").rename(columns={NACIONAL: "Brasil"})
    nominal = total[total["cidade"] == NACIONAL].set_index("data")["venda_preco_m2"].reindex(real.index)
    return {**_tabela(real, casas=0), "nominal_brasil": _lista(nominal, casas=0)}


def _rendimento_fiis(mensal: pd.DataFrame) -> dict:
    """Rendimento distribuído pelos FIIs a cada mês, sobre o valor patrimonial (informe da CVM)."""
    rendimento = mensal.set_index("data")["fii_dividend_yield_mes"].dropna()
    rendimento = rendimento.reindex(pd.date_range(rendimento.index[0], rendimento.index[-1], freq="MS"))
    return _tabela(rendimento.to_frame("FIIs"), casas=5)


def _ativos(serie: pd.DataFrame) -> dict:
    """R$ 100 em dez/2010, em valores reais: imóvel alugado em São Paulo, IFIX e CDI."""
    retornos = pd.DataFrame(
        {
            "Imóvel em São Paulo": analise.retorno_total_do_imovel(serie, ALUGUEL_LIQUIDO),
            "FIIs (IFIX)": serie["ifix_var_mes"],
            "CDI": serie["cdi_var_mes"],
            "inflacao": serie["ipca_var_mes"],
        }
    ).dropna()
    acumulado = analise.indice(analise.em_termos_reais(retornos.drop(columns="inflacao"), retornos["inflacao"]))
    acumulado.loc[retornos.index[0] - pd.DateOffset(months=1)] = 100.0
    return _tabela(acumulado.sort_index(), casas=1)


def _casos_de_teste() -> list[dict]:
    """Cenários de taxas fixas cobrindo cada regra do simulador."""
    base = {"valor_imovel": 800_000.0, "aluguel_mensal": 4_300.0}
    cenario = {
        "meses": 360,
        "valorizacao_aa": 0.05,
        "reajuste_aluguel_aa": 0.055,
        "carteira_retorno_aa": 0.09,
        "carteira_rendimento_aa": 0.085,
        "inflacao_aa": 0.045,
    }
    variacoes = {
        "premissas do projeto": ({}, {}),
        "tabela Price": ({"sistema": "PRICE"}, {}),
        "prazo menor que o horizonte": ({"prazo_meses": 120}, {"meses": 240}),
        "horizonte menor que o prazo": ({}, {"meses": 84}),
        "investe metade da diferença": ({"disciplina": 0.5}, {}),
        "sem custos, impostos nem manutenção": (
            {"custos_compra_pct": 0, "corretagem_venda_pct": 0, "ir_ganho_carteira": 0, "manutencao_aa": 0},
            {},
        ),
        "juros zero e tudo parado": (
            {"juros_aa": 0.0},
            {
                "valorizacao_aa": 0,
                "reajuste_aluguel_aa": 0,
                "carteira_retorno_aa": 0,
                "carteira_rendimento_aa": 0,
                "inflacao_aa": 0,
            },
        ),
        "carteira rende mais que distribui": ({"entrada_pct": 0.5}, {"carteira_retorno_aa": 0.15}),
        "imóvel cai de preço": ({"juros_aa": 0.14}, {"valorizacao_aa": -0.03, "carteira_retorno_aa": 0.02}),
        "à vista": ({"entrada_pct": 1.0}, {"carteira_retorno_aa": 0.1268, "carteira_rendimento_aa": 0.1268}),
        "à vista, cota em queda": (
            {"entrada_pct": 1.0, "disciplina": 0.5},
            {"carteira_retorno_aa": 0.07, "carteira_rendimento_aa": 0.1268},
        ),
    }

    casos = []
    for nome, (ajuste_parametros, ajuste_cenario) in variacoes.items():
        p = Parametros(**(base | ajuste_parametros))
        taxas = cenario | ajuste_cenario
        meses = taxas.pop("meses")
        resultado = simular(p, Cenario.constante(meses, **taxas)).tabela()
        resultado["vantagem_do_aluguel"] = (
            (resultado["patrimonio_inquilino"] - resultado["patrimonio_comprador"])
            / resultado["deflator"]
            / p.valor_imovel
        )
        conferidos = sorted({0, 1, 12, 13, 60, meses // 2, meses - 1, meses})
        casos.append(
            {
                "nome": nome,
                "parametros": asdict(p),
                "cenario": {"meses": meses, **taxas},
                "esperado": resultado[resultado["mes"].isin(conferidos)].to_dict(orient="list"),
            }
        )
    return casos


def _tabela(tabela: pd.DataFrame, casas: int) -> dict:
    """DataFrame indexado por mês → {"datas": ["2008-01", ...], "series": {nome: [valores]}}."""
    return {
        "datas": [f"{data:%Y-%m}" for data in tabela.index],
        "series": {coluna: _lista(tabela[coluna], casas) for coluna in tabela.columns},
    }


def _lista(serie: pd.Series, casas: int) -> list[float | None]:
    """Valores arredondados, com `None` no lugar dos vazios (vira `null` no JSON)."""
    return [None if pd.isna(valor) else round(float(valor), casas) or 0.0 for valor in serie]
