// O tema do blog inteiro: a capa e todos os posts leem e gravam a mesma preferência.
export type Tema = 'sistema' | 'claro' | 'escuro'

const ORDEM: Tema[] = ['sistema', 'claro', 'escuro']

// A mesma chave é lida pelo script que o build põe no <head> de cada página (site/paginas.ts),
// para aplicar o tema antes da primeira pintura.
export const CHAVE_DO_TEMA = 'iblog:tema'

export const NOMES_DOS_TEMAS: Record<Tema, string> = {
  sistema: 'Sistema',
  claro: 'Claro',
  escuro: 'Escuro',
}

export const ICONES_DOS_TEMAS: Record<Tema, string> = {
  // Monitor, sol e lua, em traço simples.
  sistema: 'M4 5h16v11H4zM9 20h6M12 16v4',
  claro:
    'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  escuro: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
}

export function proximoTema(tema: Tema): Tema {
  return ORDEM[(ORDEM.indexOf(tema) + 1) % ORDEM.length]
}

export function rotuloDoTema(tema: Tema): string {
  return `Tema: ${NOMES_DOS_TEMAS[tema]} (clique para trocar)`
}

/** Pinta a página no tema escolhido; "sistema" segue a preferência do aparelho. */
export function aplicarTema(tema: Tema): void {
  const escuro = tema === 'sistema' ? matchMedia('(prefers-color-scheme: dark)').matches : tema === 'escuro'
  document.documentElement.dataset.theme = escuro ? 'dark' : 'light'
}
