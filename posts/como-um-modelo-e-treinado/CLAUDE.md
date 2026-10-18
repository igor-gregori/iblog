# Como um modelo é treinado?

O segundo post da série de IA para devs (o plano está em `planos/serie-ia.md`). A pergunta que ele responde: como
um modelo é treinado, e o que cada etapa (pré-treino, ajuste fino, aprendizado por reforço) explica no trabalho
com um agente de código.

É um post do iblog: as regras gerais estão no `CLAUDE.md` da raiz. Aqui fica o que é só deste post. Os caminhos
abaixo são relativos a `posts/como-um-modelo-e-treinado/`.

## Estado

- Rascunho de 18/10/2026, escrito a pedido do Igor ("pode seguir para o post número 2", o item 2 do plano) e
  ainda não revisado por ele. Não publicado.
- Segue as decisões que ele aprovou no post 1: a série só no `assunto` do `post.json`, texto para dev, "Para ir
  mais fundo" no rodapé em vez de "Fontes e método".
- Decisões tomadas sem ele, para ele rever:
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
