import { Children, cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { useInView } from '../../hooks/useInView';

/** Grade/lista que entra em stagger (cada filho `stagger`ms depois do
    anterior), prompt master seção 6.2 — versão sem Framer Motion:
    injeta `style` de opacity/transform em cada filho direto via
    `cloneElement`, disparado pelo MESMO `useInView` do grupo inteiro
    (não um observer por filho). Use em grids de card (MetricCard,
    EventCard) — não em listas muito longas (30-40+ itens visíveis),
    onde o delay acumulado começa a incomodar mais que ajudar. */
export function RevealGroup({ children, className, stagger = 70 }: { children: ReactNode; className?: string; stagger?: number }) {
  const { ref, emVista } = useInView();
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
