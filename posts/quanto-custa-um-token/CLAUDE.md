# O que é um token, e quanto ele custa?

O terceiro post da série de IA para devs (o plano está em `planos/serie-ia.md`). A pergunta que ele responde: o
que é um token, o que faz um texto gastar mais tokens que outro e quanto custa um pedido em cada modelo.

É um post do iblog: as regras gerais estão no `CLAUDE.md` da raiz. Aqui fica o que é só deste post. Os caminhos
abaixo são relativos a `posts/quanto-custa-um-token/`.

## O que o Igor decidiu

- **Contar com um tokenizador aberto** (19/10/2026). A contagem exata do Claude só sai da API da Anthropic, e o
  projeto não tem chave; ele escolheu o `o200k_base` (o do GPT-4o e da família GPT-5), que roda no navegador. O
  texto diz que cada fornecedor conta diferente e que os números servem para comparar formatos.
- **Comparar Anthropic, OpenAI e Google**, com os preços públicos pesquisados e citados nas fontes.
- **Pedidos da primeira revisão** (19/10/2026): a parte 3, "Então por que não compactar sempre?", responde a
  pergunta que ele quis no post; a tabela de preços mostra "US$" em cada valor; o gráfico das amostras traz os
  caracteres embaixo do nome; o Artificial Analysis entra como indicação para comparar modelos além do preço (ele
  usa bastante); e o rodapé tem a nota "Como este post foi feito", com o texto que ele pediu, melhorado.

## Estado

- Rascunho de 19/10/2026. Ele revisou uma vez e pediu as mudanças acima, já feitas. Não publicado.
- Decisões tomadas sem ele, para ele rever:
  - O endereço (`/quanto-custa-um-token/`).
  - Os modelos da calculadora: o maior, o médio e o menor de cada fornecedor (mais o Fable 5.1 da Anthropic).
  - Os três pedidos típicos da calculadora (`pagina/cenarios.ts`).
  - Como é um post de dados, cada parte fecha com "Fontes e método", como nos posts de economia.

## O que precisa continuar verdadeiro

- **Python é a referência.** `analise/tokens.py` (contagem e pedaços, com o `tiktoken`) e `analise/custos.py`
  (custo de um pedido); `pagina/tokens.ts` e `pagina/custos.ts` repetem. `uv run python -m quanto_custa_um_token`
  regera `pagina/dados.json` e `testes/casos.json`; `npm test` compara os dois lados.
- **Os pedaços seguem o decodificador em fluxo.** Um caractere partido entre tokens aparece no token em que
  termina. No navegador, isso depende do `decode` do `gpt-tokenizer` guardar os bytes entre chamadas; a versão está
  fixa (4.0.0) e o teste quebra se o comportamento mudar.
- **Preços com data.** `dados/manuais/precos.csv` foi transcrito das páginas oficiais em 18/10/2026
  (`PRECOS_CONSULTADOS_EM` em `analise/exportar_site.py`). Os do Gemini 4 Argon e do Gemini 3.8 Flash são
  promocionais e dobram em 1/12/2026 e 1/1/2027. Mudou um preço, mude a data.
- Os exemplos de pedaços da parte 1 ("Função" vira "Fun" + "ção", "assíncrona" vira quatro) estão entre os
  textos de teste de `analise/exportar_site.py`.
