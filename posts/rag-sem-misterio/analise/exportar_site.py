"""Gera os arquivos que a página consome.

- `pagina/dados.json`: os pedaços de cada tamanho, as perguntas, os pedaços mais parecidos pelos embeddings, a
  posição do primeiro pedaço certo em cada busca (também sem o arquivo e os títulos no pedaço), o mapa dos
  vetores, os preços e as buscas da sessão real.
- `testes/casos.json`: as contas feitas em Python (palavras, notas do BM25, cosseno, fusão e divisão em pedaços),
  para os testes do site conferirem que a versão em TypeScript dá os mesmos resultados.
"""

import json
from collections import defaultdict
from dataclasses import asdict

from comum.precos import ler_precos
from comum.tokens import contar

from . import embeddings, sessao
from .busca import IndiceBM25, cosseno, fusao, ordem, termos
from .caminhos import PAGINA, SEM_LUGAR, TESTES
from .conta import custo_da_pergunta
from .pedacos import dividir, dividir_corpus, ler_corpus
from .perguntas import certos, ler_perguntas, posicao_do_primeiro_certo

# O dia em que os preços da tabela comum foram conferidos para este post.
PRECOS_CONSULTADOS_EM = "2026-10-22"

# O tamanho de pedaço que o texto usa como referência, e quantos pedaços a busca põe no pedido.
TAMANHO_PADRAO = embeddings.TAMANHO_PADRAO
PEDACOS_NO_PEDIDO = 5

# Tamanhos de documentos que exercitam a conta do custo: o deste blog, acima das faixas longas e acima da janela.
DOCUMENTOS_DE_TESTE = [26_000, 150_000, 300_000, 2_000_000]

# A fusão junta os 50 primeiros de cada busca: os mesmos que ficam guardados dos embeddings.
LIMITE_DA_FUSAO = embeddings.LIMITE

# Textos que exercitam a conta das palavras nos testes: acento, cedilha, plural, sinais e palavras vazias.
TEXTOS_DE_TESTE = [
    "Qual é a cor da marca do design Shell?",
    "Preços, PREÇOS e preço: são a mesma palavra?",
    "O `npm test` compara os dois (Python × TypeScript).",
    "ação, informação, pão, maçã, você, três, até",
]


def buscas(perguntas, pedacos, similaridades):
    """As três listas de cada pergunta: por palavras, por significado e a fusão das duas."""
    indice = IndiceBM25.criar([p.busca() for p in pedacos])
    resultado = {}
    for pergunta in perguntas:
        # Um pedaço sem nenhuma palavra da pergunta não entra na lista, em vez de entrar na ordem do corpus.
        notas = indice.notas(pergunta.pergunta)
        palavras = [i for i in ordem(notas) if notas[i] > 0]
        significado = [s.pedaco for s in sorted(similaridades[pergunta.id], key=lambda s: s.posicao)]
        resultado[pergunta.id] = {
            "palavras": palavras,
            "significado": significado,
            "hibrida": fusao([palavras, significado], LIMITE_DA_FUSAO),
        }
    return resultado


def sem_lugar(perguntas, pedacos) -> dict:
    """A posição do primeiro pedaço certo quando a busca vê só o texto do pedaço, sem o arquivo e os títulos."""
    indice = IndiceBM25.criar([p.texto for p in pedacos])
    significado = defaultdict(list)
    for s in embeddings.ler(SEM_LUGAR):
        significado[s.pergunta].append(s)
    resultado = {}
    for pergunta in perguntas:
        notas = indice.notas(pergunta.pergunta)
        palavras = [i for i in ordem(notas) if notas[i] > 0]
        por_significado = [s.pedaco for s in sorted(significado[pergunta.id], key=lambda s: s.posicao)]
        resultado[pergunta.id] = {
            "palavras": posicao_do_primeiro_certo(palavras, certos(pergunta, pedacos)),
            "significado": posicao_do_primeiro_certo(por_significado, certos(pergunta, pedacos)),
        }
    return resultado


