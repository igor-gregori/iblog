import { useMemo } from 'react'
import { Topo } from '#base/Topo.tsx'
import { useDados, type Dados } from './dados.ts'
import { calcular } from './numeros.ts'
import { Abertura } from './secoes/Abertura.tsx'
import { Aposentadoria } from './secoes/Aposentadoria.tsx'
import { Contas } from './secoes/Contas.tsx'
import { Depois, Investimentos } from './secoes/Investimentos.tsx'
import { JuroReal } from './secoes/JuroReal.tsx'
import { Mundo } from './secoes/Mundo.tsx'
import { FacaASuaConta, Notas } from './secoes/Notas.tsx'
import { Regua } from './secoes/Regua.tsx'

export default function App() {
  const { dados, erro } = useDados()

  return (
    <>
      <Topo />
      {dados ? (
        <Pagina dados={dados} />
      ) : (
        <main className="artigo">
          <p className="aviso">{erro ? `Não foi possível carregar os dados (${erro}).` : 'Carregando os dados…'}</p>
        </main>
      )}
    </>
  )
}

function Pagina({ dados }: { dados: Dados }) {
  // Os números do texto saem dos dados, para continuarem certos quando as fontes forem atualizadas.
  const n = useMemo(() => calcular(dados), [dados])

  return (
    <main className="artigo">
      <Abertura dados={dados} n={n} />
      <Contas dados={dados} n={n} />
      <Regua dados={dados} n={n} />
      <JuroReal dados={dados} n={n} />
      <Mundo dados={dados} />
      <Investimentos dados={dados} n={n} />
      <Depois dados={dados} n={n} />
      <Aposentadoria dados={dados} n={n} />
      <FacaASuaConta dados={dados} />
      <Notas dados={dados} n={n} />
    </main>
  )
}
