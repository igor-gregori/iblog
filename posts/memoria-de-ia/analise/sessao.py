"""Quanto de uma sessão real do Claude Code foi memória: os CLAUDE.md que ele pôs nos pedidos.

A sessão é a de 21 a 25/10/2026, em que foram escritos os posts 5, 6 e 7 da série. O registro (`comum/claude_code.py`)
diz em que chamada cada CLAUDE.md entrou e com que texto, e a API diz o tamanho exato de cada pedido e quanto dele foi
lido do cache. Daqui saem três coisas, todas só com números:

- **As cargas**: cada vez que um CLAUDE.md entrou num pedido, por quê (o começo da sessão, a sessão retomada com o
  arquivo mudado, a leitura de um arquivo da pasta, a compactação) e com quantos tokens. O tamanho é estimado: o texto
  é contado com o `o200k_base` e convertido em tokens do Claude por um fator calibrado na própria sessão.
- **Os pedidos**: o tamanho e o uso do cache de cada chamada (exatos, da API) e quanto do pedido era memória.
  Uma carga fica em todos os pedidos seguintes até a compactação, que recomeça a conversa. Quando o arquivo mudou e
  entrou de novo, a versão antiga continua no histórico: o pedido leva as duas.
- **A parte da memória lida do cache**: uma carga entra no pedido mais ou menos onde a conversa estava quando ela
  chegou. Se o pedido leu do cache até depois dela, ela saiu pelo preço do cache; senão, foi gravada de novo.
"""

import csv
import json
from dataclasses import asdict, astuple, dataclass, fields
from pathlib import Path
from zoneinfo import ZoneInfo

from comum.claude_code import Calibracao, Chamada, calibrar, contexto, gravados, ler_registro, memorias
from comum.tokens import contar

from .caminhos import CALIBRACAO, CARGAS, PEDIDOS

FUSO = ZoneInfo("America/Sao_Paulo")

# Os motivos de uma carga, na ordem em que aparecem no texto.
MOTIVOS = ("inicio", "retomada", "pasta", "compactacao")


@dataclass(frozen=True)
class Carga:
    chamada: int  # a chamada em que o arquivo entrou, a partir de 1
    arquivo: str  # o caminho dentro do projeto
    motivo: str  # um de MOTIVOS
    texto: int  # tokens do o200k_base
    tokens: int  # tokens do Claude, estimados pelo fator da calibração
    posicao: int  # onde a carga começa no pedido, em tokens do Claude (aproximado)


@dataclass(frozen=True)
class Pedido:
    chamada: int
    dia: str  # AAAA-MM-DD, no fuso de Brasília
    contexto: int  # o pedido inteiro, pela API
    fora: int  # tokens fora do cache
    lidos: int  # lidos do cache
    gravados: int  # gravados no cache com o prazo de 5 minutos
    gravados_longos: int  # gravados com o prazo de 1 hora
    saida: int  # tokens de saída, raciocínio incluído
    memoria: int  # quanto do pedido eram CLAUDE.md (estimado)
    memoria_atual: int  # a parte disso que era a versão mais nova de cada arquivo; o resto eram cópias antigas
    copias: int  # quantos CLAUDE.md estavam no pedido, contando versões do mesmo arquivo
    memoria_lida: int  # a parte da memória que saiu pelo preço do cache; o resto foi gravado


def _relativo(caminho: str, pasta: str) -> str:
    return str(Path(caminho).relative_to(pasta)) if caminho.startswith(pasta) else Path(caminho).name


