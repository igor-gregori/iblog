"""Escolhe a 5ª cor de série desta página a partir da paleta do design do blog.

Regra do design: qualquer cor nova de gráfico passa num validador de
daltonismo (protanopia, deuteranopia e tritanopia), com faixa de luminosidade e
contraste com o fundo, nos dois temas. Nunca escolhida no olho.

Os designs do blog (site/base/) já têm quatro séries validadas; aqui procuramos a quinta,
a que fica mais longe das outras quatro sob as três deficiências de visão de cor.
"""

from __future__ import annotations

import math
from itertools import combinations

# Matrizes de Machado, Oliveira e Fernandes (2009), severidade 1.0, sobre RGB linear.
MACHADO = {
    "protanopia": (
        (0.152286, 1.052583, -0.204868),
        (0.114503, 0.786281, 0.099216),
        (-0.003882, -0.048116, 1.051998),
    ),
    "deuteranopia": (
        (0.367322, 0.860646, -0.227968),
        (0.280085, 0.672501, 0.047413),
        (-0.011820, 0.042940, 0.968881),
    ),
    "tritanopia": (
        (1.255528, -0.076749, -0.178779),
        (-0.078411, 0.930809, 0.147602),
        (0.004733, 0.691367, 0.303900),
    ),
}

FUNDOS = {"claro": "#ffffff", "escuro": "#0f1218"}


def para_rgb(hexa: str) -> tuple[int, int, int]:
    hexa = hexa.lstrip("#")
    return tuple(int(hexa[i : i + 2], 16) for i in (0, 2, 4))


def para_hexa(rgb: tuple[int, int, int]) -> str:
    canais = (f"{max(0, min(255, round(c))):02x}" for c in rgb)
    return "#" + "".join(canais)


def para_linear(canal: int) -> float:
    c = canal / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def para_srgb(c: float) -> float:
    c = max(0.0, c)
    v = 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055
    return max(0.0, min(1.0, v))


def linear_para_lab(rgb: tuple[float, float, float]) -> tuple[float, float, float]:
    r, g, b = rgb

    def f(t: float) -> float:
        return t ** (1 / 3) if t > 216 / 24389 else (841 / 108) * t + 4 / 29

    x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
    z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883
    return 116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))


def simular(rgb: tuple[int, int, int], tipo: str) -> tuple[float, float, float]:
    matriz = MACHADO[tipo]
    linear = [para_linear(c) for c in rgb]
    return linear_para_lab(tuple(sum(m[i] * linear[i] for i in range(3)) for m in matriz))


def delta_e(lab1: tuple[float, float, float], lab2: tuple[float, float, float]) -> float:
    """CIEDE2000."""
    l1, a1, b1 = lab1
    l2, a2, b2 = lab2
    c1 = math.hypot(a1, b1)
    c2 = math.hypot(a2, b2)
    media_c = (c1 + c2) / 2
    g = 0.5 * (1 - math.sqrt(media_c**7 / (media_c**7 + 25**7))) if media_c else 0
    a1p, a2p = (1 + g) * a1, (1 + g) * a2
    c1p, c2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1p = math.degrees(math.atan2(b1, a1p)) % 360 if (a1p or b1) else 0
    h2p = math.degrees(math.atan2(b2, a2p)) % 360 if (a2p or b2) else 0
    dlp = l2 - l1
    dcp = c2p - c1p
    if c1p * c2p == 0:
        dhp = 0
    elif abs(h2p - h1p) <= 180:
        dhp = h2p - h1p
    elif h2p - h1p > 180:
        dhp = h2p - h1p - 360
    else:
        dhp = h2p - h1p + 360
    dh_big = 2 * math.sqrt(c1p * c2p) * math.sin(math.radians(dhp / 2))
    media_lp = (l1 + l2) / 2
    media_cp = (c1p + c2p) / 2
    if c1p * c2p == 0:
        media_hp = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        media_hp = (h1p + h2p) / 2
    elif h1p + h2p < 360:
        media_hp = (h1p + h2p + 360) / 2
    else:
        media_hp = (h1p + h2p - 360) / 2
    t = (
        1
        - 0.17 * math.cos(math.radians(media_hp - 30))
        + 0.24 * math.cos(math.radians(2 * media_hp))
        + 0.32 * math.cos(math.radians(3 * media_hp + 6))
        - 0.2 * math.cos(math.radians(4 * media_hp - 63))
    )
    dtheta = 30 * math.exp(-(((media_hp - 275) / 25) ** 2))
    media_c7 = media_cp**7
    rc = 2 * math.sqrt(media_c7 / (media_c7 + 25**7)) if media_c7 else 0
    sl = 1 + (0.015 * (media_lp - 50) ** 2) / math.sqrt(20 + (media_lp - 50) ** 2)
    sc = 1 + 0.045 * media_cp
    sh = 1 + 0.015 * media_cp * t
    rt = -math.sin(math.radians(2 * dtheta)) * rc
    return math.sqrt((dlp / sl) ** 2 + (dcp / sc) ** 2 + (dh_big / sh) ** 2 + rt * (dcp / sc) * (dh_big / sh))


