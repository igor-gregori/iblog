import { useEffect, useState } from 'react'

/** Carrega um JSON da página (o `dados.json` de um post, importado com `?url`). */
export function useJson<T>(url: string): { dados: T | null; erro: string | null } {
  const [dados, setDados] = useState<T | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    fetch(url)
      .then((resposta) => {
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
        return resposta.json() as Promise<T>
      })
      .then(setDados)
      .catch((falha: Error) => setErro(falha.message))
  }, [url])

  return { dados, erro }
}
