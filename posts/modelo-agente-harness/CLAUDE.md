# Modelo, agente e harness: quem faz o quê?

O primeiro post da série de IA para devs (o plano está em `planos/serie-ia.md`). A pergunta que ele responde: o
que é o modelo, o que é o harness e o que é o agente, e de quem é a culpa quando um agente de código erra. Monta
o vocabulário que os outros posts da série vão usar.

É um post do iblog: as regras gerais estão no `CLAUDE.md` da raiz. Aqui fica o que é só deste post. Os caminhos
abaixo são relativos a `posts/modelo-agente-harness/`.

## Estado

- Escrito em 17/10/2026 a pedido do Igor; ele leu e **aprovou em 18/10/2026**, sem pedir mudanças. Ainda não
  publicado: entra no ar com o primeiro deploy do iblog. A `data` do `post.json` (17/10) deve virar a do dia
  da publicação.
- Decisões que foram tomadas sem ele e que ele aprovou junto com o post:
  - O endereço (`/modelo-agente-harness/`). Depois do primeiro deploy, não muda mais.
  - A série aparece só no `assunto` do `post.json` ("IA para quem já programa · 1"). Não há campo de série nem
    navegação entre os posts dela; isso fica para quando ele decidir (veja `planos/serie-ia.md`).
  - O público é dev, não leigo: o texto usa termos como API, função pura e JSON Schema sem explicar. A regra do
    `CLAUDE.md` da raiz ("para quem não é da área") ainda não foi ajustada para a série.
  - O bloco de código (`.codigo`) está no `pagina/index.css` deste post. Quando um segundo post usar, vai para o
    `papel.css`. Não tem destaque de sintaxe.
  - Em vez de "Fontes e método" em cada parte, há uma lista "Para ir mais fundo" no rodapé: o post não tem
    números para justificar.

## O que precisa continuar verdadeiro

- O exemplo de resposta da API (`RESPOSTA_COM_FERRAMENTA` em `pagina/App.tsx`) segue o formato da API da
  Anthropic (`stop_reason: "tool_use"`, bloco `tool_use` com `id`, `name` e `input`), e o texto diz que está
  resumido.
- A citação da Anthropic ("modelos que usam ferramentas, guiados pelo retorno do ambiente, num laço") traduz a
  frase de "Building effective agents": "They are typically just LLMs using tools based on environmental feedback
  in a loop."
- O passo a passo (`pagina/components/Laco.tsx`) conta cinco chamadas ao modelo, e o texto da parte 3 fala em
  "a quinta chamada". Mudou um, mude o outro.
