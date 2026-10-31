# Série de IA: plano de posts

Rascunho de 16/10/2026, para o Igor revisar um post de cada vez e decidir. Nada aqui está decidido: título,
formato, ordem e até se o post entra são escolhas dele.

## Andamento (31/10/2026)

O que está feito, para quem pegar a série numa sessão nova. O detalhe de cada post está no `CLAUDE.md` da pasta
dele; as regras gerais, no `CLAUDE.md` da raiz. O Igor pediu este checklist em 24/10/2026 para ver onde a série está:
atualize a cada post (marque o que saiu, com a data e a pasta) e a cada decisão dele.

### Os posts do plano

Trilha 1: como a coisa funciona

- [x] 1. Modelo, agente e harness (`posts/modelo-agente-harness`), publicado em 18/10/2026
- [x] 2. Como um modelo é treinado (`posts/como-um-modelo-e-treinado`), publicado em 18/10/2026
- [x] 3. O que é um token, e a conta da fatura (`posts/quanto-custa-um-token`), no ar desde 22/10/2026
- [x] 4. O que é uma sessão (`posts/o-que-e-uma-sessao`), publicado em 22/10/2026
- [x] 5. Contexto: por que o agente esquece (`posts/janela-de-contexto`), publicado em 23/10/2026

Trilha 2: os termos da moda

- [x] 6. Glossário do dev com IA (`posts/glossario-de-ia`), publicado em 24/10/2026
- [x] 7. RAG sem mistério (`posts/rag-sem-misterio`), publicado em 25/10/2026
- [x] 8. Memória de IA: o que é de verdade (`posts/memoria-de-ia`), publicado em 29/10/2026
- [x] 9. Steering: três usos da mesma palavra (`posts/steering`), publicado em 31/10/2026
- [ ] 10. Spec-driven development *(experimento)*
- [ ] 11. Subagentes: quando ajuda e quando atrapalha *(experimento)*

Trilha 3: economia de tokens *(experimentos)*

- [ ] 12. Ferramentas que economizam tokens funcionam?
- [ ] 13. Skills compensam?
- [ ] 14. MCP ou CLI: a premissa precisa mudar (o Claude Code já adia as definições das ferramentas MCP)
- [ ] 15. Qual modelo para qual tarefa
- [ ] 16. Um mês medindo o próprio uso

Trilha 4: trabalhar com agentes

- [ ] 17. O arquivo que o agente lê primeiro
- [ ] 18. Testes como contrato com o agente
- [ ] 19. Revisar código que você não escreveu
- [ ] 20. Prompt injection e permissões

Trilha 5: construir com IA no backend

- [ ] 21. O laço do agente em 100 linhas de TypeScript
- [ ] 22. Um servidor MCP em TypeScript
- [ ] 23. Evals: o teste unitário do prompt
- [ ] 24. Primeiro recurso com LLM em produção

Trilha 6: carreira

- [ ] 25. A IA deixa o dev mais rápido? *(checagem)*
- [ ] 26. O mercado para devs mudou? *(dados do CAGED)*
- [ ] 27. O que passa a valer mais para o sênior
- [ ] 28. Aprender com IA sem desaprender

### Decisões do Igor

- [x] Glossário (24/10/2026): leva o "· 6" no assunto, aparece na capa como um post qualquer e os posts da série
  ganham um link para ele no rodapé.
- [ ] Experimentos: quais tarefas reais rodar e quanto do uso do Claude Code dele gastar nelas.
- [ ] Experimentos: qual vem primeiro (o 14 com a pergunta nova, o 14 junto com o 13, ou o 13).
- [ ] A regra de público do `CLAUDE.md` da raiz ("para quem não é da área"), que a série não segue: o leitor é dev.
- [ ] Um campo de série no `post.json`, com "anterior/próximo" entre os posts.
- [ ] Destaque de sintaxe nos blocos de código.

### O que já existe para os experimentos

