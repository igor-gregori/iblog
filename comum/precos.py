"""Os preços públicos de API dos modelos que os posts da série de IA comparam, e o custo de um pedido.

Os preços são em dólares por milhão de tokens, transcritos à mão das páginas de cada fornecedor para `precos.csv`.
Cada post guarda o dia em que conferiu os preços que usa.

A conta de `custo` separa a entrada que já estava no cache (mais barata) da que não estava, e cobra a saída à parte;
os tokens de raciocínio entram na saída, como os três fornecedores cobram. Ficam de fora o custo de gravar no cache e
as faixas de preço para pedidos longos. A gravação no cache entra nas contas de sessão do post
`o-que-e-uma-sessao`; as faixas longas, em `custo_com_faixas`, que o post `janela-de-contexto` usa.
"""

import csv
from dataclasses import dataclass, replace
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
    janela: int  # tokens que cabem numa chamada (a janela de contexto)
    saida_maxima: int  # tokens de saída que uma chamada pode gerar
    # Acima de `limite_curto` tokens de entrada, o pedido inteiro paga os preços da faixa longa (Claude Haiku 5.5 e a
    # família GPT-6). Onde não há faixa, os quatro campos ficam em branco. A gravação no cache da faixa longa fica de
    # fora: nenhum post precisou dela.
    limite_curto: int | None
    entrada_longa: float | None
    entrada_cache_longa: float | None
    saida_longa: float | None
    observacao: str
    fonte: str


def _numero(texto: str) -> float | None:
    return float(texto) if texto else None


def _inteiro(texto: str) -> int | None:
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
                prazo_cache=_inteiro(linha["prazo_cache"]),
                gravacao_cache_longa=_numero(linha["gravacao_cache_longa"]),
                prazo_cache_longo=_inteiro(linha["prazo_cache_longo"]),
                saida=float(linha["saida"]),
                janela=int(linha["janela"]),
                saida_maxima=int(linha["saida_maxima"]),
                limite_curto=_inteiro(linha["limite_curto"]),
                entrada_longa=_numero(linha["entrada_longa"]),
                entrada_cache_longa=_numero(linha["entrada_cache_longa"]),
                saida_longa=_numero(linha["saida_longa"]),
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


def na_faixa_longa(preco: Preco, entrada: int) -> bool:
    """O pedido passa do limite da faixa curta e paga os preços da faixa longa."""
    return preco.limite_curto is not None and entrada > preco.limite_curto


def custo_com_faixas(preco: Preco, entrada: int, saida: int, fracao_em_cache: float = 0.0) -> float:
    """O mesmo que `custo`, mas com os preços da faixa longa quando o pedido passa do limite.

    A Anthropic diz que, no Claude Haiku 5.5, o pedido inteiro paga mais quando passa de 100 mil tokens, contando os
    lidos e os gravados no cache. A OpenAI só dá o limite (272 mil tokens de entrada); a conta faz o mesmo que na
    Anthropic e cobra o pedido inteiro pela faixa longa.
    """
    if na_faixa_longa(preco, entrada):
        assert preco.entrada_longa is not None and preco.entrada_cache_longa is not None and preco.saida_longa
        preco = replace(
            preco, entrada=preco.entrada_longa, entrada_cache=preco.entrada_cache_longa, saida=preco.saida_longa
        )
    return custo(preco, entrada, saida, fracao_em_cache)