def luminancia(rgb: tuple[int, int, int]) -> float:
    r, g, b = (para_linear(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    l1, l2 = luminancia(a), luminancia(b)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def pior_separacao(cores: list[str]) -> tuple[float, str, str]:
    """A menor distância CIEDE2000 entre duas cores quaisquer, sob a pior das três deficiências."""
    return min(
        (min(delta_e(simular(para_rgb(a), t), simular(para_rgb(b), t)) for t in MACHADO), a, b)
        for a, b in combinations(cores, 2)
    )


def pior_contra_nova(base: list[str], nova: str) -> tuple[float, str]:
    """A menor separação entre a cor nova e as quatro que já existem."""
    return min(
        (min(delta_e(simular(para_rgb(base[i]), t), simular(para_rgb(nova), t)) for t in MACHADO), base[i])
        for i in range(len(base))
    )


# As quatro séries dos designs do blog, nos dois temas (site/base/).
BASE_CLARO = ["#2c63c4", "#d9682b", "#14937a", "#c98500"]
BASE_ESCURO = ["#4a8be8", "#d9682b", "#1aa386", "#c98500"]


def hsl_para_rgb(matiz: float, lum: float, sat: float) -> tuple[int, int, int]:
    def matiz_para_canal(p: float, q: float, t: float) -> float:
        t %= 1
        if t < 1 / 6:
            return p + (q - p) * 6 * t
        if t < 1 / 2:
            return q
        if t < 2 / 3:
            return p + (q - p) * (2 / 3 - t) * 6
        return p

    if sat == 0:
        v = lum * 255
        return (v, v, v)
    q = lum * (1 + sat) if lum < 0.5 else lum + sat - lum * sat
    p = 2 * lum - q
    return tuple(matiz_para_canal(p, q, matiz + k / 3) * 255 for k in (0, 1, 2))


def croma(rgb: tuple[int, int, int]) -> int:
    """Distância entre os canais: separa as cores chromaticadas do preto, do branco e do cinza."""
    return max(rgb) - min(rgb)


# A paleta precisa ficar longe das quatro, então varremos só matizes que as
# quatro não ocupam (azul, laranja, verde, âmbar): violeta, roxo e magenta. A
# luminosidade fica na mesma faixa das séries existentes, para a cor nova ter o
# mesmo peso visual das outras — sem isso o buscador escapa para o quase preto
# ou para um creme pálido, que separam melhor mas não combinam com a paleta.
MATIZES = [h / 360 for h in range(255, 351, 3)]  # 255° a 350°: verde-azulado → magenta
CANDIDATOS = [
    hsl_para_rgb(matiz, lum / 100, sat / 100)
    for matiz in MATIZES
    for lum in range(20, 81, 2)
    for sat in range(30, 101, 5)
]


def melhor_cor(
    base: list[str], fundo: str, piso_contraste: float, piso_croma: int, faixa_l: tuple[float, float]
) -> tuple[float, str, float, str]:
    fundo_rgb = para_rgb(fundo)
    melhor = None
    for rgb in CANDIDATOS:
        if contraste(rgb, fundo_rgb) < piso_contraste or croma(rgb) < piso_croma:
            continue
        # Mesma faixa de luminosidade das séries existentes: a cor nova entra na
        # paleta com o mesmo peso, em vez de ser uma linha quase preta ou um creme.
        l, _, _ = linear_para_lab(tuple(para_linear(c) for c in rgb))
        if not faixa_l[0] <= l <= faixa_l[1]:
            continue
        hexa = para_hexa(rgb)
        distancia, vizinha = pior_contra_nova(base, hexa)
        # Manda a distância para a vizinha mais próxima; o desempate é o contraste com o fundo.
        if melhor is None or (distancia, contraste(rgb, fundo_rgb)) > (melhor[0], melhor[2]):
            melhor = (distancia, hexa, contraste(rgb, fundo_rgb), vizinha)
    return melhor


# Candidatos reais, para escolher com número na mão em vez de deixar o buscador
# escolher sozinho: o magenta que o projeto já usava e alguns passos da mesma família.
CURTO = {
    "claro": [
        "#d55181",
        "#c0407f",
        "#b23a86",
        "#a83291",
        "#9c2f96",
        "#8a2f9e",
        "#a63fa8",
        "#b5489f",
        "#9b3fa0",
        "#7b3fa4",
    ],
    "escuro": [
        "#e07a9f",
        "#d76ba0",
        "#cc5fa8",
        "#c252b0",
        "#b95cc0",
        "#c86bb8",
        "#b45fb5",
        "#cf6fae",
        "#a95fc0",
    ],
}

for tema, base, faixa_l in (("claro", BASE_CLARO, (40, 66)), ("escuro", BASE_ESCURO, (50, 74))):
    fundo_rgb = para_rgb(FUNDOS[tema])
    print(f"\n== candidatos, tema {tema} ==")
    for hexa in CURTO[tema]:
        rgb = para_rgb(hexa)
        l, _, _ = linear_para_lab(tuple(para_linear(c) for c in rgb))
        distancia, vizinha = pior_contra_nova(base, hexa)
        razao = contraste(rgb, fundo_rgb)
        marca = "dentro da faixa" if faixa_l[0] <= l <= faixa_l[1] else f"L* {l:.0f} fora da faixa"
        print(f"  {hexa}  ΔE {distancia:5.1f} (vs {vizinha})  contraste {razao:5.2f}:1  croma {croma(rgb):3d}  {marca}")

for tema, base, faixa_l in (("claro", BASE_CLARO, (40, 66)), ("escuro", BASE_ESCURO, (50, 74))):
    vizinhas, par_a, par_b = pior_separacao(base)
    distancia, hexa, razao, vizinha = melhor_cor(base, FUNDOS[tema], 3.0, 70, faixa_l)
    print(f"\n== tema {tema} ==")
    print(f"  as quatro séries já se separam por ΔE {vizinhas:.1f} no pior par ({par_a}/{par_b})")
    print(
        f"  5ª cor escolhida: {hexa}  (ΔE mínimo {distancia:.1f}, vizinha mais próxima {vizinha}, contraste {razao:.2f}:1)"
    )
    fundo_rgb = para_rgb(FUNDOS[tema])
    for cor in base + [hexa]:
        l, _, _ = linear_para_lab(tuple(para_linear(c) for c in para_rgb(cor)))
        print(
            f"    {cor}  L* {l:5.1f}  croma {croma(para_rgb(cor)):3d}  contraste {contraste(para_rgb(cor), fundo_rgb):5.2f}:1"
        )