- [x] Os preços dos 10 modelos, com cache, janela e faixa longa (`comum/precos.csv`)
- [x] A leitura dos registros do Claude Code (`comum/claude_code.py`)
- [x] A contagem de tokens com o `o200k_base` (`comum/tokens.py`), desde o post 7
- [ ] Um conjunto fixo de tarefas num projeto de exemplo, o kit de medição único dos posts 10 a 16

### Notas

- O trabalho em andamento fica num ramo `claude/...` (o do post 3 foi `claude/nifty-goodall-r1xe06`) até o Igor aprovar; aprovado, vai para a
  `main` por PR e é publicado com `npm run deploy` (desde 23/10/2026, ele pede o deploy nesta máquina).
- A numeração da série (o "· 3" no `assunto` do `post.json`) segue a ordem de publicação, não o número do plano.
  Até o 9, as duas coincidem.
- Os posts são da categoria `tecnologia` (design Shell) e terminam com a nota "Como este post foi feito"
  (`site/base/ComoFoiFeito.tsx`), que o Igor pediu para todos.
- O post 4 saiu sozinho (o Igor decidiu não juntar com o 5). O 5 usa a mesma sessão real e mede do que cada pedido
  era feito; termina dizendo que os próximos posts vão para as medições (trilha 3), sem anunciar qual.
- Para a trilha 3: a documentação do Claude Code diz que as definições das ferramentas MCP ficam adiadas por padrão
  (só os nomes entram no contexto até o agente usar uma). O post 14 precisa partir disso.
- Desde o post 4, a tabela de preços e a conta do custo de um pedido estão em `comum/` e `site/base/precos.ts`,
  com a gravação no cache. Posts da série que falem de custo partem dela.
- O post 8 já mediu quanto o CLAUDE.md custa por chamada, como ele cresceu no git e o que fica velho nele. O 17
  ("O arquivo que o agente lê primeiro") deve partir disso e tratar de como escrever, sem repetir a medição.


- **Para quem:** dev que já trabalha (como o Igor, mais de 5 anos, backend em TypeScript) e quer usar IA para
  ganhar produtividade e evoluir na carreira.
- **Nome provisório:** "IA para quem já programa" (alternativas: "Dev com IA, sem hype"; "O dev e a máquina").
- **O diferencial:** medir em vez de opinar. Quase tudo que se escreve sobre IA para devs é opinião ou
  entusiasmo; um post que mede o que promete chama a atenção de dev experiente.
- **Não precisa seguir o formato dos posts de economia** (perguntas encadeadas, simulador). Cada post usa um
  destes formatos:
  - **Explicador**: um conceito com um visual que o leitor pode mexer.
  - **Experimento**: mede uma promessa com tarefas reais, com e sem a técnica, e publica os números.
  - **Mão na massa**: código em TypeScript, para construir algo.
  - **Opinião com dados**: carreira e mercado.

## Trilha 1: como a coisa funciona

1. **Modelo, agente e harness: quem faz o quê** *(explicador)*. O modelo só prevê texto. O harness é o programa
   em volta (Claude Code, Cursor, Codex): monta o contexto, executa as ferramentas e pede permissão. O agente é o
   laço entre os dois. A maior parte do que o dev chama de "o modelo errou" é decisão do harness, e o resto da
   série parte dessa base.
2. **Como um modelo é treinado** *(explicador)*. Em linguagem de dev:
   - o pré-treino é prever o próximo token em muito texto;
   - o ajuste fino ensina a seguir instruções;
   - o aprendizado por reforço usa recompensas, inclusive "o teste passou".

   Explica por que o modelo tem data de corte, por que conhece React melhor que uma biblioteca nova e por que
   fica bom justamente em código.
3. **O que é um token, e a conta da fatura** *(explicador + calculadora)*. O leitor cola código, JSON ou
   português e vê quantos tokens dá. O português gasta mais que o inglês, e JSON indentado gasta mais que JSON
   compacto. A calculadora mostra entrada, saída, raciocínio e cache, com os preços de cada modelo.
4. **O que é uma sessão: o modelo não lembra de nada** *(explicador)*. A API não guarda estado e cada mensagem
   reenvia a conversa inteira. Um gráfico mostra o custo de uma sessão subindo turno a turno, e o leitor vê o
   cache de prompt achatar essa curva.
