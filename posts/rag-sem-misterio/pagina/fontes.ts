/**
 * De onde vêm os números do artigo. Cada parte cita as fontes (artigos, documentação e relatos) e os arquivos do
 * repositório em que a conta está feita.
 */

import type { Link } from '#base/links.ts'

/** Os arquivos da análise apontam para o ramo principal do repositório. */
const RAIZ = 'https://github.com/igor-gregori/iblog/blob/main'
const REPOSITORIO = `${RAIZ}/posts/rag-sem-misterio`

export const FONTES = {
  rag: {
    nome: 'Retrieval-Augmented Generation (Lewis e outros, 2020)',
    detalhe: 'o artigo que deu o nome: um buscador entrega trechos e um modelo escreve a resposta a partir deles',
    url: 'https://arxiv.org/abs/2005.11401',
  },
  contextualRetrieval: {
    nome: 'Introducing Contextual Retrieval (Anthropic, 2024)',
    detalhe: 'a base pequena que cabe no pedido, o BM25 junto com os embeddings e as falhas de busca medidas',
    url: 'https://www.anthropic.com/news/contextual-retrieval',
  },
  bm25: {
    nome: 'The Probabilistic Relevance Framework: BM25 and Beyond (Robertson e Zaragoza, 2009)',
    detalhe: 'a conta do BM25 e os parâmetros k1 e b',
    url: 'https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf',
  },
  rrf: {
    nome: 'Reciprocal Rank Fusion (Cormack, Clarke e Büttcher, 2009)',
    detalhe: 'juntar listas pela posição, com a constante 60',
    url: 'https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf',
  },
  e5: {
    nome: 'Multilingual E5 Text Embeddings (Wang e outros, 2024)',
    detalhe: 'o modelo de embeddings usado aqui, aberto e treinado em mais de cem línguas',
    url: 'https://arxiv.org/abs/2402.05672',
  },
  e5Modelo: {
    nome: 'intfloat/multilingual-e5-large (Hugging Face)',
    detalhe: 'os pesos do modelo e os prefixos "query:" e "passage:"',
    url: 'https://huggingface.co/intfloat/multilingual-e5-large',
  },
  fastembed: {
    nome: 'FastEmbed (Qdrant)',
    detalhe: 'a biblioteca que roda o modelo de embeddings na máquina, sem API',
    url: 'https://github.com/qdrant/fastembed',
  },
  anthropicEmbeddings: {
    nome: 'Embeddings (Anthropic)',
    detalhe: 'a Anthropic não tem modelo de embeddings e indica o da Voyage AI; cosseno e produto escalar',
    url: 'https://platform.claude.com/docs/en/build-with-claude/embeddings',
  },
  claudeCode: {
    nome: 'Como o Claude Code funciona',
    detalhe: 'as ferramentas de busca (padrão de nome e expressão regular) e o CLAUDE.md lido em toda sessão',
    url: 'https://code.claude.com/docs/en/how-claude-code-works',
  },
  pragmatic: {
    nome: 'Building Claude Code with Boris Cherny (The Pragmatic Engineer, 2026)',
    detalhe: 'o Claude Code testou índices de vetores e ficou com glob e grep comandados pelo modelo',
    url: 'https://newsletter.pragmaticengineer.com/p/building-claude-code-with-boris-cherny',
  },
  cursor: {
    nome: 'Improving agent with semantic search (Cursor, 2025)',
    detalhe: 'o agente do Cursor com busca semântica e grep juntos, medido pela própria empresa',
    url: 'https://cursor.com/blog/semsearch',
  },
  cursorRegex: {
    nome: 'Fast regex search: indexing text for agent tools (Cursor, 2026)',
    detalhe: 'um índice local para o agente buscar por expressão regular, que precisa estar sempre atualizado',
    url: 'https://cursor.com/blog/fast-regex-search',
  },
  cursorBusca: {
    nome: 'Search (documentação do Cursor)',
    detalhe: 'o agente busca com o Instant Grep e um subagente; o Cursor não guarda embeddings do código para busca',
    url: 'https://cursor.com/docs/agent/tools/search',
  },
  claudeProjetos: {
    nome: 'RAG for Projects (Claude)',
    detalhe: 'os projetos do Claude ligam a busca sozinhos quando os arquivos se aproximam do limite da janela',
    url: 'https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects',
  },
  openaiFileSearch: {
    nome: 'File search (OpenAI)',
    detalhe: 'busca por significado e por palavras em arquivos enviados, como ferramenta hospedada',
    url: 'https://developers.openai.com/api/docs/guides/tools-file-search',
  },
  geminiFileSearch: {
    nome: 'File Search (Gemini API)',
    detalhe: 'divide, gera os embeddings e indexa os arquivos; paga a indexação, guardar é grátis',
    url: 'https://ai.google.dev/gemini-api/docs/file-search',
  },
  anthropicResultados: {
    nome: 'Search results (Anthropic)',
    detalhe: 'os resultados da sua busca entram no pedido, ou voltam de uma ferramenta, e o Claude cita a fonte',
    url: 'https://platform.claude.com/docs/en/build-with-claude/search-results',
  },
  sessao: {
    nome: 'Registro de uma sessão do Claude Code',
    detalhe: 'as ferramentas que o agente pediu, só com os números',
    url: `${REPOSITORIO}/dados/manuais/sessao.json`,
  },
} satisfies Record<string, Link>

