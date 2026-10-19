"""Os textos que o post mede: o mesmo conteúdo em formas diferentes."""

import json
from dataclasses import dataclass

from .caminhos import AMOSTRAS


@dataclass(frozen=True)
class Amostra:
    id: str
    nome: str
    texto: str


def ler_amostras() -> list[Amostra]:
    pedido = json.loads((AMOSTRAS / "pedido.json").read_text(encoding="utf-8"))

    def ler(arquivo: str) -> str:
        return (AMOSTRAS / arquivo).read_text(encoding="utf-8").rstrip("\n")

    return [
        Amostra("texto-pt", "Texto em português", ler("texto-pt.txt")),
        Amostra("texto-en", "O mesmo texto em inglês", ler("texto-en.txt")),
        Amostra("codigo", "Código TypeScript", ler("codigo.ts")),
        # As duas formas que o JSON.stringify do JavaScript produz: com recuo de 2 espaços e sem nenhum espaço.
        Amostra("json-indentado", "JSON com recuo", json.dumps(pedido, ensure_ascii=False, indent=2)),
        Amostra(
            "json-compacto", "O mesmo JSON, compacto", json.dumps(pedido, ensure_ascii=False, separators=(",", ":"))
        ),
    ]
