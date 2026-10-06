"""Gera os arquivos que a página consome.

- `site/public/data/dados.json`: as séries e os resultados já calculados.
- `site/test/casos_calculadora.json`: perguntas e respostas da conta em Python,
  para os testes do site conferirem que a versão em TypeScript dá os mesmos números.
"""

import json
from math import floor, log10

import pandas as pd

from . import analise
from .caminhos import SITE_DADOS, SITE_TESTES
from .fontes import afirmacoes as fonte_afirmacoes

# As séries que a página usa para refazer qualquer conta, de qualquer período.
SERIES_DA_PAGINA = [
    "selic",
    "ibovespa",
    "ouro",
    "dolar",
    "bitcoin",
    "ipca",
    "pib",
    "base_monetaria",
    "m1",
    "m2",
    "m3",
    "m4",
    "salario_minimo",
    "imoveis",
]
REGUAS_DOS_GRAFICOS = ["ipca", "pib", "base_monetaria", "m2"]
INICIO_DOS_GRAFICOS = "1996-01-01"  # os 12 meses anteriores ainda misturam o fim da hiperinflação

# Linhas do mapa de juro real: primeiro os países ricos, depois os emergentes.
PAISES_DO_MAPA = [
    "Estados Unidos",
    "Zona do euro",
    "Reino Unido",
    "Japão",
    "Suíça",
    "Suécia",
    "Canadá",
    "Austrália",
    "Coreia do Sul",
    "Chile",
    "México",
    "Colômbia",
    "África do Sul",
    "Índia",
    "Brasil",
    "Turquia",
    "Argentina",
]
PRIMEIRO_ANO_DO_MAPA = 2000
PERIODOS_DO_MUNDO = {
    "2000 a 2008": ("2000-01", "2008-12"),
    "2009 a 2021": ("2009-01", "2021-12"),
    "2023 em diante": ("2023-01", None),
}

PERIODOS_DOS_EUA = [("1998-01", "2008-01"), ("2008-01", "2018-01"), ("2018-01", "2022-01")]
INICIO_DO_DINHEIRO_DOS_EUA = "2017-01-01"
INICIOS_DA_POUPANCA = ["1995-01", "2008-01", "2016-01"]
ATIVOS_DA_POUPANCA = ["selic", "ibovespa", "ouro"]

PAISES_DA_DEMOGRAFIA = {
    "BRA": "Brasil",
    "USA": "Estados Unidos",
    "JPN": "Japão",
    "KOR": "Coreia do Sul",
    "ITA": "Itália",
    "CHN": "China",
    "WLD": "Mundo",
}
ANOS_DA_PIRAMIDE = [2000, 2025, 2050]
PRIMEIRO_ANO_DA_DEMOGRAFIA = 1970


def exportar(brasil: pd.DataFrame, eua: pd.DataFrame, paises: pd.DataFrame, demografia: pd.DataFrame) -> None:
    niveis = analise.niveis_do_brasil(brasil)
    niveis_eua = analise.niveis_dos_eua(eua)
    # A página recebe os níveis arredondados; os casos de teste partem dos mesmos números que ela.
    niveis_da_pagina = niveis[SERIES_DA_PAGINA].map(_numero).astype(float)
    dados = {
        "ate": f"{niveis.index[-1]:%Y-%m}",
        "texto": {"url": fonte_afirmacoes.URL_DO_TEXTO, "publicado_em": f"{fonte_afirmacoes.DATA_DO_TEXTO:%Y-%m}"},
        "niveis": _tabela(niveis_da_pagina),
        "afirmacoes": _afirmacoes(niveis, niveis_eua),
        "juro_real": _juro_real(brasil),
        "janelas": {str(anos): _janelas(niveis, anos) for anos in (5, 10)},
        "moeda": _moeda(brasil),
        "juro_contratado": _juro_contratado(brasil, eua),
        "paises": _paises(paises),
        "eua": _eua(eua, niveis_eua),
        "poupar": {inicio: _poupar(niveis, inicio) for inicio in INICIOS_DA_POUPANCA},
        "demografia": _demografia(demografia),
    }
    SITE_DADOS.mkdir(parents=True, exist_ok=True)
    (SITE_DADOS / "dados.json").write_text(json.dumps(dados, ensure_ascii=False, separators=(",", ":")))

    SITE_TESTES.mkdir(parents=True, exist_ok=True)
    casos = _casos_de_teste(niveis_da_pagina)
    (SITE_TESTES / "casos_calculadora.json").write_text(json.dumps(casos, ensure_ascii=False, indent=1))


