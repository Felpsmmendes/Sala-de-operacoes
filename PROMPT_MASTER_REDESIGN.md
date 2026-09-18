# MASTER SPEC — Sala de Operações
## Sessão única do Claude Code — todos os P1 de todas as páginas

---

## REGRAS GLOBAIS — leia antes de tocar em qualquer arquivo

1. **Audite o código real antes de editar** — nunca assuma o que existe.
2. **`npm run build` deve passar sem erros** após cada etapa numerada.
3. **Não crie tabelas no Supabase** — tudo em memória ou localStorage.
4. **Não altere** autenticação, rotas, schema do banco, páginas públicas.
5. **Não adicione dependências npm** — use só o que já está instalado.
6. **Preserve toda lógica de negócio** — mudanças são apenas visuais e de UX.
7. **Design system:** `src/styles/design-tokens.css` + `src/index.css`. Todo CSS novo vai nesses dois arquivos.
8. **Componentes existentes que você vai usar:** `AlertaBanner`, `ProgressBar`, `Panel`, `PanelHeader`, `MetricCard`, `EstadoVazio`, `GraficoLinha`, `GraficoBarrasHorizontal`, `GraficoDonut`, `Paginacao`, `OrdenacaoColuna`, `Button`, `Badge`, `DotLive`.
9. **Ao final de cada etapa:** `git add -A && git commit -m "feat: [nome da etapa]"`.
10. **Deploy final:** `vercel --prod` após todas as etapas.

---

## ETAPA 0 — Componentes novos (criar antes de tudo)

### 0a — `src/components/ui/Avatar.tsx`

Componente de avatar com iniciais do cliente/membro. Usado em Contratos, CRM, Escala.

```tsx
import type { CategoriaMetrica } from '../MetricCard';

const COR: Record<CategoriaMetrica, { bg: string; text: string }> = {
  dinheiro:  { bg: 'bg-money/15',    text: 'text-money' },
  pessoas:   { bg: 'bg-people/15',   text: 'text-people' },
  agenda:    { bg: 'bg-schedule/15', text: 'text-schedule' },
  operacao:  { bg: 'bg-ops/15',      text: 'text-ops' },
  acao:      { bg: 'bg-accent/15',   text: 'text-accent' },
  execucao:  { bg: 'bg-execucao/15', text: 'text-execucao' },
  neutro:    { bg: 'bg-raised',      text: 'text-text-dim' },
};

export function Avatar({
  nome,
  categoria = 'neutro',
  tamanho = 34,
}: {
  nome: string;
  categoria?: CategoriaMetrica;
  tamanho?: number;
}) {
  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  const { bg, text } = COR[categoria];
  const fontSize = tamanho <= 28 ? 'text-[10px]' : tamanho <= 34 ? 'text-[11px]' : 'text-[12px]';

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-[9px] font-bold ${bg} ${text} ${fontSize}`}
      style={{ width: tamanho, height: tamanho }}
      aria-label={nome}
    >
      {iniciais}
    </div>
  );
}
```

### 0b — `src/lib/NotificacoesContext.tsx`

Contexto global de notificações em memória para o sino.

```tsx
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export type NivelNotificacao = 'critico' | 'aviso' | 'info';

export type Notificacao = {
  id: string;
  nivel: NivelNotificacao;
  titulo: string;
  descricao?: string;
  link?: string;
  lida: boolean;
  criadaEm: Date;
};

type Ctx = {
  notificacoes: Notificacao[];
  naoLidas: number;
  adicionar: (n: Omit<Notificacao, 'id' | 'lida' | 'criadaEm'>) => void;
  marcarLida: (id: string) => void;
  marcarTodasLidas: () => void;
};

const NotificacoesCtx = createContext<Ctx>({
  notificacoes: [], naoLidas: 0,
  adicionar: () => {}, marcarLida: () => {}, marcarTodasLidas: () => {},
});

export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const contRef = useRef(0);

  const adicionar = useCallback((n: Omit<Notificacao, 'id' | 'lida' | 'criadaEm'>) => {
    setNotificacoes((atual) => {
      // Evitar duplicatas pelo título
      if (atual.some((a) => a.titulo === n.titulo)) return atual;
      const nova: Notificacao = { ...n, id: String(++contRef.current), lida: false, criadaEm: new Date() };
      // Máximo 20 notificações
      return [nova, ...atual].slice(0, 20);
    });
  }, []);

  const marcarLida = useCallback((id: string) => {
    setNotificacoes((atual) => atual.map((n) => n.id === id ? { ...n, lida: true } : n));
  }, []);

  const marcarTodasLidas = useCallback(() => {
    setNotificacoes((atual) => atual.map((n) => ({ ...n, lida: true })));
  }, []);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <NotificacoesCtx.Provider value={{ notificacoes, naoLidas, adicionar, marcarLida, marcarTodasLidas }}>
      {children}
    </NotificacoesCtx.Provider>
  );
}

