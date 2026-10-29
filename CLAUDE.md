# iblog

O blog do Igor: análises de dados, explicações e posts sobre tecnologia, IA e economia. Um repositório só, com a
capa, o design e todos os posts. O README explica a estrutura e como criar um post. Tudo em pt-BR.

Cada post tem o seu `CLAUDE.md` (`posts/<slug>/CLAUDE.md`), com o que é só dele: a pergunta que responde, as
decisões que o Igor tomou e o que precisa continuar verdadeiro naquele texto. Leia o do post antes de mexer nele.
As regras daqui valem para todos.

## Como o Igor quer trabalhar

- **Nada é publicado sem a confirmação explícita dele.** Deploy, push, tornar repositório público ou apagar
  repositório: só quando ele pede. Mudou uma página, a versão no ar só muda com um novo deploy.
- **Commit e push só quando ele pede.** Ele costuma pedir os dois juntos ao aprovar uma rodada de mudanças.
- **Um projeto, uma regra.** Em 10/10/2026 ele pediu para juntar os posts aqui porque não gostou de cada um ter o
  seu repositório e seguir regras próprias. Antes de criar uma convenção nova para um post, veja se ela não deveria
  valer para todos; o que dois posts usam vai para `site/base/` (página) ou `comum/` (Python).
- **Texto simples e direto**, para quem não é da área. Nos posts de dados, o leitor entende aos poucos (perguntas
  ou seções encadeadas) e cada parte mostra de onde vêm os números ("Fontes e método").
- Ele roda o projeto localmente (`npm run dev`) e revisa antes de aprovar. Espere pedidos de mudança de texto e de
  design depois de cada entrega.

## O design

- **Cada categoria de post tem o seu design**, e a capa mostra uma seção por categoria, cada uma no seu design
  (lado a lado em tela larga, uma embaixo da outra no celular). O Igor decidiu em 18/10/2026: **Tecnologia e
  IA** usa o **Shell** e vem primeiro na capa; **Economia e assuntos gerais** usa o **Bruma**. Em tela larga, cada
  coluna tem o texto no meio da sua metade, com o mesmo respiro dos dois lados (ele achou a primeira versão, com
  o texto encostado na divisória, espremida). O mapa categoria → design é o `CATEGORIAS` de `site/paginas.ts`,
  na ordem da capa, e a categoria de cada post é o campo `categoria` do `post.json` (o build recusa post sem
  categoria válida). A capa (topo, abertura e rodapé) e a 404 usam o design da categoria geral (economia).
- **Bruma** (`site/base/bruma.css`): folhas sobre a mesa. Página cinza-azulada clara `#f3f6fb`, folhas brancas de
  canto quase reto (3 px) com sombra macia, letra Figtree e um azul-céu `#a8d8ff` só por trás do texto
  (etiquetas, seleção, marca-texto). No escuro, a página é azul-grafite `#11151a` e as folhas sobem um passo.
- **Shell** (`site/base/shell.css`): um terminal. JetBrains Mono nos títulos e rótulos (rótulos em caixa baixa com
  `//` na frente), IBM Plex Sans no texto, fios tracejados e o código numa folha escura. O topo e a abertura de
  cada página, e a seção da capa, ficam numa faixa escura de ponta a ponta nos dois temas, com um cursor azul que
  pisca no fim do título. A marca é o azul-ultramar `#1d29bb` no claro e o passo claro dele, `#a0baff`, sobre
  fundo escuro (a faixa e o tema escuro). Ele pediu "um azul mais escuro" no lugar da menta do candidato; azul
  médio não serve, porque fica colado no azul da série 1 dos gráficos.
- Como se chegou aqui: em 18/10/2026 ele enjoou do **Papel** (neobrutalismo: papel creme, borda grossa, sombra dura
  e amarelo, escolhido em 10/10) e pediu opções minimalistas e modernas. Viu 17 candidatos, ficou entre Neve
  (branco, Geist, sem cor), Terminal e Lima (títulos enormes, verde-lima) e escolheu o Shell, uma variação do
  Terminal. Ao longo das rodadas ele já rejeitou preto puro no escuro, o tomate como cor, visual de jornal, de
  planta baixa e cartões arredondados.
