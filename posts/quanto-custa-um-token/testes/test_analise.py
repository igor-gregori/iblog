import pytest
from quanto_custa_um_token import tokens
from quanto_custa_um_token.amostras import ler_amostras
from quanto_custa_um_token.custos import Preco, custo, ler_precos


def test_os_pedacos_voltam_a_ser_o_texto_e_somam_os_tokens():
    for texto in ["Olá, mundo!", "ação 🚀 e 🇧🇷", "if (x) {\n  return\n}", ""]:
        pedacos = tokens.pedacos(texto)
        assert "".join(pedaco for pedaco, _ in pedacos) == texto
        assert sum(quantos for _, quantos in pedacos) == tokens.contar(texto)


def test_custo_separa_entrada_em_cache_e_saida():
    preco = Preco("X", "x", "X", entrada=2, entrada_cache=0.2, saida=10, observacao="", fonte="x")
    assert custo(preco, 1_000_000, 0) == pytest.approx(2)
    assert custo(preco, 1_000_000, 0, fracao_em_cache=1) == pytest.approx(0.2)
    assert custo(preco, 0, 1_000_000) == pytest.approx(10)
    assert custo(preco, 1_000_000, 100_000, fracao_em_cache=0.5) == pytest.approx(1 + 0.1 + 1)


def test_precos_completos_e_cache_mais_barato_que_a_entrada():
    precos = ler_precos()
    assert {p.fornecedor for p in precos} == {"Anthropic", "OpenAI", "Google"}
    assert len({p.modelo for p in precos}) == len(precos)
    for preco in precos:
        assert 0 < preco.entrada_cache < preco.entrada < preco.saida, preco.modelo


def test_amostras_comparaveis():
    amostras = {a.id: a for a in ler_amostras()}
    assert set(amostras) == {"texto-pt", "texto-en", "codigo", "json-indentado", "json-compacto"}
    # As duas formas do JSON têm o mesmo conteúdo.
    import json

    assert json.loads(amostras["json-indentado"].texto) == json.loads(amostras["json-compacto"].texto)
