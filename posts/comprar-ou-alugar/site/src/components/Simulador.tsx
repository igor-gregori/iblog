import { useId, useMemo, useState, type ReactNode } from 'react'
import { fundosATaxasFixas, fundosDoPassado, rendimentoMedioDoMercado, rentabilidadeDoAluguel, retornoReal } from '../conta.ts'
import type { Dados } from '../dados.ts'
import { mesAno, numero, pct, reais, reaisCurto } from '../formato.ts'
import { PADRAO, simular, type Parametros } from '../simulador.ts'
import { Figura, Opcoes } from './Figura.tsx'
import { GraficoLinhas } from './GraficoLinhas.tsx'
import { MapaDeCalor } from './MapaDeCalor.tsx'

/** O que a pessoa escolhe na tela. Percentuais em pontos (20 = 20%), prazos em anos. */
interface Entradas {
  cidade: string
  disponivel: number
  aluguel: number
  financiar: boolean
  /** Preço do imóvel quando parte dele é financiada; à vista, o preço sai do dinheiro disponível. */
  valor: number
  juros: number
  prazo: number
  horizonte: number
  /** Rendimento dos fundos, em pontos ao mês (1 = 1% ao mês). */
  rendimento: number
  /** Variação do preço da cota, ao ano, sem descontar a inflação. */
  cota: number
  /** Valorização do imóvel, ao ano, acima da inflação. */
  valorizacao: number
  inflacao: number
  manutencao: number
  custos: number
  corretagem: number
  disciplina: number
  sistema: 'SAC' | 'PRICE'
}

// A grade do mapa de calor; os controles usam os mesmos limites.
const VALORIZACOES = Array.from({ length: 17 }, (_, i) => -3 + i * 0.5)
const RENDIMENTOS = Array.from({ length: 25 }, (_, i) => Math.round((0.3 + i * 0.05) * 100) / 100)
const LIMITE_DA_ESCALA = 1.5
const ENTRADA_MINIMA = 0.2

function precoDoImovel(e: Entradas): number {
  return e.financiar ? e.valor : e.disponivel / (1 + e.custos / 100)
}

/** O aluguel de um imóvel igual acompanha o preço, pela rentabilidade do aluguel da cidade. */
function comAluguel(dados: Dados, e: Entradas): Entradas {
  const aluguel = (precoDoImovel(e) * rentabilidadeDoAluguel(dados.hoje[e.cidade])) / 12
  return { ...e, aluguel: Math.round(aluguel / 10) * 10 }
}

