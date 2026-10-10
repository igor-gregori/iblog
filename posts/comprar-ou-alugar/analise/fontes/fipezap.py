"""Índice FipeZAP: preço anunciado de venda e de aluguel de apartamentos prontos.

Fonte: https://www.fipe.org.br/pt-br/indices/fipezap/
A planilha tem uma aba por cidade (56 cidades) e uma aba com o índice nacional.
"""

from pathlib import Path

import pandas as pd

from comum import http

from ..caminhos import BRUTOS

URL = "https://downloads.fipe.org.br/indices/fipezap/fipezap-serieshistoricas.xlsx"
ARQUIVO = BRUTOS / "fipezap" / "fipezap-serieshistoricas.xlsx"

NACIONAL = "Índice FipeZAP"  # nome da aba com o índice composto das cidades
ABAS_SEM_SERIE = {"Resumo", "Aux"}

# Posição (a partir de 0) da coluna "Total" de cada bloco de imóveis residenciais.
# As quatro colunas seguintes de cada bloco são os recortes de 1, 2, 3 e 4 dormitórios.
BLOCOS = {
    "venda_indice": 2,
    "venda_preco_m2": 17,
    "aluguel_indice": 22,
    "aluguel_preco_m2": 37,
    "rentabilidade_aluguel_mes": 42,
}
QUARTOS = ["total", "1", "2", "3", "4"]

# O que a linha de títulos (a terceira) precisa ter em cada bloco. Se a Fipe mudar
# o desenho da planilha, a leitura falha aqui em vez de devolver colunas trocadas.
TITULOS_ESPERADOS = {
    2: "Número-Índice",
    17: "Preço médio (R$/m²)",
    22: "Número-Índice",
    37: "Preço médio (R$/m²)",
    42: "(% - mensalizada)",
}


def baixar(atualizar: bool = False) -> Path:
    return http.baixar(URL, ARQUIVO, atualizar=atualizar)


def ler(caminho: Path = ARQUIVO) -> pd.DataFrame:
    """Devolve uma linha por mês, cidade e número de dormitórios.

    Colunas: data, cidade, uf, quartos, venda_indice, venda_preco_m2,
    aluguel_indice, aluguel_preco_m2, rentabilidade_aluguel_mes.
    O índice nacional entra como a "cidade" `NACIONAL`, sem UF.
    """
    abas = pd.read_excel(caminho, sheet_name=None, header=None, na_values=".")
    ufs = _ufs(abas["Resumo"])

    partes = []
    for cidade, bruto in abas.items():
        if cidade in ABAS_SEM_SERIE:
            continue
        _conferir_titulos(bruto, cidade)

        dados = bruto.iloc[4:]
        dados = dados[dados[1].notna()]
        datas = pd.to_datetime(dados[1])
        for deslocamento, quartos in enumerate(QUARTOS):
            parte = pd.DataFrame({"data": datas, "cidade": cidade, "uf": ufs.get(cidade), "quartos": quartos})
            for nome, coluna in BLOCOS.items():
                parte[nome] = pd.to_numeric(dados[coluna + deslocamento], errors="coerce")
            partes.append(parte)

    tabela = pd.concat(partes, ignore_index=True)
    # Cidades que entraram depois no índice têm os primeiros meses vazios.
    tabela = tabela.dropna(subset=list(BLOCOS), how="all")
    return tabela.sort_values(["cidade", "quartos", "data"], ignore_index=True)


def _ufs(resumo: pd.DataFrame) -> dict[str, str]:
    """Cidade → UF, tirado da aba Resumo (cidade na coluna 1, UF na coluna 2)."""
    pares = resumo[[1, 2]].dropna()
    pares = pares[pares[2].astype(str).str.fullmatch(r"[A-Z]{2}")]
    return dict(zip(pares[1], pares[2]))


def _conferir_titulos(bruto: pd.DataFrame, cidade: str) -> None:
    for coluna, esperado in TITULOS_ESPERADOS.items():
        encontrado = bruto.iat[2, coluna]
        if encontrado != esperado:
            raise ValueError(
                f"A planilha do FipeZAP mudou de formato: na aba {cidade!r}, coluna {coluna}, "
                f"esperava {esperado!r} e encontrei {encontrado!r}."
            )
