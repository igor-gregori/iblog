import { useId, useMemo, useState, type ReactNode } from 'react'
import { mesAno, numero, pct, reais, reaisCurto } from '../formato.ts'
import type { Dados } from '../dados.ts'
import { PADRAO, simular, type Cenario, type Parametros } from '../simulador.ts'
import { Figura, Opcoes } from './Figura.tsx'
import { GraficoLinhas } from './GraficoLinhas.tsx'
import { MapaDeCalor } from './MapaDeCalor.tsx'

/** O que a pessoa escolhe na tela. Percentuais em pontos (20 = 20%), prazos em anos. */
interface Entradas {
  cidade: string
  valor: number
  aluguel: number
  entrada: number
  juros: number
  prazo: number
  horizonte: number
  /** Valorização do imóvel e retorno da carteira, ao ano, acima da inflação. */
  valorizacao: number
  retorno: number
  inflacao: number
  manutencao: number
  custos: number
  corretagem: number
  disciplina: number
  sistema: 'SAC' | 'PRICE'
}

// A grade do mapa de calor, em pontos percentuais ao ano; os controles usam os mesmos limites.
const VALORIZACOES = Array.from({ length: 17 }, (_, i) => -3 + i * 0.5)
const RETORNOS = Array.from({ length: 21 }, (_, i) => i * 0.5)
const LIMITE_DA_ESCALA = 1.5

function apartamento(dados: Dados, cidade: string): Pick<Entradas, 'cidade' | 'valor' | 'aluguel'> {
  const { preco_m2, aluguel_m2, area_m2 } = dados.hoje[cidade]
  return {
    cidade,
    valor: Math.round((preco_m2 * area_m2) / 1000) * 1000,
    aluguel: Math.round((aluguel_m2 * area_m2) / 10) * 10,
  }
}

