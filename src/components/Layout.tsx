import {
  BarChart3,
  Calendar,
  ClipboardCheck,
  Filter,
  Fingerprint,
  LayoutDashboard,
  Link2,
  ListChecks,
  Menu,
  Moon,
  Package,
  Receipt,
  Sun,
  Truck,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useTema } from '../lib/useTema';
import { DotLive } from './ui/DotLive';

type ItemNav = { to: string; rotulo: string; Icone: typeof LayoutDashboard };

const CHAVE_SIDEBAR_COLAPSADA = 'emcena_sidebar_colapsada';

/* -- Painel fica sozinho no topo, fora dos núcleos — é a tela-lar ("/"),
   não faz sentido enterrada dentro de um núcleo lá embaixo. */
const PAINEL: ItemNav = { to: '/', rotulo: 'Sala de Operações', Icone: LayoutDashboard };

/* -- núcleos operacionais (ver PRD, seção 3), na ordem do fluxo real do
   negócio. Ícone e texto SEMPRE neutros (prompt master, seção 2.1/3: "cor
   do núcleo NÃO aparece em ícones da sidebar") — só o item ATIVO ganha a
   cor de marca (âmbar), nunca a cor do módulo. */
const NUCLEOS: { titulo: string; itens: ItemNav[] }[] = [
  {
    titulo: 'Comercial & Cliente',
    itens: [
      { to: '/crm', rotulo: 'CRM & Pipeline', Icone: Filter },
      { to: '/orcamentos', rotulo: 'Gerador de Orçamentos', Icone: Receipt },
      { to: '/contratos', rotulo: 'Contratos', Icone: ClipboardCheck },
      { to: '/portal-cliente', rotulo: 'Portal do Cliente', Icone: Link2 },
    ],
  },
  {
    titulo: 'Planejamento & Pré-Produção',
    itens: [
      { to: '/agenda', rotulo: 'Agenda Operacional', Icone: Calendar },
      { to: '/escala', rotulo: 'Equipe do Evento', Icone: Users },
      { to: '/estoque', rotulo: 'Estoque', Icone: Package },
      { to: '/logistica', rotulo: 'Frota e Entregas', Icone: Truck },
    ],
  },
  {
    titulo: 'Execução em Tempo Real',
    itens: [
      { to: '/roteiro', rotulo: 'Roteiro do Evento', Icone: ListChecks },
      { to: '/ponto', rotulo: 'Confirmação de Chegada', Icone: Fingerprint },
    ],
  },
  {
    titulo: 'Encerramento & Controladoria',
    itens: [
      { to: '/auditoria', rotulo: 'Após o Evento', Icone: ClipboardCheck },
      { to: '/financeiro', rotulo: 'Finanças', Icone: Wallet },
      { to: '/fechamento', rotulo: 'Fechamento Mensal', Icone: BarChart3 },
    ],
  },
];

/* -- barra inferior mobile: só os 7 módulos que o PRD marca como
   "Mobile". Mesma regra da sidebar — neutro em repouso, âmbar só no
   ativo (v2, 2026-09-10: a v1 tinha uma cor por categoria aqui). -- */
const BOTTOMBAR: ItemNav[] = [
  { to: '/', rotulo: 'Painel', Icone: LayoutDashboard },
  { to: '/crm', rotulo: 'CRM', Icone: Filter },
  { to: '/orcamentos', rotulo: 'Orçamento', Icone: Receipt },
  { to: '/agenda', rotulo: 'Agenda', Icone: Calendar },
  { to: '/ponto', rotulo: 'Chegada', Icone: Fingerprint },
  { to: '/financeiro', rotulo: 'Finanças', Icone: Wallet },
  { to: '/fechamento', rotulo: 'Fechamento', Icone: BarChart3 },
];

function classesLink({ isActive }: { isActive: boolean }) {
  return ['nav-item flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium', isActive ? 'is-active' : ''].join(' ');
}

