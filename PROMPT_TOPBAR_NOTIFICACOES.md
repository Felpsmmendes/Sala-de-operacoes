# TOPBAR + NOTIFICAÇÕES — Sala de Operações
## Prompt para Claude Code — sessão única de implementação

---

## Contexto e regras antes de tocar no código

Leia este documento completo antes de alterar qualquer arquivo.
Audite o código real de cada componente antes de editar.
Preserve toda lógica de negócio, Supabase, autenticação e rotas.
Execute `npm run build` após cada etapa — zero erros TypeScript.

Stack: React 19 + TypeScript + Tailwind v4 + Vite + Supabase + Lucide React.
Design system: `src/styles/design-tokens.css` + `src/index.css`.
Não criar CSS fora desses dois arquivos. Não adicionar dependências npm.

---

## O QUE SERÁ IMPLEMENTADO

1. Topbar persistente com busca, botão "Novo Evento", tema e sino
2. Sistema de notificações com badge e painel dropdown
3. Alertas contextuais por página (banners inteligentes no topo de cada tela)

---

## ETAPA 1 — Topbar persistente no Layout

**Arquivo a editar:** `src/components/Layout.tsx`

### O que existe hoje
O `Cabecalho` é montado por cada página individualmente — título, subtítulo e relógio.
O botão de tema mora na sidebar.
O CommandPalette (⌘K) já existe mas não tem botão visível no topo.

### O que fazer
Adicionar uma topbar persistente **acima** do `<Outlet>`, dentro do `<div className="flex-1 ...">`, antes do Suspense.

```tsx
// Estrutura da nova topbar (adicionar antes do Suspense)
<div className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-line bg-sidebar/90 px-5 backdrop-blur-sm lg:px-6">
  {/* Botão de busca — abre o CommandPalette */}
  <BotaoBusca />

  {/* Spacer */}
  <div className="flex-1" />

  {/* Botão Novo Evento */}
  <BotaoNovoEvento />

  {/* Botão tema (mover pra cá, tirar da sidebar) */}
  <BotaoTema />

  {/* Sino de notificações (novo) */}
  <SinoNotificacoes />
</div>
```

### BotaoBusca
Botão que abre o CommandPalette ao clicar (além do ⌘K que já funciona).
```tsx
// Aparência: borda sutil, texto "Buscar... ⌘K", largura fixa ~200px
<button
  onClick={() => /* disparar abertura do CommandPalette */}
  className="flex items-center gap-2 rounded-md border border-line bg-raised px-3 py-1.5 text-[12px] text-text-faint transition-colors hover:border-line-strong hover:text-text-dim"
>
  <Search className="h-3.5 w-3.5" strokeWidth={2} />
  <span>Buscar…</span>
  <kbd className="ml-2 rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-[9px] text-text-ultra">⌘K</kbd>
</button>
```

O CommandPalette já abre com `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))` — use isso no onClick.

### BotaoNovoEvento
Link para `/agenda` com aparência de botão primário âmbar.
```tsx
<Link
  to="/agenda"
  className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink transition-colors hover:bg-accent-strong"
>
  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
  Novo Evento
</Link>
```

### BotaoTema
Mover o botão existente de tema da sidebar para cá.
Estilo: `iBtn` (32×32px, borda sutil, ícone Sun/Moon, sem texto).
```tsx
<button
  onClick={alternar}
  title={tema === 'escuro' ? 'Modo claro' : 'Modo escuro'}
  className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-raised text-text-faint transition-colors hover:border-line-strong hover:text-text"
>
  {tema === 'escuro' ? <Sun className="h-[15px] w-[15px]" strokeWidth={1.75} /> : <Moon className="h-[15px] w-[15px]" strokeWidth={1.75} />}
</button>
```

Remover o botão de tema da sidebar depois de adicioná-lo aqui.

---

## ETAPA 2 — Sistema de Notificações

### 2a — Contexto de notificações
**Arquivo novo:** `src/lib/NotificacoesContext.tsx`

```tsx
// Estrutura de uma notificação
export type Notificacao = {
  id: string;
  tipo: 'critico' | 'aviso' | 'info';
  titulo: string;
  descricao?: string;
  link?: string;        // rota para navegar ao clicar
  lida: boolean;
  criadaEm: Date;
};

// O contexto expõe:
// - notificacoes: Notificacao[]
// - naoLidas: number
// - marcarLida(id): void
// - marcarTodasLidas(): void
// - adicionarNotificacao(n: Omit<Notificacao, 'id' | 'lida' | 'criadaEm'>): void

export function NotificacoesProvider({ children }: { children: ReactNode }) {
  // Estado em memória (não persiste — ao recarregar o app, as notificações
  // são recalculadas pelos alertas das páginas via useEffect)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  // implementar marcarLida, marcarTodasLidas, adicionarNotificacao
  // naoLidas = notificacoes.filter(n => !n.lida).length
}

export const useNotificacoes = () => useContext(NotificacoesCtx);
```

