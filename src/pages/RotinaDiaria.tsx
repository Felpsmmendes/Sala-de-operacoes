import { AlertTriangle, BarChart3, CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Circle, ClipboardCheck, ListChecks, Lock, Package, Plus, Receipt, Users, Wallet, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertaBanner } from '../components/AlertaBanner';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { AnelProgresso } from '../components/ui/AnelProgresso';
import { Drawer } from '../components/ui/Drawer';
import { EstadoVazio } from '../components/ui/EmptyState';
import { IconBox } from '../components/ui/IconBox';
import { Input } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/ProgressBar';
import { listarAuditorias } from '../lib/api/auditoria';
import { diasAteEvento, listarContratos } from '../lib/api/contratos';
import { listarEscalasDosEventos } from '../lib/api/escalas';
import { listarItens } from '../lib/api/estoque';
import { listarEventos } from '../lib/api/eventos';
import { listarLancamentos } from '../lib/api/financeiro';
import { criarTarefa, listarTarefas, marcarTarefaConcluida } from '../lib/api/tarefasAgenda';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { calcularStaffNecessario, funcaoContaComo } from '../lib/staffing';
import { STATUS_EVENTO_INFO, formatarMoeda } from '../lib/status';
import { toast } from '../lib/toast';
import type { EscalaComMembro, EventoComLead, TarefaComLead } from '../lib/types';

/* ─── datas (sempre LOCAIS — `toISOString().slice(0,10)` é UTC e, depois das 21h em
   Brasília, já vira "amanhã") ─────────────────────────────────────────────── */