def _afirmacoes(niveis: pd.DataFrame, niveis_eua: pd.DataFrame) -> list[dict]:
    """Cada número citado no texto ao lado do número refeito."""
    conferidas = analise.conferir(fonte_afirmacoes.ler(), {"Brasil": niveis, "Estados Unidos": niveis_eua})
    return [
        {
            "grupo": linha.grupo,
            "pais": linha.pais,
            "inicio": f"{linha.inicio:%Y-%m}",
            "fim": f"{linha.fim:%Y-%m}",
            "serie": linha.serie,
            "citada": round(linha.variacao_citada, 4),
            "calculada": round(linha.variacao_calculada, 4),
        }
        for linha in conferidas.itertuples()
    ]


def _juro_real(brasil: pd.DataFrame) -> dict:
    """A Selic de 12 meses descontada de cada régua, pelo mês em que os 12 meses terminam."""
    tabela = analise.juro_real_12m(brasil).loc[INICIO_DOS_GRAFICOS:]
    return _tabela(tabela[[f"real_{regua}" for regua in REGUAS_DOS_GRAFICOS]].set_axis(REGUAS_DOS_GRAFICOS, axis=1), 4)


def _janelas(niveis: pd.DataFrame, anos: int) -> dict:
    """Quanto a Selic rendeu ao ano acima de cada régua em cada janela de `anos`, pelo mês em que a janela começa."""
    taxas = analise.janelas(niveis, anos).loc["1995-01-01":]
    acima = pd.DataFrame({regua: analise.descontar(taxas["selic"], taxas[regua]) for regua in REGUAS_DOS_GRAFICOS})
    return _tabela(acima.dropna(how="all"), 4)


def _moeda(brasil: pd.DataFrame) -> dict:
    """Cada agregado como fração do PIB, e a parte do M2 que rende juros."""
    mensal = brasil.set_index("data").loc[INICIO_DOS_GRAFICOS:]
    tabela = pd.DataFrame(
        {
            "m2_pib": mensal["m2"] / mensal["pib_12m"],
            "m1_pib": mensal["m1"] / mensal["pib_12m"],
            "base_pib": mensal["base_monetaria"] / mensal["pib_12m"],
            "remunerado": analise.participacao_remunerada_do_m2(brasil).reindex(mensal.index),
        }
    )
    return _tabela(tabela, 4)


def _juro_contratado(brasil: pd.DataFrame, eua: pd.DataFrame) -> dict:
    """O juro acima da inflação que o título público paga a quem compra naquele mês, no Brasil e nos EUA."""
    tabela = pd.DataFrame(
        {
            "brasil": brasil.set_index("data")["tesouro_ipca_taxa_aa"],
            "eua": eua.set_index("data")["tips_10_anos_aa"],
        }
    )
    return _tabela(tabela.dropna(how="all"), 4)


def _paises(paises: pd.DataFrame) -> dict:
    """Juro real médio de cada país em cada ano, e a fração de meses com juro real negativo em três períodos."""
    mensal = paises.pivot(index="data", columns="pais", values="juro_real_aa")[PAISES_DO_MAPA]
    anual = mensal.groupby(mensal.index.year).mean().loc[PRIMEIRO_ANO_DO_MAPA:]
    return {
        "anos": anual.index.tolist(),
        "paises": PAISES_DO_MAPA,
        "juro_real": {pais: _lista(anual[pais], 4) for pais in PAISES_DO_MAPA},
        "negativos": {
            periodo: {
                pais: _numero(analise.fracao_negativa(mensal.loc[inicio:fim, pais]), 4) for pais in PAISES_DO_MAPA
            }
            for periodo, (inicio, fim) in PERIODOS_DO_MUNDO.items()
        },
    }


