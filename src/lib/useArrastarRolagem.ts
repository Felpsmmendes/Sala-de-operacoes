import { useEffect, useRef } from 'react';

/**
 * Arrastar-pra-rolar horizontal estilo Figma: segura o botão do MEIO do
 * mouse sobre a área e arrasta pros lados, sem precisar mirar numa barra
 * de rolagem fina. Botão do meio de propósito (não o esquerdo) — não
 * atrapalha clique normal nos cards do pipeline.
 */
export function useArrastarRolagem<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let arrastando = false;
    let inicioX = 0;
    let scrollInicial = 0;

    function aoDescer(e: MouseEvent) {
      if (e.button !== 1) return; // só o botão do meio
      e.preventDefault();
      arrastando = true;
      inicioX = e.clientX;
      scrollInicial = el!.scrollLeft;
      el!.style.cursor = 'grabbing';
    }
    function aoMover(e: MouseEvent) {
      if (!arrastando) return;
      el!.scrollLeft = scrollInicial - (e.clientX - inicioX);
    }
    function aoSoltar() {
      arrastando = false;
      el!.style.cursor = '';
    }

    el.addEventListener('mousedown', aoDescer);
    window.addEventListener('mousemove', aoMover);
    window.addEventListener('mouseup', aoSoltar);
    return () => {
      el.removeEventListener('mousedown', aoDescer);
      window.removeEventListener('mousemove', aoMover);
      window.removeEventListener('mouseup', aoSoltar);
    };
  }, []);

  return ref;
}
