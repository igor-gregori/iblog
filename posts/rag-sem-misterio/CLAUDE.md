# O que é RAG, e quando você não precisa dele?

O sétimo post da série de IA para devs (o plano está em `planos/serie-ia.md`, item 7, "RAG sem mistério", mão na
massa). A pergunta que ele responde: o que é RAG, como funcionam a divisão em pedaços, a busca por palavras, a busca
por significado e a híbrida, e quando não é preciso montar nada disso (pôr tudo no contexto, ou deixar o agente usar
o `grep`).

É um post do iblog: as regras gerais estão no `CLAUDE.md` da raiz. Aqui fica o que é só deste post. Os caminhos
abaixo são relativos a `posts/rag-sem-misterio/`.

## O que o Igor decidiu

- Em 24/10/2026 ele pediu para seguir para o post 7, depois de publicar o glossário. O resto ficou para ele revisar.
- Na primeira revisão (25/10/2026) ele pediu três coisas, todas feitas:
  - **Responder se é o dev que monta o RAG ou se vem pronto no harness**: virou a parte 2, "Quem monta: você ou a
    ferramenta?" (projetos do Claude, agentes de código, file search da OpenAI, File Search do Gemini, search results
    da Anthropic, e a busca antes da pergunta ou como ferramenta).
  - **Uma forma de visualizar a busca por significado**, que tinha ficado abstrata: a figura "O que a busca por
    significado vê" (`pagina/components/Vetores.tsx`), com o mapa dos pedaços em duas dimensões e a régua com o
    cosseno dos 50 mais parecidos com a pergunta escolhida.
  - **Destacar a importância dos nomes e da divisão dos arquivos**: virou a parte 8, "Nomes que se deixam achar",
    com a medição da busca sem o arquivo e os títulos no pedaço (`pagina/components/Lugar.tsx`).

## Estado

- Escrito em 24/10/2026, no ramo `claude/post-7-rag`. O Igor revisou, pediu as três mudanças acima e **aprovou em
  25/10/2026**, pedindo o merge na `main` e a publicação. **Publicado em 25/10/2026**, a data do `post.json`.
- Decisões que foram tomadas sem ele e que ele aprovou junto com o post:
  - O endereço (`/rag-sem-misterio/`), o título e o formato: explicador com código em TypeScript e uma medição.
  - **O corpus são os documentos do próprio blog** (os `CLAUDE.md` e `README.md` da raiz e dos posts, e o plano da
    série), copiados em `dados/corpus/` em 24/10/2026, antes deste post existir. As cópias têm o prefixo `iblog__` e
    o caminho com `__` no lugar de `/`, para nenhuma se chamar `CLAUDE.md` (o Claude Code leria como instrução).
  - **As 32 perguntas de teste** (`dados/manuais/perguntas.csv`) foram escritas por mim: 16 com as palavras do
    trecho e 16 com outras palavras. O texto diz que é uma medição pequena.
  - **Os embeddings são de um modelo aberto rodando na máquina** (`intfloat/multilingual-e5-large`, pelo
    `fastembed`), porque não há chave de API. O exemplo de código usa a API da Voyage AI, a que a Anthropic indica,
    e o texto diz que a medição não a usou.
  - A contagem de tokens foi para `comum/tokens.py` (o post 3 usava a mesma), sem mudar nenhum número do post 3.
  - O mapa mostra só os pedaços. As perguntas ficaram de fora porque o modelo põe perguntas e trechos em regiões
    diferentes: no plano, todas caíam juntas no meio, longe das respostas, o que daria a ideia errada.
  - Pares de frases soltas (como "pasta" e "diretório") foram testados e ficaram de fora: com este modelo, frases
    curtas com as mesmas palavras e outro sentido deram cosseno igual ou maior que as de mesmo sentido, e escolher
    só os pares que funcionam seria escolher a dedo.
  - O custo usa o Claude Sonnet 5.5 como modelo inicial, 500 tokens de instruções e pergunta, 500 de resposta e
    os 5 primeiros pedaços da busca híbrida.

## O que precisa continuar verdadeiro

