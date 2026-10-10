import { ICONES_DOS_TEMAS, rotuloDoTema } from './tema.ts'
import { useTema } from './useTema.ts'

/** A barra fina do alto de todo post: a volta para a capa do blog e o botão de tema. */
export function Topo() {
  const { tema, alternar } = useTema()
  const rotulo = rotuloDoTema(tema)

  return (
    <header className="topo">
      <a href="/">← Todos os posts</a>
      <button className="botao-tema" type="button" onClick={alternar} aria-label={rotulo} title={rotulo}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={ICONES_DOS_TEMAS[tema]} />
        </svg>
      </button>
    </header>
  )
}
