"""Gera os arquivos que a página consome.

- `pagina/dados.json`: as amostras medidas e os preços.
- `testes/casos.json`: contagens e custos calculados em Python, para os testes do site conferirem que a versão em
  TypeScript dá os mesmos números.
"""

import json
from dataclasses import asdict

from . import tokens
from .amostras import ler_amostras
from .caminhos import PAGINA, TESTES
from .custos import custo, ler_precos

# O dia em que os preços foram conferidos nas páginas dos fornecedores.
PRECOS_CONSULTADOS_EM = "2026-10-18"

# Textos curtos que exercitam o tokenizador: acentos, emoji, código, números e espaços.
TEXTOS_DE_TESTE = [
    "Olá, mundo! Função assíncrona: const usuarios = await prisma.usuario.findMany()",
    "ação, informação, atenção 🚀",
    "    if (x === 1) {\n        return null\n    }",
    "R$ 1.234,56 em 18/10/2026",
    "",
]


def exportar() -> None:
    amostras = ler_amostras()
    precos = ler_precos()
    dados = {
        "codificacao": tokens.CODIFICACAO,
        "precos_consultados_em": PRECOS_CONSULTADOS_EM,
        "amostras": [
            {"id": a.id, "nome": a.nome, "texto": a.texto, "caracteres": len(a.texto), "tokens": tokens.contar(a.texto)}
            for a in amostras
        ],
        "precos": [asdict(preco) for preco in precos],
    }
    PAGINA.mkdir(parents=True, exist_ok=True)
    (PAGINA / "dados.json").write_text(json.dumps(dados, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    casos = {
        "tokens": [
            {"texto": texto, "tokens": tokens.contar(texto), "pedacos": tokens.pedacos(texto)}
            for texto in TEXTOS_DE_TESTE + [a.texto for a in amostras]
        ],
        "custos": [
            {
                "modelo": preco.modelo,
                "entrada": entrada,
                "saida": saida,
                "fracao_em_cache": fracao,
                "esperado": custo(preco, entrada, saida, fracao),
            }
            for preco in precos
            for entrada, saida, fracao in [(1_000, 500, 0.0), (80_000, 2_000, 0.9), (100_000, 10_000, 0.5)]
        ],
    }
    TESTES.mkdir(parents=True, exist_ok=True)
    (TESTES / "casos.json").write_text(json.dumps(casos, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