export const ANALISE = {
  corpus: {
    nome: 'dados/corpus',
    detalhe: 'a cópia dos documentos do iblog em que a busca procura, feita em 24/10/2026',
    url: `${REPOSITORIO}/dados/corpus/iblog__CLAUDE.md`,
  },
  pedacos: { nome: 'analise/pedacos.py', detalhe: 'a divisão dos documentos em pedaços', url: `${REPOSITORIO}/analise/pedacos.py` },
  pedacosTs: { nome: 'pagina/pedacos.ts', detalhe: 'a mesma divisão, em TypeScript', url: `${REPOSITORIO}/pagina/pedacos.ts` },
  busca: { nome: 'analise/busca.py', detalhe: 'o BM25, o cosseno e a fusão das listas', url: `${REPOSITORIO}/analise/busca.py` },
  buscaTs: { nome: 'pagina/busca.ts', detalhe: 'as mesmas contas, em TypeScript, rodando nesta página', url: `${REPOSITORIO}/pagina/busca.ts` },
  embeddings: { nome: 'analise/embeddings.py', detalhe: 'os embeddings calculados na máquina', url: `${REPOSITORIO}/analise/embeddings.py` },
  semLugar: {
    nome: 'dados/manuais/sem_lugar.csv',
    detalhe: 'a busca por significado com só o texto do pedaço, sem o arquivo e os títulos',
    url: `${REPOSITORIO}/dados/manuais/sem_lugar.csv`,
  },
  mapa: {
    nome: 'dados/manuais/mapa.csv',
    detalhe: 'os pedaços projetados num plano, a partir dos vetores',
    url: `${REPOSITORIO}/dados/manuais/mapa.csv`,
  },
  similaridades: {
    nome: 'dados/manuais/similaridades.csv',
    detalhe: 'os pedaços mais parecidos com cada pergunta, em cada tamanho',
    url: `${REPOSITORIO}/dados/manuais/similaridades.csv`,
  },
  perguntas: {
    nome: 'dados/manuais/perguntas.csv',
    detalhe: 'as perguntas de teste e o trecho que responde cada uma',
    url: `${REPOSITORIO}/dados/manuais/perguntas.csv`,
  },
  contagem: { nome: 'analise/sessao.py', detalhe: 'a contagem das buscas na sessão real', url: `${REPOSITORIO}/analise/sessao.py` },
  leitura: { nome: 'comum/claude_code.py', detalhe: 'a leitura do registro do Claude Code', url: `${RAIZ}/comum/claude_code.py` },
  precos: { nome: 'comum/precos.csv', detalhe: 'preços de entrada, cache e saída de cada modelo', url: `${RAIZ}/comum/precos.csv` },
  custo: { nome: 'comum/precos.py', detalhe: 'o custo de um pedido', url: `${RAIZ}/comum/precos.py` },
} satisfies Record<string, Link>
