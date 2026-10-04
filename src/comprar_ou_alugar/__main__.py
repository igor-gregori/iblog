"""Roda o pipeline inteiro: baixa as fontes, trata, salva as tabelas e exporta os dados da página.

uv run python -m comprar_ou_alugar              # usa os arquivos já baixados
uv run python -m comprar_ou_alugar --atualizar  # baixa tudo de novo
"""

import argparse

from . import exportar_site, tratamento
from .caminhos import TRATADOS
from .fontes import b3_ifix, bcb_sgs, cvm_fii, fipezap, ibge_sidra, tesouro

FONTES = [fipezap, b3_ifix, ibge_sidra, bcb_sgs, cvm_fii, tesouro]


def main() -> None:
    argumentos = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    argumentos.add_argument("--atualizar", action="store_true", help="baixa as fontes de novo, mesmo que já existam")
    atualizar = argumentos.parse_args().atualizar

    for fonte in FONTES:
        print(f"baixando {fonte.__name__.rsplit('.', 1)[-1]}...")
        fonte.baixar(atualizar=atualizar)

    print("tratando...")
    fiis = cvm_fii.ler()
    mensal = tratamento.montar_mensal(ibge_sidra.ler(), bcb_sgs.ler(), b3_ifix.ler(), tesouro.ler(), fiis)
    cidades = tratamento.montar_cidades(fipezap.ler(), mensal)

    TRATADOS.mkdir(parents=True, exist_ok=True)
    for nome, tabela in {"mensal": mensal, "cidades": cidades, "fiis": fiis}.items():
        tabela.to_parquet(TRATADOS / f"{nome}.parquet", index=False)
        print(f"  {nome}.parquet: {len(tabela):,} linhas".replace(",", "."))

    print("exportando os dados da página...")
    exportar_site.exportar(mensal, cidades)


if __name__ == "__main__":
    main()
