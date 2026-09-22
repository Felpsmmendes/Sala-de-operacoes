import { Activity, Building2, DollarSign, LayoutDashboard, LogOut, Settings, UserPlus, Wrench, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { LogoMark } from './LogoMark';

const ITENS: { to: string; rotulo: string; Icone: LucideIcon }[] = [
  { to: '/', rotulo: 'Dashboard', Icone: LayoutDashboard },
  { to: '/crm', rotulo: 'CRM', Icone: UserPlus },
  { to: '/empresas', rotulo: 'Empresas', Icone: Building2 },
  { to: '/manutencoes', rotulo: 'Manutenções', Icone: Wrench },
  { to: '/financeiro', rotulo: 'Financeiro', Icone: DollarSign },
  { to: '/configuracoes', rotulo: 'Configurações', Icone: Settings },
  { to: '/atividades', rotulo: 'Atividades', Icone: Activity },
];

function classesLink({ isActive }: { isActive: boolean }) {
  return `flex flex-shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? 'bg-accent/15 text-accent-strong' : 'text-text-dim hover:bg-raised hover:text-text'}`;
}

export default function Layout() {
  const { session, sair } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen lg:pl-[220px]">
      {/* barra lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-[220px] flex-col border-r border-line bg-panel px-3 py-5 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-3">
          <LogoMark tamanho={26} />
          <div>
            <p className="display text-[16px] leading-none text-text">Firme</p>
            <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-text-faint">Painel</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5">
          {ITENS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={classesLink}>
              <item.Icone className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
              {item.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line px-3 pt-4">
          <p className="mb-2 truncate text-[11.5px] text-text-faint" title={session?.user?.email}>
            {session?.user?.email}
          </p>
          <button type="button" onClick={sair} className="flex items-center gap-1.5 text-[12px] text-text-dim hover:text-danger">
            <LogOut className="h-3.5 w-3.5" strokeWidth={2} /> Sair
          </button>
        </div>
      </aside>

      {/* barra superior (celular/tablet): mesma navegação, rolando na horizontal */}
      <header className="sticky top-0 z-20 border-b border-line bg-panel lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <div className="flex items-center gap-2">
            <LogoMark tamanho={22} />
            <p className="display text-[14px] leading-none text-text">Firme</p>
          </div>
          <button type="button" onClick={sair} aria-label="Sair" className="text-text-dim hover:text-danger">
            <LogOut className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ITENS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={classesLink}>
              <item.Icone className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
              {item.rotulo}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto min-w-0 max-w-[1400px] px-4 py-6 lg:px-8">
        {/* `key` remonta o wrapper a cada rota — é o que re-dispara a entrada da página */}
        <div key={pathname} className="pagina-entrada">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
