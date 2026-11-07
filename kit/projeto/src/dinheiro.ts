/**
 * Todo valor em dinheiro é um número inteiro de centavos: R$ 12,90 é 1290. Nunca use número quebrado para dinheiro.
 */
export type Centavos = number

export function ehCentavos(valor: unknown): valor is Centavos {
  return Number.isSafeInteger(valor) && (valor as number) >= 0
}

export function multiplicar(valor: Centavos, quantidade: number): Centavos {
  return valor * quantidade
}

export function somar(valores: Centavos[]): Centavos {
  return valores.reduce((soma, valor) => soma + valor, 0)
}

/** R$ 12,90, para mensagens. */
export function formatar(valor: Centavos): string {
  const reais = Math.floor(valor / 100)
  const centavos = String(valor % 100).padStart(2, '0')
  return `R$ ${reais.toLocaleString('pt-BR')},${centavos}`
}
