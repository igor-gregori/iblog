"""Download com cache em disco."""

import time
from pathlib import Path

import requests

CABECALHOS = {"User-Agent": "Mozilla/5.0 (projeto comprar-ou-alugar)"}


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
            break
        except requests.RequestException:
            if tentativa == tentativas:
                raise
            time.sleep(2 * tentativa)

    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(resposta.content)
    return destino
