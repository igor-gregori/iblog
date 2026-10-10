# O juro é negativo?

Projeto do Igor: uma checagem de dados do texto "O Juro é negativo após 2008", do Trezoitão (Renato Amoedo), de
outubro de 2022. A pergunta que ele quer responder é se os "juros negativos" do texto são verdade ou mentira. Tem um
pipeline em Python, seis notebooks e uma página com calculadora. O README resume os achados e o METODOLOGIA.md
explica as contas e as limitações.

É um post do iblog: as regras gerais (como o Igor trabalha, o design, os comandos) estão no `CLAUDE.md` da raiz
do repositório. Aqui fica o que é só deste post. Os caminhos abaixo são relativos a `posts/juros-negativos/`.

## O que o Igor decidiu para este artigo

- **O artigo precisa chegar a uma conclusão**: cada afirmação do texto recebe um veredito (verdade, em parte ou
  falso) e a página abre com o veredito geral.
- **O visual é o design Folha Azul.** Ele pediu a outro modelo que aplicasse esse estilo sobre a primeira versão
  (que tinha identidade própria) e disse que ficou bom. O cabeçalho de `pagina/index.css` explica o que esta
  página acrescenta ao design: a quinta cor de série, os carimbos de veredito e os blocos que só existem aqui. Os
  gráficos dos notebooks (`analise/estilo.py`) ainda usam a paleta anterior.
- **O endereço é `/juros-negativos/`**, escolhido por ele. O repositório antigo se chamava `juro-negativo`, no
  singular; a pasta e o pacote Python (`juros_negativos`) seguem o endereço.

## Histórico e estado

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
- Essas mudanças estão no commit `06df0e6`, que ele pediu em 06/10/2026, com push.
- Depois ele pediu que cada seção da página mostrasse as fontes e o método, "como foi feito em outro artigo"
  (o post `comprar-ou-alugar`). As oito seções fecham com o quadro "Fontes e método" do design Folha Azul
  (commit `5d29efa`). Os links de "Análise" do quadro apontam para o repositório no GitHub.
- **A página foi publicada em 06/10/2026**, a pedido dele, em `posts.igreg.dev/juros-negativos`, a partir do
  repositório próprio que o post tinha (`igor-gregori/juro-negativo`, público). Em 10/10/2026 o post veio para o
  iblog, com o histórico; os commits citados acima são os do repositório antigo e continuam valendo aqui.
- Decisões que foram tomadas sem ele e que ele pode querer rever:
  - Os carimbos dizem "Falso", não "Mentira": a análise não mostra má-fé, e a página explica isso nas notas.
  - A segunda parte do texto (causas da queda da natalidade) ficou de fora; só os números de população são
    checados.
  - O veredito geral é "As contas fecham. A conclusão, não."
- Dados do Brasil até agosto de 2026.

## Comandos

Os do `CLAUDE.md` da raiz. O pipeline deste post é `uv run python -m juros_negativos`, que exporta
`pagina/dados.json` e `testes/casos_calculadora.json`.

## Fontes que dão trabalho

- **FRED não responde desta máquina** (a conexão cai no meio do handshake). Os dados dos Estados Unidos vêm direto
  do Federal Reserve (pacotes H.6 e H.15 do Data Download Program). **O Fed avisou que vai desativar esse serviço**;
  os dois zips ficam versionados em `dados/brutos/fed`. Se o download parar, a saída é ler as mesmas séries do FRED
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
  (jun/2014 a jul/2022) está escrito em `pagina/secoes/Mundo.tsx`, conferido no ECB Data Portal.

## O que precisa continuar verdadeiro

- **Duas contas, um resultado.** `analise/analise.py` é a referência e `pagina/contas.ts` repete a lógica. Mudou a
  regra em um, mude no outro e rode `uv run python -m juros_negativos` para regerar
  `testes/casos_calculadora.json`; `npm test` compara os dois.
- **Os números do texto vêm dos dados.** Na página, os valores citados são calculados a partir de `dados.json`
  (veja `pagina/numeros.ts`). O README e o METODOLOGIA.md citam números da execução de outubro de 2026 e precisam
  ser revistos se os dados forem atualizados.
- **Períodos na convenção do texto**: "de jan/2008 a jan/2018" vai da abertura de um mês à abertura do outro (fim de
  dez/2007 a fim de dez/2017). Os níveis são sempre os do fim do mês.
- **Cores dos gráficos.** Só cinco séries têm cor, sempre a mesma: Selic (azul), M2 (laranja), IPCA (verde-água),
  ouro (amarelo) e Ibovespa (magenta). O resto é grafite ou cinza. As quatro primeiras são as séries do design; a
  quinta (`--serie-5`, em `pagina/index.css`) é extensão deste post e ainda não foi levada ao `folha-azul-design`.
  As combinações que dividem um gráfico foram validadas para daltonismo sobre os dois fundos da página (rode
  `python posts/juros-negativos/ferramentas/conferir_paleta.py` para conferir). Não acrescente cor no olho: uma
  sexta série colorida quebra a validação.
- **Carimbos nunca dependem só da cor**: ícone e rótulo sempre juntos.
- **Cada seção fecha com "Fontes e método".** O componente `Secao` exige as três partes: as fontes dos dados, o
  método em poucas frases e os arquivos da análise. Fontes e links ficam em `pagina/fontes.ts`; fechado, o quadro
  mostra só quem publica os dados. Mudou a conta ou a fonte de uma seção, mude o quadro dela.
- Saldos em bilhões de reais, em todo o código Python.
- As citações do texto analisado são curtas e literais. Se mudar uma, confira com o original.

## Imagens do README

As de `docs/pagina-*.png` são capturas da página feitas com um Chromium sem interface; as outras imagens de
`docs/` são figuras dos notebooks.
