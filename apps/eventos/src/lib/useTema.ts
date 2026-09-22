import { useEffect, useState } from 'react';

const CHAVE_TEMA = 'emcena_tema';
export type Tema = 'escuro' | 'claro';

function lerTemaSalvo(): Tema {
  try {
    return localStorage.getItem(CHAVE_TEMA) === 'claro' ? 'claro' : 'escuro';
  } catch {
    return 'escuro';
  }
}

function aplicarTema(tema: Tema) {
  if (tema === 'claro') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
}

/** Modo claro/escuro — preferência por navegador (localStorage), aplicada
    via atributo `data-theme` na tag <html> (ver paleta em index.css).
    `index.html` já aplica o tema salvo antes do React montar, pra não
    piscar o tema errado no primeiro instante da página. */
export function useTema() {
  const [tema, setTema] = useState<Tema>(lerTemaSalvo);

  useEffect(() => {
    aplicarTema(tema);
  }, [tema]);

  function alternar() {
    setTema((atual) => {
      const novo: Tema = atual === 'escuro' ? 'claro' : 'escuro';
      try {
        localStorage.setItem(CHAVE_TEMA, novo);
      } catch {
        /* localStorage indisponível — só não persiste entre sessões */
      }
      return novo;
    });
  }

  return { tema, alternar };
}
