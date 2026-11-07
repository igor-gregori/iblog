import type { Banco } from '../banco.ts'

export type Cliente = {
  id: number
  nome: string
  email: string
}

export function buscarCliente(banco: Banco, id: number): Cliente | undefined {
  return banco.prepare('SELECT id, nome, email FROM clientes WHERE id = ?').get(id) as Cliente | undefined
}

export function buscarClientePorEmail(banco: Banco, email: string): Cliente | undefined {
  return banco.prepare('SELECT id, nome, email FROM clientes WHERE email = ?').get(email) as Cliente | undefined
}

export function inserirCliente(banco: Banco, nome: string, email: string, criadoEm: string): Cliente {
  const { lastInsertRowid } = banco
    .prepare('INSERT INTO clientes (nome, email, criado_em) VALUES (?, ?, ?)')
    .run(nome, email, criadoEm)
  return buscarCliente(banco, Number(lastInsertRowid))!
}
