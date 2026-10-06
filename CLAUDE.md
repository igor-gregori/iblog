# O juro é negativo?

Projeto do Igor: uma checagem de dados do texto "O Juro é negativo após 2008", do Trezoitão (Renato Amoedo), de
outubro de 2022. A pergunta que ele quer responder é se os "juros negativos" do texto são verdade ou mentira. Tem um
pipeline em Python, seis notebooks e uma página com calculadora, para publicar no blog dele. O README resume os
achados e o METODOLOGIA.md explica as contas e as limitações. Tudo em pt-BR.

O projeto segue o desenho de `/home/igor/comprar-ou-alugar` (mesma estrutura de pastas, mesmas ferramentas, mesmas
convenções de código), que ele está fazendo em paralelo.

## Como o Igor quer trabalhar

- **Nada é publicado sem a confirmação explícita dele.** O repositório não tem remoto nem commit, e não existe
  configuração de deploy. Ele disse que o blog ainda não tem a página pronta.
- **O artigo precisa chegar a uma conclusão**: cada afirmação do texto recebe um veredito (verdade, em parte ou
  falso) e a página abre com o veredito geral.
- Texto simples e direto, para quem não é do mercado financeiro.
- No outro projeto ele pediu um visual "sério, voltado a cor de jornal" e rejeitou cartões arredondados. Lá também
  está anotado que ele não definiu um estilo padrão e que o visual de um repositório não deve ser copiado para
  outro. Por isso esta página tem identidade própria (papel frio, rótulos em monoespaçada, carimbos de veredito),
  na mesma linha séria. **Ele ainda não viu a página**: pode pedir para aproximar ou afastar do outro projeto.

## Estado em 05/10/2026

- O Igor está revisando os vereditos. Ele pediu a outro modelo uma checagem independente das 11 afirmações
  (`/home/igor/temp/juros-negativo-pesquisa-2/VEREDITOS.md`) e comparou as duas ponto a ponto. As conclusões batem
  no essencial; a outra análise tem erros de dados (séries do PIB rotuladas como M1 e M2, anos com 11 meses,
  Ibovespa tratado como índice de preço), então os números dela não devem ser reaproveitados sem conferir.
- **Decisão dele em 05/10/2026:** "Ouro e bitcoin protegem" passou de "Verdade" para "Em parte", com as quedas em
  destaque (texto e gráfico na seção 5 da página, notebook 05, README). O ouro protegeu; o bitcoin rendeu mais, mas
  perdeu mais da metade do valor cinco vezes desde 2011.
- Em aberto: se o trecho "até em termos nominais" da afirmação sobre juro negativo no mundo entra na checagem.
- Decisões que foram tomadas sem ele e que ele pode querer rever:
  - Os carimbos dizem "Falso", não "Mentira": a análise não mostra má-fé, e a página explica isso nas notas.
  - A segunda parte do texto (causas da queda da natalidade) ficou de fora; só os números de população são
    checados.
  - O veredito geral é "As contas fecham. A conclusão, não."
- Dados do Brasil até agosto de 2026.

## Comandos

```bash
uv sync                                 # dependências do Python
uv run python -m juro_negativo          # baixa as fontes, trata e exporta site/public/data/dados.json
uv run pytest                           # 46 testes
uv run ruff check . && uv run ruff format --check .

cd site && npm install
npm test                                # conta em TypeScript × casos gerados pelo Python
npm run lint && npm run build
npm run dev                             # página em http://localhost:5173
```

Para mexer só na página não é preciso rodar o pipeline: `site/public/data/dados.json` e `data/processed/` ficam no
repositório.

## Fontes que dão trabalho

- **FRED não responde desta máquina** (a conexão cai no meio do handshake). Os dados dos Estados Unidos vêm direto
  do Federal Reserve (pacotes H.6 e H.15 do Data Download Program). **O Fed avisou que vai desativar esse serviço**;
  os dois zips ficam versionados em `data/raw/fed`. Se o download parar, a saída é ler as mesmas séries do FRED
  (`M1SL`, `M2SL`, `FEDFUNDS`, `DFII10`).
- `api.bcb.gov.br` não resolve DNS; o Banco Central é lido pelo SOAP do SGS.
- Yahoo Finance devolve 429 e o Stooq exige JavaScript: não há fonte diária de ouro. O ouro é a média mensal do
  Banco Mundial, cujo endereço muda (o leitor procura o atual na página de commodities).
- A planilha de Shiller parou em 2024; o S&P 500 vem de uma base aberta que a continua, com dividendos só até
  jun/2023.
- O endereço do Ibovespa na B3 não é documentado: as respostas brutas ficam versionadas.

## O que precisa continuar verdadeiro

- **Duas contas, um resultado.** `src/juro_negativo/analise.py` é a referência e `site/src/contas.ts` repete a
  lógica. Mudou a regra em um, mude no outro e rode `uv run python -m juro_negativo` para regerar
  `site/test/casos_calculadora.json`; `npm test` compara os dois.
- **Os números do texto vêm dos dados.** Na página, os valores citados são calculados a partir de `dados.json`
  (veja `site/src/numeros.ts`). Nos notebooks, o texto em markdown cita números da execução de outubro de 2026 e
  precisa ser revisto se os dados forem atualizados; o mesmo vale para o README e o METODOLOGIA.md.
- **Os notebooks são gerados executados.** Depois de mudar código usado por eles, rode
  `uv run jupyter nbconvert --to notebook --execute --inplace notebooks/*.ipynb`.
- **Períodos na convenção do texto**: "de jan/2008 a jan/2018" vai da abertura de um mês à abertura do outro (fim de
  dez/2007 a fim de dez/2017). Os níveis são sempre os do fim do mês.
- **Cores dos gráficos.** Só cinco séries têm cor, sempre a mesma: Selic (azul), M2 (laranja), IPCA (verde-água),
  ouro (amarelo) e Ibovespa (magenta). O resto é grafite ou cinza. Os trios que dividem um gráfico (Selic, M2 e
  IPCA; Selic, Ibovespa e ouro) foram validados para daltonismo sobre os dois fundos da página (variáveis
  `--serie-*` em `site/src/index.css`; nos notebooks, `estilo.py`). Não acrescente cor no olho: uma sexta série
  colorida quebra a validação.
- **Carimbos nunca dependem só da cor**: ícone e rótulo sempre juntos.
- Taxas em fração (`0.005` = 0,5%), saldos em bilhões de reais e datas mensais no primeiro dia do mês, em todo o
  código Python.
- Identificadores em português nos dois lados; no TypeScript, aspas simples e sem ponto e vírgula.
- As citações do texto analisado são curtas e literais. Se mudar uma, confira com o original.

## Para ver a página sem navegador local

Suba `npm run dev` (ou `npx vite preview` depois do build) e tire capturas com um Chromium sem interface, por
exemplo `playwright-core` apontando para o que está em `~/.cache/ms-playwright`. As capturas do README
(`docs/pagina-*.png`) foram feitas assim; as outras imagens de `docs/` são figuras dos notebooks.
