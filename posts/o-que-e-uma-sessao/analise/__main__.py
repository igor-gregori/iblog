"""Exporta os dados da página e os casos de teste.

uv run python -m o_que_e_uma_sessao                         # usa a sessão real já extraída
uv run python -m o_que_e_uma_sessao --registro <sessão.jsonl>  # extrai de novo de um registro do Claude Code
"""

import argparse
from pathlib import Path

from . import exportar_site, registro


def main() -> None:
    argumentos = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    argumentos.add_argument(
        "--registro",
        type=Path,
        help="o JSONL de uma sessão do Claude Code (em ~/.claude/projects/), para extrair de novo",
    )
    caminho = argumentos.parse_args().registro
    if caminho:
        print(f"extraindo o uso de tokens de {caminho.name}...")
        registro.gravar(registro.extrair(caminho))
    print("exportando os dados da página...")
    exportar_site.exportar()


if __name__ == "__main__":
    main()