function duracao(meses: number): string {
  const anos = Math.floor(meses / 12)
  const resto = meses % 12
  const partes = []
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`)
  if (resto > 0 || anos === 0) partes.push(`${resto} ${resto === 1 ? 'mês' : 'meses'}`)
  return partes.join(' e ')
}

export function Simulador({ dados }: { dados: Dados }) {
  const { taxas } = dados
  const [e, setE] = useState<Entradas>(() => ({
    ...apartamento(dados, 'São Paulo'),
    entrada: PADRAO.entrada_pct * 100,
    juros: Math.round(taxas.juros_financiamento_aa * 1000) / 10,
    prazo: PADRAO.prazo_meses / 12,
    horizonte: 10,
    valorizacao: 0,
    retorno: Math.round(taxas.fii_real_aa * 1000) / 10,
    inflacao: 4.5,
    manutencao: PADRAO.manutencao_aa * 100,
    custos: PADRAO.custos_compra_pct * 100,
    corretagem: PADRAO.corretagem_venda_pct * 100,
    disciplina: PADRAO.disciplina * 100,
    sistema: PADRAO.sistema,
  }))
  const mudar = (parcial: Partial<Entradas>) => setE((atual) => ({ ...atual, ...parcial }))

  const conta = useMemo(() => {
    const parametros: Parametros = {
      ...PADRAO,
      valor_imovel: e.valor,
      aluguel_mensal: e.aluguel,
      entrada_pct: e.entrada / 100,
      juros_aa: e.juros / 100,
      prazo_meses: e.prazo * 12,
      sistema: e.sistema,
      manutencao_aa: e.manutencao / 100,
      custos_compra_pct: e.custos / 100,
      corretagem_venda_pct: e.corretagem / 100,
      disciplina: e.disciplina / 100,
    }
    const nominal = (real: number) => (1 + real / 100) * (1 + e.inflacao / 100) - 1
    // O aluguel acompanha o preço do imóvel, e o rendimento distribuído não passa do retorno total.
    const cenario = (valorizacao: number, retorno: number): Cenario => ({
      meses: e.horizonte * 12,
      valorizacao_aa: nominal(valorizacao),
      reajuste_aluguel_aa: nominal(valorizacao),
      carteira_retorno_aa: nominal(retorno),
      carteira_rendimento_aa: Math.max(0, Math.min(taxas.fii_rendimento_aa, nominal(retorno))),
      inflacao_aa: e.inflacao / 100,
    })

    const resultado = simular(parametros, cenario(e.valorizacao, e.retorno))
    const grade = RETORNOS.map((retorno) =>
      VALORIZACOES.map((valorizacao) => simular(parametros, cenario(valorizacao, retorno)).vantagem_do_aluguel.at(-1)!),
    )
    return { resultado, grade }
  }, [e, taxas.fii_rendimento_aa])

  const valido = e.valor > 0 && e.aluguel > 0
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

  return (
    <div className="simulador">
      <form className="controles" onSubmit={(evento) => evento.preventDefault()}>
        <fieldset>
          <legend>O imóvel</legend>
          <Campo rotulo="Cidade">
            {(id) => (
              <select id={id} value={e.cidade} onChange={(evento) => mudar(apartamento(dados, evento.target.value))}>
                {Object.keys(dados.hoje).map((cidade) => (
                  <option key={cidade}>{cidade}</option>
                ))}
              </select>
            )}
          </Campo>
          <CampoNumero rotulo="Preço do imóvel" unidade="R$" passo={10000} valor={e.valor} aoMudar={(valor) => mudar({ valor })} />
          <CampoNumero rotulo="Aluguel de um imóvel igual" unidade="R$/mês" passo={50} valor={e.aluguel} aoMudar={(aluguel) => mudar({ aluguel })} />
          <p className="ajuda">
            Ponto de partida: apartamento de {numero(cidadeHoje.area_m2)} m² aos preços de {mesAno(cidadeHoje.mes)}
            {cidadeHoje.anuncios ? ` (amostra de ${cidadeHoje.anuncios} anúncios)` : ' (FipeZAP)'}.
            {valido && ` O aluguel equivale a ${pct((e.aluguel * 12) / e.valor, 1)} do preço por ano.`}
          </p>
        </fieldset>

        <fieldset>
          <legend>O financiamento</legend>
          <Deslizante rotulo="Entrada" valor={e.entrada} min={5} max={90} passo={5} formato={(v) => `${numero(v)}%`} aoMudar={(entrada) => mudar({ entrada })} />
          <Deslizante rotulo="Juros ao ano" valor={e.juros} min={6} max={18} passo={0.1} formato={(v) => `${numero(v, 1)}%`} aoMudar={(juros) => mudar({ juros })} />
          <Atalhos
            rotulo="Taxas médias do Banco Central"
            opcoes={[
              { nome: 'Reguladas', valor: taxas.juros_financiamento_regulado_aa },
              { nome: 'Média geral', valor: taxas.juros_financiamento_aa },
              { nome: 'De mercado', valor: taxas.juros_financiamento_mercado_aa },
            ]}
            aoEscolher={(juros) => mudar({ juros })}
          />
          <Deslizante rotulo="Prazo" valor={e.prazo} min={5} max={35} passo={5} formato={(v) => `${numero(v)} anos`} aoMudar={(prazo) => mudar({ prazo })} />
        </fieldset>

        <fieldset>
          <legend>O futuro</legend>
          <Deslizante rotulo="Quanto tempo você fica no imóvel" valor={e.horizonte} min={1} max={35} passo={1} formato={(v) => `${numero(v)} ${v === 1 ? 'ano' : 'anos'}`} aoMudar={(horizonte) => mudar({ horizonte })} />
          <Deslizante rotulo="Valorização do imóvel acima da inflação" valor={e.valorizacao} min={-3} max={5} passo={0.1} formato={(v) => `${numero(v, 1)}% ao ano`} aoMudar={(valorizacao) => mudar({ valorizacao })} />
          <Deslizante rotulo="Retorno da carteira acima da inflação" valor={e.retorno} min={0} max={10} passo={0.1} formato={(v) => `${numero(v, 1)}% ao ano`} aoMudar={(retorno) => mudar({ retorno })} />
          <Atalhos
            rotulo="Referências"
            opcoes={[
              { nome: 'FIIs desde 2011', valor: taxas.fii_real_aa },
              { nome: 'CDI desde 2011', valor: taxas.cdi_real_aa },
              { nome: 'Tesouro IPCA+ hoje', valor: taxas.tesouro_ipca_aa },
            ]}
            aoEscolher={(retorno) => mudar({ retorno })}
          />
          <Deslizante rotulo="Inflação" valor={e.inflacao} min={0} max={10} passo={0.5} formato={(v) => `${numero(v, 1)}% ao ano`} aoMudar={(inflacao) => mudar({ inflacao })} />
        </fieldset>

        <details>
          <summary>Outras premissas</summary>
          <Deslizante rotulo="Parte da diferença que é investida" valor={e.disciplina} min={0} max={100} passo={5} formato={(v) => `${numero(v)}%`} aoMudar={(disciplina) => mudar({ disciplina })} />
          <Deslizante rotulo="Manutenção, por ano" valor={e.manutencao} min={0} max={3} passo={0.25} formato={(v) => `${numero(v, 2)}% do imóvel`} aoMudar={(manutencao) => mudar({ manutencao })} />
          <Deslizante rotulo="Custos da compra (ITBI, cartório)" valor={e.custos} min={0} max={10} passo={0.5} formato={(v) => `${numero(v, 1)}%`} aoMudar={(custos) => mudar({ custos })} />
          <Deslizante rotulo="Corretagem na venda" valor={e.corretagem} min={0} max={8} passo={0.5} formato={(v) => `${numero(v, 1)}%`} aoMudar={(corretagem) => mudar({ corretagem })} />
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
                em valores de hoje, ou {pct(Math.abs(diferenca) / e.valor)} do preço do imóvel.{' '}
                {virada < 0
                  ? 'A compradora não alcança a inquilina nesse período.'
                  : diferenca < 0
                    ? `A compradora passa à frente depois de ${duracao(virada)}.`
                    : `A compradora chega a passar à frente (depois de ${duracao(virada)}), mas a inquilina retoma.`}
              </p>
            </div>

            <dl className="indicadores">
              <div>
                <dt>Patrimônio de quem compra</dt>
                <dd>{reaisCurto(compradora[meses])}</dd>
                <small>imóvel − dívida + investimentos</small>
              </div>
              <div>
                <dt>Patrimônio de quem aluga</dt>
                <dd>{reaisCurto(inquilina[meses])}</dd>
                <small>investimentos, já com imposto</small>
              </div>
              <div>
                <dt>Gasto no primeiro mês</dt>
                <dd>{reais(resultado.gasto_comprador[1])}</dd>
                <small>parcela e manutenção, contra {reais(e.aluguel)} de aluguel</small>
              </div>
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
              subtitulo={`Resultado em ${duracao(meses)} para cada combinação de valorização e retorno. Clique para testar um cenário.`}
              fonte="A linha escura marca o empate e o círculo, o cenário escolhido. As linhas finas são retornos de referência."
              tabela={{
                colunas: ['Retorno da carteira', ...VALORIZACOES.filter((v) => Number.isInteger(v)).map((v) => `Imóvel ${pct(v / 100, 0, true)}`)],
                linhas: RETORNOS.map((retorno, linha) => ({ retorno, linha }))
                  .filter(({ retorno }) => Number.isInteger(retorno))
                  .map(({ retorno, linha }) => [
                    pct(retorno / 100),
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
                ys={RETORNOS.map((v) => v / 100)}
                valores={grade}
                limite={LIMITE_DA_ESCALA}
                marcador={{ x: e.valorizacao / 100, y: e.retorno / 100 }}
                referencias={[
                  { nome: 'FIIs desde 2011', y: taxas.fii_real_aa },
                  { nome: 'CDI desde 2011', y: taxas.cdi_real_aa },
                  { nome: 'Tesouro IPCA+ hoje', y: taxas.tesouro_ipca_aa },
                ]}
                aoEscolher={(valorizacao, retorno) => mudar({ valorizacao: valorizacao * 100, retorno: retorno * 100 })}
                descricao="Mapa da vantagem do aluguel para cada combinação de valorização real do imóvel e retorno real da carteira"
              />
            </Figura>
          </>
        ) : (
          <p className="veredito">Informe o preço do imóvel e o aluguel para ver a conta.</p>
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
  /** Taxas em fração (0.029); o controle trabalha em pontos percentuais com uma casa. */
  opcoes: { nome: string; valor: number }[]
  aoEscolher: (pontos: number) => void
}

function Atalhos({ rotulo, opcoes, aoEscolher }: AtalhosProps) {
  return (
    <div className="atalhos" role="group" aria-label={rotulo}>
      {opcoes.map((opcao) => (
        <button key={opcao.nome} type="button" onClick={() => aoEscolher(Math.round(opcao.valor * 1000) / 10)}>
          {opcao.nome} <span>{pct(opcao.valor, 1)}</span>
        </button>
      ))}
    </div>
  )
}
