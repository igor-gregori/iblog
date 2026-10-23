"""Do que é feito o pedido de cada chamada de uma sessão real do Claude Code.

O registro da sessão (`comum/claude_code.py`) dá o tamanho exato de cada pedido, pelo `usage` da API, e o texto do
que entrou na conversa entre uma chamada e outra. O tamanho é exato; a divisão por tipo é uma estimativa:

- **O começo** da primeira chamada, que já estava no cache (instruções e ferramentas do Claude Code), é exato, e o
  resto da primeira chamada (CLAUDE.md, ambiente e lembretes) vai para a mesma categoria.
- **As respostas do modelo** são exatas: cada resposta entra no pedido seguinte com os tokens de saída que a API
  cobrou, raciocínio incluído.
- **O que entrou de novo** entre duas chamadas também tem tamanho exato (o pedido novo menos o anterior e a resposta
  anterior). Esse total é dividido pelo texto de cada parte, contado com um tokenizador aberto (o `o200k_base`, o do
  post sobre tokens) e convertido em tokens do Claude por um fator calibrado na própria sessão. O que sobra é das
  imagens, se o trecho tinha alguma, ou dos lembretes que o Claude Code acrescenta.
- **Depois de uma compactação**, o pedido é o resumo (com o tamanho que o Claude Code registrou) e o que o Claude
  Code carrega de novo.

Nenhum texto sai daqui: `dados/manuais/composicao.csv` e `dados/manuais/calibracao.json` têm só números.
"""

import csv
import json
from collections import Counter
from dataclasses import asdict, astuple, dataclass, fields
from itertools import pairwise
from pathlib import Path

import numpy as np
import tiktoken

from comum.claude_code import Chamada, contexto, ler_registro

from .caminhos import CALIBRACAO, COMPOSICAO

CATEGORIAS = ("instrucoes", "modelo", "comandos", "imagens", "outros")

# As ferramentas cujo resultado é a saída de um comando no terminal.
COMANDOS = {"Bash", "BashOutput"}

_codificacao = tiktoken.get_encoding("o200k_base")


def _tokens(texto: str) -> int:
    return len(_codificacao.encode(texto, disallowed_special=()))


@dataclass(frozen=True)
class Composicao:
    chamada: int  # a ordem da chamada na sessão, a partir de 1
    contexto: int  # o pedido inteiro, em tokens, pelo `usage` da API
    instrucoes: int  # instruções, ferramentas, CLAUDE.md e lembretes do Claude Code
    modelo: int  # respostas do modelo, com o raciocínio
    comandos: int  # saídas de comandos no terminal
    imagens: int  # imagens lidas (capturas de tela)
    outros: int  # suas mensagens, outros resultados de ferramenta e o resumo da compactação


@dataclass(frozen=True)
class Calibracao:
    fator: float  # tokens do Claude por token do o200k_base, no texto desta sessão
    constante: float  # tokens que o Claude Code acrescenta a cada chamada, além do texto (lembretes)
    r2: float  # quanto a reta explica o tamanho do que entrou de novo, nos trechos sem imagem
    trechos: int  # trechos usados na calibração
    saida_total: int  # tokens de saída da sessão, pela API
    saida_visivel: int  # a parte da saída que é texto e pedido de ferramenta, estimada; o resto é raciocínio
    imagens: int  # imagens lidas na sessão
    comandos: int  # comandos rodados no terminal
    compactacao_gatilho: str  # "manual" (o /compact) ou "auto"
    compactacao_antes: int  # tokens da conversa logo antes da compactação, pelo Claude Code
    compactacao_resumo: int  # tokens do resumo que ficou no lugar dela


@dataclass
class _Trecho:
    """O que entrou na conversa entre duas chamadas, em tokens do o200k_base, e quantas imagens."""

    texto: Counter
    imagens: int = 0
    comandos: int = 0


def _texto(conteudo) -> str:
    if isinstance(conteudo, str):
        return conteudo
    if isinstance(conteudo, list):
        return "\n".join(bloco.get("text", "") for bloco in conteudo if isinstance(bloco, dict))
    return ""


def _medir_trecho(registros: list[dict], ferramentas: dict[str, str]) -> _Trecho:
    trecho = _Trecho(Counter())
    for registro in registros:
        if registro.get("type") != "user" or registro.get("isCompactSummary"):
            continue
        conteudo = registro["message"]["content"]
        # Mensagens que o próprio Claude Code escreve (isMeta) são lembretes, não suas.
        dono = "instrucoes" if registro.get("isMeta") else "outros"
        if isinstance(conteudo, str):
            trecho.texto[dono] += _tokens(conteudo)
            continue
        for bloco in conteudo:
            if bloco.get("type") == "text":
                trecho.texto[dono] += _tokens(bloco["text"])
            elif bloco.get("type") == "tool_result":
                ferramenta = ferramentas.get(bloco.get("tool_use_id"), "")
                categoria = "comandos" if ferramenta in COMANDOS else "outros"
                trecho.comandos += categoria == "comandos"
                resultado = bloco.get("content")
                if isinstance(resultado, list):
                    trecho.imagens += sum(1 for parte in resultado if parte.get("type") == "image")
                trecho.texto[categoria] += _tokens(_texto(resultado))
    return trecho


