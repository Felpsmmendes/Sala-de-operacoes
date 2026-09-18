# SPEC P2/P3 — Sala de Operações
## Segunda sessão do Claude Code — melhorias após o P1

---

## REGRAS GLOBAIS

1. O P1 já foi aplicado — esses componentes existem: `Avatar`, `NotificacoesContext`, `SinoNotificacoes`, `AlertaBanner`, `Paginacao`, `OrdenacaoColuna`, `GraficoBarrasHorizontal`.
2. Audite o código real antes de editar qualquer arquivo.
3. `npm run build` deve passar sem erros após cada etapa numerada.
4. Não criar tabelas no Supabase — tudo em memória ou localStorage.
5. Não alterar autenticação, rotas, schema, páginas públicas.
6. Não adicionar dependências npm.
7. Commit ao fim de cada etapa: `git add -A && git commit -m "feat: [etapa]"`.
8. Deploy final: `vercel --prod`.

---

## ETAPA 1 — Toast com "Desfazer"

### 1a — Ampliar o tipo `ToastItem`
**Arquivo:** `src/lib/toast.tsx`

Adicionar campo `acao` opcional ao tipo:

```tsx
export type ToastItem = {
  id: string;
  mensagem: string;
  tipo: ToastTipo;
  duracao: number;
  acao?: { rotulo: string; callback: () => void };
};
```

Atualizar `ToastContextType` para aceitar `acao` no `adicionar`:

```tsx
type ToastContextType = {
  toasts: ToastItem[];
  adicionar: (mensagem: string, tipo?: ToastTipo, duracao?: number, acao?: ToastItem['acao']) => void;
  remover: (id: string) => void;
};
```

Atualizar a função `adicionar` dentro do provider para receber e salvar `acao`:

```tsx
const adicionar = useCallback(
  (mensagem: string, tipo: ToastTipo = 'info', duracao = tipo === 'erro' ? 6000 : tipo === 'aviso' ? 5000 : 4000, acao?: ToastItem['acao']) => {
    const id = String(++contadorRef.current);
    setToasts((atual) => [...atual.slice(-4), { id, mensagem, tipo, duracao, acao }]);
    if (duracao > 0) setTimeout(() => remover(id), duracao);
  },
  [remover]
);
```

Atualizar `toast` global para aceitar `acao`:

```tsx
export const toast = {
  sucesso: (msg: string, acao?: ToastItem['acao']) => _adicionar?.(msg, 'sucesso', acao ? 8000 : 4000, acao),
  erro:    (msg: string) => _adicionar?.(msg, 'erro'),
  info:    (msg: string) => _adicionar?.(msg, 'info'),
  aviso:   (msg: string) => _adicionar?.(msg, 'aviso'),
};
```

### 1b — Renderizar o botão de ação no ToastLinha

Em `ToastLinha`, após o `<p>` da mensagem e antes do botão de fechar:

```tsx
{t.acao && (
  <button
    type="button"
    onClick={() => { t.acao!.callback(); aoRemover(t.id); }}
    className="flex-shrink-0 rounded border border-current/25 bg-current/10 px-2 py-0.5 text-[11px] font-semibold transition-opacity hover:opacity-80"
  >
    {t.acao.rotulo}
  </button>
)}
```

### 1c — Integrar "Desfazer" nos 3 pontos críticos

**Contratos** (`src/pages/Contratos.tsx`) — função `aoMudarSinalPago`:

```tsx
async function aoMudarSinalPago(id: string, pago: boolean) {
  setContratos((atual) => atual.map((c) => (c.id === id ? { ...c, sinal_pago: pago } : c)));
  try {
    await marcarSinalPago(id, pago);
    if (pago) {
      toast.sucesso('Sinal marcado como pago.', {
        rotulo: 'Desfazer',
        callback: () => aoMudarSinalPago(id, false),
      });
    }
  } finally {
    carregar();
  }
}
```

**Financeiro** (`src/pages/Financeiro.tsx`) — função `aoMarcarPago`:

