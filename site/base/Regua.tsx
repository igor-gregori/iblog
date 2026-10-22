import { useId } from 'react'

interface Props {
  rotulo: string
  valor: number
  min: number
  max: number
  passo: number
  formato: (valor: number) => string
  aoMudar: (valor: number) => void
}

/** Um controle deslizante com o rótulo e o valor em cima. */
export function Regua({ rotulo, valor, min, max, passo, formato, aoMudar }: Props) {
  const id = useId()
  return (
    <div className="campo">
      <label htmlFor={id}>
        {rotulo}
        <output htmlFor={id}>{formato(valor)}</output>
      </label>
      <input id={id} type="range" min={min} max={max} step={passo} value={valor} onChange={(evento) => aoMudar(evento.target.valueAsNumber)} />
    </div>
  )
}
