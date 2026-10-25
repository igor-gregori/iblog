import { useId, useState } from 'react'
import { ComoFoiFeito } from '#base/ComoFoiFeito.tsx'
import { numero } from '#base/formato.ts'
import { Topo } from '#base/Topo.tsx'
import { POSTS, TERMOS, type Termo } from './termos.ts'

const ORDEM = new Intl.Collator('pt-BR', { sensitivity: 'base' })

/** "Prazo do Cache" → "prazo do cache"; "Pré-treino" → "pre-treino": a busca não liga para acento nem maiúscula. */
function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** A letra em que o termo entra no índice, sem acento. */
function letra(termo: Termo) {
  return normalizar(termo.nome)[0].toUpperCase()
}

const ORDENADOS = TERMOS.toSorted((a, b) => ORDEM.compare(a.nome, b.nome))

export default function App() {
  const idBusca = useId()
  const [busca, setBusca] = useState('')
  const procurado = normalizar(busca.trim())
  const achados = ORDENADOS.filter((t) => !procurado || normalizar(`${t.nome} ${t.ingles ?? ''} ${t.definicao}`).includes(procurado))
  const letras = [...new Set(achados.map(letra))]
  const posts = Object.values(POSTS)

  return (
    <>
      <Topo />
      <main className="artigo" id="inicio">
        <header className="abertura">
          <p className="sobretitulo">IA para quem já programa · 6</p>
          <h1>Glossário do dev com IA</h1>
          <p className="subtitulo">
            Os termos da série, cada um em uma ou duas frases e com o link para o post que aprofunda. A página cresce a
            cada post novo.
          </p>
          <p className="assinatura">
            Igor Gregori · {numero(TERMOS.length)} termos, de {posts.length} posts da série
          </p>
        </header>

        <div className="texto">
          <p>
            Os nomes em inglês aparecem ao lado, porque é assim que eles estão na documentação e nas ferramentas. Para
            achar um termo, filtre pelo nome em português ou em inglês.
          </p>
        </div>

        <div className="glossario-busca">
          <label htmlFor={idBusca}>Filtrar termos</label>
          <input
            id={idBusca}
            type="search"
            value={busca}
            placeholder="cache, token, compactação…"
            onChange={(evento) => setBusca(evento.target.value)}
          />
          <p className="ajuda" aria-live="polite">
            {procurado ? `${numero(achados.length)} de ${numero(TERMOS.length)} termos` : `${numero(TERMOS.length)} termos`}
          </p>
        </div>

        {letras.length > 0 && (
          <nav className="glossario-letras" aria-label="Letras">
            {letras.map((l) => (
              <a key={l} href={`#letra-${l}`}>
                {l}
              </a>
            ))}
          </nav>
        )}

        {achados.length === 0 && <p className="aviso">Nenhum termo com “{busca.trim()}”.</p>}

        {letras.map((l) => (
          <section key={l} className="glossario-letra" id={`letra-${l}`} aria-labelledby={`letra-${l}-titulo`}>
            <h2 id={`letra-${l}-titulo`}>{l}</h2>
            <dl>
              {achados
                .filter((t) => letra(t) === l)
                .map((t) => (
                  <div key={t.id} className="glossario-termo" id={t.id}>
                    <dt>
                      {t.nome}
                      {t.ingles && <span lang="en">{t.ingles}</span>}
                    </dt>
                    <dd>
                      <p>{t.definicao}</p>
                      <p className="glossario-veja">
                        <a href={`/${t.post}/#${t.parte}`}>
                          Post {POSTS[t.post].numero}: {POSTS[t.post].titulo}
                        </a>
                      </p>
                    </dd>
                  </div>
                ))}
            </dl>
          </section>
        ))}

        <footer className="rodape">
          <h2>Os posts da série</h2>
          <ol>
            {Object.entries(POSTS).map(([slug, post]) => (
              <li key={slug}>
                <a href={`/${slug}/`}>{post.titulo}</a>
              </li>
            ))}
          </ol>
          <ComoFoiFeito />
        </footer>
      </main>
    </>
  )
}
