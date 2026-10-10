import numpy as np
import pytest

from comprar_ou_alugar.simulador import Cenario, Parametros, simular

SEM_CUSTOS = dict(custos_compra_pct=0, manutencao_aa=0, corretagem_venda_pct=0, ir_ganho_carteira=0)


def cenario(meses=120, **taxas):
    padrao = dict(
        valorizacao_aa=0, reajuste_aluguel_aa=0, carteira_retorno_aa=0, carteira_rendimento_aa=0, inflacao_aa=0
    )
    return Cenario.constante(meses, **(padrao | taxas))


def test_sem_juros_nem_retornos_as_duas_terminam_iguais():
    # Sem juros, valorização, retorno, custos nem aluguel, pagar a parcela e
    # guardar o mesmo dinheiro dão no mesmo: o patrimônio é igual em todo mês.
    p = Parametros(valor_imovel=500_000, aluguel_mensal=0, juros_aa=0, prazo_meses=120, **SEM_CUSTOS)
    r = simular(p, cenario())

    assert np.allclose(r.patrimonio_comprador, r.patrimonio_inquilino)
    assert r.patrimonio_comprador[0, -1] == pytest.approx(500_000)
    assert np.allclose(r.vantagem_do_aluguel(), 0)


def test_as_duas_desembolsam_o_mesmo_todo_mes():
    # Com retorno zero, o que a carteira cresce no mês é exatamente o aporte.
    p = Parametros(valor_imovel=500_000, aluguel_mensal=3_500, prazo_meses=120)
    r = simular(p, cenario(240, valorizacao_aa=0.05, reajuste_aluguel_aa=0.08))

    desembolso_comprador = r.gasto_comprador + np.diff(r.carteira_comprador, prepend=0)
    desembolso_inquilino = r.aluguel + np.diff(r.carteira_inquilino, prepend=0)
    assert np.allclose(desembolso_comprador[:, 1:], desembolso_inquilino[:, 1:])
    # Neste cenário cada uma investe em uma parte do período.
    assert r.carteira_inquilino[0, 12] > r.carteira_inquilino[0, 0]
    assert r.carteira_comprador[0, 12] == 0
    assert r.carteira_comprador[0, -1] > 0


def test_no_dia_da_compra():
    p = Parametros(valor_imovel=800_000, aluguel_mensal=4_000)
    r = simular(p, cenario())

    assert r.saldo_devedor[0, 0] == pytest.approx(640_000)
    # A inquilina tem a entrada (20%) mais os custos da compra (5%).
    assert r.patrimonio_inquilino[0, 0] == pytest.approx(200_000)
    # A compradora tem o imóvel, menos a corretagem de uma venda (6%), menos a dívida.
    assert r.patrimonio_comprador[0, 0] == pytest.approx(800_000 * 0.94 - 640_000)


def test_depois_do_prazo_nao_ha_parcela_nem_divida():
    p = Parametros(valor_imovel=500_000, aluguel_mensal=2_500, prazo_meses=60, manutencao_aa=0)
    r = simular(p, cenario(120))

    assert np.allclose(r.saldo_devedor[0, 60:], 0)
    assert np.allclose(r.gasto_comprador[0, 61:], 0)
    assert r.gasto_comprador[0, 60] > 0


def test_aluguel_e_reajustado_uma_vez_por_ano():
    p = Parametros(valor_imovel=500_000, aluguel_mensal=2_000)
    r = simular(p, cenario(36, reajuste_aluguel_aa=0.10))

    assert np.allclose(r.aluguel[0, 1:13], 2_000)
    assert np.allclose(r.aluguel[0, 13:25], 2_200)
    assert np.allclose(r.aluguel[0, 25:37], 2_420)


def test_imposto_incide_so_sobre_o_ganho_de_capital():
    # Sem aportes mensais (disciplina 0), a carteira da inquilina é só o valor inicial rendendo.
    p = Parametros(valor_imovel=400_000, aluguel_mensal=0, disciplina=0, ir_ganho_carteira=0.20)
    inicial = 400_000 * 0.25

    so_valorizacao = simular(p, cenario(12, carteira_retorno_aa=0.10))
    assert so_valorizacao.carteira_inquilino[0, -1] == pytest.approx(inicial * 1.10)
    assert so_valorizacao.patrimonio_inquilino[0, -1] == pytest.approx(inicial * (1 + 0.10 * 0.80))

    # Se todo o retorno veio de rendimento distribuído (isento) e reinvestido, não há ganho a tributar.
    so_rendimento = simular(p, cenario(12, carteira_retorno_aa=0.10, carteira_rendimento_aa=0.10))
    assert so_rendimento.patrimonio_inquilino[0, -1] == pytest.approx(inicial * 1.10)


def test_resultado_em_valores_de_hoje():
    p = Parametros(valor_imovel=500_000, aluguel_mensal=0, juros_aa=0, prazo_meses=120, **SEM_CUSTOS)
    r = simular(p, cenario(12, inflacao_aa=0.10))

    assert r.deflator[0, 0] == 1
    assert r.deflator[0, -1] == pytest.approx(1.10)


def test_sentido_da_vantagem():
    p = Parametros(valor_imovel=500_000, aluguel_mensal=2_500)

    carteira_rende_muito = simular(p, cenario(240, carteira_retorno_aa=0.20))
    assert carteira_rende_muito.vantagem_do_aluguel()[0, -1] > 0

    imovel_valoriza_muito = simular(p, cenario(240, valorizacao_aa=0.20, reajuste_aluguel_aa=0.20))
    assert imovel_valoriza_muito.vantagem_do_aluguel()[0, -1] < 0


def test_varios_caminhos_de_uma_vez_dao_o_mesmo_que_um_por_um():
    sorteio = np.random.default_rng(1)
    matrizes = [sorteio.normal(0.005, 0.02, size=(3, 48)) for _ in range(5)]
    p = Parametros(valor_imovel=600_000, aluguel_mensal=3_000)

    juntos = simular(p, Cenario(*matrizes)).vantagem_do_aluguel()
    for i in range(3):
        sozinho = simular(p, Cenario(*(m[i : i + 1] for m in matrizes))).vantagem_do_aluguel()
        assert np.allclose(juntos[i], sozinho[0])
