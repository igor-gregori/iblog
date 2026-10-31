# Steering: o que essa palavra quer dizer, afinal?

O nono post da série de IA para devs (o plano está em `planos/serie-ia.md`, item 9). A pergunta que ele responde:
quando alguém fala em steering, de qual dos três usos está falando, e o que muda em cada um.

É um post do iblog: as regras gerais estão no `CLAUDE.md` da raiz. Aqui fica o que é só deste post. Os caminhos
abaixo são relativos a `posts/steering/`.

## O que o Igor decidiu

- Em 31/10/2026 ele pediu para seguir de maneira simplificada, porque não achou o tema tão relevante. Por isso o post
  é um explicador curto, só de texto: sem experimento num modelo aberto e sem medição da sessão real.

## Estado

- Escrito em 31/10/2026, no ramo `claude/post-9-steering`. O Igor revisou e **aprovou em 31/10/2026**, sem pedir
  mudanças, e pediu o merge na `main` e a publicação. **Publicado em 31/10/2026**, a data do `post.json`.
- Decisões que foram tomadas sem ele e que ele aprovou junto com o post:
  - O endereço (`/steering/`) e o título.
  - **A correção no meio da tarefa vem primeiro**, por ser o sentido mais comum nos agentes de código. O plano da
    série começava pelo Kiro.

## O que precisa continuar verdadeiro

- **Fontes conferidas em 31/10/2026**: Claude Code (`how-claude-code-works`, `interactive-mode`), Cursor CLI (entrada
  v2026.08.11 do changelog), Gemini CLI (experimental e desligado por padrão), Kiro (quatro modos, incluindo `auto`),
  Contrastive Activation Addition (só o resumo do artigo) e Golden Gate Claude.
- **Codex:** a documentação oficial lida só usa o verbo ("Steer the active turn"). Páginas de terceiros falam em Enter
  e Tab e dão datas que discordam entre si, por isso o texto não cita teclas nem datas do Codex.
- Comportamento de ferramenta muda rápido: se o post for atualizado, confira de novo a lista da parte 1.
