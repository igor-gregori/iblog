# Loja

A API de uma loja pequena: produtos, clientes e pedidos. Node 24 rodando TypeScript direto (sem build), Fastify e o
SQLite que vem no Node (`node:sqlite`).

## Comandos

```bash
npm test            # node --test em test/
npm run typecheck   # tsc --noEmit
npm run lint        # oxlint
npm start           # sobe em http://localhost:3000, com o banco em loja.db
```

## Convenções

- **Dinheiro é sempre um inteiro em centavos** (`src/dinheiro.ts`), na API e no banco. R$ 12,90 é `1290`.
- **A hora vem de `app.agora()`**, nunca de `new Date()`: os testes trocam o relógio (`test/ajuda.ts`).
- **Erros que o cliente pode resolver são um `ErroDeNegocio`** (`src/erros.ts`), com um código em snake_case. Saem como
  `{ "erro": { "codigo", "mensagem" } }`: 404 para o que não existe, 409 para conflito de estado, 422 para regra do
  negócio. Dado malformado é recusado pelo esquema da rota, com 400.
- **Listas saem como `{ "itens": [...] }`**, nunca como um array solto.
- **Mudança no banco é uma migração nova** em `src/migracoes/`, com o número seguinte (`002_...sql`). Nunca edite uma
  migração que já existe.
- **Escrita em mais de uma tabela vai dentro de `emTransacao`** (`src/banco.ts`).
- **Toda mudança de status de pedido passa por `mudarStatus`** (`src/pedidos/estados.ts`), que confere a transição e
  registra o evento no histórico.
- Cada módulo (`produtos`, `clientes`, `pedidos`) tem `repositorio.ts` (SQL) e `rotas.ts` (HTTP); a regra de negócio
  que envolve mais de um módulo fica num `servico.ts`.
- Identificadores em português. Aspas simples e sem ponto e vírgula.
- Funcionalidade nova vem com testes em `test/`, e `npm test`, `npm run typecheck` e `npm run lint` passam.
