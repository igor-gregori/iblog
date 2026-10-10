# Comprar ou alugar?

Projeto de portfólio do Igor: uma análise de dados que testa a hipótese "hoje compensa mais morar de aluguel e
investir em fundos imobiliários do que comprar um imóvel". A pergunta central, nas palavras dele: **com R$ 500 mil,
compensa aplicar em uma carteira de FIIs que rende 1% ao mês e usar esse dinheiro para pagar o aluguel, ou comprar
um imóvel à vista e morar nele?** Tem um pipeline em Python, seis notebooks e uma página com simulador. O README
resume os achados e o METODOLOGIA.md explica premissas e limitações.

É um post do iblog: as regras gerais (como o Igor trabalha, o design, os comandos) estão no `CLAUDE.md` da raiz
do repositório. Aqui fica o que é só deste post. Os caminhos abaixo são relativos a `posts/comprar-ou-alugar/`.

## O que o Igor decidiu para este artigo

- **O texto avança em sete perguntas encadeadas**, para o leitor ir entendendo aos poucos; ele não quer "respostas
  curtas" soltas no topo. **Cada pergunta termina com "Fontes e método"**, com links para os dados e para o
  notebook ou código da análise (`pagina/fontes.ts`).
- **O primeiro design do blog nasceu aqui** (hoje o blog usa o Papel; veja o `CLAUDE.md` da raiz). Em 04/10/2026 ele escolheu o desenho "B" entre seis versões da
  abertura (coluna de 720 px, Literata, subtítulo em itálico, primeira letra grande, sem molduras) e a paleta "B2"
  (fundo branco `#ffffff` e destaque azul-royal `#2350b0`; no escuro, `#0f1218` e `#8fb0f2`). Antes disso a página
  teve um visual de jornal e um de planta baixa, que ele trocou, e um tom de tijolo sobre fundo `#f7f6f2`; ele
  também rejeitou um layout de cartões arredondados. A página usa o design sem nenhum CSS próprio
  (`pagina/index.css` só importa o design do blog; o simulador usa os blocos `.ferramenta` e `.largo`).

## Histórico e estado

- Em 04/10 o Igor achou que os assuntos da página estavam misturados (financiamento, backtest, Monte Carlo) e
  pediu que ela respondesse à pergunta dos R$ 500 mil. Ele escolheu: **foco na compra à vista, com financiamento só
  como opção no simulador**, e **Varginha como exemplo principal**. A página foi reorganizada nisso e o notebook 6
  (`06_a_vista`) faz a mesma conta. Os notebooks 1 a 5 continuam com a análise de financiamento.
- O backtest e o Monte Carlo saíram da página (e do `dados.json`), mas continuam nos notebooks 4 e 5.
- A versão de planta baixa ficou no commit `b73da6c` e a primeira versão do artigo, em Instrument Sans, no
  `6dbee82`, caso ele queira voltar a alguma (o histórico do repositório antigo veio junto para o iblog).
- A amostra de Varginha (`dados/manuais/varginha_anuncios.csv`, 42 anúncios) foi coletada de duas páginas públicas de
  uma rede de imobiliárias. Ele ficou de revisar e, se quiser, ampliar.
- Os gráficos dos notebooks continuam em fundo claro neutro, com a paleta de `estilo.py`. Os matizes por cidade e
  por ativo são os mesmos da página (azul, laranja, verde), mas os tons não são idênticos.
- A página foi publicada em 04/10/2026, a pedido dele, em `posts.igreg.dev/comprar-ou-alugar`, a partir do
  repositório próprio que o post tinha (`igor-gregori/comprar-ou-alugar`, público desde 05/10/2026). Em 10/10/2026
  o post veio para o iblog; os links de "Fontes e método" passaram a apontar para `igor-gregori/iblog`.

## Comandos

Os do `CLAUDE.md` da raiz. O pipeline deste post é `uv run python -m comprar_ou_alugar`, que baixa dados de Fipe,
B3, Banco Central, IBGE, CVM e Tesouro e exporta `pagina/dados.json` e `testes/casos_simulador.json`.

## O que precisa continuar verdadeiro

- **Dois simuladores, uma conta.** `analise/simulador.py` é a referência e `pagina/simulador.ts` repete a lógica.
  Mudou a regra em um, mude no outro e rode `uv run python -m comprar_ou_alugar` para regerar
  `testes/casos_simulador.json`; `npm test` compara os dois.
- **Os números do texto vêm dos dados.** Os valores citados são calculados a partir de `dados.json` (veja o começo
  de `Artigo` em `pagina/App.tsx` e as contas de compra à vista em `pagina/conta.ts`, que repetem `compra_a_vista`
  e `fundos_a_taxas_fixas` de `analise/cenarios.py`).
- **Cores dos gráficos.** Cada cidade e cada ativo tem sempre a mesma cor, das séries do design (`--serie-*`). Os
  gráficos dos notebooks usam a paleta de `analise/estilo.py`: os matizes são os mesmos da página (azul, laranja,
  verde), mas os tons não são idênticos.

## Capturas do README

As de `docs/pagina-*.png` foram feitas com um Chromium sem interface, com o painel de controles do simulador em
`position: static` para não ficar deslocado pela rolagem.
