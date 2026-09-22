import { useEffect, useRef, useState } from 'react';

/** Avisa quando o elemento entra na tela, uma única vez (nunca reanima ao sair
    e voltar). Base do `Reveal`, do `RevealGroup`, das barras e dos gráficos que
    "crescem" ao aparecer. Sem IntersectionObserver (ambiente antigo) já nasce
    visível — nunca deixa conteúdo escondido. */
export function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [emVista, setEmVista] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEmVista(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '-40px', ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, emVista };
}

/** Usuário pediu menos movimento no sistema operacional. */
export function reduzirMovimento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
