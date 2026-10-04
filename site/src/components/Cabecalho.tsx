import { NOMES_DOS_TEMAS, type Tema } from '../hooks/useTema.ts'

interface Props {
  tema: Tema
  aoAlternarTema: () => void
}

const ICONES: Record<Tema, string> = {
  // Monitor, sol e lua, em traço simples.
  sistema: 'M4 5h16v11H4zM9 20h6M12 16v4',
  claro:
    'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  escuro: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
}

/** A faixa fina acima da manchete, como o alto de uma página de jornal. */
export function Cabecalho({ tema, aoAlternarTema }: Props) {
  const rotulo = `Tema: ${NOMES_DOS_TEMAS[tema]} (clique para trocar)`

  return (
    <header className="faixa">
      <span>Análise de dados</span>
      <button className="botao-tema" onClick={aoAlternarTema} aria-label={rotulo} title={rotulo}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={ICONES[tema]} />
        </svg>
      </button>
    </header>
  )
}
