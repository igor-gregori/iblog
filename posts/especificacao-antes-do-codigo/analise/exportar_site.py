"""Gera `pagina/dados.json`, o que a página consome: as execuções, o resumo por tarefa e jeito de pedir, as regras que
cada jeito errou e os textos dos pedidos.

A página só mostra estes números; nenhuma conta é refeita em TypeScript.
"""

import json
import re
import statistics
import textwrap
from dataclasses import asdict

from comum.precos import ler_precos

from . import execucoes as ex
from .caminhos import EXECUCOES, PAGINA, PRIMEIRO_LOTE, TAREFAS
from .regras import CLASSIFICACAO, TIPOS

# O dia em que a documentação do Kiro, do Spec Kit e do modo de plano do Claude Code foi conferida.
DOCUMENTACAO_CONFERIDA_EM = "2026-11-07"

# O dia em que os preços da tabela comum foram conferidos nas páginas dos fornecedores.
PRECOS_CONSULTADOS_EM = "2026-10-22"

NOMES_DAS_TAREFAS = {
    "p-paginacao": ("Paginação e filtros", "pequena"),
    "m-cupom": ("Cupom de desconto", "média"),
    "g-devolucao": ("Cancelamento e devolução", "grande"),
}
NOMES_DAS_VARIANTES = {
    "A": "Pedido solto",
    "B": "Plano antes",
    "C": "Especificação",
}


def _palavras(texto: str) -> int:
    return len(re.findall(r"\w+", texto))


def _secao(markdown: str, titulo: str) -> str:
    """O texto de uma seção `### ...` da especificação, sem o título e sem os critérios de aceitação."""
    inicio = markdown.index(titulo) + len(titulo)
    resto = markdown[inicio:]
    fim = min(i for i in (resto.find("\n###"), resto.find("\n**Critérios"), resto.find("\n## ")) if i >= 0)
    return resto[:fim].strip()


def _quebrar(markdown: str, largura: int = 76) -> str:
    """Quebra de novo uma lista em markdown na largura da caixa de código da página (o arquivo usa 120 colunas)."""
    itens = re.split(r"\n(?=- )", markdown.strip())
    return "\n".join(textwrap.fill(" ".join(item.split()), width=largura, subsequent_indent="  ") for item in itens)


def _tarefas() -> list[dict]:
    lista = []
    for tarefa in ex.TAREFAS:
        pasta = TAREFAS / tarefa
        pedido = (pasta / "pedido.md").read_text(encoding="utf-8").strip()
        spec = (pasta / "spec.md").read_text(encoding="utf-8").strip()
        esperado = json.loads((pasta / "esperado.json").read_text(encoding="utf-8"))
        referencia = (pasta / "referencia.patch").read_text(encoding="utf-8")
        nome, tamanho = NOMES_DAS_TAREFAS[tarefa]
        lista.append(
            {
                "id": tarefa,
                "nome": nome,
                "tamanho": tamanho,
                # O pedido em uma linha só: no arquivo ele está quebrado em 120 colunas.
                "pedido": " ".join(pedido.split()),
                "palavras_pedido": _palavras(pedido),
                "palavras_spec": _palavras(spec),
                "testes_obvios": esperado["obvios"],
                "testes_regras": esperado["regras"],
                "linhas_referencia": sum(
                    1 for linha in referencia.splitlines() if linha.startswith("+") and not linha.startswith("+++")
                ),
            }
        )
    return lista


def _resumo(lista: list[ex.Execucao]) -> list[dict]:
    media = statistics.mean
    resumo = []
    for tarefa in ex.TAREFAS:
        for variante in ex.VARIANTES:
            grupo = [e for e in lista if e.tarefa == tarefa and e.variante == variante]
            resumo.append(
                {
                    "tarefa": tarefa,
                    "variante": variante,
                    "execucoes": len(grupo),
                    "prontas_na_entrega": sum(e.pronta_na_entrega for e in grupo),
                    "prontas_no_fim": sum(e.pronta_no_fim for e in grupo),
                    "obvios_na_entrega": media(e.obvios_entrega / e.obvios_total for e in grupo),
                    "regras_na_entrega": media(e.regras_entrega / e.regras_total for e in grupo),
                    "correcoes": [e.correcoes for e in grupo],
                    "custo": media(e.custo for e in grupo),
                    "custo_minimo": min(e.custo for e in grupo),
                    "custo_maximo": max(e.custo for e in grupo),
                    "custo_entrega": media(e.custo_entrega for e in grupo),
                    "custo_correcoes": media(e.custo_correcoes for e in grupo),
                    "minutos": media(e.minutos for e in grupo),
                    "minutos_entrega": media(e.minutos_entrega for e in grupo),
                    "respostas": media(e.respostas for e in grupo),
                }
            )
    return resumo


