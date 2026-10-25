"""Exporta os dados da página e os casos de teste.

uv run python -m rag_sem_misterio                                          # usa as medições já gravadas
uv run --group embeddings python -m rag_sem_misterio --embeddings          # calcula de novo os embeddings
uv run python -m rag_sem_misterio --registro <sessão.jsonl>                # conta de novo as buscas da sessão real
"""

import argparse
from pathlib import Path

from . import embeddings, exportar_site, sessao


def main() -> None:
    argumentos = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    argumentos.add_argument("--embeddings", action="store_true", help="calcula de novo os embeddings (baixa 2,2 GB)")
    argumentos.add_argument(
        "--registro",
        type=Path,
        help="o JSONL de uma sessão do Claude Code (em ~/.claude/projects/), para contar as buscas de novo",
    )
    opcoes = argumentos.parse_args()
    if opcoes.embeddings:
        print(f"calculando os embeddings com {embeddings.MODELO}...")
        embeddings.medir()
    if opcoes.registro:
        print(f"contando as buscas em {opcoes.registro.name}...")
        sessao.gravar(sessao.contar(opcoes.registro))
    print("exportando os dados da página...")
    exportar_site.exportar()


if __name__ == "__main__":
    main()
