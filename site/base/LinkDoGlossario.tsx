/**
 * A nota no rodapé dos posts da série de IA que leva ao glossário. O Igor pediu em 24/10/2026; vai dentro do
 * `<footer className="rodape">`, antes da nota "Como este post foi feito".
 */
export function LinkDoGlossario() {
  return (
    <>
      <h2 className="rodape-nota">Glossário da série</h2>
      <p>
        Os termos da série, cada um com uma definição curta e o post que aprofunda, estão no{' '}
        <a href="/glossario-de-ia/">glossário do dev com IA</a>.
      </p>
    </>
  )
}