function duracao(meses: number): string {
  const anos = Math.floor(meses / 12)
  const resto = meses % 12
  const partes = []
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`)
  if (resto > 0 || anos === 0) partes.push(`${resto} ${resto === 1 ? 'mês' : 'meses'}`)
  return partes.join(' e ')
}

/** 0.008 → "0,8%"; 0.0075 → "0,75%" */
function pctAoMes(valor: number): string {
  return pct(valor, Math.abs(valor * 1000 - Math.round(valor * 1000)) < 1e-9 ? 1 : 2)
}

export function Simulador({ dados }: { dados: Dados }) {
  const { taxas } = dados
  const mediaDoMercado = rendimentoMedioDoMercado(taxas)
  const [e, setE] = useState<Entradas>(() =>
    comAluguel(dados, {
      cidade: 'Varginha',
      disponivel: 500_000,
      aluguel: 0,
      financiar: false,
      valor: 1_000_000,
      juros: Math.round(taxas.juros_financiamento_aa * 1000) / 10,
      prazo: PADRAO.prazo_meses / 12,
      horizonte: 10,
      rendimento: 1,
      cota: 0,
      valorizacao: 0,
      inflacao: 4.5,
      manutencao: PADRAO.manutencao_aa * 100,
      custos: PADRAO.custos_compra_pct * 100,
      corretagem: PADRAO.corretagem_venda_pct * 100,
      disciplina: PADRAO.disciplina * 100,
      sistema: PADRAO.sistema,
    }),
  )
  const mudar = (parcial: Partial<Entradas>) => setE((atual) => ({ ...atual, ...parcial }))
  // Mudou o imóvel (cidade, dinheiro, preço, custos): o aluguel de um imóvel igual muda junto.
  const mudarImovel = (parcial: Partial<Entradas>) => setE((atual) => comAluguel(dados, { ...atual, ...parcial }))

  const valorImovel = precoDoImovel(e)
  const entrada = e.financiar ? Math.min(1, (e.disponivel - (valorImovel * e.custos) / 100) / valorImovel) : 1
  const valido = e.disponivel > 0 && e.aluguel > 0 && valorImovel > 0 && entrada > 0

  const conta = useMemo(() => {
    const parametros: Parametros = {
      ...PADRAO,
      valor_imovel: valorImovel,
      aluguel_mensal: e.aluguel,
      entrada_pct: entrada,
      juros_aa: e.juros / 100,
      prazo_meses: e.prazo * 12,
      sistema: e.sistema,
      manutencao_aa: e.manutencao / 100,
      custos_compra_pct: e.custos / 100,
      corretagem_venda_pct: e.corretagem / 100,
      disciplina: e.disciplina / 100,
    }
    const cenario = (rendimento: number, valorizacao: number) =>
      fundosATaxasFixas(e.horizonte * 12, { rendimentoMes: rendimento / 100, cotaAa: e.cota / 100 }, e.inflacao / 100, valorizacao / 100)

    const resultado = simular(parametros, cenario(e.rendimento, e.valorizacao))
    const grade = RENDIMENTOS.map((rendimento) =>
      VALORIZACOES.map((valorizacao) => simular(parametros, cenario(rendimento, valorizacao)).vantagem_do_aluguel.at(-1)!),
    )
    return { resultado, grade }
  }, [e, valorImovel, entrada])

  const { resultado, grade } = conta
  const meses = e.horizonte * 12
  const real = (valores: number[]) => valores.map((valor, t) => valor / resultado.deflator[t])
  const compradora = real(resultado.patrimonio_comprador)
  const inquilina = real(resultado.patrimonio_inquilino)
  const diferenca = inquilina[meses] - compradora[meses]
  const virada = resultado.vantagem_do_aluguel.findIndex((vantagem, t) => t > 0 && vantagem < 0)
  const anos = Array.from({ length: meses + 1 }, (_, t) => t / 12)
  const passoDosTiques = e.horizonte <= 12 ? 1 : 5
  const cidadeHoje = dados.hoje[e.cidade]
  const fundos = { rendimentoMes: e.rendimento / 100, cotaAa: e.cota / 100 }
  const passado = fundosDoPassado(taxas, e.inflacao / 100)
  const descricaoDaCota = Math.abs(e.cota) < 0.05 ? 'a cota parada' : `a cota variando ${pct(e.cota / 100, 1, true)} ao ano`

  return (
    <div className="simulador">
      <form className="controles" onSubmit={(evento) => evento.preventDefault()}>
        <fieldset>
          <legend>O dinheiro e o imóvel</legend>
          <CampoNumero rotulo="Dinheiro disponível" unidade="R$" passo={10000} valor={e.disponivel} aoMudar={(disponivel) => mudarImovel({ disponivel })} />
          <Campo rotulo="Cidade">
            {(id) => (
              <select id={id} value={e.cidade} onChange={(evento) => mudarImovel({ cidade: evento.target.value })}>
                {Object.keys(dados.hoje).map((cidade) => (
                  <option key={cidade}>{cidade}</option>
                ))}
              </select>
            )}
          </Campo>
          <CampoNumero rotulo="Aluguel de um imóvel igual" unidade="R$/mês" passo={50} valor={e.aluguel} aoMudar={(aluguel) => mudar({ aluguel })} />
          <p className="ajuda">
            {e.financiar ? 'Imóvel' : `À vista, o dinheiro compra um imóvel`} de {reaisCurto(valorImovel)}, uns{' '}
            {numero(valorImovel / cidadeHoje.preco_m2)} m² aos preços de {mesAno(cidadeHoje.mes)}
            {cidadeHoje.anuncios ? ` (amostra de ${cidadeHoje.anuncios} anúncios)` : ' (FipeZAP)'}.
            {valido && ` O aluguel equivale a ${pct((e.aluguel * 12) / valorImovel, 1)} do preço por ano.`}
          </p>
        </fieldset>

        <fieldset>
          <legend>Os fundos</legend>
          <Deslizante rotulo="Rendimento" valor={e.rendimento} min={0.3} max={1.5} passo={0.01} formato={(v) => `${pctAoMes(v / 100)} ao mês`} aoMudar={(rendimento) => mudar({ rendimento })} />
          <Deslizante rotulo="Preço da cota, sem descontar a inflação" valor={e.cota} min={-10} max={10} passo={0.1} formato={(v) => `${pct(v / 100, 1, true)} ao ano`} aoMudar={(cota) => mudar({ cota })} />
          <Atalhos
            rotulo="Cenários prontos"
            opcoes={[
              { nome: '1% ao mês, cota parada', escolher: () => mudar({ rendimento: 1, cota: 0 }) },
              { nome: 'Média de hoje, cota parada', escolher: () => mudar({ rendimento: Math.round(mediaDoMercado * 10000) / 100, cota: 0 }) },
              {
                nome: 'Como desde 2011',
                escolher: () =>
                  mudar({
                    rendimento: Math.round(passado.rendimentoMes * 10000) / 100,
                    cota: Math.round(passado.cotaAa * 1000) / 10,
                  }),
              },
            ]}
          />
          <p className="ajuda">
            Somando rendimento e cota, a carteira rende {pct(retornoReal(fundos, e.inflacao / 100), 1)} ao ano acima da
            inflação. Desde 2011, os FIIs renderam {pct(taxas.fii_real_aa, 1)}.
          </p>
        </fieldset>

        <fieldset>
          <legend>O futuro</legend>
          <Deslizante rotulo="Quanto tempo você fica no imóvel" valor={e.horizonte} min={1} max={35} passo={1} formato={(v) => `${numero(v)} ${v === 1 ? 'ano' : 'anos'}`} aoMudar={(horizonte) => mudar({ horizonte })} />
          <Deslizante rotulo="Valorização do imóvel acima da inflação" valor={e.valorizacao} min={-3} max={5} passo={0.1} formato={(v) => `${numero(v, 1)}% ao ano`} aoMudar={(valorizacao) => mudar({ valorizacao })} />
          <Deslizante rotulo="Inflação" valor={e.inflacao} min={0} max={10} passo={0.5} formato={(v) => `${numero(v, 1)}% ao ano`} aoMudar={(inflacao) => mudar({ inflacao })} />
        </fieldset>

        <fieldset>
          <legend>Financiamento</legend>
          <label className="marcar">
            <input
              type="checkbox"
              checked={e.financiar}
              onChange={(evento) =>
                mudarImovel({
                  financiar: evento.target.checked,
                  valor: evento.target.checked ? Math.round((e.disponivel * 2) / 10000) * 10000 : e.valor,
                })
              }
            />
            Comprar um imóvel mais caro, financiando a diferença
          </label>
          {e.financiar && (
            <>
              <CampoNumero rotulo="Preço do imóvel" unidade="R$" passo={10000} valor={e.valor} aoMudar={(valor) => mudarImovel({ valor })} />
              <p className="ajuda">
                {entrada > 0
                  ? `Entrada de ${reaisCurto(valorImovel * entrada)} (${pct(entrada)} do imóvel), depois dos custos da compra.`
                  : 'O dinheiro disponível não cobre nem os custos da compra desse imóvel.'}
                {entrada > 0 && entrada < ENTRADA_MINIMA && ` Os bancos costumam pedir pelo menos ${pct(ENTRADA_MINIMA)} de entrada.`}
              </p>
              <Deslizante rotulo="Juros ao ano" valor={e.juros} min={6} max={18} passo={0.1} formato={(v) => `${numero(v, 1)}%`} aoMudar={(juros) => mudar({ juros })} />
              <Atalhos
                rotulo="Taxas médias do Banco Central"
                opcoes={[
                  { nome: 'Reguladas', valor: taxas.juros_financiamento_regulado_aa },
                  { nome: 'Média geral', valor: taxas.juros_financiamento_aa },
                  { nome: 'De mercado', valor: taxas.juros_financiamento_mercado_aa },
                ].map(({ nome, valor }) => ({
                  nome,
                  destaque: pct(valor, 1),
                  escolher: () => mudar({ juros: Math.round(valor * 1000) / 10 }),
                }))}
              />
              <Deslizante rotulo="Prazo" valor={e.prazo} min={5} max={35} passo={5} formato={(v) => `${numero(v)} anos`} aoMudar={(prazo) => mudar({ prazo })} />
              <div className="campo">
                <span className="rotulo">Sistema de amortização</span>
                <Opcoes
                  rotulo="Sistema de amortização"
                  opcoes={[
                    { valor: 'SAC', nome: 'SAC' },
                    { valor: 'PRICE', nome: 'Price' },
                  ]}
                  valor={e.sistema}
                  aoMudar={(sistema) => mudar({ sistema })}
                />
              </div>
            </>
          )}
        </fieldset>

        <details>
          <summary>Outras premissas</summary>
          <Deslizante rotulo="Parte da diferença de gasto que é investida" valor={e.disciplina} min={0} max={100} passo={5} formato={(v) => `${numero(v)}%`} aoMudar={(disciplina) => mudar({ disciplina })} />
          <Deslizante rotulo="Manutenção, por ano" valor={e.manutencao} min={0} max={3} passo={0.25} formato={(v) => `${numero(v, 2)}% do imóvel`} aoMudar={(manutencao) => mudar({ manutencao })} />
          <Deslizante rotulo="Custos da compra (ITBI, cartório)" valor={e.custos} min={0} max={10} passo={0.5} formato={(v) => `${numero(v, 1)}%`} aoMudar={(custos) => mudarImovel({ custos })} />
          <Deslizante rotulo="Corretagem na venda" valor={e.corretagem} min={0} max={8} passo={0.5} formato={(v) => `${numero(v, 1)}%`} aoMudar={(corretagem) => mudar({ corretagem })} />
        </details>
      </form>

      <div className="resultados">
        {valido ? (
          <>
            <div className="veredito" aria-live="polite">
              <p>
                Em {duracao(meses)}, <strong>{diferenca >= 0 ? 'alugar e investir' : 'comprar'}</strong> termina com
              </p>
              <p className="numero-principal">{reaisCurto(Math.abs(diferenca))} a mais</p>
              <p className="ajuda">
                em valores de hoje, ou {pct(Math.abs(diferenca) / valorImovel)} do preço do imóvel.{' '}
                {virada < 0
                  ? 'Quem compra não alcança quem aluga nesse período.'
                  : diferenca < 0
                    ? `Quem compra passa à frente depois de ${duracao(virada)}.`
                    : `Quem compra chega a passar à frente (depois de ${duracao(virada)}), mas quem aluga retoma.`}
              </p>
            </div>

            <dl className="indicadores">
              <div>
                <dt>Patrimônio de quem compra</dt>
                <dd>{reaisCurto(compradora[meses])}</dd>
                <small>{e.financiar ? 'imóvel − dívida + investimentos' : 'imóvel + investimentos'}</small>
              </div>
              <div>
                <dt>Patrimônio de quem aluga</dt>
                <dd>{reaisCurto(inquilina[meses])}</dd>
                <small>investimentos, já com imposto</small>
              </div>
              {e.financiar ? (
                <div>
                  <dt>Gasto de quem compra no primeiro mês</dt>
                  <dd>{reais(resultado.gasto_comprador[1])}</dd>
                  <small>parcela e manutenção, contra {reais(e.aluguel)} de aluguel</small>
                </div>
              ) : (
                <div>
                  <dt>Renda dos fundos no primeiro mês</dt>
                  <dd>{reais((e.disponivel * e.rendimento) / 100)}</dd>
                  <small>contra {reais(e.aluguel)} de aluguel</small>
                </div>
              )}
            </dl>

            <Figura
              titulo="Patrimônio de cada lado"
              subtitulo="Em R$ de hoje, se o patrimônio fosse liquidado em cada momento"
              legenda={[
                { nome: 'Quem compra', cor: 'var(--serie-1)' },
                { nome: 'Quem aluga e investe', cor: 'var(--serie-2)' },
              ]}
              fonte="Cenário de taxas fixas, com as premissas ao lado. O aluguel acompanha o preço do imóvel."
              tabela={{
                colunas: ['Ano', 'Quem compra', 'Quem aluga e investe', 'Vantagem do aluguel'],
                linhas: Array.from({ length: e.horizonte + 1 }, (_, ano) => [
                  String(ano),
                  reais(compradora[ano * 12]),
                  reais(inquilina[ano * 12]),
                  pct(resultado.vantagem_do_aluguel[ano * 12], 0, true),
                ]),
              }}
            >
              <GraficoLinhas
                x={anos}
                series={[
                  { nome: 'Quem compra', cor: 'var(--serie-1)', valores: compradora },
                  { nome: 'Quem aluga e investe', cor: 'var(--serie-2)', valores: inquilina },
                ]}
                formatoX={(ano) => duracao(Math.round(ano * 12))}
                formatoY={reaisCurto}
                tiquesX={Array.from({ length: Math.floor(e.horizonte / passoDosTiques) + 1 }, (_, i) => i * passoDosTiques)}
                formatoTiqueX={(ano) => numero(ano)}
                rotuloX="anos depois da decisão"
                altura={320}
                descricao="Patrimônio real de quem compra e de quem aluga e investe, ao longo dos anos"
              />
            </Figura>

            <Figura
              titulo="Onde fica o empate"
              subtitulo={`Resultado em ${duracao(meses)} para cada combinação de rendimento dos fundos e valorização do imóvel, com ${descricaoDaCota}. Clique para testar um cenário.`}
              fonte="A linha escura marca o empate e o círculo, o cenário escolhido. A linha fina é o rendimento médio dos FIIs nos últimos 12 meses."
              tabela={{
                colunas: ['Rendimento ao mês', ...VALORIZACOES.filter((v) => Number.isInteger(v)).map((v) => `Imóvel ${pct(v / 100, 0, true)}`)],
                linhas: RENDIMENTOS.map((rendimento, linha) => ({ rendimento, linha }))
                  .filter(({ rendimento }) => Number.isInteger(Math.round(rendimento * 100) / 10))
                  .map(({ rendimento, linha }) => [
                    pctAoMes(rendimento / 100),
                    ...VALORIZACOES.map((v, coluna) => ({ v, coluna }))
                      .filter(({ v }) => Number.isInteger(v))
                      .map(({ coluna }) => pct(grade[linha][coluna], 0, true)),
                  ]),
              }}
            >
              <div className="escala" aria-hidden="true">
                <span>comprar ganha</span>
                <span className="escala-barra" />
                <span>alugar e investir ganha</span>
              </div>
              <MapaDeCalor
                xs={VALORIZACOES.map((v) => v / 100)}
                ys={RENDIMENTOS.map((v) => v / 100)}
                rotuloY="rendimento dos fundos, ao mês"
                tiquesY={[0.004, 0.006, 0.008, 0.01, 0.012, 0.014]}
                formatoY={pctAoMes}
                valores={grade}
                limite={LIMITE_DA_ESCALA}
                marcador={{ x: e.valorizacao / 100, y: e.rendimento / 100 }}
                referencias={[{ nome: 'Média dos FIIs hoje', y: mediaDoMercado }]}
                aoEscolher={(valorizacao, rendimento) =>
                  mudar({ valorizacao: Math.round(valorizacao * 1000) / 10, rendimento: Math.round(rendimento * 10000) / 100 })
                }
                descricao="Mapa da vantagem do aluguel para cada combinação de valorização real do imóvel e rendimento mensal dos fundos"
              />
            </Figura>
          </>
        ) : (
          <p className="veredito">
            {entrada <= 0
              ? 'O dinheiro disponível não paga nem os custos da compra desse imóvel. Aumente o valor ou escolha um imóvel mais barato.'
              : 'Informe o dinheiro disponível e o aluguel para ver a conta.'}
          </p>
        )}
      </div>
    </div>
  )
}

function Campo({ rotulo, children }: { rotulo: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      {children(id)}
    </div>
  )
}

interface CampoNumeroProps {
  rotulo: string
  unidade: string
  passo: number
  valor: number
  aoMudar: (valor: number) => void
}

function CampoNumero({ rotulo, unidade, passo, valor, aoMudar }: CampoNumeroProps) {
  return (
    <Campo rotulo={rotulo}>
      {(id) => (
        <div className="com-unidade">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={0}
            step={passo}
            // Campo vazio vale zero; mostrar vazio deixa a pessoa digitar outro número do começo.
            value={valor === 0 ? '' : valor}
            onChange={(evento) => aoMudar(Number.isNaN(evento.target.valueAsNumber) ? 0 : evento.target.valueAsNumber)}
          />
          <span>{unidade}</span>
        </div>
      )}
    </Campo>
  )
}

interface DeslizanteProps {
  rotulo: string
  valor: number
  min: number
  max: number
  passo: number
  formato: (valor: number) => string
  aoMudar: (valor: number) => void
}

function Deslizante({ rotulo, valor, min, max, passo, formato, aoMudar }: DeslizanteProps) {
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

interface AtalhosProps {
  rotulo: string
  /** `destaque` aparece em negrito depois do nome, como o valor de uma taxa. */
  opcoes: { nome: string; destaque?: string; escolher: () => void }[]
}

function Atalhos({ rotulo, opcoes }: AtalhosProps) {
  return (
    <div className="atalhos" role="group" aria-label={rotulo}>
      {opcoes.map((opcao) => (
        <button key={opcao.nome} type="button" onClick={opcao.escolher}>
          {opcao.nome} {opcao.destaque && <span>{opcao.destaque}</span>}
        </button>
      ))}
    </div>
  )
}
