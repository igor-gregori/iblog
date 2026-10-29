/**
 * De onde vêm os números do artigo. Cada parte cita as fontes (documentação e páginas de preço) e os arquivos do
 * repositório em que a conta está feita.
 */

import type { Link } from '#base/links.ts'

/** Os arquivos da análise apontam para o ramo principal do repositório. */
const RAIZ = 'https://github.com/igor-gregori/iblog/blob/main'
const REPOSITORIO = `${RAIZ}/posts/memoria-de-ia`

export const FONTES = {
  claudeCodeMemoria: {
    nome: 'Como o Claude se lembra do seu projeto (Claude Code)',
    detalhe: 'onde ficam os CLAUDE.md, quando entram no pedido, a memória automática e o tamanho recomendado',
    url: 'https://code.claude.com/docs/en/memory',
  },
  claudeCodeContexto: {
    nome: 'A janela de contexto no Claude Code',
    detalhe: 'o que volta depois da compactação',
    url: 'https://code.claude.com/docs/en/context-window',
  },
  claudeMemoria: {
    nome: 'Busca nas conversas e memória (Claude)',
    detalhe: 'a memória em tópicos, a memória por projeto e a busca nas conversas antigas',
    url: 'https://support.claude.com/en/articles/11817273-using-claude-s-chat-search-and-memory-to-build-on-previous-context',
  },
  chatgptMemoria: {
    nome: 'Memória no ChatGPT (OpenAI)',
    detalhe: 'as memórias salvas e a referência ao histórico de conversas',
    url: 'https://help.openai.com/en/articles/8590148-memory-faq',
  },
  ferramentaDeMemoria: {
    nome: 'A ferramenta de memória (API da Anthropic)',
    detalhe: 'o modelo pede para ler e escrever arquivos numa pasta /memories, e o seu programa guarda',
    url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool',
  },
  anthropicPrecos: {
    nome: 'Preços da Anthropic',
    detalhe: 'entrada, leitura e gravação no cache (5 minutos e 1 hora) e saída',
    url: 'https://platform.claude.com/docs/en/about-claude/pricing',
  },
  openaiPrecos: {
    nome: 'Preços da OpenAI',
    detalhe: 'entrada, cache e saída por milhão de tokens',
    url: 'https://developers.openai.com/api/docs/pricing',
  },
  googlePrecos: {
    nome: 'Preços do Gemini (Google)',
    detalhe: 'entrada, cache e saída por milhão de tokens',
    url: 'https://ai.google.dev/gemini-api/docs/pricing',
  },
  sessao: {
    nome: 'A memória numa sessão do Claude Code',
    detalhe: 'cada chamada da sessão real, com o uso do cache e quanto era CLAUDE.md, só os números',
    url: `${REPOSITORIO}/dados/manuais/pedidos.csv`,
  },
  cargas: {
    nome: 'Os CLAUDE.md que entraram na sessão',
    detalhe: 'em que chamada, por que e com quantos tokens',
    url: `${REPOSITORIO}/dados/manuais/cargas.csv`,
  },
  historico: {
    nome: 'Os CLAUDE.md deste blog, dia a dia',
    detalhe: 'linhas e tokens no histórico do git',
    url: `${REPOSITORIO}/dados/manuais/historico.csv`,
  },
  automatica: {
    nome: 'A memória automática numa máquina',
    detalhe: 'quantas memórias o agente escreveu, por tipo, sem os textos',
    url: `${REPOSITORIO}/dados/manuais/memoria_automatica.json`,
  },
} satisfies Record<string, Link>

export const ANALISE = {
  sessao: {
    nome: 'analise/sessao.py',
    detalhe: 'as cargas de CLAUDE.md e a parte da memória em cada pedido',
    url: `${REPOSITORIO}/analise/sessao.py`,
  },
  calibracao: {
    nome: 'dados/manuais/calibracao.json',
    detalhe: 'o fator entre os dois tokenizadores na sessão real',
    url: `${REPOSITORIO}/dados/manuais/calibracao.json`,
  },
  historico: { nome: 'analise/historico.py', detalhe: 'os CLAUDE.md medidos pelo git', url: `${REPOSITORIO}/analise/historico.py` },
  automatica: {
    nome: 'analise/automatica.py',
    detalhe: 'a contagem da memória automática',
    url: `${REPOSITORIO}/analise/automatica.py`,
  },
  conta: { nome: 'analise/conta.py', detalhe: 'o custo da memória, repetido em pagina/conta.ts', url: `${REPOSITORIO}/analise/conta.py` },
  leitura: {
    nome: 'comum/claude_code.py',
    detalhe: 'a leitura do registro do Claude Code e a calibração',
    url: `${RAIZ}/comum/claude_code.py`,
  },
  contagem: { nome: 'comum/tokens.py', detalhe: 'a contagem com o o200k_base', url: `${RAIZ}/comum/tokens.py` },
  precos: { nome: 'comum/precos.csv', detalhe: 'os preços transcritos das páginas', url: `${RAIZ}/comum/precos.csv` },
} satisfies Record<string, Link>
