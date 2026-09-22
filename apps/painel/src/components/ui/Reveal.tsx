import { Children, cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { reduzirMovimento, useInView } from '../../hooks/useInView';

/** Bloco que aparece com fade + deslize de baixo pra cima ao entrar na tela.
    `delay` em ms. Uma vez só; sem movimento se o usuário pediu menos. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, emVista } = useInView();
  if (reduzirMovimento()) return <div className={className}>{children}</div>;
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

/** Lista/grade que entra em cascata (cada filho `stagger` ms depois do anterior).
    Injeta o estilo em cada filho direto — os filhos precisam aceitar `style`.
    Não use em listas muito longas (30+ itens): o atraso acumulado incomoda. */
export function RevealGroup({ children, className, stagger = 70 }: { children: ReactNode; className?: string; stagger?: number }) {
  const { ref, emVista } = useInView();
  if (reduzirMovimento()) return <div className={className}>{children}</div>;
  return (
    <div ref={ref} className={className}>
      {Children.map(children, (child, i) => {
        if (!isValidElement(child)) return child;
        const el = child as ReactElement<{ style?: CSSProperties }>;
        return cloneElement(el, {
          style: {
            ...(el.props.style || {}),
            opacity: emVista ? 1 : 0,
            transform: emVista ? 'translateY(0)' : 'translateY(14px)',
            transition: `opacity 0.32s ease ${i * stagger}ms, transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94) ${i * stagger}ms`,
          },
        });
      })}
    </div>
  );
}
