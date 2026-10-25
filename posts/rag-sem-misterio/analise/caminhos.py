"""Pastas do post."""

from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]

CORPUS = RAIZ / "dados" / "corpus"  # a cópia dos documentos do iblog em que o post busca
MANUAIS = RAIZ / "dados" / "manuais"  # dados escritos à mão ou medidos uma vez
PERGUNTAS = MANUAIS / "perguntas.csv"  # as perguntas de teste, com o trecho que responde cada uma
SIMILARIDADES = MANUAIS / "similaridades.csv"  # os pedaços mais parecidos com cada pergunta, pelos embeddings
SEM_LUGAR = MANUAIS / "sem_lugar.csv"  # o mesmo, no tamanho padrão, sem o arquivo e os títulos no pedaço
MAPA = MANUAIS / "mapa.csv"  # os pedaços do tamanho padrão projetados num plano
SESSAO = MANUAIS / "sessao.json"  # as ferramentas que o agente usou na sessão real, só os números
PAGINA = RAIZ / "pagina"  # onde fica o dados.json que a página lê
TESTES = RAIZ / "testes"  # casos de teste que o TypeScript confere contra o Python