5. **Contexto: por que o agente esquece no meio da tarefa** *(explicador)*. A janela de contexto enchendo: o que
   entra primeiro (instruções, ferramentas, arquivos), o que o resumo automático descarta e por que um contexto
   cheio piora a resposta mesmo antes do limite.

## Trilha 2: os termos da moda, um por um

6. **Glossário do dev com IA** *(página viva)*. Uma definição curta para cada termo, com link para o post que
   aprofunda. Atualizado conforme a série sai; todo post aponta para ele.
7. **RAG sem mistério** *(mão na massa)*. Busca e depois geração: embeddings, divisão do texto em pedaços, busca
   híbrida. O ponto principal é quando **não** precisa de RAG: muitas vezes basta pôr o documento inteiro no
   contexto, ou deixar o agente usar `grep`, que é como os agentes de código trabalham hoje.
8. **Memória de IA: o que é de verdade** *(explicador)*. "Memória" é sempre algum texto que volta para o contexto:
   arquivos como o CLAUDE.md, resumos, um banco consultado por ferramenta. Desfaz a impressão de que o modelo
   "aprende com você".
9. **Steering: três usos da mesma palavra** *(explicador curto)*. Nos agentes de código, é corrigir o agente enquanto
   ele trabalha; no Kiro, da AWS, são arquivos de regras do projeto; na pesquisa de interpretabilidade, é mexer nas
   ativações internas do modelo. O Igor pediu um post simples, sem experimento (31/10/2026).
10. **Spec-driven development: escrever a especificação antes do código** *(experimento)*. A mesma funcionalidade
    feita de três jeitos: um pedido solto, um plano antes e uma especificação completa. Compara tempo, tokens,
    retrabalho e testes passando. A pergunta final é se compensa, e para que tamanho de tarefa.
11. **Subagentes: quando dividir ajuda e quando atrapalha** *(explicador + experimento)*. Um subagente tem
    contexto próprio e devolve só o resumo, o que poupa o contexto principal; em troca, gasta mais tokens no
    total e pode perder detalhes no caminho. Medição com uma tarefa de pesquisa no código, com e sem subagentes.

## Trilha 3: economia de token, isso realmente compensa?

A trilha mais forte: perguntas que todo dev faz e quase ninguém mede.

12. **Ferramentas que economizam tokens: funcionam?** *(experimento)*. Compressores de contexto, empacotadores de
    repositório, servidores de "memória" e prompts "enxutos", medidos no mesmo conjunto de tarefas com e sem
    cada um: tokens, custo e, o mais importante, **se a tarefa ainda sai certa**. Economizar 30% e errar mais não
    é economia.
13. **Skills compensam?** *(experimento)*. A skill só ocupa o contexto com a descrição curta e carrega o resto
    quando é usada. Compara a mesma instrução como skill, dentro do CLAUDE.md e colada no pedido: custo fixo por
    sessão, frequência com que o agente a usa sozinho e resultado.
14. **Quando vale usar MCP (e quando um CLI basta)** *(experimento)*. As definições das ferramentas de um servidor
    MCP entram no contexto de toda sessão. Mede esse custo e compara um servidor MCP com o CLI equivalente (por
    exemplo, o do GitHub contra o `gh`). A conclusão vira uma regra prática: MCP compensa para autenticação, para
    dados que o agente não alcança e para ações com permissão; para o resto, o terminal resolve.
15. **Qual modelo para qual tarefa** *(experimento)*. O modelo mais caro nem sempre sai mais caro no fim: erra
    menos e refaz menos. Mede o custo por tarefa **concluída**, não por token.
16. **Um mês medindo meu próprio uso** *(experimento)*. As sessões reais do Igor: tarefas, tempo, tokens,
    retrabalho e o que precisou desfazer, com a análise em Python. Ninguém pode copiar esse post.

## Trilha 4: trabalhar com agentes

