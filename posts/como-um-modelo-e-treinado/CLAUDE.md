# Como um modelo é treinado?

O segundo post da série de IA para devs (o plano está em `planos/serie-ia.md`). A pergunta que ele responde: como
um modelo é treinado, e o que cada etapa (pré-treino, ajuste fino, aprendizado por reforço) explica no trabalho
com um agente de código.

É um post do iblog: as regras gerais estão no `CLAUDE.md` da raiz. Aqui fica o que é só deste post. Os caminhos
abaixo são relativos a `posts/como-um-modelo-e-treinado/`.

## Estado

- Escrito em 18/10/2026 a pedido do Igor ("pode seguir para o post número 2", o item 2 do plano). Ele leu e
  **aprovou em 18/10/2026**, sem pedir mudanças, e pediu o merge na `main` para publicar. A `data` do
  `post.json` é a da publicação (18/10/2026); se o deploy for em outro dia, troque.
- Segue as decisões que ele aprovou no post 1: a série só no `assunto` do `post.json`, texto para dev, "Para ir
  mais fundo" no rodapé em vez de "Fontes e método". A categoria é `tecnologia`, então a página usa o Shell.
- Decisões que foram tomadas sem ele e que ele aprovou junto com o post:
  - O endereço (`/como-um-modelo-e-treinado/`).
  - O modelo de brinquedo usa uma biblioteca inventada, a `velox`, para mostrar a data de corte sem afirmar nada
    sobre bibliotecas reais.

## O que precisa continuar verdadeiro

- **O texto descreve o que o brinquedo mostra**, e `testes/brinquedo.test.ts` confere: até o corte, `rota` nunca
  aparece depois de `app.`; com um exemplo da velox, aparece com menos de 15%; com dez, é o mais provável. Mudou
  o `pagina/corpus.ts`, rode `npm test` e releia a parte 2.
- As afirmações sobre pesquisa vêm das fontes do rodapé (`FONTES` em `pagina/App.tsx`), todas conferidas em
  18/10/2026: o RLHF do InstructGPT, a constituição da Anthropic, o raciocínio do DeepSeek-R1 aprendido só com
  reforço, o reward hacking em tarefas de código (OpenAI) e a bajulação em cinco assistentes (Anthropic).