- **Python é a referência** para a divisão (`analise/pedacos.py` ↔ `pagina/pedacos.ts`), as buscas e a fusão
  (`analise/busca.py` ↔ `pagina/busca.ts`) e o custo (`analise/conta.py` ↔ `pagina/conta.ts`).
  `uv run python -m rag_sem_misterio` regera `pagina/dados.json` e `testes/casos.json`; `npm test` compara, e
  confere que os pedaços do `dados.json` são os que o TypeScript tira do corpus.
- **Os embeddings ficam gravados** em `dados/manuais/similaridades.csv` (os 50 pedaços mais parecidos de cada
  pergunta, em cada tamanho), e o pipeline de sempre lê dali. Calcular de novo baixa 2,2 GB e leva uns dois minutos:
  `uv run --group embeddings python -m rag_sem_misterio --embeddings`. O `fastembed` não devolve os vetores deste
  modelo com tamanho 1; `analise/embeddings.py` normaliza. Sem isso, o produto escalar favorece os pedaços curtos e
  a busca por significado sai muito pior (aconteceu na primeira versão).
- **Mudou o corpus, uma pergunta ou a divisão, rode os embeddings de novo**: as posições guardadas apontam para a
  lista de pedaços de cada tamanho. O teste em Python confere que os números batem.
- **O mapa e a busca sem o lugar** (`dados/manuais/mapa.csv` e `sem_lugar.csv`) saem do mesmo
  `--embeddings`, só no tamanho padrão (400 tokens). O mapa é uma análise de componentes principais dos vetores dos
  pedaços e guarda 24% das diferenças entre eles; o texto da figura diz isso. Sem o arquivo e os títulos, a busca por
  significado acerta 20 em vez de 27 das 32 perguntas (entre os 3 primeiros) e 10 em vez de 17 em primeiro; a por
  palavras, 25 em vez de 26. A parte 8, a lista "O que fazer com isso" e o resumo citam esses números (calculados).
- **O texto afirma coisas que dependem da medição**, no tamanho de 400 tokens e com os 3 primeiros: a busca por
  palavras ganha nas perguntas com as palavras do texto, a por significado nas com outras palavras, a híbrida não é
  a melhor em nenhum dos dois tipos e nunca deixa mais perguntas fora dos 10 primeiros que as outras. Cita a
  `FRED` e os `16 px` como perguntas em que a busca por significado erra. Se a medição mudar, releia as partes 4 e 5.
- **Da sessão real, só números**: `dados/manuais/sessao.json` (ferramentas pedidas e comandos com `grep`, `rg`,
  `find` ou `ls`), gerado por `--registro <sessão.jsonl>` a partir da mesma sessão dos posts 4 e 5.
- **Fontes conferidas em 24 e 25/10/2026**: o artigo da Anthropic sobre busca com contexto (200 mil tokens, 49% e
  67% menos falhas entre os 20 primeiros) e o resumo do Pragmatic Engineer de 04/03/2026 sobre o Claude Code (é o
  resumo de uma entrevista, e o texto diz).
- **O Cursor mudou de lado, e o texto conta isso.** Em 06/11/2025 ele publicou o ganho de 12,5% (de 6,5% a 23,5%)
  com a busca semântica junto com o grep; em 23/03/2026, o índice local para expressões regulares; e a documentação
  atual (`cursor.com/docs/agent/tools/search`, conferida em 25/10/2026) diz que ele não guarda embeddings do código
  para busca. A primeira versão do post dizia que o Cursor mantinha um índice de embeddings: estava errada.
- **Os projetos do Claude** ligam o modo RAG sozinhos quando os arquivos se aproximam do limite da janela (até 10
  vezes a capacidade, nos planos pagos). A Anthropic não diz o tamanho exato, e o texto não dá número. A frase de
  Boris Cherny que circula ("early versions of Claude Code used RAG + a local vector db") não foi achada na fonte
  original, e o texto não a cita.
- Preços conferidos em 22/10/2026 (`PRECOS_CONSULTADOS_EM` em `analise/exportar_site.py`), os da tabela comum.
