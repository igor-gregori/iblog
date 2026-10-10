"""Confere a paleta de séries do site depois de adotar o design Folha Azul.

O Folha Azul (docs/cores.md) traz quatro séries validadas. Este site precisa de
uma quinta: o Ibovespa, que ocupa a quarta cor do projeto (o magenta). A quinta
cor foi escolhida pelo mesmo critério do design — separação sob protanopia,
deuteranopia e tritanopia, faixa de luminosidade parecida com a das outras e
contraste com o fundo nos dois temas — e ainda falta ser levada ao projeto
`folha-azul-design`, que ainda traz quatro séries.

Uso: python conferir_paleta.py
"""

from __future__ import annotations

import contextlib
import importlib.util
import io
from pathlib import Path

spec = importlib.util.spec_from_file_location("validar", Path(__file__).with_name("validar_cor.py"))
v = importlib.util.module_from_spec(spec)
# O módulo imprime ao ser importado; aqui só queremos as funções.
with contextlib.redirect_stdout(io.StringIO()):
    spec.loader.exec_module(v)

SERIES = ["Selic", "M2", "IPCA", "ouro", "Ibovespa"]
TEMAS = {
    "claro": {
        "fundo": "#ffffff",
        "cores": ["#2c63c4", "#d9682b", "#14937a", "#c98500", "#b23a86"],
    },
    "escuro": {
        "fundo": "#0f1218",
        "cores": ["#4a8be8", "#d9682b", "#1aa386", "#c98500", "#c252b0"],
    },
}

# Os gráficos deste site usam estas combinações; é nelas que a cor precisa separar.
COMBINACOES = [
    ["Selic", "M2", "IPCA"],
    ["Selic", "Ibovespa", "ouro"],
    ["Selic", "M2", "IPCA", "ouro", "Ibovespa"],
]

falha = False
for tema, dados in TEMAS.items():
    fundo = v.para_rgb(dados["fundo"])
    cores = dict(zip(SERIES, dados["cores"]))
    print(f"\n===== tema {tema} (fundo {dados['fundo']}) =====")
    for serie, cor in cores.items():
        l, _, _ = v.linear_para_lab(tuple(v.para_linear(c) for c in v.para_rgb(cor)))
        print(f"  {serie:<9} {cor}  L* {l:5.1f}  contraste {v.contraste(v.para_rgb(cor), fundo):5.2f}:1")

    print("\n  separação a dois, pela pior das três deficições:")
    for grupo in COMBINACOES:
        nome = ", ".join(grupo)
        valores = [
            (
                min(
                    v.delta_e(v.simular(v.para_rgb(cores[a]), t), v.simular(v.para_rgb(cores[b]), t)) for t in v.MACHADO
                ),
                a,
                b,
            )
            for i, a in enumerate(grupo)
            for b in grupo[i + 1 :]
        ]
        pior, pa, pb = min(valores)
        marca = "" if pior >= 10 else "   <-- apertado"
        print(f"    {nome:<38} ΔE {pior:5.1f}  ({pa} x {pb}){marca}")
        if pior < 10:
            falha = True

print(
    "\n",
    "alguma combinação abaixo de ΔE 10: precisa de rótulo na ponta da linha"
    if falha
    else "todas as combinações acima de ΔE 10",
)