Adicionar `<NotificacoesProvider>` em `src/App.tsx` envolvendo as rotas, dentro do `<ToastProvider>`.

### 2b — Sino de notificações (SinoNotificacoes)
**Arquivo novo:** `src/components/ui/SinoNotificacoes.tsx`

```
Visual:
┌──────────────────────────────┐
│  [🔔]  ← botão 32×32px       │
│   [3] ← badge vermelho       │  ← badge só aparece se naoLidas > 0
└──────────────────────────────┘

Ao clicar → dropdown de até 320px de largura:

┌─────────────────────────────────────┐
│ Notificações              Marcar tudo lido │
│ ─────────────────────────────────── │
│ 🔴 [crítico] D-8: Formatura Medicina  │
│    Saldo R$25.600 pendente           │
│    há 2 min                         │
│ ─────────────────────────────────── │
│ 🟡 [aviso] Equipe incompleta         │
│    Casamento Silva — faltam 2 membros │
│    há 5 min                         │
│ ─────────────────────────────────── │
│ 🔵 [info] Lead esfriando             │
│    Rafael Fontes — 14 dias sem contato │
│    há 8 min                         │
└─────────────────────────────────────┘
```

Implementação:
- Posição: `absolute right-0 top-10 z-50` dentro de um `relative`
- Fechar ao clicar fora: `useEffect` com `document.addEventListener('mousedown', ...)`
- Notificações lidas ficam com `opacity-60`
- Clicar numa notificação → navega para `n.link` + marca como lida
- Badge: `absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white`
- Máximo 15 notificações no dropdown (as mais recentes)
- Se `notificacoes.length === 0`: mostrar estado vazio "Tudo em dia ✓"

---

## ETAPA 3 — Geração de notificações automáticas

O Dashboard já calcula todos os alertas. Vamos reutilizar esses cálculos para alimentar o sino.

### 3a — Hook de alertas globais
**Arquivo novo:** `src/lib/useAlertasGlobais.ts`

Este hook é chamado UMA VEZ no Dashboard e UMA VEZ em cada página que tem alertas.
Ele usa `adicionarNotificacao` do contexto para inserir notificações quando detecta problemas.

```ts
// Lógica de cada alerta — só adiciona se ainda não existe (checar pelo título)

// 1. CONTRATOS EM RISCO D-20
// Fonte: contratos onde saldo_status !== 'quitado' && diasAteEvento(data_evento) <= 20
// Notificação: tipo 'critico', titulo: `D-${dias}: ${lead.nome}`, link: '/contratos'

// 2. SINAIS PENDENTES
// Fonte: contratos ativos onde sinal_pago === false
// Notificação: tipo 'aviso', titulo: `Sinal pendente — ${lead.nome}`, link: '/contratos'

// 3. ESTOQUE CRÍTICO
// Fonte: itens onde estoque_atual <= estoque_minimo
// Notificação: tipo 'critico', titulo: `Estoque baixo: ${item.nome}`, link: '/estoque'

// 4. LEADS ESFRIANDO (> 7 dias sem contato)
// Fonte: leads onde atualizado_em é mais de 7 dias atrás E status não é 'fechado'/'perdido'
// Notificação: tipo 'info', titulo: `Lead esfriando: ${lead.nome}`, link: '/crm'

// 5. EVENTOS SEM EQUIPE
// Fonte: eventos nos próximos 7 dias sem nenhuma escala ativa
// Notificação: tipo 'aviso', titulo: `Sem equipe: ${ev.nome}`, link: '/escala'

// 6. CLIENTES INSATISFEITOS (NPS 0–4 nos últimos 30 dias)
// Fonte: já calculado em Dashboard como clientesInsatisfeitos
// Notificação: tipo 'critico', titulo: `NPS baixo: ${lead.nome}`, link: '/auditoria'
```

### 3b — Integrar no Dashboard
Em `Dashboard.tsx`, após calcular todos os `useMemo`, adicionar um `useEffect` que chama `adicionarNotificacao` para cada alerta encontrado.

