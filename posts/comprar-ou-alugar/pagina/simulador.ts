/**
 * Comprar × alugar e investir: a conta, mês a mês, para um cenário de taxas fixas.
 *
 * É a mesma lógica de `src/comprar_ou_alugar/simulador.py`, que explica as regras.
 * Os nomes dos campos são os do Python, e `test/simulador.test.ts` confere que os
 * dois dão os mesmos números.
 */

export interface Parametros {
  valor_imovel: number
  aluguel_mensal: number
  entrada_pct: number
  custos_compra_pct: number
  juros_aa: number
  prazo_meses: number
  sistema: 'SAC' | 'PRICE'
  manutencao_aa: number
  corretagem_venda_pct: number
  ir_ganho_carteira: number
  disciplina: number
}

/** Taxas anuais nominais, fixas durante todo o período. */
export interface Cenario {
  meses: number
  valorizacao_aa: number
  reajuste_aluguel_aa: number
  carteira_retorno_aa: number
  carteira_rendimento_aa: number
  inflacao_aa: number
}

/** Uma posição por mês; a posição 0 é o dia da compra. Valores nominais. */
export interface Resultado {
  valor_imovel: number[]
  saldo_devedor: number[]
  gasto_comprador: number[]
  aluguel: number[]
  carteira_comprador: number[]
  carteira_inquilino: number[]
  patrimonio_comprador: number[]
  patrimonio_inquilino: number[]
  deflator: number[]
  /** Patrimônio da inquilina menos o da compradora, em valores de hoje, como fração do preço do imóvel. */
  vantagem_do_aluguel: number[]
}

export const PADRAO: Omit<Parametros, 'valor_imovel' | 'aluguel_mensal' | 'juros_aa'> = {
  entrada_pct: 0.2,
  custos_compra_pct: 0.05,
  prazo_meses: 360,
  sistema: 'SAC',
  manutencao_aa: 0.01,
  corretagem_venda_pct: 0.06,
  ir_ganho_carteira: 0.2,
  disciplina: 1,
}

export function taxaMensal(taxaAa: number): number {
  return (1 + taxaAa) ** (1 / 12) - 1
}

/** Parcela e saldo devedor (depois de pagar) do mês `mes`, contado a partir de 1. */
function parcelaDoMes(p: Parametros, financiado: number, mes: number): { parcela: number; saldo: number } {
  if (mes > p.prazo_meses) return { parcela: 0, saldo: 0 }
  const i = taxaMensal(p.juros_aa)
  const pagas = mes - 1

  if (p.sistema === 'SAC') {
    const amortizacao = financiado / p.prazo_meses
    const saldoAntes = financiado - amortizacao * pagas
    return { parcela: saldoAntes * i + amortizacao, saldo: saldoAntes - amortizacao }
  }

  if (i === 0) {
    const parcela = financiado / p.prazo_meses
    return { parcela, saldo: financiado - parcela * mes }
  }
  const parcela = (financiado * i) / (1 - (1 + i) ** -p.prazo_meses)
  const saldoAntes = financiado * (1 + i) ** pagas - (parcela * ((1 + i) ** pagas - 1)) / i
  return { parcela, saldo: saldoAntes * (1 + i) - parcela }
}

export function simular(p: Parametros, c: Cenario): Resultado {
  const tamanho = c.meses + 1
  const vazio = () => Array.from<number>({ length: tamanho }).fill(0)
  const r: Resultado = {
    valor_imovel: vazio(),
    saldo_devedor: vazio(),
    gasto_comprador: vazio(),
    aluguel: vazio(),
    carteira_comprador: vazio(),
    carteira_inquilino: vazio(),
    patrimonio_comprador: vazio(),
    patrimonio_inquilino: vazio(),
    deflator: vazio(),
    vantagem_do_aluguel: vazio(),
  }

  const valorizacao = taxaMensal(c.valorizacao_aa)
  const reajuste = taxaMensal(c.reajuste_aluguel_aa)
  const retorno = taxaMensal(c.carteira_retorno_aa)
  const rendimento = taxaMensal(c.carteira_rendimento_aa)
  const inflacao = taxaMensal(c.inflacao_aa)

  const financiado = p.valor_imovel * (1 - p.entrada_pct)
  const aluguelMercado = vazio()
  // Custo de aquisição de cada carteira: a base do imposto sobre o ganho de capital.
  const custoComprador = vazio()
  const custoInquilino = vazio()

  r.valor_imovel[0] = p.valor_imovel
  r.saldo_devedor[0] = financiado
  r.deflator[0] = 1
  aluguelMercado[0] = p.aluguel_mensal
  // A inquilina começa investindo o que a compradora gastou para comprar.
  r.carteira_inquilino[0] = custoInquilino[0] = p.valor_imovel * (p.entrada_pct + p.custos_compra_pct)

  for (let t = 1; t <= c.meses; t++) {
    const k = t - 1
    const { parcela, saldo } = parcelaDoMes(p, financiado, t)
    r.saldo_devedor[t] = saldo
    r.gasto_comprador[t] = parcela + (r.valor_imovel[k] * p.manutencao_aa) / 12
    // O contrato de aluguel é reajustado ao valor de mercado uma vez por ano.
    r.aluguel[t] = aluguelMercado[k - (k % 12)]

    // Quem gastou menos no mês investe a diferença.
    const diferenca = r.gasto_comprador[t] - r.aluguel[t]
    const aporteInquilino = Math.max(diferenca, 0) * p.disciplina
    const aporteComprador = Math.max(-diferenca, 0) * p.disciplina

    r.carteira_inquilino[t] = r.carteira_inquilino[k] * (1 + retorno) + aporteInquilino
    r.carteira_comprador[t] = r.carteira_comprador[k] * (1 + retorno) + aporteComprador
    // Rendimento reinvestido é uma compra nova: aumenta o custo de aquisição.
    custoInquilino[t] = custoInquilino[k] + r.carteira_inquilino[k] * rendimento + aporteInquilino
    custoComprador[t] = custoComprador[k] + r.carteira_comprador[k] * rendimento + aporteComprador

    r.valor_imovel[t] = r.valor_imovel[k] * (1 + valorizacao)
    aluguelMercado[t] = aluguelMercado[k] * (1 + reajuste)
    r.deflator[t] = r.deflator[k] * (1 + inflacao)
  }

  const liquida = (carteira: number, custo: number) => carteira - p.ir_ganho_carteira * Math.max(carteira - custo, 0)
  for (let t = 0; t <= c.meses; t++) {
    r.patrimonio_inquilino[t] = liquida(r.carteira_inquilino[t], custoInquilino[t])
    r.patrimonio_comprador[t] =
      r.valor_imovel[t] * (1 - p.corretagem_venda_pct) -
      r.saldo_devedor[t] +
      liquida(r.carteira_comprador[t], custoComprador[t])
    r.vantagem_do_aluguel[t] =
      (r.patrimonio_inquilino[t] - r.patrimonio_comprador[t]) / r.deflator[t] / p.valor_imovel
  }
  return r
}
