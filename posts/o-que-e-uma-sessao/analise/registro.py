"""O uso de tokens de uma sessão real do Claude Code, chamada por chamada.

O Claude Code grava cada sessão num arquivo JSONL (em `~/.claude/projects/<pasta>/<sessão>.jsonl`), com uma linha por
mensagem. As respostas do modelo trazem o `usage` que a API devolveu: os tokens de entrada fora do cache, os gravados
no cache (com o prazo de 5 minutos ou de 1 hora), os lidos do cache e os de saída.

A leitura do registro está em `comum/claude_code.py`, que o post 5 também usa. Daqui sai só o que este post precisa: os números de cada chamada e os minutos desde o início. Nenhum texto da conversa,
caminho ou nome de arquivo vai para `dados/manuais/sessao-real.csv`, que é o que fica no repositório.
"""

import csv
from dataclasses import astuple, dataclass, fields
from pathlib import Path

from comum.claude_code import gravados, ler_registro

from .caminhos import SESSAO_REAL


@dataclass(frozen=True)
class ChamadaReal:
    chamada: int  # a ordem da chamada na sessão, a partir de 1
    minuto: float  # minutos desde a primeira chamada
    modelo: str
    entrada: int  # tokens de entrada fora do cache
    gravados_5m: int  # gravados no cache com o prazo de 5 minutos
    gravados_1h: int  # gravados no cache com o prazo de 1 hora
    lidos: int  # lidos do cache
    saida: int  # tokens de saída, com o raciocínio
    compactou: bool  # a conversa foi resumida (compactada) logo antes desta chamada

    @property
    def contexto(self) -> int:
        """Tudo o que a chamada mandou ao modelo."""
        return self.entrada + self.gravados_5m + self.gravados_1h + self.lidos


def extrair(jsonl: Path) -> list[ChamadaReal]:
    """As chamadas ao modelo na conversa principal de uma sessão, só com os números (veja `comum.claude_code`)."""
    chamadas = ler_registro(jsonl)
    inicio = chamadas[0].instante
    resultado = []
    for n, chamada in enumerate(chamadas, start=1):
        gravados_5m, gravados_1h = gravados(chamada.uso)
        resultado.append(
            ChamadaReal(
                chamada=n,
                minuto=round((chamada.instante - inicio).total_seconds() / 60, 1),
                modelo=chamada.modelo,
                entrada=chamada.uso["input_tokens"],
                gravados_5m=gravados_5m,
                gravados_1h=gravados_1h,
                lidos=chamada.uso.get("cache_read_input_tokens", 0),
                saida=chamada.uso["output_tokens"],
                compactou=chamada.compactou,
            )
        )
    return resultado


def gravar(chamadas: list[ChamadaReal], destino: Path = SESSAO_REAL) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    with open(destino, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.writer(arquivo, lineterminator="\n")
        escritor.writerow([campo.name for campo in fields(ChamadaReal)])
        for chamada in chamadas:
            escritor.writerow(int(valor) if isinstance(valor, bool) else valor for valor in astuple(chamada))


def ler(origem: Path = SESSAO_REAL) -> list[ChamadaReal]:
    with open(origem, encoding="utf-8") as arquivo:
        return [
            ChamadaReal(
                chamada=int(linha["chamada"]),
                minuto=float(linha["minuto"]),
                modelo=linha["modelo"],
                entrada=int(linha["entrada"]),
                gravados_5m=int(linha["gravados_5m"]),
                gravados_1h=int(linha["gravados_1h"]),
                lidos=int(linha["lidos"]),
                saida=int(linha["saida"]),
                compactou=linha["compactou"] == "1",
            )
            for linha in csv.DictReader(arquivo)
        ]