```tsx
function aoMarcarPago(id: string, pago: boolean) {
  const estadoAnterior = lancamentos.find((l) => l.id === id)?.status ?? 'pendente';
  setLancamentos((atual) => atual.map((l) => (l.id === id ? { ...l, status: pago ? 'pago' : 'pendente' } : l)));
  atualizarStatusLancamento(id, pago ? 'pago' : 'pendente')
    .then(() => {
      if (pago) {
        toast.sucesso('Lançamento marcado como pago.', {
          rotulo: 'Desfazer',
          callback: () => aoMarcarPago(id, false),
        });
      }
      carregar();
    })
    .catch((e) => { aoFalhar(e); carregar(); });
}
```

**CRM** (`src/pages/Crm.tsx`) — função `aoMoverLead`:

```tsx
async function aoMoverLead(leadId: string, funilId: string) {
  const lead = leads.find((l) => l.id === leadId) ?? todosLeads.find((l) => l.id === leadId);
  if (!lead || lead.status === funilId) return;
  const funilAnterior = lead.status;                         // guarda para desfazer
  const nomeNovoFunil = funis.find((f) => f.id === funilId)?.nome ?? 'novo funil';

  setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: funilId } : l)));
  setTodosLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: funilId } : l)));
  if (leadDetalhe?.id === leadId) setLeadDetalhe((prev) => (prev ? { ...prev, status: funilId } : prev));

  try {
    await atualizarLead(leadId, { status: funilId });
    toast.sucesso(`Lead movido para "${nomeNovoFunil}".`, {
      rotulo: 'Desfazer',
      callback: () => aoMoverLead(leadId, funilAnterior),
    });
    aplicarAutomacoesEvento('mudanca_funil', { ...lead, status: funilId }, { funilNovoId: funilId })
      .then(avisarResultadoAutomacoes)
      .catch((e) => toast.erro(mensagemDeErro(e)));
  } catch (e) {
    toast.erro(mensagemDeErro(e));
    carregar();
  }
}
```

---

## ETAPA 2 — CRM: Filtro por faixa de valor + Taxa de conversão

**Arquivo:** `src/pages/Crm.tsx`

### 2a — Estado do filtro de valor

Adicionar junto aos estados existentes:

```tsx
const [filtroValor, setFiltroValor] = useState<'' | 'ate5k' | '5k15k' | 'acima15k'>('');
```

### 2b — Aplicar filtro de valor na lista filtrada

O `leads` já vem filtrado do backend por `busca` e `filtroStatus`. Adicionar filtro de valor no cliente:

```tsx
const leadsFiltradosComValor = useMemo(() => {
  if (!filtroValor) return leads;
  return leads.filter((l) => {
    const v = l.valor_estimado ?? 0;
    if (filtroValor === 'ate5k')    return v <= 5000;
    if (filtroValor === '5k15k')   return v > 5000 && v <= 15000;
    if (filtroValor === 'acima15k') return v > 15000;
    return true;
  });
}, [leads, filtroValor]);
```

Substituir `leads` por `leadsFiltradosComValor` nos componentes de lista (`TabelaLeads`, `PipelineLeads`, MetricCards).

### 2c — Select de filtro de valor na barra de filtros

Ao lado do `<Input>` de busca existente:

```tsx
<select
  value={filtroValor}
  onChange={(e) => setFiltroValor(e.target.value as typeof filtroValor)}
  className="campo cursor-pointer appearance-none px-3 py-2 pr-7 text-sm text-text"
  style={{ minWidth: 150 }}
>
  <option value="">Qualquer valor</option>
  <option value="ate5k">Até R$5.000</option>
  <option value="5k15k">R$5.000 – R$15.000</option>
  <option value="acima15k">Acima de R$15.000</option>
</select>
```

### 2d — Taxa de conversão nos MetricCards

Calcular e exibir como MetricCard adicional (após os 4 existentes):

```tsx
const taxaConversao = useMemo(() => {
  if (todosLeads.length === 0) return '0%';
  const fechados = todosLeads.filter((l) => l.status === 'fechado').length;
  return `${Math.round((fechados / todosLeads.length) * 100)}%`;
}, [todosLeads]);

// No MetricGrid, adicionar após os 4 cards existentes:
<MetricCard
  Icone={TrendingUp}
  rotulo="Taxa de conversão"
  valor={taxaConversao}
  legenda="Leads fechados / total"
  categoria="pessoas"
/>
```

