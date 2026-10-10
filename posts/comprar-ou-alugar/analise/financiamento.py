"""Tabelas de financiamento imobiliário: SAC e Price."""

import numpy as np
import pandas as pd


def taxa_mensal(taxa_aa: float) -> float:
    """Taxa efetiva mensal equivalente a uma taxa efetiva anual."""
    return (1 + taxa_aa) ** (1 / 12) - 1


def tabela(principal: float, juros_aa: float, prazo_meses: int, sistema: str = "SAC") -> pd.DataFrame:
    """Uma linha por parcela. Colunas: mes, juros, amortizacao, parcela, saldo (depois de pagar).

    SAC: amortização constante, parcela decrescente (o mais comum no Brasil).
    PRICE: parcela constante.
    """
    i = taxa_mensal(juros_aa)
    pagas = np.arange(prazo_meses)  # parcelas já pagas antes de cada mês

    if sistema == "SAC":
        amortizacao = np.full(prazo_meses, principal / prazo_meses)
        saldo_antes = principal - amortizacao * pagas
        juros = saldo_antes * i
    elif sistema == "PRICE":
        if i == 0:
            parcela = principal / prazo_meses
            saldo_antes = principal - parcela * pagas
        else:
            parcela = principal * i / (1 - (1 + i) ** -prazo_meses)
            saldo_antes = principal * (1 + i) ** pagas - parcela * ((1 + i) ** pagas - 1) / i
        juros = saldo_antes * i
        amortizacao = parcela - juros
    else:
        raise ValueError(f"Sistema de amortização desconhecido: {sistema!r} (use 'SAC' ou 'PRICE').")

    return pd.DataFrame(
        {
            "mes": pagas + 1,
            "juros": juros,
            "amortizacao": amortizacao,
            "parcela": juros + amortizacao,
            "saldo": saldo_antes - amortizacao,
        }
    )
