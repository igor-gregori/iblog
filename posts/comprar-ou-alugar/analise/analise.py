"""Medidas de retorno e risco usadas nos notebooks e na página."""

import numpy as np
import pandas as pd


def anualizar(variacao_mes):
    """Taxa mensal → taxa anual equivalente."""
    return (1 + variacao_mes) ** 12 - 1


def indice(variacoes: pd.DataFrame | pd.Series, base: float = 100.0):
    """Acumula variações mensais em um índice que vale `base` no mês anterior ao primeiro."""
    return base * (1 + variacoes).cumprod()


def em_termos_reais(variacoes: pd.DataFrame, inflacao: pd.Series) -> pd.DataFrame:
    """Desconta a inflação de cada variação mensal."""
    return (1 + variacoes).div(1 + inflacao, axis=0) - 1


def retorno_total_do_imovel(serie: pd.DataFrame, aluguel_liquido: float = 1.0) -> pd.Series:
    """Retorno mensal de ser dono de um imóvel alugado: valorização + aluguel recebido.

    `aluguel_liquido` é a fração do aluguel que sobra para o dono depois de
    vacância, administração, manutenção e imposto (1.0 = aluguel bruto).
    """
    return serie["valorizacao_mes"] + serie["rentabilidade_aluguel_mes"].shift(1) * aluguel_liquido


def maior_queda(variacoes: pd.Series) -> float:
    """Maior perda acumulada do pico até o fundo (número negativo)."""
    acumulado = (1 + variacoes.dropna()).cumprod()
    pico = acumulado.cummax().clip(lower=1)  # o primeiro pico é o valor antes do primeiro mês
    return float((acumulado / pico - 1).min())


def resumo(variacoes: pd.DataFrame, inflacao: pd.Series) -> pd.DataFrame:
    """Uma linha por ativo, medido nos meses em que todos têm dado."""
    comuns = variacoes.dropna()
    reais = em_termos_reais(comuns, inflacao.reindex(comuns.index))
    anos = len(comuns) / 12
    return pd.DataFrame(
        {
            "retorno_aa": (1 + comuns).prod() ** (1 / anos) - 1,
            "retorno_real_aa": (1 + reais).prod() ** (1 / anos) - 1,
            "volatilidade_aa": comuns.std() * np.sqrt(12),
            "maior_queda": comuns.apply(maior_queda),
            "maior_queda_real": reais.apply(maior_queda),
            "meses_negativos": (comuns < 0).mean(),
        }
    )


def janelas_moveis(variacoes: pd.DataFrame, anos: int) -> pd.DataFrame:
    """Retorno anualizado de cada janela de `anos`, indexado pelo mês em que a janela termina."""
    meses = anos * 12
    acumulado = (1 + variacoes).rolling(meses).apply(np.prod, raw=True)
    return (acumulado ** (1 / anos) - 1).dropna(how="all")
