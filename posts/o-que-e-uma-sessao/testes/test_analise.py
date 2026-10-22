import json

import pytest
from o_que_e_uma_sessao import registro
from o_que_e_uma_sessao.registro import ChamadaReal
from o_que_e_uma_sessao.sessao import Sessao, chamadas, com_prazo_curto, custo_acumulado, custo_da_chamada, custo_real

from comum.precos import custo, ler_precos

PRECOS = {preco.modelo: preco for preco in ler_precos()}


def test_a_entrada_cresce_a_cada_chamada_e_o_cache_cobre_o_pedido_anterior():
    sessao = Sessao(comeco=10_000, chamadas=4, novos=1_000, saida=200)
    lista = chamadas(sessao)
    assert [c.entrada for c in lista] == [11_000, 12_200, 13_400, 14_600]
    assert [c.lidos for c in lista] == [0, 11_000, 12_200, 13_400]
    for chamada in lista:
        assert chamada.lidos + chamada.gravados == chamada.entrada
    assert all(c.lidos == c.gravados == 0 for c in chamadas(sessao, com_cache=False))


def test_a_pausa_grava_o_pedido_inteiro_de_novo():
    lista = chamadas(Sessao(comeco=10_000, chamadas=4, novos=1_000, saida=200, pausa=3))
    assert lista[2].lidos == 0
    assert lista[2].gravados == lista[2].entrada
    assert lista[3].lidos == lista[2].entrada


def test_sem_cache_a_conta_e_a_do_post_dos_tokens():
    sessao = Sessao(comeco=20_000, chamadas=10, novos=1_500, saida=500)
    for preco in PRECOS.values():
        esperado = sum(custo(preco, c.entrada, c.saida) for c in chamadas(sessao, com_cache=False))
        assert custo_acumulado(preco, sessao, com_cache=False)[-1] == pytest.approx(esperado)


def test_o_cache_barateia_a_sessao_mas_nao_a_primeira_chamada_da_anthropic():
    sessao = Sessao(comeco=20_000, chamadas=40, novos=1_500, saida=500)
    for preco in PRECOS.values():
        assert custo_acumulado(preco, sessao)[-1] < custo_acumulado(preco, sessao, com_cache=False)[-1] / 4
    opus = PRECOS["claude-opus-5-5"]
    primeira = chamadas(sessao)[0]
    assert custo_da_chamada(opus, primeira) > custo(opus, primeira.entrada, primeira.saida)


def test_gravar_no_cache_nunca_custa_menos_que_a_entrada():
    for preco in PRECOS.values():
        assert preco.gravacao_cache >= preco.entrada, preco.modelo
        if preco.gravacao_cache_longa is not None:
            assert preco.gravacao_cache_longa > preco.gravacao_cache, preco.modelo
            assert preco.prazo_cache_longo > preco.prazo_cache, preco.modelo
        else:
            assert preco.prazo_cache is None and preco.prazo_cache_longo is None, preco.modelo


def test_o_registro_tem_so_numeros():
    with open(registro.SESSAO_REAL, encoding="utf-8") as arquivo:
        cabecalho = arquivo.readline().strip().split(",")
        modelos = {linha.split(",")[2] for linha in arquivo}
    assert cabecalho == [
        "chamada", "minuto", "modelo", "entrada", "gravados_5m", "gravados_1h", "lidos", "saida", "compactou"
    ]  # fmt: skip
    assert modelos == {"claude-opus-5-5"}


def test_extrair_junta_as_linhas_da_mesma_resposta_e_ignora_subagentes(tmp_path):
    def resposta(id_, instante, lidos, **extra):
        uso = {"input_tokens": 3, "cache_read_input_tokens": lidos, "output_tokens": 10}
        uso["cache_creation"] = {"ephemeral_5m_input_tokens": 0, "ephemeral_1h_input_tokens": 100}
        mensagem = {"id": id_, "model": "claude-opus-5-5", "usage": uso, "content": [{"type": "text", "text": "x"}]}
        return {"type": "assistant", "timestamp": instante, "message": mensagem, **extra}

    linhas = [
        {"type": "user", "message": {"content": "um pedido que não pode sair daqui"}},
        resposta("a", "2026-10-18T10:00:00Z", 0),
        resposta("a", "2026-10-18T10:00:01Z", 0),
        resposta("s", "2026-10-18T10:01:00Z", 50, isSidechain=True),
        {"type": "system", "subtype": "compact_boundary"},
        resposta("b", "2026-10-18T10:03:00Z", 500),
    ]
    caminho = tmp_path / "sessao.jsonl"
    caminho.write_text("\n".join(json.dumps(linha) for linha in linhas) + "\nnão é JSON\n", encoding="utf-8")

    extraidas = registro.extrair(caminho)
    assert [(c.chamada, c.minuto, c.lidos, c.compactou) for c in extraidas] == [(1, 0.0, 0, False), (2, 3.0, 500, True)]
    assert extraidas[1].contexto == 3 + 100 + 500

    registro.gravar(extraidas, tmp_path / "sessao.csv")
    assert registro.ler(tmp_path / "sessao.csv") == extraidas
    assert "pedido" not in (tmp_path / "sessao.csv").read_text(encoding="utf-8")


def test_prazo_curto_regrava_depois_das_pausas():
    def chamada(n, minuto, lidos):
        return ChamadaReal(n, minuto, "claude-opus-5-5", 2, 0, 1_000, lidos, 100, False)

    sessao = [chamada(1, 0, 0), chamada(2, 3, 1_000), chamada(3, 20, 2_000)]
    curta = com_prazo_curto(sessao, 5)
    assert [(c.lidos, c.gravados_5m, c.gravados_1h) for c in curta] == [(0, 1_000, 0), (1_000, 1_000, 0), (0, 3_000, 0)]
    assert [c.contexto for c in curta] == [c.contexto for c in sessao]
    opus = PRECOS["claude-opus-5-5"]
    assert sum(custo_real(opus, c) for c in curta) > sum(custo_real(opus, c) for c in sessao[:2]) + custo_real(
        opus, sessao[2]
    )