```tsx
const { adicionarNotificacao, notificacoes } = useNotificacoes();

useEffect(() => {
  if (carregando) return;

  // Contratos em risco
  contratosEmRiscoDados.forEach((c) => {
    const dias = diasAteEvento(c.data_evento);
    const titulo = `D-${dias}: saldo pendente — ${c.lead?.nome ?? 'Contrato'}`;
    if (!notificacoes.some((n) => n.titulo === titulo)) {
      adicionarNotificacao({ tipo: 'critico', titulo, descricao: `R$${c.valor_saldo.toLocaleString('pt-BR')} pendente`, link: '/contratos' });
    }
  });

  // Estoque crítico
  itensEstoque.filter((i) => i.estoque_atual <= i.estoque_minimo).forEach((item) => {
    const titulo = `Estoque crítico: ${item.nome}`;
    if (!notificacoes.some((n) => n.titulo === titulo)) {
      adicionarNotificacao({ tipo: 'critico', titulo, descricao: `${item.estoque_atual} un. (mín. ${item.estoque_minimo})`, link: '/estoque' });
    }
  });

  // Leads esfriando
  leads.forEach((lead) => {
    if (['fechado', 'perdido'].includes(lead.status)) return;
    const dias = Math.floor((Date.now() - new Date(lead.atualizado_em).getTime()) / 86_400_000);
    if (dias >= 7) {
      const titulo = `Lead esfriando: ${lead.nome}`;
      if (!notificacoes.some((n) => n.titulo === titulo)) {
        adicionarNotificacao({ tipo: 'info', titulo, descricao: `${dias} dias sem contato`, link: '/crm' });
      }
    }
  });

  // Eventos sem equipe (próximos 7 dias)
  eventosComPendencia.filter((ep) => ep.pendencias.includes('sem equipe escalada')).forEach(({ ev }) => {
    const titulo = `Sem equipe: ${ev.nome ?? 'Evento'}`;
    if (!notificacoes.some((n) => n.titulo === titulo)) {
      adicionarNotificacao({ tipo: 'aviso', titulo, descricao: `Evento em ${ev.data_evento}`, link: '/escala' });
    }
  });

}, [carregando, itensEstoque, leads, eventosComPendencia]);
// Nota: não incluir notificacoes nem adicionarNotificacao no array de deps
// (causaria loop) — usar ref para checar duplicatas se necessário
```

---

## ETAPA 4 — Alertas contextuais por página

Cada página deve mostrar um banner de alerta no topo quando há algo crítico **relacionado àquela tela**.
Usar o componente `<AlertaBanner>` já existente em `src/components/ui/AlertaBanner.tsx`.

### Regra geral
O banner aparece logo abaixo do `<Cabecalho>` e antes do conteúdo principal.
Ele some automaticamente quando não há problemas (renderização condicional).

### Por página

**Contratos (`src/pages/Contratos.tsx`)**
```tsx
// Já tem AlertaBanner de erro. Adicionar ANTES do painel principal:
{contratosEmRisco > 0 && !carregando && (
  <AlertaBanner nivel="critico" titulo={`${contratosEmRisco} contrato${contratosEmRisco > 1 ? 's' : ''} com saldo pendente — evento em ≤ 20 dias`}>
    Acione os clientes para garantir o recebimento antes do evento.
  </AlertaBanner>
)}
{sinaisPendentes.length > 0 && !carregando && (
  <AlertaBanner nivel="aviso" titulo={`${sinaisPendentes.length} sinal${sinaisPendentes.length > 1 ? 'is' : ''} de entrada pendente${sinaisPendentes.length > 1 ? 's' : ''}`}>
    Confirme o recebimento do sinal (20%) para garantir o contrato.
  </AlertaBanner>
)}
```
`contratosEmRisco` = `contratos.filter(c => c.status === 'ativo' && c.saldo_status !== 'quitado' && diasAteEvento(c.data_evento) <= 20).length`
`sinaisPendentes` já existe como `metricas.sinaisPendentes`

**CRM (`src/pages/Crm.tsx`)**
```tsx
// Após carregar leads, calcular leads esfriando:
const leadsEsfriando = useMemo(() => {
  const limite = 7 * 86_400_000;
  return todosLeads.filter(l =>
    !['fechado', 'perdido'].includes(l.status) &&
    (Date.now() - new Date(l.atualizado_em).getTime()) > limite
  );
}, [todosLeads]);

// Banner:
{leadsEsfriando.length > 0 && !carregando && (
  <AlertaBanner nivel="aviso" titulo={`${leadsEsfriando.length} lead${leadsEsfriando.length > 1 ? 's' : ''} sem contato há mais de 7 dias`} dispensavel>
    {leadsEsfriando.slice(0, 3).map(l => l.nome).join(', ')}{leadsEsfriando.length > 3 ? ` e mais ${leadsEsfriando.length - 3}` : ''}.
  </AlertaBanner>
)}
```

