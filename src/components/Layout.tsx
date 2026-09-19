import {
  Activity,
  BarChart3,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Filter,
  Fingerprint,
  LayoutDashboard,
  LineChart,
  Link2,
  ListChecks,
  Menu,
  Moon,
  Package,
  PieChart,
  Plus,
  Receipt,
  Search,
  Sun,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useNotificacoes } from '../lib/NotificacoesContext';
import { useTema } from '../lib/useTema';
import { Breadcrumb } from './Breadcrumb';
import { Skeleton } from './Skeleton';
import { CommandPalette } from './ui/CommandPalette';
import { DotLive } from './ui/DotLive';
import { SinoNotificacoes } from './ui/SinoNotificacoes';

export type ItemNav = { to: string; rotulo: string; Icone: typeof LayoutDashboard };

const CHAVE_SIDEBAR_COLAPSADA = 'emcena_sidebar_colapsada';

/* -- Painel fica sozinho no topo, fora dos núcleos — é a tela-lar ("/"),
   não faz sentido enterrada dentro de um núcleo lá embaixo. Rotulo
   "Dashboard" (2026-09-19, SPEC_CAMADA1) — antes era "Sala de
   Operações", nome que migrou pro núcleo de Operação (`/roteiro`, ver
   NUCLEOS abaixo) pra não ter dois itens de menu com o mesmo nome. */
const PAINEL: ItemNav = { to: '/', rotulo: 'Dashboard', Icone: LayoutDashboard };

/* -- Rotina Diária (2026-09-19, "rotina diária") — fica junto do Painel,
   fora dos núcleos: é a tela de abertura do dia, não pertence a um
   núcleo operacional específico. -- */
const ROTINA: ItemNav = { to: '/rotina', rotulo: 'Rotina Diária', Icone: ClipboardList };

/* -- núcleos operacionais (2026-09-19, SPEC_CAMADA1_REORGANIZACAO —
   nomes mais curtos, agrupamento por fluxo real do negócio em vez de
   "Comercial & Cliente"/"Planejamento & Pré-Produção" etc.). Ícone e
   texto SEMPRE neutros (prompt master, seção 2.1/3: "cor do núcleo NÃO
   aparece em ícones da sidebar") — só o item ATIVO ganha a cor de marca
   (âmbar), nunca a cor do módulo. */
export const NUCLEOS: { titulo: string; itens: ItemNav[] }[] = [
  {
    titulo: 'Comercial',
    itens: [
      { to: '/crm', rotulo: 'CRM & Pipeline', Icone: Filter },
      { to: '/orcamentos', rotulo: 'Orçamentos', Icone: Receipt },
      { to: '/contratos', rotulo: 'Contratos', Icone: ClipboardCheck },
    ],
  },
  {
    titulo: 'Planejamento',
    itens: [
      { to: '/agenda', rotulo: 'Agenda', Icone: Calendar },
      { to: '/escala', rotulo: 'Equipe & Escalas', Icone: Users },
      { to: '/estoque', rotulo: 'Estoque', Icone: Package },
      { to: '/logistica', rotulo: 'Logística', Icone: Truck },
    ],
  },
  {
    titulo: 'Operação',
    itens: [
      { to: '/roteiro', rotulo: 'Sala de Operações', Icone: ListChecks },
      { to: '/checklists', rotulo: 'Checklists', Icone: ClipboardCheck },
      { to: '/ponto', rotulo: 'Ponto de Chegada', Icone: Fingerprint },
      // Ponto Eletrônico interno (2026-09-13) — tela própria, FORA do
      // Layout (login separado, pensado pra tablet fixo — ver
      // PontoInterno.tsx), então clicar aqui sai da sidebar de
      // propósito. Ainda assim precisa aparecer em algum lugar pra não
      // depender só de saber a URL de cor.
      { to: '/ponto-interno', rotulo: 'Ponto Eletrônico', Icone: Clock },
    ],
  },
  {
    titulo: 'Controladoria',
    itens: [
      { to: '/financeiro', rotulo: 'Financeiro', Icone: Wallet },
      { to: '/financeiro/receber', rotulo: 'Contas a Receber', Icone: TrendingUp },
      { to: '/financeiro/pagar', rotulo: 'Contas a Pagar', Icone: TrendingDown },
      { to: '/financeiro/dre', rotulo: 'DRE', Icone: PieChart },
      { to: '/fechamento', rotulo: 'Fechamento Mensal', Icone: BarChart3 },
      { to: '/relatorios', rotulo: 'Relatórios', Icone: LineChart },
      { to: '/auditoria', rotulo: 'Pós-Evento', Icone: ClipboardCheck },
    ],
  },
  {
    titulo: 'Clientes',
    itens: [{ to: '/portal-cliente', rotulo: 'Portal do Cliente', Icone: Link2 }],
  },
];

