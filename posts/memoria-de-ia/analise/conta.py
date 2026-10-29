"""O custo da memória: na sessão real e na calculadora da página. `pagina/conta.ts` repete estas contas.

Preços em dólares por milhão de tokens (`comum/precos.csv`). Um CLAUDE.md entra em todo pedido: lido do cache, sai
pelo preço do cache; quando o cache venceu (uma pausa maior que o prazo) ou a conversa recomeçou, é gravado de novo.
"""

from comum.precos import MILHAO, Preco

from .sessao import Pedido


def preco_da_gravacao(preco: Preco, curtos: int, longos: int) -> float:
    """O preço médio da gravação no cache, pesando os tokens gravados em cada prazo."""
    if not curtos + longos:
        return preco.entrada
    longa = preco.gravacao_cache_longa if preco.gravacao_cache_longa is not None else preco.gravacao_cache
    return (curtos * preco.gravacao_cache + longos * longa) / (curtos + longos)


def custo_do_pedido(preco: Preco, pedido: Pedido) -> float:
    """O custo de uma chamada da sessão real, com a leitura e a gravação no cache."""
    longa = preco.gravacao_cache_longa if preco.gravacao_cache_longa is not None else preco.gravacao_cache
    return (
        pedido.fora * preco.entrada
        + pedido.lidos * preco.entrada_cache
        + pedido.gravados * preco.gravacao_cache
        + pedido.gravados_longos * longa
        + pedido.saida * preco.saida
    ) / MILHAO


def custo_da_memoria(preco: Preco, pedido: Pedido) -> float:
    """A parte do custo da chamada que foi dos CLAUDE.md: a lida do cache e a gravada, pelo preço médio da gravação."""
    gravada = pedido.memoria - pedido.memoria_lida
    gravacao = preco_da_gravacao(preco, pedido.gravados, pedido.gravados_longos)
    return (pedido.memoria_lida * preco.entrada_cache + gravada * gravacao) / MILHAO


def custo_mensal(preco: Preco, tokens: int, chamadas: int, gravacoes: int, dias: int) -> float:
    """Quanto uma memória de `tokens` custa num mês de `dias` de trabalho.

    Por dia, ela entra em `chamadas` pedidos e é gravada no cache `gravacoes` vezes (a primeira chamada e as que vêm
    depois de uma pausa maior que o prazo); nas outras, é lida do cache. A gravação usa o prazo longo onde ele
    existe, como o Claude Code faz.
    """
    gravacoes = min(gravacoes, chamadas)
    gravacao = preco_da_gravacao(preco, 0, 1)
    return dias * tokens * (gravacoes * gravacao + (chamadas - gravacoes) * preco.entrada_cache) / MILHAO


def custo_mensal_sem_cache(preco: Preco, tokens: int, chamadas: int, dias: int) -> float:
    """O mesmo mês sem cache: a memória paga o preço cheio da entrada em todo pedido."""
    return dias * tokens * chamadas * preco.entrada / MILHAO
