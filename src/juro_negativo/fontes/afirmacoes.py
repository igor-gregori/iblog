"""Os números citados no texto analisado, transcritos à mão.

Texto: "O Juro é negativo após 2008", de Renato Amoedo (Trezoitão), publicado em 24/10/2022 em
https://amoedo.substack.com/p/o-juro-e-negativo-apos-2008

Cada linha de `data/manual/afirmacoes.csv` é um número do texto, com o trecho de
onde ele saiu. Os períodos vão da abertura do mês de início à abertura do mês de fim.
"""

from pathlib import Path

import pandas as pd

from ..caminhos import MANUAIS

ARQUIVO = MANUAIS / "afirmacoes.csv"
URL_DO_TEXTO = "https://amoedo.substack.com/p/o-juro-e-negativo-apos-2008"
DATA_DO_TEXTO = pd.Timestamp("2022-10-24")


def ler(caminho: Path = ARQUIVO) -> pd.DataFrame:
    """Colunas: grupo, pais, inicio, fim, serie, variacao_citada (fração), trecho.

    O texto cita ora "26,48 vezes", ora "483,59%"; aqui tudo vira variação em
    fração (25.48 e 4.8359).
    """
    bruto = pd.read_csv(caminho)
    em_vezes = bruto["unidade"] == "vezes"
    tabela = bruto.drop(columns=["citado", "unidade"])
    tabela["variacao_citada"] = (bruto["citado"] - 1).where(em_vezes, bruto["citado"] / 100)
    for coluna in ("inicio", "fim"):
        tabela[coluna] = pd.to_datetime(tabela[coluna], format="%Y-%m")
    return tabela[["grupo", "pais", "inicio", "fim", "serie", "variacao_citada", "trecho"]]
