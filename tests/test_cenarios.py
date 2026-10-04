import numpy as np
import pandas as pd
import pytest

from comprar_ou_alugar import cenarios
from comprar_ou_alugar.simulador import Cenario, Parametros, simular


@pytest.fixture
def serie():
    """Dez anos em que tudo cresce a taxas mensais fixas."""
    datas = pd.date_range("2010-12-01", periods=121, freq="MS")
    crescimento = np.arange(121)
    return pd.DataFrame(
        {
            "venda_preco_m2": 10_000 * 1.004**crescimento,
            "aluguel_preco_m2": 50 * 1.005**crescimento,
            "valorizacao_mes": 0.004,
            "aluguel_var_mes": 0.005,
            "ifix_var_mes": 0.008,
            "cdi_var_mes": 0.007,
            "fii_dividend_yield_mes": 0.006,
            "ipca_var_mes": 0.003,
            "juros_financiamento_aa": 0.10,
        },
        index=datas,
    )


def test_backtest_em_serie_constante_bate_com_o_cenario_constante(serie):
    resultado = cenarios.backtest(serie, anos=5, area_m2=50)

    # 120 meses de variações e janelas de 60 meses: inícios do mês 0 ao 60.
    assert len(resultado) == 61
    primeira = resultado.iloc[0]
    assert primeira["inicio"] == pd.Timestamp("2010-12-01")
    assert primeira["fim"] == pd.Timestamp("2015-12-01")
    assert primeira["valor_imovel"] == pytest.approx(500_000)

    p = Parametros(valor_imovel=500_000, aluguel_mensal=2_500, juros_aa=0.10)
    fixo = Cenario(*(np.full((1, 60), taxa) for taxa in (0.004, 0.005, 0.008, 0.006, 0.003)))
    assert primeira["vantagem_do_aluguel"] == pytest.approx(simular(p, fixo).vantagem_do_aluguel()[0, -1])
    assert primeira["valorizacao_real_aa"] == pytest.approx((1.004 / 1.003) ** 12 - 1)


def test_backtest_aceita_ajustes_e_outro_investimento(serie):
    padrao = cenarios.backtest(serie, anos=5)
    sem_disciplina = cenarios.backtest(serie, anos=5, disciplina=0)
    em_cdi = cenarios.backtest(serie, anos=5, investimento="cdi")

    # Aqui a parcela é maior que o aluguel: sem investir a diferença, a inquilina fica para trás.
    assert (sem_disciplina["vantagem_do_aluguel"] < padrao["vantagem_do_aluguel"]).all()
    # O CDI da série rende menos que os FIIs.
    assert (em_cdi["vantagem_do_aluguel"] < padrao["vantagem_do_aluguel"]).all()


def test_backtest_recusa_serie_com_buraco(serie):
    serie.loc[serie.index[50], "ifix_var_mes"] = np.nan

    with pytest.raises(ValueError, match="faltando"):
        cenarios.backtest(serie, anos=5)


def test_monte_carlo_formato_e_reprodutibilidade(serie):
    p = Parametros(valor_imovel=500_000, aluguel_mensal=2_500)

    a = cenarios.monte_carlo(serie, p, anos=7, caminhos=50, semente=42)
    b = cenarios.monte_carlo(serie, p, anos=7, caminhos=50, semente=42)

    assert a.patrimonio_inquilino.shape == (50, 7 * 12 + 1)
    assert np.array_equal(a.patrimonio_inquilino, b.patrimonio_inquilino)
    # Reamostrar uma série constante devolve sempre o mesmo caminho.
    assert np.allclose(a.vantagem_do_aluguel(), a.vantagem_do_aluguel()[0])


def test_sorteio_em_blocos_mantem_meses_consecutivos_juntos(serie):
    # Marca cada mês com um número de ordem na coluna da inflação e confere que,
    # dentro de um bloco, os meses sorteados são vizinhos na série original.
    serie["ipca_var_mes"] = np.arange(len(serie)) / 1e6
    p = Parametros(valor_imovel=500_000, aluguel_mensal=2_500)

    r = cenarios.monte_carlo(serie, p, anos=2, caminhos=20, bloco_meses=12, semente=3)

    ordem = np.round((r.deflator[:, 1:] / r.deflator[:, :-1] - 1) * 1e6).astype(int)
    passos = np.diff(ordem[:, :12], axis=1) % len(serie)
    assert (passos == 1).all()


def test_sensibilidade_tem_a_orientacao_certa():
    p = Parametros(valor_imovel=500_000, aluguel_mensal=2_500)

    grade = cenarios.sensibilidade(
        p,
        anos=20,
        valorizacao_real_aa=np.array([-0.02, 0.0, 0.03]),
        carteira_retorno_real_aa=np.array([0.0, 0.04, 0.08, 0.12]),
    )

    assert grade.shape == (4, 3)
    # Carteira rendendo mais ajuda quem aluga; imóvel valorizando mais ajuda quem compra.
    assert (np.diff(grade.to_numpy(), axis=0) > 0).all()
    assert (np.diff(grade.to_numpy(), axis=1) < 0).all()


def test_parametros_de_hoje_usa_o_ultimo_mes_com_preco_e_aluguel(serie):
    serie.loc[serie.index[-1], "aluguel_preco_m2"] = np.nan  # o aluguel sai um mês depois da venda

    p = cenarios.parametros_de_hoje(serie, area_m2=100, entrada_pct=0.3)

    penultimo = serie.iloc[-2]
    assert p.valor_imovel == pytest.approx(penultimo["venda_preco_m2"] * 100)
    assert p.aluguel_mensal == pytest.approx(penultimo["aluguel_preco_m2"] * 100)
    assert p.juros_aa == 0.10
    assert p.entrada_pct == 0.3


def test_compra_a_vista_gasta_todo_o_dinheiro_dos_dois_lados():
    p = cenarios.compra_a_vista(525_000, preco_m2=5_000, aluguel_m2=25)

    assert p.valor_imovel == pytest.approx(500_000)  # 5% de custos da compra
    assert p.aluguel_mensal == pytest.approx(2_500)  # 0,5% do preço por mês, como o m²
    assert p.entrada_pct == 1.0

    resultado = simular(p, cenarios.fundos_a_taxas_fixas(24, rendimento_mes=0.01, cota_aa=0.0, inflacao_aa=0.045))
    assert resultado.carteira_inquilino[0, 0] == pytest.approx(525_000)
    assert (resultado.saldo_devedor == 0).all()
    # Sem parcela, quem compra só gasta com manutenção e investe o resto do aluguel que não paga.
    assert resultado.carteira_comprador[0, 1] == pytest.approx(2_500 - 500_000 * 0.01 / 12)


def test_fundos_a_taxas_fixas_separam_rendimento_e_cota():
    parada = cenarios.fundos_a_taxas_fixas(12, rendimento_mes=0.01, cota_aa=0.0, inflacao_aa=0.045)
    caindo = cenarios.fundos_a_taxas_fixas(12, rendimento_mes=0.01, cota_aa=-0.05, inflacao_aa=0.045)

    # Com a cota parada, o retorno total é só o rendimento.
    np.testing.assert_allclose(parada.carteira_retorno_mes, 0.01)
    np.testing.assert_allclose(parada.carteira_rendimento_mes, 0.01)
    # Com a cota caindo, o rendimento é o mesmo e o retorno total encolhe.
    np.testing.assert_allclose(caindo.carteira_rendimento_mes, 0.01)
    assert (1 + caindo.carteira_retorno_mes[0]).prod() == pytest.approx(1.01**12 * 0.95)
