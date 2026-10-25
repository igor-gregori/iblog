"""Como o agente procurou nos arquivos na sessão real dos posts 4 e 5.

O Claude Code não tem índice de embeddings: quando precisa achar algo no projeto, o modelo pede um comando (`grep`,
`find`, `ls`) ou lê um arquivo. Aqui se conta isso no registro da sessão. Do registro só saem números: quantas
vezes cada ferramenta foi pedida e quantos comandos de terminal usaram um programa de busca.
"""

import json
import re
from collections import Counter
from pathlib import Path

from comum.claude_code import ler_registro

from .caminhos import SESSAO

# Os programas de terminal que procuram arquivos ou texto.
PROGRAMAS_DE_BUSCA = ("grep", "rg", "find", "ls")
# Um programa no começo de um comando: no início, depois de `|`, `;`, `&&` ou `(`, ou depois de `xargs`.
PROGRAMA = re.compile(r"(?:^|[|;&(]\s*|\bxargs\s+)([a-z0-9_.-]+)\b", re.MULTILINE)


def contar(jsonl: Path) -> dict:
    chamadas = ler_registro(jsonl)
    pedidos = [bloco for c in chamadas for bloco in c.resposta if bloco.get("type") == "tool_use"]
    ferramentas = Counter(p["name"] for p in pedidos)
    comandos = [p["input"].get("command", "") for p in pedidos if p["name"] == "Bash"]
    com_busca = sum(1 for c in comandos if set(PROGRAMA.findall(c)) & set(PROGRAMAS_DE_BUSCA))
    return {
        "chamadas": len(chamadas),
        "ferramentas": dict(ferramentas.most_common()),
        "comandos": len(comandos),
        "comandos_com_busca": com_busca,
    }


def gravar(numeros: dict) -> None:
    SESSAO.write_text(json.dumps(numeros, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def ler() -> dict:
    return json.loads(SESSAO.read_text(encoding="utf-8"))
