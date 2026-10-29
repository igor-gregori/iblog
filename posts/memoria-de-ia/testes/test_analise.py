import csv
import json

from memoria_de_ia import automatica, historico, sessao
from memoria_de_ia.caminhos import CARGAS, PEDIDOS
from memoria_de_ia.conta import custo_da_memoria, custo_do_pedido, custo_mensal, custo_mensal_sem_cache

from comum.precos import ler_precos

PRECOS = {preco.modelo: preco for preco in ler_precos()}


def test_a_memoria_cabe_no_pedido_e_some_na_compactacao():
    cargas, pedidos, calibracao = sessao.ler()
    assert [p.chamada for p in pedidos] == list(range(1, len(pedidos) + 1))
    for p in pedidos:
        assert 0 <= p.memoria_lida <= p.memoria and p.memoria_atual <= p.memoria < p.contexto, p.chamada
        assert p.fora + p.lidos + p.gravados + p.gravados_longos == p.contexto, p.chamada
    # Depois da compactação, só a carga daquela chamada continua no pedido.
    for carga in cargas:
        if carga.motivo == "compactacao":
            assert pedidos[carga.chamada - 1].memoria == carga.tokens
    assert {c.motivo for c in cargas} <= set(sessao.MOTIVOS)
    assert 1 < calibracao.fator < 2 and calibracao.r2 > 0.9


def test_os_arquivos_da_sessao_tem_so_numeros_e_caminhos():
    with open(PEDIDOS, encoding="utf-8") as arquivo:
        for linha in csv.DictReader(arquivo):
            assert all(v.isdigit() for k, v in linha.items() if k != "dia")
    with open(CARGAS, encoding="utf-8") as arquivo:
        for linha in csv.DictReader(arquivo):
            assert linha["arquivo"].endswith("CLAUDE.md") and not linha["arquivo"].startswith("/")


def test_a_memoria_da_sessao_soma_a_ultima_versao_de_cada_arquivo():
    cargas, pedidos, _ = sessao.ler()
    pico = max(pedidos, key=lambda p: p.memoria)
    presentes = [c for c in cargas if c.chamada <= pico.chamada]
    assert pico.memoria == sum(c.tokens for c in presentes)  # nenhuma compactação antes do pico
    assert pico.memoria_atual == sum({c.arquivo: c.tokens for c in presentes}.values())


def test_o_custo_da_memoria_e_uma_parte_do_custo_do_pedido():
    _, pedidos, _ = sessao.ler()
    for preco in PRECOS.values():
        for p in pedidos:
            assert 0 < custo_da_memoria(preco, p) < custo_do_pedido(preco, p), (preco.modelo, p.chamada)


def test_o_mes_com_cache_sai_mais_barato_e_gravacao_demais_nao_passa_das_chamadas():
    opus = PRECOS["claude-opus-5-5"]
    assert custo_mensal(opus, 7_000, 65, 2, 21) < custo_mensal_sem_cache(opus, 7_000, 65, 21)
    assert custo_mensal(opus, 1_000, 5, 9, 1) == custo_mensal(opus, 1_000, 5, 5, 1)
    assert custo_mensal(opus, 1_000_000, 1, 1, 1) == opus.gravacao_cache_longa


def test_o_historico_cresce_e_tem_um_dia_por_linha():
    dias = historico.ler()
    assert [d.data for d in dias] == sorted({d.data for d in dias})
    assert dias[-1].raiz_texto > dias[0].raiz_texto and dias[-1].raiz_linhas > dias[0].raiz_linhas
    assert all(d.posts <= 9 for d in dias)


def test_a_memoria_automatica_soma_os_tipos():
    numeros = automatica.ler()
    assert sum(numeros["por_tipo"].values()) == numeros["memorias"]
    assert numeros["com_memorias"] <= numeros["com_pasta"] <= numeros["projetos"]
    assert "/" not in json.dumps(numeros)  # nenhum caminho nem nome de arquivo


def test_extrair_acha_as_cargas_e_a_parte_lida_do_cache(tmp_path):
    def resposta(n, uso):
        mensagem = {"id": f"r{n}", "model": "claude-opus-5-5", "usage": uso, "content": []}
        return {"type": "assistant", "timestamp": f"2026-10-21T10:0{n}:00Z", "message": mensagem, "cwd": "/projeto"}

    def uso(lidos, gravados, saida=10):
        return {"input_tokens": 0, "cache_read_input_tokens": lidos, "cache_creation_input_tokens": gravados,
                "cache_creation": {"ephemeral_5m_input_tokens": 0, "ephemeral_1h_input_tokens": gravados},
                "output_tokens": saida}  # fmt: skip

    def anexo(tipo, caminho, texto):
        if tipo == "instructions":
            conteudo = {"type": tipo, "files": [{"path": caminho, "type": "Project", "content": texto}]}
        else:
            conteudo = {"type": tipo, "path": caminho, "content": {"path": caminho, "content": texto}}
        return {"type": "attachment", "attachment": conteudo}

    raiz = "regra " * 300
    linhas = [
        {"type": "user", "message": {"content": "oi"}, "cwd": "/projeto"},
        anexo("instructions", "/projeto/CLAUDE.md", raiz),
        resposta(0, uso(1_000, 2_000)),
        {"type": "user", "message": {"content": "palavra " * 50}},
        resposta(1, uso(3_010, 120)),
        anexo("nested_memory", "/projeto/posts/a/CLAUDE.md", "nota " * 100),
        resposta(2, uso(1_000, 2_400)),  # o cache venceu: tudo depois das instruções foi gravado de novo
    ]
    registro = tmp_path / "sessao.jsonl"
    registro.write_text("\n".join(json.dumps(linha) for linha in linhas), encoding="utf-8")

    cargas, pedidos, _ = sessao.extrair(registro)
    assert [(c.chamada, c.arquivo, c.motivo) for c in cargas] == [
        (1, "CLAUDE.md", "inicio"),
        (3, "posts/a/CLAUDE.md", "pasta"),
    ]
    tamanho = cargas[0].tokens
    assert pedidos[0].memoria == tamanho and pedidos[0].memoria_lida == 0  # gravada na primeira chamada
    assert pedidos[1].memoria_lida == tamanho  # lida do cache na segunda
    assert pedidos[2].memoria == tamanho + cargas[1].tokens and pedidos[2].memoria_lida == 0
    assert all(p.dia == "2026-10-21" for p in pedidos)
