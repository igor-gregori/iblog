# O juro é negativo?

Projeto do Igor: uma checagem de dados do texto "O Juro é negativo após 2008", do Trezoitão (Renato Amoedo), de
outubro de 2022. A pergunta que ele quer responder é se os "juros negativos" do texto são verdade ou mentira. Tem um
pipeline em Python, seis notebooks e uma página com calculadora, para publicar no blog dele. O README resume os
achados e o METODOLOGIA.md explica as contas e as limitações. Tudo em pt-BR.

O projeto segue o desenho de `/home/igor/comprar-ou-alugar` (mesma estrutura de pastas, mesmas ferramentas, mesmas
convenções de código), que ele está fazendo em paralelo.

## Como o Igor quer trabalhar

- **Nada é publicado sem a confirmação explícita dele.** Não existe configuração de deploy, e ele disse que o blog
  ainda não tem a página pronta. O repositório está no GitHub como **privado**
  (`github.com/igor-gregori/juro-negativo`, ramo `main`); torná-lo público é decisão dele.
- **Commit e push só quando ele pede.** Em 05/10/2026 ele pediu um commit com push antes de uma rodada de mudanças,
  "para manter a versão". O que veio depois fica sem commit até ele pedir.
- **O artigo precisa chegar a uma conclusão**: cada afirmação do texto recebe um veredito (verdade, em parte ou
  falso) e a página abre com o veredito geral.
- Texto simples e direto, para quem não é do mercado financeiro.
- **O visual da página é o design Folha Azul**, de `/home/igor/folha-azul-design`: coluna de leitura de 720 px,
  Literata em tudo, fundo branco, tema claro e escuro. Ele pediu a outro modelo que aplicasse esse estilo sobre a
  primeira versão e disse que ficou bom. O cabeçalho de `site/src/index.css` explica o que este site acrescenta ao
  design (a quinta cor de série e os carimbos de veredito). Os gráficos dos notebooks (`estilo.py`) ainda usam a
  paleta anterior.

## Estado em 06/10/2026

- O Igor está revisando os vereditos. Ele pediu a outro modelo uma checagem independente das 11 afirmações
  (`/home/igor/temp/juros-negativo-pesquisa-2/VEREDITOS.md`) e comparou as duas ponto a ponto. As conclusões batem
  no essencial; a outra análise tem erros de dados (séries do PIB rotuladas como M1 e M2, anos com 11 meses,
  Ibovespa tratado como índice de preço), então os números dela não devem ser reaproveitados sem conferir.
- **Decisões dele depois da comparação:**
  - "Ouro e bitcoin protegem" passou de "Verdade" para "Em parte", com as quedas em destaque (texto e gráfico na
    seção 5 da página, notebook 05, README). Esta mudança está no commit `6b39f29`.
  - O trecho "até em termos nominais" entrou na seção 4 como um parágrafo (juro nominal abaixo de zero em 3 dos 17
    países), sem mudar o carimbo "Verdade nos países ricos".
  - Três ideias da outra análise foram aproveitadas, sempre com os dados deste projeto: o gráfico ano a ano na
    seção 3, o papel-moeda em circulação nos Estados Unidos na seção 4 e a ressalva de que a queda da população é
    projeção, com os números do IBGE, na seção 7.
- Ao buscar o papel-moeda apareceu um ponto a favor do texto, que entrou na página e no notebook 04: de 2008 a 2018
  a base monetária dos Estados Unidos multiplicou por 4,6, bem mais que a bolsa.
- As mudanças feitas depois do commit `6b39f29` (as duas últimas decisões acima) **ainda não foram commitadas**.
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
uv run pytest                           # 54 testes
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
- A projeção de população do IBGE (revisão 2024) vem de uma planilha no FTP do instituto; as tabelas do SIDRA ainda
  trazem a revisão de 2018.
- A taxa de depósito do Banco Central Europeu não está na base do BIS. O intervalo em que ela ficou negativa
  (jun/2014 a jul/2022) está escrito em `site/src/secoes/Mundo.tsx`, conferido no ECB Data Portal.

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
  ouro (amarelo) e Ibovespa (magenta). O resto é grafite ou cinza. As combinações que dividem um gráfico foram
  validadas para daltonismo sobre os dois fundos da página (variáveis `--serie-*` em `site/src/index.css`; rode
  `python conferir_paleta.py` para conferir). Não acrescente cor no olho: uma sexta série colorida quebra a
  validação.
- **Carimbos nunca dependem só da cor**: ícone e rótulo sempre juntos.
- Taxas em fração (`0.005` = 0,5%), saldos em bilhões de reais e datas mensais no primeiro dia do mês, em todo o
  código Python.
- Identificadores em português nos dois lados; no TypeScript, aspas simples e sem ponto e vírgula.
- As citações do texto analisado são curtas e literais. Se mudar uma, confira com o original.

## Para ver a página sem navegador local

Suba `npm run dev` (ou `npx vite preview` depois do build) e tire capturas com um Chromium sem interface, por
exemplo `playwright-core` apontando para o que está em `~/.cache/ms-playwright`. As capturas do README
(`docs/pagina-*.png`) foram feitas assim; as outras imagens de `docs/` são figuras dos notebooks.
