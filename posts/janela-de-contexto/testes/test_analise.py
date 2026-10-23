import json

import pytest
from janela_de_contexto import composicao

from comum.precos import custo, custo_com_faixas, ler_precos

PRECOS = {preco.modelo: preco for preco in ler_precos()}


def test_a_faixa_longa_vale_para_o_pedido_inteiro_acima_do_limite():
    haiku = PRECOS["claude-haiku-5-5"]
    assert custo_com_faixas(haiku, 100_000, 1_000) == pytest.approx(custo(haiku, 100_000, 1_000))
    acima = custo_com_faixas(haiku, 100_001, 1_000)
    assert acima == pytest.approx((100_001 * 0.5 + 1_000 * 2.5) / 1_000_000)
    astra = PRECOS["gpt-6-astra"]
    assert custo_com_faixas(astra, 272_001, 0, 1) == pytest.approx(272_001 * 2 / 1_000_000)
    for modelo in ("claude-opus-5-5", "gemini-4-argon"):
        assert custo_com_faixas(PRECOS[modelo], 900_000, 1_000) == pytest.approx(custo(PRECOS[modelo], 900_000, 1_000))


def test_janelas_e_faixas_completas():
    for preco in PRECOS.values():
        assert preco.janela >= 1_000_000 and 0 < preco.saida_maxima < preco.janela, preco.modelo
        longos = (preco.entrada_longa, preco.entrada_cache_longa, preco.saida_longa)
        if preco.limite_curto is None:
            assert longos == (None, None, None), preco.modelo
        else:
            assert preco.entrada_longa > preco.entrada and preco.saida_longa > preco.saida, preco.modelo
            assert preco.entrada_cache_longa > preco.entrada_cache, preco.modelo


def test_a_composicao_soma_o_pedido_de_cada_chamada():
    composicoes, calibracao = composicao.ler()
    for c in composicoes:
        partes = [getattr(c, categoria) for categoria in composicao.CATEGORIAS]
        assert sum(partes) == c.contexto, c.chamada
        assert min(partes) >= 0, c.chamada
    assert [c.chamada for c in composicoes] == list(range(1, len(composicoes) + 1))
    assert 1 < calibracao.fator < 2 and calibracao.r2 > 0.9
    assert calibracao.compactacao_resumo < calibracao.compactacao_antes


def test_o_registro_medido_tem_so_numeros():
    with open(composicao.COMPOSICAO, encoding="utf-8") as arquivo:
        assert arquivo.readline().strip().split(",") == [
            "chamada", "contexto", "instrucoes", "modelo", "comandos", "imagens", "outros"
        ]  # fmt: skip
        assert all(valor.isdigit() for linha in arquivo for valor in linha.strip().split(","))


def test_extrair_divide_o_que_entrou_por_tipo(tmp_path):
    def resposta(id_, instante, uso, blocos):
        mensagem = {"id": id_, "model": "claude-opus-5-5", "usage": uso, "content": blocos}
        return {"type": "assistant", "timestamp": instante, "message": mensagem}

    def uso(lidos, gravados, saida):
        return {"input_tokens": 0, "cache_read_input_tokens": lidos, "cache_creation_input_tokens": gravados,
                "output_tokens": saida}  # fmt: skip

    def comando(n, texto):
        return {
            "type": "user",
            "message": {"content": [{"type": "tool_result", "tool_use_id": f"t{n}", "content": texto}]},
        }

    pedir = [{"type": "tool_use", "id": "t{}", "name": "Bash", "input": {"command": "ls"}}]
    linhas = [{"type": "user", "message": {"content": "um pedido que não pode sair daqui"}}]
    lidos, saida = 1_000, 50
    # Cinco trechos só com texto, para a calibração, e um com imagem.
    for n in range(6):
        bloco = [dict(pedir[0], id=f"t{n}", name="Bash" if n < 5 else "Read")]
        linhas.append(resposta(f"r{n}", f"2026-10-18T10:0{n}:00Z", uso(lidos, 0, saida), bloco))
        texto = "palavra " * (100 * (n + 1))
        if n < 5:
            linhas.append(comando(n, texto))
            lidos += saida + round(1.5 * len(texto.split())) + 40  # cerca de 1,5 token do Claude por token do o200k
        else:
            imagem = [{"type": "image", "source": {"type": "base64", "data": ""}}]
            linhas.append(
                {
                    "type": "user",
                    "message": {"content": [{"type": "tool_result", "tool_use_id": "t5", "content": imagem}]},
                }
            )
            lidos += saida + 1_500
    linhas.append(resposta("fim", "2026-10-18T10:09:00Z", uso(lidos, 0, saida), []))
    caminho = tmp_path / "sessao.jsonl"
    caminho.write_text("\n".join(json.dumps(linha) for linha in linhas), encoding="utf-8")

    composicoes, calibracao = composicao.extrair(caminho)
    assert all(sum(getattr(c, k) for k in composicao.CATEGORIAS) == c.contexto for c in composicoes)
    assert composicoes[-1].imagens == 1_500 and composicoes[-1].modelo == 6 * saida
    assert calibracao.fator == pytest.approx(1.5, abs=0.05) and calibracao.imagens == 1 and calibracao.comandos == 5
