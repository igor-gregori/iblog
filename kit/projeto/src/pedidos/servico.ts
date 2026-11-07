import { emTransacao, type Banco } from '../banco.ts'
import { buscarCliente } from '../clientes/repositorio.ts'
import { multiplicar, somar } from '../dinheiro.ts'
import { ErroDeNegocio } from '../erros.ts'
import { baixarEstoque, buscarProduto, precoDeVenda } from '../produtos/repositorio.ts'
import { buscarPedido, inserirPedido, registrarEvento, type ItemDoPedido, type Pedido } from './repositorio.ts'

export type NovoPedido = {
  clienteId: number
  itens: { produtoId: number; quantidade: number }[]
}

/** Cria o pedido já pago: confere cliente, produtos e estoque, baixa o estoque e registra o primeiro evento. */
export function criarPedido(banco: Banco, novo: NovoPedido, agora: Date): Pedido {
  if (!buscarCliente(banco, novo.clienteId)) {
    throw new ErroDeNegocio('cliente_inexistente', 'Cliente não encontrado')
  }
  const produtos = new Set(novo.itens.map((item) => item.produtoId))
  if (produtos.size !== novo.itens.length) {
    throw new ErroDeNegocio('item_repetido', 'Cada produto aparece uma vez só no pedido; use a quantidade')
  }

  const criadoEm = agora.toISOString()
  return emTransacao(banco, () => {
    const itens: ItemDoPedido[] = novo.itens.map((item) => {
      const produto = buscarProduto(banco, item.produtoId)
      if (!produto || !produto.ativo) {
        throw new ErroDeNegocio('produto_indisponivel', `O produto ${item.produtoId} não está à venda`)
      }
      if (!baixarEstoque(banco, produto.id, item.quantidade)) {
        throw new ErroDeNegocio('estoque_insuficiente', `Não há estoque suficiente de ${produto.nome}`)
      }
      return { produtoId: produto.id, quantidade: item.quantidade, precoUnitario: precoDeVenda(produto) }
    })
    const total = somar(itens.map((item) => multiplicar(item.precoUnitario, item.quantidade)))
    const id = inserirPedido(banco, { clienteId: novo.clienteId, status: 'pago', total, criadoEm, itens })
    registrarEvento(banco, id, { de: null, para: 'pago', em: criadoEm })
    return buscarPedido(banco, id)!
  })
}
