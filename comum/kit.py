"""O kit de medição dos experimentos da série de IA: roda o Claude Code sem interface nas tarefas de `kit/tarefas` e
guarda os números de cada execução.

Cada execução parte de uma cópia limpa do projeto congelado (`kit/projeto`), feita fora do iblog (para o agente não
ler os `CLAUDE.md` do blog), com um `git init` para medir o diff. Depois que o agente termina, roda os testes
escondidos da tarefa (que ele nunca viu), os testes originais do projeto, o `tsc` e o lint. Se algum teste escondido
falhou, devolve ao agente o nome e a mensagem dos que falharam, como um dev reportando um bug, e mede de novo: no
máximo `RODADAS_DE_CORRECAO` vezes.

Do registro da sessão, só números vão para o resultado; o registro inteiro e a saída do Claude Code ficam na pasta da
execução, fora do repositório.

    uv run python -m comum.kit validar                       # testes escondidos × base e × solução de referência
    uv run python -m comum.kit rodar p-paginacao A 1 --saida <pasta>
    uv run python -m comum.kit lote --saida <pasta>          # todas as combinações que ainda não têm resultado
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import time
import uuid
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from pathlib import Path

from comum.claude_code import ler_registro
from comum.precos import ler_precos

RAIZ = Path(__file__).resolve().parent.parent
KIT = RAIZ / "kit"
PROJETO = KIT / "projeto"
TAREFAS = KIT / "tarefas"
# As cópias do projeto ficam aqui, fora do iblog.
TRABALHO = Path(os.environ.get("IBLOG_KIT_TRABALHO", Path.home() / ".cache" / "iblog-kit"))

TAREFAS_DO_LOTE = ["p-paginacao", "m-cupom", "g-devolucao"]
VARIANTES = {
    "A": "pedido solto",
    "B": "plano antes",
    "C": "especificação completa",
}
REPETICOES = 3
RODADAS_DE_CORRECAO = 2

MODELO = "claude-opus-5-5"
ESFORCO = "medium"
# Uma execução que passa disso é interrompida e fica marcada como estourada.
LIMITE_POR_CHAMADA_S = 40 * 60

# O agente edita arquivos na pasta da cópia (`acceptEdits`) e roda estes comandos sem pedir; o resto que pediria
# permissão é negado (`--permission-prompts none`) e a negação fica contada no resultado.
COMANDOS_LIBERADOS = [
    "Bash(npm *)",
    "Bash(npx *)",
    "Bash(node *)",
    "Bash(git *)",
    "Bash(ls *)",
    "Bash(cat *)",
    "Bash(grep *)",
    "Bash(find *)",
    "Bash(head *)",
    "Bash(tail *)",
    "Bash(wc *)",
    "Bash(sqlite3 *)",
    "Bash(echo *)",
    "Bash(printf *)",
    "Bash(sed *)",
    "Bash(sort *)",
    "Bash(uniq *)",
    "Bash(diff *)",
    "Bash(tr *)",
    "Bash(cut *)",
    "Bash(xargs *)",
    "Bash(pwd)",
    "Bash(mkdir *)",
    "Bash(touch *)",
    "Bash(cp *)",
    "Bash(mv *)",
]
# Busca na web não ajuda nas tarefas e deixaria as execuções menos comparáveis.
FERRAMENTAS_BLOQUEADAS = ["WebSearch", "WebFetch"]

APROVACAO_DO_PLANO = "O plano está aprovado. Pode implementar."


# ---------------------------------------------------------------------------------------------------------------
# A cópia do projeto


def _rodar(
    comando: list[str], pasta: Path, timeout: float = 600, env: dict[str, str] | None = None
) -> subprocess.CompletedProcess:
    return subprocess.run(comando, cwd=pasta, capture_output=True, text=True, timeout=timeout, check=False, env=env)


def ambiente_limpo() -> dict[str, str]:
    """Só o básico do ambiente. Rodado de dentro de outra sessão do Claude Code (como no app), o `claude` herdaria as
    variáveis dela (`CLAUDE_CODE_*`): a autenticação do app, o canal de mensagens, o esforço da sessão."""
    return {chave: os.environ[chave] for chave in ("HOME", "PATH", "USER", "LANG", "SHELL") if chave in os.environ}


class FalhaDoClaude(RuntimeError):
    """O `claude -p` falhou antes de trabalhar (autenticação, limite de uso): a execução não vale e não é gravada."""


def preparar_copia(destino: Path) -> Path:
    """Uma cópia limpa do projeto em `destino`, com as dependências e um commit `base`."""
    if destino.exists():
        shutil.rmtree(destino)
    shutil.copytree(PROJETO, destino, symlinks=True, ignore=shutil.ignore_patterns("*.db"))
    git = ["git", "-c", "user.name=kit", "-c", "user.email=kit@exemplo.com"]
    _rodar(["git", "init", "-q", "-b", "main"], destino).check_returncode()
    _rodar(["git", "add", "-A"], destino).check_returncode()
    _rodar([*git, "commit", "-q", "-m", "base"], destino).check_returncode()
    _rodar(["git", "tag", "base"], destino).check_returncode()
    # Os testes escondidos e os originais entram depois, fora do git, para não aparecer no diff do agente.
    with (destino / ".git" / "info" / "exclude").open("a") as arquivo:
        arquivo.write("teste-oculto/\nteste-original/\n")
    return destino


# ---------------------------------------------------------------------------------------------------------------
# Os testes


def _ler_junit(caminho: Path) -> dict[str, list[dict]]:
    """Os resultados por arquivo de teste (`obvios`, `regras`...), com o nome e a mensagem de cada falha."""
    por_arquivo: dict[str, list[dict]] = {}
    if not caminho.exists() or caminho.stat().st_size == 0:
        return por_arquivo
    for caso in ET.parse(caminho).getroot().iter("testcase"):
        arquivo = Path(caso.get("file", "")).name.removesuffix(".test.ts") or "?"
        falha = caso.find("failure")
        mensagem = _mensagem_da_falha(falha) if falha is not None else ""
        por_arquivo.setdefault(arquivo, []).append(
            {"nome": caso.get("name", ""), "passou": falha is None, "mensagem": mensagem}
        )
    return por_arquivo


def _mensagem_da_falha(falha: ET.Element) -> str:
    """O que um dev contaria ao reportar o erro: a mensagem do `assert`, com o esperado e o obtido.

    A mensagem gerada pelo Node já traz os dois (`201 !== 200`, ou o diff de um objeto). Quando o teste dá uma mensagem
    própria (`assert.equal(status, 400, query)`), ela substitui a gerada, e o esperado e o obtido vêm do resto do
    relatório. Até 25 linhas.
    """
    mensagem = (falha.get("message") or "").strip()
    texto = falha.text or ""
    if "generatedMessage: false" in texto:
        obtido = re.search(r"^\s+actual: (.+?),?$", texto, re.MULTILINE)
        esperado = re.search(r"^\s+expected: (.+?),?$", texto, re.MULTILINE)
        if obtido and esperado and f"{obtido.group(1)} !== {esperado.group(1)}" not in mensagem:
            mensagem += f"\nobtido: {obtido.group(1)}; esperado: {esperado.group(1)}"
    linhas = mensagem.splitlines()
    if len(linhas) > 25:
        linhas = [*linhas[:25], "..."]
    return "\n".join(linhas)


def _resumo(casos: list[dict], esperados: int | None) -> dict:
    passaram = sum(caso["passou"] for caso in casos)
    total = max(len(casos), esperados or 0)
    return {
        "total": total,
        "passaram": passaram,
        "falharam": [{"nome": caso["nome"], "mensagem": caso["mensagem"]} for caso in casos if not caso["passou"]],
    }


def esperados(tarefa: str) -> dict[str, int]:
    """Quantos testes cada grupo tem, contados na solução de referência por `validar`."""
    caminho = TAREFAS / tarefa / "esperado.json"
    return json.loads(caminho.read_text()) if caminho.exists() else {}


def medir_testes(copia: Path, tarefa: str) -> dict:
    """Testes escondidos (por grupo), testes originais do projeto, tipos e lint, na cópia como está agora.

    Os testes entram na cópia só enquanto rodam, e os relatórios ficam fora dela: na rodada de correção, o agente
    não pode encontrar nem os testes escondidos nem o resultado deles (no piloto, um agente achou o relatório).
    """
    try:
        return _medir_testes(copia, tarefa)
    finally:
        for pasta in ("teste-oculto", "teste-original"):
            shutil.rmtree(copia / pasta, ignore_errors=True)


def _medir_testes(copia: Path, tarefa: str) -> dict:
    relatorios = copia.parent / "relatorios"
    relatorios.mkdir(exist_ok=True)
    oculto = copia / "teste-oculto"
    oculto.mkdir()
    shutil.copy(TAREFAS / "ajuda.ts", oculto / "ajuda.ts")
    for arquivo in (TAREFAS / tarefa / "testes").glob("*.test.ts"):
        shutil.copy(arquivo, oculto / arquivo.name)
    # Os testes do projeto como eram antes do agente: ele pode ter mudado os de `test/`.
    shutil.copytree(PROJETO / "test", copia / "teste-original")

    resultado: dict = {}
    contagem = esperados(tarefa)
    for pasta, grupos in (("teste-oculto", ["obvios", "regras"]), ("teste-original", None)):
        junit = relatorios / f"{pasta}.xml"
        junit.unlink(missing_ok=True)
        _rodar(
            [
                "node",
                "--test",
                "--test-reporter=junit",
                f"--test-reporter-destination={junit}",
                f"{pasta}/*.test.ts",
            ],
            copia,
        )
        por_arquivo = _ler_junit(junit)
        if grupos:
            for grupo in grupos:
                resultado[grupo] = _resumo(por_arquivo.get(grupo, []), contagem.get(grupo))
        else:
            casos = [caso for lista in por_arquivo.values() for caso in lista]
            resultado["originais"] = _resumo(casos, contagem.get("originais"))
    resultado["tipos_ok"] = _rodar(["npx", "tsc", "--noEmit"], copia).returncode == 0
    resultado["lint_ok"] = _rodar(["npx", "oxlint", "src", "test"], copia).returncode == 0
    resultado["testes_do_agente_ok"] = _rodar(["npm", "test"], copia).returncode == 0
    return resultado


def tudo_certo(testes: dict) -> bool:
    return all(not testes[grupo]["falharam"] and testes[grupo]["passaram"] > 0 for grupo in ("obvios", "regras"))


def medir_diff(copia: Path) -> dict:
    _rodar(["git", "add", "-A"], copia)
    numstat = _rodar(["git", "diff", "--cached", "--numstat", "base"], copia).stdout
    arquivos, mais, menos = 0, 0, 0
    for linha in numstat.splitlines():
        a, r, _ = linha.split("\t", 2)
        arquivos += 1
        mais += int(a) if a.isdigit() else 0
        menos += int(r) if r.isdigit() else 0
    return {"arquivos": arquivos, "linhas_mais": mais, "linhas_menos": menos}


def texto_do_diff(copia: Path) -> str:
    _rodar(["git", "add", "-A"], copia)
    return _rodar(["git", "diff", "--cached", "base"], copia).stdout


# ---------------------------------------------------------------------------------------------------------------
# O Claude Code


def _comando_claude(mensagem: str, sessao: str, modo: str, retomar: bool) -> list[str]:
    comando = [
        "claude",
        "-p",
        mensagem,
        "--model",
        MODELO,
        "--effort",
        ESFORCO,
        "--output-format",
        "stream-json",
        "--verbose",
        "--permission-mode",
        modo,
        "--permission-prompts",
        "none",
        "--setting-sources",
        "project",
        "--strict-mcp-config",
        "--allowedTools",
        *COMANDOS_LIBERADOS,
        "--disallowedTools",
        *FERRAMENTAS_BLOQUEADAS,
    ]
    comando += ["--resume", sessao] if retomar else ["--session-id", sessao]
    return comando


def chamar_claude(copia: Path, mensagem: str, sessao: str, modo: str, retomar: bool, log: Path, etapa: str) -> dict:
    """Uma chamada ao `claude -p`. Guarda a saída inteira em `log` e devolve os números do evento `result`."""
    comeco = datetime.now(UTC)
    inicio = time.monotonic()
    try:
        processo = _rodar(
            _comando_claude(mensagem, sessao, modo, retomar), copia, timeout=LIMITE_POR_CHAMADA_S, env=ambiente_limpo()
        )
        saida, estourou = processo.stdout, False
    except subprocess.TimeoutExpired as erro:
        saida = erro.stdout.decode() if isinstance(erro.stdout, bytes) else (erro.stdout or "")
        estourou = True
    relogio_ms = round((time.monotonic() - inicio) * 1000)
    fim = datetime.now(UTC)
    with log.open("a", encoding="utf-8") as arquivo:
        arquivo.write(json.dumps({"etapa": etapa, "comando_modo": modo}) + "\n")
        arquivo.write(saida)

    eventos = []
    for linha in saida.splitlines():
        try:
            eventos.append(json.loads(linha))
        except json.JSONDecodeError:
            continue
    inicio_evento = next((e for e in eventos if e.get("type") == "system" and e.get("subtype") == "init"), {})
    resultado = next((e for e in reversed(eventos) if e.get("type") == "result"), {})
    # Qualquer erro (autenticação, limite de uso) invalida a execução: o lote para e ela é refeita depois.
    if not estourou and (not resultado or resultado.get("is_error")):
        raise FalhaDoClaude(f"{etapa}: {resultado.get('result') or processo.stderr.strip()[:500]}")
    return {
        "etapa": etapa,
        "modo": modo,
        "comeco": comeco.isoformat(),
        "fim": fim.isoformat(),
        "relogio_ms": relogio_ms,
        "estourou": estourou,
        "erro": bool(resultado.get("is_error")) or not resultado,
        "subtipo": resultado.get("subtype"),
        "duracao_ms": resultado.get("duration_ms"),
        "duracao_api_ms": resultado.get("duration_api_ms"),
        "turnos": resultado.get("num_turns"),
        # O evento `result` de uma sessão retomada traz o uso da sessão inteira até ali, não só desta chamada.
        "custo_acumulado_usd": resultado.get("total_cost_usd"),
        "por_modelo_acumulado": resultado.get("modelUsage", {}),
        "negacoes": len(resultado.get("permission_denials") or []),
        # Para conferir o isolamento: o que estava carregado na sessão (só contagens e nomes de ferramentas comuns).
        "carregado": {
            "modelo": inicio_evento.get("model"),
            "versao": inicio_evento.get("claude_code_version"),
            "ferramentas": len(inicio_evento.get("tools") or []),
            "servidores_mcp": len(inicio_evento.get("mcp_servers") or []),
            "skills": len(inicio_evento.get("skills") or []),
            "plugins": len(inicio_evento.get("plugins") or []),
            "comandos": len(inicio_evento.get("slash_commands") or []),
        },
    }


def registro_da_sessao(sessao: str) -> Path | None:
    achados = list((Path.home() / ".claude" / "projects").glob(f"*/{sessao}.jsonl"))
    return achados[0] if achados else None


def _respostas(caminho: Path) -> list[dict]:
    """Todas as respostas do modelo no registro e nos dos subagentes, uma por `id`, com o instante e o uso."""
    arquivos = [caminho, *sorted((caminho.parent / caminho.stem / "subagents").glob("*.jsonl"))]
    respostas: dict[str, dict] = {}
    for arquivo in arquivos:
        for linha in arquivo.read_text(encoding="utf-8").splitlines():
            try:
                registro = json.loads(linha)
            except json.JSONDecodeError:
                continue
            mensagem = registro.get("message")
            if registro.get("type") != "assistant" or not isinstance(mensagem, dict) or "usage" not in mensagem:
                continue
            if mensagem.get("model") == "<synthetic>":
                continue
            respostas[mensagem["id"]] = {
                "instante": datetime.fromisoformat(registro["timestamp"]),
                "modelo": mensagem["model"],
                "uso": mensagem["usage"],
                "subagente": bool(registro.get("isSidechain")) or arquivo != caminho,
            }
    return list(respostas.values())


def custo_da_resposta(modelo: str, uso: dict, precos: dict) -> float:
    """O custo em dólares de uma resposta, pelos preços de `comum/precos.csv`, separando a gravação no cache de 5
    minutos da de 1 hora (o Claude Code na assinatura grava com prazo de 1 hora)."""
    preco = precos.get(modelo) or next((p for m, p in precos.items() if modelo.startswith(m)), None)
    if preco is None:
        return 0.0
    gravado = uso.get("cache_creation_input_tokens", 0)
    uma_hora = (uso.get("cache_creation") or {}).get("ephemeral_1h_input_tokens", 0)
    return (
        uso.get("input_tokens", 0) * preco.entrada
        + uso.get("cache_read_input_tokens", 0) * preco.entrada_cache
        + (gravado - uma_hora) * preco.gravacao_cache
        + uma_hora * (preco.gravacao_cache_longa or preco.gravacao_cache)
        + uso.get("output_tokens", 0) * preco.saida
    ) / 1_000_000


def _somar(respostas: list[dict], precos: dict) -> dict:
    tokens = {"entrada": 0, "cache_lido": 0, "cache_gravado": 0, "saida": 0}
    for resposta in respostas:
        uso = resposta["uso"]
        tokens["entrada"] += uso.get("input_tokens", 0)
        tokens["cache_lido"] += uso.get("cache_read_input_tokens", 0)
        tokens["cache_gravado"] += uso.get("cache_creation_input_tokens", 0)
        tokens["saida"] += uso.get("output_tokens", 0)
    return {
        "respostas": len(respostas),
        "tokens": tokens,
        "custo_tabela_usd": round(sum(custo_da_resposta(r["modelo"], r["uso"], precos) for r in respostas), 4),
    }


def numeros_do_registro(sessao: str, etapas: list[dict]) -> dict:
    """Tokens e custo pela tabela, da sessão inteira (com subagentes) e de cada etapa, lidos do registro da sessão.

    O registro é a fonte dos tokens: o evento `result` acumula a sessão a cada retomada e não separa as etapas.
    """
    caminho = registro_da_sessao(sessao)
    if caminho is None:
        return {}
    precos = {preco.modelo: preco for preco in ler_precos()}
    respostas = _respostas(caminho)
    por_etapa = {}
    for etapa in etapas:
        comeco, fim = datetime.fromisoformat(etapa["comeco"]), datetime.fromisoformat(etapa["fim"])
        por_etapa[etapa["etapa"]] = _somar([r for r in respostas if comeco <= r["instante"] <= fim], precos)
    principal = ler_registro(caminho)
    return {
        "total": _somar(respostas, precos),
        "por_etapa": por_etapa,
        "por_modelo": {
            modelo: _somar([r for r in respostas if r["modelo"] == modelo], precos)
            for modelo in sorted({r["modelo"] for r in respostas})
        },
        "chamadas_principais": len(principal),
        "respostas_de_subagentes": sum(r["subagente"] for r in respostas),
        "maior_contexto": max(
            (
                c.uso.get("input_tokens", 0)
                + c.uso.get("cache_read_input_tokens", 0)
                + c.uso.get("cache_creation_input_tokens", 0)
                for c in principal
            ),
            default=0,
        ),
    }


# ---------------------------------------------------------------------------------------------------------------
# Uma execução


def mensagem_inicial(tarefa: str, variante: str) -> str:
    pedido = (TAREFAS / tarefa / "pedido.md").read_text(encoding="utf-8").strip()
    if variante == "C":
        spec = (TAREFAS / tarefa / "spec.md").read_text(encoding="utf-8").strip()
        return f"{pedido}\n\nSiga esta especificação:\n\n{spec}"
    return pedido


def mensagem_de_correcao(testes: dict) -> str:
    """Como um dev reportaria: o nome de cada caso que falhou e o esperado e o obtido.

    Até 06/11/2026 (primeiro lote) ia só a primeira linha da mensagem, quase sempre "Expected values to be strictly
    equal:", sem dizer o que estava errado.
    """
    falhas = [falha for grupo in ("obvios", "regras") for falha in testes[grupo]["falharam"]]
    blocos = "\n\n".join(f"- {falha['nome']}\n\n```\n{falha['mensagem']}\n```" for falha in falhas)
    return f"Testei aqui e estes casos falharam:\n\n{blocos}\n\nPode corrigir?"


def nome_da_execucao(tarefa: str, variante: str, repeticao: int) -> str:
    return f"{tarefa}-{variante}-{repeticao}"


def rodar(tarefa: str, variante: str, repeticao: int, saida: Path) -> dict:
    nome = nome_da_execucao(tarefa, variante, repeticao)
    pasta = TRABALHO / nome
    copia = preparar_copia(pasta / "projeto")
    log = pasta / "claude.jsonl"
    log.unlink(missing_ok=True)
    sessao = str(uuid.uuid4())
    inicio = datetime.now(UTC)
    print(f"[{nome}] sessão {sessao}, cópia em {copia}", flush=True)

    etapas = []
    if variante == "B":
        etapas.append(chamar_claude(copia, mensagem_inicial(tarefa, variante), sessao, "plan", False, log, "plano"))
        etapas.append(chamar_claude(copia, APROVACAO_DO_PLANO, sessao, "acceptEdits", True, log, "implementacao"))
    else:
        etapas.append(
            chamar_claude(copia, mensagem_inicial(tarefa, variante), sessao, "acceptEdits", False, log, "implementacao")
        )

    medicoes = [{"depois_de": "entrega", "testes": medir_testes(copia, tarefa), "diff": medir_diff(copia)}]
    (pasta / "entrega.diff").write_text(texto_do_diff(copia), encoding="utf-8")
    for rodada in range(1, RODADAS_DE_CORRECAO + 1):
        if tudo_certo(medicoes[-1]["testes"]) or etapas[-1]["estourou"]:
            break
        etapa = f"correcao{rodada}"
        etapas.append(
            chamar_claude(copia, mensagem_de_correcao(medicoes[-1]["testes"]), sessao, "acceptEdits", True, log, etapa)
        )
        medicoes.append({"depois_de": etapa, "testes": medir_testes(copia, tarefa), "diff": medir_diff(copia)})

    registro = numeros_do_registro(sessao, etapas)
    resultado = {
        "tarefa": tarefa,
        "variante": variante,
        "repeticao": repeticao,
        "modelo": MODELO,
        "esforco": ESFORCO,
        "inicio": inicio.isoformat(timespec="seconds"),
        "etapas": etapas,
        "medicoes": medicoes,
        "rodadas_de_correcao": len(medicoes) - 1,
        "pronta_na_entrega": tudo_certo(medicoes[0]["testes"]),
        "pronta_no_fim": tudo_certo(medicoes[-1]["testes"]),
        "relogio_ms": sum(etapa["relogio_ms"] for etapa in etapas),
        "custo_tabela_usd": registro.get("total", {}).get("custo_tabela_usd"),
        # O custo que o próprio Claude Code calcula, para conferir: o da última etapa já é o da sessão inteira.
        "custo_informado_usd": etapas[-1]["custo_acumulado_usd"],
        "registro": registro,
    }
    saida.mkdir(parents=True, exist_ok=True)
    (saida / f"{nome}.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (saida / f"{nome}.diff").write_text(texto_do_diff(copia), encoding="utf-8")
    print(
        f"[{nome}] pronta na entrega: {resultado['pronta_na_entrega']}, no fim: {resultado['pronta_no_fim']}, "
        f"US$ {resultado['custo_tabela_usd'] or 0:.2f}, {resultado['relogio_ms'] / 60000:.1f} min",
        flush=True,
    )
    return resultado


# ---------------------------------------------------------------------------------------------------------------
# Validação das tarefas, sem o agente


def validar() -> bool:
    """Os testes escondidos precisam falhar no projeto como está e passar todos com a solução de referência."""
    tudo_ok = True
    for tarefa in TAREFAS_DO_LOTE:
        copia = preparar_copia(TRABALHO / "validacao" / tarefa)
        antes = medir_testes(copia, tarefa)
        aplicar = _rodar(["git", "apply", str(TAREFAS / tarefa / "referencia.patch")], copia)
        if aplicar.returncode != 0:
            print(f"{tarefa}: a referência não aplica: {aplicar.stderr}")
            tudo_ok = False
            continue
        depois = medir_testes(copia, tarefa)
        contagem = {grupo: depois[grupo]["total"] for grupo in ("obvios", "regras", "originais")}
        (TAREFAS / tarefa / "esperado.json").write_text(json.dumps(contagem, indent=2) + "\n")
        ok = (
            tudo_certo(depois)
            and not depois["originais"]["falharam"]
            and depois["tipos_ok"]
            and depois["lint_ok"]
            and antes["obvios"]["passaram"] == 0
            and antes["regras"]["passaram"] == 0
        )
        tudo_ok &= ok
        print(
            f"{tarefa}: {'ok' if ok else 'FALHOU'}  "
            f"base: óbvios {antes['obvios']['passaram']}/{antes['obvios']['total']}, "
            f"regras {antes['regras']['passaram']}/{antes['regras']['total']}  "
            f"referência: óbvios {depois['obvios']['passaram']}/{depois['obvios']['total']}, "
            f"regras {depois['regras']['passaram']}/{depois['regras']['total']}, "
            f"originais {depois['originais']['passaram']}/{depois['originais']['total']}, "
            f"tipos {depois['tipos_ok']}, lint {depois['lint_ok']}"
        )
    return tudo_ok


def main() -> None:
    argumentos = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    comandos = argumentos.add_subparsers(dest="comando", required=True)
    comandos.add_parser("validar", help="confere os testes escondidos contra a base e a referência")
    um = comandos.add_parser("rodar", help="uma execução")
    um.add_argument("tarefa", choices=TAREFAS_DO_LOTE)
    um.add_argument("variante", choices=list(VARIANTES))
    um.add_argument("repeticao", type=int)
    um.add_argument("--saida", type=Path, required=True)
    lote = comandos.add_parser("lote", help="todas as combinações que ainda não têm resultado em --saida")
    lote.add_argument("--saida", type=Path, required=True)
    lote.add_argument("--tarefas", nargs="+", default=TAREFAS_DO_LOTE, choices=TAREFAS_DO_LOTE)
    lote.add_argument("--variantes", nargs="+", default=list(VARIANTES), choices=list(VARIANTES))
    lote.add_argument("--repeticoes", type=int, default=REPETICOES)
    args = argumentos.parse_args()

    if args.comando == "validar":
        raise SystemExit(0 if validar() else 1)
    if args.comando == "rodar":
        rodar(args.tarefa, args.variante, args.repeticao, args.saida)
        return
    # As repetições vêm por fora, para que um lote interrompido tenha uma rodada de cada combinação antes da segunda.
    for repeticao in range(1, args.repeticoes + 1):
        for tarefa in args.tarefas:
            for variante in args.variantes:
                if (args.saida / f"{nome_da_execucao(tarefa, variante, repeticao)}.json").exists():
                    continue
                rodar(tarefa, variante, repeticao, args.saida)


if __name__ == "__main__":
    main()