---

## ETAPA 3 — Orçamentos: Resumo lateral destacado

O resumo lateral **já existe** (`Panel` com `lg:sticky lg:top-4`). Ele já mostra total, sinal e saldo.
O que falta é torná-lo mais visual e com breakdown por categoria claro.

**Arquivo:** `src/pages/Orcamentos.tsx`

### 3a — Breakdown por categoria no resumo

O `totalServicos` já é calculado. Adicionar cálculo por categoria:

```tsx
const breakdownCategoria = useMemo(() => {
  const bar = itens.filter((i) => i.servico.categoria === 'bar').reduce((s, i) => s + i.valor + i.horasAdicionais * i.valorHoraAdicional, 0);
  const atracao = itens.filter((i) => i.servico.categoria === 'atracao').reduce((s, i) => s + i.valor + i.horasAdicionais * i.valorHoraAdicional, 0);
  return { bar, atracao };
}, [itens]);
```

### 3b — Adicionar barras de categoria no painel de resumo

Dentro do `Panel` do resumo, após o bloco de "Total estimado", antes da lista de itens:

```tsx
{(breakdownCategoria.bar > 0 || breakdownCategoria.atracao > 0) && (
  <div className="mb-4 flex flex-col gap-2 border-b border-line pb-4">
    {breakdownCategoria.bar > 0 && (
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[11.5px]">
          <span className="text-text-faint">Bar & Coquetelaria</span>
          <span className="font-mono font-semibold text-money">{formatarMoeda(breakdownCategoria.bar)}</span>
        </div>
        <ProgressBar valor={total > 0 ? (breakdownCategoria.bar / total) * 100 : 0} categoria="dinheiro" />
      </div>
    )}
    {breakdownCategoria.atracao > 0 && (
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[11.5px]">
          <span className="text-text-faint">Atrações fotográficas</span>
          <span className="font-mono font-semibold text-schedule">{formatarMoeda(breakdownCategoria.atracao)}</span>
        </div>
        <ProgressBar valor={total > 0 ? (breakdownCategoria.atracao / total) * 100 : 0} categoria="agenda" />
      </div>
    )}
  </div>
)}
```

### 3c — Adicionar import ProgressBar

```tsx
import { ProgressBar } from '../components/ui/ProgressBar';
```

### 3d — Link de WhatsApp direto no resumo

Após os botões de ação existentes (PDF, WhatsApp), adicionar um botão de compartilhar resumo:

```tsx
{lead && total > 0 && (
  <a
    href={`https://wa.me/55${(lead.telefone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(
      `Olá ${lead.nome}! Segue o resumo do orçamento para o seu evento:\n\n` +
      `📅 Data: ${dataEvento || 'a confirmar'}\n` +
      `👥 Convidados: ${convidados || '—'}\n` +
      `💰 Total: ${formatarMoeda(total)}\n` +
      `  → Sinal (20%): ${formatarMoeda(sinal)}\n` +
      `  → Saldo (80%): ${formatarMoeda(saldo)}\n\n` +
      `Itens incluídos:\n` +
      itens.map((i) => `• ${i.servico.nome}: ${formatarMoeda(i.valor)}`).join('\n')
    )}`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex w-full items-center justify-center gap-2 rounded-sm border border-execucao/30 bg-execucao/10 px-3 py-2 text-[12.5px] font-semibold text-execucao transition-colors hover:bg-execucao/20"
  >
    <MessageCircle className="h-4 w-4" strokeWidth={2} />
    Enviar resumo por WhatsApp
  </a>
)}
```

Adicionar import: `import { MessageCircle } from 'lucide-react';`

---

## ETAPA 4 — Auditoria: Gráfico de tendência de NPS

**Arquivo:** `src/pages/Auditoria.tsx`

### 4a — Calcular NPS por mês

Adicionar `useMemo` após os existentes:

