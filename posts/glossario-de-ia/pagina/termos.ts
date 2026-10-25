// Os termos do glossário. Cada um aponta para a parte de um post da série que o explica; `testes/termos.test.ts`
// confere que o post e a parte existem. Post novo da série: acrescente aqui os termos dele, e o post em POSTS.

/** Os posts da série que o glossário cita: o número no `assunto` do `post.json` e o título curto. */
export const POSTS = {
  'modelo-agente-harness': { numero: 1, titulo: 'Modelo, agente e harness' },
  'como-um-modelo-e-treinado': { numero: 2, titulo: 'Como um modelo é treinado' },
  'quanto-custa-um-token': { numero: 3, titulo: 'O que é um token' },
  'o-que-e-uma-sessao': { numero: 4, titulo: 'O que é uma sessão' },
  'janela-de-contexto': { numero: 5, titulo: 'A janela de contexto' },
  'rag-sem-misterio': { numero: 7, titulo: 'RAG sem mistério' },
} as const

export type Post = keyof typeof POSTS

export interface Termo {
  /** A âncora do termo na página (`/glossario-de-ia/#cache-de-prompt`). */
  id: string
  nome: string
  /** Como o termo aparece em inglês, na documentação e nas ferramentas, quando é diferente. */
  ingles?: string
  /** Uma ou duas frases, para quem programa. */
  definicao: string
  /** A parte do post que aprofunda o termo: o id dela no `PARTES` do post. */
  post: Post
  parte: string
}

