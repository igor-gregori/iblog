"""Quanto custa um pedido a um modelo, pelos preços públicos de cada fornecedor.

Os preços são em dólares por milhão de tokens. A conta separa a entrada que já estava no cache (mais barata) da que
não estava, e cobra a saída à parte; os tokens de raciocínio entram na saída, como os três fornecedores cobram.
Ficam de fora o custo de gravar no cache e as faixas de preço para pedidos longos.
"""

import csv
from dataclasses import dataclass

from .caminhos import MANUAIS

MILHAO = 1_000_000


@dataclass(frozen=True)
class Preco:
    fornecedor: str
    modelo: str
    nome: str
    entrada: float
    entrada_cache: float
    saida: float
    observacao: str
    fonte: str


def ler_precos() -> list[Preco]:
    with open(MANUAIS / "precos.csv", encoding="utf-8") as arquivo:
        return [
            Preco(
                fornecedor=linha["fornecedor"],
                modelo=linha["modelo"],
                nome=linha["nome"],
                entrada=float(linha["entrada"]),
                entrada_cache=float(linha["entrada_cache"]),
                saida=float(linha["saida"]),
                observacao=linha["observacao"],
                fonte=linha["fonte"],
            )
            for linha in csv.DictReader(arquivo)
        ]


def custo(preco: Preco, entrada: int, saida: int, fracao_em_cache: float = 0.0) -> float:
    """O custo em dólares de um pedido com `entrada` tokens enviados e `saida` tokens gerados.

    `fracao_em_cache` é a parte da entrada (de 0 a 1) que o fornecedor já tinha no cache.
    """
    em_cache = entrada * fracao_em_cache
    fora_do_cache = entrada - em_cache
    return (fora_do_cache * preco.entrada + em_cache * preco.entrada_cache + saida * preco.saida) / MILHAO