```tsx
const npsPorMes = useMemo(() => {
  const grupos: Record<string, number[]> = {};
  auditorias.forEach((a) => {
    if (a.nps_nota == null) return;
    const mes = (a.criado_em ?? '').slice(0, 7);
    if (!mes) return;
    if (!grupos[mes]) grupos[mes] = [];
    grupos[mes].push(a.nps_nota);
  });
  const meses = Object.keys(grupos).sort();
  return {
    categorias: meses.map((m) => {
      const [ano, mes] = m.split('-');
      return new Date(Number(ano), Number(mes) - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    }),
    pontos: meses.map((m) => {
      const notas = grupos[m];
      return Math.round((notas.reduce((s, n) => s + n, 0) / notas.length) * 10) / 10;
    }),
  };
}, [auditorias]);
```

### 4b — Adicionar gráfico após MetricCards

```tsx
{npsPorMes.categorias.length >= 2 && (
  <Panel className="mb-4">
    <PanelHeader
      titulo="Tendência de NPS"
      desc="Média mensal de satisfação dos clientes — escala 0 a 10."
    />
    <GraficoLinha
      categorias={npsPorMes.categorias}
      series={[{
        rotulo: 'NPS médio',
        corClasse: 'text-people',
        pontos: npsPorMes.pontos,
      }]}
      formatarValor={(v) => v.toFixed(1)}
    />
  </Panel>
)}
```

Adicionar import se ainda não existir:
```tsx
import { GraficoLinha } from '../components/charts/GraficoLinha';
```

---

## ETAPA 5 — Ponto Interno: Resumo visual por funcionário

**Arquivo:** `src/pages/PontoInterno.tsx`

### 5a — Verificar que `calcularResumoJornada` já existe

A função `calcularResumoJornada` já existe e retorna `ResumoJornada[]` com `diasTrabalhados`, `minutosNormais`, `minutosExtras`, `atrasoMin` e `funcionario`. Confirme isso antes de prosseguir.

### 5b — Adicionar painel de resumo de cada funcionário

Encontrar onde os funcionários são listados (`funcionarios.map(...)` ou `resumosJornada.map(...)`) e adicionar cards visuais antes da tabela detalhada:

```tsx
{resumos.length > 0 && (
  <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {resumos.map((r) => {
      const horasNormais = Math.floor(r.minutosNormais / 60);
      const minNormais = r.minutosNormais % 60;
      const horasExtras = Math.floor(r.minutosExtras / 60);
      const taxaPresenca = r.jornadaConfigurada
        ? Math.round((r.diasTrabalhados / Math.max(1, diasNoMes)) * 100)
        : null;

      return (
        <div key={r.funcionario.id} className="list-row flex flex-col gap-2 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar nome={r.funcionario.nome} categoria="pessoas" tamanho={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-text">{r.funcionario.nome}</p>
              <p className="text-[11px] text-text-faint">{r.diasTrabalhados} dias trabalhados</p>
            </div>
            {r.atrasoMin > 0 && (
              <span className="flex-shrink-0 rounded border border-pending/25 bg-pending/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-pending">
                {r.atrasoMin}min atraso
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-text-faint">Horas trabalhadas</span>
            <span className="font-mono font-semibold text-text">
              {horasNormais}h{minNormais > 0 ? `${minNormais}m` : ''}
              {horasExtras > 0 && (
                <span className="ml-1 text-execucao">+{horasExtras}h extra</span>
              )}
            </span>
          </div>

          {taxaPresenca != null && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-faint">Presença no período</span>
                <span className={`font-mono font-semibold ${taxaPresenca >= 80 ? 'text-execucao' : taxaPresenca >= 60 ? 'text-pending' : 'text-danger'}`}>
                  {taxaPresenca}%
                </span>
              </div>
              <ProgressBar
                valor={taxaPresenca}
                categoria={taxaPresenca >= 80 ? 'execucao' : taxaPresenca >= 60 ? 'acao' : 'acao'}
              />
            </div>
          )}

          {r.valorAPagar > 0 && (
            <div className="flex items-center justify-between border-t border-line pt-1.5 text-[11.5px]">
              <span className="text-text-faint">A pagar</span>
              <span className="font-mono font-semibold text-money">{formatarMoeda(r.valorAPagar)}</span>
            </div>
          )}
        </div>
      );
    })}
  </div>
)}
```

