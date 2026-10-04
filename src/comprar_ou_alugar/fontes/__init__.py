"""Um módulo por fonte de dados.

Cada módulo tem uma função `baixar()`, que salva o arquivo bruto em `data/raw`
(e não baixa de novo se ele já existe), e uma função `ler()`, que devolve um
DataFrame limpo. Todas as taxas saem como fração: 0,5% é 0.005.
"""
