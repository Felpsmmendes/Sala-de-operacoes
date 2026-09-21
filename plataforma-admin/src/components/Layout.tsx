import { Building2, LogOut, UserPlus } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const ITENS = [
  { to: '/', rotulo: 'Empresas', Icone: Building2 },
  { to: '/crm', rotulo: 'Prospecção', Icone: UserPlus },
];

export default function Layout() {
  const { session, sair } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-panel px-5 py-3">
        <div className="flex items-center gap-6">
          <span className="text-[13px] font-bold uppercase tracking-widest text-text">Painel da Plataforma</span>
          <nav className="flex items-center gap-1">
            {ITENS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${isActive ? 'bg-raised text-accent-strong' : 'text-text-dim hover:text-text'}`
                }
              >
                <item.Icone className="h-3.5 w-3.5" strokeWidth={2} />
                {item.rotulo}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11.5px] text-text-faint sm:inline">{session?.user?.email}</span>
          <button type="button" onClick={sair} className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12px] text-text-dim hover:bg-raised hover:text-danger">
            <LogOut className="h-3.5 w-3.5" strokeWidth={2} /> Sair
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">
        <Outlet />
      </main>
    </div>
  );
}