export const useNotificacoes = () => useContext(NotificacoesCtx);
```

Adicionar `<NotificacoesProvider>` em `src/App.tsx` envolvendo as rotas, dentro do `<ToastProvider>`.

### 0c — `src/components/ui/SinoNotificacoes.tsx`

Sino com badge e dropdown de notificações.

```tsx
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificacoes, type NivelNotificacao } from '../../lib/NotificacoesContext';

const COR: Record<NivelNotificacao, string> = {
  critico: 'text-danger',
  aviso:   'text-pending',
  info:    'text-people',
};

const BG: Record<NivelNotificacao, string> = {
  critico: 'border-danger/20 bg-danger/8',
  aviso:   'border-pending/20 bg-pending/8',
  info:    'border-people/20 bg-people/8',
};

function tempoRelativo(data: Date): string {
  const diff = Date.now() - data.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function SinoNotificacoes() {
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navegar = useNavigate();

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  function aoClicar(n: typeof notificacoes[0]) {
    marcarLida(n.id);
    if (n.link) { navegar(n.link); setAberto(false); }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md border border-line bg-raised text-text-faint transition-colors hover:border-line-strong hover:text-text"
        aria-label={`Notificações${naoLidas > 0 ? ` — ${naoLidas} não lidas` : ''}`}
      >
        <Bell className="h-[15px] w-[15px]" strokeWidth={1.75} />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-0.5 font-mono text-[9px] font-bold text-white">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          className="absolute right-0 top-10 z-50 w-[340px] overflow-hidden rounded-xl border border-line bg-panel shadow-xl"
          style={{ animation: 'notif-entrada 180ms cubic-bezier(.22,1,.36,1)' }}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-[13px] font-semibold text-text">Notificações</span>
            {naoLidas > 0 && (
              <button
                type="button"
                onClick={marcarTodasLidas}
                className="flex items-center gap-1.5 text-[11.5px] font-medium text-text-faint transition-colors hover:text-text"
              >
                <CheckCheck className="h-3.5 w-3.5" strokeWidth={2} />
                Marcar todas lidas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-[400px] overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCheck className="mx-auto mb-2 h-8 w-8 text-text-ultra" strokeWidth={1.5} />
                <p className="text-[13px] font-medium text-text-dim">Tudo em dia</p>
                <p className="text-[12px] text-text-faint">Nenhuma pendência no momento.</p>
              </div>
            ) : (
              notificacoes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => aoClicar(n)}
                  className={`flex cursor-pointer items-start gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0 ${n.lida ? 'opacity-50' : ''} hover:bg-raised`}
                >
                  <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${BG[n.nivel]} ${COR[n.nivel]}`}>
                    {n.nivel === 'critico' ? '!' : n.nivel === 'aviso' ? '⚠' : 'i'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[12.5px] font-semibold leading-tight ${COR[n.nivel]}`}>{n.titulo}</p>
                    {n.descricao && <p className="mt-0.5 text-[11.5px] text-text-dim">{n.descricao}</p>}
                    <p className="mt-1 font-mono text-[10px] text-text-ultra">{tempoRelativo(n.criadaEm)}</p>
                  </div>
                  {n.link && <ExternalLink className="mt-1 h-3 w-3 flex-shrink-0 text-text-ultra" strokeWidth={2} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## ETAPA 1 — Topbar persistente no Layout

**Arquivo:** `src/components/Layout.tsx`

### O que mudar

Adicionar topbar **antes** do `<Suspense>`, dentro da `<div className="flex-1 ...">`:

```tsx
// Imports novos a adicionar:
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { SinoNotificacoes } from './ui/SinoNotificacoes';

// Topbar (adicionar antes do Suspense):
<div className="sticky top-0 z-30 flex h-11 items-center gap-2.5 border-b border-line bg-sidebar/90 px-5 backdrop-blur-sm lg:px-6">
  {/* Botão de busca — abre CommandPalette */}
  <button
    type="button"
    onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
    className="flex items-center gap-2 rounded-md border border-line bg-raised px-3 py-1.5 text-[12px] text-text-faint transition-colors hover:border-line-strong hover:text-text-dim"
  >
    <Search className="h-3.5 w-3.5" strokeWidth={2} />
    <span>Buscar…</span>
    <kbd className="ml-1 rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-[9px] text-text-ultra">⌘K</kbd>
  </button>

  <div className="flex-1" />

  {/* Novo Evento */}
  <Link
    to="/agenda"
    className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink transition-colors hover:bg-accent-strong"
  >
    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
    Novo Evento
  </Link>

  {/* Tema (mover da sidebar para cá) */}
  <button
    type="button"
    onClick={alternar}
    title={tema === 'escuro' ? 'Modo claro' : 'Modo escuro'}
    className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-raised text-text-faint transition-colors hover:border-line-strong hover:text-text"
  >
    {tema === 'escuro'
      ? <Sun className="h-[15px] w-[15px]" strokeWidth={1.75} />
      : <Moon className="h-[15px] w-[15px]" strokeWidth={1.75} />}
  </button>

  {/* Sino */}
  <SinoNotificacoes />
</div>
```

Depois de adicionar a topbar: **remover o botão de tema da sidebar** (o `<button>` com `onClick={alternar}` que fica no rodapé da sidebar).

Adicionar no `src/index.css` ao fim:
```css
@keyframes notif-entrada {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to   { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  [style*="notif-entrada"] { animation: none; }
}
```

---

## ETAPA 2 — Dashboard: Pendências + Atividades + Notificações automáticas

**Arquivo:** `src/pages/Dashboard.tsx`

### 2a — Painel de Pendências

Adicionar logo após o bloco de MetricCards, antes dos gráficos de receita:

```tsx
{/* Painel de Pendências — dados já calculados, só reorganizar */}
{!carregando && (
  <Panel className="mb-4">
    <PanelHeader
      titulo="Pendências"
      desc="Itens que precisam de ação hoje"
      acao={
        pontosDeAtencao === 0 ? (
          <span className="flex items-center gap-1.5 text-[12px] text-execucao">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
            Tudo em dia
          </span>
        ) : null
      }
    />
    {pontosDeAtencao > 0 && (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { n: contratosEmRisco,              label: 'Contratos D-20',      link: '/contratos', cor: contratosEmRisco > 0 ? 'danger' : null },
          { n: metricas.sinaisPendentes.length, label: 'Sinais pendentes',    link: '/contratos', cor: metricas.sinaisPendentes.length > 0 ? 'pending' : null },
          { n: itensCriticos,                 label: 'Estoque crítico',      link: '/estoque',   cor: itensCriticos > 0 ? 'danger' : null },
          { n: eventosComPendencia.length,    label: 'Eventos c/ pendência', link: '/agenda',    cor: eventosComPendencia.length > 0 ? 'pending' : null },
          { n: clientesInsatisfeitos.length,  label: 'NPS baixo',            link: '/auditoria', cor: clientesInsatisfeitos.length > 0 ? 'danger' : null },
        ].filter((i) => i.n > 0).map((item) => (
          <Link key={item.label} to={item.link}
            className={`flex items-center gap-2.5 rounded-md border px-3 py-2.5 transition-colors hover:border-line-strong ${
              item.cor === 'danger'  ? 'border-danger/25 bg-danger/8'   :
              item.cor === 'pending' ? 'border-pending/25 bg-pending/8' : 'border-line bg-raised'
            }`}
          >
            <span className={`font-mono text-[20px] font-black leading-none ${
              item.cor === 'danger' ? 'text-danger' : item.cor === 'pending' ? 'text-pending' : 'text-text'
            }`}>{item.n}</span>
            <span className="text-[11.5px] font-medium text-text-dim">{item.label}</span>
          </Link>
        ))}
      </div>
    )}
  </Panel>
)}
```

### 2b — Atividades Recentes

Adicionar um novo `Panel` após o painel de pendências:

```tsx
{/* Atividades Recentes — derivadas dos dados já carregados */}
{!carregando && (() => {
  type Atividade = { texto: string; sub: string; quando: Date; link: string; cor: string };
  const atividades: Atividade[] = [];

  // Últimos contratos criados/atualizados
  [...contratos]
    .sort((a, b) => new Date(b.atualizado_em ?? b.criado_em ?? 0).getTime() - new Date(a.atualizado_em ?? a.criado_em ?? 0).getTime())
    .slice(0, 3)
    .forEach((c) => atividades.push({
      texto: c.saldo_status === 'quitado' ? 'Contrato quitado' : 'Contrato atualizado',
      sub: `${c.lead?.nome ?? '—'} · ${formatarMoeda(c.valor_total)}`,
      quando: new Date(c.atualizado_em ?? c.criado_em ?? Date.now()),
      link: '/contratos',
      cor: 'text-money',
    }));

  // Últimos leads atualizados
  [...leads]
    .sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime())
    .slice(0, 2)
    .forEach((l) => atividades.push({
      texto: 'Lead atualizado',
      sub: `${l.nome}${l.valor_estimado ? ` · ${formatarMoeda(l.valor_estimado)}` : ''}`,
      quando: new Date(l.atualizado_em),
      link: '/crm',
      cor: 'text-people',
    }));

  const ordenadas = atividades
    .sort((a, b) => b.quando.getTime() - a.quando.getTime())
    .slice(0, 5);

  if (ordenadas.length === 0) return null;

  function tempoRelativo(d: Date) {
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60_000);
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <Panel className="mb-4">
      <PanelHeader titulo="Atividades recentes" desc="Últimas ações no sistema" />
      <div className="flex flex-col divide-y divide-line">
        {ordenadas.map((a, i) => (
          <Link key={i} to={a.link} className="flex items-center gap-3 py-2.5 transition-colors hover:text-text">
            <div className={`h-2 w-2 flex-shrink-0 rounded-full ${a.cor.replace('text-', 'bg-')}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-[12.5px] font-semibold ${a.cor}`}>{a.texto}</p>
              <p className="text-[11.5px] text-text-dim">{a.sub}</p>
            </div>
            <span className="flex-shrink-0 font-mono text-[10px] text-text-ultra">{tempoRelativo(a.quando)}</span>
          </Link>
        ))}
      </div>
    </Panel>
  );
})()}
```

### 2c — Notificações automáticas via useEffect

Adicionar após os `useMemo` e antes do `return`:

```tsx
const { adicionar: adicionarNotif } = useNotificacoes();

useEffect(() => {
  if (carregando) return;

  // Contratos D-20
  contratos
    .filter((c) => c.status === 'ativo' && c.saldo_status !== 'quitado' && diasAteEvento(c.data_evento) <= 20)
    .forEach((c) => {
      const dias = diasAteEvento(c.data_evento);
      adicionarNotif({ nivel: 'critico', titulo: `D-${dias}: saldo pendente — ${c.lead?.nome ?? 'Contrato'}`, descricao: formatarMoeda(c.valor_saldo) + ' a receber', link: '/contratos' });
    });

  // Estoque crítico
  itensEstoque
    .filter((i) => i.estoque_atual <= i.estoque_minimo)
    .forEach((item) => adicionarNotif({ nivel: 'critico', titulo: `Estoque crítico: ${item.nome}`, descricao: `${item.estoque_atual} un. (mín. ${item.estoque_minimo})`, link: '/estoque' }));

  // Leads esfriando > 7 dias
  leads
    .filter((l) => !['fechado', 'perdido'].includes(l.status) && Math.floor((Date.now() - new Date(l.atualizado_em).getTime()) / 86_400_000) >= 7)
    .slice(0, 5)
    .forEach((l) => {
      const dias = Math.floor((Date.now() - new Date(l.atualizado_em).getTime()) / 86_400_000);
      adicionarNotif({ nivel: 'info', titulo: `Lead esfriando: ${l.nome}`, descricao: `${dias} dias sem contato`, link: '/crm' });
    });

  // Eventos sem equipe
  eventosComPendencia
    .filter((ep) => ep.pendencias.includes('sem equipe escalada'))
    .forEach(({ ev }) => adicionarNotif({ nivel: 'aviso', titulo: `Sem equipe: ${ev.nome ?? 'Evento'}`, descricao: `Evento em ${ev.data_evento}`, link: '/escala' }));

  // NPS baixo
  clientesInsatisfeitos.forEach(({ auditoria, evento }) =>
    adicionarNotif({ nivel: 'critico', titulo: `NPS baixo: ${evento?.contrato?.lead?.nome ?? 'Cliente'}`, descricao: `Nota ${auditoria.nps_nota}/10`, link: '/auditoria' })
  );
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [carregando]);
```

---

## ETAPA 3 — Contratos: Barra de progresso + Avatar + Alerta contextual

**Arquivo:** `src/pages/Contratos.tsx`

### 3a — Import Avatar
```tsx
import { Avatar } from '../components/ui/Avatar';
```

### 3b — Alerta contextual D-20

Adicionar logo após `<Cabecalho>` e antes dos MetricCards:

```tsx
{!carregando && metricas.emRisco.length > 0 && (
  <AlertaBanner
    nivel="critico"
    titulo={`${metricas.emRisco.length} contrato${metricas.emRisco.length > 1 ? 's' : ''} com saldo pendente — evento em ≤ 20 dias`}
  >
    {metricas.emRisco.map((c) => `${c.lead?.nome ?? '?'} (D-${diasAteEvento(c.data_evento)})`).join(' · ')}
  </AlertaBanner>
)}
{!carregando && metricas.sinaisPendentes.length > 0 && (
  <AlertaBanner nivel="aviso" titulo={`${metricas.sinaisPendentes.length} sinal${metricas.sinaisPendentes.length > 1 ? 'is' : ''} de entrada pendente`} dispensavel>
    Confirme o recebimento do sinal (20%) para formalizar o contrato.
  </AlertaBanner>
)}
```

### 3c — Avatar no card de contrato

Dentro do card de cada contrato, adicionar `<Avatar>` antes do nome do cliente:

```tsx
// Encontrar onde `c.lead?.nome` aparece no card e adicionar antes:
<div className="flex items-center gap-2.5">
  <Avatar nome={c.lead?.nome ?? '?'} categoria="dinheiro" tamanho={34} />
  <div>
    <p className="font-semibold text-text">{c.lead?.nome ?? '—'}</p>
    <p className="text-[11.5px] text-text-faint">{c.local ?? '—'}</p>
  </div>
</div>
```

### 3d — Barra de progresso de liquidação

Adicionar dentro do card de cada contrato, após as informações de sinal/saldo:

```tsx
{/* Barra de 3 estágios: Sinal → Saldo → Liquidado */}
<div className="mt-3 flex items-center gap-0">
  {/* Estágio 1: Sinal */}
  <div className="flex flex-col items-center gap-1">
    <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${c.sinal_pago ? 'bg-money text-white' : 'bg-raised border border-line text-text-ultra'}`}>
      {c.sinal_pago ? '✓' : '1'}
    </div>
    <span className="text-[9.5px] text-text-ultra whitespace-nowrap">Sinal 20%</span>
  </div>
  {/* Linha */}
  <div className={`h-[2px] flex-1 mx-1 rounded-full ${c.sinal_pago ? 'bg-money' : 'bg-line'}`} />
  {/* Estágio 2: Saldo */}
  <div className="flex flex-col items-center gap-1">
    <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
      c.saldo_status === 'quitado' ? 'bg-money text-white' :
      c.saldo_status === 'parcial' ? 'bg-pending text-white' :
      diasAteEvento(c.data_evento) <= 20 ? 'bg-danger text-white' :
      'bg-raised border border-line text-text-ultra'
    }`}>
      {c.saldo_status === 'quitado' ? '✓' : '2'}
    </div>
    <span className="text-[9.5px] text-text-ultra whitespace-nowrap">Saldo 80%</span>
  </div>
  {/* Linha */}
  <div className={`h-[2px] flex-1 mx-1 rounded-full ${c.saldo_status === 'quitado' ? 'bg-money' : 'bg-line'}`} />
  {/* Estágio 3: Liquidado */}
  <div className="flex flex-col items-center gap-1">
    <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${c.saldo_status === 'quitado' ? 'bg-execucao text-white' : 'bg-raised border border-line text-text-ultra'}`}>
      {c.saldo_status === 'quitado' ? '✓' : '3'}
    </div>
    <span className="text-[9.5px] text-text-ultra whitespace-nowrap">Liquidado</span>
  </div>
</div>
```

---

## ETAPA 4 — CRM: Leads esfriando + Card Kanban rico + Avatar na tabela

**Arquivo:** `src/pages/Crm.tsx`

### 4a — Alerta contextual de leads esfriando

Após `<Cabecalho>`:

```tsx
{(() => {
  const esfriando = todosLeads.filter((l) =>
    !['fechado', 'perdido'].includes(l.status) &&
    Math.floor((Date.now() - new Date(l.atualizado_em).getTime()) / 86_400_000) >= 7
  );
  if (esfriando.length === 0 || carregando) return null;
  return (
    <AlertaBanner nivel="aviso" titulo={`${esfriando.length} lead${esfriando.length > 1 ? 's' : ''} sem contato há mais de 7 dias`} dispensavel>
      {esfriando.slice(0, 3).map((l) => l.nome).join(', ')}{esfriando.length > 3 ? ` e mais ${esfriando.length - 3}` : ''}.
    </AlertaBanner>
  );
})()}
```

### 4b — Avatar na TabelaLeads

**Arquivo:** `src/components/crm/TabelaLeads.tsx`

Adicionar import e usar no início de cada linha da tabela:

```tsx
import { Avatar } from '../ui/Avatar';

// Na célula de nome (substituir texto puro):
<div className="flex items-center gap-2">
  <Avatar nome={lead.nome} categoria="pessoas" tamanho={26} />
  <span className="truncate text-[13px] font-semibold text-text">{lead.nome}</span>
</div>
```

### 4c — Card Kanban mais rico

**Arquivo:** `src/components/crm/PipelineLeads.tsx`

Dentro do card de cada lead no Kanban, enriquecer para mostrar origem e último contato.

Encontrar onde o card renderiza `lead.nome` e expandir:

```tsx
// Antes: só nome + telefone + valor
// Depois: avatar + nome + valor + origem + último contato

<div className="flex items-start gap-2 mb-1">
  <Avatar nome={lead.nome} categoria="pessoas" tamanho={24} />
  <strong className="block truncate text-[13px] font-semibold text-text flex-1" title={lead.nome}>
    {lead.nome}
  </strong>
</div>
{lead.valor_estimado != null && (
  <span className="font-mono text-[11.5px] text-pending">{formatarMoeda(lead.valor_estimado)}</span>
)}
{lead.origem && (
  <span className="block text-[11px] text-text-ultra mt-0.5">{lead.origem}</span>
)}
{/* Último contato com cor semântica */}
{(() => {
  const dias = Math.floor((Date.now() - new Date(lead.atualizado_em).getTime()) / 86_400_000);
  const cor = dias <= 3 ? 'text-execucao' : dias <= 7 ? 'text-pending' : 'text-danger';
  return (
    <span className={`block font-mono text-[10px] mt-1 ${cor}`}>
      {dias === 0 ? 'hoje' : dias === 1 ? '1 dia' : `${dias} dias`} sem contato
    </span>
  );
})()}
```

---

## ETAPA 5 — Agenda: Tooltip no hover das células

**Arquivo:** `src/pages/Agenda.tsx`

Encontrar onde as células do calendário renderizam o ponto colorido e envolver com um grupo de hover:

```tsx
// Envolver a célula do calendário com relative + group:
<div className="relative group">
  {/* conteúdo existente da célula */}
  
  {/* Tooltip ao hover — só aparece se houver evento */}
  {eventosDoCelula.length > 0 && (
    <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 hidden w-[200px] -translate-x-1/2 rounded-lg border border-line bg-panel p-2.5 shadow-lg group-hover:block">
      {eventosDoCelula.slice(0, 3).map((ev) => (
        <div key={ev.id} className="mb-1.5 last:mb-0">
          <p className="text-[12px] font-semibold text-text truncate">{ev.nome ?? ev.tipo}</p>
          <p className="text-[11px] text-text-faint">{ev.hora_inicio ?? ''} · {ev.local ?? '—'}</p>
        </div>
      ))}
    </div>
  )}
</div>
```

Audite o código da célula atual antes de editar — a estrutura exata depende de como `CalendarioMensal` está implementado.

---

## ETAPA 6 — Escala: Barras de cobertura + Alerta contextual + Avatar

**Arquivo:** `src/pages/Escala.tsx`

### 6a — Alerta contextual de equipe incompleta

Após `<Cabecalho>`:

```tsx
{(() => {
  if (carregando) return null;
  const semEquipe = eventosFiltrados.filter((ev) => {
    const ativos = (escalasPorEvento.get(ev.id) ?? []).filter((e) => e.status_escala !== 'recusado');
    return ativos.length === 0;
  });
  if (semEquipe.length === 0) return null;
  return (
    <AlertaBanner nivel="aviso" titulo={`${semEquipe.length} evento${semEquipe.length > 1 ? 's' : ''} sem equipe escalada`} dispensavel>
      {semEquipe.map((ev) => ev.nome ?? ev.data_evento).join(', ')}
    </AlertaBanner>
  );
})()}
```

### 6b — Barras de cobertura por função no card de evento

Dentro do card de cada evento (onde hoje aparece texto "5/6 confirmados"), substituir por barras visuais usando `ProgressBar`:

```tsx
import { ProgressBar } from '../components/ui/ProgressBar';

// Dentro do card, após calcular bartenderAtual, barbackAtual, faltaBartender, faltaBarback:
<div className="mt-3 flex flex-col gap-2">
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-text-faint">Bartenders</span>
      <span className={`font-mono font-semibold ${faltaBartender > 0 ? 'text-danger' : 'text-execucao'}`}>
        {bartenderAtual}/{necessario.bartender}
      </span>
    </div>
    <ProgressBar valor={necessario.bartender > 0 ? (bartenderAtual / necessario.bartender) * 100 : 100} categoria={faltaBartender > 0 ? 'acao' : 'execucao'} />
  </div>
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-text-faint">Barbacks</span>
      <span className={`font-mono font-semibold ${faltaBarback > 0 ? 'text-danger' : 'text-execucao'}`}>
        {barbackAtual}/{necessario.barback}
      </span>
    </div>
    <ProgressBar valor={necessario.barback > 0 ? (barbackAtual / necessario.barback) * 100 : 100} categoria={faltaBarback > 0 ? 'acao' : 'execucao'} />
  </div>
</div>
```

### 6c — Avatar na lista de membros da equipe

Na lista de membros (onde renderiza `m.nome`):

```tsx
import { Avatar } from '../components/ui/Avatar';

// Substituir o bloco de nome do membro:
<div className="flex items-center gap-2.5">
  <Avatar nome={m.nome} categoria="pessoas" tamanho={28} />
  <div>
    <strong className="text-text">{m.nome}</strong>
    <span className="ml-2 text-[11.5px] text-text-faint">{FUNCAO_EQUIPE_ROTULO[m.funcao] ?? m.funcao}</span>
    {m.telefone && <span className="ml-2 text-[11.5px] text-text-dim">{m.telefone}</span>}
  </div>
</div>
```

---

## ETAPA 7 — Estoque: Painel de situação + Alerta + Barra de nível

**Arquivo:** `src/pages/Estoque.tsx`

### 7a — Alerta contextual

Após `<Cabecalho>`:

```tsx
{!carregando && itensCriticos.length > 0 && (
  <AlertaBanner nivel="critico" titulo={`${itensCriticos.length} item${itensCriticos.length > 1 ? 'ns' : ''} abaixo do estoque mínimo`} dispensavel>
    {itensCriticos.slice(0, 3).map((i) => i.nome).join(', ')}{itensCriticos.length > 3 ? ` e mais ${itensCriticos.length - 3}` : ''}.
  </AlertaBanner>
)}
```

### 7b — Barra de nível inline por item

Dentro da linha/card de cada item, após mostrar `estoque_atual`:

```tsx
import { ProgressBar } from '../components/ui/ProgressBar';

// Após o número de estoque de cada item:
<div className="mt-1.5">
  <ProgressBar
    valor={item.estoque_minimo > 0 ? Math.min(100, (item.estoque_atual / item.estoque_minimo) * 100) : 100}
    categoria={item.estoque_atual <= 0 ? 'acao' : item.estoque_atual <= item.estoque_minimo ? 'acao' : 'execucao'}
  />
</div>
```

---

## ETAPA 8 — Roteiro do Evento: Cue atual + Barra de progresso

**Arquivo:** `src/pages/CueSheet.tsx`

### 8a — Barra de progresso geral

Já calculado `concluidos` e `cues.length`. Adicionar após MetricCards:

```tsx
{cues.length > 0 && (
  <div className="mb-4 flex items-center gap-3">
    <span className="text-[12px] font-medium text-text-dim">Progresso do evento</span>
    <div className="flex-1">
      <ProgressBar valor={cues.length > 0 ? (concluidos / cues.length) * 100 : 0} categoria="agenda" />
    </div>
    <span className="font-mono text-[12px] text-text-faint">{concluidos}/{cues.length}</span>
  </div>
)}
```

### 8b — Cue atual destacado por horário

Calcular o cue atual e adicionar classe diferenciada. Adicionar no início do componente:

```tsx
const cueAtualId = useMemo(() => {
  if (!eventoAtual || cues.length === 0) return null;
  const agora = new Date();
  const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  // Cue mais próximo do horário atual que ainda não foi ultrapassado
  const passados = cues.filter((c) => c.horario <= horaAtual && !c.concluido);
  return passados.length > 0 ? passados[passados.length - 1].id : null;
}, [cues, eventoAtual]);
```

No render de cada cue, adicionar classe quando é o atual:

```tsx
// Na div do card de cada cue, adicionar condicionalmente:
className={`... ${c.id === cueAtualId ? 'border-accent/40 bg-accent/8 ring-1 ring-accent/20' : ''}`}

// Adicionar DotLive ao lado do horário quando é o atual:
{c.id === cueAtualId && <DotLive categoria="agenda" />}
```

---

## ETAPA 9 — Financeiro: Totais + Vencidos + Alerta

**Arquivo:** `src/pages/Financeiro.tsx`

### 9a — Alerta de lançamentos vencidos

Após `<Cabecalho>`:

```tsx
{(() => {
  if (carregando) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  const vencidos = lancamentos.filter((l) => l.status === 'pendente' && l.vencimento && l.vencimento < hoje);
  if (vencidos.length === 0) return null;
  return (
    <AlertaBanner nivel="critico" titulo={`${vencidos.length} lançamento${vencidos.length > 1 ? 's' : ''} com vencimento em atraso`} dispensavel>
      Regularize para manter o fluxo de caixa.
    </AlertaBanner>
  );
})()}
```

### 9b — Borda vermelha em lançamentos vencidos

Na div de cada lançamento, adicionar condicionalmente:

```tsx
const hoje = new Date().toISOString().slice(0, 10);
const vencido = l.status === 'pendente' && l.vencimento && l.vencimento < hoje;

// Adicionar à className do card do lançamento:
${vencido ? 'border-danger/25 bg-danger/5' : ''}
```

### 9c — Linha de totais no rodapé

Após o `.map()` dos lançamentos visíveis, antes do fechamento da `<div>`:

```tsx
{visiveis.length > 0 && (
  <div className="flex items-center justify-between border-t border-line pt-3 text-[12px]">
    <span className="font-mono text-[11px] uppercase tracking-wide text-text-ultra">
      Total · {visiveis.length} lançamento{visiveis.length !== 1 ? 's' : ''}
    </span>
    <div className="flex gap-4">
      <span className="font-mono font-semibold text-money">
        + {formatarMoeda(visiveis.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0))}
      </span>
      <span className="font-mono font-semibold text-danger">
        − {formatarMoeda(visiveis.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0))}
      </span>
    </div>
  </div>
)}
```

---

## ETAPA 10 — Auditoria: Alerta de NPS baixo + Barra de NPS

**Arquivo:** `src/pages/Auditoria.tsx`

### 10a — Alerta contextual

Após `<Cabecalho>`:

```tsx
{(() => {
  if (carregando) return null;
  const limite = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const ruins = auditorias.filter((a) => (a.nps_nota ?? 10) <= 4 && a.criado_em >= limite);
  if (ruins.length === 0) return null;
  return (
    <AlertaBanner nivel="aviso" titulo={`${ruins.length} avaliação${ruins.length > 1 ? 'ões' : ''} negativa${ruins.length > 1 ? 's' : ''} nos últimos 30 dias — NPS ≤ 4`} dispensavel>
      Clientes insatisfeitos merecem retorno prioritário.
    </AlertaBanner>
  );
})()}
```

### 10b — Barra de NPS inline

Em cada card de auditoria, após mostrar o número da nota:

```tsx
{a.nps_nota != null && (
  <div className="mt-2">
    <ProgressBar
      valor={(a.nps_nota / 10) * 100}
      categoria={a.nps_nota >= 9 ? 'execucao' : a.nps_nota >= 7 ? 'agenda' : a.nps_nota >= 5 ? 'acao' : 'acao'}
    />
  </div>
)}
```

---

## ETAPA 11 — Configurações: Meta mensal

**Arquivo:** `src/pages/Configuracoes.tsx`

Adicionar seção de configurações operacionais após o painel de Perfil:

```tsx
// Estado
const [metaMensal, setMetaMensal] = useState<number>(() => {
  try { return Number(localStorage.getItem('emcena_meta_mensal') ?? 0); } catch { return 0; }
});
const [salvandoMeta, setSalvandoMeta] = useState(false);

