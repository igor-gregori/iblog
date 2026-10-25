# O que é a janela de contexto, e por que o agente esquece no meio da tarefa?

O quinto post da série de IA para devs (o plano está em `planos/serie-ia.md`, item 5). A pergunta que ele
responde: o que é a janela de contexto, o que a enche numa sessão real de um agente, por que caber não é o mesmo
que ser bem usado, quanto custa um contexto longo e o que a compactação descarta.

É um post do iblog: as regras gerais estão no `CLAUDE.md` da raiz. Aqui fica o que é só deste post. Os caminhos
abaixo são relativos a `posts/janela-de-contexto/`.

## O que o Igor decidiu

- **O post 5 sai sozinho**, depois do 4 (21/10/2026), e trata do limite de cerca de 1 milhão de tokens dos modelos
  de ponta, a pergunta que ele fez em 22/10/2026.

## Estado

- Escrito em 22/10/2026, no ramo `claude/post-5-contexto`. O Igor revisou e **aprovou em 23/10/2026**, sem pedir
  mudanças, e pediu o merge na `main` e a publicação. **Publicado em 23/10/2026**, a data do `post.json`.
- Decisões que foram tomadas sem ele e que ele aprovou junto com o post:
  - O endereço (`/janela-de-contexto/`) e o título.
  - **A sessão real é a mesma do post 4**, a de 18/10/2026. Desta vez o conteúdo do registro foi lido (só na máquina
    dele) para dividir cada pedido por tipo; no repositório entram só as somas por chamada.
  - O texto cita o Igor pelo nome ao falar das mensagens dele na sessão e da compactação que ele pediu.
  - O fim não anuncia um post específico: diz que os próximos saem da explicação e vão para as medições
    (a trilha 3 do plano).
- Em 24/10/2026 ganhou no rodapé o link para o glossário da série (`LinkDoGlossario.tsx`), a pedido dele, e foi
  ao ar junto com o glossário.

## O que precisa continuar verdadeiro

- **Nenhum texto da sessão real entra no repositório.** `analise/composicao.py` lê o registro do Claude Code (com
  `comum/claude_code.py`) e grava `dados/manuais/composicao.csv` (só números por chamada) e
  `dados/manuais/calibracao.json`. O registro original fica em
  `~/.claude/projects/-home-igor-iblog/cf72bd5d-dfb5-4d06-b88f-56975f0200cb.jsonl`;
  `uv run python -m janela_de_contexto --registro <arquivo>` mede de novo.
- **O tamanho de cada pedido é exato; a divisão por tipo é estimada.** O que entrou de novo entre duas chamadas é
  dividido pelo texto de cada parte, contado com o `o200k_base` e convertido por um fator calibrado na própria sessão
  (1,53 tokens do Claude por token do `o200k_base`, R² de 0,95 em 173 trechos sem imagem). O resto vai para as
  imagens ou para os lembretes do Claude Code. O texto e o quadro "Fontes e método" da parte 2 dizem isso.
- **Cada pedido soma exatamente o tamanho cobrado pela API**: o teste em Python e o `npm test` conferem.
- **Python é a referência** para a conta da faixa longa (`custo_com_faixas` em `comum/precos.py`, repetida em
  `site/base/precos.ts`); `npm test` compara com `testes/casos.json`.
- **Preços e janelas com data**: conferidos em 22/10/2026 (`PRECOS_CONSULTADOS_EM` em `analise/exportar_site.py`).
  A OpenAI não diz se a faixa longa (acima de 272 mil tokens) vale para o pedido inteiro; a conta supõe que sim, como
  a Anthropic diz do Haiku 5.5. Os modelos do Google não mostram faixa longa.
- **As pesquisas da parte 3** foram conferidas nas fontes em 22/10/2026: Lost in the Middle (no pior caso, abaixo de
  56,1% sem documento), RULER (17 modelos, metade satisfatória em 32 mil tokens), NoLiMa (13 modelos, 11 abaixo da
  metade em 32 mil; GPT-4o de 99,3% para 69,7%) e Context Rot (18 modelos; LongMemEval com ~300 contra ~113 mil
  tokens). A Chroma é relatório de empresa, sem revisão por pares; o texto diz.
- **O que o Claude Code faz na compactação** vem da documentação dele (`code.claude.com/docs/en/context-window`):
  apaga saídas antigas de ferramentas, depois resume; relê o CLAUDE.md da raiz e a memória automática; relê até cinco
  arquivos. O ponto em que a compactação automática roda "depende do modelo e da configuração": o texto não dá um
  número.