function dataLocalDe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dataHoje(): string {
  return dataLocalDe(new Date());
}
function somarDias(data: string, n: number): string {
  const d = new Date(`${data}T00:00:00`);
  d.setDate(d.getDate() + n);
  return dataLocalDe(d);
}
function dataExtensa(data: string): string {
  const s = new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ─── rotina fixa (recorrente todo dia) — marcada só no localStorage, zera a cada dia ─── */
const CHAVE_ROTINA = 'emcena_rotina_diaria';

function carregarConcluidas(): Set<string> {
  try {
    const raw = localStorage.getItem(CHAVE_ROTINA);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { data: string; concluidas: string[] };
    return parsed.data === dataHoje() ? new Set(parsed.concluidas) : new Set();
  } catch {
    return new Set();
  }
}

function salvarConcluidas(ids: Set<string>): void {
  try {
    localStorage.setItem(CHAVE_ROTINA, JSON.stringify({ data: dataHoje(), concluidas: [...ids] }));
  } catch {
    /* localStorage indisponível (aba privada etc.) — só não persiste entre sessões */
  }
}

type Categoria = 'comercial' | 'operacional' | 'estoque' | 'financeiro' | 'posevento';

const CATEGORIAS: Record<Categoria, { rotulo: string; Icone: LucideIcon }> = {
  comercial: { rotulo: 'Comercial', Icone: ClipboardCheck },
  operacional: { rotulo: 'Operacional', Icone: Users },
  estoque: { rotulo: 'Estoque', Icone: Package },
  financeiro: { rotulo: 'Financeiro', Icone: Wallet },
  posevento: { rotulo: 'Pós-evento', Icone: BarChart3 },
};

const TAREFAS_FIXAS: { id: string; categoria: Categoria; rotulo: string; link: string }[] = [
  { id: 'leads', categoria: 'comercial', rotulo: 'Verificar novos leads do dia', link: '/crm' },
  { id: 'contratos', categoria: 'comercial', rotulo: 'Revisar contratos com pendência', link: '/contratos' },
  { id: 'equipe', categoria: 'operacional', rotulo: 'Confirmar equipe dos eventos da semana', link: '/escala' },
  { id: 'roteiro', categoria: 'operacional', rotulo: 'Ver roteiro dos eventos de hoje', link: '/roteiro' },
  { id: 'estoque', categoria: 'estoque', rotulo: 'Checar nível de estoque', link: '/estoque' },
  { id: 'financeiro', categoria: 'financeiro', rotulo: 'Revisar lançamentos do dia', link: '/financeiro' },
  { id: 'auditoria', categoria: 'posevento', rotulo: 'Registrar auditorias dos eventos recentes', link: '/auditoria' },
];

type Pendencia = { categoria: Categoria; titulo: string; detalhe: string; link: string; nivel: 'critico' | 'aviso' };

function quandoEvento(dias: number): string {
  if (dias === 0) return 'evento hoje';
  if (dias < 0) return `evento há ${-dias}d`;
  return `evento em ${dias}d`;
}

type FiltroLinha = 'todos' | 'tarefas' | 'eventos';

type LinhaTempo = { chave: string; hora: string | null; tipo: 'evento' | 'tarefa'; evento?: EventoComLead; tarefa?: TarefaComLead };

export default function RotinaDiaria() {
  const hoje = dataHoje();
  const [dataSel, setDataSel] = useState(hoje);
  const ehHoje = dataSel === hoje;

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [concluidas, setConcluidas] = useState<Set<string>>(carregarConcluidas);
  const [filtro, setFiltro] = useState<FiltroLinha>('todos');
  const [aba, setAba] = useState<'pendencias' | 'fixa'>('pendencias');

  const [contratos, setContratos] = useState<Awaited<ReturnType<typeof listarContratos>>>([]);
  const [itens, setItens] = useState<Awaited<ReturnType<typeof listarItens>>>([]);
  const [lancamentos, setLancamentos] = useState<Awaited<ReturnType<typeof listarLancamentos>>>([]);
  const [auditorias, setAuditorias] = useState<Awaited<ReturnType<typeof listarAuditorias>>>([]);
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [tarefas, setTarefas] = useState<TarefaComLead[]>([]);
  const [escalasProximas, setEscalasProximas] = useState<EscalaComMembro[]>([]);
  const [escalasDia, setEscalasDia] = useState<EscalaComMembro[]>([]);

  const [novaAberta, setNovaAberta] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoHorario, setNovoHorario] = useState('');
  const [salvandoTarefa, setSalvandoTarefa] = useState(false);

  useEffect(() => {
    let cancelado = false;
    Promise.all([listarContratos(), listarItens(), listarLancamentos(), listarAuditorias(), listarEventos(), listarTarefas()])
      .then(async ([c, i, l, a, ev, tf]) => {
        if (cancelado) return;
        // escalas dos eventos próximos (7 dias) — segunda leva, precisa saber os ids
        // primeiro (mesmo padrão do Dashboard).
        const idsProximos = ev.filter((e) => e.status !== 'cancelado' && diasAteEvento(e.data_evento) >= 0 && diasAteEvento(e.data_evento) <= 7).map((e) => e.id);
        const esc = await listarEscalasDosEventos(idsProximos).catch(() => []);
        if (cancelado) return;
        setContratos(c);
        setItens(i);
        setLancamentos(l);
        setAuditorias(a);
        setEventos(ev);
        setTarefas(tf);
        setEscalasProximas(esc);
        setCarregando(false);
      })
      .catch((e) => {
        if (cancelado) return;
        setErro(mensagemDeErro(e));
        setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  /* ─── o dia selecionado ─── */
  const eventosDia = useMemo(() => eventos.filter((ev) => ev.data_evento === dataSel && ev.status !== 'cancelado'), [eventos, dataSel]);
  const tarefasDia = useMemo(() => tarefas.filter((t) => t.data === dataSel), [tarefas, dataSel]);

  useEffect(() => {
    if (eventosDia.length === 0) {
      setEscalasDia([]);
      return;
    }
    let cancelado = false;
    listarEscalasDosEventos(eventosDia.map((e) => e.id))
      .then((r) => !cancelado && setEscalasDia(r))
      .catch(() => !cancelado && setEscalasDia([]));
    return () => {
      cancelado = true;
    };
  }, [eventosDia]);

  const linhas = useMemo(() => {
    const todas: LinhaTempo[] = [
      ...eventosDia.map((ev) => ({ chave: `e-${ev.id}`, hora: ev.hora_inicio?.slice(0, 5) ?? null, tipo: 'evento' as const, evento: ev })),
      ...tarefasDia.map((t) => ({ chave: `t-${t.id}`, hora: t.horario?.slice(0, 5) ?? null, tipo: 'tarefa' as const, tarefa: t })),
    ];
    return todas
      .filter((l) => filtro === 'todos' || (filtro === 'eventos' ? l.tipo === 'evento' : l.tipo === 'tarefa'))
      .sort((a, b) => (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99'));
  }, [eventosDia, tarefasDia, filtro]);

  /* ─── pendências — mesmas regras de negócio de sempre (Contratos: D-20 e sinal;
     Escala: dimensionamento; Estoque; Financeiro; Auditoria), só reagrupadas. ─── */
  const pendencias = useMemo(() => {
    const lista: Pendencia[] = [];

    contratos
      .filter((c) => c.status !== 'cancelado')
      .forEach((c) => {
        const dias = diasAteEvento(c.data_evento);
        const cliente = c.lead?.nome ?? 'Contrato';
        if (c.saldo_status !== 'quitado' && dias <= 20) lista.push({ categoria: 'comercial', titulo: 'Saldo pendente', detalhe: `${cliente} · ${quandoEvento(dias)}`, link: '/contratos', nivel: dias <= 5 ? 'critico' : 'aviso' });
        if (!c.sinal_pago) lista.push({ categoria: 'comercial', titulo: 'Sinal pendente', detalhe: cliente, link: '/contratos', nivel: 'aviso' });
      });

    const escalasPorEvento = new Map<string, EscalaComMembro[]>();
    for (const esc of escalasProximas) escalasPorEvento.set(esc.evento_id, [...(escalasPorEvento.get(esc.evento_id) ?? []), esc]);
    eventos
      .filter((ev) => ev.status !== 'cancelado' && diasAteEvento(ev.data_evento) >= 0 && diasAteEvento(ev.data_evento) <= 7)
      .forEach((ev) => {
        const dias = diasAteEvento(ev.data_evento);
        const necessario = calcularStaffNecessario(ev.convidados);
        const ativos = (escalasPorEvento.get(ev.id) ?? []).filter((e) => e.status !== 'recusado');
        const bartender = ativos.filter((e) => e.membro && funcaoContaComo(e.membro.funcao) === 'bartender').length;
        const barback = ativos.filter((e) => e.membro && funcaoContaComo(e.membro.funcao) === 'barback').length;
        if (bartender < necessario.bartender || barback < necessario.barback) {
          lista.push({ categoria: 'operacional', titulo: 'Equipe incompleta', detalhe: `${ev.contrato?.lead?.nome ?? 'Evento'} · ${quandoEvento(dias)}`, link: `/escala?evento=${ev.id}`, nivel: dias <= 2 ? 'critico' : 'aviso' });
        }
      });

    itens
      .filter((i) => i.estoque_atual <= i.estoque_minimo)
      .slice(0, 4)
      .forEach((i) =>
        lista.push({ categoria: 'estoque', titulo: i.nome, detalhe: `${i.estoque_atual === 0 ? 'Zerado' : 'Abaixo do mínimo'} (${i.estoque_atual}/${i.estoque_minimo} ${i.unidade})`, link: '/estoque', nivel: i.estoque_atual === 0 ? 'critico' : 'aviso' })
      );

    const vencidos = lancamentos.filter((l) => l.status === 'pendente' && l.vencimento && l.vencimento < hoje);
    if (vencidos.length > 0) {
      lista.push({ categoria: 'financeiro', titulo: `${vencidos.length} lançamento${vencidos.length > 1 ? 's' : ''} vencido${vencidos.length > 1 ? 's' : ''}`, detalhe: formatarMoeda(vencidos.reduce((s, l) => s + l.valor, 0)), link: '/financeiro/pagar', nivel: 'critico' });
    }

    const auditados = new Set(auditorias.map((a) => a.evento_id));
    eventos
      .filter((ev) => ev.status !== 'cancelado' && diasAteEvento(ev.data_evento) < 0 && diasAteEvento(ev.data_evento) >= -30 && !auditados.has(ev.id))
      .slice(0, 3)
      .forEach((ev) => lista.push({ categoria: 'posevento', titulo: 'Auditoria pendente', detalhe: ev.contrato?.lead?.nome ?? 'Evento', link: `/auditoria?evento=${ev.id}`, nivel: 'aviso' }));

    return lista.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'critico' ? -1 : 1));
  }, [contratos, eventos, escalasProximas, itens, lancamentos, auditorias, hoje]);

  const criticas = pendencias.filter((p) => p.nivel === 'critico').length;

  /* ─── números do dia ─── */
  const emAndamento = eventosDia.filter((e) => e.status === 'em_montagem' || e.status === 'em_execucao').length;
  const aIniciar = eventosDia.filter((e) => e.status === 'agendado').length;
  const partesEventos = [emAndamento > 0 && `${emAndamento} em andamento`, aIniciar > 0 && `${aIniciar} a iniciar`].filter(Boolean).join(' · ');

  const agendaFeitas = tarefasDia.filter((t) => t.concluida).length;
  const agendaPendentes = tarefasDia.length - agendaFeitas;
  const fixasFeitas = ehHoje ? TAREFAS_FIXAS.filter((t) => concluidas.has(t.id)).length : 0;
  const fixasTotal = ehHoje ? TAREFAS_FIXAS.length : 0;
  const totalTarefas = tarefasDia.length + fixasTotal;
  const totalFeitas = agendaFeitas + fixasFeitas;
  const pctDia = totalTarefas > 0 ? (totalFeitas / totalTarefas) * 100 : 0;

  const escaladosDia = escalasDia.filter((e) => e.status !== 'recusado');
  const confirmadosDia = escaladosDia.filter((e) => e.status === 'confirmado').length;
  const convidadosDia = eventosDia.reduce((s, e) => s + (e.convidados ?? 0), 0);
  const vencendoNoDia = lancamentos.filter((l) => l.status === 'pendente' && l.vencimento === dataSel);

  const proximosEventos = useMemo(() => {
    const futuros = eventos
      .filter((ev) => ev.status !== 'cancelado' && ev.data_evento >= hoje)
      .sort((a, b) => a.data_evento.localeCompare(b.data_evento) || (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? ''))
      .slice(0, 6);
    const porDia = new Map<string, EventoComLead[]>();
    for (const ev of futuros) porDia.set(ev.data_evento, [...(porDia.get(ev.data_evento) ?? []), ev]);
    return [...porDia.entries()];
  }, [eventos, hoje]);

  /* ─── ações ─── */
  function alternarFixa(id: string) {
    setConcluidas((atual) => {
      const novo = new Set(atual);
      if (!novo.delete(id)) novo.add(id);
      salvarConcluidas(novo);
      return novo;
    });
  }

  function alternarTarefa(t: TarefaComLead) {
    const nova = !t.concluida;
    setTarefas((lista) => lista.map((x) => (x.id === t.id ? { ...x, concluida: nova } : x)));
    marcarTarefaConcluida(t.id, nova).catch((e) => {
      setTarefas((lista) => lista.map((x) => (x.id === t.id ? { ...x, concluida: t.concluida } : x)));
      toast.erro(mensagemDeErro(e));
    });
  }

  async function aoCriarTarefa() {
    if (!novoTitulo.trim()) return;
    setSalvandoTarefa(true);
    try {
      const criada = await criarTarefa({ titulo: novoTitulo.trim(), data: dataSel, horario: novoHorario || null, observacoes: null, leadId: null });
      setTarefas((lista) => [...lista, criada]);
      setNovoTitulo('');
      setNovoHorario('');
      setNovaAberta(false);
      toast.sucesso('Tarefa criada.');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setSalvandoTarefa(false);
    }
  }

  function irParaPendencias() {
    setAba('pendencias');
    document.getElementById('rotina-pendencias')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <Cabecalho titulo="Rotina Diária" subtitulo="Sua agenda e tarefas do dia organizadas para manter tudo em dia." />
      <Conteudo>
        {erro && (
          <AlertaBanner tom="perigo" className="mb-4">
            {erro}
          </AlertaBanner>
        )}

        {/* ── navegação de dia ── */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setDataSel(somarDias(dataSel, -1))} aria-label="Dia anterior" className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-raised text-text-dim hover:border-line-strong hover:text-text">
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <span className="min-w-0 text-[14px] font-semibold text-text">{dataExtensa(dataSel)}</span>
            <button type="button" onClick={() => setDataSel(somarDias(dataSel, 1))} aria-label="Próximo dia" className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-raised text-text-dim hover:border-line-strong hover:text-text">
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
            {!ehHoje && (
              <button type="button" onClick={() => setDataSel(hoje)} className="rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[12px] font-semibold text-accent hover:bg-accent/20">
                Voltar pra hoje
              </button>
            )}
          </div>
          <Link to="/agenda" className="rounded-md border border-line px-3 py-1.5 text-[12.5px] font-medium text-text-dim hover:bg-raised hover:text-text">
            Ver agenda
          </Link>
        </div>

        {/* ── resumo em 4 números ── */}
        <MetricGrid>
          <MetricCard Icone={CalendarCheck} rotulo="Eventos do dia" valor={String(eventosDia.length)} legenda={eventosDia.length === 0 ? 'Nenhum evento' : partesEventos || `${eventosDia.length} encerrado(s)`} categoria="agenda" aoVivo={ehHoje && emAndamento > 0} />
          <MetricCard Icone={ListChecks} rotulo="Tarefas pendentes" valor={String(agendaPendentes + (fixasTotal - fixasFeitas))} legenda={ehHoje ? `${agendaPendentes} da agenda · ${fixasTotal - fixasFeitas} da rotina fixa` : `${agendaPendentes} da agenda`} categoria="execucao" />
          <MetricCard Icone={AlertTriangle} rotulo="Pendências" valor={String(pendencias.length)} legenda={pendencias.length === 0 ? 'Tudo em dia' : `${criticas} crítica${criticas !== 1 ? 's' : ''} · ${pendencias.length - criticas} atenç${pendencias.length - criticas !== 1 ? 'ões' : 'ão'}`} categoria="acao" />
          <MetricCard Icone={Users} rotulo="Equipe confirmada" valor={String(confirmadosDia)} legenda={escaladosDia.length === 0 ? 'Ninguém escalado' : `de ${escaladosDia.length} escalado${escaladosDia.length !== 1 ? 's' : ''}`} categoria="pessoas" />
        </MetricGrid>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* ══ coluna principal ══ */}
          <div className="flex min-w-0 flex-col gap-4">
            <Panel>
              <PanelHeader
                titulo={ehHoje ? 'Sua rotina de hoje' : 'Rotina do dia'}
                desc="Eventos e tarefas por horário."
                acao={
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex gap-0.5 rounded-sm border border-line bg-input p-0.5" role="tablist" aria-label="Filtrar linha do tempo">
                      {(
                        [
                          { f: 'todos', rotulo: 'Todos' },
                          { f: 'tarefas', rotulo: 'Tarefas' },
                          { f: 'eventos', rotulo: 'Eventos' },
                        ] as const
                      ).map(({ f, rotulo }) => (
                        <button key={f} type="button" role="tab" aria-selected={filtro === f} onClick={() => setFiltro(f)} className={`rounded-[5px] px-3 py-1.5 text-[12px] font-medium transition-colors ${filtro === f ? 'bg-accent text-accent-ink' : 'text-text-dim hover:text-text'}`}>
                          {rotulo}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setNovaAberta(true)} className="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-[12px] font-medium text-text-dim hover:bg-raised hover:text-text">
                      <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Nova tarefa
                    </button>
                  </div>
                }
              />

              {carregando ? (
                <SkeletonLinhas />
              ) : linhas.length === 0 ? (
                <EstadoVazio Icone={CalendarCheck} titulo={filtro === 'todos' ? 'Nada agendado pra este dia' : 'Nada neste filtro'} descricao="Crie uma tarefa ou veja a agenda pra marcar um evento." />
              ) : (
                <ol className="flex flex-col">
                  {linhas.map((l, i) => {
                    const ev = l.evento;
                    const t = l.tarefa;
                    const feito = ev ? ev.status === 'encerrado' : !!t?.concluida;
                    const emCurso = ev && (ev.status === 'em_montagem' || ev.status === 'em_execucao');
                    const primeira = i === 0;
                    const ultima = i === linhas.length - 1;
                    return (
                      <li key={l.chave} className="flex gap-3 pb-2 last:pb-0">
                        <span className="w-11 flex-shrink-0 pt-3.5 text-right font-mono text-[12px] text-text-dim">{l.hora ?? '—'}</span>
                        <span className="relative flex w-3 flex-shrink-0 justify-center" aria-hidden="true">
                          <span className={`absolute w-px bg-line ${primeira ? 'top-[22px]' : 'top-0'} ${ultima ? 'h-[22px]' : 'bottom-0'} ${primeira && ultima ? 'hidden' : ''}`} />
                          <span className={`relative mt-[17px] h-2.5 w-2.5 rounded-full ring-4 ring-[var(--color-panel)] ${feito ? 'bg-success' : emCurso ? 'bg-pending' : 'bg-neutral'}`} />
                        </span>

                        {ev ? (
                          <Link to={`/roteiro?evento=${ev.id}`} className="list-row group flex min-w-0 flex-1 flex-wrap items-center gap-3 px-3 py-2.5">
                            <IconBox Icone={CalendarCheck} cor="var(--color-schedule)" corIcone="var(--color-schedule-label)" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13.5px] font-semibold text-text">{ev.contrato?.lead?.nome ?? 'Evento sem nome'}</span>
                              <span className="block truncate text-[12px] text-text-faint">
                                {[ev.tipo_evento, ev.local, ev.convidados != null ? `${ev.convidados} convidados` : null].filter(Boolean).join(' · ') || 'Sem detalhes'}
                              </span>
                            </span>
                            <Badge tom={STATUS_EVENTO_INFO[ev.status].tom} texto={STATUS_EVENTO_INFO[ev.status].rotulo} />
                            <ChevronRight className="h-4 w-4 flex-shrink-0 text-text-faint group-hover:text-text" strokeWidth={2} />
                          </Link>
                        ) : (
                          t && (
                            <div className="list-row flex min-w-0 flex-1 flex-wrap items-center gap-3 px-3 py-2.5">
                              <button
                                type="button"
                                onClick={() => alternarTarefa(t)}
                                aria-label={t.concluida ? 'Desmarcar tarefa' : 'Marcar tarefa como concluída'}
                                className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-icon border border-line transition-transform hover:border-line-strong active:scale-90"
                              >
                                {t.concluida ? <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={2} /> : <Circle className="h-4 w-4 text-text-dim" strokeWidth={1.75} />}
                              </button>
                              <span className="min-w-0 flex-1">
                                <span className={`block truncate text-[13.5px] font-semibold ${t.concluida ? 'text-text-dim line-through' : 'text-text'}`}>{t.titulo}</span>
                                <span className="block truncate text-[12px] text-text-faint">{t.lead?.nome ?? t.observacoes ?? 'Tarefa da agenda'}</span>
                              </span>
                              <Badge tom={t.concluida ? 'sucesso' : 'pendente'} texto={t.concluida ? 'Concluída' : 'Pendente'} />
                              <Link to="/agenda" aria-label="Abrir na agenda" className="text-text-faint hover:text-text">
                                <ChevronRight className="h-4 w-4" strokeWidth={2} />
                              </Link>
                            </div>
                          )
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </Panel>

            <Panel id="rotina-pendencias">
              <div className="scrollbar-none -mt-1 mb-4 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
                <button type="button" role="tab" aria-selected={aba === 'pendencias'} onClick={() => setAba('pendencias')} className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${aba === 'pendencias' ? 'border-accent text-accent' : 'border-transparent text-text-dim hover:text-text'}`}>
                  Pendências
                  <span className={`rounded-full px-1.5 text-[11px] font-semibold ${criticas > 0 ? 'bg-danger/15 text-danger' : 'bg-input text-text-faint'}`}>{pendencias.length}</span>
                </button>
                {ehHoje && (
                  <button type="button" role="tab" aria-selected={aba === 'fixa'} onClick={() => setAba('fixa')} className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${aba === 'fixa' ? 'border-accent text-accent' : 'border-transparent text-text-dim hover:text-text'}`}>
                    Rotina fixa
                    <span className="rounded-full bg-input px-1.5 text-[11px] font-semibold text-text-faint">
                      {fixasFeitas}/{fixasTotal}
                    </span>
                  </button>
                )}
              </div>

              {carregando ? (
                <SkeletonLinhas />
              ) : aba === 'pendencias' || !ehHoje ? (
                pendencias.length === 0 ? (
                  <p className="flex items-center gap-2 py-2 text-[13px] text-success">
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2} /> Tudo em dia — nenhuma pendência no sistema.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="-mt-1 mb-1 text-[12px] text-text-faint">Situação atual do sistema, independente do dia escolhido acima.</p>
                    {pendencias.map((p, i) => {
                      const { Icone, rotulo } = CATEGORIAS[p.categoria];
                      const cor = p.nivel === 'critico' ? 'var(--color-danger)' : 'var(--color-pending)';
                      return (
                        <Link key={i} to={p.link} className="list-row group flex flex-wrap items-center gap-3 px-3 py-2.5">
                          <IconBox Icone={Icone} cor={cor} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-semibold text-text">{p.titulo}</span>
                            <span className="block truncate text-[12px] text-text-faint">
                              {rotulo} · {p.detalhe}
                            </span>
                          </span>
                          <Badge tom={p.nivel === 'critico' ? 'perigo' : 'pendente'} texto={p.nivel === 'critico' ? 'Crítica' : 'Atenção'} />
                          <ChevronRight className="h-4 w-4 flex-shrink-0 text-text-faint group-hover:text-text" strokeWidth={2} />
                        </Link>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="-mt-1 mb-1 text-[12px] text-text-faint">Vale só pro dia de hoje — zera sozinha amanhã. Marcada neste aparelho.</p>
                  {TAREFAS_FIXAS.map((t) => {
                    const feita = concluidas.has(t.id);
                    const { Icone, rotulo } = CATEGORIAS[t.categoria];
                    return (
                      <div key={t.id} className="list-row flex items-center gap-3 px-3 py-2.5">
                        <button type="button" onClick={() => alternarFixa(t.id)} aria-label={feita ? 'Desmarcar tarefa' : 'Marcar tarefa como concluída'} className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-icon border border-line transition-transform hover:border-line-strong active:scale-90">
                          {feita ? <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={2} /> : <Circle className="h-4 w-4 text-text-dim" strokeWidth={1.75} />}
                        </button>
                        <Link to={t.link} className={`min-w-0 flex-1 truncate text-[13.5px] hover:text-accent ${feita ? 'text-text-dim line-through' : 'font-medium text-text'}`}>
                          {t.rotulo}
                        </Link>
                        <span className="hidden flex-shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-text-faint sm:flex">
                          <Icone className="h-3 w-3" strokeWidth={2} /> {rotulo}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>

          {/* ══ coluna lateral ══ */}
          <div className="flex min-w-0 flex-col gap-4">
            <Panel>
              <PanelHeader titulo="Ações rápidas" />
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => setNovaAberta(true)} className="flex items-center justify-between rounded-sm bg-accent px-3 py-2.5 text-[13px] font-semibold text-accent-ink hover:bg-accent-strong">
                  <span className="flex items-center gap-2">
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Nova tarefa
                  </span>
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
                {(
                  [
                    { to: '/orcamentos', rotulo: 'Novo orçamento', Icone: Receipt },
                    { to: '/roteiro', rotulo: 'Ver roteiro de hoje', Icone: ListChecks },
                    { to: '/agenda?novo=bloqueio', rotulo: 'Bloquear data', Icone: Lock },
                  ] as const
                ).map(({ to, rotulo, Icone }) => (
                  <Link key={to} to={to} className="flex items-center justify-between rounded-sm border border-line px-3 py-2.5 text-[13px] text-text hover:bg-raised">
                    <span className="flex items-center gap-2">
                      <Icone className="h-3.5 w-3.5 text-text-faint" strokeWidth={2} /> {rotulo}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-text-faint" strokeWidth={2} />
                  </Link>
                ))}
                <button type="button" onClick={irParaPendencias} className="flex items-center justify-between rounded-sm border border-line px-3 py-2.5 text-[13px] text-text hover:bg-raised">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-text-faint" strokeWidth={2} /> Ver pendências
                    {pendencias.length > 0 && <span className={`rounded-full px-1.5 text-[11px] font-semibold ${criticas > 0 ? 'bg-danger/15 text-danger' : 'bg-input text-text-faint'}`}>{pendencias.length}</span>}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-text-faint" strokeWidth={2} />
                </button>
              </div>
            </Panel>

            <Panel>
              <PanelHeader titulo="Próximos eventos" desc="Toque no dia pra ver a rotina dele." />
              {carregando ? (
                <SkeletonLinhas />
              ) : proximosEventos.length === 0 ? (
                <p className="py-2 text-[13px] text-text-dim">Nenhum evento futuro cadastrado.</p>
              ) : (
                <div className="flex flex-col divide-y divide-line">
                  {proximosEventos.map(([data, lista]) => {
                    const d = new Date(`${data}T00:00:00`);
                    const selecionado = data === dataSel;
                    return (
                      <div key={data} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                        <button type="button" onClick={() => setDataSel(data)} aria-label={`Ver rotina de ${dataExtensa(data)}`} className={`flex w-11 flex-shrink-0 flex-col items-center rounded-md py-1 transition-colors ${selecionado ? 'bg-accent/15 text-accent' : 'text-text hover:bg-raised'}`}>
                          <span className="font-mono text-[17px] font-bold leading-tight">{d.getDate()}</span>
                          <span className="font-mono text-[9.5px] uppercase text-text-faint">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                        </button>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          {lista.map((ev) => (
                            <Link key={ev.id} to={`/eventos/${ev.id}`} className="group flex items-start gap-2 text-[12.5px]">
                              <span className="w-10 flex-shrink-0 font-mono text-text-dim">{ev.hora_inicio?.slice(0, 5) ?? '—'}</span>
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-text group-hover:text-accent">{ev.contrato?.lead?.nome ?? 'Evento'}</span>
                                <span className="block truncate text-[11.5px] text-text-faint">{ev.local ?? 'Local não informado'}</span>
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel>
              <PanelHeader titulo="Progresso do dia" />
              <div className="flex items-center gap-4">
                <AnelProgresso percentual={pctDia} tamanho={88} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-text">Tarefas concluídas</p>
                  <div className="my-2">
                    <ProgressBar valor={pctDia} categoria="execucao" />
                  </div>
                  <p className="text-[12px] text-text-dim">{totalTarefas === 0 ? 'Nenhuma tarefa neste dia' : `${totalFeitas} de ${totalTarefas} tarefa${totalTarefas !== 1 ? 's' : ''}`}</p>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelHeader titulo="Resumo do dia" />
              <dl className="flex flex-col gap-2.5 text-[13px]">
                {[
                  { r: 'Convidados esperados', v: convidadosDia > 0 ? String(convidadosDia) : '—' },
                  { r: 'Equipe confirmada', v: escaladosDia.length > 0 ? `${confirmadosDia} de ${escaladosDia.length}` : '—' },
                  { r: 'Vencimentos do dia', v: vencendoNoDia.length > 0 ? `${vencendoNoDia.length} · ${formatarMoeda(vencendoNoDia.reduce((s, l) => s + l.valor, 0))}` : '—' },
                  { r: 'Tarefas da agenda', v: tarefasDia.length > 0 ? `${agendaFeitas} de ${tarefasDia.length}` : '—' },
                ].map(({ r, v }) => (
                  <div key={r} className="flex items-center justify-between gap-3 border-b border-line pb-2.5 last:border-0 last:pb-0">
                    <dt className="text-text-dim">{r}</dt>
                    <dd className="font-mono font-semibold text-text">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </div>
        </div>
      </Conteudo>

      {novaAberta && (
        <Drawer titulo="Nova tarefa" onFechar={() => setNovaAberta(false)}>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              aoCriarTarefa();
            }}
          >
            <p className="text-[12.5px] text-text-faint">Para {dataExtensa(dataSel)}.</p>
            <Input rotulo="Título" categoria="agenda" required autoFocus value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} placeholder="Ex: Ligar pro fornecedor de gelo" />
            <Input rotulo="Horário (opcional)" categoria="agenda" type="time" value={novoHorario} onChange={(e) => setNovoHorario(e.target.value)} />
            <button type="submit" disabled={salvandoTarefa || !novoTitulo.trim()} className="mt-1 rounded-sm bg-accent px-3 py-2.5 text-[13px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
              {salvandoTarefa ? 'Salvando…' : 'Criar tarefa'}
            </button>
          </form>
        </Drawer>
      )}
    </>
  );
}
