"""Conferências de sanidade nas tabelas tratadas (rodam depois do pipeline)."""

import pandas as pd
import pytest

from comprar_ou_alugar.caminhos import TRATADOS
from comprar_ou_alugar.fontes.fipezap import NACIONAL

pytestmark = pytest.mark.skipif(
    not (TRATADOS / "mensal.parquet").exists(), reason="rode `uv run python -m comprar_ou_alugar` antes"
)


@pytest.fixture(scope="module")
def cidades():
    return pd.read_parquet(TRATADOS / "cidades.parquet")


@pytest.fixture(scope="module")
def mensal():
    return pd.read_parquet(TRATADOS / "mensal.parquet").set_index("data")


def test_cidades_cobertas(cidades):
    nomes = set(cidades["cidade"])

    assert len(nomes - {NACIONAL}) >= 56
    assert {"São Paulo", "Rio de Janeiro", "Belo Horizonte", NACIONAL} <= nomes
    assert cidades[cidades["cidade"] != NACIONAL]["uf"].notna().all()


def test_uma_linha_por_mes_cidade_e_recorte(cidades):
    assert not cidades.duplicated(["data", "cidade", "quartos"]).any()
    assert (cidades["data"].dt.day == 1).all()


def test_precos_em_faixas_plausiveis(cidades):
    assert cidades["venda_preco_m2"].dropna().between(1_000, 40_000).all()
    assert cidades["aluguel_preco_m2"].dropna().between(5, 200).all()
    # Entre 1,2% e 18% ao ano de rentabilidade do aluguel.
    assert cidades["rentabilidade_aluguel_mes"].dropna().between(0.001, 0.015).all()


def test_serie_mensal_sem_buracos(mensal):
    assert mensal.index.equals(pd.date_range(mensal.index[0], mensal.index[-1], freq="MS"))


def test_ifix_comeca_em_mil_pontos(mensal):
    assert mensal.loc["2010-12-01", "ifix"] == 1000
    assert mensal.loc["2011-01-01":, "ifix_var_mes"].notna().all()
    assert mensal["ifix_var_mes"].dropna().between(-0.25, 0.25).all()


def test_indicadores_em_faixas_plausiveis(mensal):
    assert mensal["ipca_var_mes"].dropna().between(-0.02, 0.05).all()
    assert mensal["cdi_var_mes"].dropna().between(0, 0.03).all()
    assert mensal["juros_financiamento_aa"].dropna().between(0.05, 0.20).all()
    assert mensal["tesouro_ipca_taxa_aa"].dropna().between(0.01, 0.12).all()
    assert mensal["fii_dividend_yield_mes"].dropna().between(0.003, 0.015).all()
