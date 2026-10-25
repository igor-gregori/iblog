"""A contagem de tokens com o `o200k_base`, para os posts que medem textos.

O `o200k_base` é um tokenizador aberto que a biblioteca `tiktoken`, da OpenAI, associa ao GPT-4o e à família GPT-5.
Cada família de modelo tem o seu: os números daqui servem para comparar textos entre si, não para prever a fatura
exata de um modelo de outro fornecedor. As páginas repetem a contagem com o `gpt-tokenizer`, que implementa o mesmo
tokenizador.
"""

from functools import cache

import tiktoken

CODIFICACAO = "o200k_base"


@cache
def codificador() -> tiktoken.Encoding:
    return tiktoken.get_encoding(CODIFICACAO)


def contar(texto: str) -> int:
    """Quantos tokens o texto tem."""
    return len(codificador().encode(texto))
