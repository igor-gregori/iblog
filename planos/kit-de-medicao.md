# Kit de medição e o post 10

Proposta de 06/11/2026, que o Igor aprovou no mesmo dia (as decisões dele estão no fim). O plano da série está em
`planos/serie-ia.md`; este arquivo detalha o item "um kit de medição único" de lá e o desenho do primeiro
experimento, o post 10 (spec-driven development).

## Andamento

- [x] Projeto de exemplo em `kit/projeto` (uns 1.000 linhas com os testes; 20 testes, `tsc` e lint passando).
- [x] As três tarefas em `kit/tarefas/`: `p-paginacao`, `m-cupom` e `g-devolucao`, cada uma com `pedido.md`,
  `spec.md`, os testes escondidos (`testes/obvios.test.ts` e `testes/regras.test.ts`) e a solução de referência
  (`referencia.patch`).
- [x] `uv run python -m comum.kit validar` passa: os testes escondidos falham todos no projeto original e passam todos
  com a referência (e os 20 testes originais, o `tsc` e o lint também).
- [x] O script que roda as execuções (`comum/kit.py`), ainda sem rodar o Claude Code.
- [x] O Igor aprovou as três especificações (`kit/tarefas/*/spec.md`) em 06/11/2026, sem mudanças.
- [x] Piloto em 06/11/2026: `p-paginacao` nas três variantes, uma vez cada (resultados em `~/.cache/iblog-kit/piloto`,
  fora do repositório; não entram no post). A e B entregaram com 6/6 óbvios e 4/8 regras e acertaram tudo depois de
  uma correção; C entregou 8/8 de primeira. Custo (preço de API, que sai da assinatura Pro do Igor): A US$ 0,60,
  B US$ 0,79, C US$ 0,56; de 1,6 a 2,4 minutos cada. O que o piloto corrigiu no script:
  - **O agente achou o relatório dos testes escondidos** (`teste-oculto.xml`) na rodada de correção de B. Agora os
    testes ficam na cópia só enquanto rodam e os relatórios ficam fora dela.
  - **O custo estava somado errado**: o evento `result` de uma sessão retomada acumula a sessão inteira. Agora tokens e
    custo saem do registro da sessão (com subagentes), por etapa, e a gravação no cache é cobrada pelo prazo de 1 hora,
    que é o que o Claude Code usa na assinatura. A conta bate com a do próprio Claude Code nas três execuções.
  - **Comandos compostos eram negados** (`... ; echo $?`, `cat >> arquivo`). A lista de comandos liberados cresceu
    (echo, sed, sort, diff, mkdir, cp, mv...); `rm` continua fora.
  - O modo de plano sem interface funciona como se esperava: o agente escreve o plano, diz que não pode sair do modo
    de plano e para; a mensagem de aprovação na mesma sessão faz ele implementar.
- [x] O lote: 27 execuções, de 06/11/2026 às 17h50 até as 22h30 (parou uma vez no limite da sessão da assinatura e
  foi retomado; a execução cortada foi refeita do zero). Resultados em `~/.cache/iblog-kit/post-10`, ainda fora do
  repositório. US$ 28,29 em preço de API, 88 minutos de execução. Nenhuma regressão, nenhum subagente, nenhum estouro
  de tempo, nenhum servidor MCP; nenhum agente viu os testes escondidos (alguns procuraram fora da cópia e foram
  barrados). C entregou tudo certo de primeira nas 9; A e B, em nenhuma.
- [x] **A mensagem de correção** (decidido em 06/11/2026: rodar A e B de novo). Ela leva só a primeira linha da mensagem de cada teste, que no
  `assert` do Node quase sempre é "Expected values to be strictly equal:", sem o esperado e o obtido. Na devolução, A
  e B ficaram presos em dois testes cujo nome não diz o que está errado (um campo `precoUnitario` a mais nos itens da
  devolução; 201 em vez de 200 na repetição com a mesma `Idempotency-Key`). Um dev contaria o esperado e o obtido. A
  proposta é mandar o esperado e o obtido e rodar de novo só A e B (18 execuções; C nunca precisou de correção).
  O Igor aprovou: a mensagem agora leva o esperado e o obtido (até 25 linhas por teste), as execuções antigas de A e B
  foram para `~/.cache/iblog-kit/post-10/primeiro-lote-A-B` e A e B rodam de novo. As de C ficam.
- [x] O segundo lote de A e B: 18 execuções, de 06/11/2026 às 23h21 até 07/11/2026 às 03h49 (parou uma vez no
  limite da sessão e foi retomado). US$ 20,92, 65 minutos. Com o esperado e o obtido na mensagem, A e B chegam a tudo
  certo no fim nas 18 (1 ou 2 correções cada); nenhuma das 18 entregou tudo certo de primeira. As 27 que valem para o
  post (A e B do segundo lote, C do primeiro) estão em `~/.cache/iblog-kit/post-10`: US$ 28,34 no total. Nenhuma
  regressão, nenhum subagente, nenhum estouro; nenhum agente viu os testes escondidos.
