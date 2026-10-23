"""Exporta os dados da página e os casos de teste.

uv run python -m janela_de_contexto                            # usa a composição já medida
uv run python -m janela_de_contexto --registro <sessão.jsonl>  # mede de novo a partir de um registro do Claude Code
"""

import argparse
from pathlib import Path

from . import composicao, exportar_site


def main() -> None:
    argumentos = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    argumentos.add_argument(
        "--registro",
        type=Path,
        help="o JSONL de uma sessão do Claude Code (em ~/.claude/projects/), para medir de novo",
    )
    caminho = argumentos.parse_args().registro
    if caminho:
        print(f"medindo o que enche o contexto em {caminho.name}...")
        composicao.gravar(*composicao.extrair(caminho))
    print("exportando os dados da página...")
    exportar_site.exportar()


if __name__ == "__main__":
    main()
