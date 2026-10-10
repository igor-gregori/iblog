"""Conferências de sanidade nas tabelas tratadas (rodam depois do pipeline)."""

import pandas as pd
import pytest

from juro_negativo import analise
from juro_negativo.caminhos import TRATADOS
from juro_negativo.fontes import afirmacoes, bis

pytestmark = pytest.mark.skipif(
    not (TRATADOS / "brasil.parquet").exists(), reason="rode `uv run python -m juro_negativo` antes"
)


@pytest.fixture(scope="module")
def brasil():
    return pd.read_parquet(TRATADOS / "brasil.parquet").set_index("data")


@pytest.fixture(scope="module")
def eua():
    return pd.read_parquet(TRATADOS / "eua.parquet").set_index("data")


@pytest.fixture(scope="module")
def paises():
    return pd.read_parquet(TRATADOS / "paises.parquet")


@pytest.fixture(scope="module")
def demografia():
    return pd.read_parquet(TRATADOS / "demografia.parquet").set_index(["pais", "ano"])


def test_series_mensais_sem_buracos(brasil, eua):
    for tabela in (brasil, eua):
        assert tabela.index.equals(pd.date_range(tabela.index[0], tabela.index[-1], freq="MS"))
    assert brasil.index[0] == pd.Timestamp("1994-07-01")  # o primeiro mês do real
    sempre_preenchidas = ["selic_var_mes", "cdi_var_mes", "ipca_var_mes", "ibov", "ouro_brl", "dolar_fim", "m1", "m2"]
    assert brasil[sempre_preenchidas].notna().all().all()
    assert brasil.loc["2001-12-01":, ["m3", "m4"]].notna().all().all()


def test_indicadores_em_faixas_plausiveis(brasil):
    assert brasil["ipca_var_mes"].between(-0.02, 0.08).all()
    assert brasil["selic_var_mes"].between(0, 0.08).all()
    assert (brasil["selic_var_mes"] - brasil["cdi_var_mes"]).abs().max() < 0.005
    assert brasil["tesouro_ipca_taxa_aa"].dropna().between(0.01, 0.12).all()
    assert brasil["ibov"].pct_change().dropna().between(-0.45, 0.45).all()  # sem degraus das divisões por 10


def test_os_agregados_sao_cada_vez_mais_amplos(brasil):
    recente = brasil.loc["2002-01-01":]
    assert (recente["base_monetaria"] < recente["m2"]).all()
    assert (recente["m1"] < recente["m2"]).all()
    assert (recente["m2"] < recente["m3"]).all()
    assert (recente["m3"] < recente["m4"]).all()


def test_emenda_do_m2_nao_deixa_degrau(brasil):
    # Dezembro de 2001 é o primeiro mês da série nova; o mês anterior vem da antiga, ajustada.
    assert abs(brasil.loc["2001-12-01", "m2"] / brasil.loc["2001-11-01", "m2"] - 1) < 0.08


def test_numeros_do_texto_que_devem_bater_com_folga_minima(brasil):
    """Selic, CDI e Ibovespa de ponta a ponta saem das mesmas fontes que o texto usou: batem quase exatamente."""
    niveis = analise.niveis_do_brasil(brasil.reset_index())
    citadas = afirmacoes.ler()
    conferidas = analise.conferir(citadas[citadas["pais"] == "Brasil"], {"Brasil": niveis})

    juros = conferidas[conferidas["serie"].isin(["selic", "cdi"]) & (conferidas["grupo"] != "Pandemia")]
    assert len(juros) == 7
    assert juros["erro_relativo"].abs().max() < 0.002

    ibovespa = conferidas[(conferidas["serie"] == "ibovespa") & (conferidas["grupo"] == "1995 a 2022")]
    assert abs(ibovespa["erro_relativo"].iloc[0]) < 0.001


def test_m1_dos_eua_salta_com_a_mudanca_de_definicao(eua):
    # Em maio de 2020 o Fed passou a contar as contas de poupança no M1.
    assert eua.loc["2020-05-01", "m1"] / eua.loc["2020-04-01", "m1"] > 3
    assert eua.loc["2020-05-01", "m2"] / eua.loc["2020-04-01", "m2"] < 1.1
    assert eua["sp500_retorno_total"].notna().all()


def test_dinheiro_dos_eua_do_mais_restrito_ao_mais_amplo(eua):
    # O papel-moeda é parte da base monetária, e o M2 é maior que os dois.
    assert (eua["papel_moeda"] < eua["base_monetaria"]).all()
    assert (eua["base_monetaria"] < eua["m2"]).all()
    # A mudança de definição de maio de 2020 mexeu no M1, não no papel-moeda.
    assert eua.loc["2020-05-01", "papel_moeda"] / eua.loc["2020-04-01", "papel_moeda"] < 1.05


def test_paises(paises):
    assert set(paises["pais"]) == set(bis.PAISES.values())
    assert not paises.duplicated(["pais", "data"]).any()
    brasil = paises[paises["pais"] == "Brasil"].set_index("data")
    assert brasil.loc["2003-01-01":, "juro_real_aa"].between(-0.07, 0.20).all()


def test_demografia(demografia):
    brasil = demografia.loc["BRA"]
    assert brasil.loc[1970, "fecundidade"] > 4 > brasil.loc[1990, "fecundidade"] > 2.1 > brasil.loc[2020, "fecundidade"]
    assert brasil.loc[2022, "populacao"] > 200e6
    faixas = [coluna for coluna in brasil.columns if coluna.startswith("idade_")]
    assert len(faixas) == 34
    # As faixas de idade somam a população total.
    assert brasil.loc[2025, faixas].sum() == pytest.approx(brasil.loc[2025, "populacao"], rel=1e-3)
    assert brasil["nascimentos_registrados"].dropna().between(2e6, 4e6).all()


def test_projecao_do_ibge(demografia):
    brasil = demografia.loc["BRA"]
    projecao = brasil["populacao_ibge"].dropna()
    assert (projecao.index[0], projecao.index[-1]) == (2000, 2070)
    # A população para de crescer na década de 2040, nas duas projeções, e a do IBGE segue a da ONU de perto.
    assert 2035 <= projecao.idxmax() <= 2050
    assert 2035 <= brasil["populacao"].idxmax() <= 2050
    assert (projecao / brasil["populacao"]).dropna().between(0.97, 1.03).all()
    # Só o Brasil tem linhas depois de 2050.
    assert demografia.index.get_level_values("ano")[demografia.index.get_level_values("pais") != "BRA"].max() == 2050
