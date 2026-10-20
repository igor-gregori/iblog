import { useEffect, useMemo, useState } from 'react'
import { Figura } from '#base/Figura.tsx'
import { numero } from '#base/formato.ts'
import type { Amostra } from '../dados.ts'

type ModuloDeTokens = typeof import('../tokens.ts')

// Um texto longo vira milhares de pedaços; a tela mostra os primeiros e conta todos.
const PEDACOS_NA_TELA = 1500

interface Props {
  amostras: Amostra[]
  /** Avisa quantos tokens o texto tem, para a calculadora poder usar. */
  aoContar?: (tokens: number) => void
}

/** O leitor escreve ou escolhe um texto e vê os pedaços em que o tokenizador o quebra. */
export function Tokenizador({ amostras, aoContar }: Props) {
  const [modulo, setModulo] = useState<ModuloDeTokens | null>(null)
  const [erro, setErro] = useState(false)
  const [escolhida, setEscolhida] = useState<string>(amostras[0].id)
  const [texto, setTexto] = useState(amostras[0].texto)

  // O tokenizador pesa uns 2 MB e chega depois do texto da página.
  useEffect(() => {
    import('../tokens.ts').then(setModulo, () => setErro(true))
  }, [])

  const pedacos = useMemo(() => (modulo ? modulo.pedacos(texto) : null), [modulo, texto])
  const tokens = pedacos ? pedacos.reduce((soma, [, quantos]) => soma + quantos, 0) : null
  const caracteres = [...texto].length

  useEffect(() => {
    if (tokens !== null) aoContar?.(tokens)
  }, [tokens, aoContar])

  function escolher(id: string) {
    setEscolhida(id)
    const amostra = amostras.find((a) => a.id === id)
    if (amostra) setTexto(amostra.texto)
  }

  return (
    <Figura
      titulo="Veja o texto virar tokens"
      subtitulo="Escreva ou cole qualquer texto. Cada caixa é um pedaço que o tokenizador conta como um token."
      controles={
        <div className="campo">
          <select aria-label="Texto de exemplo" value={escolhida} onChange={(evento) => escolher(evento.target.value)}>
            {amostras.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
            <option value="proprio">Meu texto</option>
          </select>
        </div>
      }
      fonte="Tokenizador o200k_base (o do GPT-4o e da família GPT-5), pelo gpt-tokenizer. Outros modelos quebram o texto de outro jeito."
    >
      <label className="tokenizador-campo">
        <span className="ajuda">O texto</span>
        <textarea
          value={texto}
          rows={6}
          spellCheck={false}
          onChange={(evento) => {
            setTexto(evento.target.value)
            setEscolhida('proprio')
          }}
        />
      </label>

      <dl className="tokenizador-numeros" aria-live="polite">
        <div>
          <dt>Tokens</dt>
          <dd>{tokens === null ? '…' : numero(tokens)}</dd>
        </div>
        <div>
          <dt>Caracteres</dt>
          <dd>{numero(caracteres)}</dd>
        </div>
        <div>
          <dt>Caracteres por token</dt>
          <dd>{tokens ? numero(caracteres / tokens, 1) : '–'}</dd>
        </div>
      </dl>

      {erro ? (
        <p className="aviso">Não foi possível carregar o tokenizador.</p>
      ) : pedacos === null ? (
        <p className="ajuda">Carregando o tokenizador…</p>
      ) : (
        <p className="tokenizador-pedacos" aria-label="O texto quebrado em tokens">
          {pedacos.slice(0, PEDACOS_NA_TELA).map(([pedaco, quantos], i) => (
            <span key={i} className={quantos > 1 ? 'varios' : undefined} title={quantos > 1 ? `${quantos} tokens` : undefined}>
              {visivel(pedaco)}
            </span>
          ))}
          {pedacos.length > PEDACOS_NA_TELA && <em> … e mais {numero(pedacos.length - PEDACOS_NA_TELA)} pedaços</em>}
        </p>
      )}
    </Figura>
  )
}

/** Espaços e quebras de linha também viram tokens: aqui eles aparecem como · e ↵. */
function visivel(pedaco: string) {
  const partes = pedaco.replaceAll(' ', '·').replaceAll('\t', '→').split('\n')
  return partes.flatMap((parte, i) => (i === 0 ? [parte] : ['↵', <br key={i} />, parte]))
}
