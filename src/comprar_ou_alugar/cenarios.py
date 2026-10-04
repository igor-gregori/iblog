"""Jeitos de alimentar o simulador.

- `compra_a_vista` e `fundos_a_taxas_fixas`: a pergunta da página, com o dinheiro na mão
  e uma carteira descrita pelo rendimento mensal e pelo preço da cota.
- `backtest`: o que teria acontecido com quem decidiu em cada mês do passado.
- `monte_carlo`: futuros possíveis, sorteados a partir do histórico.
- `sensibilidade`: uma grade de cenários de taxas fixas, para achar o ponto de equilíbrio.
"""

from dataclasses import replace

import numpy as np
import pandas as pd

from .financiamento import taxa_mensal
from .simulador import Cenario, Parametros, Resultado, simular

AREA_PADRAO_M2 = 65.0

# Onde a diferença mensal é investida: coluna de retorno, coluna de rendimento
# distribuído (para o imposto) e alíquota sobre o ganho de capital.
INVESTIMENTOS = {
    "fiis": {"retorno": "ifix_var_mes", "rendimento": "fii_dividend_yield_mes", "ir": 0.20},
    "cdi": {"retorno": "cdi_var_mes", "rendimento": None, "ir": 0.15},
}


def serie_da_cidade(cidades: pd.DataFrame, mensal: pd.DataFrame, cidade: str, quartos: str = "total") -> pd.DataFrame:
    """Histórico mensal de uma cidade ao lado dos indicadores nacionais, indexado pela data."""
    local = cidades[(cidades["cidade"] == cidade) & (cidades["quartos"] == quartos)].set_index("data")
    serie = local[["venda_preco_m2", "aluguel_preco_m2", "rentabilidade_aluguel_mes"]].join(
        mensal.set_index("data"), how="outer"
    )
    serie["valorizacao_mes"] = serie["venda_preco_m2"].pct_change(fill_method=None)
    serie["aluguel_var_mes"] = serie["aluguel_preco_m2"].pct_change(fill_method=None)

    # O informe da CVM só começa em 2017 e as taxas de financiamento, em mar/2011.
    # O rendimento só entra na conta do imposto, então a média serve para os meses sem dado.
    serie["fii_dividend_yield_mes"] = serie["fii_dividend_yield_mes"].fillna(serie["fii_dividend_yield_mes"].mean())
    serie["juros_financiamento_aa"] = serie["juros_financiamento_aa"].bfill().ffill()
    return serie


def parametros_de_hoje(serie: pd.DataFrame, area_m2: float = AREA_PADRAO_M2, **ajustes) -> Parametros:
    """Parâmetros de quem decide agora: preço, aluguel e juros do último mês com dados da cidade."""
    hoje = serie.dropna(subset=["venda_preco_m2", "aluguel_preco_m2"]).iloc[-1]
    return Parametros(
        **{
            "valor_imovel": float(hoje["venda_preco_m2"] * area_m2),
            "aluguel_mensal": float(hoje["aluguel_preco_m2"] * area_m2),
            "juros_aa": float(hoje["juros_financiamento_aa"]),
            **ajustes,
        }
    )


def compra_a_vista(disponivel: float, preco_m2: float, aluguel_m2: float, **ajustes) -> Parametros:
    """Quem tem `disponivel` em dinheiro compra à vista o maior imóvel que esse valor paga,
    já contando os custos da compra. Quem aluga mora em um imóvel igual e aplica tudo.

    O aluguel sai da rentabilidade do aluguel da cidade (aluguel por m² ÷ preço por m²).
    """
    custos = ajustes.get("custos_compra_pct", Parametros.custos_compra_pct)
    valor_imovel = disponivel / (1 + custos)
    return Parametros(
        **{
            "valor_imovel": valor_imovel,
            "aluguel_mensal": valor_imovel * aluguel_m2 / preco_m2,
            "entrada_pct": 1.0,
            **ajustes,
        }
    )


