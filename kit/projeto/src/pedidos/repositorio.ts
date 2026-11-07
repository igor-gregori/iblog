import type { Banco } from '../banco.ts'
import type { Centavos } from '../dinheiro.ts'
import type { Status } from './estados.ts'

export type ItemDoPedido = {
  produtoId: number
  quantidade: number
  /** O preço de uma unidade no momento da compra. */
  precoUnitario: Centavos
}

export type Pedido = {
  id: number
  clienteId: number
  status: Status
  itens: ItemDoPedido[]
  total: Centavos
  criadoEm: string
  enviadoEm: string | null
  entregueEm: string | null
}

export type Evento = {
  de: Status | null
  para: Status
  em: string
}

type Linha = {
  id: number
  cliente_id: number
  status: Status
  total: number
  criado_em: string
  enviado_em: string | null
  entregue_em: string | null
}

type LinhaDeItem = {
  produto_id: number
  quantidade: number
  preco_unitario: number
}

function itensDoPedido(banco: Banco, pedidoId: number): ItemDoPedido[] {
  const linhas = banco
    .prepare('SELECT produto_id, quantidade, preco_unitario FROM itens_pedido WHERE pedido_id = ? ORDER BY id')
    .all(pedidoId) as LinhaDeItem[]
  return linhas.map((linha) => ({
    produtoId: linha.produto_id,
    quantidade: linha.quantidade,
    precoUnitario: linha.preco_unitario,
  }))
}

function paraPedido(banco: Banco, linha: Linha): Pedido {
  return {
    id: linha.id,
    clienteId: linha.cliente_id,
    status: linha.status,
    itens: itensDoPedido(banco, linha.id),
    total: linha.total,
    criadoEm: linha.criado_em,
    enviadoEm: linha.enviado_em,
    entregueEm: linha.entregue_em,
  }
}

export function buscarPedido(banco: Banco, id: number): Pedido | undefined {
  const linha = banco.prepare('SELECT * FROM pedidos WHERE id = ?').get(id) as Linha | undefined
  return linha && paraPedido(banco, linha)
}

export function listarPedidosDoCliente(banco: Banco, clienteId: number): Pedido[] {
  const linhas = banco
    .prepare('SELECT * FROM pedidos WHERE cliente_id = ? ORDER BY criado_em DESC, id DESC')
    .all(clienteId) as Linha[]
  return linhas.map((linha) => paraPedido(banco, linha))
}

export function inserirPedido(
  banco: Banco,
  pedido: { clienteId: number; status: Status; total: Centavos; criadoEm: string; itens: ItemDoPedido[] },
): number {
  const { lastInsertRowid } = banco
    .prepare('INSERT INTO pedidos (cliente_id, status, total, criado_em) VALUES (?, ?, ?, ?)')
    .run(pedido.clienteId, pedido.status, pedido.total, pedido.criadoEm)
  const id = Number(lastInsertRowid)
  const inserirItem = banco.prepare(
    'INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
  )
  for (const item of pedido.itens) {
    inserirItem.run(id, item.produtoId, item.quantidade, item.precoUnitario)
  }
  return id
}

export function registrarEvento(banco: Banco, pedidoId: number, evento: Evento): void {
  banco
    .prepare('INSERT INTO eventos_pedido (pedido_id, de, para, em) VALUES (?, ?, ?, ?)')
    .run(pedidoId, evento.de, evento.para, evento.em)
}

export function historicoDoPedido(banco: Banco, pedidoId: number): Evento[] {
  return banco
    .prepare('SELECT de, para, em FROM eventos_pedido WHERE pedido_id = ? ORDER BY id')
    .all(pedidoId) as Evento[]
}
