"""A leitura das execuções guardadas em `dados/execucoes/`, uma por arquivo, no formato de `comum/kit.py`."""

import json
from dataclasses import dataclass
from pathlib import Path

from .caminhos import EXECUCOES

TAREFAS = ["p-paginacao", "m-cupom", "g-devolucao"]
VARIANTES = ["A", "B", "C"]


@dataclass
class Execucao:
    tarefa: str
    variante: str
    repeticao: int
    inicio: str
    pronta_na_entrega: bool
    pronta_no_fim: bool
    correcoes: int
    # Testes escondidos que passaram, por grupo, na entrega e no fim.
    obvios_entrega: int
    regras_entrega: int
    obvios_fim: int
    regras_fim: int
    obvios_total: int
    regras_total: int
    # Os testes do grupo "regras" que falharam na entrega, pelo nome.
    regras_que_falharam: list[str]
    originais_ok: bool
    custo: float
    custo_entrega: float
    custo_correcoes: float
    minutos: float
    minutos_entrega: float
    respostas: int
    tokens_saida: int
    linhas_escritas: int
    negacoes: int


def _de_arquivo(caminho: Path) -> Execucao:
    r = json.loads(caminho.read_text(encoding="utf-8"))
    entrega, fim = r["medicoes"][0]["testes"], r["medicoes"][-1]["testes"]
    por_etapa = r["registro"]["por_etapa"]
    correcao = [nome for nome in por_etapa if nome.startswith("correcao")]
    etapas_de_entrega = [e for e in r["etapas"] if not e["etapa"].startswith("correcao")]
    return Execucao(
        tarefa=r["tarefa"],
        variante=r["variante"],
        repeticao=r["repeticao"],
        inicio=r["inicio"],
        pronta_na_entrega=r["pronta_na_entrega"],
        pronta_no_fim=r["pronta_no_fim"],
        correcoes=r["rodadas_de_correcao"],
        obvios_entrega=entrega["obvios"]["passaram"],
        regras_entrega=entrega["regras"]["passaram"],
        obvios_fim=fim["obvios"]["passaram"],
        regras_fim=fim["regras"]["passaram"],
        obvios_total=entrega["obvios"]["total"],
        regras_total=entrega["regras"]["total"],
        regras_que_falharam=[f["nome"] for f in entrega["regras"]["falharam"]],
        originais_ok=not fim["originais"]["falharam"],
        custo=r["custo_tabela_usd"],
        custo_entrega=sum(v["custo_tabela_usd"] for k, v in por_etapa.items() if k not in correcao),
        custo_correcoes=sum(por_etapa[k]["custo_tabela_usd"] for k in correcao),
        minutos=r["relogio_ms"] / 60_000,
        minutos_entrega=sum(e["relogio_ms"] for e in etapas_de_entrega) / 60_000,
        respostas=r["registro"]["total"]["respostas"],
        tokens_saida=r["registro"]["total"]["tokens"]["saida"],
        linhas_escritas=r["medicoes"][-1]["diff"]["linhas_mais"],
        negacoes=sum(e["negacoes"] for e in r["etapas"]),
    )


def ler(pasta: Path = EXECUCOES) -> list[Execucao]:
    """As execuções da pasta, na ordem tarefa, variante, repetição."""
    execucoes = [_de_arquivo(c) for c in pasta.glob("*-[ABC]-[0-9].json")]
    return sorted(execucoes, key=lambda e: (TAREFAS.index(e.tarefa), e.variante, e.repeticao))


def bruto(pasta: Path, nome: str) -> dict:
    """O arquivo de uma execução, inteiro (para o que `Execucao` não traz: modelo, versão, isolamento)."""
    return json.loads((pasta / f"{nome}.json").read_text(encoding="utf-8"))
