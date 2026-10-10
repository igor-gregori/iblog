"""Aparência dos gráficos dos notebooks. A página usa as mesmas cores.

Cada série tem sempre a mesma cor, e só cinco séries têm cor: a Selic, as duas
réguas em disputa (IPCA e M2) e os dois outros investimentos do texto (Ibovespa
e ouro). O resto aparece em grafite ou cinza. Os dois trios que dividem um
gráfico (Selic, M2 e IPCA; Selic, Ibovespa e ouro) foram validados para
daltonismo sobre o fundo da página.
"""

from itertools import pairwise

import matplotlib as mpl
import numpy as np
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.ticker import FuncFormatter, MultipleLocator

SUPERFICIE = "#f4f5f2"
TINTA = "#141815"
TINTA_SECUNDARIA = "#4a504c"
TINTA_SUAVE = "#767c77"
GRADE = "#dfe2dc"
EIXO = "#b9beb8"
GRAFITE = "#3b403d"  # destaque neutro: séries que não são um dos cinco protagonistas
CINZA = "#a3a8a3"  # séries de contexto, sem destaque

AZUL, LARANJA, VERDE_AGUA, AMARELO, MAGENTA = "#256abf", "#d95926", "#199e70", "#c98500", "#d55181"
VERMELHO = "#d03b3b"

CORES = {
    "selic": AZUL,
    "cdi": AZUL,
    "m2": LARANJA,
    "ipca": VERDE_AGUA,
    "ouro": AMARELO,
    "ibovespa": MAGENTA,
}

# Azul: o juro ficou acima da régua. Vermelho: ficou abaixo. Cinza neutro no empate.
DIVERGENTE = LinearSegmentedColormap.from_list(
    "juros_negativos", ["#a32a2a", "#e34948", "#f3aaa6", "#eceeea", "#9ec5f4", "#2a78d6", "#184f95"]
)


def cor(serie: str) -> str:
    """A cor da série, ou cinza se ela não for uma das cinco com cor própria."""
    return CORES.get(serie, CINZA)


def aplicar() -> None:
    """Configura o matplotlib. Chame uma vez no começo do notebook."""
    mpl.rcParams.update(
        {
            "figure.figsize": (9, 4.8),
            "figure.dpi": 110,
            "figure.facecolor": SUPERFICIE,
            "savefig.facecolor": SUPERFICIE,
            "axes.facecolor": SUPERFICIE,
            "axes.edgecolor": EIXO,
            "axes.linewidth": 1,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "axes.spines.left": False,
            "axes.grid": True,
            "axes.grid.axis": "y",
            "axes.axisbelow": True,
            "axes.labelcolor": TINTA_SECUNDARIA,
            "axes.labelsize": 10,
            "axes.prop_cycle": mpl.cycler(color=[AZUL, LARANJA, VERDE_AGUA]),
            "grid.color": GRADE,
            "grid.linewidth": 1,
            "lines.linewidth": 2,
            "lines.solid_capstyle": "round",
            "lines.solid_joinstyle": "round",
            "xtick.color": TINTA_SUAVE,
            "ytick.color": TINTA_SUAVE,
            "xtick.labelsize": 9.5,
            "ytick.labelsize": 9.5,
            "ytick.left": False,
            "text.color": TINTA,
            "font.family": "sans-serif",
            "font.size": 10,
            "legend.frameon": False,
            "legend.fontsize": 10,
            "legend.labelcolor": TINTA_SECUNDARIA,
        }
    )


def br(valor: float, casas: int = 0) -> str:
    """Número no formato brasileiro: 12.345,6"""
    return f"{valor:,.{casas}f}".replace(",", "§").replace(".", ",").replace("§", ".")


def pct(valor: float, casas: int = 0, sinal: bool = False) -> str:
    """Fração como percentual: 0.065 → '6,5%'"""
    texto = br(valor * 100, casas) + "%"
    return "+" + texto if sinal and valor > 0 else texto.replace("-", "−")


def vezes(valor: float, casas: int = 2) -> str:
    """Múltiplo: 2.14 → '2,14×'"""
    return br(valor, casas) + "×"


def eixo_pct(eixo, casas: int = 0, passo: float | None = None) -> None:
    """Eixo em percentual. `passo` fixa a distância entre as marcas (0.02 = de 2 em 2 pontos)."""
    eixo.set_major_formatter(FuncFormatter(lambda valor, _: pct(valor, casas)))
    if passo:
        eixo.set_major_locator(MultipleLocator(passo))


