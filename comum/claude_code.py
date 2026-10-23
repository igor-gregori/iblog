"""Leitura dos registros de sessão do Claude Code, para os posts que medem sessões reais.

O Claude Code grava cada sessão num arquivo JSONL (em `~/.claude/projects/<pasta>/<sessão>.jsonl`), com uma linha por
registro: as mensagens do usuário (com os resultados das ferramentas), as respostas do modelo (com o `usage` que a API
devolveu), anexos que o próprio Claude Code acrescenta e marcas como a de compactação.

Daqui sai a sequência de chamadas ao modelo na conversa principal, cada uma com os registros que chegaram depois da
chamada anterior. O que cada post guarda no repositório são só números tirados daí, nunca o texto.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path


@dataclass
class Chamada:
    """Uma chamada ao modelo: a resposta, o uso de tokens e o que entrou na conversa desde a chamada anterior."""

    id: str
    instante: datetime
    modelo: str
    uso: dict
    # Os blocos da resposta do modelo (texto, pedidos de ferramenta, raciocínio).
    resposta: list[dict] = field(default_factory=list)
    # Os registros de usuário e os anexos que chegaram entre a chamada anterior e esta, na ordem do arquivo.
    antes: list[dict] = field(default_factory=list)
    # A conversa foi compactada logo antes desta chamada; `compactacao` traz os números que o Claude Code registrou.
    compactou: bool = False
    compactacao: dict = field(default_factory=dict)


def ler_registro(jsonl: Path) -> list[Chamada]:
    """As chamadas ao modelo na conversa principal, na ordem em que aconteceram.

    Uma resposta com vários blocos aparece em várias linhas com o mesmo `id`; fica uma chamada por `id`, com o
    instante e o uso da última linha e todos os blocos. As chamadas dos subagentes (`isSidechain`) e as mensagens que o próprio Claude
    Code escreve (modelo `<synthetic>`) ficam de fora.
    """
    chamadas: dict[str, Chamada] = {}
    pendentes: list[dict] = []
    compactacao: dict | None = None
    for linha in jsonl.read_text(encoding="utf-8").splitlines():
        try:
            registro = json.loads(linha)
        except json.JSONDecodeError:
            continue
        if registro.get("isSidechain"):
            continue
        tipo = registro.get("type")
        if tipo == "system" and registro.get("subtype") == "compact_boundary":
            compactacao = registro.get("compactMetadata") or {}
            continue
        mensagem = registro.get("message")
        if tipo == "assistant" and isinstance(mensagem, dict) and "usage" in mensagem:
            if mensagem.get("model") == "<synthetic>":
                continue
            chave = mensagem["id"]
            if chave not in chamadas:
                chamadas[chave] = Chamada(
                    id=chave,
                    instante=datetime.fromisoformat(registro["timestamp"]),
                    modelo=mensagem["model"],
                    uso=mensagem["usage"],
                    antes=pendentes,
                    compactou=compactacao is not None,
                    compactacao=compactacao or {},
                )
                pendentes, compactacao = [], None
            chamada = chamadas[chave]
            chamada.instante = datetime.fromisoformat(registro["timestamp"])
            chamada.uso = mensagem["usage"]
            chamada.resposta.extend(mensagem.get("content") or [])
        elif tipo in ("user", "attachment"):
            pendentes.append(registro)
    return list(chamadas.values())


def gravados(uso: dict) -> tuple[int, int]:
    """Os tokens gravados no cache com o prazo de 5 minutos e com o de 1 hora.

    Registros antigos não separam os prazos: aí tudo conta como 5 minutos, o padrão da API.
    """
    gravacao = uso.get("cache_creation") or {}
    if not gravacao:
        return uso.get("cache_creation_input_tokens", 0), 0
    return gravacao.get("ephemeral_5m_input_tokens", 0), gravacao.get("ephemeral_1h_input_tokens", 0)


def contexto(uso: dict) -> int:
    """Tudo o que a chamada mandou ao modelo: fora do cache, gravado e lido."""
    return uso["input_tokens"] + uso.get("cache_creation_input_tokens", 0) + uso.get("cache_read_input_tokens", 0)
