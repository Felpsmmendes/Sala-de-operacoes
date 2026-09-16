import {
  BarChart3,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Filter,
  Fingerprint,
  LayoutDashboard,
  Link2,
  ListChecks,
  Menu,
  Moon,
  Package,
  Receipt,
  Search,
  Sun,
  Truck,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAlertas } from '../lib/AlertasContext';
import { useAuth } from '../lib/AuthContext';
import { useTema } from '../lib/useTema';
import { Breadcrumb } from './Breadcrumb';
import { Skeleton } from './Skeleton';
import { CommandPalette } from './ui/CommandPalette';
import { DotLive } from './ui/DotLive';

export type ItemNav = { to: string; rotulo: string; Icone: typeof LayoutDashboard };

const CHAVE_SIDEBAR_COLAPSADA = 'emcena_sidebar_colapsada';

/* -- Painel fica sozinho no topo, fora dos núcleos — é a tela-lar ("/"),
   não faz sentido enterrada dentro de um núcleo lá embaixo. */
const PAINEL: ItemNav = { to: '/', rotulo: 'Sala de Operações', Icone: LayoutDashboard };

/* -- núcleos operacionais (ver PRD, seção 3), na ordem do fluxo real do
   negócio. Ícone e texto SEMPRE neutros (prompt master, seção 2.1/3: "cor
   do núcleo NÃO aparece em ícones da sidebar") — só o item ATIVO ganha a
   cor de marca (âmbar), nunca a cor do módulo. */
export const NUCLEOS: { titulo: string; itens: ItemNav[] }[] = [
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
      // Ponto Eletrônico interno (2026-09-13) — tela própria, FORA do
      // Layout (login separado, pensado pra tablet fixo — ver
      // PontoInterno.tsx), então clicar aqui sai da sidebar de
      // propósito. Ainda assim precisa aparecer em algum lugar pra não
      // depender só de saber a URL de cor.
      { to: '/ponto-interno', rotulo: 'Ponto Eletrônico (Interno)', Icone: Clock },
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

/** Lista achatada de toda tela navegável (Painel + núcleos +
    Configurações) — fonte única reaproveitada pelo CommandPalette
    (Cmd/Ctrl+K), pra nunca ficar desalinhada da sidebar de verdade. */
export const ITENS_BUSCAVEIS: ItemNav[] = [PAINEL, ...NUCLEOS.flatMap((n) => n.itens), { to: '/configuracoes', rotulo: 'Configurações', Icone: User }];

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
  const { contagem: contagemAlertas } = useAlertas();
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
                {/* Badge de "pontos de atenção" (2026-09-16) — escrito só
                    pelo Dashboard via AlertasContext (ver comentário lá).
                    Só no modo colapsado (ícone-só): expandido, o número
                    já aparece na pill ao lado do rótulo, abaixo. */}
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
          <button
            type="button"
            onClick={alternar}
            title={tema === 'escuro' ? 'Mudar pro modo claro' : 'Mudar pro modo escuro'}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-text-faint transition-colors hover:bg-raised hover:text-text ${colapsada ? 'justify-center' : ''}`}
          >
            {tema === 'escuro' ? <Sun className="h-[15px] w-[15px] flex-shrink-0" strokeWidth={1.75} /> : <Moon className="h-[15px] w-[15px] flex-shrink-0" strokeWidth={1.75} />}
            {!colapsada && <span>{tema === 'escuro' ? 'Modo claro' : 'Modo escuro'}</span>}
          </button>
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
      <div className={`flex-1 pb-20 transition-[margin] duration-200 lg:pb-0 ${colapsada ? 'lg:ml-16' : 'lg:ml-[210px]'}`}>
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

      {/* -- barra inferior (mobile, <960px) -- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-line bg-panel px-0.5 py-1.5 lg:hidden">
        {BOTTOMBAR.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              // `min-w-0` é o que faz o `truncate` do rótulo funcionar de
              // verdade: um filho `flex-1` sem isso nunca encolhe além do
              // tamanho do próprio conteúdo (mínimo = largura do texto),
              // e com 7 itens nessa barra soma mais largura que cabe em
              // qualquer celular — estourava a página inteira pro lado
              // (scroll horizontal fantasma, achado do usuário 2026-09-14).
              ['flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-sm px-1 py-1 text-[9.5px] font-semibold transition-colors', isActive ? 'text-accent' : 'text-text-faint'].join(' ')
            }
          >
            <item.Icone className="h-[19px] w-[19px] flex-shrink-0" strokeWidth={1.75} />
            <span className="w-full truncate text-center">{item.rotulo}</span>
          </NavLink>
        ))}
      </nav>

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
      <button
        type="button"
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        title="Busca rápida (Ctrl/Cmd + K)"
        className="hidden items-center gap-1 rounded-sm border border-line bg-raised px-1.5 py-0.5 font-mono text-[9.5px] text-text-faint transition-colors hover:text-text sm:flex"
      >
        <Search className="h-2.5 w-2.5" strokeWidth={2} /> ⌘K
      </button>
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
