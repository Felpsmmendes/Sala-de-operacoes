import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export type MigalhaBreadcrumb = { rotulo: string; to?: string };

/** Trilha de navegação no topo de cada página interna (2026-09-16, direção
    "redesign SaaS" do usuário) — [Sala de Operações] > [Núcleo] > [Página
    atual], usando os mesmos grupos que já organizam a sidebar
    (`NUCLEOS`/`nucleoDaRota`, ver Layout.tsx), então nunca discorda do
    menu. Cada nível vira link, exceto o último (a própria página —
    navegar pra onde você já está não faz sentido). No celular a raiz
    "Sala de Operações" some (a trilha quebrava em 2–3 linhas) — sobra
    [Núcleo] > [Página]. Fica escondido em
    telas sem núcleo próprio (Painel/Configurações) — ver `Cabecalho`. */
export function Breadcrumb({ itens }: { itens: MigalhaBreadcrumb[] }) {
  if (itens.length === 0) return null;
  return (
    <nav aria-label="Trilha de navegação" className="mb-1.5 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wide text-text-faint">
      {itens.map((item, i) => {
        const ultimo = i === itens.length - 1;
        return (
          <span key={i} className={`items-center gap-1.5 ${i === 0 && itens.length > 2 ? 'hidden sm:flex' : 'flex'}`}>
            {i > 0 && <ChevronRight className={`h-2.5 w-2.5 flex-shrink-0 text-text-ultra ${i === 1 && itens.length > 2 ? 'hidden sm:block' : ''}`} strokeWidth={2.5} />}
            {item.to && !ultimo ? (
              <Link to={item.to} className="transition-colors hover:text-text-dim">
                {item.rotulo}
              </Link>
            ) : (
              <span className={ultimo ? 'text-text-dim' : undefined}>{item.rotulo}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
