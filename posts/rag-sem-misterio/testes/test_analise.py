import json

from rag_sem_misterio import embeddings
from rag_sem_misterio.busca import IndiceBM25, cosseno, fusao, ordem, termos
from rag_sem_misterio.caminhos import SEM_LUGAR, SESSAO
from rag_sem_misterio.pedacos import Documento, blocos, caminho_no_corpus, dividir, dividir_corpus, ler_corpus
from rag_sem_misterio.perguntas import certos, ler_perguntas

from comum.tokens import contar


def test_termos_tiram_acento_plural_e_palavras_vazias():
    assert termos("Os preços da Ação") == ["preco", "acao"]
    assert termos("O `npm test` compara") == ["npm", "test", "compara"]


def test_blocos_respeitam_titulos_listas_tabelas_e_codigo():
    texto = "# A\n\nUm parágrafo\nem duas linhas.\n\n## B\n\n- item um\n  continua\n- item dois\n\n| x | y |\n|---|---|\n| 1 | 2 |\n\n```\n# não é título\n```"
    assert blocos(texto) == [
        (["A"], "Um parágrafo\nem duas linhas."),
        (["A", "B"], "- item um\n  continua"),
        (["A", "B"], "- item dois"),
        (["A", "B"], "| x | y |"),
        (["A", "B"], "| 1 | 2 |"),
        (["A", "B"], "```\n# não é título\n```"),
    ]


def test_um_pedaco_nao_passa_do_maximo_a_nao_ser_uma_frase_longa():
    documento = Documento("x.md", "# T\n\n" + "\n\n".join(f"Frase número {i} do texto." for i in range(40)))
    for pedaco in dividir(documento, 30, contar):
        assert pedaco.tokens <= 30
        assert pedaco.titulos == ["T"]


def test_nenhum_bloco_se_perde_na_divisao():
    for documento in ler_corpus():
        juntos = "\n".join(p.texto for p in dividir(documento, 100, contar))
        for _, bloco in blocos(documento.texto):
            assert "".join(bloco.split()) in "".join(juntos.split()), documento.arquivo


def test_bm25_poe_em_primeiro_o_pedaco_com_as_palavras_raras():
    indice = IndiceBM25.criar(["o gato subiu no telhado", "o cachorro latiu", "o gato e o cachorro"])
    assert ordem(indice.notas("telhado do gato"))[0] == 0
    assert indice.notas("papagaio") == [0.0, 0.0, 0.0]


def test_cosseno_e_fusao():
    assert cosseno([1.0, 0.0], [2.0, 0.0]) == 1.0
    assert abs(cosseno([1.0, 0.0], [0.0, 3.0])) < 1e-12
    # O 3 é o primeiro de uma lista e o quarto da outra; o 0, só o primeiro de uma: o 3 ganha.
    assert fusao([[0, 1, 2, 3], [3, 2, 5]], 50)[:2] == [3, 2]


def test_cada_pergunta_tem_resposta_em_algum_pedaco_de_cada_tamanho():
    documentos = ler_corpus()
    perguntas = ler_perguntas()
    assert len({p.id for p in perguntas}) == len(perguntas)
    assert {p.tipo for p in perguntas} == {"mesmas", "outras"}
    for pergunta in perguntas:
        assert pergunta.trecho in caminho_no_corpus(pergunta.arquivo).read_text(encoding="utf-8"), pergunta.id
    for tamanho in embeddings.TAMANHOS:
        pedacos = dividir_corpus(documentos, tamanho, contar)
        for pergunta in perguntas:
            assert certos(pergunta, pedacos), f"{tamanho}, {pergunta.id}"


def test_similaridades_gravadas_batem_com_os_pedacos():
    medidas = embeddings.ler()
    perguntas = ler_perguntas()
    documentos = ler_corpus()
    for tamanho in embeddings.TAMANHOS:
        n = len(dividir_corpus(documentos, tamanho, contar))
        desse = [m for m in medidas if m.tamanho == tamanho]
        assert len(desse) == len(perguntas) * min(n, embeddings.LIMITE), tamanho
        assert all(0 <= m.pedaco < n for m in desse)


def test_da_sessao_real_so_saem_numeros():
    numeros = json.loads(SESSAO.read_text(encoding="utf-8"))
    assert set(numeros) == {"chamadas", "ferramentas", "comandos", "comandos_com_busca"}
    assert all(isinstance(v, int) for v in numeros["ferramentas"].values())
    assert numeros["comandos_com_busca"] <= numeros["comandos"]


def test_mapa_e_busca_sem_lugar_batem_com_os_pedacos_do_tamanho_padrao():
    n = len(dividir_corpus(ler_corpus(), embeddings.TAMANHO_PADRAO, contar))
    pontos, explicado = embeddings.ler_mapa()
    assert sorted(p.pedaco for p in pontos) == list(range(n))
    assert 0 < explicado < 1
    sem_lugar = embeddings.ler(SEM_LUGAR)
    assert len(sem_lugar) == len(ler_perguntas()) * min(n, embeddings.LIMITE)
    assert all(s.tamanho == embeddings.TAMANHO_PADRAO and 0 <= s.pedaco < n for s in sem_lugar)