**Escala (`src/pages/Escala.tsx`)**
```tsx
// Calcular eventos próximos sem equipe (já tem lógica parecida)
const eventosSemEquipe = useMemo(() => {
  return eventosFiltrados.filter(ev => {
    const ativos = (escalasPorEvento.get(ev.id) ?? []).filter(e => e.status !== 'recusado');
    return ativos.length === 0;
  });
}, [eventosFiltrados, escalasPorEvento]);

// Banner:
{eventosSemEquipe.length > 0 && !carregando && (
  <AlertaBanner nivel="aviso" titulo={`${eventosSemEquipe.length} evento${eventosSemEquipe.length > 1 ? 's' : ''} sem equipe escalada`} dispensavel>
    Convoque membros antes do evento.
  </AlertaBanner>
)}
```

**Estoque (`src/pages/Estoque.tsx`)**
```tsx
// Já tem itensCriticos calculado. Adicionar banner:
{itensCriticos > 0 && !carregando && (
  <AlertaBanner nivel="critico" titulo={`${itensCriticos} item${itensCriticos > 1 ? 'ns' : ''} abaixo do estoque mínimo`} dispensavel>
    Verifique o estoque antes dos próximos eventos.
  </AlertaBanner>
)}
```

**Financeiro (`src/pages/Financeiro.tsx`)**
```tsx
// Após carregar lançamentos, calcular vencidos:
const vencidos = useMemo(() => {
  const hoje = new Date().toISOString().slice(0, 10);
  return lancamentos.filter(l => l.status === 'pendente' && l.vencimento && l.vencimento < hoje);
}, [lancamentos]);

// Banner:
{vencidos.length > 0 && !carregando && (
  <AlertaBanner nivel="critico" titulo={`${vencidos.length} lançamento${vencidos.length > 1 ? 's' : ''} com vencimento em atraso`} dispensavel>
    Regularize os pagamentos vencidos para manter o fluxo de caixa.
  </AlertaBanner>
)}
```

**Agenda (`src/pages/Agenda.tsx`)**
Sem alerta adicional — já tem o erro genérico. Manter como está.

**Auditoria (`src/pages/Auditoria.tsx`)**
```tsx
// Após carregar auditorias, calcular NPS baixo recente:
const npsRuim = useMemo(() => {
  const limite30dias = new Date(Date.now() - 30 * 86_400_000).toISOString();
  return auditorias.filter(a => a.nps_nota <= 4 && a.criado_em >= limite30dias);
}, [auditorias]);

// Banner:
{npsRuim.length > 0 && !carregando && (
  <AlertaBanner nivel="aviso" titulo={`${npsRuim.length} avaliação${npsRuim.length > 1 ? 'ões' : ''} negativa${npsRuim.length > 1 ? 's' : ''} nos últimos 30 dias`} dispensavel>
    Clientes com nota NPS 0–4 merecem retorno prioritário.
  </AlertaBanner>
)}
```

---

## ETAPA 5 — CSS da topbar e do dropdown

Adicionar ao fim de `src/index.css`:

```css
/* Topbar persistente */
.topbar-persistente {
  view-transition-name: topbar;
}

/* Sino — dropdown de notificações */
.notif-dropdown {
  animation: notif-entrada 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes notif-entrada {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to   { opacity: 1; transform: none; }
}

/* Badge do sino */
.notif-badge {
  animation: notif-pop 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes notif-pop {
  0%   { transform: scale(0); }
  70%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .notif-dropdown { animation: none; }
  .notif-badge    { animation: none; }
}
```

---

## Regras de não-fazer

- Não criar tabela no Supabase — tudo em memória (useState no contexto)
- Não alterar autenticação, rotas ou schema do banco
- Não tocar nas páginas públicas (`PontoPublico`, `PortalClientePublico`, `DrinksPublico`)
- Não usar libs externas além das já instaladas
- Não remover o CommandPalette ⌘K — o botão de busca é um atalho visual para ele

---

## Checklist de entrega

- [ ] `npm run build` sem erros
- [ ] Topbar aparece em todas as telas (é parte do Layout persistente)
- [ ] Botão de busca abre o CommandPalette
- [ ] Botão "Novo Evento" navega para `/agenda`
- [ ] Botão de tema funciona igual ao anterior (sem regressão)
- [ ] Sino mostra badge numérico quando há notificações não lidas
- [ ] Dropdown abre/fecha corretamente, fecha ao clicar fora
- [ ] Notificações são geradas ao carregar o Dashboard
- [ ] Banners contextuais aparecem nas 6 telas configuradas
- [ ] `git add -A && git commit -m "feat: topbar persistente, notificações e alertas contextuais por página"`
- [ ] `vercel --prod`