- **Como os designs se organizam.** `site/base/estrutura.css` é a estrutura comum (grades, medidas, tela estreita),
  sem aparência. Cada design é um arquivo com as variáveis e o desenho de cada bloco dentro do escopo
  `[data-design='<nome>']`, e `site/base/designs.css` junta a estrutura e todos os designs. Toda página importa o
  `designs.css`; o build põe `data-design` no `<body>` de cada post e em cada parte da capa, e só as regras daquele
  design valem ali. Variável que usa outra do design (como `--serie-selic: var(--serie-1)`) é declarada em
  `[data-design]`, não em `:root`, porque é no elemento do design que as outras existem. Um design novo é um
  arquivo em `site/base/`, uma linha no `designs.css` e uma categoria no `CATEGORIAS`.
- Blocos que vieram de um post para o design quando um segundo post precisou (18/10/2026, com o post "Como um
  modelo é treinado?"): as barras horizontais (`GraficoBarras.tsx`, antes só do `juros-negativos`), o trecho de
  código (`Codigo.tsx`, `.codigo` e o `code` no texto), as partes numeradas (`Partes.tsx`) e a tabela de texto
  (`.quadro-texto`, antes `.culpas` no post 1). A estrutura deles está no `estrutura.css`; o desenho do código, em
  cada design. Conferido pixel a pixel: as páginas publicadas ficaram idênticas. Com o post "O que é um token"
  (19/10/2026) vieram o quadro "Fontes e método" (`FontesEMetodo.tsx` e o tipo `Link` em `links.ts`, antes só do
  `comprar-ou-alugar`) e o `useJson.ts`, que carrega o `dados.json`. O `juros-negativos` continua com o quadro e o
  carregamento próprios. Com o post "O que é uma sessão" (21/10/2026) vieram o gráfico de linhas
  (`GraficoLinhas.tsx`, a versão do `comprar-ou-alugar`), a régua (`Regua.tsx`) e a grade de controles numa figura
  (`.campos`, as duas antes só da calculadora do post dos tokens), o formato `dolares` (em `formato.ts`) e a classe
  `.visualmente-oculto`. Também conferido pixel a pixel. Com o post "A janela de contexto" (22/10/2026) veio o
  formato `tokens` (antes só do post 4), que passou a escrever "milhão" no singular abaixo de 2 milhões: no post 4,
  duas marcas de eixo mudaram de "1,00 milhões" para "1,00 milhão"; o resto ficou idêntico.
- **A tabela de texto no celular** (`.quadro-texto`, 28/10/2026): cada linha vira um cartão. Só uma coluna do meio
  com `.selo` fica ao lado do caso (posts 1 e 2); uma coluna do meio de texto desce para baixo dele, em cinza, antes
  da última. Antes disso, a tabela de pesquisas do post 5 sobrepunha o texto em 390 px. Conferido pixel a pixel: só
  os posts 5 e 8 mudaram, e só no celular.
- **Preços de API.** A tabela de preços dos modelos (`comum/precos.csv`) e o custo de um pedido (`comum/precos.py`,
  repetido em `site/base/precos.ts`) são usados pelos posts da série desde 21/10/2026, quando o post 4 precisou
  deles. O CSV tem também a gravação no cache (prazo padrão e longo) e, desde o post 5, a janela, a saída máxima e a
  faixa de preço para pedidos longos (`custo_com_faixas`). Cada post guarda o dia em que conferiu os preços que usa
  (`PRECOS_CONSULTADOS_EM` no `exportar_site.py` dele): mudou um preço, confira os posts que usam a tabela.
- **Contagem de tokens.** `comum/tokens.py` conta com o `o200k_base` (pelo `tiktoken`), desde 24/10/2026, quando o
  post 7 precisou da mesma contagem do post 3. As páginas contam com o `gpt-tokenizer`, o mesmo tokenizador.
- **Registros do Claude Code.** `comum/claude_code.py` lê o registro de uma sessão (`~/.claude/projects/...jsonl`) e
  devolve as chamadas ao modelo com o uso de tokens e o que entrou entre uma e outra. Os posts 4 e 5 medem a mesma
  sessão real do Igor; do registro, só números entram no repositório. Desde o post 8 (28/10/2026), ele também tem a
  calibração entre o `o200k_base` e os tokens do Claude (`calibrar`, que o post 5 passou a usar, com os mesmos
  números) e os CLAUDE.md que cada anexo pôs no pedido (`memorias`).
- **Série "IA para quem já programa".** O plano e o andamento estão em `planos/serie-ia.md`. Todo post dela termina
  com a nota "Como este post foi feito" (`site/base/ComoFoiFeito.tsx`, dentro do rodapé), que o Igor pediu em
  19/10/2026. Desde 24/10/2026, também com o link para o glossário (`site/base/LinkDoGlossario.tsx`, antes daquela
  nota), e todo post novo da série acrescenta os termos dele ao glossário (`posts/glossario-de-ia/pagina/termos.ts`).
- O CSS de um post (`posts/<slug>/pagina/index.css`) importa o `designs.css` e traz só o que o post acrescenta.
  Quando repetir um seletor do design, escreva apenas as declarações que mudam: repetir a regra inteira passa por
  cima das regras de tela estreita.
- **Gráficos**: os dados seguem a especificação de sempre (linha de 2 px, ponto com anel do fundo, barra fina de
  ponta arredondada, grade em fio claro, texto nunca na cor da série); o design entra só na moldura (título,
  dica, nota de rodapé). Eles ficam sempre dentro de uma caixa (`--caixa`): branca no claro e, no escuro,
  `#1a1e24` no Bruma e `#0e1015` no Shell. As séries são as mesmas nos dois designs e dão pelo menos 4:1 sobre
  esses fundos. O texto dentro dos gráficos usa a fonte do corpo, porque os componentes reservam o espaço dos
  rótulos contando caracteres: nunca uma monoespaçada.
- **Cores nunca são escolhidas no olho.** Cor de série passa pelo validador. A cor de marca não pode se confundir
  com uma série: ΔE de pelo menos 10 contra todas, na pior das visões (normal e as três formas de daltonismo).
  Os tons médios de violeta, índigo, rosa, coral e terracota reprovam; passam os claros (céu, lima, menta,
  pêssego, amarelo) e os bem escuros (ultramar, uva, vinho). Os neutros de cada design saíram de uma conta em
  OKLCH: o texto apagado é o tom mais próximo do fundo que ainda dá 4,5:1 sobre todos os fundos, e a borda de
  campos e botões, o que dá 3:1. Cor de marca clara (como o céu) é clara demais para sublinhar link sobre o
  branco: no tema claro o sublinhado é cinza.
- Os gráficos dos notebooks (`estilo.py` de cada post) ainda usam o visual antigo.
- Mexeu em CSS ou em componente comum, compare as páginas antes e depois (veja "Para ver as páginas sem navegador").

## O que precisa continuar verdadeiro

- **O endereço de um post é o nome da pasta dele** (`posts/<slug>/` → `/<slug>/`). Os posts publicados não mudam de
  pasta: o endereço deles já circula.
- **A página de cada post lê o `dados.json` da própria pasta**, gerado pelo pipeline em Python
  (`analise/exportar_site.py`). Os números do texto são calculados a partir dele, não digitados.
- **Onde há conta nos dois lados, o Python é a referência** e o TypeScript repete a lógica. O pipeline gera casos
  de teste em `posts/<slug>/testes/*.json` e `npm test` compara os dois. Mudou a regra em um, mude no outro.
- **Os links de "Fontes e método" apontam para este repositório** (`github.com/igor-gregori/iblog`, ramo `main`,
  dentro de `posts/<slug>/`). `npm test` confere que os arquivos existem. O repositório precisa ser público para
  os links funcionarem.
- **Notebooks são gerados executados.** Depois de mudar código usado por eles, rode
  `uv run jupyter nbconvert --to notebook --execute --inplace posts/<slug>/notebooks/*.ipynb`. O texto em
  markdown deles cita números da execução e precisa ser revisto se os dados forem atualizados.
- O pacote Python de um post tem o nome do slug com sublinhados (`comprar_ou_alugar`, `juros_negativos`) e fica em
  `posts/<slug>/analise/`; a ligação entre o nome e a pasta está em `[tool.setuptools]` do `pyproject.toml`.
- Taxas em fração (`0.005` = 0,5%) e datas mensais no primeiro dia do mês, em todo o código Python.
- Identificadores e nomes de pasta em português; no TypeScript, aspas simples e sem ponto e vírgula.
- O código comum das páginas é importado por `#base/...` (o campo `imports` do `package.json`), que funciona no
  Vite, no TypeScript e no `node --test`.

## Comandos

```bash
npm install
npm run dev          # o blog inteiro em http://localhost:5173, nos endereços do site publicado
npm test             # contas em TypeScript × casos gerados pelo Python, e os links de "Fontes e método"
npm run lint && npm run build
npx wrangler dev     # serve o dist/ como a Cloudflare vai servir
npm run deploy       # build + publicação (só com o pedido dele)

uv sync
uv run python -m comprar_ou_alugar      # o pipeline de um post; --atualizar baixa as fontes de novo
uv run python -m juros_negativos
uv run python -m quanto_custa_um_token
uv run python -m o_que_e_uma_sessao     # --registro <sessão.jsonl> extrai de novo a sessão real
uv run python -m janela_de_contexto     # --registro <sessão.jsonl> mede de novo o que enche o contexto
uv run python -m rag_sem_misterio       # --registro <sessão.jsonl> conta de novo as buscas da sessão real
uv run --group embeddings python -m rag_sem_misterio --embeddings  # calcula de novo os embeddings (2,2 GB)
uv run python -m memoria_de_ia          # --registro <sessão.jsonl>, --historico e --automatica medem de novo
uv run pytest
uv run ruff check . && uv run ruff format --check .
```

Para mexer só nas páginas não é preciso rodar os pipelines: os `dados.json` e as tabelas tratadas estão
versionados. Os pipelines baixam dados de órgãos públicos; com rede restrita os downloads podem falhar, e aí vale
usar o que já está no repositório (o cache fica em `posts/<slug>/dados/brutos`, fora do git, com exceções listadas
no `.gitignore`).

## Decisões de 10/10/2026, ao juntar os posts

- **Todo post é uma página em React**, como os dois que existem. Um post só de texto é a mesma coisa sem a parte
  de Python. Não há suporte a Markdown: o Igor deixou a escolha em aberto e nenhum dos posts atuais usaria; criar
  um segundo jeito de escrever seria uma segunda regra. Reveja se ele pedir um post que seja só texto corrido.
- O build é um Vite só, com uma entrada por página (`site/paginas.ts`). O tema claro/escuro é um para o blog
  inteiro (chave `iblog:tema`).
- **Duplicação que ficou, de propósito**, para não mudar páginas já publicadas sem ele pedir:
  - O `juros-negativos` tem a sua própria versão do `GraficoLinhas.tsx` (escala logarítmica, intervalos e marcas),
    que divergiu da que está em `site/base/` (faixas e margem automática). O `MapaDeCalor.tsx` existe nos dois
    posts de economia, também em versões diferentes. Unificar é um trabalho à parte.
  - Os leitores de fontes em Python (`bcb_sgs`, `tesouro`, `ibge_sidra`) e o `estilo.py` dos notebooks também.
  - O `juros-negativos` desenha alguns blocos do design com nomes próprios (chapéu, manchete, linha fina, corpo,
    notas) e difere dele em detalhes: 16 px de margem lateral no celular (o design usa 20), assinatura menor,
    espaçamentos da abertura e das seções. O `comprar-ou-alugar` usa o design sem nenhum CSS próprio.

## Estado em 18/10/2026

- **O endereço continua `posts.igreg.dev`**, com os posts nos mesmos caminhos (`/comprar-ou-alugar/` e
  `/juros-negativos/`): o Igor pediu para manter. `iblog` é o nome do projeto e do repositório, não do endereço.
  O Worker da Cloudflare continua se chamando `posts`, para o deploy atualizar o que já está no ar.
- O Igor validou os posts localmente e aprovou. A reorganização está na `main` de
  `github.com/igor-gregori/iblog` (o antigo `posts`, renomeado), que ele vai atualizar a cada post novo.
- **O repositório é público** (conferido em 18/10/2026). **O primeiro deploy daqui foi em 18/10/2026**, a pedido
  dele, já com os designs por categoria e com o post "Modelo, agente e harness"; o site no ar é este repositório.
- **Os repositórios antigos (`comprar-ou-alugar` e `juro-negativo`) o Igor apaga ele mesmo.** Desde o deploy de
  18/10/2026 nenhum link do site no ar aponta para eles.
- A pasta local é `/home/igor/projects/iblog` (antes, `/home/igor/iblog` e `/home/igor/analyses`). As sessões do
  Claude Code de antes da mudança ficam em `~/.claude/projects/-home-igor-iblog/`. Mudou a pasta, rode
  `uv sync --all-groups --reinstall`: os scripts do `.venv` guardam o caminho antigo (o `uv run pytest` falhou assim
  em 28/10/2026).

## Para ver as páginas sem navegador

Suba `npm run dev` (ou `npx vite preview` depois do build) e tire capturas com um Chromium sem interface, por
exemplo `playwright-core` apontando para o que está em `~/.cache/ms-playwright`. Para saber se uma mudança de CSS
ou de componente comum alterou alguma página, fotografe todas antes e depois (claro e escuro, 1200 e 390 px de
largura) e compare os arquivos pixel a pixel; a migração foi conferida assim.
