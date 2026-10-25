import { useState } from 'react'
import { Figura, Opcoes } from '#base/Figura.tsx'
import { GraficoBarras } from '#base/GraficoBarras.tsx'
import { pct } from '#base/formato.ts'
import { METODOS, tamanho, type Dados } from '../dados.ts'

type Busca = 'palavras' | 'significado'

/** Quantas perguntas cada busca acerta com o arquivo e os títulos no pedaço, e com só o texto dele. */
export function Lugar({ dados }: { dados: Dados }) {
  const [k, setK] = useState('3')
  const t = tamanho(dados, dados.tamanho_padrao)
  const total = dados.perguntas.length
  const conta = (posicao: (id: string) => number | null) =>
    dados.perguntas.filter((p) => (posicao(p.id) ?? Infinity) <= Number(k)).length
  const com = (metodo: Busca) => conta((id) => t.posicoes[id][metodo])
  const sem = (metodo: Busca) => conta((id) => dados.sem_lugar[id][metodo])
  const metodos = METODOS.filter((m): m is (typeof METODOS)[number] & { id: Busca } => m.id !== 'hibrida')

  return (
    <Figura
      titulo="O nome do arquivo e os títulos ajudam a achar"
      subtitulo={`Parte das ${total} perguntas com o pedaço da resposta entre os ${k === '1' ? 'primeiros' : `${k} primeiros`}, com pedaços de até ${dados.tamanho_padrao} tokens.`}
      legenda={[
        { nome: 'Com o arquivo e os títulos no pedaço', cor: 'var(--serie-1)', marca: 'area' },
        { nome: 'Só o texto do pedaço', cor: 'var(--contexto)', marca: 'area' },
      ]}
      controles={
        <Opcoes
          rotulo="Quantos pedaços vão para o pedido"
          opcoes={['1', '3', '5'].map((v) => ({ valor: v, nome: v === '1' ? 'o 1º' : `os ${v} primeiros` }))}
          valor={k}
          aoMudar={setK}
        />
      }
      fonte="As mesmas perguntas, os mesmos pedaços e o mesmo modelo; só muda o que a busca vê de cada pedaço."
      tabela={{
        colunas: ['Busca', 'Com o arquivo e os títulos', 'Só o texto'],
        linhas: metodos.map((m) => [m.nome, `${com(m.id)} de ${total}`, `${sem(m.id)} de ${total}`]),
      }}
    >
      <GraficoBarras
        grupos={metodos.map((m) => ({
          titulo: m.nome,
          barras: [
            { nome: 'Com o arquivo e os títulos', valor: com(m.id) / total, cor: 'var(--serie-1)' },
            { nome: 'Só o texto', valor: sem(m.id) / total, cor: 'var(--contexto)' },
          ],
        }))}
        formato={(v) => pct(v)}
        descricao={metodos.map((m) => `${m.nome}: ${com(m.id)} de ${total} com o arquivo e os títulos, ${sem(m.id)} só com o texto`).join('. ')}
      />
    </Figura>
  )
}
