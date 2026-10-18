/** Um trecho de código, numa caixa com o rótulo em cima. */
export function Codigo({ rotulo, children }: { rotulo: string; children: string }) {
  return (
    <figure className="codigo">
      <figcaption>{rotulo}</figcaption>
      <pre>
        <code>{children}</code>
      </pre>
    </figure>
  )
}