export default function Layout() {
  const { session } = useAuth();
  const email = session?.user?.email ?? '';
  const nomePerfil = (session?.user?.user_metadata as { nome?: string } | undefined)?.nome || email || 'Gestor';
  const [colapsada, setColapsada] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_SIDEBAR_COLAPSADA) === '1';
    } catch {
      return false;
    }
  });

  function alternarColapso() {
    setColapsada((atual) => {
      const novo = !atual;
      try {
        localStorage.setItem(CHAVE_SIDEBAR_COLAPSADA, novo ? '1' : '0');
      } catch {
        /* localStorage indisponível (aba privada etc.) — só não persiste entre sessões */
      }
      return novo;
    });
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* -- sidebar (desktop, ≥960px) — recolhível pra sobrar mais tela pro
          conteúdo. Fundo sólido `--color-sidebar` (prompt master, seção
          2.1) — v2 não usa mais vidro/blur aqui, só na TopBar. -- */}
      <aside
        className={`sidebar-glass fixed inset-y-0 left-0 hidden flex-col gap-6 overflow-y-auto overflow-x-hidden py-5 transition-[width] duration-200 lg:flex ${
          colapsada ? 'w-16 px-2' : 'w-[210px] px-3.5'
        }`}
      >
        <div className={`flex items-center gap-2 ${colapsada ? 'flex-col' : 'justify-between px-1'}`}>
          <a href="/" className="flex items-center gap-2.5 overflow-hidden">
            <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[11px] bg-white text-[12px] font-black text-[#050507]">EC</span>
            {!colapsada && (
              <span className="flex flex-col leading-tight">
                <span className="whitespace-nowrap text-[13.5px] font-extrabold text-text">EM CENA</span>
                <span className="whitespace-nowrap font-mono text-[8px] uppercase tracking-widest text-text-ultra">Sala de Operações</span>
              </span>
            )}
          </a>
          <button
            type="button"
            onClick={alternarColapso}
            title={colapsada ? 'Expandir menu' : 'Recolher menu'}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-raised hover:text-text"
          >
            <Menu className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col gap-1 border-b border-line pb-4">
            {!colapsada && <p className="px-3 pb-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-text-ultra">Principal</p>}
            <NavLink key={PAINEL.to} to={PAINEL.to} end title={colapsada ? PAINEL.rotulo : undefined} className={classesLink}>
              <PAINEL.Icone className="nav-icon h-[15px] w-[15px] flex-shrink-0" strokeWidth={1.75} />
              {!colapsada && <span className="truncate">{PAINEL.rotulo}</span>}
            </NavLink>
          </div>
          {NUCLEOS.map((nucleo) => (
            <div key={nucleo.titulo} className="flex flex-col gap-1">
              {!colapsada && <p className="px-3 pb-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-text-ultra">{nucleo.titulo}</p>}
              {nucleo.itens.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} title={colapsada ? item.rotulo : undefined} className={classesLink}>
                  <item.Icone className="nav-icon h-[15px] w-[15px] flex-shrink-0" strokeWidth={1.75} />
                  {!colapsada && <span className="truncate">{item.rotulo}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* rodapé — status operacional (prompt master, seção 2.1) +
            atalho de perfil (clicar leva pra Configurações: perfil, trocar
            senha, sair da conta ficam todos lá). */}
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          {!colapsada && (
            <div className="flex items-center gap-1.5 px-3 font-mono text-[9.5px] font-medium text-text-faint">
              <DotLive categoria="execucao" />
              Operação Normal
            </div>
          )}
          <NavLink
            to="/configuracoes"
            title={colapsada ? 'Configurações' : undefined}
            className={({ isActive }) => `nav-item flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'is-active' : ''}`}
          >
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-raised text-text-faint">
              <User className="h-4 w-4" strokeWidth={1.75} />
            </span>
            {!colapsada && (
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[12.5px] font-medium">{nomePerfil}</p>
                <p className="text-[10.5px] text-text-ultra">Configurações</p>
              </div>
            )}
          </NavLink>
        </div>
      </aside>

      {/* -- conteúdo -- */}
      <div className={`flex-1 pb-20 transition-[margin] duration-200 lg:pb-0 ${colapsada ? 'lg:ml-16' : 'lg:ml-[210px]'}`}>
        <Outlet />
      </div>

      {/* -- barra inferior (mobile, <960px) -- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-line bg-panel px-0.5 py-1.5 lg:hidden">
        {BOTTOMBAR.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              ['flex flex-1 flex-col items-center gap-0.5 rounded-sm px-1 py-1 text-[9.5px] font-semibold transition-colors', isActive ? 'text-accent' : 'text-text-faint'].join(' ')
            }
          >
            <item.Icone className="h-[19px] w-[19px]" strokeWidth={1.75} />
            <span className="truncate">{item.rotulo}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** Cabeçalho padrão de cada tela — faixa de status (TopBar) + título +
    subtítulo. TopBar v2 (prompt master, seção 2.1): label mono
    ultra-muted + relógio à esquerda, alternador de tema à direita — é o
    único elemento do sistema, além do card, que ainda leva um traço de
    vidro (`.topbar-glass`, blur médio), porque fica fixo no topo e
    precisa se destacar do conteúdo passando por baixo dele ao rolar. */
export function Cabecalho({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <header className="border-b border-line px-5 pt-3.5 lg:px-8">
      <div className="mx-auto max-w-[1680px]">
        <RelogioStatus />
        <h1 className="mb-1 mt-1 text-[26px] font-extrabold tracking-tight text-text">{titulo}</h1>
        <p className="pb-5 text-sm text-text-dim">{subtitulo}</p>
      </div>
    </header>
  );
}

function RelogioStatus() {
  const [hora, setHora] = useState(() => new Date().toLocaleTimeString('pt-BR'));
  const { tema, alternar } = useTema();
  useEffect(() => {
    const id = setInterval(() => setHora(new Date().toLocaleTimeString('pt-BR')), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mt-6 flex items-center gap-2">
      <DotLive categoria="acao" />
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-ultra">Centro Integrado de Controle</span>
      <span className="ml-auto font-mono text-xs tabular-nums text-text-dim">{hora}</span>
      <button
        type="button"
        onClick={alternar}
        title={tema === 'escuro' ? 'Mudar pro modo claro' : 'Mudar pro modo escuro'}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-raised hover:text-text"
      >
        {tema === 'escuro' ? <Sun className="h-3.5 w-3.5" strokeWidth={2} /> : <Moon className="h-3.5 w-3.5" strokeWidth={2} />}
      </button>
    </div>
  );
}

/** Container padrão pra conteúdo de página (largura máxima + respiro). */
export function Conteudo({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-[1680px] px-5 py-6 lg:px-8">{children}</main>;
}