Onde `diasNoMes` é o número de dias no mês/período selecionado (calcular a partir do filtro de período ativo).

Adicionar imports necessários:
```tsx
import { Avatar } from '../components/ui/Avatar';
import { ProgressBar } from '../components/ui/ProgressBar';
```

---

## ETAPA 6 — Fechamento: Variação colorida na tabela + MetricCard de meta

**Arquivo:** `src/pages/Fechamento.tsx`

### 6a — MetricCard de meta mensal

A meta já é salva em localStorage pelo P1. Ler e exibir:

```tsx
const metaMensal = useMemo(() => {
  try { return Number(localStorage.getItem('emcena_meta_mensal') ?? 0); } catch { return 0; }
}, []);

const pctMeta = metaMensal > 0 ? Math.round(((mesAtual?.valor ?? 0) / metaMensal) * 100) : null;
```

Já adicionado no P1 — verificar se está presente. Se não, adicionar ao MetricGrid:

```tsx
{pctMeta != null && (
  <MetricCard
    Icone={TrendingUp}
    rotulo="Meta mensal"
    valor={`${pctMeta}%`}
    legenda={`${formatarMoeda(mesAtual?.valor ?? 0)} de ${formatarMoeda(metaMensal)}`}
    categoria="dinheiro"
  />
)}
```

### 6b — Variação colorida na tabela de histórico

Encontrar onde a tabela de histórico mensal renderiza as linhas. Adicionar coluna de variação:

```tsx
{/* Dentro do map de meses da tabela — adicionar após o valor: */}
{(() => {
  const idx = meses.findIndex((m) => m.mes === mes.mes);
  const anterior = meses[idx + 1];
  if (!anterior || anterior.valor === 0) return null;
  const variacao = Math.round(((mes.valor - anterior.valor) / anterior.valor) * 100);
  const cor = variacao > 0 ? 'text-money' : variacao < 0 ? 'text-danger' : 'text-text-faint';
  return (
    <span className={`font-mono text-[11.5px] font-semibold ${cor}`}>
      {variacao > 0 ? '+' : ''}{variacao}%
    </span>
  );
})()}
```

---

## ETAPA 7 — Logística: Status visual dos veículos

O modelo `Veiculo` não tem campo de status no banco — já existe `statusFrota` como `Record<string, string>` em memória (confirmado no código: `const [statusFrota, setStatusFrota] = useState<Record<string, string>>({})`).

**Arquivo:** `src/pages/Logistica.tsx`

### 7a — Controles de status na lista de veículos

Encontrar onde os veículos são listados e adicionar selector de status inline:

```tsx
{veiculos.map((v) => {
  const status = statusFrota[v.id] ?? 'disponivel';
  const corStatus = status === 'disponivel' ? 'text-execucao' : status === 'alocado' ? 'text-people' : 'text-pending';
  const bgStatus = status === 'disponivel' ? 'bg-execucao/10 border-execucao/25' : status === 'alocado' ? 'bg-people/10 border-people/25' : 'bg-pending/10 border-pending/25';

  return (
    <div key={v.id} className="list-row flex flex-wrap items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-text">{v.nome}</p>
        <p className="text-[11.5px] text-text-faint">{v.placa ?? '—'} · {v.tipo}</p>
      </div>

      {/* Status selector */}
      <div className="flex gap-1">
        {(['disponivel', 'alocado', 'manutencao'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFrota((atual) => ({ ...atual, [v.id]: s }))}
            className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors ${
              status === s ? bgStatus + ' ' + corStatus : 'border-line bg-raised text-text-ultra hover:text-text-dim'
            }`}
          >
            {s === 'disponivel' ? 'Disponível' : s === 'alocado' ? 'Alocado' : 'Manutenção'}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => aoExcluirVeiculo(v.id)}
        className="text-[11.5px] font-medium text-danger hover:underline"
      >
        Remover
      </button>
    </div>
  );
})}
```

### 7b — MetricCard de status da frota

Após os MetricCards existentes, adicionar status resumido:

```tsx
{veiculos.length > 0 && (
  <div className="mb-4 flex flex-wrap gap-2">
    {(['disponivel', 'alocado', 'manutencao'] as const).map((s) => {
      const qtd = veiculos.filter((v) => (statusFrota[v.id] ?? 'disponivel') === s).length;
      const label = s === 'disponivel' ? 'Disponíveis' : s === 'alocado' ? 'Alocados' : 'Em manutenção';
      const cor = s === 'disponivel' ? 'border-execucao/25 bg-execucao/8 text-execucao' : s === 'alocado' ? 'border-people/25 bg-people/8 text-people' : 'border-pending/25 bg-pending/8 text-pending';
      return (
        <div key={s} className={`flex items-center gap-2 rounded-md border px-3 py-2 ${cor}`}>
          <span className="font-mono text-[18px] font-black">{qtd}</span>
          <span className="text-[11.5px] font-medium">{label}</span>
        </div>
      );
    })}
  </div>
)}
```

---

## ETAPA 8 — Exportar CSV em Contratos e Financeiro

### 8a — Função utilitária de exportação
**Arquivo novo:** `src/lib/exportarCsv.ts`

```ts
/** Gera um arquivo CSV e dispara o download no browser.
    Não depende de lib externa — usa Blob nativo. */
