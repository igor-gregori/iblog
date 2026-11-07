import type { Banco } from '../banco.ts'
import type { Centavos } from '../dinheiro.ts'

export type Produto = {
  id: number
  nome: string
  preco: Centavos
  precoPromocional: Centavos | null
  estoque: number
  ativo: boolean
}

export type NovoProduto = {
  nome: string
  preco: Centavos
  precoPromocional?: Centavos | null
  estoque?: number
}

export type MudancasNoProduto = Partial<Omit<Produto, 'id'>>

type Linha = {
  id: number
  nome: string
  preco: number
  preco_promocional: number | null
  estoque: number
  ativo: number
}

function paraProduto(linha: Linha): Produto {
  return {
    id: linha.id,
    nome: linha.nome,
    preco: linha.preco,
    precoPromocional: linha.preco_promocional,
    estoque: linha.estoque,
    ativo: linha.ativo === 1,
  }
}

/** Os produtos à venda, em ordem de nome. */
export function listarProdutosAtivos(banco: Banco): Produto[] {
  const linhas = banco.prepare('SELECT * FROM produtos WHERE ativo = 1 ORDER BY nome, id').all() as Linha[]
  return linhas.map(paraProduto)
}

export function buscarProduto(banco: Banco, id: number): Produto | undefined {
  const linha = banco.prepare('SELECT * FROM produtos WHERE id = ?').get(id) as Linha | undefined
  return linha && paraProduto(linha)
}

export function inserirProduto(banco: Banco, novo: NovoProduto, criadoEm: string): Produto {
  const { lastInsertRowid } = banco
    .prepare('INSERT INTO produtos (nome, preco, preco_promocional, estoque, criado_em) VALUES (?, ?, ?, ?, ?)')
    .run(novo.nome, novo.preco, novo.precoPromocional ?? null, novo.estoque ?? 0, criadoEm)
  return buscarProduto(banco, Number(lastInsertRowid))!
}

const COLUNAS: Record<keyof MudancasNoProduto, string> = {
  nome: 'nome',
  preco: 'preco',
  precoPromocional: 'preco_promocional',
  estoque: 'estoque',
  ativo: 'ativo',
}

export function atualizarProduto(banco: Banco, id: number, mudancas: MudancasNoProduto): void {
  const campos = (Object.keys(mudancas) as (keyof MudancasNoProduto)[]).filter((campo) => campo in COLUNAS)
  if (campos.length === 0) return
  const atribuicoes = campos.map((campo) => `${COLUNAS[campo]} = ?`).join(', ')
  const valores = campos.map((campo) => {
    const valor = mudancas[campo]
    return typeof valor === 'boolean' ? Number(valor) : (valor ?? null)
  })
  banco.prepare(`UPDATE produtos SET ${atribuicoes} WHERE id = ?`).run(...valores, id)
}

/** Tira `quantidade` do estoque. Devolve `false`, sem mudar nada, se não houver o suficiente. */
export function baixarEstoque(banco: Banco, id: number, quantidade: number): boolean {
  const { changes } = banco
    .prepare('UPDATE produtos SET estoque = estoque - ? WHERE id = ? AND estoque >= ?')
    .run(quantidade, id, quantidade)
  return changes === 1
}

/** O preço que o cliente paga hoje: o promocional, se houver. */
export function precoDeVenda(produto: Produto): Centavos {
  return produto.precoPromocional ?? produto.preco
}
