import type { ReactNode } from 'react';
import { useInView } from '../../hooks/useInView';

/** Bloco que aparece com fade-in + slide-de-cima ao entrar na viewport
    (prompt master, seção 6.2). Cada seção de página embrulha o conteúdo
    dela num `<Reveal>` — não anima tudo junto no mount, anima conforme o
    usuário rola a tela. `delay` em ms; `once: true` sempre (nunca
    reanima ao sair/voltar, ver useInView). Sem Framer Motion (não
    instalado) — CSS puro + IntersectionObserver. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, emVista } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: emVista ? 1 : 0,
        transform: emVista ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.35s ease ${delay}ms, transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