/** Lista achatada de toda tela navegável (Painel + núcleos +
    Configurações) — fonte única reaproveitada pelo CommandPalette
    (Cmd/Ctrl+K), pra nunca ficar desalinhada da sidebar de verdade. */
export const ITENS_BUSCAVEIS: ItemNav[] = [
  PAINEL,
  ROTINA,
  ...NUCLEOS.flatMap((n) => n.itens),
  { to: '/configuracoes', rotulo: 'Configurações', Icone: User },
  { to: '/status', rotulo: 'Status do Sistema', Icone: Activity },
];

/* -- barra inferior mobile (2026-09-19, "reorganização + navegação
   mobile"): só os 4 mais usados ficam fixos — os outros 13 módulos
   moram no sheet que o botão "Menu" abre (ver `menuMobileAberto` em
   `Layout()`). Os 7 itens fixos de antes não cabiam num polegar (ícone
   de ~55px em 390px de tela) e ainda deixavam Configurações inacessível
   no mobile; 4 + Menu resolve os dois problemas de uma vez. -- */
const BOTTOMBAR: ItemNav[] = [
  { to: '/', rotulo: 'Dashboard', Icone: LayoutDashboard },
  { to: '/rotina', rotulo: 'Rotina', Icone: ClipboardList },
  { to: '/agenda', rotulo: 'Agenda', Icone: Calendar },
  { to: '/financeiro', rotulo: 'Finanças', Icone: Wallet },
];

// `group relative` sempre presentes (2026-09-16) — só têm efeito visual
// quando o tooltip customizado do modo colapsado existe dentro do link
// (ver `TooltipColapsado` abaixo); expandido, não muda nada.
function classesLink({ isActive }: { isActive: boolean }) {
  return ['nav-item group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium', isActive ? 'is-active' : ''].join(' ');
}

/** Tooltip que só existe quando a sidebar está no modo ícone-só
    (2026-09-16, "redesign visual" do usuário) — o `title` nativo do
    NavLink continua (acessibilidade/fallback), isso aqui é só o balão
    visual consistente com o resto do design system, no lugar do
    tooltip cru do navegador. */
function TooltipColapsado({ texto }: { texto: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-sm border border-line bg-panel px-2 py-1 text-xs text-text opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
      {texto}
    </span>
  );
}

const CHAVE_NUCLEOS_ABERTOS = 'emcena_nucleos_abertos';

/** Núcleo dono da rota atual — usado só pra garantir que ele já abre
    sozinho ao navegar pra dentro dele (ver efeito abaixo), nunca pra
    fechar os outros que o gestor tenha aberto na mão. */
function nucleoDaRota(pathname: string): string | null {
  return NUCLEOS.find((n) => n.itens.some((i) => i.to === pathname))?.titulo ?? null;
}