def _regras(lista: list[ex.Execucao]) -> list[dict]:
    regras = []
    for tarefa, testes in CLASSIFICACAO.items():
        for nome, tipo in testes.items():
            falhas = {
                variante: sum(
                    nome in e.regras_que_falharam for e in lista if e.tarefa == tarefa and e.variante == variante
                )
                for variante in ex.VARIANTES
            }
            regras.append({"tarefa": tarefa, "nome": nome, "tipo": tipo, "falhas": falhas})
    return regras


def _tipos(regras: list[dict], lista: list[ex.Execucao]) -> list[dict]:
    """Para cada tipo de regra, quantas vezes A e B (juntos) erraram, de quantas chances."""
    por_tarefa = {t: sum(1 for e in lista if e.tarefa == t and e.variante in "AB") for t in ex.TAREFAS}
    tipos = []
    for tipo, nome in TIPOS.items():
        do_tipo = [r for r in regras if r["tipo"] == tipo]
        tipos.append(
            {
                "id": tipo,
                "nome": nome,
                "testes": len(do_tipo),
                "falhas_ab": sum(r["falhas"]["A"] + r["falhas"]["B"] for r in do_tipo),
                "chances_ab": sum(por_tarefa[r["tarefa"]] for r in do_tipo),
                "falhas_c": sum(r["falhas"]["C"] for r in do_tipo),
            }
        )
    return tipos


def _primeiro_lote() -> list[dict]:
    lista = ex.ler(PRIMEIRO_LOTE)
    return [
        {
            "tarefa": tarefa,
            "variante": variante,
            "prontas_na_entrega": sum(
                e.pronta_na_entrega for e in lista if (e.tarefa, e.variante) == (tarefa, variante)
            ),
            "prontas_no_fim": sum(e.pronta_no_fim for e in lista if (e.tarefa, e.variante) == (tarefa, variante)),
        }
        for tarefa in ex.TAREFAS
        for variante in "AB"
    ]


def _isolamento(lista: list[ex.Execucao]) -> dict:
    brutos = [ex.bruto(EXECUCOES, f"{e.tarefa}-{e.variante}-{e.repeticao}") for e in lista]
    etapas = [etapa for b in brutos for etapa in b["etapas"]]
    return {
        "versoes": sorted({etapa["carregado"]["versao"] for etapa in etapas}),
        "servidores_mcp": max(etapa["carregado"]["servidores_mcp"] for etapa in etapas),
        "respostas_de_subagentes": sum(b["registro"]["respostas_de_subagentes"] for b in brutos),
        "estouros": sum(etapa["estourou"] for etapa in etapas),
        "negacoes": sum(e.negacoes for e in lista),
        "regressoes": sum(not e.originais_ok for e in lista),
    }


def exportar() -> None:
    lista = ex.ler()
    precos = {preco.modelo: preco for preco in ler_precos()}
    modelo = ex.bruto(EXECUCOES, "p-paginacao-A-1")["modelo"]
    esforco = ex.bruto(EXECUCOES, "p-paginacao-A-1")["esforco"]
    spec_do_cupom = (TAREFAS / "m-cupom" / "spec.md").read_text(encoding="utf-8")
    regras = _regras(lista)
    dados = {
        "documentacao_conferida_em": DOCUMENTACAO_CONFERIDA_EM,
        "precos_consultados_em": PRECOS_CONSULTADOS_EM,
        "modelo": {"id": modelo, "nome": precos[modelo].nome},
        "esforco": esforco,
        "preco": asdict(precos[modelo]),
        "periodo": {"inicio": min(e.inicio for e in lista), "fim": max(e.inicio for e in lista)},
        "total": {
            "execucoes": len(lista),
            "custo": sum(e.custo for e in lista),
            "minutos": sum(e.minutos for e in lista),
        },
        "tarefas": _tarefas(),
        "variantes": [{"id": v, "nome": NOMES_DAS_VARIANTES[v]} for v in ex.VARIANTES],
        "resumo": _resumo(lista),
        "regras": regras,
        "tipos": _tipos(regras, lista),
        "primeiro_lote": _primeiro_lote(),
        "isolamento": _isolamento(lista),
        "trecho_da_spec": _quebrar(_secao(spec_do_cupom, "### 3. A conta do desconto")),
        "execucoes": [asdict(e) for e in lista],
    }
    PAGINA.mkdir(parents=True, exist_ok=True)
    (PAGINA / "dados.json").write_text(json.dumps(dados, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
