"""Download com cache em disco."""

import time
from pathlib import Path

import requests

# Algumas fontes (Banco Mundial, BIS) recusam clientes sem cara de navegador.
CABECALHOS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (projeto juro-negativo)"}


def baixar(
    url: str,
    destino: Path,
    *,
    atualizar: bool = False,
    tentativas: int = 3,
    dados: bytes | None = None,
    cabecalhos: dict[str, str] | None = None,
) -> Path:
    """Salva o conteúdo de `url` em `destino` e devolve o caminho.

    Se o arquivo já existe, não baixa de novo, a não ser que `atualizar` seja
    verdadeiro. Com `dados`, a requisição é um POST.
    """
    if destino.exists() and not atualizar:
        return destino

    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(_conteudo(url, tentativas, dados, cabecalhos))
    return destino


def texto(url: str, tentativas: int = 3) -> str:
    """O conteúdo de `url` como texto, sem salvar (para páginas que só servem para achar um link)."""
    return _conteudo(url, tentativas, None, None).decode("utf-8", errors="replace")


def _conteudo(url: str, tentativas: int, dados: bytes | None, cabecalhos: dict[str, str] | None) -> bytes:
    for tentativa in range(1, tentativas + 1):
        try:
            resposta = requests.request(
                "POST" if dados is not None else "GET",
                url,
                data=dados,
                headers=CABECALHOS | (cabecalhos or {}),
                timeout=180,
            )
            resposta.raise_for_status()
            return resposta.content
        except requests.RequestException:
            if tentativa == tentativas:
                raise
            time.sleep(2 * tentativa)
    raise AssertionError("inalcançável")
