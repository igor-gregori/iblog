# iblog

O blog do Igor Gregori: análises de dados e explicações sobre tecnologia, inteligência artificial e economia.
Um repositório só, com a capa, o design e todos os posts.

**Endereço:** https://posts.igreg.dev

## Os posts

| Post | Endereço | Pasta |
| --- | --- | --- |
| [Comprar ou alugar?](posts/comprar-ou-alugar/README.md) | `/comprar-ou-alugar/` | `posts/comprar-ou-alugar` |
| [O juro é negativo?](posts/juros-negativos/README.md) | `/juros-negativos/` | `posts/juros-negativos` |
| [Modelo, agente e harness: quem faz o quê?](posts/modelo-agente-harness/README.md) | `/modelo-agente-harness/` | `posts/modelo-agente-harness` |
| [Como um modelo é treinado?](posts/como-um-modelo-e-treinado/README.md) | `/como-um-modelo-e-treinado/` | `posts/como-um-modelo-e-treinado` |

## Como o projeto se organiza

```
posts/<slug>/        um post: tudo o que é dele fica aqui
  post.json            título, assunto, resumo, descrição e data (a capa lê daqui)
  pagina/              a página (React + TypeScript), o CSS próprio e o dados.json que ela lê
  analise/             o pipeline em Python: baixa as fontes, trata e exporta os dados da página
  notebooks/           a análise passo a passo
  dados/               brutos (cache de download), tratados (parquet) e manuais
  testes/              testes do Python e do TypeScript
  README.md, METODOLOGIA.md
site/
  capa/                a capa do blog e a página 404
  base/                o que toda página usa: o design (papel.css), o topo, o tema, a formatação
  paginas.ts           transforma as pastas em endereços: posts/<slug>/pagina → /<slug>/
comum/               o Python que os pipelines compartilham (download com cache)
pyproject.toml       um ambiente Python para todos os posts
package.json         um ambiente Node para o site inteiro
```

O nome da pasta de um post é o endereço dele. A capa lista os posts do mais novo para o mais antigo, pela `data`
do `post.json`.

O visual é o design **Papel** (`site/base/papel.css`): papel creme, caixas de borda grossa com sombra dura,
títulos pesados e amarelo como cor de marca; no escuro, grafite. O CSS de cada post (`pagina/index.css`) importa
o `papel.css` e traz só o que aquele post acrescenta.

## Comandos

Precisa de [uv](https://docs.astral.sh/uv/) (Python) e de Node.js 24. Tudo roda a partir da raiz.

```bash
npm install
npm run dev          # o blog inteiro em http://localhost:5173, com os mesmos endereços do site publicado
npm test             # as contas em TypeScript contra as de Python, e os links de "Fontes e método"
npm run lint
npm run build        # gera dist/ (confere os tipos antes)
npx wrangler dev     # serve o dist/ como a Cloudflare vai servir, em http://localhost:8787
npm run deploy       # build + publicação
```

```bash
uv sync
uv run python -m comprar_ou_alugar      # o pipeline de um post: python -m <slug com sublinhados>
uv run python -m juros_negativos
uv run pytest                           # os testes de todos os posts
uv run ruff check . && uv run ruff format --check .
```

Para mexer só nas páginas não é preciso rodar os pipelines: o `dados.json` de cada post e as tabelas tratadas
estão versionados.

## Para criar um post

1. Crie `posts/<slug>/post.json`:

   ```json
   {
     "titulo": "O título do post",
     "assunto": "A linha pequena acima do título, na capa",
     "resumo": "O parágrafo que aparece na capa.",
     "descricao": "A frase que os buscadores mostram.",
     "data": "2026-10-10"
   }
   ```

2. Crie `posts/<slug>/pagina/` com três arquivos, copiando de um post que já existe: `index.html` (troque o slug no
   caminho do script), `main.tsx` e `index.css` (que começa importando o `papel.css`). A página em si é o
   `App.tsx`, que usa o `Topo` e o resto de `#base/`.
3. Se o post tiver análise de dados, crie `posts/<slug>/analise/` como um pacote Python e acrescente o nome dele
   nas duas listas de `[tool.setuptools]` do `pyproject.toml`. Um post só de texto não precisa de Python.

O post aparece na capa e ganha o endereço `/<slug>/` sem mais nenhuma configuração.
