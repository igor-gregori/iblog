export interface Post {
  /** O caminho do post no blog: posts.igreg.dev/<slug>/ */
  slug: string
  titulo: string
  /** A linha pequena acima do título. */
  assunto: string
  resumo: string
  /** Mês de publicação, no formato AAAA-MM. */
  data: string
  /** A pasta da página (um projeto Vite), relativa à raiz deste repositório. */
  origem: string
}

// A lista da capa, do mais novo para o mais antigo. Cada post continua no próprio repositório;
// `npm run build` compila a página de cada um para dentro de dist/<slug>/.
export const POSTS: Post[] = [
  {
    slug: 'juros-negativos',
    titulo: 'O juro é negativo?',
    assunto: 'Juros, moeda e inflação',
    resumo:
      'Em 2022, o Trezoitão escreveu que, desde 2008, nenhum investimento tradicional rende mais que a “inflação real”, o crescimento do dinheiro em circulação. As contas dele refeitas com dados públicos, afirmação por afirmação, com um veredito para cada uma e uma calculadora.',
    data: '2026-10',
    origem: '../juro-negativo/site',
  },
  {
    slug: 'comprar-ou-alugar',
    titulo: 'Comprar ou alugar?',
    assunto: 'Mercado imobiliário',
    resumo:
      'Com R$ 500 mil na mão, vale mais comprar um imóvel à vista e morar nele, ou aplicar o dinheiro em fundos imobiliários e pagar o aluguel com a renda? A conta, uma pergunta de cada vez, com simulador.',
    data: '2026-10',
    origem: '../comprar-ou-alugar/site',
  },
]
