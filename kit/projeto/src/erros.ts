/**
 * Um erro que o cliente da API pode resolver: dado que não existe, regra do negócio, conflito. Sai na resposta como
 * `{ erro: { codigo, mensagem } }`, com o status HTTP do erro.
 */
export class ErroDeNegocio extends Error {
  readonly codigo: string
  readonly status: number

  constructor(codigo: string, mensagem: string, status = 422) {
    super(mensagem)
    this.codigo = codigo
    this.status = status
  }
}

export class NaoEncontrado extends ErroDeNegocio {
  constructor(oQue: string) {
    super('nao_encontrado', `${oQue} não encontrado`, 404)
  }
}

export class Conflito extends ErroDeNegocio {
  constructor(codigo: string, mensagem: string) {
    super(codigo, mensagem, 409)
  }
}