def exportar() -> None:
    documentos = ler_corpus()
    perguntas = ler_perguntas()
    medidas = embeddings.ler()
    precos = ler_precos()
    pontos, explicado = embeddings.ler_mapa()

    tamanhos = []
    tokens_da_busca = 0.0
    for tamanho in embeddings.TAMANHOS:
        pedacos = dividir_corpus(documentos, tamanho, contar)
        similaridades = defaultdict(list)
        for s in medidas:
            if s.tamanho == tamanho:
                similaridades[s.pergunta].append(s)
        listas = buscas(perguntas, pedacos, similaridades)
        posicoes = {
            pergunta.id: {
                metodo: posicao_do_primeiro_certo(lista, certos(pergunta, pedacos))
                for metodo, lista in listas[pergunta.id].items()
            }
            for pergunta in perguntas
        }
        if tamanho == TAMANHO_PADRAO:
            posicoes_sem_lugar = sem_lugar(perguntas, pedacos)
            # Quantos tokens os primeiros pedaços da busca híbrida põem no pedido, em média nas perguntas de teste.
            tokens_da_busca = sum(
                sum(pedacos[i].tokens for i in listas[p.id]["hibrida"][:PEDACOS_NO_PEDIDO]) for p in perguntas
            ) / len(perguntas)
        tamanhos.append(
            {
                "tamanho": tamanho,
                "pedacos": [asdict(p) for p in pedacos],
                "significado": {
                    pergunta.id: [
                        [s.pedaco, s.similaridade] for s in sorted(similaridades[pergunta.id], key=lambda s: s.posicao)
                    ]
                    for pergunta in perguntas
                },
                "posicoes": posicoes,
            }
        )

    dados = {
        "precos_consultados_em": PRECOS_CONSULTADOS_EM,
        "modelo_de_embeddings": embeddings.MODELO,
        "limite_da_fusao": LIMITE_DA_FUSAO,
        "tamanho_padrao": TAMANHO_PADRAO,
        "pedacos_no_pedido": PEDACOS_NO_PEDIDO,
        "tokens_da_busca": round(tokens_da_busca),
        "documentos": [{"arquivo": d.arquivo, "tokens": contar(d.texto)} for d in documentos],
        "perguntas": [asdict(p) for p in perguntas],
        "tamanhos": tamanhos,
        "sem_lugar": posicoes_sem_lugar,
        "mapa": {"explicado": explicado, "pontos": [[p.x, p.y] for p in sorted(pontos, key=lambda p: p.pedaco)]},
        "precos": [asdict(preco) for preco in precos],
        "sessao": sessao.ler(),
    }
    PAGINA.mkdir(parents=True, exist_ok=True)
    (PAGINA / "dados.json").write_text(
        json.dumps(dados, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
    )

    pedacos_200 = dividir_corpus(documentos, 200, contar)
    indice = IndiceBM25.criar([p.busca() for p in pedacos_200])
    vetores = [[1.0, 0.0, 0.0], [0.6, 0.8, 0.0], [-0.2, 0.3, 0.9], [3.0, 4.0, 0.0]]
    casos = {
        "termos": [{"texto": t, "esperado": termos(t)} for t in TEXTOS_DE_TESTE],
        "bm25": [
            {"pergunta": p.pergunta, "notas": indice.notas(p.pergunta)}
            for p in perguntas[:: max(1, len(perguntas) // 6)]
        ],
        "cosseno": [{"a": a, "b": b, "esperado": cosseno(a, b)} for a in vetores for b in vetores],
        "fusao": [
            {"listas": [[0, 1, 2, 3], [3, 2, 5]], "limite": 50, "esperado": fusao([[0, 1, 2, 3], [3, 2, 5]], 50)},
            {"listas": [[4, 1, 2], [1, 4, 2], [9]], "limite": 2, "esperado": fusao([[4, 1, 2], [1, 4, 2], [9]], 2)},
        ],
        "custos": [
            {
                "modelo": preco.modelo,
                "documentos": n,
                "pedacos": 1_000,
                "esperado": asdict(custo_da_pergunta(preco, n, 1_000)),
            }
            for preco in precos
            for n in DOCUMENTOS_DE_TESTE
        ],
        "divisao": [
            {"arquivo": d.arquivo, "maximo": m, "esperado": [asdict(p) for p in dividir(d, m, contar)]}
            for d in documentos
            if d.arquivo in ("CLAUDE.md", "planos/serie-ia.md")
            for m in (100, 400)
        ],
    }
    TESTES.mkdir(parents=True, exist_ok=True)
    (TESTES / "casos.json").write_text(json.dumps(casos, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
