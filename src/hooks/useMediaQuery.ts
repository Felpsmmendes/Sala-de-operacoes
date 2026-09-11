import { useEffect, useState } from 'react';

/** true quando a viewport é mais estreita que `breakpointPx`. Usado pelo
    Login (ver src/pages/Login.tsx) pra trocar o split-screen animado por
    um layout empilhado em telas pequenas — a animação de largura do
    painel não faz sentido num card que já ocupa a tela toda. */
export function useIsNarrowerThan(breakpointPx: number): boolean {
  const [estreita, setEstreita] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpointPx);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const aoMudar = () => setEstreita(mq.matches);
    aoMudar();
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, [breakpointPx]);

  return estreita;
}