- [ ] O post: escrito em 07/11/2026 (`posts/especificacao-antes-do-codigo`), esperando a revisão do Igor. Os dados das
  execuções estão em `dados/execucoes/` do post.

## A ideia em uma frase

Um projeto TypeScript pequeno e congelado, algumas tarefas com testes escondidos do agente e um script que roda o
Claude Code sem interface em cada combinação, numa cópia limpa do projeto, e guarda só os números. Os posts 10 a 15
mudam só **o que varia** (o jeito de pedir, subagentes, ferramentas, skills, o modelo) e usam as mesmas tarefas, para
que os números de um post se comparem com os do outro.

## O que é cada peça

### O projeto de exemplo

- Uma API de uma loja pequena (produtos, estoque, clientes e pedidos), em TypeScript, na stack do Igor: Node 24,
  Fastify, o SQLite que já vem no Node (`node:sqlite`, sem banco para instalar) e `node --test`.
- Uns 1.000 linhas, com testes, lint, um `CLAUDE.md` curto e algumas convenções próprias (como os erros
  saem, como se escreve uma migração). Convenção que só existe no projeto é onde um pedido solto costuma errar.
- Fica congelado numa versão (uma tag). Toda execução parte dessa mesma versão.

### As tarefas

Três tamanhos, para responder a pergunta do post 10 ("para que tamanho de tarefa compensa"):

| Tarefa | O que pede | Tamanho |
| --- | --- | --- |
| P | Filtro e paginação na listagem de produtos | um arquivo, umas 50 linhas |
| M | Cupom de desconto nos pedidos: validade, valor mínimo, um uso por cliente, não acumula | 3 a 5 arquivos |
| G | Cancelamento e devolução de pedido: estados, volta do estoque, reembolso parcial, pedido repetido não duplica | migração e vários módulos |

Cada tarefa tem uma pasta com:

- `pedido.md`: o pedido como um dev faria, em duas ou três frases;
- `spec.md`: a especificação completa (requisitos com critérios de aceitação, desenho e a lista de passos);
- `testes/`: os **testes de aceitação escondidos**, que o agente nunca vê. Eles dizem se a tarefa ficou pronta.

Os testes escondidos se dividem em dois grupos, e o post mostra os dois separados:

- **os óbvios**, que qualquer dev deduziria do pedido (o cupom vencido não vale);
- **as regras do negócio**, que só estão na especificação (o cupom não acumula com a promoção do produto).

Assim dá para ver de onde vem a diferença: se a especificação ajuda porque o agente trabalha melhor ou só porque ele
ficou sabendo de regras que o pedido solto não contava.

### O script que roda tudo

Em Python, em `comum/` (como o resto do código comum dos posts). Para cada combinação de tarefa, variante e
repetição:

1. Copia o projeto congelado para uma pasta **fora do iblog** e faz um `git init` nela. Fora, porque o Claude Code lê
   os `CLAUDE.md` das pastas de cima: dentro do repositório, o agente leria as regras do blog.
2. Roda `claude -p` com o pedido, um modelo fixo, `--output-format stream-json`, um `--session-id` conhecido (para
   achar o registro depois) e as permissões liberadas só naquela pasta.
3. Roda os testes escondidos, os testes que já existiam (regressão), o `tsc` e o lint.
4. Se algum teste escondido falhou, manda de volta só o nome e a mensagem dos que falharam, como um dev reportando um
   bug, com `--resume` na mesma sessão. No máximo duas rodadas.
5. Lê o registro da sessão com `comum/claude_code.py` e guarda uma linha por execução.

O que cada linha guarda: chamadas ao modelo, tokens (entrada, cache, saída), custo pela tabela comum, tempo de relógio,
testes escondidos passando na primeira entrega e no fim, regressões, rodadas de correção e o tamanho do diff final.
Os diffs também ficam guardados: o projeto e as tarefas são nossos, e o leitor pode ver o código que cada variante
produziu.

As execuções rodam uma de cada vez (para não esbarrar em limite de uso) e podem rodar de madrugada, em segundo plano.

## O post 10: as três variantes

A mesma tarefa, pedida de três jeitos:

- **A, pedido solto**: só o `pedido.md`.
- **B, plano antes**: o mesmo pedido, com o agente em modo de plano (`--permission-mode plan`). O plano é aprovado
  automaticamente e o agente segue. Isso deixa de fora o que um dev faria de verdade (ler e corrigir o plano); o post
  diz isso.
- **C, especificação completa**: o `spec.md` vai junto com o pedido.

