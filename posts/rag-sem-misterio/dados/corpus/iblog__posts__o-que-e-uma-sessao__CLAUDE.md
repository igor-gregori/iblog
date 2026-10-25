# O que é uma sessão, e por que ela fica mais cara a cada passo?

O quarto post da série de IA para devs (o plano está em `planos/serie-ia.md`, item 4). A pergunta que ele
responde: o que é uma sessão de um agente, por que cada chamada reenvia a conversa inteira e custa mais que a
anterior, e o que o cache de prompt faz com essa conta.

É um post do iblog: as regras gerais estão no `CLAUDE.md` da raiz. Aqui fica o que é só deste post. Os caminhos
abaixo são relativos a `posts/o-que-e-uma-sessao/`.

## O que o Igor decidiu

- **Sozinho, sem juntar com o post 5** (contexto), em 21/10/2026.
- **Usar uma sessão real dele do Claude Code**, só com os números de cada chamada (21/10/2026).
- **Comparar Anthropic, OpenAI e Google** na conta do cache, como no post 3 (21/10/2026).

## Estado

- Escrito em 21/10/2026, no ramo `claude/post-4-sessao`. O Igor revisou, mandou apontamentos de redação (a nota de
  método do cache de 5 minutos, o trecho reaproveitado do pedido, os mínimos de cada fornecedor, a marcação
  explícita da OpenAI e o "3,0" da parte 2) e **aprovou em 22/10/2026**. Foi para a `main` pelo PR #4 e **o Igor
  publicou em 22/10/2026**, a mesma data do `post.json`.
- Em 22/10/2026, com o post 5, o formato `tokens` foi para `site/base/formato.ts` e passou a escrever "milhão" no
  singular: duas marcas do eixo do gráfico da parte 2 mudaram ("1,00 milhão", "1,50 milhão"). No ar desde o
  deploy de 23/10/2026.
- Decisões que foram tomadas sem ele e que ele aprovou junto com o post:
  - O endereço (`/o-que-e-uma-sessao/`) e o título.
  - A sessão real é a de 18/10/2026 em que o design Shell foi escolhido (214 chamadas ao Claude Opus 5.5, uma pausa
    de 67 minutos e uma compactação). O texto diz isso.
  - A sessão simulada padrão (20 mil tokens de começo, 40 chamadas, 1.500 tokens novos e 500 de resposta) e o
    modelo inicial do simulador (Claude Sonnet 5.5).
  - A tarefa da parte 1 é a do laço do post 1 (`calcularFrete`), com tamanhos ilustrativos (`pagina/tarefa.ts`).
  - A tabela de preços e a conta do custo foram para `comum/` e `site/base/`, por serem usadas por dois posts.
- Em 24/10/2026 ganhou no rodapé o link para o glossário da série (`LinkDoGlossario.tsx`), a pedido dele, e foi
  ao ar junto com o glossário.

## O que precisa continuar verdadeiro

- **Python é a referência.** `analise/sessao.py` (a sessão simulada e o custo da sessão real) e
  `analise/registro.py` (os números do registro do Claude Code, lido por `comum/claude_code.py` desde
  22/10/2026, sem mudar nenhum número); `pagina/sessao.ts` repete as contas.
  `uv run python -m o_que_e_uma_sessao` regera `pagina/dados.json` e `testes/casos.json`; `npm test` compara.
- **Nenhum texto da sessão real entra no repositório.** `dados/manuais/sessao-real.csv` tem só números por chamada
  (tokens e minutos desde o início) e é gerado por `--registro <sessão.jsonl>`; o teste confere as colunas. O
  registro original fica em `~/.claude/projects/-home-igor-iblog/cf72bd5d-dfb5-4d06-b88f-56975f0200cb.jsonl`.
- **Os controles do simulador ficam abaixo de 100 mil tokens por chamada** (no máximo 40 chamadas, 1.500 tokens
  novos e 20 mil de começo), porque o Claude Haiku 5.5 cobra mais acima disso e a conta não tem essa faixa. Mudou
  um limite, refaça a conta do maior pedido.
- **Preços com data.** Os de gravação no cache foram conferidos em 21/10/2026 (`PRECOS_CONSULTADOS_EM` em
  `analise/exportar_site.py`); o resto da tabela é a do post 3, conferida de novo no mesmo dia. Anthropic: 1,25× a
  entrada (5 minutos) e 2× (1 hora); OpenAI (GPT-6): 1,25× (30 minutos) e 2,5× (12 horas); Google: a página não
  cobra a gravação nem informa o prazo do cache implícito.
- As afirmações sobre cada fornecedor vêm das fontes do rodapé (`pagina/fontes.ts`): a OpenAI diz que, mesmo com
  `previous_response_id`, os tokens anteriores são cobrados como entrada; a Anthropic, que a leitura renova o prazo
  e que mudar as ferramentas invalida o cache inteiro; o Google, que o cache implícito não tem garantia.
- O texto da parte 1 fala em "cinco chamadas" e os números saem de `pagina/tarefa.ts`. A parte 4 fala de uma
  pausa e de uma compactação: se a sessão real mudar, releia a parte inteira.