def _visivel(chamada: Chamada) -> int:
    """Tokens (o200k_base) da parte visível da resposta: texto e pedidos de ferramenta. O raciocínio não fica no
    registro, só a assinatura dele."""
    total = 0
    for bloco in chamada.resposta:
        if bloco.get("type") == "text":
            total += _tokens(bloco["text"])
        elif bloco.get("type") == "tool_use":
            total += _tokens(bloco["name"]) + _tokens(json.dumps(bloco["input"], ensure_ascii=False))
    return total


def extrair(jsonl: Path) -> tuple[list[Composicao], Calibracao]:
    chamadas = ler_registro(jsonl)
    ferramentas = {
        bloco["id"]: bloco["name"] for c in chamadas for bloco in c.resposta if bloco.get("type") == "tool_use"
    }
    trechos = [_medir_trecho(c.antes, ferramentas) for c in chamadas]
    novos = [
        contexto(c.uso) - contexto(anterior.uso) - anterior.uso["output_tokens"] for anterior, c in pairwise(chamadas)
    ]

    # A calibração: nos trechos sem imagem e sem compactação, o que entrou de novo ≈ fator × texto + constante.
    pontos = [
        (sum(trechos[i + 1].texto.values()), novo)
        for i, novo in enumerate(novos)
        if not trechos[i + 1].imagens and not chamadas[i + 1].compactou
    ]
    x = np.array([[texto, 1.0] for texto, _ in pontos])
    y = np.array([novo for _, novo in pontos], dtype=float)
    (fator, constante), *_ = np.linalg.lstsq(x, y, rcond=None)
    r2 = 1 - ((y - x @ [fator, constante]) ** 2).sum() / ((y - y.mean()) ** 2).sum()

    composicoes = []
    atual: Counter = Counter()
    compactacao: dict = {}
    for n, chamada in enumerate(chamadas):
        total = contexto(chamada.uso)
        if n == 0:
            comeco = chamada.uso.get("cache_read_input_tokens", 0)
            atual = Counter(instrucoes=comeco)
            _dividir(atual, trechos[0], total - comeco, fator)
        elif chamada.compactou:
            compactacao = chamada.compactacao
            resumo = compactacao["postTokens"]
            suas = round(fator * trechos[n].texto["outros"])
            atual = Counter(outros=resumo + suas, instrucoes=total - resumo - suas)
        else:
            atual["modelo"] += chamadas[n - 1].uso["output_tokens"]
            novo = novos[n - 1]
            if novo < 0:
                raise ValueError(f"o pedido da chamada {n + 1} encolheu sem compactação")
            _dividir(atual, trechos[n], novo, fator)
        assert sum(atual.values()) == total
        composicoes.append(Composicao(n + 1, total, *(atual[c] for c in CATEGORIAS)))

    calibracao = Calibracao(
        fator=round(float(fator), 4),
        constante=round(float(constante), 1),
        r2=round(float(r2), 4),
        trechos=len(pontos),
        saida_total=sum(c.uso["output_tokens"] for c in chamadas),
        saida_visivel=round(fator * sum(_visivel(c) for c in chamadas)),
        imagens=sum(t.imagens for t in trechos),
        comandos=sum(t.comandos for t in trechos),
        compactacao_gatilho=compactacao.get("trigger", ""),
        compactacao_antes=compactacao.get("preTokens", 0),
        compactacao_resumo=compactacao.get("postTokens", 0),
    )
    return composicoes, calibracao


def _dividir(atual: Counter, trecho: _Trecho, novo: int, fator: float) -> None:
    """Soma a `atual` os `novo` tokens que entraram: o texto pela contagem calibrada (reduzida se passar do total) e o
    resto para as imagens, se o trecho tinha alguma, ou para os lembretes do Claude Code."""
    estimado = {categoria: fator * tokens for categoria, tokens in trecho.texto.items()}
    escala = min(1.0, novo / sum(estimado.values())) if sum(estimado.values()) else 0.0
    usado = 0
    for categoria, tokens in estimado.items():
        parte = int(tokens * escala)
        atual[categoria] += parte
        usado += parte
    atual["imagens" if trecho.imagens else "instrucoes"] += novo - usado


def gravar(composicoes: list[Composicao], calibracao: Calibracao) -> None:
    COMPOSICAO.parent.mkdir(parents=True, exist_ok=True)
    with open(COMPOSICAO, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.writer(arquivo, lineterminator="\n")
        escritor.writerow([campo.name for campo in fields(Composicao)])
        escritor.writerows(astuple(c) for c in composicoes)
    CALIBRACAO.write_text(json.dumps(asdict(calibracao), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def ler() -> tuple[list[Composicao], Calibracao]:
    with open(COMPOSICAO, encoding="utf-8") as arquivo:
        composicoes = [Composicao(*(int(v) for v in linha.values())) for linha in csv.DictReader(arquivo)]
    return composicoes, Calibracao(**json.loads(CALIBRACAO.read_text(encoding="utf-8")))
