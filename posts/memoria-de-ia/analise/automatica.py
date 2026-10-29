"""O que a memória automática do Claude Code guardou nesta máquina.

Com a memória automática ligada, o próprio agente escreve notas em `~/.claude/projects/<projeto>/memory/`: um arquivo
por memória, com o tipo no cabeçalho (`user`, `feedback`, `project` ou `reference`), e um índice, o `MEMORY.md`, que
entra no começo de toda sessão daquele projeto. Aqui se contam as pastas, as memórias por tipo e o tamanho dos
índices. Nenhum nome de arquivo nem texto sai daqui: as memórias falam de outros projetos.
"""

import json
import re
from collections import Counter
from datetime import date
from pathlib import Path
from statistics import median

from .caminhos import AUTOMATICA

PROJETOS = Path.home() / ".claude" / "projects"
# As pastas deste blog: ele mudou de lugar na máquina, e cada lugar tem a sua.
DESTE_BLOG = ("-home-igor-iblog", "-home-igor-projects-iblog")
TIPO = re.compile(r"^\s*type:\s*(\w+)", re.MULTILINE)


def medir(pasta: Path = PROJETOS) -> dict:
    projetos = sorted(p for p in pasta.iterdir() if p.is_dir())
    com_pasta = [p for p in projetos if (p / "memory").is_dir()]
    tipos: Counter = Counter()
    indices, memorias, com_memorias = [], [], 0
    deste_blog = 0
    for projeto in com_pasta:
        arquivos = [a for a in (projeto / "memory").glob("*.md") if a.name != "MEMORY.md"]
        indice = projeto / "memory" / "MEMORY.md"
        if indice.exists():
            indices.append(indice.stat().st_size)
        com_memorias += bool(arquivos)
        if projeto.name in DESTE_BLOG:
            deste_blog += len(arquivos)
        for arquivo in arquivos:
            texto = arquivo.read_text(encoding="utf-8")
            achado = TIPO.search(texto)
            tipos[achado.group(1) if achado else "sem tipo"] += 1
            memorias.append(len(texto.encode("utf-8")))
    return {
        "conferido_em": date.today().isoformat(),
        "projetos": len(projetos),
        "com_pasta": len(com_pasta),
        "com_memorias": com_memorias,
        "memorias": len(memorias),
        "por_tipo": dict(tipos.most_common()),
        "memoria_mediana": round(median(memorias)) if memorias else 0,
        "indice_mediano": round(median(indices)) if indices else 0,
        "indice_maior": max(indices, default=0),
        "deste_blog": deste_blog,
    }


def gravar(numeros: dict) -> None:
    AUTOMATICA.write_text(json.dumps(numeros, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def ler() -> dict:
    return json.loads(AUTOMATICA.read_text(encoding="utf-8"))