def fundos_a_taxas_fixas(
    meses: int,
    *,
    rendimento_mes: float,
    cota_aa: float,
    inflacao_aa: float,
    valorizacao_real_aa: float = 0.0,
) -> Cenario:
    """Um cenário em que a carteira paga `rendimento_mes` todo mês e o preço da cota
    varia `cota_aa` por ano (sem descontar a inflação). O imóvel e o aluguel sobem
    `valorizacao_real_aa` acima da inflação.

    Com a cota parada, o dinheiro aplicado perde a inflação: parte do rendimento só repõe essa perda.
    """
    rendimento_aa = (1 + rendimento_mes) ** 12 - 1
    imovel_aa = (1 + valorizacao_real_aa) * (1 + inflacao_aa) - 1
    return Cenario.constante(
        meses,
        valorizacao_aa=imovel_aa,
        reajuste_aluguel_aa=imovel_aa,
        carteira_retorno_aa=(1 + rendimento_aa) * (1 + cota_aa) - 1,
        carteira_rendimento_aa=rendimento_aa,
        inflacao_aa=inflacao_aa,
    )


def backtest(
    serie: pd.DataFrame,
    anos: int,
    *,
    investimento: str = "fiis",
    area_m2: float = AREA_PADRAO_M2,
    **ajustes,
) -> pd.DataFrame:
    """Simula a decisão tomada em cada mês em que há `anos` de história pela frente.

    `ajustes` troca qualquer campo de `Parametros` (entrada_pct, disciplina...).
    Devolve uma linha por mês de início; os valores em reais estão a preços desse mês.
    """
    opcao = INVESTIMENTOS[investimento]
    meses = anos * 12
    caminho = _caminhos(serie, opcao)
    # A decisão é tomada no mês anterior ao primeiro mês de variações da janela.
    inicios = caminho.index[: len(caminho) - meses + 1] - pd.DateOffset(months=1)

    linhas = []
    for posicao, inicio in enumerate(inicios):
        if inicio not in serie.index:
            continue
        hoje = serie.loc[inicio]
        if pd.isna(hoje["venda_preco_m2"]) or pd.isna(hoje["aluguel_preco_m2"]):
            continue
        futuro = caminho.iloc[posicao : posicao + meses]
        p = Parametros(
            **{
                "valor_imovel": hoje["venda_preco_m2"] * area_m2,
                "aluguel_mensal": hoje["aluguel_preco_m2"] * area_m2,
                "juros_aa": hoje["juros_financiamento_aa"],
                "ir_ganho_carteira": opcao["ir"],
                **ajustes,
            }
        )
        resultado = simular(p, _cenario(futuro.to_numpy()[None]))
        deflator = resultado.deflator[0, -1]
        acumulado = (1 + futuro).prod()
        linhas.append(
            {
                "inicio": inicio,
                "fim": futuro.index[-1],
                "juros_aa": p.juros_aa,
                "valor_imovel": p.valor_imovel,
                "aluguel_mensal": p.aluguel_mensal,
                "patrimonio_comprador": resultado.patrimonio_comprador[0, -1] / deflator,
                "patrimonio_inquilino": resultado.patrimonio_inquilino[0, -1] / deflator,
                "vantagem_do_aluguel": resultado.vantagem_do_aluguel()[0, -1],
                "valorizacao_real_aa": (acumulado["valorizacao"] / acumulado["inflacao"]) ** (1 / anos) - 1,
                "carteira_retorno_real_aa": (acumulado["retorno"] / acumulado["inflacao"]) ** (1 / anos) - 1,
            }
        )
    return pd.DataFrame(linhas)