async function aoSalvarMeta() {
  setSalvandoMeta(true);
  try {
    localStorage.setItem('emcena_meta_mensal', String(metaMensal));
    toast.sucesso('Meta mensal salva.');
  } finally {
    setSalvandoMeta(false);
  }
}

// JSX — novo Panel após o de Segurança:
<Panel>
  <PanelHeader titulo="Operacional" desc="Parâmetros usados nos alertas e indicadores do sistema." />
  <div className="flex flex-col gap-4">
    <div>
      <label className="mb-1.5 block text-[12.5px] font-semibold text-text-dim">
        Meta de faturamento mensal (R$)
      </label>
      <p className="mb-2 text-[11.5px] text-text-faint">
        Aparece no Fechamento Mensal como referência de atingimento.
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          value={metaMensal || ''}
          onChange={(e) => setMetaMensal(Number(e.target.value))}
          placeholder="Ex: 50000"
          className="campo flex-1 py-2 text-sm"
          min={0}
          step={1000}
        />
        <Button variant="primary" onClick={aoSalvarMeta} carregando={salvandoMeta}>
          Salvar
        </Button>
      </div>
    </div>
  </div>
</Panel>
```

**Arquivo:** `src/pages/Fechamento.tsx`

Ler a meta e exibir progresso:

```tsx
const metaMensal = (() => {
  try { return Number(localStorage.getItem('emcena_meta_mensal') ?? 0); } catch { return 0; }
})();

