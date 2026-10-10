"""Roda o pipeline inteiro: baixa as fontes, trata, salva as tabelas e exporta os dados da página.

uv run python -m juro_negativo              # usa os arquivos já baixados
uv run python -m juro_negativo --atualizar  # baixa tudo de novo
"""

import argparse

from . import exportar_site, tratamento
from .caminhos import TRATADOS
from .fontes import b3_ibovespa, banco_mundial, bcb_sgs, bis, bitcoin, fed, ibge_projecoes, ibge_sidra, sp500, tesouro

FONTES = [bcb_sgs, b3_ibovespa, banco_mundial, fed, sp500, bis, tesouro, bitcoin, ibge_sidra, ibge_projecoes]


def main() -> None:
    argumentos = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    argumentos.add_argument("--atualizar", action="store_true", help="baixa as fontes de novo, mesmo que já existam")
    atualizar = argumentos.parse_args().atualizar

    for fonte in FONTES:
        print(f"baixando {fonte.__name__.rsplit('.', 1)[-1]}...")
        fonte.baixar(atualizar=atualizar)

    print("tratando...")
    ouro = banco_mundial.ler_ouro()
    precos = bis.ler_precos()
    tabelas = {
        "brasil": tratamento.montar_brasil(bcb_sgs.ler(), b3_ibovespa.ler(), ouro, bitcoin.ler(), tesouro.ler()),
        "eua": tratamento.montar_eua(fed.ler(), sp500.ler(), ouro, precos),
        "paises": tratamento.montar_paises(bis.ler_juros(), precos),
        "demografia": tratamento.montar_demografia(
            banco_mundial.ler_indicadores(), ibge_sidra.ler(), ibge_projecoes.ler()
        ),
    }

    TRATADOS.mkdir(parents=True, exist_ok=True)
    for nome, tabela in tabelas.items():
        tabela.to_parquet(TRATADOS / f"{nome}.parquet", index=False)
        print(f"  {nome}.parquet: {len(tabela):,} linhas".replace(",", "."))

    print("exportando os dados da página...")
    exportar_site.exportar(**tabelas)


if __name__ == "__main__":
    main()
