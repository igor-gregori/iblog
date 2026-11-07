/**
 * De onde vêm os números do artigo. Cada parte cita as fontes (documentação e páginas de preço) e os arquivos do
 * repositório em que a medição e a análise estão.
 */

import type { Link } from '#base/links.ts'

/** Os arquivos da análise apontam para o ramo principal do repositório. */
const RAIZ = 'https://github.com/igor-gregori/iblog/blob/main'
const ARVORE = 'https://github.com/igor-gregori/iblog/tree/main'
const REPOSITORIO = `${RAIZ}/posts/especificacao-antes-do-codigo`

export const FONTES = {
  kiro: {
    nome: 'Specs (Kiro)',
    detalhe: 'os três arquivos de uma spec, as fases, a revisão entre elas e a notação EARS',
    url: 'https://kiro.dev/docs/specs/',
  },
  kiroFuncionalidade: {
    nome: 'Feature Specs (Kiro)',
    detalhe: 'requirements.md em EARS, e os fluxos que começam pelos requisitos ou pelo desenho',
    url: 'https://kiro.dev/docs/specs/feature-specs/',
  },
  specKit: {
    nome: 'Spec Kit (GitHub)',
    detalhe: 'os comandos specify, plan, tasks e implement',
    url: 'https://github.com/github/spec-kit',
  },
  specKitBlog: {
    nome: 'Spec-driven development with AI (blog do GitHub)',
    detalhe: 'a especificação como contrato, o "o quê" separado do "como"',
    url: 'https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/',
  },
  modoDePlano: {
    nome: 'Modos de permissão (Claude Code)',
    detalhe: 'o modo de plano: lê, planeja e não edita até o plano ser aprovado',
    url: 'https://code.claude.com/docs/en/permission-modes',
  },
  anthropicPrecos: {
    nome: 'Preços da Anthropic',
    detalhe: 'entrada, leitura e gravação no cache (5 minutos e 1 hora) e saída',
    url: 'https://platform.claude.com/docs/en/about-claude/pricing',
  },
  execucoes: {
    nome: 'As 27 execuções',
    detalhe: 'um arquivo de números por execução, com o diff da entrega e o do fim',
    url: `${ARVORE}/posts/especificacao-antes-do-codigo/dados/execucoes`,
  },
  primeiroLote: {
    nome: 'O primeiro lote de A e B',
    detalhe: 'as 18 execuções com a mensagem de correção antiga',
    url: `${ARVORE}/posts/especificacao-antes-do-codigo/dados/execucoes/primeiro-lote`,
  },
  diffDoCupom: {
    nome: 'A entrega de um pedido solto do cupom',
    detalhe: 'o código que o agente escreveu na primeira execução de A',
    url: `${REPOSITORIO}/dados/execucoes/m-cupom-A-1.entrega.diff`,
  },
  diffDoPlano: {
    nome: 'A entrega de um plano antes do cupom',
    detalhe: 'o código e os testes que o agente escreveu na primeira execução de B',
    url: `${REPOSITORIO}/dados/execucoes/m-cupom-B-1.entrega.diff`,
  },
} satisfies Record<string, Link>

export const ANALISE = {
  projeto: {
    nome: 'kit/projeto',
    detalhe: 'a API de exemplo, congelada, com o CLAUDE.md dela',
    url: `${ARVORE}/kit/projeto`,
  },
  tarefas: {
    nome: 'kit/tarefas',
    detalhe: 'o pedido, a especificação, os testes escondidos e a solução de referência de cada tarefa',
    url: `${ARVORE}/kit/tarefas`,
  },
  kit: {
    nome: 'comum/kit.py',
    detalhe: 'roda o Claude Code numa cópia limpa, os testes, as correções, e lê o registro da sessão',
    url: `${RAIZ}/comum/kit.py`,
  },
  plano: {
    nome: 'planos/kit-de-medicao.md',
    detalhe: 'o desenho do experimento, as decisões e o que o piloto corrigiu',
    url: `${RAIZ}/planos/kit-de-medicao.md`,
  },
  regras: {
    nome: 'analise/regras.py',
    detalhe: 'a classificação de cada regra pelo tipo de decisão',
    url: `${REPOSITORIO}/analise/regras.py`,
  },
  exportar: {
    nome: 'analise/exportar_site.py',
    detalhe: 'o resumo por tarefa e jeito de pedir',
    url: `${REPOSITORIO}/analise/exportar_site.py`,
  },
  precos: { nome: 'comum/precos.csv', detalhe: 'os preços transcritos das páginas', url: `${RAIZ}/comum/precos.csv` },
} satisfies Record<string, Link>
