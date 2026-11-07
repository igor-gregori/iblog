import { emTransacao, type Banco } from '../banco.ts'
import { Conflito } from '../erros.ts'
import { registrarEvento, type Pedido } from './repositorio.ts'

/**
 * O caminho de um pedido: nasce pago (o pagamento acontece antes, fora daqui), é enviado e depois entregue.
 * Toda mudança de status passa por `mudarStatus`, que confere se a mudança é permitida e registra o evento.
 */
export type Status = 'pago' | 'enviado' | 'entregue'

const TRANSICOES: Record<Status, Status[]> = {
  pago: ['enviado'],
  enviado: ['entregue'],
  entregue: [],
}

/** A coluna de `pedidos` que guarda quando o pedido chegou a cada status, se houver. */
const COLUNA_DA_DATA: Partial<Record<Status, string>> = {
  enviado: 'enviado_em',
  entregue: 'entregue_em',
}

export function podeMudar(de: Status, para: Status): boolean {
  return TRANSICOES[de].includes(para)
}

export function mudarStatus(banco: Banco, pedido: Pedido, para: Status, agora: Date): void {
  if (!podeMudar(pedido.status, para)) {
    throw new Conflito('transicao_invalida', `Um pedido ${pedido.status} não pode passar para ${para}`)
  }
  const em = agora.toISOString()
  emTransacao(banco, () => {
    const coluna = COLUNA_DA_DATA[para]
    if (coluna) {
      banco.prepare(`UPDATE pedidos SET status = ?, ${coluna} = ? WHERE id = ?`).run(para, em, pedido.id)
    } else {
      banco.prepare('UPDATE pedidos SET status = ? WHERE id = ?').run(para, pedido.id)
    }
    registrarEvento(banco, pedido.id, { de: pedido.status, para, em })
  })
}
