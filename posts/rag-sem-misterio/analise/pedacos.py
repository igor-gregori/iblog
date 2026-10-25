"""A divisão dos documentos em pedaços, o primeiro passo do RAG.

Os documentos são Markdown. Um pedaço nunca atravessa um título: cada seção é dividida em blocos (um parágrafo, um
item de lista, uma linha de tabela ou um trecho de código), e os blocos seguidos se juntam enquanto couberem no
tamanho máximo. Um bloco maior que o máximo é quebrado em frases. Cada pedaço leva junto o nome do arquivo e os
títulos acima dele, para não ficar solto. `pagina/pedacos.ts` repete esta conta.
"""

import re
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from .caminhos import CORPUS

TITULO = re.compile(r"^(#{1,6})\s+(.*)$")
ITEM = re.compile(r"^(\s*)([-*]|\d+\.)\s")
SEPARADOR_DE_TABELA = re.compile(r"^\|[\s|:-]+\|$")
FIM_DE_FRASE = re.compile(r"(?<=[.!?])\s+")


@dataclass
class Documento:
    arquivo: str  # o caminho no repositório, como `posts/janela-de-contexto/CLAUDE.md`
    texto: str


@dataclass
class Pedaco:
    arquivo: str
    titulos: list[str]
    texto: str
    tokens: int

    def busca(self) -> str:
        """O texto em que a busca procura: o lugar do pedaço e o pedaço."""
        return " › ".join([self.arquivo, *self.titulos]) + "\n" + self.texto


def ler_corpus() -> list[Documento]:
    """Os documentos do iblog copiados em `dados/corpus`, com o caminho original (`iblog__posts__x__CLAUDE.md`)."""
    return [
        Documento(arquivo=p.name.removeprefix("iblog__").replace("__", "/"), texto=p.read_text(encoding="utf-8"))
        for p in sorted(CORPUS.glob("*.md"))
    ]


def blocos(texto: str) -> list[tuple[list[str], str]]:
    """Os blocos do documento, na ordem, cada um com os títulos acima dele."""
    resultado: list[tuple[list[str], str]] = []
    titulos: list[str] = []
    atual: list[str] = []
    em_codigo = False

    def fechar() -> None:
        if atual:
            resultado.append((list(titulos), "\n".join(atual)))
            atual.clear()

    for linha in texto.split("\n"):
        if linha.startswith("```"):
            if not em_codigo:
                fechar()
            atual.append(linha)
            em_codigo = not em_codigo
            if not em_codigo:
                fechar()
            continue
        if em_codigo:
            atual.append(linha)
            continue
        titulo = TITULO.match(linha)
        if titulo:
            fechar()
            nivel = len(titulo.group(1))
            titulos[nivel - 1 :] = []
            titulos.extend([""] * (nivel - 1 - len(titulos)))
            titulos.append(titulo.group(2).strip())
            continue
        if not linha.strip():
            fechar()
            continue
        if SEPARADOR_DE_TABELA.match(linha):
            continue
        item = ITEM.match(linha)
        if linha.startswith("|") or (item and not item.group(1)):
            fechar()
        atual.append(linha)
        if linha.startswith("|"):
            fechar()
    fechar()
    return [([t for t in ts if t], bloco) for ts, bloco in resultado]


def dividir(documento: Documento, maximo: int, contar: Callable[[str], int]) -> list[Pedaco]:
    """Os pedaços de um documento, com no máximo `maximo` tokens cada um (uma frase maior fica inteira)."""
    pedacos: list[Pedaco] = []
    atual: list[str] = []
    tokens = 0
    lugar: list[str] = []

    def fechar() -> None:
        nonlocal tokens
        if atual:
            pedacos.append(Pedaco(documento.arquivo, lugar, "\n".join(atual), tokens))
            atual.clear()
            tokens = 0

    for titulos, bloco in blocos(documento.texto):
        if titulos != lugar:
            fechar()
            lugar = titulos
        tamanho = contar(bloco)
        partes = [(bloco, tamanho)] if tamanho <= maximo else [(f, contar(f)) for f in FIM_DE_FRASE.split(bloco)]
        for parte, n in partes:
            if atual and tokens + n > maximo:
                fechar()
            atual.append(parte)
            tokens += n
    fechar()
    return pedacos


def dividir_corpus(documentos: list[Documento], maximo: int, contar: Callable[[str], int]) -> list[Pedaco]:
    return [p for documento in documentos for p in dividir(documento, maximo, contar)]


def caminho_no_corpus(arquivo: str) -> Path:
    return CORPUS / ("iblog__" + arquivo.replace("/", "__"))
