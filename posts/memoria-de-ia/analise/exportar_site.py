"""Gera os arquivos que a página consome.

- `pagina/dados.json`: os preços, as cargas e os pedidos da sessão real, a calibração, o histórico dos CLAUDE.md e
  os números da memória automática.
- `testes/casos.json`: custos calculados em Python, para os testes do site conferirem que a versão em TypeScript dá
  os mesmos números.
"""

import json
from dataclasses import asdict

from comum.precos import ler_precos

from . import automatica, historico, sessao
from .caminhos import PAGINA, TESTES
from .conta import custo_da_memoria, custo_do_pedido, custo_mensal, custo_mensal_sem_cache

# O dia em que os preços da tabela comum foram conferidos nas páginas dos fornecedores.
PRECOS_CONSULTADOS_EM = "2026-10-22"

# O dia em que a documentação de memória do Claude Code, do Claude e do ChatGPT foi conferida.
DOCUMENTACAO_CONFERIDA_EM = "2026-10-28"

# A sessão real: a dos posts 5 a 7, com o Claude Opus 5.5.
MODELO_DA_SESSAO = "claude-opus-5-5"

# Combinações que exercitam a calculadora nos testes: (tokens, chamadas por dia, gravações por dia, dias).
MESES_DE_TESTE = [(7_000, 65, 2, 21), (1_000, 10, 10, 1), (50_000, 300, 0, 30), (20_000, 5, 9, 21)]


def exportar() -> None:
    precos = ler_precos()
    cargas, pedidos, calibracao = sessao.ler()
    dados = {
        "precos_consultados_em": PRECOS_CONSULTADOS_EM,
        "documentacao_conferida_em": DOCUMENTACAO_CONFERIDA_EM,
        "precos": [asdict(preco) for preco in precos],
        "modelo_da_sessao": MODELO_DA_SESSAO,
        "cargas": [asdict(c) for c in cargas],
        "pedidos": [asdict(p) for p in pedidos],
        "calibracao": asdict(calibracao),
        "historico": [asdict(d) for d in historico.ler()],
        "automatica": automatica.ler(),
    }
    PAGINA.mkdir(parents=True, exist_ok=True)
    (PAGINA / "dados.json").write_text(json.dumps(dados, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    casos = {
        "sessao": [
            {
                "modelo": preco.modelo,
                "custo": sum(custo_do_pedido(preco, p) for p in pedidos),
                "memoria": sum(custo_da_memoria(preco, p) for p in pedidos),
            }
            for preco in precos
        ],
        "meses": [
            {
                "modelo": preco.modelo,
                "tokens": tokens,
                "chamadas": chamadas,
                "gravacoes": gravacoes,
                "dias": dias,
                "com_cache": custo_mensal(preco, tokens, chamadas, gravacoes, dias),
                "sem_cache": custo_mensal_sem_cache(preco, tokens, chamadas, dias),
            }
            for preco in precos
            for tokens, chamadas, gravacoes, dias in MESES_DE_TESTE
        ],
    }
    TESTES.mkdir(parents=True, exist_ok=True)
    (TESTES / "casos.json").write_text(json.dumps(casos, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
