import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const PASTA_DE_MIGRACOES = join(import.meta.dirname, 'migracoes')

export type Banco = DatabaseSync

/** Abre o banco e aplica as migrações que faltam. Sem caminho, o banco fica só na memória (é o que os testes usam). */
export function abrirBanco(caminho = ':memory:'): Banco {
  const banco = new DatabaseSync(caminho)
  banco.exec('PRAGMA foreign_keys = ON')
  migrar(banco)
  return banco
}

/** Aplica, em ordem de nome, os arquivos de `src/migracoes` que ainda não foram aplicados. */
export function migrar(banco: Banco): void {
  banco.exec('CREATE TABLE IF NOT EXISTS migracoes (nome TEXT PRIMARY KEY, aplicada_em TEXT NOT NULL)')
  const aplicadas = new Set(
    (banco.prepare('SELECT nome FROM migracoes').all() as { nome: string }[]).map((linha) => linha.nome),
  )
  const arquivos = readdirSync(PASTA_DE_MIGRACOES)
    .filter((nome) => nome.endsWith('.sql'))
    .sort()
  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) continue
    emTransacao(banco, () => {
      banco.exec(readFileSync(join(PASTA_DE_MIGRACOES, arquivo), 'utf8'))
      banco.prepare("INSERT INTO migracoes (nome, aplicada_em) VALUES (?, datetime('now'))").run(arquivo)
    })
  }
}

let profundidade = 0

/**
 * Roda `fn` numa transação: se ela lançar um erro, nada do que fez fica gravado. Pode ser chamada dentro de outra
 * (vira um savepoint).
 */
export function emTransacao<T>(banco: Banco, fn: () => T): T {
  const nome = `t${profundidade++}`
  banco.exec(`SAVEPOINT ${nome}`)
  try {
    const resultado = fn()
    banco.exec(`RELEASE ${nome}`)
    return resultado
  } catch (erro) {
    banco.exec(`ROLLBACK TO ${nome}`)
    banco.exec(`RELEASE ${nome}`)
    throw erro
  } finally {
    profundidade--
  }
}
