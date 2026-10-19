"""A contagem de tokens.

O post usa o `o200k_base`, um tokenizador aberto que a biblioteca `tiktoken`, da OpenAI, associa ao GPT-4o e à
família GPT-5. Cada família de modelo tem o seu: os números aqui servem para comparar textos entre si, não para
prever a fatura exata de um modelo de outro fornecedor. A página repete a contagem no navegador com o
`gpt-tokenizer`, que implementa o mesmo tokenizador; os testes conferem que os dois dão o mesmo resultado.
"""

import codecs
from functools import cache

import tiktoken

CODIFICACAO = "o200k_base"


@cache
def _codificador() -> tiktoken.Encoding:
    return tiktoken.get_encoding(CODIFICACAO)


def contar(texto: str) -> int:
    """Quantos tokens o texto tem."""
    return len(_codificador().encode(texto))


def pedacos(texto: str) -> list[tuple[str, int]]:
    """O texto quebrado nos pedaços que viram tokens, cada um com quantos tokens ocupa. Juntos, voltam a ser o texto.

    Os bytes de cada token são decodificados em sequência. Um caractere partido entre dois tokens (um emoji, por
    exemplo) aparece no token em que termina; um token que não completa nenhum caractere se junta ao seguinte.
    """
    codificador = _codificador()
    decodificador = codecs.getincrementaldecoder("utf-8")()
    resultado: list[tuple[str, int]] = []
    quantos = 0
    for token in codificador.encode(texto):
        quantos += 1
        pedaco = decodificador.decode(codificador.decode_single_token_bytes(token))
        if pedaco:
            resultado.append((pedaco, quantos))
            quantos = 0
    return resultado
