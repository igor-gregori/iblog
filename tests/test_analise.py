import numpy as np
import pandas as pd
import pytest

from juro_negativo import analise


@pytest.fixture
def niveis():
    """Quatro anos em que o ativo rende 1% ao mês e a régua cresce 0,5% ao mês."""
    meses = pd.date_range("2019-12-01", periods=49, freq="MS")
    passos = np.arange(49)
    return pd.DataFrame({"ativo": 100 * 1.01**passos, "regua": 50 * 1.005**passos}, index=meses)


def test_variacao_vai_da_abertura_de_um_mes_a_abertura_do_outro(niveis):
    v = analise.variacao(niveis, "2020-01", "2021-01")

    # Abertura de janeiro = fim de dezembro. São 12 meses cheios.
    assert v["ativo"] == pytest.approx(1.01**12 - 1)
    assert v["regua"] == pytest.approx(1.005**12 - 1)
    assert analise.meses_entre("2020-01", "2021-01") == 12


def test_descontar_e_anualizar():
    assert analise.descontar(0.21, 0.10) == pytest.approx(0.10)
    assert analise.descontar(0.05, 0.10) < 0
    assert analise.anualizar(0.21, 24) == pytest.approx(0.10)
    assert analise.anualizar(analise.descontar(1.01**36 - 1, 1.005**36 - 1), 36) == pytest.approx(
        (1.01 / 1.005) ** 12 - 1
    )


def test_janelas_sao_indexadas_pelo_mes_em_que_comecam(niveis):
    taxas = analise.janelas(niveis, 2)

    assert taxas.index[0] == pd.Timestamp("2020-01-01")
    assert taxas.index[-1] == pd.Timestamp("2022-01-01")  # a última janela termina na abertura de jan/2024
    assert taxas["ativo"].tolist() == pytest.approx([1.01**12 - 1] * len(taxas))


def test_matriz_de_periodos(niveis):
    matriz = analise.matriz_de_periodos(niveis, "ativo", "regua")

    assert list(matriz.index) == [2020, 2021, 2022, 2023]
    assert list(matriz.columns) == [2021, 2022, 2023, 2024]
    assert matriz.loc[2020, 2024] == pytest.approx((1.01 / 1.005) ** 12 - 1)
    assert matriz.loc[2022, 2023] == pytest.approx((1.01 / 1.005) ** 12 - 1)
    assert np.isnan(matriz.loc[2022, 2022]) and np.isnan(matriz.loc[2023, 2021])


def test_conferir_compara_o_citado_com_o_calculado(niveis):
    afirmacoes = pd.DataFrame(
        {
            "pais": ["Brasil", "Brasil"],
            "inicio": pd.to_datetime(["2020-01-01", "2020-01-01"]),
            "fim": pd.to_datetime(["2021-01-01", "2022-01-01"]),
            "serie": ["ativo", "regua"],
            "variacao_citada": [1.01**12 - 1, 0.50],
        }
    )

    conferidas = analise.conferir(afirmacoes, {"Brasil": niveis})

    assert conferidas["diferenca"].iloc[0] == pytest.approx(0)
    assert conferidas["variacao_calculada"].iloc[1] == pytest.approx(1.005**24 - 1)
    assert conferidas["erro_relativo"].iloc[1] == pytest.approx(1.005**24 / 1.5 - 1)


def brasil_de_teste():
    """Dois anos: preços sobem 0,4% ao mês, o PIB nominal 0,7% e o M2 1%; a Selic paga 0,9%."""
    meses = pd.date_range("2020-01-01", periods=24, freq="MS")
    passos = np.arange(1, 25)
    return pd.DataFrame(
        {
            "data": meses,
            "selic_var_mes": 0.009,
            "cdi_var_mes": 0.009,
            "ipca_var_mes": 0.004,
            "ibov": 100e3,
            "ouro_brl": 9e3,
            "dolar_fim": 5.0,
            "btc_brl": 200e3,
            "pib_12m": 7000 * 1.007**passos,
            "base_monetaria": 400.0,
            "m1": 600 * 1.002**passos,
            "m2": 3000 * 1.01**passos,
            "m3": 7000.0,
            "m4": 8000.0,
            "salario_minimo": 1000.0,
            "ivgr": 500.0,
        }
    )


def test_niveis_do_brasil_comecam_em_um_na_vespera():
    niveis = analise.niveis_do_brasil(brasil_de_teste())

    assert niveis.index[0] == pd.Timestamp("2019-12-01")
    assert niveis.loc["2019-12-01", ["selic", "cdi", "ipca"]].tolist() == [1.0, 1.0, 1.0]
    assert niveis.loc["2020-12-01", "selic"] == pytest.approx(1.009**12)
    assert analise.variacao(niveis, "2020-01", "2021-01")["selic"] == pytest.approx(1.009**12 - 1)


def test_decompor_m2_multiplica_ate_o_total():
    partes = analise.decompor_m2(brasil_de_teste(), "2020-02", "2022-01")

    assert (1 + partes["precos"]) * (1 + partes["pib_real"]) * (1 + partes["m2_sobre_pib"]) == pytest.approx(
        1 + partes["m2"]
    )
    assert partes["precos"] == pytest.approx(1.004**23 - 1)
    assert partes["pib_real"] == pytest.approx((1.007 / 1.004) ** 23 - 1)
    assert partes["m2_sobre_pib"] == pytest.approx((1.01 / 1.007) ** 23 - 1)


