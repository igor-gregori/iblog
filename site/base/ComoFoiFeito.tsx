/**
 * A nota no fim do rodapé que conta como o post foi feito. O Igor pediu em 19/10/2026, para os posts da série de
 * IA; vai dentro do `<footer className="rodape">`, depois das fontes.
 */
export function ComoFoiFeito() {
  return (
    <>
      <h2 className="rodape-nota">Como este post foi feito</h2>
      <p>
        Este post partiu das notas de um estudo que eu, Igor Gregori, fiz antes. O texto foi escrito com IA e
        confrontado por um segundo modelo de IA. Depois eu revisei tudo e conferi os dados à mão.
      </p>
    </>
  )
}
