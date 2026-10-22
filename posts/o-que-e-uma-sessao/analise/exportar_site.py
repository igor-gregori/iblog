"""Gera os arquivos que a página consome.

- `pagina/dados.json`: os preços, a sessão simulada padrão e a sessão real, chamada por chamada.
- `testes/casos.json`: custos calculados em Python, para os testes do site conferirem que a versão em TypeScript dá
  os mesmos números.
"""

import json
from dataclasses import asdict

from comum.precos import ler_precos

from . import registro
from .caminhos import PAGINA, TESTES
from .sessao import Sessao, chamadas, com_prazo_curto, custo_acumulado, custo_real

# O dia em que os preços (com os de gravação no cache) foram conferidos nas páginas dos fornecedores.
PRECOS_CONSULTADOS_EM = "2026-10-21"

# A sessão que a página mostra antes de o leitor mexer: um começo do tamanho do de um agente de código, 40 chamadas
# e, em cada uma, um pedido ou resultado de ferramenta de 1.500 tokens e uma resposta de 500. A última chamada fica
# abaixo de 100 mil tokens, a faixa de preço mais barata do Claude Haiku 5.5.
SESSAO_PADRAO = Sessao(comeco=20_000, chamadas=40, novos=1_500, saida=500)

# O modelo e o prazo de cache da sessão real (o Claude Code gravou tudo com o prazo de 1 hora).
MODELO_DA_SESSAO_REAL = "claude-opus-5-5"
PRAZO_CURTO = 5  # minutos: o prazo padrão da API da Anthropic, para comparar

# Sessões que exercitam a conta nos testes: curta, a padrão, com pausa e no limite dos controles da página.
SESSOES_DE_TESTE = [
    Sessao(comeco=5_000, chamadas=1, novos=200, saida=500),
    SESSAO_PADRAO,
    Sessao(comeco=20_000, chamadas=40, novos=1_500, saida=500, pausa=21),
    Sessao(comeco=12_000, chamadas=25, novos=800, saida=500, pausa=2),
]


def exportar() -> None:
    precos = ler_precos()
    real = registro.ler()
    dados = {
        "precos_consultados_em": PRECOS_CONSULTADOS_EM,
        "precos": [asdict(preco) for preco in precos],
        "sessao_padrao": asdict(SESSAO_PADRAO),
        "sessao_real": {
            "modelo": MODELO_DA_SESSAO_REAL,
            "prazo_curto": PRAZO_CURTO,
            "chamadas": [asdict(chamada) for chamada in real],
        },
    }
    PAGINA.mkdir(parents=True, exist_ok=True)
    (PAGINA / "dados.json").write_text(json.dumps(dados, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    modelo_real = next(preco for preco in precos if preco.modelo == MODELO_DA_SESSAO_REAL)
    casos = {
        "sessoes": [
            {
                "sessao": asdict(sessao),
                "chamadas": [asdict(chamada) for chamada in chamadas(sessao)],
                "custos": {
                    preco.modelo: {
                        "com_cache": custo_acumulado(preco, sessao),
                        "sem_cache": custo_acumulado(preco, sessao, com_cache=False),
                    }
                    for preco in precos
                },
            }
            for sessao in SESSOES_DE_TESTE
        ],
        "sessao_real": {
            "com_cache": [custo_real(modelo_real, chamada) for chamada in real],
            "sem_cache": [custo_real(modelo_real, chamada, com_cache=False) for chamada in real],
            "prazo_curto": [custo_real(modelo_real, chamada) for chamada in com_prazo_curto(real, PRAZO_CURTO)],
        },
    }
    TESTES.mkdir(parents=True, exist_ok=True)
    (TESTES / "casos.json").write_text(json.dumps(casos, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
