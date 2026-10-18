import { useMemo, useState } from 'react'
import { Figura, Opcoes } from '#base/Figura.tsx'
import { GraficoBarras } from '#base/GraficoBarras.tsx'
import { pct } from '#base/formato.ts'
import { prever, treinar } from '../brinquedo.ts'
import { ANTES_DO_CORTE, DEPOIS_DO_CORTE } from '../corpus.ts'

type Treino = 'antes' | 'um' | 'dez'

const TREINOS: { valor: Treino; nome: string }[] = [
  { valor: 'antes', nome: 'Até o corte' },
  { valor: 'um', nome: '+ 1 exemplo da velox' },
  { valor: 'dez', nome: '+ 10 exemplos' },
]

const TEXTOS: Record<Treino, string> = {
  antes: ANTES_DO_CORTE,
  um: ANTES_DO_CORTE + DEPOIS_DO_CORTE,
  dez: ANTES_DO_CORTE + DEPOIS_DO_CORTE.repeat(10),
}

type Contexto = 'app .' | '= await' | 'async ('

// Cada contexto é escrito como no código; no botão, com o cursor onde o modelo vai continuar.
const CONTEXTOS: { valor: Contexto; codigo: string; nome: string }[] = [
  { valor: 'app .', codigo: 'app.', nome: 'app.▏' },
  { valor: '= await', codigo: '= await', nome: '= await ▏' },
  { valor: 'async (', codigo: 'async (', nome: 'async (▏' },
]

/** O modelo de brinquedo: o leitor troca o texto de treino e vê a previsão do próximo token mudar. */
export function Brinquedo() {
  const [treino, setTreino] = useState<Treino>('antes')
  const [contexto, setContexto] = useState<Contexto>('app .')
  const contagens = useMemo(() => treinar(TEXTOS[treino]), [treino])
  const previsoes = prever(contagens, contexto)
  const codigo = CONTEXTOS.find((c) => c.valor === contexto)!.codigo

  return (
    <Figura
      titulo="Qual é o próximo token?"
      subtitulo={`Depois de “${codigo}”, a chance de cada token, contando o texto de treino.`}
      controles={<Opcoes rotulo="Texto de treino" opcoes={TREINOS} valor={treino} aoMudar={setTreino} />}
      fonte="Um modelo de brinquedo: conta qual token veio depois de cada par de tokens num texto de cerca de 50 linhas de código, escrito para esta página. A velox é uma biblioteca inventada."
    >
      <div className="brinquedo-contexto">
        <span>O código termina em</span>
        <Opcoes rotulo="Onde o código termina" opcoes={CONTEXTOS} valor={contexto} aoMudar={setContexto} />
      </div>
      <GraficoBarras
        grupos={[{ barras: previsoes.map((p) => ({ nome: p.token, valor: p.chance, cor: 'var(--serie-1)', nota: `${p.vezes}×` })) }]}
        formato={(valor) => pct(valor)}
        descricao={`Próximos tokens depois de ${codigo}: ${previsoes.map((p) => `${p.token}, ${pct(p.chance)}`).join('; ')}`}
      />
      <details className="dados">
        <summary>Ver o texto de treino</summary>
        <pre className="brinquedo-texto">
          <code>{treino === 'antes' ? ANTES_DO_CORTE.trim() : `${ANTES_DO_CORTE.trim()}\n\n// Depois do corte${treino === 'dez' ? ' (dez vezes)' : ''}:\n${DEPOIS_DO_CORTE.trim()}`}</code>
        </pre>
      </details>
    </Figura>
  )
}
