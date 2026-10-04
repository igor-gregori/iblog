# Comprar ou alugar?

Projeto de portfólio do Igor: uma análise de dados que testa a hipótese "hoje compensa mais morar de aluguel e
investir em fundos imobiliários do que comprar um imóvel". Tem um pipeline em Python, cinco notebooks e uma página
com simulador. O README resume os achados e o METODOLOGIA.md explica premissas e limitações. Tudo em pt-BR.

## Como o Igor quer trabalhar

- **Nada é publicado sem a confirmação explícita dele.** Tornar o repositório público, fazer deploy na Cloudflare
  ou criar workflow de deploy só depois de ele testar e dizer que pode. O repositório nasceu privado por isso.
- **O visual da página é o de jornal**: fundo cor de papel, texto em serifa, fios no lugar de cartões, seções
  numeradas na margem. Ele pediu "algo mais sério, voltado a cor de jornal" depois de rejeitar um layout de cartões
  arredondados. Ele ainda não disse se aprova o resultado.
- Ele não definiu um estilo padrão para os projetos dele: não copie o visual de outros repositórios.
- Texto simples e direto, para quem não é do mercado financeiro.

## Estado em 03/10/2026

- O Igor **ainda não leu a matéria** (o texto da página e dos notebooks). O próximo passo é a revisão dele; espere
  pedidos de mudança de texto e de layout.
- A amostra de Varginha (`data/manual/varginha_anuncios.csv`, 42 anúncios) foi coletada de duas páginas públicas de
  uma rede de imobiliárias. Ele ficou de revisar e, se quiser, ampliar.
- Os gráficos dos notebooks continuam em fundo claro neutro; só a página ganhou o tom de papel.
- Não existe configuração de deploy (sem wrangler, sem GitHub Actions).

## Comandos

```bash
uv sync                                 # dependências do Python
uv run python -m comprar_ou_alugar      # baixa as fontes, trata e exporta site/public/data/dados.json
uv run pytest                           # 43 testes
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
  (veja o começo de `Pagina` em `site/src/App.tsx`). Nos notebooks, o texto em markdown cita números da execução de
  outubro de 2026 e precisa ser revisto se os dados forem atualizados.
- **Notebooks são gerados executados.** Depois de mudar código usado por eles, rode
  `uv run jupyter nbconvert --to notebook --execute --inplace notebooks/*.ipynb`.
- **Cores dos gráficos.** As séries usam uma paleta validada para daltonismo sobre os fundos claro e escuro da
  página (variáveis `--serie-*` em `site/src/index.css`; nos notebooks, `estilo.py`). Cada cidade e cada ativo tem
  sempre a mesma cor. Não troque cores no olho.
- Taxas em fração (`0.005` = 0,5%) e datas mensais no primeiro dia do mês, em todo o código Python.
- Identificadores em português nos dois lados; no TypeScript, aspas simples e sem ponto e vírgula.

## Para ver a página sem navegador local

Suba `npm run dev` e tire capturas com um Chromium sem interface (por exemplo `playwright-core` apontando para um
Chromium instalado). As capturas do README (`docs/pagina-*.png`) foram feitas assim, com o painel de controles do
simulador em `position: static` para não ficar deslocado pela rolagem.
