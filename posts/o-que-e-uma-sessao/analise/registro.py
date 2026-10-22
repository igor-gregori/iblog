"""O uso de tokens de uma sessão real do Claude Code, chamada por chamada.

O Claude Code grava cada sessão num arquivo JSONL (em `~/.claude/projects/<pasta>/<sessão>.jsonl`), com uma linha por
mensagem. As respostas do modelo trazem o `usage` que a API devolveu: os tokens de entrada fora do cache, os gravados
no cache (com o prazo de 5 minutos ou de 1 hora), os lidos do cache e os de saída.

Daqui sai só o que o post precisa: os números de cada chamada e os minutos desde o início. Nenhum texto da conversa,
caminho ou nome de arquivo vai para `dados/manuais/sessao-real.csv`, que é o que fica no repositório.
"""

import csv
import json
from dataclasses import astuple, dataclass, fields
from datetime import datetime
from pathlib import Path

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
    """As chamadas ao modelo na conversa principal de uma sessão, na ordem em que aconteceram.

    Uma resposta com vários blocos (texto, uso de ferramenta) aparece em várias linhas com o mesmo `id` e o mesmo uso;
    fica uma chamada por `id`. As chamadas dos subagentes (`isSidechain`) e as mensagens que o próprio Claude Code
    escreve (modelo `<synthetic>`) ficam de fora.
    """
    ordem: list[str] = []
    usos: dict[str, tuple[str, str, dict]] = {}
    compactadas: set[str] = set()
    compactou = False
    for linha in jsonl.read_text(encoding="utf-8").splitlines():
        try:
            registro = json.loads(linha)
        except json.JSONDecodeError:
            continue
        if registro.get("type") == "system" and registro.get("subtype") == "compact_boundary":
            compactou = True
            continue
        mensagem = registro.get("message")
        if registro.get("type") != "assistant" or not isinstance(mensagem, dict) or "usage" not in mensagem:
            continue
        if registro.get("isSidechain") or mensagem.get("model") == "<synthetic>":
            continue
        chave = mensagem["id"]
        if chave not in usos:
            ordem.append(chave)
            if compactou:
                compactadas.add(chave)
                compactou = False
        usos[chave] = (registro["timestamp"], mensagem["model"], mensagem["usage"])

    inicio = _instante(usos[ordem[0]][0])
    chamadas = []
    for n, chave in enumerate(ordem, start=1):
        instante, modelo, uso = usos[chave]
        gravacao = uso.get("cache_creation") or {}
        gravados_5m = gravacao.get("ephemeral_5m_input_tokens", 0)
        gravados_1h = gravacao.get("ephemeral_1h_input_tokens", 0)
        if not gravacao:  # registros antigos não separam os prazos: o padrão da API é 5 minutos
            gravados_5m = uso.get("cache_creation_input_tokens", 0)
        chamadas.append(
            ChamadaReal(
                chamada=n,
                minuto=round((_instante(instante) - inicio).total_seconds() / 60, 1),
                modelo=modelo,
                entrada=uso["input_tokens"],
                gravados_5m=gravados_5m,
                gravados_1h=gravados_1h,
                lidos=uso.get("cache_read_input_tokens", 0),
                saida=uso["output_tokens"],
                compactou=chave in compactadas,
            )
        )
    return chamadas


def _instante(texto: str) -> datetime:
    return datetime.fromisoformat(texto)


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
