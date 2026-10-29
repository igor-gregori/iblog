"""O tamanho dos CLAUDE.md deste blog ao longo do tempo, pelo histórico do git.

O CLAUDE.md da raiz entra em toda sessão; o de cada post, só quando o agente mexe na pasta dele. Para cada dia em que
algum deles mudou, fica o último commit do dia, com as linhas e os tokens (`o200k_base`) do da raiz e a soma dos dos
posts. O histórico vai até `ATE`, o último commit antes deste post, para os números não mudarem a cada commit novo.
"""

import csv
import subprocess
from dataclasses import astuple, dataclass, fields

from comum.tokens import contar

from .caminhos import HISTORICO, REPOSITORIO

ATE = "c8f0d71"  # o merge do post 7 na main, em 25/10/2026


@dataclass(frozen=True)
class Dia:
    data: str  # AAAA-MM-DD
    commit: str
    raiz_linhas: int
    raiz_texto: int  # tokens do o200k_base
    posts: int  # quantos posts tinham CLAUDE.md
    posts_texto: int  # a soma dos tokens dos CLAUDE.md dos posts


def _git(*argumentos: str) -> str:
    return subprocess.run(["git", *argumentos], cwd=REPOSITORIO, capture_output=True, text=True, check=True).stdout


def medir() -> list[Dia]:
    commits = _git("log", "--reverse", "--format=%h %ad", "--date=short", ATE, "--", "CLAUDE.md", "posts/*/CLAUDE.md")
    por_dia: dict[str, Dia] = {}
    for linha in commits.splitlines():
        commit, data = linha.split()
        arquivos = [a for a in _git("ls-tree", "-r", "--name-only", commit).splitlines() if a.endswith("CLAUDE.md")]
        if "CLAUDE.md" not in arquivos:
            continue
        raiz = _git("show", f"{commit}:CLAUDE.md")
        # Só os de `posts/<slug>/CLAUDE.md`: o corpus do post 7 tem cópias com outros nomes que terminam igual.
        dos_posts = [a for a in arquivos if a.startswith("posts/") and a.count("/") == 2]
        por_dia[data] = Dia(
            data=data,
            commit=commit,
            raiz_linhas=len(raiz.splitlines()),
            raiz_texto=contar(raiz),
            posts=len(dos_posts),
            posts_texto=sum(contar(_git("show", f"{commit}:{a}")) for a in dos_posts),
        )
    return list(por_dia.values())


def gravar(dias: list[Dia]) -> None:
    with open(HISTORICO, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.writer(arquivo, lineterminator="\n")
        escritor.writerow([campo.name for campo in fields(Dia)])
        escritor.writerows(astuple(dia) for dia in dias)


def ler() -> list[Dia]:
    with open(HISTORICO, encoding="utf-8") as arquivo:
        return [
            Dia(
                d["data"],
                d["commit"],
                int(d["raiz_linhas"]),
                int(d["raiz_texto"]),
                int(d["posts"]),
                int(d["posts_texto"]),
            )
            for d in csv.DictReader(arquivo)
        ]
