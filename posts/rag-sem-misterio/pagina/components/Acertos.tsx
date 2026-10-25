import { useState } from 'react'
import { Figura, Opcoes } from '#base/Figura.tsx'
import { GraficoBarras } from '#base/GraficoBarras.tsx'
import { pct } from '#base/formato.ts'
import { acertos, METODOS, tamanho, TIPOS, type Dados, type Tipo } from '../dados.ts'

/** Quantas perguntas de teste cada busca acertou, por tipo de pergunta, no tamanho de pedaço que o leitor escolher. */
export function Acertos({ dados }: { dados: Dados }) {
  const [maximo, setMaximo] = useState(String(dados.tamanho_padrao))
  const [k, setK] = useState('3')
  const t = tamanho(dados, Number(maximo))
  const grupos: { tipo?: Tipo; titulo: string }[] = [...TIPOS.map((x) => ({ tipo: x.id, titulo: x.nome })), { titulo: 'Todas' }]
  const total = (tipo?: Tipo) => dados.perguntas.filter((p) => !tipo || p.tipo === tipo).length

  return (
    <Figura
      titulo="Quantas vezes a resposta veio entre os primeiros"
      subtitulo={`Parte das ${dados.perguntas.length} perguntas de teste em que o pedaço com a resposta ficou entre os ${k} primeiros, com pedaços de até ${maximo} tokens.`}
      legenda={METODOS.map((m) => ({ nome: m.nome, cor: m.cor, marca: 'area' }))}
      controles={
        <>
          <Opcoes
            rotulo="Quantos pedaços vão para o pedido"
            opcoes={['1', '3', '5'].map((v) => ({ valor: v, nome: v === '1' ? 'o 1º' : `os ${v} primeiros` }))}
            valor={k}
            aoMudar={setK}
          />
          <Opcoes
            rotulo="Tamanho máximo do pedaço"
            opcoes={dados.tamanhos.map((x) => ({ valor: String(x.tamanho), nome: `${x.tamanho}` }))}
            valor={maximo}
            aoMudar={setMaximo}
          />
        </>
      }
      fonte="Um pedaço acerta quando contém o trecho que responde a pergunta. Com poucas perguntas, uma ou duas de diferença é ruído."
      tabela={{
        colunas: ['Perguntas', ...METODOS.map((m) => m.nome)],
        linhas: grupos.map((g) => [g.titulo, ...METODOS.map((m) => `${acertos(dados, t, m.id, Number(k), g.tipo)} de ${total(g.tipo)}`)]),
      }}
    >
      <GraficoBarras
        grupos={grupos.map((g) => ({
          titulo: g.titulo,
          barras: METODOS.map((m) => ({ nome: m.nome, valor: acertos(dados, t, m.id, Number(k), g.tipo) / total(g.tipo), cor: m.cor })),
        }))}
        formato={(v) => pct(v)}
        descricao={grupos
          .map((g) => `${g.titulo}: ${METODOS.map((m) => `${m.nome}, ${acertos(dados, t, m.id, Number(k), g.tipo)} de ${total(g.tipo)}`).join('; ')}`)
          .join('. ')}
      />
    </Figura>
  )
}
