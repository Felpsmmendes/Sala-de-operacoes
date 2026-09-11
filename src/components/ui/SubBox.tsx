import type { ReactNode } from 'react';

/** Sub-box — nível "dentro" do Card (DESIGN.md > "SubBox / Tables &
    Lists"): fundo `--color-raised`, um degrau mais claro que o `Panel`
    ao redor, sem sombra própria (o Card ao redor já projeta a sua). Hoje
    usada direto pela classe `.list-row` (index.css) em ~7 telas — este
    componente é a versão com API de props, pra código novo. */
export function SubBox({ children, className = '', clicavel = false, aoClicar }: { children: ReactNode; className?: string; clicavel?: boolean; aoClicar?: () => void }) {
  return (
    <div onClick={aoClicar} className={`list-row ${clicavel ? 'cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  );
}
