export type Veredito = 'verdade' | 'em-parte' | 'falso'

const ROTULOS: Record<Veredito, string> = {
  verdade: 'Verdade',
  'em-parte': 'Em parte',
  falso: 'Falso',
}

// Certo, meio círculo e xis: o veredito nunca depende só da cor.
const ICONES: Record<Veredito, string> = {
  verdade: 'M5 12.5l4.5 4.5L19 7.5',
  'em-parte': 'M12 4a8 8 0 100 16zM12 4a8 8 0 010 16',
  falso: 'M6 6l12 12M18 6L6 18',
}

interface Props {
  veredito: Veredito
  /** Texto no lugar do rótulo padrão (ex.: "Verdade só em dólares"). */
  rotulo?: string
}

/** O carimbo de cada afirmação checada. */
export function Selo({ veredito, rotulo }: Props) {
  return (
    <span className={`selo selo-${veredito}`}>
      <span className="selo-icone" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill={veredito === 'em-parte' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={veredito === 'em-parte' ? 0 : 3} strokeLinecap="round" strokeLinejoin="round">
          {veredito === 'em-parte' ? (
            <>
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <path d="M12 4a8 8 0 000 16z" />
            </>
          ) : (
            <path d={ICONES[veredito]} />
          )}
        </svg>
      </span>
      {rotulo ?? ROTULOS[veredito]}
    </span>
  )
}
