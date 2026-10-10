import pandas as pd
import pytest

from comprar_ou_alugar import analise, tratamento


def test_ifix_fim_de_mes_descarta_o_mes_incompleto():
    ifix = pd.DataFrame(
        {
            "data": pd.to_datetime(
                ["2010-12-30", "2011-01-03", "2011-01-31", "2011-02-01", "2011-02-28", "2011-03-01"]
            ),
            "ifix": [1000.0, 1001.0, 1005.0, 1006.0, 1010.0, 1011.0],
        }
    )

    mensal = tratamento.ifix_fim_de_mes(ifix)

    assert mensal["data"].tolist() == list(pd.to_datetime(["2010-12-01", "2011-01-01", "2011-02-01"]))
    assert mensal["ifix"].tolist() == [1000.0, 1005.0, 1010.0]


def test_dividend_yield_do_mercado_pondera_pelo_patrimonio_e_filtra():
    def fundo(data, dy, patrimonio=1e8, cotistas=5000, bolsa=True):
        return {
            "data": pd.Timestamp(data),
            "dividend_yield_mes": dy,
            "patrimonio_liquido": patrimonio,
            "cotistas": cotistas,
            "negociado_em_bolsa": bolsa,
        }

    minimo = tratamento.MINIMO_FUNDOS_NO_MES
    janeiro = [fundo("2020-01-01", 0.006) for _ in range(minimo - 1)] + [fundo("2020-01-01", 0.012, patrimonio=3e8)]
    ignorados = [
        fundo("2020-01-01", 0.90),  # erro de preenchimento
        fundo("2020-01-01", 0.02, bolsa=False),
        fundo("2020-01-01", 0.02, cotistas=3),
    ]
    fevereiro = [fundo("2020-02-01", 0.007) for _ in range(minimo // 2)]  # informes ainda chegando

    dy = tratamento.dividend_yield_do_mercado(pd.DataFrame(janeiro + ignorados + fevereiro))

    assert dy["data"].tolist() == [pd.Timestamp("2020-01-01")]
    esperado = (0.006 * (minimo - 1) * 1e8 + 0.012 * 3e8) / ((minimo - 1) * 1e8 + 3e8)
    assert dy["fii_dividend_yield_mes"].iloc[0] == pytest.approx(esperado)


def test_montar_cidades_corrige_pela_inflacao():
    fipezap = pd.DataFrame(
        {
            "data": pd.to_datetime(["2020-01-01", "2020-02-01", "2020-03-01"]),
            "venda_preco_m2": [1000.0, 1000.0, 1000.0],
            "aluguel_preco_m2": [10.0, 10.0, 10.0],
        }
    )
    mensal = pd.DataFrame({"data": pd.to_datetime(["2020-01-01", "2020-02-01"]), "ipca_indice": [100.0, 110.0]})

    cidades = tratamento.montar_cidades(fipezap, mensal)

    # Valores a preços de fevereiro (último IPCA); março ainda não tem inflação divulgada.
    assert cidades["venda_preco_m2_real"].iloc[:2].tolist() == pytest.approx([1100.0, 1000.0])
    assert cidades["aluguel_preco_m2_real"].iloc[:2].tolist() == pytest.approx([11.0, 10.0])
    assert pd.isna(cidades["venda_preco_m2_real"].iloc[2])


def test_medidas_de_retorno():
    variacoes = pd.DataFrame({"sobe": [0.10, 0.10, 0.10], "cai_e_volta": [-0.50, 1.00, 0.10]})
    inflacao = pd.Series([0.10, 0.10, 0.10])

    assert analise.maior_queda(variacoes["sobe"]) == 0
    assert analise.maior_queda(variacoes["cai_e_volta"]) == pytest.approx(-0.50)
    assert analise.indice(variacoes["sobe"]).iloc[-1] == pytest.approx(133.1)

    resumo = analise.resumo(variacoes, inflacao)
    assert resumo.loc["sobe", "retorno_aa"] == pytest.approx(1.10**12 - 1)
    assert resumo.loc["sobe", "retorno_real_aa"] == pytest.approx(0)
    assert resumo.loc["cai_e_volta", "meses_negativos"] == pytest.approx(1 / 3)


def test_janelas_moveis():
    variacoes = pd.DataFrame({"a": [0.01] * 36}, index=pd.date_range("2020-01-01", periods=36, freq="MS"))

    janelas = analise.janelas_moveis(variacoes, anos=2)

    assert len(janelas) == 13  # a primeira janela de 24 meses termina no 24º mês
    assert janelas["a"].tolist() == pytest.approx([1.01**12 - 1] * 13)
