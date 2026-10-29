# O que é a memória de uma IA, e onde ela fica?

O oitavo post da série de IA para devs (o plano está em `planos/serie-ia.md`, item 8, "Memória de IA: o que é de
verdade", explicador). A pergunta que ele responde: o que é a memória de um produto de IA (sempre texto que volta para
o pedido), os três jeitos de pô-la de volta (arquivo lido no começo, resumo, busca), quem a escreve, quanto ela custa
numa sessão real e o que acontece quando ela só cresce ou fica velha.

É um post do iblog: as regras gerais estão no `CLAUDE.md` da raiz. Aqui fica o que é só deste post. Os caminhos
abaixo são relativos a `posts/memoria-de-ia/`.

## O que o Igor decidiu

- Em 28/10/2026 ele pediu para seguir para o post 8 e aprovou o roteiro: o modelo não aprende; os três jeitos; quem
  escreve; quanto custa na sessão real; o crescimento dos `CLAUDE.md` no git; o que fazer. Aprovou também duas
  decisões: o texto usa números da máquina dele (a memória automática) e, do registro da sessão, só números entram.

## Estado

- Escrito em 28/10/2026, no ramo `claude/post-8-memoria`. O Igor revisou e **aprovou em 29/10/2026**, sem pedir
  mudanças, e pediu o merge na `main` e a publicação. **Publicado em 29/10/2026**, a data do `post.json`.
- Decisões que foram tomadas sem ele e que ele aprovou junto com o post:
  - O endereço (`/memoria-de-ia/`) e o título.
  - **A sessão real é a de 21 a 25/10/2026** (`~/.claude/projects/-home-igor-iblog/6a42d185-93bc-4f04-8656-737915c3425d.jsonl`),
    em que os posts 4 a 7 foram feitos, e não a de 18/10 dos posts 4 e 5: é nela que os `CLAUDE.md` mudam no meio da
    sessão e entram de novo.
  - **Correção do roteiro aprovado**: na proposta, eu disse que as pastas de memória automática estavam vazias. Estava
    errado (o `ls` leu os nomes que começam com `-` como opções). São 33 memórias em 13 projetos; só a do iblog está
    vazia. O texto conta os números certos.
  - **Duas frases velhas do `CLAUDE.md` da raiz foram corrigidas** neste ramo (a pasta local, que ainda era
    `/home/igor/iblog`, e "os dois [posts] que existem já foram publicados"), e a parte 5 conta isso como exemplo de
    memória velha. Se ele não quiser o exemplo, tire o parágrafo e mantenha a correção.
  - A parte 5 cita, traduzido, o aviso que o Claude Code põe antes do `CLAUDE.md` no pedido ("as instruções substituem
    qualquer comportamento padrão e devem ser seguidas exatamente como estão escritas"), tirado do registro da sessão.
  - A calculadora usa 21 dias de trabalho por mês e, como ponto de partida, o `CLAUDE.md` da raiz e o ritmo da sessão
    real (65 chamadas e 2 gravações no cache por dia).

## O que precisa continuar verdadeiro

- **Do registro da sessão, só números e caminhos de `CLAUDE.md` do projeto.** `analise/sessao.py` grava
  `dados/manuais/cargas.csv`, `pedidos.csv` e `calibracao.json`; `uv run python -m memoria_de_ia --registro <arquivo>`
  mede de novo. Os testes conferem que os arquivos só têm números e caminhos.
- **O tamanho do pedido e o uso do cache são exatos (da API); o tamanho de cada `CLAUDE.md` é estimado**: o texto,
  contado com o `o200k_base`, vezes o fator calibrado na própria sessão com `calibrar(..., com_anexos=True)` de
  `comum/claude_code.py` (1,63 token do Claude por token do `o200k_base`, R² de 0,99 em 305 trechos). O post 5 mediu
  1,53 em outra sessão e sem contar os anexos; os dois números não se comparam. O texto diz que é estimativa.
- **Uma cópia de `CLAUDE.md` fica no pedido até a compactação.** Quando o arquivo mudou e entrou de novo (sessão
  retomada, ou o de uma pasta editado), a versão antiga continua: na sessão, 32% da memória eram cópias antigas. A
  parte lida do cache é estimada pela posição em que a cópia entrou; o resto paga a gravação daquela chamada.
- **Números que o texto cita, todos calculados do `dados.json`**: 327 chamadas, 4,0% dos tokens enviados eram
  `CLAUDE.md`, US$ 1,72 de US$ 50,47 no Claude Opus 5.5 (3,4%), pico de 22.452 tokens com 8.577 da versão em vigor,
  12 chamadas que gravaram a memória de novo. Se a medição mudar, releia a parte 4.
- **O histórico dos `CLAUDE.md` vai até `c8f0d71`** (o merge do post 7, 25/10/2026), em `analise/historico.py`, para
  não mudar a cada commit. Antes de 10/10 o arquivo era o do repositório do primeiro post, que virou este. Só contam os
  `posts/<slug>/CLAUDE.md`: o corpus do post 7 tem cópias cujo nome também termina em `CLAUDE.md`.
- **A memória automática foi contada em 28/10/2026** (`--automatica`), na máquina do Igor: 26 pastas de projeto, 24
  com a pasta de memória, 13 com memórias, 33 memórias (13 `feedback`, 9 `project`, 8 `reference`, 3 `user`), nenhuma
  no iblog. Só números entram; os nomes falam de outros projetos.
- **Python é a referência** para o custo (`analise/conta.py` ↔ `pagina/conta.ts`); `npm test` compara com
  `testes/casos.json`.
- **Fontes conferidas em 28/10/2026**: a documentação de memória do Claude Code (`code.claude.com/docs/en/memory`:
  onde ficam os `CLAUDE.md`, subpastas lidas quando o agente mexe nelas, `@` até quatro níveis, `AGENTS.md` quando não
  há `CLAUDE.md`, memória automática ligada por padrão nas sessões locais, `MEMORY.md` até 200 linhas ou 25 KB, menos
  de 200 linhas por arquivo), a ajuda dos apps do Claude (memória em tópicos, por projeto, a síntese de 24 horas só na
  experiência antiga, a busca nas conversas que "usa RAG" nos planos pagos, apagar a conversa não apaga a memória) e a
  ferramenta de memória da API (`/memories`, executada pelo seu programa). **A página da OpenAI recusou a leitura
  automática (403)**: o que o texto diz do ChatGPT (memórias salvas à parte, referência ao histórico, apagar a
  conversa não apaga a memória salva, o caminho Configurações › Personalização › Memória) veio dos trechos da página
  oficial que a busca mostrou. Vale o Igor abrir a página e conferir.
- Preços conferidos em 22/10/2026 (`PRECOS_CONSULTADOS_EM` em `analise/exportar_site.py`), os da tabela comum.
