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

- O visual é o **Folha Azul**: uma coluna de leitura de 720 px, a serifa Literata em tudo, fundo branco, cor só
  onde ela informa (gráficos, links e detalhes em azul-royal `#2350b0`), sem molduras nem cartões, tema claro e
  escuro. Ele já rejeitou visual de jornal, de planta baixa e cartões arredondados.
- O design vive em outro repositório, `/home/igor/folha-azul-design` (no GitHub, `igor-gregori/folha-azul-design`),
  com a documentação em `docs/`. **Ele quis manter separado** (10/10/2026). `site/base/folha-azul.css` é uma cópia
  byte a byte de `css/folha-azul.css` de lá: mudança de design entra lá e é copiada para cá, nunca o contrário, e
  a cópia não recebe regra de um post só.
- O CSS de um post (`posts/<slug>/pagina/index.css`) importa o `folha-azul.css` e traz só o que o post acrescenta.
  Quando repetir um seletor do design, escreva apenas as declarações que mudam: repetir a regra inteira passa por
  cima das regras de tela estreita do design.
- **Cores de gráfico nunca são escolhidas no olho**: passam por um validador de daltonismo sobre os dois fundos
  (`#ffffff` e `#0f1218`), e cada série tem sempre a mesma cor.
- Mexeu em CSS ou em componente comum, compare as páginas antes e depois (veja "Para ver as páginas sem navegador").

## O que precisa continuar verdadeiro

- **O endereço de um post é o nome da pasta dele** (`posts/<slug>/` → `/<slug>/`). Os dois que existem já foram
  publicados: não renomeie as pastas.
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
  - `GraficoLinhas.tsx` e `MapaDeCalor.tsx` existem nos dois posts, em versões que divergiram (faixas e margem
    automática em um; escala logarítmica, intervalos e marcas no outro). Unificar é um trabalho à parte.
  - Os leitores de fontes em Python (`bcb_sgs`, `tesouro`, `ibge_sidra`) e o `estilo.py` dos notebooks também.
  - O `juros-negativos` desenha alguns blocos do design com nomes próprios (chapéu, manchete, linha fina, corpo,
    notas) e difere dele em detalhes: 16 px de margem lateral no celular (o design usa 20), assinatura menor,
    espaçamentos da abertura e das seções. O `comprar-ou-alugar` usa o design sem nenhum CSS próprio.

## Estado em 10/10/2026

- **O endereço continua `posts.igreg.dev`**, com os posts nos mesmos caminhos (`/comprar-ou-alugar/` e
  `/juros-negativos/`): o Igor pediu para manter. `iblog` é o nome do projeto e do repositório, não do endereço.
  O Worker da Cloudflare continua se chamando `posts`, para o deploy atualizar o que já está no ar.
- O Igor validou os posts localmente e aprovou. A reorganização está na `main` de
  `github.com/igor-gregori/iblog` (o antigo `posts`, renomeado), que ele vai atualizar a cada post novo.
- **Falta tornar o repositório público e fazer o primeiro deploy daqui**, nessa ordem: os links de "Fontes e
  método" apontam para `igor-gregori/iblog` e dão 404 enquanto ele for privado. Tornar público é com o Igor (a
  sessão que fez a migração não tinha permissão para isso). Até lá, o site no ar é o antigo, publicado a partir
  dos repositórios separados.
- **Os repositórios antigos (`comprar-ou-alugar` e `juro-negativo`) o Igor apaga ele mesmo.** Só depois do
  primeiro deploy daqui: a versão que está no ar ainda aponta os links de "Fontes e método" para eles.
- A pasta local é `/home/igor/iblog` (antes, `/home/igor/analyses`).

## Para ver as páginas sem navegador

Suba `npm run dev` (ou `npx vite preview` depois do build) e tire capturas com um Chromium sem interface, por
exemplo `playwright-core` apontando para o que está em `~/.cache/ms-playwright`. Para saber se uma mudança de CSS
ou de componente comum alterou alguma página, fotografe todas antes e depois (claro e escuro, 1200 e 390 px de
largura) e compare os arquivos pixel a pixel; a migração foi conferida assim.
