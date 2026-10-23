/**
 * De onde vêm os números do artigo. Cada parte cita as fontes (documentação, páginas de preço e pesquisas) e os
 * arquivos do repositório em que a conta está feita.
 */

import type { Link } from '#base/links.ts'

/** Os arquivos da análise apontam para o ramo principal do repositório. */
const RAIZ = 'https://github.com/igor-gregori/iblog/blob/main'
const REPOSITORIO = `${RAIZ}/posts/janela-de-contexto`

export const FONTES = {
  anthropicJanela: {
    nome: 'Janelas de contexto (Anthropic)',
    detalhe: 'o que conta na janela, o raciocínio que fica nela e a perda de precisão com o tamanho',
    url: 'https://platform.claude.com/docs/en/build-with-claude/context-windows',
  },
  anthropicModelos: {
    nome: 'Modelos da Anthropic',
    detalhe: 'janela e saída máxima de cada modelo Claude',
    url: 'https://platform.claude.com/docs/en/about-claude/models/overview',
  },
  anthropicPrecos: {
    nome: 'Preços da Anthropic',
    detalhe: 'a faixa de preço do Claude Haiku 5.5 para pedidos acima de 100 mil tokens',
    url: 'https://platform.claude.com/docs/en/about-claude/pricing',
  },
  openaiModelos: {
    nome: 'Modelos da OpenAI',
    detalhe: 'janela e saída máxima dos modelos GPT-6',
    url: 'https://developers.openai.com/api/docs/models',
  },
  openaiPrecos: {
    nome: 'Preços da OpenAI',
    detalhe: 'contexto curto (até 272 mil tokens de entrada) e longo',
    url: 'https://developers.openai.com/api/docs/pricing',
  },
  googleModelos: {
    nome: 'Modelos do Gemini (Google)',
    detalhe: 'limites de entrada e de saída de cada modelo',
    url: 'https://ai.google.dev/gemini-api/docs/models',
  },
  googlePrecos: {
    nome: 'Preços do Gemini (Google)',
    detalhe: 'entrada, cache e saída por milhão de tokens',
    url: 'https://ai.google.dev/gemini-api/docs/pricing',
  },
  transformer: {
    nome: 'Attention Is All You Need (2017)',
    detalhe: 'o artigo do Transformer: a atenção liga cada token a todos os outros',
    url: 'https://arxiv.org/abs/1706.03762',
  },
  engenhariaDeContexto: {
    nome: 'Effective context engineering for AI agents (Anthropic, 2025)',
    detalhe: 'o orçamento de atenção, a compactação, as notas fora do contexto e os subagentes',
    url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents',
  },
  lostInTheMiddle: {
    nome: 'Lost in the Middle (Liu e outros, 2023)',
    detalhe: 'a resposta no meio do contexto é a que o modelo mais erra',
    url: 'https://arxiv.org/abs/2307.03172',
  },
  ruler: {
    nome: 'RULER (Hsieh e outros, 2024)',
    detalhe: 'o tamanho que o modelo aguenta contra o tamanho anunciado, em 17 modelos',
    url: 'https://arxiv.org/abs/2404.06654',
  },
  nolima: {
    nome: 'NoLiMa (Modarressi e outros, 2025)',
    detalhe: 'achar a informação quando a pergunta não repete as palavras dela, em 13 modelos',
    url: 'https://arxiv.org/abs/2502.05167',
  },
  contextRot: {
    nome: 'Context Rot (Chroma, 2025)',
    detalhe: 'relatório técnico com 18 modelos: a qualidade cai com o tamanho, de forma desigual',
    url: 'https://www.trychroma.com/research/context-rot',
  },
  claudeCodeContexto: {
    nome: 'A janela de contexto no Claude Code',
    detalhe: 'quando a compactação roda, o que sobrevive a ela e o /context',
    url: 'https://code.claude.com/docs/en/context-window',
  },
  claudeCodeCustos: {
    nome: 'Custos no Claude Code',
    detalhe: '/clear, /compact com foco, subagentes e o CLAUDE.md curto',
    url: 'https://code.claude.com/docs/en/costs',
  },
  sessao: {
    nome: 'Registro de uma sessão do Claude Code',
    detalhe: 'do que era feito o pedido de cada chamada, só com os números',
    url: `${REPOSITORIO}/dados/manuais/composicao.csv`,
  },
} satisfies Record<string, Link>

export const ANALISE = {
  composicao: {
    nome: 'analise/composicao.py',
    detalhe: 'como o pedido de cada chamada é dividido por tipo',
    url: `${REPOSITORIO}/analise/composicao.py`,
  },
  calibracao: {
    nome: 'dados/manuais/calibracao.json',
    detalhe: 'o fator entre os dois tokenizadores e os números gerais da sessão',
    url: `${REPOSITORIO}/dados/manuais/calibracao.json`,
  },
  leitura: { nome: 'comum/claude_code.py', detalhe: 'a leitura do registro do Claude Code', url: `${RAIZ}/comum/claude_code.py` },
  precos: { nome: 'comum/precos.csv', detalhe: 'janelas, preços e faixas longas transcritos das páginas', url: `${RAIZ}/comum/precos.csv` },
  custo: { nome: 'comum/precos.py', detalhe: 'o custo de um pedido com a faixa longa', url: `${RAIZ}/comum/precos.py` },
} satisfies Record<string, Link>
