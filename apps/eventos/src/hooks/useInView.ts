import { useEffect, useRef, useState } from 'react';

/** Observa quando um elemento entra na viewport, uma única vez (prompt
    master, seção 6.2 — variante sem Framer Motion, que não está instalado
    no projeto: `cat package.json` não lista `framer-motion`). Usado por
    `Reveal`/`RevealGroup` pra animar entrada em scroll sem biblioteca
    nova. `margin: '-40px'` (default) dispara um pouco antes do elemento
    bater na borda da tela, não exatamente na borda. */
export function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [emVista, setEmVista] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEmVista(true);
          observer.disconnect(); // "once: true" — não repete ao sair/voltar
        }
      },
      { threshold: 0.1, rootMargin: '-40px', ...options },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, emVista };
}
