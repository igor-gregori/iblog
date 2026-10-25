"""As perguntas de teste e a conta de acerto.

São 32 perguntas sobre os documentos do iblog, metade com as mesmas palavras do trecho que responde e metade com
outras palavras (sinônimos, outro jeito de dizer). Cada uma tem o trecho que a responde: um pedaço acerta quando
contém o trecho. A busca acerta "entre os k primeiros" quando algum dos k primeiros pedaços acerta.
"""

import csv
from dataclasses import dataclass

from .caminhos import PERGUNTAS
from .pedacos import Pedaco


@dataclass
class Pergunta:
    id: str
    tipo: str  # "mesmas" (as palavras do trecho) ou "outras" (outras palavras)
    pergunta: str
    arquivo: str
    trecho: str


def ler_perguntas() -> list[Pergunta]:
    with PERGUNTAS.open(encoding="utf-8") as arquivo:
        return [Pergunta(**linha) for linha in csv.DictReader(arquivo)]


def certos(pergunta: Pergunta, pedacos: list[Pedaco]) -> set[int]:
    """Os pedaços que contêm o trecho que responde a pergunta."""
    return {i for i, p in enumerate(pedacos) if pergunta.trecho in p.texto}


def posicao_do_primeiro_certo(ordem: list[int], certos: set[int]) -> int | None:
    """Em que lugar da lista aparece o primeiro pedaço certo (1 é o primeiro); nulo se não aparece."""
    return next((posicao for posicao, i in enumerate(ordem, start=1) if i in certos), None)