def extrair(jsonl: Path) -> tuple[list[Carga], list[Pedido], Calibracao]:
    chamadas = ler_registro(jsonl)
    reta = calibrar(chamadas, contar, com_anexos=True)
    pasta = _pasta_do_projeto(jsonl)

    cargas: list[Carga] = []
    pedidos: list[Pedido] = []
    presentes: list[Carga] = []
    for n, chamada in enumerate(chamadas, start=1):
        if chamada.compactou:
            presentes = []
        novas = _cargas(chamada, n, chamadas[n - 2] if n > 1 else None, pasta, reta.fator)
        cargas += novas
        presentes += novas
        lidos = chamada.uso.get("cache_read_input_tokens", 0)
        memoria_lida = sum(min(c.tokens, max(0, lidos - c.posicao)) for c in presentes)
        curtos, longos = gravados(chamada.uso)
        pedidos.append(
            Pedido(
                chamada=n,
                dia=chamada.instante.astimezone(FUSO).date().isoformat(),
                contexto=contexto(chamada.uso),
                fora=chamada.uso["input_tokens"],
                lidos=lidos,
                gravados=curtos,
                gravados_longos=longos,
                saida=chamada.uso["output_tokens"],
                memoria=sum(c.tokens for c in presentes),
                memoria_atual=sum({c.arquivo: c.tokens for c in presentes}.values()),
                copias=len(presentes),
                memoria_lida=memoria_lida,
            )
        )
    return cargas, pedidos, reta


def _cargas(chamada: Chamada, n: int, anterior: Chamada | None, pasta: str, fator: float) -> list[Carga]:
    """Os CLAUDE.md que entraram no pedido desta chamada."""
    # Onde a conversa estava quando a carga chegou: depois do pedido e da resposta anteriores. No começo e depois da
    # compactação, o pedido recomeça e a carga vem logo depois das instruções e das ferramentas do Claude Code, que
    # são a parte lida do cache.
    if anterior is None or chamada.compactou:
        posicao = chamada.uso.get("cache_read_input_tokens", 0)
    else:
        posicao = contexto(anterior.uso) + anterior.uso["output_tokens"]
    novas = []
    for registro in chamada.antes:
        if registro.get("type") != "attachment":
            continue
        anexo = registro["attachment"]
        for caminho, texto in memorias(anexo):
            if anexo["type"] == "nested_memory":
                motivo = "pasta"
            elif n == 1:
                motivo = "inicio"
            elif chamada.compactou:
                motivo = "compactacao"
            else:
                motivo = "retomada"
            medido = contar(texto)
            tokens = round(fator * medido)
            novas.append(Carga(n, _relativo(caminho, pasta), motivo, medido, tokens, posicao))
            posicao += tokens
    return novas


def _pasta_do_projeto(jsonl: Path) -> str:
    """A pasta em que a sessão rodou (o `cwd` dos registros), para guardar os caminhos relativos a ela."""
    for linha in jsonl.read_text(encoding="utf-8").splitlines():
        registro = json.loads(linha)
        if registro.get("cwd"):
            return registro["cwd"].rstrip("/") + "/"
    return ""


def gravar(cargas: list[Carga], pedidos: list[Pedido], reta: Calibracao) -> None:
    CARGAS.parent.mkdir(parents=True, exist_ok=True)
    for caminho, tipo, linhas in ((CARGAS, Carga, cargas), (PEDIDOS, Pedido, pedidos)):
        with open(caminho, "w", encoding="utf-8", newline="") as arquivo:
            escritor = csv.writer(arquivo, lineterminator="\n")
            escritor.writerow([campo.name for campo in fields(tipo)])
            escritor.writerows(astuple(linha) for linha in linhas)
    calibracao = Calibracao(round(reta.fator, 4), round(reta.constante, 1), round(reta.r2, 4), reta.trechos)
    CALIBRACAO.write_text(json.dumps(asdict(calibracao), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def ler() -> tuple[list[Carga], list[Pedido], Calibracao]:
    with open(CARGAS, encoding="utf-8") as arquivo:
        cargas = [
            Carga(int(c["chamada"]), c["arquivo"], c["motivo"], int(c["texto"]), int(c["tokens"]), int(c["posicao"]))
            for c in csv.DictReader(arquivo)
        ]
    with open(PEDIDOS, encoding="utf-8") as arquivo:
        pedidos = [
            Pedido(**{k: v if k == "dia" else int(v) for k, v in linha.items()}) for linha in csv.DictReader(arquivo)
        ]
    return cargas, pedidos, Calibracao(**json.loads(CALIBRACAO.read_text(encoding="utf-8")))