export function exportarCsv(linhas: Record<string, string | number | null>[], nomeArquivo: string) {
  if (linhas.length === 0) return;

  const cabecalho = Object.keys(linhas[0]);
  const escapar = (v: string | number | null) => {
    const str = v == null ? '' : String(v);
    // Envolver em aspas se contiver vírgula, aspas ou quebra de linha
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const csv = [
    cabecalho.join(','),
    ...linhas.map((l) => cabecalho.map((k) => escapar(l[k])).join(',')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
```

### 8b — Botão de exportar em Contratos

**Arquivo:** `src/pages/Contratos.tsx`

Adicionar import:
```tsx
import { exportarCsv } from '../lib/exportarCsv';
import { Download } from 'lucide-react';
```

Adicionar botão ao lado da busca, após o select de filtro:

```tsx
<button
  type="button"
  onClick={() =>
    exportarCsv(
      contratosFiltrados.map((c) => ({
        Cliente: c.lead?.nome ?? '—',
        Local: c.local ?? '—',
        'Data do evento': c.data_evento ?? '—',
        'Valor total': c.valor_total,
        'Sinal pago': c.sinal_pago ? 'Sim' : 'Não',
        'Status saldo': c.saldo_status,
        Status: c.status,
      })),
      `contratos-${new Date().toISOString().slice(0, 10)}.csv`
    )
  }
  className="flex items-center gap-1.5 rounded-md border border-line bg-raised px-3 py-2 text-[12px] font-medium text-text-dim transition-colors hover:border-line-strong hover:text-text"
  title="Exportar lista filtrada como CSV"
>
  <Download className="h-3.5 w-3.5" strokeWidth={2} />
  CSV
</button>
```

### 8c — Botão de exportar em Financeiro

**Arquivo:** `src/pages/Financeiro.tsx`

Adicionar import:
```tsx
import { exportarCsv } from '../lib/exportarCsv';
import { Download } from 'lucide-react';
```

Adicionar botão ao lado dos filtros de status/mês:

```tsx
<button
  type="button"
  onClick={() =>
    exportarCsv(
      visiveis.map((l) => ({
        Descrição: l.descricao ?? '—',
        Tipo: l.tipo,
        Valor: l.valor,
        Status: l.status,
        Vencimento: l.vencimento ?? '—',
        'Data pagamento': l.data_pagamento ?? '—',
      })),
      `lancamentos-${mesLancamentos !== 'todos' ? mesLancamentos : 'todos'}.csv`
    )
  }
  className="flex items-center gap-1.5 rounded-md border border-line bg-raised px-3 py-2 text-[12px] font-medium text-text-dim transition-colors hover:border-line-strong hover:text-text"
  title="Exportar lançamentos filtrados como CSV"
>
  <Download className="h-3.5 w-3.5" strokeWidth={2} />
  CSV
</button>
```

---

## ETAPA 9 — Agenda: Vista "Esta semana"

**Arquivo:** `src/pages/Agenda.tsx`

### 9a — Calcular eventos da semana

Adicionar `useMemo` após os existentes:

```tsx
const eventosEstaSemana = useMemo(() => {
  const hoje = new Date();
  const em7dias = new Date(hoje);
  em7dias.setDate(hoje.getDate() + 7);
  const hojeStr = hoje.toISOString().slice(0, 10);
  const em7Str = em7dias.toISOString().slice(0, 10);

  return [...(eventos ?? []), ...(tarefas ?? []), ...(bloqueios ?? [])]
    .filter((item) => {
      const data = (item as { data?: string; data_inicio?: string }).data
        ?? (item as { data_inicio?: string }).data_inicio
        ?? '';
      return data >= hojeStr && data <= em7Str;
    })
    .sort((a, b) => {
      const da = (a as { data?: string; data_inicio?: string }).data ?? (a as { data_inicio?: string }).data_inicio ?? '';
      const db = (b as { data?: string; data_inicio?: string }).data ?? (b as { data_inicio?: string }).data_inicio ?? '';
      return da.localeCompare(db);
    });
}, [eventos, tarefas, bloqueios]);
```

Audite os nomes reais dos campos antes de implementar — `data_evento`, `data`, `data_inicio` etc. podem variar por tipo de item.

### 9b — Painel "Esta semana" no layout

No layout do calendário (onde existe o painel lateral de "Próximos eventos"), adicionar antes ou após:

```tsx
{eventosEstaSemana.length > 0 && (
  <Panel className="mb-4">
    <PanelHeader titulo="Esta semana" desc={`${eventosEstaSemana.length} item${eventosEstaSemana.length > 1 ? 's' : ''} nos próximos 7 dias`} />
    <div className="flex flex-col divide-y divide-line">
      {eventosEstaSemana.slice(0, 7).map((item, i) => {
        const data = (item as { data?: string; data_inicio?: string }).data
          ?? (item as { data_inicio?: string }).data_inicio
          ?? '';
        const nome = (item as { nome?: string; titulo?: string }).nome
          ?? (item as { titulo?: string }).titulo
          ?? 'Item';
        return (
          <div key={i} className="flex items-center gap-2.5 py-2">
            <div className="w-10 flex-shrink-0 text-center">
              <p className="font-mono text-[10px] text-text-ultra">
                {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
              </p>
              <p className="font-mono text-[13px] font-bold text-text">
                {new Date(data + 'T12:00:00').getDate()}
              </p>
            </div>
            <p className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-text-dim">{nome}</p>
          </div>
        );
      })}
    </div>
  </Panel>
)}
```

---

## CHECKLIST FINAL

- [ ] `npm run build` zero erros
- [ ] Toast "Desfazer" aparece ao marcar sinal pago, lançamento pago e mover lead
- [ ] Desfazer efetivamente reverte a ação
- [ ] CRM: filtro de valor funciona no Kanban e na tabela
- [ ] CRM: taxa de conversão correta
- [ ] Orçamentos: barras de breakdown aparecem ao selecionar itens
- [ ] Orçamentos: link WhatsApp abre com texto correto
- [ ] Auditoria: gráfico de tendência aparece com 2+ meses de dados
- [ ] Ponto Interno: cards de resumo com ProgressBar por funcionário
- [ ] Fechamento: variação % colorida na tabela + MetricCard de meta
- [ ] Logística: botões de status por veículo + painel resumo
- [ ] Contratos: botão CSV baixa arquivo com dados filtrados
- [ ] Financeiro: botão CSV baixa lançamentos filtrados
- [ ] Agenda: painel "Esta semana" exibe itens dos próximos 7 dias

```bash
git add -A
git commit -m "feat: P2/P3 — toast desfazer, filtros CRM, resumo Orçamentos, NPS tendência, Ponto resumo visual, CSV export, Logística status, Esta semana Agenda"
vercel --prod
```
