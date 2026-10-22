"""A conta de uma sessão: quanto custa cada chamada ao modelo quando o histórico inteiro vai junto, com e sem cache.

Uma sessão simulada tem um começo fixo (instruções e definições das ferramentas, iguais em toda chamada) e um número de
chamadas. Antes de cada chamada entram no histórico alguns tokens novos (o pedido, o resultado de uma ferramenta), e a
resposta do modelo também fica no histórico para a chamada seguinte. Então a chamada `n` manda

    começo + (n - 1) × (novos + saída) + novos

tokens de entrada, e o total da sessão cresce com o quadrado do número de chamadas.

Com o cache, cada chamada lê do cache o pedido da chamada anterior (que tem o mesmo começo) e grava o que é novo: a
resposta anterior e os tokens novos. A primeira chamada, e a primeira depois de uma pausa maior que o prazo do cache,
gravam o pedido inteiro. O preço da gravação é o do prazo padrão de cada fornecedor (`comum/precos.csv`). Ficam de
fora o tamanho mínimo para entrar no cache (o começo da simulação passa dele em todos os modelos) e as faixas de preço
para pedidos longos (a simulação fica abaixo de 100 mil tokens por chamada).
"""

from dataclasses import dataclass

from comum.precos import MILHAO, Preco

from .registro import ChamadaReal


@dataclass(frozen=True)
class Sessao:
    comeco: int  # instruções e ferramentas, iguais em toda chamada
    chamadas: int
    novos: int  # tokens que entram no histórico antes de cada chamada
    saida: int  # tokens que o modelo escreve em cada chamada, e que ficam no histórico
    pausa: int | None = None  # a chamada (a partir de 1) que encontra o cache vazio, depois de uma pausa longa


@dataclass(frozen=True)
class Chamada:
    entrada: int  # tudo o que a chamada manda ao modelo
    lidos: int  # a parte da entrada lida do cache
    gravados: int  # a parte da entrada gravada no cache
    saida: int


def chamadas(sessao: Sessao, com_cache: bool = True) -> list[Chamada]:
    """Os tokens de cada chamada da sessão, em ordem."""
    resultado = []
    anterior = 0
    for n in range(1, sessao.chamadas + 1):
        entrada = sessao.comeco + (n - 1) * (sessao.novos + sessao.saida) + sessao.novos
        if not com_cache:
            lidos = gravados = 0
        elif n == 1 or n == sessao.pausa:
            lidos, gravados = 0, entrada
        else:
            lidos, gravados = anterior, entrada - anterior
        resultado.append(Chamada(entrada=entrada, lidos=lidos, gravados=gravados, saida=sessao.saida))
        anterior = entrada
    return resultado


def custo_da_chamada(preco: Preco, chamada: Chamada) -> float:
    """Dólares: o que foi lido pelo preço do cache, o gravado pelo preço da gravação e o resto pela entrada normal."""
    fora_do_cache = chamada.entrada - chamada.lidos - chamada.gravados
    return (
        chamada.lidos * preco.entrada_cache
        + chamada.gravados * preco.gravacao_cache
        + fora_do_cache * preco.entrada
        + chamada.saida * preco.saida
    ) / MILHAO


def custo_acumulado(preco: Preco, sessao: Sessao, com_cache: bool = True) -> list[float]:
    """O custo da sessão até cada chamada, em dólares."""
    total = 0.0
    acumulado = []
    for chamada in chamadas(sessao, com_cache):
        total += custo_da_chamada(preco, chamada)
        acumulado.append(total)
    return acumulado


def custo_real(preco: Preco, chamada: ChamadaReal, com_cache: bool = True) -> float:
    """O custo de uma chamada da sessão real, em dólares: como a API cobrou ou como cobraria sem o cache.

    Sem o cache, tudo o que a chamada mandou ao modelo seria cobrado pelo preço normal de entrada.
    """
    if not com_cache:
        return (chamada.contexto * preco.entrada + chamada.saida * preco.saida) / MILHAO
    if preco.gravacao_cache_longa is None:
        raise ValueError(f"{preco.modelo} não tem o prazo longo de cache que a sessão real usou")
    return (
        chamada.entrada * preco.entrada
        + chamada.gravados_5m * preco.gravacao_cache
        + chamada.gravados_1h * preco.gravacao_cache_longa
        + chamada.lidos * preco.entrada_cache
        + chamada.saida * preco.saida
    ) / MILHAO


def com_prazo_curto(sessao: list[ChamadaReal], prazo: float) -> list[ChamadaReal]:
    """A mesma sessão se o cache durasse só `prazo` minutos, com a gravação no prazo padrão.

    Uma chamada que veio mais de `prazo` minutos depois da anterior encontra o cache vazio e grava de novo tudo o que
    leria. A gravação passa a ser toda no prazo padrão (mais barato). O começo fixo que a sessão real leu do cache logo
    depois das pausas longas também seria gravado de novo, o que pesa um pouco contra o prazo curto.
    """
    resultado = []
    for anterior, chamada in zip([None, *sessao], sessao, strict=False):
        gravados = chamada.gravados_5m + chamada.gravados_1h
        lidos = chamada.lidos
        if anterior is not None and chamada.minuto - anterior.minuto > prazo:
            gravados, lidos = gravados + lidos, 0
        resultado.append(
            ChamadaReal(
                chamada=chamada.chamada,
                minuto=chamada.minuto,
                modelo=chamada.modelo,
                entrada=chamada.entrada,
                gravados_5m=gravados,
                gravados_1h=0,
                lidos=lidos,
                saida=chamada.saida,
                compactou=chamada.compactou,
            )
        )
    return resultado