// Adicionar MetricCard de meta após os existentes:
{metaMensal > 0 && (
  <MetricCard
    Icone={TrendingUp}
    rotulo="Meta do mês"
    valor={`${Math.round(((mesAtual?.valor ?? 0) / metaMensal) * 100)}%`}
    legenda={`${formatarMoeda(mesAtual?.valor ?? 0)} de ${formatarMoeda(metaMensal)}`}
    categoria="dinheiro"
  />
)}
```

---

## ETAPA 12 — Ajustes finais de CSS

Adicionar ao fim de `src/index.css`:

```css
/* Topbar persistente — transição suave ao rolar */
.topbar-persistente {
  transition: background-color 0.2s ease;
}

/* Notificações — animação de entrada */
@keyframes notif-entrada {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to   { opacity: 1; transform: none; }
}

/* Badge do sino — pop ao aparecer */
@keyframes badge-pop {
  0%   { transform: scale(0); }
  70%  { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  [style*="notif-entrada"] { animation: none; }
}

/* Tooltip do calendário — fade */
.grupo-celula:hover .tooltip-celula {
  display: block;
}
```

---

## CHECKLIST FINAL

Após todas as etapas:

- [ ] `npm run build` — zero erros TypeScript
- [ ] Topbar aparece em todas as telas
- [ ] Botão de busca abre o CommandPalette
- [ ] "Novo Evento" navega para `/agenda`
- [ ] Tema ainda funciona (agora na topbar)
- [ ] Sino exibe badge e dropdown corretos
- [ ] Dashboard: painel de pendências e atividades recentes visíveis
- [ ] Notificações geradas ao carregar o Dashboard
- [ ] Contratos: alerta D-20 + barra de progresso + avatar
- [ ] CRM: alerta de leads esfriando + avatar na tabela + card kanban rico
- [ ] Escala: barras de cobertura + alerta + avatar
- [ ] Estoque: alerta + barra de nível
- [ ] Roteiro: progresso geral + cue atual destacado
- [ ] Financeiro: alerta de vencidos + borda + linha de totais
- [ ] Auditoria: alerta NPS + barra inline
- [ ] Configurações: meta mensal salva em localStorage
- [ ] Fechamento: MetricCard de meta (se configurada)

```bash
git add -A
git commit -m "feat: master redesign — topbar, notificações, alertas contextuais, avatar, barras de progresso, cue atual, totais financeiro"
vercel --prod
```
