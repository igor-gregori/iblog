"""Quanto custa uma pergunta com todos os documentos no pedido e com só os pedaços que a busca trouxe.

`pagina/conta.ts` repete esta conta; os testes conferem os dois lados.
"""

from dataclasses import dataclass

from comum.precos import Preco, custo_com_faixas

# Os tokens que vão em toda pergunta além dos documentos: as instruções e a própria pergunta.
EXTRA = 500
# Uma resposta curta.
SAIDA = 500


@dataclass
class CustoDaPergunta:
    # Nulos quando os documentos não cabem na janela do modelo.
    tudo_sem_cache: float | None
    tudo_com_cache: float | None
    rag: float


def custo_da_pergunta(preco: Preco, documentos: int, pedacos: int) -> CustoDaPergunta:
    """O custo de uma pergunta com `documentos` tokens no pedido (lidos do cache ou não) e com `pedacos` tokens."""
    entrada = documentos + EXTRA
    cabe = entrada + SAIDA <= preco.janela
    return CustoDaPergunta(
        tudo_sem_cache=custo_com_faixas(preco, entrada, SAIDA, 0.0) if cabe else None,
        tudo_com_cache=custo_com_faixas(preco, entrada, SAIDA, documentos / entrada) if cabe else None,
        rag=custo_com_faixas(preco, pedacos + EXTRA, SAIDA, 0.0),
    )
