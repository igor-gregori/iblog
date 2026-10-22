"""Os preços públicos de API dos modelos que os posts da série de IA comparam, e o custo de um pedido.

Os preços são em dólares por milhão de tokens, transcritos à mão das páginas de cada fornecedor para `precos.csv`.
Cada post guarda o dia em que conferiu os preços que usa.

A conta de `custo` separa a entrada que já estava no cache (mais barata) da que não estava, e cobra a saída à parte;
os tokens de raciocínio entram na saída, como os três fornecedores cobram. Ficam de fora o custo de gravar no cache e
as faixas de preço para pedidos longos. A gravação no cache entra nas contas de sessão do post
`o-que-e-uma-sessao`.
"""

import csv
from dataclasses import dataclass
from pathlib import Path

CSV = Path(__file__).with_name("precos.csv")

MILHAO = 1_000_000


@dataclass(frozen=True)
class Preco:
    fornecedor: str
    modelo: str
    nome: str
    entrada: float
    entrada_cache: float
    # Gravar no cache, no prazo padrão de cada fornecedor e no prazo longo opcional. Onde o fornecedor não cobra a
    # gravação (o Google), ela custa o mesmo que a entrada e os prazos ficam em branco.
    gravacao_cache: float
    prazo_cache: int | None  # minutos
    gravacao_cache_longa: float | None
    prazo_cache_longo: int | None  # minutos
    saida: float
    observacao: str
    fonte: str


def _numero(texto: str) -> float | None:
    return float(texto) if texto else None


def _minutos(texto: str) -> int | None:
    return int(texto) if texto else None


def ler_precos() -> list[Preco]:
    with open(CSV, encoding="utf-8") as arquivo:
        return [
            Preco(
                fornecedor=linha["fornecedor"],
                modelo=linha["modelo"],
                nome=linha["nome"],
                entrada=float(linha["entrada"]),
                entrada_cache=float(linha["entrada_cache"]),
                gravacao_cache=float(linha["gravacao_cache"]),
                prazo_cache=_minutos(linha["prazo_cache"]),
                gravacao_cache_longa=_numero(linha["gravacao_cache_longa"]),
                prazo_cache_longo=_minutos(linha["prazo_cache_longo"]),
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
