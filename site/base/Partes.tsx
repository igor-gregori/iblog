import type { ReactNode } from 'react'

export interface ItemDasPartes<Id extends string> {
  /** Âncora da parte, usada no sumário e nos links. */
  id: Id
  titulo: string
}

/**
 * As partes numeradas de um artigo, a partir da lista em ordem. Devolve a seção de cada parte (a rubrica
 * "Parte N" e o título) e o link para uma parte pelo número ("parte 4").
 */
export function partes<Id extends string>(lista: readonly ItemDasPartes<Id>[]) {
  const posicao = (id: Id) => lista.findIndex((item) => item.id === id)

  function Parte({ id, children }: { id: Id; children: ReactNode }) {
    return (
      <section className="secao" id={id} aria-labelledby={`${id}-titulo`}>
        <p className="rubrica">Parte {posicao(id) + 1}</p>
        <h2 id={`${id}-titulo`}>{lista[posicao(id)].titulo}</h2>
        {children}
      </section>
    )
  }

  function Ver({ id }: { id: Id }) {
    // Espaço que não quebra: "parte" e o número ficam sempre na mesma linha.
    return <a href={`#${id}`}>parte&nbsp;{posicao(id) + 1}</a>
  }

  return { Parte, Ver }
}