export const TERMOS: Termo[] = [
  {
    id: 'modelo',
    nome: 'Modelo',
    ingles: 'model, LLM',
    definicao:
      'Uma função que recebe texto e devolve texto, um token por vez. Não lembra de nada entre chamadas, não lê arquivos nem roda comandos: só escreve.',
    post: 'modelo-agente-harness',
    parte: 'modelo',
  },
  {
    id: 'harness',
    nome: 'Harness',
    definicao:
      'O programa em volta do modelo, como o Claude Code, o Cursor ou o Codex. Monta o pedido, executa as ferramentas que o modelo pede, aplica as permissões e guarda a sessão.',
    post: 'modelo-agente-harness',
    parte: 'harness',
  },
  {
    id: 'agente',
    nome: 'Agente',
    ingles: 'agent',
    definicao:
      'O modelo e o harness num laço: o modelo pede uma ferramenta, o harness executa e devolve o resultado, e o modelo é chamado de novo, até responder sem pedir nada.',
    post: 'modelo-agente-harness',
    parte: 'agente',
  },
  {
    id: 'ferramenta',
    nome: 'Ferramenta',
    ingles: 'tool, tool use',
    definicao:
      'Uma ação que o harness oferece ao modelo, descrita com nome e parâmetros (ler arquivo, rodar comando). O modelo só escreve o pedido estruturado; quem executa é o harness.',
    post: 'modelo-agente-harness',
    parte: 'agente',
  },
  {
    id: 'permissoes',
    nome: 'Permissões',
    ingles: 'permissions',
    definicao:
      'As regras do harness sobre o que roda direto, o que pede a sua confirmação e o que é proibido. São configuração do harness, não do modelo.',
    post: 'modelo-agente-harness',
    parte: 'harness',
  },
  {
    id: 'claude-md',
    nome: 'CLAUDE.md',
    ingles: 'AGENTS.md, rules',
    definicao:
      'Um arquivo de instruções do projeto que o harness põe no pedido no começo de cada sessão. Como ele é relido do disco, é o lugar das decisões que precisam durar.',
    post: 'janela-de-contexto',
    parte: 'compactacao',
  },
  {
    id: 'pesos',
    nome: 'Pesos',
    ingles: 'weights, parameters',
    definicao:
      'Os bilhões de números que definem o que o modelo faz. O treino encontra os valores; depois disso eles ficam congelados, e é por isso que o modelo não aprende com o uso.',
    post: 'como-um-modelo-e-treinado',
    parte: 'pesos',
  },
  {
    id: 'pre-treino',
    nome: 'Pré-treino',
    ingles: 'pre-training',
    definicao:
      'A primeira etapa do treino, e a mais cara: prever o próximo token em uma quantidade enorme de texto e código. Dá o conhecimento e a preferência pelo que é popular.',
    post: 'como-um-modelo-e-treinado',
    parte: 'pre-treino',
  },
  {
    id: 'modelo-base',
    nome: 'Modelo base',
    ingles: 'base model',
    definicao:
      'O resultado do pré-treino: completa texto muito bem, mas não conversa. Vira assistente com o ajuste fino.',
    post: 'como-um-modelo-e-treinado',
    parte: 'pre-treino',
  },
  {
    id: 'data-de-corte',
    nome: 'Data de corte',
    ingles: 'knowledge cutoff',
    definicao:
      'Até quando foi coletado o texto do treino. O que saiu depois, como a versão nova de uma biblioteca, o modelo não conhece, a não ser que venha no pedido.',
    post: 'como-um-modelo-e-treinado',
    parte: 'pre-treino',
  },
  {
    id: 'alucinacao',
    nome: 'Alucinação',
    ingles: 'hallucination',
    definicao:
      'Quando o modelo inventa algo que parece certo, como um método que não existe. Ele escreve o que é provável naquele lugar, e provável não é o mesmo que certo.',
    post: 'como-um-modelo-e-treinado',
    parte: 'pre-treino',
  },
  {
    id: 'ajuste-fino',
    nome: 'Ajuste fino',
    ingles: 'fine-tuning, SFT',
    definicao:
      'A etapa que ensina o modelo base a ser assistente, com conversas de exemplo. É dela que vêm os papéis de sistema, usuário e assistente e o formato dos pedidos de ferramenta.',
    post: 'como-um-modelo-e-treinado',
    parte: 'ajuste-fino',
  },
  {
    id: 'aprendizado-por-reforco',
    nome: 'Aprendizado por reforço',
    ingles: 'reinforcement learning, RL',
    definicao:
      'O modelo gera várias respostas, cada uma ganha uma nota, e os pesos mudam para favorecer as de nota alta. A nota vem de preferências de pessoas ou de uma verificação, como testes passando.',
    post: 'como-um-modelo-e-treinado',
    parte: 'reforco',
  },
  {
    id: 'rlhf',
    nome: 'RLHF',
    ingles: 'reinforcement learning from human feedback',
    definicao:
      'Aprendizado por reforço em que a nota vem de pessoas comparando respostas, por meio de um segundo modelo treinado com essas comparações. É a técnica do InstructGPT, o antecessor do ChatGPT.',
    post: 'como-um-modelo-e-treinado',
    parte: 'reforco',
  },
  {
    id: 'reward-hacking',
    nome: 'Reward hacking',
    definicao:
      'Quando o modelo aprende a fazer a verificação passar sem resolver o problema. No dia a dia, é o agente que muda o teste em vez do código.',
    post: 'como-um-modelo-e-treinado',
    parte: 'reforco',
  },
  {
    id: 'bajulacao',
    nome: 'Bajulação',
    ingles: 'sycophancy',
    definicao:
      'A tendência de concordar com quem pergunta, aprendida porque pessoas preferem respostas que concordam com elas.',
    post: 'como-um-modelo-e-treinado',
    parte: 'reforco',
  },
  {
    id: 'raciocinio',
    nome: 'Raciocínio',
    ingles: 'reasoning, thinking',
    definicao:
      'O texto que o modelo escreve antes de responder, conferindo o próprio trabalho. Vem do aprendizado por reforço, é cobrado como saída mesmo quando você não o vê e, nos modelos novos da Anthropic, continua no contexto.',
    post: 'como-um-modelo-e-treinado',
    parte: 'reforco',
  },
  {
    id: 'token',
    nome: 'Token',
    definicao:
      'O pedaço de texto que o modelo lê e escreve: uma palavra curta, parte de uma palavra, um sinal ou um espaço. Tudo é medido e cobrado em tokens.',
    post: 'quanto-custa-um-token',
    parte: 'pedaco',
  },
  {
    id: 'tokenizador',
    nome: 'Tokenizador',
    ingles: 'tokenizer',
    definicao:
      'O que quebra o texto em tokens, a partir de um vocabulário fixo. Cada fornecedor tem o seu, e o mesmo texto dá números diferentes em cada um.',
    post: 'quanto-custa-um-token',
    parte: 'pedaco',
  },
  {
    id: 'entrada-e-saida',
    nome: 'Entrada e saída',
    ingles: 'input, output tokens',
    definicao:
      'A fatura separa o que você manda (entrada) do que o modelo escreve (saída). O token de saída custa várias vezes o de entrada.',
    post: 'quanto-custa-um-token',
    parte: 'fatura',
  },
  {
    id: 'sessao',
    nome: 'Sessão',
    ingles: 'session, conversation',
    definicao:
      'A conversa que o harness guarda e remonta a cada chamada. A API não guarda nada: cada chamada leva o histórico inteiro, e por isso cada passo custa mais que o anterior.',
    post: 'o-que-e-uma-sessao',
    parte: 'sem-memoria',
  },
  {
    id: 'cache-de-prompt',
    nome: 'Cache de prompt',
    ingles: 'prompt caching',
    definicao:
      'O fornecedor guarda as contas do começo de um pedido e as reaproveita quando o pedido seguinte começa igual. A parte lida do cache sai bem mais barata; gravar pode custar mais que a entrada normal.',
    post: 'o-que-e-uma-sessao',
    parte: 'cache',
  },
  {
    id: 'prazo-do-cache',
    nome: 'Prazo do cache',
    ingles: 'TTL',
    definicao:
      'Quanto tempo o cache dura sem ser usado: 5 minutos ou 1 hora na Anthropic, 30 minutos ou 12 horas na OpenAI. Uma pausa maior que o prazo faz a chamada seguinte gravar tudo de novo.',
    post: 'o-que-e-uma-sessao',
    parte: 'cache',
  },
  {
    id: 'janela-de-contexto',
    nome: 'Janela de contexto',
    ingles: 'context window',
    definicao:
      'O tamanho máximo de uma chamada, contando o pedido e a resposta. Nos modelos de ponta, cerca de 1 milhão de tokens.',
    post: 'janela-de-contexto',
    parte: 'janela',
  },
  {
    id: 'transformer',
    nome: 'Transformer',
    definicao:
      'A arquitetura dos modelos atuais. Cada token do contexto é comparado com todos os outros, e por isso dobrar o contexto quadruplica a conta.',
    post: 'janela-de-contexto',
    parte: 'janela',
  },
  {
    id: 'context-rot',
    nome: 'Context rot',
    definicao:
      'A perda de qualidade conforme o contexto cresce, bem antes do limite da janela: o modelo acha pior a informação e segue pior as instruções.',
    post: 'janela-de-contexto',
    parte: 'caber',
  },
  {
    id: 'faixa-de-contexto-longo',
    nome: 'Faixa de contexto longo',
    ingles: 'long context pricing',
    definicao:
      'Preço mais alto para pedidos acima de um tamanho, cobrado sobre o pedido inteiro: acima de 100 mil tokens no Claude Haiku 5.5 e de 272 mil nos modelos GPT-6.',
    post: 'janela-de-contexto',
    parte: 'custo',
  },
  {
    id: 'compactacao',
    nome: 'Compactação',
    ingles: 'compaction, /compact',
    definicao:
      'Trocar a conversa por um resumo quando a janela enche, ou quando você pede. O que não estava escrito num arquivo pode ficar de fora, e é aí que o agente esquece.',
    post: 'janela-de-contexto',
    parte: 'compactacao',
  },
  {
    id: 'subagente',
    nome: 'Subagente',
    ingles: 'subagent',
    definicao:
      'Um agente chamado por outro, com a própria janela de contexto. Faz o trabalho pesado (uma pesquisa grande, por exemplo) e devolve só um resumo.',
    post: 'janela-de-contexto',
    parte: 'na-pratica',
  },
  {
    id: 'rag',
    nome: 'RAG',
    ingles: 'retrieval-augmented generation',
    definicao:
      'Buscar os trechos que parecem responder a pergunta e pô-los no pedido antes de chamar o modelo. Quem busca é o programa; o modelo só lê o que veio.',
    post: 'rag-sem-misterio',
    parte: 'o-que-e',
  },
  {
    id: 'pedaco',
    nome: 'Pedaço',
    ingles: 'chunk, chunking',
    definicao:
      'Cada parte em que os documentos são divididos para a busca. Pedaço pequeno é preciso, mas perde o contexto; pedaço grande leva o contexto, mas mistura assuntos.',
    post: 'rag-sem-misterio',
    parte: 'pedacos',
  },
  {
    id: 'bm25',
    nome: 'BM25',
    definicao:
      'A conta clássica da busca por palavras: o pedaço sobe quando tem as palavras da pergunta, mais ainda as raras, com um desconto pelo tamanho. Acha o termo exato, mas não o sinônimo.',
    post: 'rag-sem-misterio',
    parte: 'palavras',
  },
  {
    id: 'embedding',
    nome: 'Embedding',
    ingles: 'embedding, vector',
    definicao:
      'Uma lista de números que um modelo calcula para um texto, de modo que textos de sentido parecido deem vetores apontando para o mesmo lado. A busca por significado compara esses vetores pelo cosseno.',
    post: 'rag-sem-misterio',
    parte: 'significado',
  },
  {
    id: 'busca-hibrida',
    nome: 'Busca híbrida',
    ingles: 'hybrid search, reciprocal rank fusion',
    definicao:
      'Rodar a busca por palavras e a por significado e juntar as duas listas, em geral pela posição de cada pedaço em cada uma.',
    post: 'rag-sem-misterio',
    parte: 'hibrida',
  },
  {
    id: 'busca-agentica',
    nome: 'Busca agêntica',
    ingles: 'agentic search',
    definicao:
      'O próprio agente procura, com ferramentas como grep e glob: lê o resultado e procura de novo, sem índice. É como o Claude Code acha as coisas no código.',
    post: 'rag-sem-misterio',
    parte: 'sem-rag',
  },
]
