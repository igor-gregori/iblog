"""Exporta os dados da página a partir das execuções do kit de medição.

uv run python -m especificacao_antes_do_codigo   # gera pagina/dados.json a partir de dados/execucoes/

As execuções foram feitas com `uv run python -m comum.kit lote --saida <pasta>` (veja `planos/kit-de-medicao.md`) e
copiadas para `dados/execucoes/`. Rodar o lote de novo gasta o uso do Claude Code e dá números um pouco diferentes:
o modelo não responde igual duas vezes.
"""

from . import exportar_site


def main() -> None:
    print("exportando os dados da página...")
    exportar_site.exportar()


if __name__ == "__main__":
    main()
