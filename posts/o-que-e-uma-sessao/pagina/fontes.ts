/**
 * De onde vêm os números do artigo. Cada parte cita as fontes (documentação e páginas de preço) e os arquivos do
 * repositório em que a conta está feita.
 */

import type { Link } from '#base/links.ts'

/** Os arquivos da análise apontam para o ramo principal do repositório. */
const RAIZ = 'https://github.com/igor-gregori/iblog/blob/main'
const REPOSITORIO = `${RAIZ}/posts/o-que-e-uma-sessao`

export const FONTES = {
  anthropicCache: {
    nome: 'Cache de prompt (Anthropic)',
    detalhe: 'prazos de 5 minutos e 1 hora, o que invalida o cache e a ordem ferramentas, instruções e mensagens',
    url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching',
  },
  anthropic: {
    nome: 'Preços da Anthropic',
    detalhe: 'Claude: entrada, gravação no cache, leitura do cache e saída por milhão de tokens',
    url: 'https://platform.claude.com/docs/en/about-claude/pricing',
  },
  openaiCache: {
    nome: 'Cache de prompt (OpenAI)',
    detalhe: 'cache automático, prazos de 30 minutos e 12 horas e o preço da gravação',
    url: 'https://developers.openai.com/api/docs/guides/prompt-caching',
  },
  openai: {
    nome: 'Preços da OpenAI',
    detalhe: 'GPT: entrada, entrada em cache, gravação e saída por milhão de tokens',
    url: 'https://developers.openai.com/api/docs/pricing',
  },
  openaiEstado: {
    nome: 'Estado da conversa (OpenAI)',
    detalhe: 'mesmo guardando a conversa no servidor, os tokens anteriores são cobrados como entrada',
    url: 'https://developers.openai.com/api/docs/guides/conversation-state',
  },
  googleCache: {
    nome: 'Cache de contexto (Google)',
    detalhe: 'o cache implícito do Gemini, ligado por padrão, e o tamanho mínimo',
    url: 'https://ai.google.dev/gemini-api/docs/caching',
  },
  google: {
    nome: 'Preços do Gemini (Google)',
    detalhe: 'Gemini: entrada, cache e saída por milhão de tokens',
    url: 'https://ai.google.dev/gemini-api/docs/pricing',
  },
  claudeCode: {
    nome: 'Registro de uma sessão do Claude Code',
    detalhe: 'o uso de tokens de cada chamada, extraído só com os números',
    url: `${REPOSITORIO}/dados/manuais/sessao-real.csv`,
  },
} satisfies Record<string, Link>

export const ANALISE = {
  pilha: { nome: 'pagina/tarefa.ts', detalhe: 'os blocos e os tamanhos da tarefa da parte 1', url: `${REPOSITORIO}/pagina/tarefa.ts` },
  sessao: { nome: 'analise/sessao.py', detalhe: 'a conta de uma sessão, com e sem cache', url: `${REPOSITORIO}/analise/sessao.py` },
  sessaoPagina: { nome: 'pagina/sessao.ts', detalhe: 'a mesma conta no navegador', url: `${REPOSITORIO}/pagina/sessao.ts` },
  registro: { nome: 'analise/registro.py', detalhe: 'como o uso de tokens sai do registro do Claude Code', url: `${REPOSITORIO}/analise/registro.py` },
  precos: { nome: 'comum/precos.csv', detalhe: 'os preços transcritos das páginas dos fornecedores', url: `${RAIZ}/comum/precos.csv` },
} satisfies Record<string, Link>