def test_juro_real_12m_por_regua():
    tabela = analise.juro_real_12m(brasil_de_teste())

    assert tabela.index[0] == pd.Timestamp("2020-12-01")  # precisa de 12 meses
    assert tabela["real_ipca"].iloc[-1] == pytest.approx((1.009 / 1.004) ** 12 - 1)
    assert tabela["real_m2"].iloc[-1] == pytest.approx((1.009 / 1.01) ** 12 - 1)
    assert analise.fracao_negativa(tabela["real_ipca"]) == 0
    assert analise.fracao_negativa(tabela.loc["2021-01-01":, "real_m2"]) == 1


def test_participacao_remunerada_do_m2():
    participacao = analise.participacao_remunerada_do_m2(brasil_de_teste())

    assert participacao.iloc[0] == pytest.approx(1 - 600 * 1.002 / (3000 * 1.01))
    assert participacao.is_monotonic_increasing


def test_poupar_todo_mes_empata_quando_o_ativo_rende_o_deflator():
    meses = pd.date_range("2019-12-01", periods=13, freq="MS")
    niveis = pd.DataFrame({"ativo": 1.01 ** np.arange(13), "deflator": 1.01 ** np.arange(13)}, index=meses)

    multiplo = analise.poupar_todo_mes(niveis, "ativo", "deflator", "2020-01", "2021-01")

    assert len(multiplo) == 12
    assert multiplo.tolist() == pytest.approx([1.0] * 12)


def test_poupar_todo_mes_com_rendimento_real_constante():
    meses = pd.date_range("2019-12-01", periods=4, freq="MS")
    niveis = pd.DataFrame({"ativo": [1.0, 1.1, 1.21, 1.331], "deflator": 1.0}, index=meses)

    multiplo = analise.poupar_todo_mes(niveis, "ativo", "deflator", "2020-01", "2020-04")

    # Três aportes de 1: o primeiro rende três meses, o segundo dois, o terceiro um.
    assert multiplo.iloc[-1] == pytest.approx((1.331 + 1.21 + 1.1) / 3)
    assert multiplo.iloc[0] == pytest.approx(1.1)


def test_poder_de_compra_usa_o_ultimo_mes_de_cada_coisa():
    brasil = brasil_de_teste()
    brasil.loc[brasil.index[-1], "ivgr"] = np.nan  # o índice de imóveis sai com atraso
    niveis = analise.niveis_do_brasil(brasil)

    compras = analise.poder_de_compra(niveis, "selic", "2020-02", "2022-01")

    assert set(compras.index) == set(analise.COMPRAS)
    assert compras["ipca"] == pytest.approx((1.009 / 1.004) ** 23)
    assert compras["m2"] == pytest.approx((1.009 / 1.01) ** 23)
    assert compras["dolar"] == pytest.approx(1.009**23)  # o dólar ficou parado
    assert compras["imoveis"] == pytest.approx(1.009**22)  # medido até o penúltimo mês


@pytest.fixture
def sobe_e_desce():
    """Dez meses de um ativo que bate recordes e cai entre um e outro."""
    meses = pd.date_range("2019-12-01", periods=10, freq="MS")
    return pd.DataFrame({"ativo": [100.0, 120.0, 60.0, 90.0, 130.0, 130.0, 65.0, 70.0, 140.0, 133.0]}, index=meses)


def test_distancia_do_pico(sobe_e_desce):
    distancia = analise.distancia_do_pico(sobe_e_desce, "ativo", "2020-01", "2020-10")

    assert distancia.index[0] == pd.Timestamp("2019-12-01")  # a abertura de janeiro é o fim de dezembro
    assert distancia.tolist() == pytest.approx([0, 0, -0.5, -0.25, 0, 0, -0.5, 70 / 130 - 1, 0, -0.05])


def test_distancia_do_pico_conta_o_recorde_so_dentro_do_periodo(sobe_e_desce):
    distancia = analise.distancia_do_pico(sobe_e_desce, "ativo", "2020-03", "2020-05")

    # Começa no fim de fevereiro (60): o recorde anterior, de 120, fica de fora.
    assert distancia.tolist() == pytest.approx([0, 0, 0])


def test_quedas_vao_de_um_recorde_ao_fundo_antes_do_recorde_seguinte(sobe_e_desce):
    todas = analise.quedas(sobe_e_desce, "ativo", "2020-01", "2020-10")

    assert todas["pico"].tolist() == list(pd.to_datetime(["2020-01-01", "2020-05-01", "2020-08-01"]))
    assert todas["fundo"].tolist() == list(pd.to_datetime(["2020-02-01", "2020-06-01", "2020-09-01"]))
    # A última ainda está em aberto: o período acaba antes de um novo recorde.
    assert todas["queda"].tolist() == pytest.approx([-0.5, -0.5, -0.05])


def test_quedas_filtra_pelo_tamanho_e_ignora_meses_sem_dado(sobe_e_desce):
    sobe_e_desce.loc["2019-12-01", "ativo"] = np.nan  # o ativo ainda não tinha preço

    grandes = analise.quedas(sobe_e_desce, "ativo", "2020-01", "2020-10", minima=0.5)

    assert grandes["queda"].tolist() == pytest.approx([-0.5, -0.5])  # perder exatamente metade conta
    assert analise.quedas(sobe_e_desce, "ativo", "2020-01", "2020-10", minima=0.51).empty


def test_quedas_de_quem_so_sobe():
    meses = pd.date_range("2019-12-01", periods=5, freq="MS")
    niveis = pd.DataFrame({"ativo": [1.0, 1.01, 1.02, 1.03, 1.04]}, index=meses)

    assert analise.quedas(niveis, "ativo", "2020-01", "2020-05").empty
