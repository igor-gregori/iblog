# posts

A capa que reúne as minhas análises de dados, como um blog.

**Endereço:** https://posts.igreg.dev

## Como funciona

Este repositório só tem a capa. Cada análise continua no próprio repositório e entra aqui como um subcaminho:

| Endereço | Origem |
| --- | --- |
| `posts.igreg.dev/` | a capa (este repositório) |
| `posts.igreg.dev/comprar-ou-alugar/` | `../comprar-ou-alugar/site` |
| `posts.igreg.dev/juros-negativos/` | `../juro-negativo/site` |

`npm run build` gera a capa em `dist/` e depois compila a página de cada post para `dist/<slug>/`
(`scripts/montar.ts`). Por isso os repositórios das análises precisam estar clonados ao lado deste.

O visual segue o do artigo "Comprar ou alugar?": uma coluna de 720 px, a serifa Literata, tema claro e escuro.

## Para adicionar um post

1. A página do post precisa ser um projeto Vite que funcione em um subcaminho (use `import.meta.env.BASE_URL`
   para buscar arquivos, nunca um caminho começando em `/`).
2. Acrescente uma entrada no começo da lista em [posts.ts](posts.ts), com o `slug` e a pasta de `origem`.
3. Opcional: na página do post, use `import.meta.env.VITE_CAPA` (definida pelo build daqui) para mostrar um link
   de volta para a capa.

## Comandos

```bash
npm install
npm run dev          # só a capa, em http://localhost:5173 (os links dos posts não funcionam aqui)
npm run build        # capa + posts em dist/
npx wrangler dev     # serve o dist/ como a Cloudflare vai servir, em http://localhost:8787
npm run deploy       # build + publicação em posts.igreg.dev
```
