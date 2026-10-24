# Glossário do dev com IA

O sexto post da série de IA para devs (o plano está em `planos/serie-ia.md`, item 6): uma página viva com uma
definição curta de cada termo da série e o link para a parte do post que o aprofunda.

É um post do iblog: as regras gerais estão no `CLAUDE.md` da raiz. Aqui fica o que é só deste post. Os caminhos
abaixo são relativos a `posts/glossario-de-ia/`.

## O que o Igor decidiu

- Em 24/10/2026: leva o "· 6" no `assunto` (entra na numeração da série), aparece na capa como um post qualquer
  (pela data) e os posts da série ganham um link para ele no rodapé (`site/base/LinkDoGlossario.tsx`, antes da nota
  "Como este post foi feito").

## Estado

- Escrito, aprovado pelo Igor e publicado em 24/10/2026 (ramo `claude/post-6-glossario`, por PR para a `main`).
- Decisões tomadas sem ele, que ele aprovou junto com o post:
  - O endereço (`/glossario-de-ia/`) e o título.
  - Os 29 termos e as definições. Só entram termos que um post já explica: RAG, MCP, skills, steering e os outros do
    plano entram quando o post deles sair.
  - A ordem alfabética, com um índice de letras e um campo para filtrar (sem acento e sem maiúscula, em português
    e em inglês).
  - Não há "Fontes e método": as fontes estão nos posts para onde cada termo aponta.

## O que precisa continuar verdadeiro

- **Todo post novo da série acrescenta os termos dele** em `pagina/termos.ts` (e o post em `POSTS`), com o id da
  parte que explica cada um. `testes/termos.test.ts` confere que o post e a parte existem e que o número em `POSTS`
  é o do `assunto` do `post.json`.
- **As definições repetem o que os posts dizem**, sem números que mudam (preços, por exemplo), com duas exceções que
  vêm das páginas dos fornecedores: os prazos do cache (5 minutos e 1 hora na Anthropic, 30 minutos e 12 horas na
  OpenAI) e os limites da faixa de contexto longo (100 mil no Haiku 5.5, 272 mil nos GPT-6). Mudou um desses, mude
  aqui também.
- Cada termo tem uma âncora fixa (`#cache-de-prompt`): outros posts podem apontar para ela. Não troque os ids.