def _eua(eua: pd.DataFrame, niveis: pd.DataFrame) -> dict:
    mensal = eua.set_index("data")
    dinheiro = mensal.loc[INICIO_DO_DINHEIRO_DOS_EUA:, ["m1", "m2"]] / 1000  # US$ trilhões
    ultimo = niveis.dropna(subset=["m2", "cpi", "sp500_total"]).index[-1] + pd.DateOffset(months=1)
    periodos = [*PERIODOS_DOS_EUA, ("2008-01", f"{ultimo:%Y-%m}")]
    tips = mensal["tips_10_anos_aa"].dropna()
    return {
        "ate": f"{niveis.dropna(subset=['m2']).index[-1]:%Y-%m}",
        "dinheiro": _tabela(dinheiro.dropna(how="all"), 4),
        "periodos": [
            {"inicio": inicio, "fim": fim}
            | {k: round(float(v), 4) for k, v in analise.variacao(niveis, inicio, fim).items()}
            for inicio, fim in periodos
        ],
        "tips_meses_negativos": int((tips < 0).sum()),
        "tips_minimo": {"mes": f"{tips.idxmin():%Y-%m}", "taxa": round(float(tips.min()), 4)},
    }


def _poupar(niveis: pd.DataFrame, inicio: str) -> dict:
    """Quem guardou o mesmo valor todo mês desde `inicio`: saldo ÷ total guardado, descontada a inflação."""
    fim = niveis.index[-1] + pd.DateOffset(months=1)
    tabela = pd.DataFrame(
        {ativo: analise.poupar_todo_mes(niveis, ativo, "ipca", inicio, fim) for ativo in ATIVOS_DA_POUPANCA}
    )
    return _tabela(tabela, 4)


def _demografia(demografia: pd.DataFrame) -> dict:
    por_pais = demografia[demografia["ano"] >= PRIMEIRO_ANO_DA_DEMOGRAFIA].set_index(["pais", "ano"])
    brasil = por_pais.loc["BRA"]
    nomes = list(PAISES_DA_DEMOGRAFIA.values())

    def comparacao(indicador: str, ate: int | None = None) -> dict:
        tabela = por_pais[indicador].unstack("pais").rename(columns=PAISES_DA_DEMOGRAFIA)[nomes].dropna(how="all")
        tabela = tabela.loc[:ate]
        return {"anos": tabela.index.tolist(), "series": {nome: _lista(tabela[nome], 3) for nome in nomes}}

    # A fecundidade projetada só vem de cinco em cinco anos: o gráfico fica com os anos observados.
    ultimo_observado = int(
        brasil["fecundidade"].dropna().index.to_series().diff().le(1).pipe(lambda s: s[s].index.max())
    )
    nascimentos = brasil["nascimentos_registrados"].dropna()
    economia = brasil[["pib_dolares", "pib_real", "pib_real_por_pessoa"]].dropna()
    faixas = sorted({coluna.split("_")[1] for coluna in brasil.columns if coluna.startswith("idade_")})
    return {
        "fecundidade": comparacao("fecundidade", ate=ultimo_observado),
        "dependencia_idosos": comparacao("dependencia_idosos"),
        "populacao": {"anos": brasil.index.tolist(), "valores": _lista(brasil["populacao"], 0)},
        "nascimentos": {"anos": nascimentos.index.tolist(), "valores": _lista(nascimentos, 0)},
        "piramide": {
            "faixas": [_nome_da_faixa(faixa) for faixa in faixas],
            "anos": {
                str(ano): {
                    sexo: _lista(brasil.loc[ano, [f"idade_{f}_{sexo}" for f in faixas]], 0)
                    for sexo in ("homens", "mulheres")
                }
                for ano in ANOS_DA_PIRAMIDE
            },
        },
        "economia": {
            "anos": economia.index.tolist(),
            "pib_dolares": [_numero(valor / 1e9, 1) for valor in economia["pib_dolares"]],  # US$ bilhões
            "pib_real": [_numero(valor / 1e9, 1) for valor in economia["pib_real"]],  # R$ bilhões constantes
            "pib_real_por_pessoa": _lista(economia["pib_real_por_pessoa"], 0),
        },
    }


def _nome_da_faixa(codigo: str) -> str:
    """'0004' → '0 a 4'; '80UP' → '80 ou mais'"""
    return "80 ou mais" if codigo == "80UP" else f"{int(codigo[:2])} a {int(codigo[2:])}"


