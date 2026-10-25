"""As duas buscas do RAG e a junção delas.

- Por palavras: o BM25, a conta clássica dos buscadores. Um pedaço sobe quando tem as palavras da pergunta, mais
  ainda as palavras raras no corpus, e o tamanho do pedaço é descontado.
- Por significado: a similaridade de cosseno entre o embedding da pergunta e o de cada pedaço.
- Híbrida: as duas listas juntadas pela posição (reciprocal rank fusion), sem precisar pôr as notas na mesma escala.

`pagina/busca.ts` repete estas contas; os testes conferem os dois lados.
"""

import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass

# As palavras que aparecem em quase todo texto em português e não ajudam a achar nada.
PALAVRAS_VAZIAS = frozenset(
    # Uma palavra por espaço, como no TypeScript: mais fácil de conferir que uma lista com aspas.
    """
    a o as os um uma uns umas de do da dos das em no na nos nas num numa por pelo pela pelos pelas para pra com sem
    e ou que se como mais menos ao aos ser sao foi era eh esta este isso isto esse essa ele ela eles elas seu sua
    seus suas meu minha qual quais quando onde porque quem cada tem ter ja nao sim mas so tambem entre ate sobre
    """.split()  # noqa: SIM905
)

# Os parâmetros de costume do BM25: k1 limita o peso de uma palavra repetida; b, o desconto pelo tamanho.
K1 = 1.2
B = 0.75

# A constante da reciprocal rank fusion: com 60, a diferença entre o 1º e o 2º lugar pesa pouco mais que entre o 10º
# e o 11º. É o valor do artigo que propôs a fusão.
K_RRF = 60


def termos(texto: str) -> list[str]:
    """As palavras do texto como a busca as compara: sem acento, em minúsculas, sem as vazias e sem o plural em s."""
    sem_acento = "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")
    palavras = re.findall(r"[a-z0-9]+", sem_acento.lower())
    return [p[:-1] if len(p) > 3 and p.endswith("s") else p for p in palavras if p not in PALAVRAS_VAZIAS]


@dataclass
class IndiceBM25:
    """O índice da busca por palavras: quantas vezes cada palavra aparece em cada pedaço."""

    contagens: list[Counter[str]]
    tamanhos: list[int]
    media: float
    # Em quantos pedaços cada palavra aparece.
    frequencia: Counter[str]

    @classmethod
    def criar(cls, textos: list[str]) -> IndiceBM25:
        contagens = [Counter(termos(t)) for t in textos]
        tamanhos = [sum(c.values()) for c in contagens]
        frequencia: Counter[str] = Counter()
        for c in contagens:
            frequencia.update(c.keys())
        return cls(contagens, tamanhos, sum(tamanhos) / len(tamanhos), frequencia)

    def notas(self, pergunta: str) -> list[float]:
        """A nota de cada pedaço para a pergunta, na ordem dos pedaços."""
        n = len(self.contagens)
        palavras = list(dict.fromkeys(termos(pergunta)))
        notas = []
        for contagem, tamanho in zip(self.contagens, self.tamanhos, strict=True):
            nota = 0.0
            for palavra in palavras:
                vezes = contagem[palavra]
                if not vezes:
                    continue
                em = self.frequencia[palavra]
                raridade = math.log(1 + (n - em + 0.5) / (em + 0.5))
                nota += raridade * vezes * (K1 + 1) / (vezes + K1 * (1 - B + B * tamanho / self.media))
            notas.append(nota)
        return notas


def cosseno(a: list[float], b: list[float]) -> float:
    """O cosseno do ângulo entre dois vetores: 1 quando apontam para o mesmo lado."""
    produto = sum(x * y for x, y in zip(a, b, strict=True))
    return produto / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))


def ordem(notas: list[float]) -> list[int]:
    """Os pedaços da maior nota para a menor; no empate, o que vem antes no corpus."""
    return sorted(range(len(notas)), key=lambda i: (-notas[i], i))


def fusao(listas: list[list[int]], limite: int) -> list[int]:
    """Junta várias listas de pedaços pela posição: cada lista dá 1 / (60 + posição) aos seus `limite` primeiros."""
    notas: dict[int, float] = {}
    for lista in listas:
        for posicao, pedaco in enumerate(lista[:limite], start=1):
            notas[pedaco] = notas.get(pedaco, 0.0) + 1 / (K_RRF + posicao)
    return sorted(notas, key=lambda p: (-notas[p], p))
