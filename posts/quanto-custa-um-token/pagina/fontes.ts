/**
 * De onde vêm os números do artigo. Cada parte cita as fontes (documentação e páginas de preço) e os arquivos do
 * repositório em que a conta está feita.
 */

import type { Link } from '#base/links.ts'

/** Os arquivos da análise apontam para o ramo principal do repositório. */
const REPOSITORIO = 'https://github.com/igor-gregori/iblog/blob/main/posts/quanto-custa-um-token'

export const FONTES = {
  tiktoken: {
    nome: 'tiktoken (OpenAI)',
    detalhe: 'a biblioteca e o tokenizador o200k_base, usados na análise em Python',
    url: 'https://github.com/openai/tiktoken',
  },
  gptTokenizer: {
    nome: 'gpt-tokenizer',
    detalhe: 'o mesmo tokenizador em JavaScript, usado nesta página',
    url: 'https://github.com/niieani/gpt-tokenizer',
  },
  anthropic: {
    nome: 'Preços da Anthropic',
    detalhe: 'Claude: entrada, cache e saída por milhão de tokens; nota sobre o tokenizador novo',
    url: 'https://platform.claude.com/docs/en/about-claude/pricing',
  },
  anthropicRaciocinio: {
    nome: 'Raciocínio no Claude (Anthropic)',
    detalhe: 'os tokens de raciocínio entram nos tokens de saída cobrados',
    url: 'https://platform.claude.com/docs/en/build-with-claude/extended-thinking',
  },
  openai: {
    nome: 'Preços da OpenAI',
    detalhe: 'GPT: entrada, entrada em cache e saída por milhão de tokens',
    url: 'https://developers.openai.com/api/docs/pricing',
  },
  openaiRaciocinio: {
    nome: 'Modelos de raciocínio (OpenAI)',
    detalhe: 'os tokens de raciocínio são cobrados como saída',
    url: 'https://developers.openai.com/api/docs/guides/reasoning',
  },
  google: {
    nome: 'Preços do Gemini (Google)',
    detalhe: 'Gemini: entrada, cache e saída (com raciocínio) por milhão de tokens',
    url: 'https://ai.google.dev/gemini-api/docs/pricing',
  },
} satisfies Record<string, Link>

export const ANALISE = {
  tokens: { nome: 'analise/tokens.py', detalhe: 'a contagem e a quebra em pedaços, em Python', url: `${REPOSITORIO}/analise/tokens.py` },
  tokensPagina: { nome: 'pagina/tokens.ts', detalhe: 'a mesma contagem no navegador', url: `${REPOSITORIO}/pagina/tokens.ts` },
  amostras: { nome: 'As amostras', detalhe: 'os textos medidos na parte 2', url: `${REPOSITORIO}/dados/manuais/amostras/texto-pt.txt` },
  amostrasPy: { nome: 'analise/amostras.py', detalhe: 'como as cinco amostras são montadas', url: `${REPOSITORIO}/analise/amostras.py` },
  precos: { nome: 'dados/manuais/precos.csv', detalhe: 'os preços transcritos das páginas dos fornecedores', url: `${REPOSITORIO}/dados/manuais/precos.csv` },
  custos: { nome: 'analise/custos.py', detalhe: 'a conta do custo de um pedido', url: `${REPOSITORIO}/analise/custos.py` },
} satisfies Record<string, Link>