Com três tarefas, três variantes e três repetições (o modelo não responde igual duas vezes, então uma execução só não
basta), são **27 execuções**, mais as rodadas de correção.

O post responderia, com gráficos:

1. Qual variante entrega a tarefa pronta mais vezes, já na primeira entrega e depois das correções?
2. Quanto cada uma custa em tokens e em tempo, contando o plano e a correção?
3. Onde cada variante errou: nas regras óbvias ou nas do negócio?
4. Para que tamanho de tarefa a especificação compensa o tempo de escrevê-la?

O tempo de escrever a especificação não aparece no registro. Se for o Igor quem escreve, ele cronometra; se for o
Claude, o post diz isso e mostra os tokens gastos para escrevê-la.

## O que o kit serve para os próximos posts

- **11, subagentes**: as mesmas tarefas e uma tarefa nova de pesquisa no código, com e sem subagentes.
- **12, ferramentas que economizam tokens**: as mesmas tarefas com e sem cada ferramenta. Os testes escondidos dizem se
  a tarefa ainda sai certa, que é a pergunta principal do post.
- **13, skills**: a mesma instrução como skill, no `CLAUDE.md` do projeto e colada no pedido.
- **14, MCP ou CLI**: precisa de tarefas que mexam no GitHub; o kit dá o script e a medição, mas as tarefas são outras.
- **15, qual modelo**: as mesmas tarefas em cada modelo, e o custo por tarefa **concluída** sai direto dos testes
  escondidos.

## Quanto custa rodar

Uma estimativa grosseira, a conferir no piloto: uma execução da tarefa média fica perto de US$ 1 a 3 no Opus 5.5
(pelos preços de `comum/precos.csv`). As 27 execuções do post 10, com correções, dariam algo entre **US$ 40 e 100**
em preço de API, que sai do uso da assinatura do Igor. Em tempo, de 3 a 6 horas de execução.

## Antes de rodar tudo: um piloto

A tarefa P nas três variantes, uma vez cada. Serve para conferir:

- se a execução fica isolada (nenhuma skill, plugin, servidor MCP ou memória do Igor no pedido: dá para ver no próprio
  registro);
- o custo e o tempo de verdade, para corrigir a estimativa acima;
- se os testes escondidos estão justos com o pedido solto.

## Decisões do Igor (06/11/2026)

1. **Modelo**: Opus 5.5 com esforço médio (`--model claude-opus-5-5 --effort medium`), para não gastar o limite
   rápido. O post 15 compara modelos; aqui é um só.
2. **A assinatura dele**, não uma chave de API. Sem o `--bare` (que exige chave), o isolamento é por configuração:
   cópia fora do iblog, `--setting-sources project`, `--strict-mcp-config`, sem busca na web e com uma lista de
   comandos liberados (o resto é negado e contado). O piloto confere, pelo evento de início de cada sessão, se nada
   dele (skills, plugins, servidores MCP) entrou.
3. **As especificações da variante C são escritas pelo Claude**, e o Igor aprova antes de rodar. O post conta isso.
4. **3 repetições** por combinação.
5. **`kit/` na raiz do iblog**, com o script em `comum/kit.py`. A convenção está no `CLAUDE.md` da raiz.

## Como cada variante chega ao agente (`comum/kit.py`)

- **A**: o texto do `pedido.md`, numa chamada com `--permission-mode acceptEdits`.
- **B**: o mesmo texto com `--permission-mode plan`; depois, na mesma sessão (`--resume`), "O plano está aprovado.
  Pode implementar." com `acceptEdits`. O piloto confere se o modo de plano sem interface para no plano, como se
  espera.
- **C**: o texto do `pedido.md` e, depois de "Siga esta especificação:", o `spec.md` inteiro, na mesma mensagem.
- **Correção**: "Testei aqui e estes casos falharam:" com o nome e a primeira linha da mensagem de cada teste
  escondido que falhou, e "Pode corrigir?". No máximo duas vezes.

O `claude` roda com o ambiente limpo (só `HOME`, `PATH`, `USER`, `LANG` e `SHELL`): rodado de dentro do app, ele
herdava as variáveis da sessão do app e falhava na autenticação. Ele usa o login do Claude Code no terminal
(`claude auth login`). Uma chamada que falha antes de trabalhar interrompe o lote e não grava resultado. As skills,
plugins e agentes que aparecem no início da sessão são os que vêm com o Claude Code (no primeiro teste, 18 skills,
3 plugins `builtin`, 6 agentes e nenhum servidor MCP); nada do Igor.

Os testes escondidos que esperam uma recusa sem cobrar o código (os óbvios) aceitam qualquer 4xx; onde o recurso
existe, não aceitam 404 nem 405, para não contar como certa uma rota que ninguém escreveu.