export default function Layout() {
  const { session } = useAuth();
  const { naoLidas: contagemAlertas } = useNotificacoes();
  const location = useLocation();
  const email = session?.user?.email ?? '';
  const nomePerfil = (session?.user?.user_metadata as { nome?: string } | undefined)?.nome || email || 'Gestor';
  const cargoPerfil = (session?.user?.user_metadata as { cargo?: string } | undefined)?.cargo || 'Coordenador Geral';
  // Alternador de tema (2026-09-14, achado do usuário via prompt de
  // polish): morava dentro de `RelogioStatus`, que cada `Cabecalho` de
  // página monta do zero — ou seja, o botão reaparecia (e remontava) no
  // topo de TODA tela ao navegar. Movido pra cá, na sidebar persistente
  // (nunca desmonta entre rotas — ver Suspense só em volta do `Outlet`
  // logo abaixo), pra existir uma vez só.
  const { tema, alternar } = useTema();
  const [colapsada, setColapsada] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_SIDEBAR_COLAPSADA) === '1';
    } catch {
      return false;
    }
  });

  // Menu mobile deslizante (2026-09-19, "reorganização + navegação
  // mobile") — sheet com todos os núcleos, aberto pelo botão "Menu" da
  // barra inferior. Fecha sozinho ao navegar (senão ficaria aberto por
  // cima da tela nova depois de tocar num item).
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  useEffect(() => {
    setMenuMobileAberto(false);
  }, [location.pathname]);

  /** Sidebar em accordion por núcleo (pedido do usuário, 2026-09-13 —
      14 itens sempre visíveis ficava pesado). Cada núcleo abre/fecha
      independente (não é "só 1 aberto por vez") e o núcleo da página
      atual sempre acaba aberto, mesmo se o gestor tinha fechado — sem
      isso dava pra "perder" a tela ativa atrás de um grupo recolhido. */
  const [nucleosAbertos, setNucleosAbertos] = useState<Set<string>>(() => {
    const ativo = nucleoDaRota(location.pathname);
    try {
      const salvos = JSON.parse(localStorage.getItem(CHAVE_NUCLEOS_ABERTOS) ?? '[]') as string[];
      return new Set(ativo ? [...salvos, ativo] : salvos);
    } catch {
      return new Set(ativo ? [ativo] : []);
    }
  });

  useEffect(() => {
    const ativo = nucleoDaRota(location.pathname);
    if (ativo) setNucleosAbertos((atual) => (atual.has(ativo) ? atual : new Set(atual).add(ativo)));
  }, [location.pathname]);

  function alternarNucleo(titulo: string) {
    setNucleosAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(titulo)) novo.delete(titulo);
      else novo.add(titulo);
      try {
        localStorage.setItem(CHAVE_NUCLEOS_ABERTOS, JSON.stringify([...novo]));
      } catch {
        /* localStorage indisponível (aba privada etc.) — só não persiste entre sessões */
      }
      return novo;
    });
  }

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
            <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[11px] bg-white text-[12px] font-black text-[#050507] transition-transform duration-200 hover:scale-105">EC</span>
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
              <span className="relative flex-shrink-0">
                <PAINEL.Icone className="nav-icon h-[15px] w-[15px]" strokeWidth={1.75} />
                {/* Badge de "pontos de atenção" (2026-09-16, atualizado
                    2026-09-17 pra ler de `NotificacoesContext` — mesma
                    contagem de não-lidas que alimenta o sino da topbar,
                    nunca um número calculado à parte). Só no modo
                    colapsado (ícone-só): expandido, o número já aparece
                    na pill ao lado do rótulo, abaixo. */}
                {colapsada && contagemAlertas > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[8px] font-bold text-white">
                    {contagemAlertas > 9 ? '9+' : contagemAlertas}
                  </span>
                )}
              </span>
              {!colapsada && (
                <span className="flex flex-1 items-center justify-between gap-2 truncate">
                  {PAINEL.rotulo}
                  {contagemAlertas > 0 && <span className="flex-shrink-0 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">{contagemAlertas}</span>}
                </span>
              )}
              {colapsada && <TooltipColapsado texto={PAINEL.rotulo} />}
            </NavLink>
            <NavLink key={ROTINA.to} to={ROTINA.to} end title={colapsada ? ROTINA.rotulo : undefined} className={classesLink}>
              <ROTINA.Icone className="nav-icon h-[15px] w-[15px] flex-shrink-0" strokeWidth={1.75} />
              {!colapsada && <span className="truncate">{ROTINA.rotulo}</span>}
              {colapsada && <TooltipColapsado texto={ROTINA.rotulo} />}
            </NavLink>
          </div>
          {NUCLEOS.map((nucleo) => {
            // colapsada (modo só-ícone) ignora o accordion de propósito —
            // já é a forma mais compacta, empilhar as duas reduções em
            // cima uma da outra só confundiria.
            const aberto = colapsada || nucleosAbertos.has(nucleo.titulo);
            return (
              <div key={nucleo.titulo} className="flex flex-col gap-1">
                {!colapsada && (
                  <button
                    type="button"
                    onClick={() => alternarNucleo(nucleo.titulo)}
                    className="flex items-center justify-between px-3 pb-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-text-ultra transition-colors hover:text-text-faint"
                  >
                    {nucleo.titulo}
                    <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform ${aberto ? '' : '-rotate-90'}`} strokeWidth={2} />
                  </button>
                )}
                {aberto &&
                  nucleo.itens.map((item) => (
                    <NavLink key={item.to} to={item.to} end={item.to === '/'} title={colapsada ? item.rotulo : undefined} className={classesLink}>
                      <item.Icone className="nav-icon h-[15px] w-[15px] flex-shrink-0" strokeWidth={1.75} />
                      {!colapsada && <span className="truncate">{item.rotulo}</span>}
                      {colapsada && <TooltipColapsado texto={item.rotulo} />}
                    </NavLink>
                  ))}
              </div>
            );
          })}
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
            to="/status"
            title={colapsada ? 'Status do Sistema' : undefined}
            className={({ isActive }) => `nav-item flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'is-active' : ''}`}
          >
            <Activity className="nav-icon h-[15px] w-[15px] flex-shrink-0" strokeWidth={1.75} />
            {!colapsada && <span className="truncate">Status</span>}
            {colapsada && <TooltipColapsado texto="Status do Sistema" />}
          </NavLink>
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
                <p className="truncate text-[10.5px] text-text-ultra">{cargoPerfil}</p>
              </div>
            )}
          </NavLink>
        </div>
      </aside>

      {/* -- conteúdo -- */}
      <div className={`flex-1 pb-24 transition-[margin] duration-200 lg:pb-0 ${colapsada ? 'lg:ml-16' : 'lg:ml-[210px]'}`}>
        {/* Topbar persistente (2026-09-17, "topbar + notificações") — busca,
            atalho de criação e sino ficam fixos no topo em TODA tela
            autenticada, em vez de cada `Cabecalho` remontar seu próprio
            botão de busca. O alternador de tema mora aqui agora (saiu do
            rodapé da sidebar): esta topbar é tão persistente quanto a
            sidebar (nunca desmonta entre rotas), então não reintroduz o
            "pisca" que motivou tirá-lo do `Cabecalho` por página em
            2026-09-14 — ver comentário em `useTema` acima. */}
        <div className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-line bg-sidebar/90 px-5 backdrop-blur-sm lg:px-6">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="hidden items-center gap-2 rounded-md border border-line bg-raised px-3 py-1.5 text-[12px] text-text-faint transition-colors hover:border-line-strong hover:text-text-dim sm:flex"
          >
            <Search className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Buscar…</span>
            <kbd className="ml-2 rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-[9px] text-text-ultra">⌘K</kbd>
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            title="Buscar (⌘K)"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-raised text-text-faint transition-colors hover:border-line-strong hover:text-text sm:hidden"
          >
            <Search className="h-3.5 w-3.5" strokeWidth={2} />
          </button>

          <div className="flex-1" />

          <Link
            to="/agenda"
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink transition-colors hover:bg-accent-strong"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span className="hidden sm:inline">Novo Evento</span>
          </Link>

          <button
            type="button"
            onClick={alternar}
            title={tema === 'escuro' ? 'Modo claro' : 'Modo escuro'}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-raised text-text-faint transition-colors hover:border-line-strong hover:text-text"
          >
            {tema === 'escuro' ? <Sun className="h-[15px] w-[15px]" strokeWidth={1.75} /> : <Moon className="h-[15px] w-[15px]" strokeWidth={1.75} />}
          </button>

          <SinoNotificacoes />
        </div>
        {/* Suspense PRÓPRIO daqui (2026-09-13), não só o de cima em
            App.tsx — sem isso, trocar de página (cada rota é um chunk
            lazy próprio, ver App.tsx) suspendia até o Suspense mais
            próximo na árvore, que ficava ACIMA do Layout inteiro — a
            sidebar inteira sumia e reaparecia a cada navegação. Com este
            aqui, só o conteúdo pisca; sidebar/topbar continuam montados. */}
        <Suspense fallback={<CarregandoConteudo />}>
          <Outlet />
        </Suspense>
      </div>

      {/* -- barra inferior (mobile, <960px) — 4 itens fixos + Menu (2026-09-19) -- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-line bg-panel px-1 py-1.5 lg:hidden">
        {BOTTOMBAR.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              ['flex min-w-0 flex-1 flex-col items-center gap-1 rounded-sm px-1 py-1.5 text-[10px] font-semibold transition-colors', isActive ? 'text-accent' : 'text-text-faint'].join(' ')
            }
          >
            <item.Icone className="h-6 w-6 flex-shrink-0" strokeWidth={1.75} />
            <span className="w-full truncate text-center">{item.rotulo}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMenuMobileAberto((v) => !v)}
          className={['flex min-w-0 flex-1 flex-col items-center gap-1 rounded-sm px-1 py-1.5 text-[10px] font-semibold transition-colors', menuMobileAberto ? 'text-accent' : 'text-text-faint'].join(
            ' '
          )}
        >
          <Menu className="h-6 w-6 flex-shrink-0" strokeWidth={1.75} />
          <span>Menu</span>
        </button>
      </nav>

      {/* Overlay + sheet deslizante (2026-09-19) — todos os núcleos +
          Configurações, o que faltava pro mobile acessar as outras 13
          telas que não cabem na barra fixa. */}
      {menuMobileAberto && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMenuMobileAberto(false)} />}

      <div
        className={[
          'fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t border-line bg-panel lg:hidden',
          'transition-transform duration-300 ease-out',
          menuMobileAberto ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
        style={{ maxHeight: '80vh' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-line-strong" />
        </div>

        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-text-dim">Menu</span>
          <button type="button" onClick={() => setMenuMobileAberto(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-raised text-text-faint">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-3 pb-8">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              ['flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors', isActive ? 'bg-accent/10 text-accent' : 'text-text hover:bg-raised'].join(' ')
            }
          >
            <LayoutDashboard className="h-5 w-5 flex-shrink-0" strokeWidth={1.75} />
            Sala de Operações
          </NavLink>

          <NavLink
            to={ROTINA.to}
            end
            className={({ isActive }) =>
              ['flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors', isActive ? 'bg-accent/10 text-accent' : 'text-text hover:bg-raised'].join(' ')
            }
          >
            <ROTINA.Icone className="h-5 w-5 flex-shrink-0" strokeWidth={1.75} />
            {ROTINA.rotulo}
          </NavLink>

          {NUCLEOS.map((nucleo) => (
            <div key={nucleo.titulo}>
              <p className="px-3 pb-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-text-dim">{nucleo.titulo}</p>
              <div className="flex flex-col gap-0.5">
                {nucleo.itens.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      ['flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors', isActive ? 'bg-accent/10 text-accent' : 'text-text hover:bg-raised'].join(' ')
                    }
                  >
                    <item.Icone className="h-5 w-5 flex-shrink-0" strokeWidth={1.75} />
                    {item.rotulo}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          <div>
            <p className="px-3 pb-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-text-dim">Sistema</p>
            <NavLink
              to="/configuracoes"
              className={({ isActive }) =>
                ['flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors', isActive ? 'bg-accent/10 text-accent' : 'text-text hover:bg-raised'].join(' ')
              }
            >
              <User className="h-5 w-5 flex-shrink-0" strokeWidth={1.75} />
              Configurações
            </NavLink>
          </div>
        </div>
      </div>

      <CommandPalette />
    </div>
  );
}

/** Cabeçalho padrão de cada tela — faixa de status + título + subtítulo.
    Label mono ultra-muted + relógio + atalho de busca (⌘K). O alternador
    de tema NÃO mora mais aqui (2026-09-14, achado do usuário): morava
    nesta faixa, só que ela é remontada por CADA página — o botão
    reaparecia (e "piscava") no topo de toda tela ao navegar. Agora vive
    uma vez só, na sidebar persistente (ver `Layout`). */
export function Cabecalho({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  const location = useLocation();
  // Trilha [Sala de Operações > Núcleo > Página] (2026-09-16) — reaproveita
  // os mesmos grupos da sidebar (`NUCLEOS`/`nucleoDaRota`), nunca uma
  // hierarquia paralela. Escondida em tela sem núcleo (Painel/
  // Configurações) — nesses casos o H1 abaixo já basta.
  const nucleo = nucleoDaRota(location.pathname);
  return (
    <header className="border-b border-line px-5 pt-3.5 lg:px-8">
      <div className="mx-auto max-w-[1680px]">
        {nucleo && (
          <Breadcrumb
            itens={[
              { rotulo: 'Sala de Operações', to: '/' },
              { rotulo: nucleo },
              { rotulo: titulo },
            ]}
          />
        )}
        <RelogioStatus />
        <h1 className="mb-1 mt-1 text-[26px] font-extrabold tracking-tight text-text">{titulo}</h1>
        <p className="pb-5 text-sm text-text-dim">{subtitulo}</p>
      </div>
    </header>
  );
}

function RelogioStatus() {
  const [hora, setHora] = useState(() => new Date().toLocaleTimeString('pt-BR'));
  useEffect(() => {
    const id = setInterval(() => setHora(new Date().toLocaleTimeString('pt-BR')), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mt-6 flex items-center gap-2">
      <DotLive categoria="acao" />
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-ultra">Centro Integrado de Controle</span>
      <span className="ml-auto font-mono text-xs tabular-nums text-text-dim">{hora}</span>
    </div>
  );
}

/** Container padrão pra conteúdo de página (largura máxima + respiro). */
export function Conteudo({ children }: { children: ReactNode }) {
  // Entrada suave a cada troca de tela (2026-09-15, "12 animações" do
  // usuário) — como cada página é um chunk `lazy` separado (ver App.tsx),
  // ela já remonta do zero a cada navegação; um efeito de fade+slide no
  // MOUNT deste wrapper único (usado por toda tela interna) já cobre o
  // sistema inteiro de uma vez, sem duplicar o mesmo hook em ~15 páginas.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    const frame = requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <main ref={ref} className="mx-auto max-w-[1680px] px-5 py-6 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}

/** Fallback do Suspense do conteúdo (ver comentário acima do `<Outlet/>`)
    — formato aproximado do que quase toda tela interna tem (título +
    métricas), só pra não ser uma troca abrupta/em branco enquanto o
    chunk da próxima rota baixa. */
function CarregandoConteudo() {
  return (
    <Conteudo>
      <div className="flex flex-col gap-4">
        <Skeleton w="220px" h="13px" />
        <Skeleton w="320px" h="26px" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} h="96px" className="rounded-md" />
          ))}
        </div>
        <Skeleton h="240px" className="rounded-md" />
      </div>
    </Conteudo>
  );
}
