"""Leitura dos registros de sessão do Claude Code, para os posts que medem sessões reais.

O Claude Code grava cada sessão num arquivo JSONL (em `~/.claude/projects/<pasta>/<sessão>.jsonl`), com uma linha por
registro: as mensagens do usuário (com os resultados das ferramentas), as respostas do modelo (com o `usage` que a API
devolveu), anexos que o próprio Claude Code acrescenta e marcas como a de compactação.

Daqui sai a sequência de chamadas ao modelo na conversa principal, cada uma com os registros que chegaram depois da
chamada anterior. O que cada post guarda no repositório são só números tirados daí, nunca o texto.
"""

import json
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from itertools import pairwise
from pathlib import Path

import numpy as np


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
    # O pedido que o Claude Code registrou para esta chamada (`requestRef`), nas versões que registram.
    pedido: str = ""


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
                    pedido=registro.get("requestRef", ""),
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


@dataclass(frozen=True)
class Calibracao:
    """Quantos tokens do Claude dá cada token de um tokenizador aberto, no texto de uma sessão.

    O tokenizador do Claude não é público. A API diz o tamanho exato de cada pedido, e o registro tem o texto do que
    entrou entre uma chamada e a seguinte: a reta entre os dois (tokens do Claude ≈ fator × tokens contados +
    constante) converte uma contagem aberta em tokens do Claude. A constante é o que o Claude Code acrescenta a cada
    chamada além desse texto (lembretes e anexos).
    """

    fator: float
    constante: float
    r2: float  # quanto a reta explica o tamanho do que entrou, de 0 a 1
    trechos: int  # trechos usados: os sem imagem e sem compactação


def texto_do_usuario(registros: list[dict], contar: Callable[[str], int], com_anexos: bool = False) -> tuple[int, int]:
    """Os tokens (por `contar`) do texto das mensagens de usuário e dos resultados de ferramenta, e quantas imagens.

    O resumo da compactação fica de fora. Os anexos do Claude Code (os CLAUDE.md, os trechos de arquivos editados, as
    mensagens que chegam enquanto o modelo trabalha) só contam com `com_anexos`: o post `janela-de-contexto` mediu sem
    eles, e a diferença foi para a constante da calibração.
    """
    tokens = imagens = 0
    for registro in registros:
        if com_anexos and registro.get("type") == "attachment":
            tokens += sum(contar(texto) for texto in _textos_do_anexo(registro["attachment"]))
            continue
        if registro.get("type") != "user" or registro.get("isCompactSummary"):
            continue
        conteudo = registro["message"]["content"]
        if isinstance(conteudo, str):
            tokens += contar(conteudo)
            continue
        for bloco in conteudo:
            if bloco.get("type") == "text":
                tokens += contar(bloco["text"])
            elif bloco.get("type") == "tool_result":
                resultado = bloco.get("content")
                if isinstance(resultado, str):
                    tokens += contar(resultado)
                elif isinstance(resultado, list):
                    imagens += sum(1 for parte in resultado if parte.get("type") == "image")
                    tokens += contar("\n".join(parte.get("text", "") for parte in resultado))
    return tokens, imagens


def memorias(anexo: dict) -> list[tuple[str, str]]:
    """Os arquivos de memória (CLAUDE.md) que um anexo põe no pedido, como (caminho, texto).

    O Claude Code manda o CLAUDE.md da pasta do projeto no começo da sessão, de novo quando a sessão é retomada com o
    arquivo mudado e depois de uma compactação (anexo `instructions`), e o de uma subpasta quando o agente lê um
    arquivo dela (anexo `nested_memory`).
    """
    if anexo.get("type") == "instructions":
        return [(arquivo["path"], arquivo["content"]) for arquivo in anexo.get("files", [])]
    if anexo.get("type") == "nested_memory":
        return [(anexo["path"], anexo["content"]["content"])]
    return []


def _textos_do_anexo(anexo: dict) -> list[str]:
    tipo = anexo.get("type")
    if tipo in ("instructions", "nested_memory"):
        return [texto for _, texto in memorias(anexo)]
    if tipo == "edited_text_file":
        return [anexo.get("snippet") or ""]
    if tipo == "queued_command" and isinstance(anexo.get("prompt"), str):
        return [anexo["prompt"]]
    if tipo == "file":
        return [((anexo.get("content") or {}).get("file") or {}).get("content", "")]
    if isinstance(anexo.get("text"), str):
        return [anexo["text"]]
    return []


def calibrar(chamadas: list[Chamada], contar: Callable[[str], int], com_anexos: bool = False) -> Calibracao:
    """A reta entre o texto que entrou de uma chamada para a outra e o crescimento exato do pedido."""
    pontos = []
    for anterior, chamada in pairwise(chamadas):
        tokens, imagens = texto_do_usuario(chamada.antes, contar, com_anexos)
        if imagens or chamada.compactou:
            continue
        pontos.append((tokens, contexto(chamada.uso) - contexto(anterior.uso) - anterior.uso["output_tokens"]))
    x = np.array([[tokens, 1.0] for tokens, _ in pontos])
    y = np.array([novo for _, novo in pontos], dtype=float)
    (fator, constante), *_ = np.linalg.lstsq(x, y, rcond=None)
    r2 = 1 - ((y - x @ [fator, constante]) ** 2).sum() / ((y - y.mean()) ** 2).sum()
    return Calibracao(float(fator), float(constante), float(r2), len(pontos))
