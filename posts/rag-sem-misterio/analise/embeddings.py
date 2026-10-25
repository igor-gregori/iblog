"""Os embeddings das perguntas e dos pedaços, e o que se mede com eles.

O modelo é o `intfloat/multilingual-e5-large`, aberto e treinado em mais de cem línguas, rodando nesta máquina pelo
`fastembed` (sem API e sem custo). Ele pede um prefixo: "query: " na pergunta e "passage: " no texto. O `fastembed`
não devolve os vetores deste modelo com tamanho 1: eles são normalizados aqui, e aí o cosseno é o produto escalar.

Daqui saem três arquivos em `dados/manuais/`, que o resto do pipeline lê:

- `similaridades.csv`: os `LIMITE` pedaços mais parecidos com cada pergunta, em cada tamanho de pedaço;
- `sem_lugar.csv`: o mesmo, no tamanho padrão, com o embedding só do texto do pedaço, sem o arquivo e os títulos;
- `mapa.csv`: os pedaços do tamanho padrão projetados num plano (as duas direções em que os vetores mais variam).
  As perguntas ficam de fora: o modelo põe perguntas e trechos em regiões diferentes do espaço, e no plano todas
  cairiam juntas, longe das respostas, embora o cosseno com a resposta seja alto.

O modelo pesa 2,2 GB e o `fastembed` não faz parte das dependências de sempre: rode com
`uv run --group embeddings python -m rag_sem_misterio --embeddings`.
"""

import csv
from collections.abc import Callable
from dataclasses import dataclass

from comum.tokens import contar

from .caminhos import MAPA, SEM_LUGAR, SIMILARIDADES
from .pedacos import dividir_corpus, ler_corpus
from .perguntas import ler_perguntas

MODELO = "intfloat/multilingual-e5-large"

# Os tamanhos máximos de pedaço que o post compara, em tokens, e o que o texto usa como referência.
TAMANHOS = [100, 200, 400, 800]
TAMANHO_PADRAO = 400

# Quantos pedaços mais parecidos de cada pergunta ficam guardados: o suficiente para a fusão e para a página.
LIMITE = 50


@dataclass
class Similaridade:
    tamanho: int
    pergunta: str
    posicao: int
    pedaco: int  # a posição do pedaço em `dividir_corpus(ler_corpus(), tamanho, contar)`
    similaridade: float


@dataclass
class Ponto:
    pedaco: int  # a posição do pedaço no tamanho padrão
    x: float
    y: float


def _modelo() -> Callable:
    """A função que transforma textos em vetores de tamanho 1."""
    import numpy as np
    from fastembed import TextEmbedding

    modelo = TextEmbedding(MODELO)

    def vetores_de(textos: list[str]) -> np.ndarray:
        v = np.array(list(modelo.embed(textos, batch_size=16)))
        return v / np.linalg.norm(v, axis=1, keepdims=True)

    return vetores_de


def _mais_parecidos(vetores, vetor, tamanho: int, pergunta: str) -> list[Similaridade]:
    notas = vetores @ vetor
    ordem = sorted(range(len(notas)), key=lambda i: (-notas[i], i))[:LIMITE]
    return [
        Similaridade(tamanho, pergunta, posicao, i, round(float(notas[i]), 4))
        for posicao, i in enumerate(ordem, start=1)
    ]


def medir() -> None:
    """Calcula os embeddings e grava os três arquivos."""
    import numpy as np

    vetores_de = _modelo()
    perguntas = ler_perguntas()
    das_perguntas = vetores_de(["query: " + p.pergunta for p in perguntas])
    documentos = ler_corpus()
    similaridades: list[Similaridade] = []
    for tamanho in TAMANHOS:
        pedacos = dividir_corpus(documentos, tamanho, contar)
        vetores = vetores_de(["passage: " + p.busca() for p in pedacos])
        for pergunta, vetor in zip(perguntas, das_perguntas, strict=True):
            similaridades += _mais_parecidos(vetores, vetor, tamanho, pergunta.id)
        if tamanho != TAMANHO_PADRAO:
            continue
        # Sem o lugar: o embedding só do texto, para ver quanto o nome do arquivo e os títulos ajudam.
        so_texto = vetores_de(["passage: " + p.texto for p in pedacos])
        sem_lugar = [
            s
            for pergunta, vetor in zip(perguntas, das_perguntas, strict=True)
            for s in _mais_parecidos(so_texto, vetor, tamanho, pergunta.id)
        ]
        # O mapa: as duas direções em que os vetores dos pedaços mais variam (análise de componentes principais).
        centro = vetores.mean(axis=0)
        _, valores, direcoes = np.linalg.svd(vetores - centro, full_matrices=False)
        plano = direcoes[:2].T
        mapa = [Ponto(i, *(v - centro) @ plano) for i, v in enumerate(vetores)]
        explicado = float((valores[:2] ** 2).sum() / (valores**2).sum())

    _gravar_similaridades(SIMILARIDADES, similaridades)
    _gravar_similaridades(SEM_LUGAR, sem_lugar)
    with MAPA.open("w", newline="", encoding="utf-8") as arquivo:
        escritor = csv.writer(arquivo)
        escritor.writerow(["pedaco", "x", "y"])
        # A primeira linha guarda quanto das diferenças entre os vetores o plano mostra (de 0 a 1).
        escritor.writerow(["explicado", round(explicado, 4), ""])
        escritor.writerows([p.pedaco, round(float(p.x), 4), round(float(p.y), 4)] for p in mapa)


def _gravar_similaridades(caminho, similaridades: list[Similaridade]) -> None:
    with caminho.open("w", newline="", encoding="utf-8") as arquivo:
        escritor = csv.writer(arquivo)
        escritor.writerow(["tamanho", "pergunta", "posicao", "pedaco", "similaridade"])
        for s in similaridades:
            escritor.writerow([s.tamanho, s.pergunta, s.posicao, s.pedaco, s.similaridade])


def ler(caminho=SIMILARIDADES) -> list[Similaridade]:
    with caminho.open(encoding="utf-8") as arquivo:
        return [
            Similaridade(
                int(l["tamanho"]), l["pergunta"], int(l["posicao"]), int(l["pedaco"]), float(l["similaridade"])
            )
            for l in csv.DictReader(arquivo)
        ]


def ler_mapa() -> tuple[list[Ponto], float]:
    """Os pontos do mapa e a parte das diferenças entre os vetores que o plano mostra (de 0 a 1)."""
    with MAPA.open(encoding="utf-8") as arquivo:
        linhas = list(csv.DictReader(arquivo))
    explicado = float(linhas[0]["x"])
    return [Ponto(int(l["pedaco"]), float(l["x"]), float(l["y"])) for l in linhas[1:]], explicado
