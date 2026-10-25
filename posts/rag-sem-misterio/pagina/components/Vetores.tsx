import { useId, useRef, useState } from 'react'
import { Figura } from '#base/Figura.tsx'
import { numero, pct } from '#base/formato.ts'
import { useLargura } from '#base/useLargura.ts'
import { grupo, GRUPOS, tamanho, type Dados } from '../dados.ts'

/** Quantos dos pedaços mais parecidos a figura destaca. */
const DESTACADOS = 3

interface Props {
  dados: Dados
  /** A pergunta de teste antes de o leitor mexer. */
  inicial: string
}

/**
 * O que a busca por significado vê: os pedaços num mapa, agrupados pelo assunto que os vetores dizem, e a régua com o
 * cosseno dos pedaços mais parecidos com a pergunta. Os 3 primeiros e o pedaço com a resposta ficam marcados nos dois.
 */
export function Vetores({ dados, inicial }: Props) {
  const id = useId()
  const caixa = useRef<HTMLDivElement>(null)
  const largura = useLargura(caixa)
  const [escolhida, setEscolhida] = useState(inicial)
  const t = tamanho(dados, dados.tamanho_padrao)
  const pergunta = dados.perguntas.find((p) => p.id === escolhida)!
  const lista = t.significado[pergunta.id]
  const primeiros = lista.slice(0, DESTACADOS).map(([i]) => i)
  const certo = (i: number) => t.pedacos[i].texto.includes(pergunta.trecho)
  const posicaoDoCerto = t.posicoes[pergunta.id].significado

  // O mapa: a mesma escala nos dois eixos, para a distância no desenho ser a do plano.
  const altura = Math.round(Math.min(380, Math.max(260, largura * 0.62)))
  const margem = 14
  const xs = dados.mapa.pontos.map(([x]) => x)
  const ys = dados.mapa.pontos.map(([, y]) => y)
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const escala = Math.min((largura - 2 * margem) / (x1 - x0 || 1), (altura - 2 * margem) / (y1 - y0 || 1))
  const deslocaX = (largura - (x1 - x0) * escala) / 2
  const deslocaY = (altura - (y1 - y0) * escala) / 2
  const px = (x: number) => deslocaX + (x - x0) * escala
  const py = (y: number) => altura - (deslocaY + (y - y0) * escala)

  // A régua: os cossenos dos pedaços guardados, do menor ao maior.
  const alturaRegua = 70
  const cossenos = lista.map(([, c]) => c)
  const [c0, c1] = [Math.min(...cossenos), Math.max(...cossenos)]
  const rx = (c: number) => margem + ((c - c0) / (c1 - c0 || 1)) * (largura - 2 * margem)
  const marcas = [0, 0.5, 1].map((f) => c0 + f * (c1 - c0))

  const nomeDoPedaco = (i: number) => {
    const p = t.pedacos[i]
    return [p.arquivo, ...p.titulos.slice(1)].join(' › ')
  }

  return (
    <Figura
      titulo="O que a busca por significado vê"
      subtitulo={`Cada ponto é um dos ${numero(t.pedacos.length)} pedaços de até ${dados.tamanho_padrao} tokens. Os números marcam os ${DESTACADOS} mais parecidos com a pergunta; o anel, o pedaço com a resposta.`}
      legenda={[
        ...GRUPOS.map((g) => ({ nome: g.nome, cor: g.cor, marca: 'area' as const })),
      ]}
      fonte={`O mapa reduz os vetores de 1.024 números a 2, nas direções em que eles mais variam (análise de componentes principais), e guarda ${pct(dados.mapa.explicado)} das diferenças: perto no mapa costuma ser parecido, mas nem sempre. A régua mostra o cosseno dos ${lista.length} pedaços mais parecidos com a pergunta, a medida que a busca usa de verdade.`}
      tabela={{
        colunas: ['Posição', 'Pedaço', 'Cosseno', 'Tem a resposta'],
        linhas: lista.slice(0, 10).map(([i, c], n) => [`${n + 1}º`, nomeDoPedaco(i), numero(c, 3), certo(i) ? 'sim' : '']),
      }}
    >
      <div className="campos um-campo">
        <div className="campo">
          <label htmlFor={id}>Pergunta de teste</label>
          <select id={id} value={escolhida} onChange={(evento) => setEscolhida(evento.target.value)}>
            {dados.perguntas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.pergunta}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grafico vetores" ref={caixa}>
        {largura > 0 && (
          <>
            <svg
              width={largura}
              height={altura}
              role="img"
              aria-label={`Mapa dos pedaços. Os ${DESTACADOS} mais parecidos com a pergunta: ${primeiros.map(nomeDoPedaco).join('; ')}.`}
            >
              {dados.mapa.pontos.map(([x, y], i) =>
                primeiros.includes(i) ? null : (
                  <circle
                    key={i}
                    className={`g-ponto${certo(i) ? ' vetores-certo' : ''}`}
                    cx={px(x)}
                    cy={py(y)}
                    r={certo(i) ? 5.5 : 3.5}
                    style={{ fill: grupo(t.pedacos[i].arquivo).cor }}
                  >
                    <title>{nomeDoPedaco(i)}</title>
                  </circle>
                ),
              )}
              {primeiros.map((i, n) => {
                const [x, y] = dados.mapa.pontos[i]
                return (
                  <g key={i}>
                    <circle className={`g-ponto vetores-destaque${certo(i) ? ' vetores-certo' : ''}`} cx={px(x)} cy={py(y)} r={7} style={{ fill: grupo(t.pedacos[i].arquivo).cor }}>
                      <title>{`${n + 1}º: ${nomeDoPedaco(i)}`}</title>
                    </circle>
                    <text className="g-rotulo vetores-numero" x={px(x) + 10} y={py(y)} dy="0.32em">
                      {n + 1}
                    </text>
                  </g>
                )
              })}
            </svg>
            <svg width={largura} height={alturaRegua} role="img" aria-label="Cosseno dos pedaços mais parecidos com a pergunta">
              <line className="g-eixo" x1={margem} x2={largura - margem} y1={30} y2={30} />
              {marcas.map((m) => (
                <text key={m} className="g-tique" x={rx(m)} y={56} textAnchor="middle">
                  {numero(m, 3)}
                </text>
              ))}
              {lista
                .slice()
                .reverse()
                .map(([i, c], n) => {
                  const posicao = lista.length - n
                  const destaque = posicao <= DESTACADOS
                  return (
                    <g key={i}>
                      <circle
                        className={`g-ponto${certo(i) ? ' vetores-certo' : ''}`}
                        cx={rx(c)}
                        cy={30}
                        r={destaque || certo(i) ? 6 : 3.5}
                        style={{ fill: destaque ? grupo(t.pedacos[i].arquivo).cor : 'var(--contexto)' }}
                      >
                        <title>{`${posicao}º, cosseno ${numero(c, 3)}: ${nomeDoPedaco(i)}`}</title>
                      </circle>
                      {destaque && (
                        <text className="g-rotulo vetores-numero" x={rx(c)} y={12} textAnchor="middle">
                          {posicao}
                        </text>
                      )}
                    </g>
                  )
                })}
            </svg>
          </>
        )}
      </div>
      <p className="busca-resposta">
        A resposta está em <code>{pergunta.arquivo}</code>.{' '}
        {posicaoDoCerto === null
          ? `Na busca por significado, ela ficou fora dos ${lista.length} primeiros.`
          : posicaoDoCerto === 1
            ? 'Na busca por significado, ela veio em primeiro.'
            : `Na busca por significado, ela veio em ${posicaoDoCerto}º lugar.`}{' '}
        Os {DESTACADOS} primeiros: {primeiros.map((i, n) => `${n + 1}º ${nomeDoPedaco(i)} (${numero(lista[n][1], 3)})`).join('; ')}.
      </p>
    </Figura>
  )
}
