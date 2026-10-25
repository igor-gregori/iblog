"""A contagem de tokens.

O post usa o `o200k_base` (veja `comum/tokens.py`): os números servem para comparar textos entre si, não para prever
a fatura exata de um modelo de outro fornecedor. A página repete a contagem no navegador com o `gpt-tokenizer`, que
implementa o mesmo tokenizador; os testes conferem que os dois dão o mesmo resultado.
"""

import codecs

from comum.tokens import CODIFICACAO, codificador, contar

__all__ = ["CODIFICACAO", "contar", "pedacos"]


def pedacos(texto: str) -> list[tuple[str, int]]:
    """O texto quebrado nos pedaços que viram tokens, cada um com quantos tokens ocupa. Juntos, voltam a ser o texto.

    Os bytes de cada token são decodificados em sequência. Um caractere partido entre dois tokens (um emoji, por
    exemplo) aparece no token em que termina; um token que não completa nenhum caractere se junta ao seguinte.
    """
    tokenizador = codificador()
    decodificador = codecs.getincrementaldecoder("utf-8")()
    resultado: list[tuple[str, int]] = []
    quantos = 0
    for token in tokenizador.encode(texto):
        quantos += 1
        pedaco = decodificador.decode(tokenizador.decode_single_token_bytes(token))
        if pedaco:
            resultado.append((pedaco, quantos))
            quantos = 0
    return resultado
