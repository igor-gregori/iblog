"""Mede as amostras e exporta os dados da página e os casos de teste.

uv run python -m quanto_custa_um_token
"""

from . import exportar_site


def main() -> None:
    print("medindo as amostras e exportando os dados da página...")
    exportar_site.exportar()


if __name__ == "__main__":
    main()
