import numpy as np
import pandas as pd
import pytest

from juro_negativo import tratamento


def test_fim_de_mes_descarta_o_mes_incompleto():
    diario = pd.DataFrame(
        {
            "data": pd.to_datetime(["2022-07-29", "2022-08-01", "2022-08-31", "2022-09-01"]),
            "ibov": [103164.0, 102225.0, 109522.88, 110405.3],
        }
    )

    mensal = tratamento.fim_de_mes(diario, "ibov")

    assert mensal["data"].tolist() == list(pd.to_datetime(["2022-07-01", "2022-08-01"]))
    assert mensal["ibov"].tolist() == [103164.0, 109522.88]


def test_emendar_ajusta_a_serie_antiga_ao_nivel_da_nova():
    antiga = pd.Series([100.0, 110.0, 120.0, 130.0, np.nan])
    nova = pd.Series([np.nan, np.nan, 126.0, 136.5, 150.0])

    emendada = tratamento.emendar(antiga, nova)

    # Onde as duas existem, a nova vale 5% a mais; a antiga sobe 5% e a nova fica como está.
    assert emendada.tolist() == pytest.approx([105.0, 115.5, 126.0, 136.5, 150.0])


def test_retorno_total_reinveste_os_dividendos():
    preco = pd.Series([100.0, 110.0, 110.0, 99.0])
    dividendo_12m = pd.Series([12.0, 12.0, np.nan, np.nan])  # 1 por mês; depois, vale o último divulgado

    indice = tratamento.retorno_total(preco, dividendo_12m)

    assert indice.tolist() == pytest.approx([100.0, 111.0, 111.0 * 111 / 110, 111.0 * 111 / 110 * 100 / 110])


def test_montar_paises_desconta_a_inflacao_dos_12_meses_anteriores():
    meses = pd.date_range("2019-01-01", periods=25, freq="MS")
    precos = pd.DataFrame({"pais": "Brasil", "data": meses, "precos_indice": [100.0] * 12 + [110.0] * 13})
    juros = pd.DataFrame({"pais": "Brasil", "data": meses, "juro_aa": 0.045})

    paises = tratamento.montar_paises(juros, precos).set_index("data")

    assert paises.index[0] == pd.Timestamp("2020-01-01")  # antes disso não há 12 meses de inflação
    assert paises.loc["2020-01-01", "inflacao_12m"] == pytest.approx(0.10)
    assert paises.loc["2020-01-01", "juro_real_aa"] == pytest.approx(1.045 / 1.10 - 1)  # juro abaixo da inflação
    assert paises.loc["2021-01-01", "juro_real_aa"] == pytest.approx(0.045)  # inflação zero


def test_montar_paises_deixa_de_fora_a_hiperinflacao():
    meses = pd.date_range("2000-01-01", periods=13, freq="MS")
    precos = pd.DataFrame({"pais": "Argentina", "data": meses, "precos_indice": [1.0] * 12 + [20.0]})
    juros = pd.DataFrame({"pais": "Argentina", "data": meses, "juro_aa": 0.5})

    assert tratamento.montar_paises(juros, precos).empty


def test_montar_brasil_termina_no_ultimo_mes_com_inflacao_e_m2():
    meses = pd.date_range("2026-06-01", periods=4, freq="MS")
    sgs = pd.DataFrame(
        {
            "data": meses,
            "selic_var_mes": 0.01,
            "ipca_var_mes": [0.002, 0.001, -0.003, np.nan],  # setembro ainda não foi divulgado
            "dolar_fim": 5.0,
            "dolar_medio": [5.0, 5.2, 5.1, 5.1],
            "m1_antigo": np.nan,
            "m2_antigo": np.nan,
            "m1": 600.0,
            "m2": [7700.0, 7740.0, 7790.0, np.nan],
        }
    )
    dias = pd.to_datetime(["2026-06-30", "2026-07-31", "2026-08-31", "2026-09-30", "2026-10-02"])
    ibovespa = pd.DataFrame({"data": dias, "ibov": [170e3, 178e3, 177e3, 187e3, 192e3]})
    bitcoin = pd.DataFrame({"data": dias, "btc_usd": [60e3, 65e3, 78e3, 84e3, 85e3]})
    ouro = pd.DataFrame({"data": meses, "ouro_usd": [4228.0, 4073.0, 4411.0, 4319.0]})
    tesouro = pd.DataFrame({"data": meses, "tesouro_ipca_taxa_aa": 0.08})

    brasil = tratamento.montar_brasil(sgs, ibovespa, ouro, bitcoin, tesouro).set_index("data")

    assert brasil.index[-1] == pd.Timestamp("2026-08-01")
    assert brasil.loc["2026-07-01", "ouro_brl"] == pytest.approx(4073 * 5.2)  # média do mês × média do mês
    assert brasil.loc["2026-08-01", "btc_brl"] == pytest.approx(78e3 * 5.0)  # fim do mês × fim do mês
    assert "m2_antigo" not in brasil.columns


def test_montar_demografia_junta_as_tres_fontes():
    indicadores = pd.DataFrame(
        {
            "indicador": ["populacao", "populacao", "populacao", "fecundidade"],
            "pais": ["BRA", "BRA", "JPN", "BRA"],
            "ano": [2024, 2050, 2050, 2024],
            "valor": [212e6, 217e6, 105e6, 1.61],
        }
    )
    nascimentos = pd.DataFrame({"ano": [2024], "nascimentos": [2421079]})
    projecao = pd.DataFrame({"ano": [2050, 2070], "populacao_ibge": [218e6, 199e6]})

    demografia = tratamento.montar_demografia(indicadores, nascimentos, projecao).set_index(["pais", "ano"])

    assert list(demografia.index) == [("BRA", 2024), ("BRA", 2050), ("BRA", 2070), ("JPN", 2050)]
    assert demografia.loc[("BRA", 2024), "nascimentos_registrados"] == 2421079
    assert demografia.loc[("BRA", 2050), ["populacao", "populacao_ibge"]].tolist() == [217e6, 218e6]
    # 2070 só existe na projeção do IBGE; o Japão não tem dado brasileiro.
    assert pd.isna(demografia.loc[("BRA", 2070), "populacao"])
    assert demografia.loc[("BRA", 2070), "populacao_ibge"] == 199e6
    assert pd.isna(demografia.loc[("JPN", 2050), "populacao_ibge"])
