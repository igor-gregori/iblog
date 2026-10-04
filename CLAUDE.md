# Comprar ou alugar?

Projeto de portfólio do Igor: uma análise de dados que testa a hipótese "hoje compensa mais morar de aluguel e
investir em fundos imobiliários do que comprar um imóvel". A pergunta central, nas palavras dele: **com R$ 500 mil,
compensa aplicar em uma carteira de FIIs que rende 1% ao mês e usar esse dinheiro para pagar o aluguel, ou comprar
um imóvel à vista e morar nele?** Tem um pipeline em Python, seis notebooks e uma página com simulador. O README
resume os achados e o METODOLOGIA.md explica premissas e limitações. Tudo em pt-BR.

## Como o Igor quer trabalhar

- **Nada é publicado sem a confirmação explícita dele.** Tornar o repositório público, fazer deploy na Cloudflare
  ou criar workflow de deploy só depois de ele testar e dizer que pode. O repositório nasceu privado por isso.
- **O visual da página é o de planta baixa** (escolhido por ele em 04/10/2026, depois de ver várias propostas):
  **um tema só, claro**, fundo `#fbfbfb` com quadriculado azul-claro, tinta azul-escura, títulos largos em caixa alta
  (Archivo), rótulos e dados em fonte monoespaçada (JetBrains Mono), fios tracejados entre as seções e cada gráfico
  numa "prancha" branca com moldura fina. Não há tema escuro nem botão de tema. Antes disso a página teve um visual
  de jornal, que ele trocou; e ele já tinha rejeitado um layout de cartões arredondados.
- Ele não definiu um estilo padrão para os projetos dele: não copie o visual de outros repositórios.
- Texto simples e direto, para quem não é do mercado financeiro.

## Estado em 04/10/2026

- Em 04/10 o Igor achou que os assuntos da página estavam misturados (financiamento, backtest, Monte Carlo) e
  pediu que ela respondesse à pergunta dos R$ 500 mil. Ele escolheu: **foco na compra à vista, com financiamento só
  como opção no simulador**, e **Varginha como exemplo principal**. A página foi reorganizada nisso e o notebook 6
  (`06_a_vista`) faz a mesma conta. Os notebooks 1 a 5 continuam com a análise de financiamento.
- O backtest e o Monte Carlo saíram da página (e do `dados.json`), mas continuam nos notebooks 4 e 5.
- O Igor ainda não revisou o texto novo. Ele vai rodar a página localmente (`npm run dev`) e ler de novo; espere
  pedidos de mudança de texto e de layout.
- Ele vê a página pelo celular num link privado do claude.ai (Artifact), publicado a partir de um build com
  `npx vite build --base ./`. Esse link é só para ele; não é o deploy público.
- A amostra de Varginha (`data/manual/varginha_anuncios.csv`, 42 anúncios) foi coletada de duas páginas públicas de
  uma rede de imobiliárias. Ele ficou de revisar e, se quiser, ampliar.
- Os gráficos dos notebooks continuam em fundo claro neutro, com a paleta de `estilo.py`. Os matizes por cidade e
  por ativo são os mesmos da página (azul, laranja, verde), mas os tons não são idênticos.
- Não existe configuração de deploy (sem wrangler, sem GitHub Actions).

## Comandos

```bash
uv sync                                 # dependências do Python
uv run python -m comprar_ou_alugar      # baixa as fontes, trata e exporta site/public/data/dados.json
uv run pytest                           # 45 testes
uv run ruff check . && uv run ruff format --check .

cd site && npm install
npm test                                # simulador em TypeScript × casos gerados pelo Python
npm run lint && npm run build
npm run dev                             # página em http://localhost:5173
```

Para mexer só na página não é preciso rodar o pipeline: `site/public/data/dados.json` e `data/processed/` estão
versionados. O pipeline baixa dados de Fipe, B3, Banco Central, IBGE, CVM e Tesouro; em um ambiente com rede
restrita esses downloads podem falhar, e aí vale usar o que já está no repositório.

## O que precisa continuar verdadeiro

- **Dois simuladores, uma conta.** `src/comprar_ou_alugar/simulador.py` é a referência e `site/src/simulador.ts`
  repete a lógica. Mudou a regra em um, mude no outro e rode `uv run python -m comprar_ou_alugar` para regerar
  `site/test/casos_simulador.json`; `npm test` compara os dois.
- **Os números do texto vêm dos dados.** Na página, os valores citados são calculados a partir de `dados.json`
  (veja o começo de `Pagina` em `site/src/App.tsx` e as contas de compra à vista em `site/src/conta.ts`, que
  repetem `compra_a_vista` e `fundos_a_taxas_fixas` de `cenarios.py`). Nos notebooks, o texto em markdown cita números da execução de
  outubro de 2026 e precisa ser revisto se os dados forem atualizados.
- **Notebooks são gerados executados.** Depois de mudar código usado por eles, rode
  `uv run jupyter nbconvert --to notebook --execute --inplace notebooks/*.ipynb`.
- **Cores dos gráficos.** As séries usam uma paleta validada para daltonismo sobre o fundo da página (`#fbfbfb`) e
  o branco das pranchas (variáveis `--serie-*` em `site/src/index.css`; nos notebooks, `estilo.py`). Cada cidade e cada ativo tem
  sempre a mesma cor. Não troque cores no olho.
- Taxas em fração (`0.005` = 0,5%) e datas mensais no primeiro dia do mês, em todo o código Python.
- Identificadores em português nos dois lados; no TypeScript, aspas simples e sem ponto e vírgula.

## Para ver a página sem navegador local

Suba `npm run dev` e tire capturas com um Chromium sem interface (por exemplo `playwright-core` apontando para um
Chromium instalado). As capturas do README (`docs/pagina-*.png`) foram feitas assim, com o painel de controles do
simulador em `position: static` para não ficar deslocado pela rolagem.