17. **O arquivo que o agente lê primeiro**. Como escrever o CLAUDE.md ou o AGENTS.md, com o iblog como estudo de
    caso: o CLAUDE.md da raiz, um por post, a regra "um projeto, uma regra" e as decisões registradas com data.
18. **Testes como contrato com o agente**. De novo com o iblog: o Python é a referência, o TypeScript repete a
    conta e o `npm test` compara os dois. Como um ciclo de verificação deixa confiar no que o agente entrega.
19. **Revisar código que você não escreveu**. Checklist para PR gerado por IA, e o que os bots de revisão pegam e
    não pegam.
20. **Prompt injection e as permissões do agente**. Exemplos, permissões e onde ficam os segredos.

## Trilha 5: construir com IA no backend

21. **O loop do agente em 100 linhas de TypeScript**. Fecha o post 1: o leitor escreve o próprio harness. Um laço
    de chamada de modelo, uso de ferramenta e resultado.
22. **Um servidor MCP em TypeScript**. Mão na massa, na stack do Igor.
23. **Evals: o teste unitário do prompt**. Um conjunto de casos, uma nota e um gráfico de como cada mudança de
    prompt ou de modelo mexe no resultado.
24. **Seu primeiro recurso com LLM em produção**. Saída estruturada, streaming, retentativas, prazos, custo por
    usuário e o que monitorar.

## Trilha 6: carreira

25. **A IA deixa o dev mais rápido?** *(checagem, no molde do `juros-negativos`)*. Um veredito para cada
    afirmação. Fontes a conferir:
    - o estudo da METR (2025): devs experientes ficaram mais lentos com IA e acharam que tinham ficado mais
      rápidos;
    - o relatório DORA sobre desenvolvimento com IA;
    - a pesquisa do Stack Overflow: o uso cresce e a confiança cai;
    - os números de marketing das ferramentas.
26. **O mercado para devs mudou?** *(dados)*. O Novo CAGED tem contratações e desligamentos por ocupação; os
    códigos de profissionais de TI permitem separar júnior de sênior pela idade e pelo salário. Mesmo formato
    dos posts de economia: pipeline em Python e dados públicos.
27. **O que passa a valer mais para o dev sênior** *(opinião com dados)*. Especificar, revisar, arquitetura e
    conhecimento do negócio, apoiado nos dados do 26.
28. **Aprender com IA sem desaprender**. Como usar o agente para estudar sem perder a habilidade de resolver o
    problema sozinho.

## Ordem sugerida

**1 → 4 → 3 → 5 → 14 → 13 → 12.** Começa explicando a máquina (harness, sessão, token, contexto), e cada post
deixa o leitor pronto para o seguinte; depois vêm os experimentos de economia. O glossário (6) entra junto com o
primeiro post e cresce com a série. Os posts 25 e 26 podem entrar no meio, para variar o assunto. Os que dependem
de ferramentas específicas envelhecem rápido: datar ("em outubro de 2026") e dar peso aos princípios.

Possíveis junções: 4 e 5 (sessão e contexto) podem virar um post só.

## O que decidir antes do primeiro post

- **O público muda.** O `CLAUDE.md` da raiz diz "texto simples e direto, para quem não é da área". Esta série é
  para devs. Ajustar a regra, por exemplo para "simples e direto, sem jargão desnecessário; na série de IA, o
  leitor é dev".
- **Não existe "série" no blog.** O `post.json` não tem esse campo e a capa só ordena por data. Para agrupar os
  posts e ter "anterior/próximo": um campo `serie` no `post.json` e suporte na capa e no `Topo`, em
  `site/base/`, valendo para todos os posts.
- **O bloco de código está no design** desde o post 2 (`site/base/Codigo.tsx`; o Shell desenha como folha de
  terminal). Falta decidir se tem destaque de sintaxe, que precisa funcionar no claro e no escuro.
- **Um kit de medição único para os experimentos** (10 a 16). O mesmo conjunto de tarefas, num projeto
  TypeScript de exemplo, com os tokens lidos dos registros de uso, em `comum/`. Se cada post montar a própria
  medição, os números não se comparam e cada post ganha regras próprias.
