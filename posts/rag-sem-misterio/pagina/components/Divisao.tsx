import { useState } from 'react'
import { Figura, Opcoes } from '#base/Figura.tsx'
import { numero } from '#base/formato.ts'
import { tamanho, type Dados } from '../dados.ts'
import { Trecho } from './Trecho.tsx'

/** A seção que a figura mostra dividida: uma lista de regras do blog, de tamanho médio, que cai em um a seis pedaços. */
const ARQUIVO = 'CLAUDE.md'
const SECAO = 'O que precisa continuar verdadeiro'

/** Os documentos do blog divididos no tamanho que o leitor escolher, e uma seção para ver onde caem os cortes. */
export function Divisao({ dados }: { dados: Dados }) {
  const [maximo, setMaximo] = useState(String(dados.tamanho_padrao))
  const t = tamanho(dados, Number(maximo))
  const media = t.pedacos.reduce((soma, p) => soma + p.tokens, 0) / t.pedacos.length
  const maior = Math.max(...t.pedacos.map((p) => p.tokens))
  const daSecao = t.pedacos.filter((p) => p.arquivo === ARQUIVO && p.titulos.at(-1) === SECAO)

  return (
    <Figura
      titulo="Os documentos do blog em pedaços"
      subtitulo={`No máximo ${maximo} tokens por pedaço: ${numero(t.pedacos.length)} pedaços, com ${numero(media)} tokens em média e ${numero(maior)} no maior.`}
      controles={
        <Opcoes
          rotulo="Tamanho máximo do pedaço"
          opcoes={dados.tamanhos.map((x) => ({ valor: String(x.tamanho), nome: `${x.tamanho} tokens` }))}
          valor={maximo}
          aoMudar={setMaximo}
        />
      }
      fonte={`A seção "${SECAO}" do ${ARQUIVO} da raiz, cortada em ${daSecao.length} ${daSecao.length === 1 ? 'pedaço' : 'pedaços'}. Tokens contados com o o200k_base.`}
    >
      <ol className="pedacos">
        {daSecao.map((pedaco, i) => (
          <li key={i}>
            <Trecho pedaco={pedaco} corte={240} />
          </li>
        ))}
      </ol>
    </Figura>
  )
}
