import { AlertTriangle, BarChart3, CalendarCheck, CheckCircle2, ChevronRight, Circle, ClipboardCheck, Package, Users, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Cabecalho, Conteudo } from '../components/Layout';
import { listarAuditorias } from '../lib/api/auditoria';
import { diasAteEvento, listarContratos } from '../lib/api/contratos';
import { listarEscalasDosEventos } from '../lib/api/escalas';
import { listarItens } from '../lib/api/estoque';
import { listarEventos } from '../lib/api/eventos';
import { listarLancamentos } from '../lib/api/financeiro';
import { calcularStaffNecessario, funcaoContaComo } from '../lib/staffing';
import { formatarMoeda } from '../lib/status';

// ─── Chave localStorage para tarefas marcadas hoje ───────────────────────────
// Formato: { data: 'YYYY-MM-DD', concluidas: string[] }
const CHAVE_ROTINA = 'emcena_rotina_diaria';

function dataHoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function carregarConcluidas(): Set<string> {
  try {
    const raw = localStorage.getItem(CHAVE_ROTINA);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { data: string; concluidas: string[] };
    // Resetar se for outro dia
    if (parsed.data !== dataHoje()) return new Set();
    return new Set(parsed.concluidas);
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

// ─── Tarefas fixas de rotina (recorrentes todo dia) ──────────────────────────
const TAREFAS_FIXAS = [
  { id: 'leads', categoria: 'comercial', rotulo: 'Verificar novos leads do dia', link: '/crm' },
  { id: 'contratos', categoria: 'comercial', rotulo: 'Revisar contratos com pendência', link: '/contratos' },
  { id: 'equipe', categoria: 'operacional', rotulo: 'Confirmar equipe dos eventos da semana', link: '/escala' },
  { id: 'roteiro', categoria: 'operacional', rotulo: 'Ver roteiro dos eventos de hoje', link: '/roteiro' },
  { id: 'estoque', categoria: 'estoque', rotulo: 'Checar nível de estoque', link: '/estoque' },
  { id: 'financeiro', categoria: 'financeiro', rotulo: 'Revisar lançamentos do dia', link: '/financeiro' },
  { id: 'auditoria', categoria: 'posevento', rotulo: 'Registrar auditorias dos eventos recentes', link: '/auditoria' },
] as const;

function formatarDataExtenso(): string {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

type Alerta = { texto: string; link: string; nivel: 'critico' | 'aviso' };

// ─── Componente de item de alerta dinâmico ────────────────────────────────────
function ItemAlerta({ texto, link, nivel = 'aviso' }: { texto: string; link: string; nivel?: 'critico' | 'aviso' }) {
  return (
    <Link
      to={link}
      className={['group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-raised', nivel === 'critico' ? 'border-l-2 border-danger' : 'border-l-2 border-pending'].join(' ')}
    >
      <AlertTriangle className={['h-3.5 w-3.5 flex-shrink-0', nivel === 'critico' ? 'text-danger' : 'text-pending'].join(' ')} strokeWidth={2} />
      <span className="flex-1 text-[13px] text-text">{texto}</span>
      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-text-dim opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={2} />
    </Link>
  );
}

// ─── Componente de tarefa fixa marcável ───────────────────────────────────────
function ItemTarefa({ id, rotulo, link, concluida, onToggle }: { id: string; rotulo: string; link: string; concluida: boolean; onToggle: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-raised">
      <button type="button" onClick={() => onToggle(id)} className="flex-shrink-0 transition-transform active:scale-90" aria-label={concluida ? 'Desmarcar tarefa' : 'Marcar tarefa como concluída'}>
        {concluida ? <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={2} /> : <Circle className="h-4 w-4 text-text-dim" strokeWidth={1.75} />}
      </button>
      <Link to={link} className={['flex-1 text-[13px] transition-colors hover:text-accent', concluida ? 'text-text-dim line-through' : 'text-text'].join(' ')}>
        {rotulo}
      </Link>
    </div>
  );
}

// ─── Bloco de categoria ───────────────────────────────────────────────────────
function BlocoCategoria({ icone: Icone, titulo, children }: { icone: typeof Package; titulo: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-3">
        <Icone className="h-3.5 w-3.5 flex-shrink-0 text-text-dim" strokeWidth={1.75} />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-text-dim">{titulo}</span>
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RotinaDiaria() {
  const [carregando, setCarregando] = useState(true);
  const [concluidas, setConcluidas] = useState<Set<string>>(carregarConcluidas);

  const [contratos, setContratos] = useState<Awaited<ReturnType<typeof listarContratos>>>([]);
  const [itens, setItens] = useState<Awaited<ReturnType<typeof listarItens>>>([]);
  const [lancamentos, setLancamentos] = useState<Awaited<ReturnType<typeof listarLancamentos>>>([]);
  const [auditorias, setAuditorias] = useState<Awaited<ReturnType<typeof listarAuditorias>>>([]);
  const [eventos, setEventos] = useState<Awaited<ReturnType<typeof listarEventos>>>([]);
  const [escalas, setEscalas] = useState<Awaited<ReturnType<typeof listarEscalasDosEventos>>>([]);

  useEffect(() => {
    let cancelado = false;
    Promise.all([listarContratos(), listarItens(), listarLancamentos(), listarAuditorias(), listarEventos()])
      .then(async ([c, i, l, a, ev]) => {
        if (cancelado) return;
        // escalas dos eventos próximos (7 dias) — segunda leva, precisa
        // saber os ids primeiro (mesmo padrão do Dashboard).
        const idsProximos = ev.filter((e) => e.status !== 'cancelado' && diasAteEvento(e.data_evento) >= 0 && diasAteEvento(e.data_evento) <= 7).map((e) => e.id);
        const esc = await listarEscalasDosEventos(idsProximos).catch(() => []);
        if (cancelado) return;
        setContratos(c);
        setItens(i);
        setLancamentos(l);
        setAuditorias(a);
        setEventos(ev);
        setEscalas(esc);
        setCarregando(false);
      })
      .catch(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, []);

  const hoje = dataHoje();

  // ── COMERCIAL — mesmas regras de negócio de Contratos.tsx (D-20,
  // sinal pendente), aqui só reagrupadas por categoria. ────────────────
  const alertasComercial = useMemo(() => {
    const alertas: Alerta[] = [];
    contratos
      .filter((c) => c.status !== 'cancelado')
      .forEach((c) => {
        const dias = diasAteEvento(c.data_evento);
        if (c.saldo_status !== 'quitado' && dias <= 20) {
          alertas.push({ texto: `${c.lead?.nome ?? 'Contrato'} — saldo pendente, evento em ${dias}d`, link: '/contratos', nivel: dias <= 5 ? 'critico' : 'aviso' });
        }
        if (!c.sinal_pago) {
          alertas.push({ texto: `${c.lead?.nome ?? 'Contrato'} — sinal pendente`, link: '/contratos', nivel: 'aviso' });
        }
      });
    return alertas.slice(0, 5);
  }, [contratos]);

  // ── OPERACIONAL — cobertura real por evento (mesma regra de
  // dimensionamento da Escala: calcularStaffNecessario x escalados
  // ativos), não uma lista genérica de "eventos próximos". ─────────────
  const alertasOperacional = useMemo(() => {
    const escalasPorEvento = new Map<string, typeof escalas>();
    for (const esc of escalas) escalasPorEvento.set(esc.evento_id, [...(escalasPorEvento.get(esc.evento_id) ?? []), esc]);

    const alertas: Alerta[] = [];
    eventos
      .filter((ev) => ev.status !== 'cancelado' && diasAteEvento(ev.data_evento) >= 0 && diasAteEvento(ev.data_evento) <= 7)
      .forEach((ev) => {
        const dias = diasAteEvento(ev.data_evento);
        const necessario = calcularStaffNecessario(ev.convidados);
        const ativos = (escalasPorEvento.get(ev.id) ?? []).filter((e) => e.status !== 'recusado');
        const bartenderAtual = ativos.filter((e) => e.membro && funcaoContaComo(e.membro.funcao) === 'bartender').length;
        const barbackAtual = ativos.filter((e) => e.membro && funcaoContaComo(e.membro.funcao) === 'barback').length;
        const falta = bartenderAtual < necessario.bartender || barbackAtual < necessario.barback;
        if (falta) {
          alertas.push({ texto: `${ev.contrato?.lead?.nome ?? 'Evento'} — equipe incompleta (${dias}d)`, link: `/escala?evento=${ev.id}`, nivel: dias <= 2 ? 'critico' : 'aviso' });
        }
      });
    return alertas.slice(0, 4);
  }, [eventos, escalas]);

  const alertasEstoque = useMemo(() => {
    return itens
      .filter((i) => i.estoque_atual <= i.estoque_minimo)
      .slice(0, 4)
      .map((i) => ({
        texto: `${i.nome} — ${i.estoque_atual === 0 ? 'zerado' : 'abaixo do mínimo'} (${i.estoque_atual}/${i.estoque_minimo} ${i.unidade})`,
        link: '/estoque',
        nivel: (i.estoque_atual === 0 ? 'critico' : 'aviso') as 'critico' | 'aviso',
      }));
  }, [itens]);

  const alertasFinanceiro = useMemo(() => {
    const vencidos = lancamentos.filter((l) => l.status === 'pendente' && l.vencimento && l.vencimento < hoje);
    if (vencidos.length === 0) return [];
    const total = vencidos.reduce((s, l) => s + l.valor, 0);
    return [{ texto: `${vencidos.length} lançamento${vencidos.length > 1 ? 's' : ''} vencido${vencidos.length > 1 ? 's' : ''} — ${formatarMoeda(total)}`, link: '/financeiro', nivel: 'critico' as const }];
  }, [lancamentos, hoje]);

  const alertasPosEvento = useMemo(() => {
    const idsAuditados = new Set(auditorias.map((a) => a.evento_id));
    return eventos
      .filter((ev) => {
        if (ev.status === 'cancelado') return false;
        const dias = diasAteEvento(ev.data_evento);
        return dias < 0 && dias >= -30 && !idsAuditados.has(ev.id);
      })
      .slice(0, 3)
      .map((ev) => ({ texto: `${ev.contrato?.lead?.nome ?? 'Evento'} — auditoria pendente`, link: `/auditoria?evento=${ev.id}`, nivel: 'aviso' as const }));
  }, [eventos, auditorias]);

  const eventosHoje = useMemo(() => eventos.filter((ev) => ev.data_evento === hoje && ev.status !== 'cancelado'), [eventos, hoje]);

  const totalAlertas = alertasComercial.length + alertasOperacional.length + alertasEstoque.length + alertasFinanceiro.length + alertasPosEvento.length;
  const totalConcluidas = concluidas.size;
  const totalTarefas = TAREFAS_FIXAS.length;
  const tudoEmDia = !carregando && totalAlertas === 0;

  function toggleTarefa(id: string) {
    setConcluidas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      salvarConcluidas(novo);
      return novo;
    });
  }

  function tarefasDaCategoria(categoria: (typeof TAREFAS_FIXAS)[number]['categoria']) {
    return TAREFAS_FIXAS.filter((t) => t.categoria === categoria);
  }

  return (
    <>
      <Cabecalho titulo="Rotina Diária" subtitulo={formatarDataExtenso()} />
      <Conteudo>
        {/* ── Resumo do dia ─────────────────────────────────────── */}
        <div className="mb-6 flex items-center gap-3">
          {tudoEmDia ? (
            <span className="flex items-center gap-2 text-[13px] text-success">
              <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
              Tudo em dia — nenhuma pendência crítica
            </span>
          ) : (
            <span className="flex items-center gap-2 text-[13px] text-text-dim">
              <AlertTriangle className="h-4 w-4 text-pending" strokeWidth={2} />
              {totalAlertas} pendência{totalAlertas !== 1 ? 's' : ''} · {totalConcluidas}/{totalTarefas} tarefas concluídas
            </span>
          )}
        </div>

        {/* ── Eventos de hoje (bloco especial) ──────────────────── */}
        {eventosHoje.length > 0 && (
          <section className="mb-6">
            <div className="mb-2 flex items-center gap-2 px-3">
              <CalendarCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">Hoje</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {eventosHoje.map((ev) => (
                <Link key={ev.id} to={`/roteiro?evento=${ev.id}`} className="group flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 px-3 py-3 transition-colors hover:bg-accent/10">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-text">{ev.contrato?.lead?.nome ?? 'Evento sem nome'}</p>
                    <p className="text-[12px] text-text-dim">
                      {ev.hora_inicio?.slice(0, 5) ?? '—'} · {ev.local ?? 'local não informado'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-accent opacity-60 group-hover:opacity-100" strokeWidth={2} />
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mb-6 border-t border-line" />

        {carregando ? (
          <p className="text-sm text-text-dim">Carregando…</p>
        ) : (
          <div className="flex flex-col gap-6">
            <BlocoCategoria icone={ClipboardCheck} titulo="Comercial">
              {alertasComercial.map((a, i) => (
                <ItemAlerta key={i} texto={a.texto} link={a.link} nivel={a.nivel} />
              ))}
              {tarefasDaCategoria('comercial').map((t) => (
                <ItemTarefa key={t.id} id={t.id} rotulo={t.rotulo} link={t.link} concluida={concluidas.has(t.id)} onToggle={toggleTarefa} />
              ))}
            </BlocoCategoria>

            <BlocoCategoria icone={Users} titulo="Operacional">
              {alertasOperacional.map((a, i) => (
                <ItemAlerta key={i} texto={a.texto} link={a.link} nivel={a.nivel} />
              ))}
              {tarefasDaCategoria('operacional').map((t) => (
                <ItemTarefa key={t.id} id={t.id} rotulo={t.rotulo} link={t.link} concluida={concluidas.has(t.id)} onToggle={toggleTarefa} />
              ))}
            </BlocoCategoria>

            <BlocoCategoria icone={Package} titulo="Estoque">
              {alertasEstoque.map((a, i) => (
                <ItemAlerta key={i} texto={a.texto} link={a.link} nivel={a.nivel} />
              ))}
              {tarefasDaCategoria('estoque').map((t) => (
                <ItemTarefa key={t.id} id={t.id} rotulo={t.rotulo} link={t.link} concluida={concluidas.has(t.id)} onToggle={toggleTarefa} />
              ))}
            </BlocoCategoria>

            <BlocoCategoria icone={Wallet} titulo="Financeiro">
              {alertasFinanceiro.map((a, i) => (
                <ItemAlerta key={i} texto={a.texto} link={a.link} nivel={a.nivel} />
              ))}
              {tarefasDaCategoria('financeiro').map((t) => (
                <ItemTarefa key={t.id} id={t.id} rotulo={t.rotulo} link={t.link} concluida={concluidas.has(t.id)} onToggle={toggleTarefa} />
              ))}
            </BlocoCategoria>

            <BlocoCategoria icone={BarChart3} titulo="Pós-evento">
              {alertasPosEvento.map((a, i) => (
                <ItemAlerta key={i} texto={a.texto} link={a.link} nivel={a.nivel} />
              ))}
              {tarefasDaCategoria('posevento').map((t) => (
                <ItemTarefa key={t.id} id={t.id} rotulo={t.rotulo} link={t.link} concluida={concluidas.has(t.id)} onToggle={toggleTarefa} />
              ))}
            </BlocoCategoria>
          </div>
        )}

        {tudoEmDia && (
          <div className="mt-8 flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" strokeWidth={1.5} />
            <p className="text-[15px] font-semibold text-text">Tudo em dia</p>
            <p className="text-[13px] text-text-dim">Nenhuma pendência crítica no sistema.</p>
          </div>
        )}
      </Conteudo>
    </>
  );
}
