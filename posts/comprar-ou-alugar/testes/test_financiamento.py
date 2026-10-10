import numpy as np
import pytest

from comprar_ou_alugar import financiamento


@pytest.mark.parametrize("sistema", ["SAC", "PRICE"])
@pytest.mark.parametrize("juros_aa", [0.0, 0.11])
def test_financiamento_quita_a_divida(sistema, juros_aa):
    tabela = financiamento.tabela(640_000, juros_aa, 360, sistema)

    assert len(tabela) == 360
    assert tabela["amortizacao"].sum() == pytest.approx(640_000)
    assert tabela["saldo"].iloc[-1] == pytest.approx(0, abs=1e-6)
    assert np.allclose(tabela["parcela"], tabela["juros"] + tabela["amortizacao"])


def test_sac_tem_amortizacao_constante_e_parcela_decrescente():
    tabela = financiamento.tabela(360_000, 0.12, 360, "SAC")

    assert np.allclose(tabela["amortizacao"], 1_000)
    assert tabela["parcela"].is_monotonic_decreasing
    # Primeira parcela: amortização + juros de um mês sobre a dívida inteira.
    assert tabela["parcela"].iloc[0] == pytest.approx(1_000 + 360_000 * financiamento.taxa_mensal(0.12))


def test_price_tem_parcela_constante():
    tabela = financiamento.tabela(360_000, 0.12, 360, "PRICE")

    assert np.allclose(tabela["parcela"], tabela["parcela"].iloc[0])
    assert tabela["amortizacao"].is_monotonic_increasing


def test_taxa_mensal_compoe_ate_a_anual():
    assert (1 + financiamento.taxa_mensal(0.11)) ** 12 == pytest.approx(1.11)


def test_sistema_desconhecido_da_erro():
    with pytest.raises(ValueError, match="SAC"):
        financiamento.tabela(100_000, 0.10, 120, "americano")
