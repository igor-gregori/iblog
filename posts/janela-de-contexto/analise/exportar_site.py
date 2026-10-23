"""Gera os arquivos que a página consome.

- `pagina/dados.json`: os preços (com a janela de cada modelo e a faixa longa), a composição de cada chamada da sessão
  real e a calibração.
- `testes/casos.json`: custos calculados em Python, para os testes do site conferirem que a versão em TypeScript dá
  os mesmos números.
"""

import json
from dataclasses import asdict

from comum.precos import custo_com_faixas, ler_precos

from . import composicao
from .caminhos import PAGINA, TESTES

# O dia em que a janela, a saída máxima e os preços da faixa longa foram conferidos nas páginas dos fornecedores.
PRECOS_CONSULTADOS_EM = "2026-10-22"

# A sessão real: a mesma do post sobre sessões, com o Claude Opus 5.5.
MODELO_DA_SESSAO_REAL = "claude-opus-5-5"

# Tamanhos de pedido que exercitam a conta nos testes: abaixo, no limite e acima das faixas longas.
ENTRADAS_DE_TESTE = [1_000, 100_000, 100_001, 272_000, 272_001, 900_000]


def exportar() -> None:
    precos = ler_precos()
    composicoes, calibracao = composicao.ler()
    dados = {
        "precos_consultados_em": PRECOS_CONSULTADOS_EM,
        "precos": [asdict(preco) for preco in precos],
        "modelo_da_sessao": MODELO_DA_SESSAO_REAL,
        "composicao": [asdict(c) for c in composicoes],
        "calibracao": asdict(calibracao),
    }
    PAGINA.mkdir(parents=True, exist_ok=True)
    (PAGINA / "dados.json").write_text(json.dumps(dados, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    casos = {
        "custos": [
            {
                "modelo": preco.modelo,
                "entrada": entrada,
                "saida": 1_000,
                "fracao_em_cache": fracao,
                "esperado": custo_com_faixas(preco, entrada, 1_000, fracao),
            }
            for preco in precos
            for entrada in ENTRADAS_DE_TESTE
            for fracao in (0.0, 0.9)
        ],
    }
    TESTES.mkdir(parents=True, exist_ok=True)
    (TESTES / "casos.json").write_text(json.dumps(casos, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
