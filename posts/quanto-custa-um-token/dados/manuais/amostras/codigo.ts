export async function cancelarPedido(id: string, clienteId: string) {
  const pedido = await banco.pedido.buscar(id)
  if (!pedido || pedido.clienteId !== clienteId) throw new NaoEncontrado('pedido')
  if (pedido.enviadoEm) throw new Conflito('o pedido já foi enviado; abra uma devolução')

  await pagamentos.estornar(pedido.pagamentoId)
  await estoque.devolver(pedido.itens)
  await emails.enviar(clienteId, 'pedido-cancelado', { id })
}
