"""Exporta os dados da página e os casos de teste.

uv run python -m memoria_de_ia                            # usa o que já foi medido
uv run python -m memoria_de_ia --registro <sessão.jsonl>  # mede de novo a memória numa sessão do Claude Code
uv run python -m memoria_de_ia --historico                # mede de novo os CLAUDE.md no histórico do git
uv run python -m memoria_de_ia --automatica               # conta de novo a memória automática desta máquina
"""

import argparse
from pathlib import Path

from . import automatica, exportar_site, historico, sessao


def main() -> None:
    argumentos = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    argumentos.add_argument(
        "--registro",
        type=Path,
        help="o JSONL de uma sessão do Claude Code (em ~/.claude/projects/), para medir de novo",
    )
    argumentos.add_argument("--historico", action="store_true", help="mede de novo os CLAUDE.md pelo git")
    argumentos.add_argument(
        "--automatica", action="store_true", help="conta de novo as memórias em ~/.claude/projects/*/memory/"
    )
    pedido = argumentos.parse_args()
    if pedido.registro:
        print(f"medindo a memória em {pedido.registro.name}...")
        sessao.gravar(*sessao.extrair(pedido.registro))
    if pedido.historico:
        print("medindo os CLAUDE.md no histórico do git...")
        historico.gravar(historico.medir())
    if pedido.automatica:
        print("contando a memória automática...")
        automatica.gravar(automatica.medir())
    print("exportando os dados da página...")
    exportar_site.exportar()


if __name__ == "__main__":
    main()
