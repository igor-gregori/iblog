# Escrever a especificação antes do código compensa?

O décimo post da série de IA para devs (o plano está em `planos/serie-ia.md`, item 10, "Spec-driven development",
experimento). A pergunta que ele responde: pedir ao agente com uma especificação completa, com um plano antes ou com
um pedido solto muda o resultado, o custo e o que o agente erra? É o primeiro experimento da série e o primeiro post
medido com o kit (`kit/`, `comum/kit.py`, `planos/kit-de-medicao.md`).

É um post do iblog: as regras gerais estão no `CLAUDE.md` da raiz. Aqui fica o que é só deste post. Os caminhos
abaixo são relativos a `posts/especificacao-antes-do-codigo/`.

## O que o Igor decidiu

- Em 06/11/2026 ele aprovou o kit e o desenho do experimento: Opus 5.5 com esforço médio, na assinatura dele, 3
  repetições, as especificações escritas pelo Claude e aprovadas por ele (aprovou as três sem mudanças).
- Pediu para rodar de novo A e B quando a mensagem de correção se mostrou pobre (só a primeira linha do erro). O post
  usa o segundo lote de A e B e o único de C, e conta a história no rodapé.
- Em 07/11/2026 aprovou o roteiro (as sete partes), o título e o endereço, pediu para trazer o que fosse necessário ao
  repositório e para acrescentar os termos ao glossário. Decidiu não fazer um quarto jeito (especificação escrita
  pelo próprio agente): o post fica fechado nos três.

## Estado

- Escrito em 07/11/2026, no ramo `claude/post-10-spec`, esperando a revisão dele.
- **No ar desde 07/11/2026, publicado do ramo** (a pedido dele, antes do merge, para ele validar online). Até o merge
  na `main`, os links de "Fontes e método" para o GitHub (`/blob/main/...`) dão 404. Aprovado, segue o PR para a
  `main` e um novo deploy a partir dela. Se ele achar algo errado e quiser tirar o post do ar: `git switch main` e
  `npm run deploy` (ou `npx wrangler rollback`).
- Decisões tomadas sem ele, para ele revisar junto com o post:
  - **A classificação das regras** em três tipos (`analise/regras.py`): o pedido não fala do assunto, o pedido deixa
    em aberto, formato da resposta e códigos HTTP. É um julgamento, e a parte 4 inteira se apoia nele.
  - A parte 4 conta que, em dois testes, a especificação foi contra a convenção do próprio projeto (400 em vez do
    422 do `CLAUDE.md` do kit), e que na maioria das entregas sem especificação o agente seguiu o `CLAUDE.md`.
  - A parte 6 cita o plano de uma execução de B ("o mínimo é comparado com o subtotal, que já usa o preço promocional
    dos produtos"); os três planos do cupom dizem o mesmo com palavras próximas. Os planos ficam no registro das
    sessões, fora do repositório; o código e os testes que vieram deles estão nos diffs.

## O que precisa continuar verdadeiro

- **As execuções não mudam.** `dados/execucoes/` tem um `.json` (números), um `.diff` (o código no fim) e um
  `.entrega.diff` (o código na primeira entrega) por execução, e `primeiro-lote/` as 18 de A e B com a mensagem
  antiga. Refazer o lote dá números diferentes (o modelo não responde igual): se refizer, todo o texto precisa ser
  relido. Mudar `kit/projeto` ou `kit/tarefas` também invalida as execuções.
- **Os números do texto saem do `dados.json`**, gerado por `uv run python -m especificacao_antes_do_codigo`. A página
  não refaz contas: só mostra o resumo calculado em Python. Frases que dependem de um sinal (C mais barata que A nas
  tarefas média e grande, empate na pequena) estão escritas para o resultado atual.
- **Fatos tirados dos diffs, conferidos em 07/11/2026**: as seis entregas sem especificação do cupom contam a validade
  em `America/Sao_Paulo`; nenhuma entrega sem especificação da devolução tem prazo, `Idempotency-Key` ou o status
  `devolvido`; na paginação, cinco das seis respondem 422 para `precoMin > precoMax`, e no cupom, quatro das seis
  respondem 422 para uma porcentagem de 101. O trecho de código da parte 4 é
  de `m-cupom-A-1.entrega.diff`.
- **O custo é a preço de API** (`comum/precos.csv`, conferidos em 22/10/2026), com a gravação no cache de 1 hora, e
  bate com o `total_cost_usd` que o Claude Code informa. As execuções rodaram na assinatura do Igor.
- **Fontes conferidas em 07/11/2026**: Kiro (`/docs/specs/`, `/docs/specs/feature-specs/`: três arquivos, revisão entre
  as fases, EARS, Quick Spec sem revisão), Spec Kit (README: `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`,
  `/speckit-implement`, com hífen; o blog de 2025 usava `/specify`) e o modo de plano do Claude Code
  (`/docs/en/permission-modes`).
- O teste de links (`testes/fontes.test.ts`) aceita também endereços de pasta (`/tree/main/`), porque o post aponta
  para as pastas das execuções e do kit.