def monte_carlo(
    serie: pd.DataFrame,
    p: Parametros,
    *,
    anos: int = 30,
    caminhos: int = 5000,
    bloco_meses: int = 12,
    investimento: str = "fiis",
    semente: int = 0,
) -> Resultado:
    """Sorteia futuros reamostrando o histórico em blocos de meses consecutivos.

    Cada bloco leva junto imóvel, aluguel, carteira e inflação do mesmo período,
    o que preserva a relação entre eles e a inércia de curto prazo dos preços.
    O sorteio não inventa nada que o histórico não tenha: se o futuro for de um
    regime nunca visto na amostra, estes caminhos não o cobrem.
    """
    opcao = INVESTIMENTOS[investimento]
    historico = _caminhos(serie, opcao).to_numpy()
    sorteio = np.random.default_rng(semente)

    meses = anos * 12
    blocos = -(-meses // bloco_meses)  # arredonda para cima
    inicios = sorteio.integers(0, len(historico), size=(caminhos, blocos))
    # Um bloco que passa do fim da amostra continua no começo dela.
    posicoes = (inicios[:, :, None] + np.arange(bloco_meses)) % len(historico)
    sorteados = historico[posicoes.reshape(caminhos, -1)[:, :meses]]

    return simular(replace(p, ir_ganho_carteira=opcao["ir"]), _cenario(sorteados))


def sensibilidade(
    p: Parametros,
    *,
    anos: int,
    valorizacao_real_aa: np.ndarray,
    carteira_retorno_real_aa: np.ndarray,
    inflacao_aa: float = 0.045,
    carteira_rendimento_aa: float = 0.09,
) -> pd.DataFrame:
    """Vantagem do aluguel em cada combinação de valorização real do imóvel (colunas)
    e retorno real da carteira (linhas), com taxas fixas por todo o período.

    O aluguel acompanha o preço do imóvel, isto é, a rentabilidade do aluguel não muda.
    """
    meses = anos * 12
    retorno_real, valorizacao_real = np.meshgrid(carteira_retorno_real_aa, valorizacao_real_aa, indexing="ij")

    def nominal_mensal(real_aa: np.ndarray) -> np.ndarray:
        return np.repeat(taxa_mensal((1 + real_aa.ravel()) * (1 + inflacao_aa) - 1)[:, None], meses, axis=1)

    valorizacao = nominal_mensal(valorizacao_real)
    retorno = nominal_mensal(retorno_real)
    cenario = Cenario(
        valorizacao_mes=valorizacao,
        aluguel_var_mes=valorizacao,
        carteira_retorno_mes=retorno,
        # O rendimento distribuído não pode passar do retorno total (nem ser negativo).
        carteira_rendimento_mes=np.clip(taxa_mensal(carteira_rendimento_aa), 0, np.maximum(retorno, 0)),
        inflacao_mes=np.full_like(retorno, taxa_mensal(inflacao_aa)),
    )
    vantagem = simular(p, cenario).vantagem_do_aluguel()[:, -1].reshape(retorno_real.shape)
    return pd.DataFrame(
        vantagem,
        index=pd.Index(carteira_retorno_real_aa, name="carteira_retorno_real_aa"),
        columns=pd.Index(valorizacao_real_aa, name="valorizacao_real_aa"),
    )


def _caminhos(serie: pd.DataFrame, opcao: dict) -> pd.DataFrame:
    """As quatro variações mensais que o simulador usa, só nos meses em que todas existem."""
    caminho = pd.DataFrame(
        {
            "valorizacao": serie["valorizacao_mes"],
            "aluguel": serie["aluguel_var_mes"],
            "retorno": serie[opcao["retorno"]],
            "rendimento": serie[opcao["rendimento"]] if opcao["rendimento"] else 0.0,
            "inflacao": serie["ipca_var_mes"],
        }
    )
    caminho = caminho.dropna()
    # O backtest e o sorteio em blocos andam por posição: não pode haver mês faltando no meio.
    if not caminho.index.equals(pd.date_range(caminho.index[0], caminho.index[-1], freq="MS")):
        raise ValueError("A série tem meses faltando no meio.")
    return caminho


def _cenario(caminhos: np.ndarray) -> Cenario:
    """Matriz (caminhos × meses × 5 colunas de `_caminhos`) → Cenario."""
    return Cenario(*(caminhos[:, :, coluna] for coluna in range(caminhos.shape[2])))