def _casos_de_teste(niveis: pd.DataFrame) -> dict:
    """Períodos e pares de ativo e régua cobrindo cada conta que a página refaz."""
    ultimo = f"{niveis.index[-1] + pd.DateOffset(months=1):%Y-%m}"
    perguntas = [
        ("1998-01", "2008-01", "selic", "m2"),
        ("2008-01", "2018-01", "selic", "m2"),
        ("2008-01", "2018-01", "ibovespa", "ipca"),
        ("2008-01", ultimo, "selic", "ipca"),
        ("2008-01", ultimo, "selic", "pib"),
        ("2008-01", ultimo, "selic", "base_monetaria"),
        ("2008-01", ultimo, "ouro", "m2"),
        ("2022-10", ultimo, "bitcoin", "m2"),
        ("2022-10", ultimo, "dolar", "ipca"),
        ("2002-01", "2002-02", "selic", "m4"),
        ("1994-07", ultimo, "selic", "ipca"),
        ("2011-01", "2026-01", "bitcoin", "m3"),
    ]
    casos = []
    for inicio, fim, ativo, regua in perguntas:
        v = analise.variacao(niveis, inicio, fim)
        meses = analise.meses_entre(inicio, fim)
        acima = analise.descontar(v[ativo], v[regua])
        casos.append(
            {
                "inicio": inicio,
                "fim": fim,
                "ativo": ativo,
                "regua": regua,
                "esperado": {
                    "meses": meses,
                    "variacao_do_ativo": float(v[ativo]),
                    "variacao_da_regua": float(v[regua]),
                    "acima_da_regua": float(acima),
                    "acima_da_regua_aa": float(analise.anualizar(acima, meses)),
                },
            }
        )

    matriz = analise.matriz_de_periodos(niveis, "selic", "m2")
    compras = analise.poder_de_compra(niveis, "selic", "2008-01", ultimo)
    texto = f"{fonte_afirmacoes.DATA_DO_TEXTO:%Y-%m}"
    distancia = analise.distancia_do_pico(niveis, "bitcoin", "2011-01", ultimo)
    return {
        "periodos": casos,
        "quedas": [
            {
                "serie": serie,
                "inicio": inicio,
                "fim": ultimo,
                "minima": minima,
                "esperado": [
                    {"pico": f"{queda.pico:%Y-%m}", "fundo": f"{queda.fundo:%Y-%m}", "queda": float(queda.queda)}
                    for queda in analise.quedas(niveis, serie, inicio, ultimo, minima).itertuples()
                ],
            }
            for serie, inicio, minima in [
                ("bitcoin", "2011-01", 0.5),
                ("bitcoin", texto, 0.0),
                ("ouro", "2008-01", 0.15),
                ("ibovespa", "2008-01", 0.3),
                ("selic", "2008-01", 0.0),  # nunca caiu: nenhuma queda
                ("bitcoin", "2005-01", 0.7),  # começa antes de existir preço
            ]
        ],
        "distancia_do_pico_do_bitcoin_desde_2011": {
            f"{mes:%Y-%m}": float(distancia[mes]) for mes in distancia.index[[0, 5, 10, 141, len(distancia) - 1]]
        },
        "matriz_selic_m2": [
            {"inicio": int(inicio), "fim": int(fim), "esperado": float(matriz.loc[inicio, fim])}
            for inicio, fim in [(1995, 1996), (1998, 2008), (2008, 2018), (2008, int(matriz.columns[-1])), (2020, 2023)]
        ],
        "poder_de_compra_da_selic_desde_2008": {coisa: float(valor) for coisa, valor in compras.items()},
    }


def _tabela(tabela: pd.DataFrame, casas: int | None = None) -> dict:
    """DataFrame indexado por mês → {"datas": ["2008-01", ...], "series": {nome: [valores]}}."""
    return {
        "datas": [f"{data:%Y-%m}" for data in tabela.index],
        "series": {coluna: _lista(tabela[coluna], casas) for coluna in tabela.columns},
    }


def _lista(serie: pd.Series, casas: int | None = None) -> list[float | None]:
    return [_numero(valor, casas) for valor in serie]


def _numero(valor: float, casas: int | None = None, algarismos: int = 7) -> float | None:
    """Arredonda para `casas` decimais ou, sem `casas`, para `algarismos` significativos. Vazio vira `None` (`null` no JSON)."""
    if pd.isna(valor):
        return None
    valor = float(valor)
    if casas is None:
        casas = algarismos - 1 - floor(log10(abs(valor))) if valor else 0
    return round(valor, casas) or 0.0