def eixo_br(eixo, casas: int = 0) -> None:
    eixo.set_major_formatter(FuncFormatter(lambda valor, _: br(valor, casas)))


def titulo(ax, texto: str, subtitulo: str = "", legenda: bool = False) -> None:
    """Título à esquerda; abaixo dele o subtítulo e, se pedida, a legenda em linha.

    Chame depois de desenhar as séries, para a legenda encontrar todas.
    """
    altura = 6  # pontos acima da área do gráfico
    if legenda:
        ax.legend(
            loc="lower left",
            bbox_to_anchor=(0, 1),
            borderaxespad=0.3,
            borderpad=0,
            ncols=5,
            handlelength=1.4,
            columnspacing=1.4,
        )
        altura += 22
    if subtitulo:
        ax.annotate(
            subtitulo,
            (0, 1),
            xycoords="axes fraction",
            xytext=(0, altura),
            textcoords="offset points",
            fontsize=10,
            color=TINTA_SECUNDARIA,
            va="bottom",
        )
        altura += 17
    ax.set_title(texto, loc="left", fontsize=13, fontweight="bold", pad=altura)


def fonte(fig, texto: str) -> None:
    fig.text(0.01, -0.02, texto, fontsize=8.5, color=TINTA_SUAVE, ha="left", va="top")


def rotular_fins(ax, formato, so: list[str] | None = None, distancia_minima: float = 16) -> None:
    """Escreve o último valor de cada linha ao lado do seu ponto final.

    `so` limita os rótulos às séries com esses nomes. Rótulos que ficariam um em
    cima do outro são afastados e ganham um traço fino de ligação com a sua linha.
    """
    fins = []
    for linha in ax.get_lines():
        x, y = np.asarray(linha.get_xdata()), np.asarray(linha.get_ydata(), dtype=float)
        validos = ~np.isnan(y)
        nome = linha.get_label()
        if nome.startswith("_") or not validos.any() or (so is not None and nome not in so):
            continue
        fins.append((x[validos][-1], y[validos][-1], linha.get_color()))
        ax.plot(*fins[-1][:2], "o", ms=7, color=fins[-1][2], mec=SUPERFICIE, mew=2, zorder=5, label="_fim")

    # Posições em pixels, de baixo para cima, garantindo a distância mínima.
    alturas = [ax.transData.transform((ax.convert_xunits(x), y))[1] for x, y, _ in fins]
    ordem = np.argsort(alturas)
    ajustadas = np.array(alturas, dtype=float)
    for anterior, atual in pairwise(ordem):
        ajustadas[atual] = max(ajustadas[atual], ajustadas[anterior] + distancia_minima)

    escala = 72 / ax.figure.dpi  # pixels → pontos
    for (x, y, _), original, ajustada in zip(fins, alturas, ajustadas):
        deslocamento = (ajustada - original) * escala
        ax.annotate(
            formato(y),
            (x, y),
            xytext=(9, deslocamento),
            textcoords="offset points",
            va="center",
            fontsize=9.5,
            color=TINTA_SECUNDARIA,
            arrowprops={"arrowstyle": "-", "color": EIXO, "lw": 0.8} if abs(deslocamento) > 1 else None,
            annotation_clip=False,
        )


def linha_de_base(ax, y: float = 0) -> None:
    """Uma linha horizontal de referência, um pouco mais forte que a grade."""
    ax.axhline(y, color=TINTA_SUAVE, lw=1, zorder=1)


def barras(ax, valores, cores, formato, base: float = 0) -> None:
    """Barras horizontais finas, com o valor escrito na ponta. `valores` é uma série indexada pelo nome de cada barra."""
    posicoes = np.arange(len(valores))[::-1]
    ax.barh(posicoes, valores - base, left=base, color=cores, height=0.4)
    for posicao, valor in zip(posicoes, valores):
        lado = 1 if valor >= base else -1
        ax.annotate(
            formato(valor),
            (valor, posicao),
            xytext=(5 * lado, 0),
            textcoords="offset points",
            va="center",
            ha="left" if lado > 0 else "right",
            fontsize=9.5,
            color=TINTA_SECUNDARIA,
        )
    ax.set_yticks(posicoes, valores.index)
    ax.tick_params(axis="y", length=0, labelcolor=TINTA_SECUNDARIA)
    ax.grid(False)
    ax.set_xticks([])
    ax.spines["bottom"].set_visible(False)
    ax.axvline(base, color=TINTA_SUAVE, lw=1, zorder=3)
    ax.margins(x=0.14)
