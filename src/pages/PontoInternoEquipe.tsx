import { Check, ChevronDown, Download, ExternalLink, MoreVertical, Search, Settings, UserCheck, Users, UserX, X, Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertaBanner } from '../components/AlertaBanner';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { AnelProgresso } from '../components/ui/AnelProgresso';
import { Avatar } from '../components/ui/Avatar';
import { Drawer } from '../components/ui/Drawer';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Input, InputMoeda } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/ProgressBar';
import { atualizarJornadaFuncionario, definirAtivoFuncionario, listarFuncionariosInternos, listarRegistrosDeHoje, listarRegistrosPorPeriodo } from '../lib/api/pontoInterno';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { exportarCsv } from '../lib/exportarCsv';
import { calcularGradePresenca, calcularResumoJornada, dataLocal, formatarMinutos, horaCurta, horaParaMinutos, type EstadoDiaGrade } from '../lib/pontoInternoCalculos';
import { formatarMoeda, normalizarTexto } from '../lib/status';
import { toast } from '../lib/toast';
import type { FuncionarioInterno, PontoInternoRegistro } from '../lib/types';

type Periodo = 'hoje' | 'semana' | 'mes';

const ROTULO_PERIODO: Record<Periodo, string> = { hoje: 'Hoje', semana: 'Últimos 7 dias', mes: 'Este mês' };

/** Dias do período como 'YYYY-MM-DD' LOCAL (mesma data que `dataLocal` usa pra
    agrupar registros) — nunca `toISOString().slice(0,10)`, que é UTC e, depois
    das 21h em Brasília, já vira "amanhã". */
function diasDoPeriodo(periodo: Periodo): string[] {
  const hoje = new Date();
  const qtd = periodo === 'hoje' ? 1 : periodo === 'semana' ? 7 : hoje.getDate();
  return Array.from({ length: qtd }, (_, i) => dataLocal(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (qtd - 1 - i)).toISOString()));
}

function minutosDoRelogio(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function formatarPercentual(v: number): string {
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function CelulaGrade({ estado }: { estado: EstadoDiaGrade }) {
  if (estado === 'N') return <Check className="h-4 w-4 text-success" strokeWidth={2.5} aria-label="Normal" />;
  if (estado === 'A') return <span role="img" aria-label="Atraso" className="h-3 w-3 rounded-full bg-pending" />;
  if (estado === 'E') return <span role="img" aria-label="Hora extra" className="h-3 w-3 rounded-full bg-schedule" />;
  return <X className="h-4 w-4 text-danger" strokeWidth={2.5} aria-label="Sem registro" />;
}

const GRID_LINHA = 'grid items-center gap-3 grid-cols-[minmax(0,1fr)_64px_32px] sm:grid-cols-[minmax(0,1.6fr)_120px_64px_minmax(0,1fr)_32px]';

function LinhaFuncionario({
  f,
  primeiraEntrada,
  ultimo,
  menuAberto,
  onMenu,
  onConfigurar,
  onDesativar,
}: {
  f: FuncionarioInterno;
  primeiraEntrada: PontoInternoRegistro | null;
  ultimo: PontoInternoRegistro | null;
  menuAberto: boolean;
  onMenu: () => void;
  onConfigurar: () => void;
  onDesativar: () => void;
}) {
  const atrasado = !!primeiraEntrada && !!f.horario_entrada_padrao && minutosDoRelogio(primeiraEntrada.horario) > horaParaMinutos(f.horario_entrada_padrao);
  const situacao = !ultimo ? 'Sem registro' : ultimo.tipo === 'entrada' ? 'Em expediente' : `Saiu ${horaCurta(ultimo.horario)}`;
  return (
    <div className={`${GRID_LINHA} border-b border-line px-1 py-2 text-[12.5px] last:border-0`}>
      <span className="flex min-w-0 items-center gap-2.5">
        <Avatar nome={f.nome} categoria="pessoas" tamanho={28} />
        <strong className="truncate font-medium text-text">{f.nome}</strong>
      </span>
      <span className="hidden font-mono text-[12px] text-text-dim sm:block">{f.horario_entrada_padrao && f.horario_saida_padrao ? `${f.horario_entrada_padrao.slice(0, 5)} – ${f.horario_saida_padrao.slice(0, 5)}` : '—'}</span>
      <span className={`font-mono text-[12px] font-semibold ${!primeiraEntrada ? 'text-text-faint' : atrasado ? 'text-pending' : 'text-success'}`} title={atrasado ? 'Chegou depois do horário padrão' : undefined}>
        {primeiraEntrada ? horaCurta(primeiraEntrada.horario) : '—'}
      </span>
      <span className="hidden truncate text-[12px] text-text-dim sm:block">{situacao}</span>
      <div className="relative justify-self-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMenu();
          }}
          aria-label={`Ações de ${f.nome}`}
          aria-haspopup="menu"
          aria-expanded={menuAberto}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-dim transition-colors hover:bg-raised hover:text-text"
        >
          <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
        </button>
        {menuAberto && (
          <div role="menu" className="absolute right-0 top-8 z-20 min-w-[190px] rounded-lg border border-line bg-panel py-1 shadow-lg">
            <button type="button" role="menuitem" onClick={onConfigurar} className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-text hover:bg-raised">
              <Settings className="h-3.5 w-3.5 text-text-dim" strokeWidth={1.75} />
              Configurar jornada
            </button>
            <button type="button" role="menuitem" onClick={onDesativar} className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-danger hover:bg-raised">
              <UserX className="h-3.5 w-3.5" strokeWidth={1.75} />
              Desativar funcionário
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** `/ponto-interno/equipe` (2026-09-19) — painel do gestor do Ponto Interno,
    DENTRO do Layout (sidebar + topbar). Antes vivia espremido na coluna de
    448px da tela do kiosk (`/ponto-interno`), que agora só faz login + bater
    ponto. Usa a sessão principal do gestor (ver `api/pontoInterno.ts`). */
export default function PontoInternoEquipe() {
  const [equipe, setEquipe] = useState<FuncionarioInterno[]>([]);
  const [registrosHoje, setRegistrosHoje] = useState<PontoInternoRegistro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [registrosPeriodo, setRegistrosPeriodo] = useState<PontoInternoRegistro[]>([]);
  const [carregandoPeriodo, setCarregandoPeriodo] = useState(false);

  const [busca, setBusca] = useState('');
  const [gruposFechados, setGruposFechados] = useState<Set<string>>(new Set());
  const [menuAbertoId, setMenuAbertoId] = useState<string | null>(null);

  const [configurandoId, setConfigurandoId] = useState<string | null>(null);
  const [formJornada, setFormJornada] = useState({ horario_entrada_padrao: '', horario_saida_padrao: '', valor_hora: '', valor_hora_extra: '' });
  const [salvandoJornada, setSalvandoJornada] = useState(false);

  async function carregarHoje(inicial: boolean) {
    try {
      const [f, r] = await Promise.all([listarFuncionariosInternos(), listarRegistrosDeHoje()]);
      setEquipe(f);
      setRegistrosHoje(r);
    } catch (e) {
      // atualização em segundo plano que falha não derruba a tela — mantém o
      // último dado bom; só a carga inicial mostra o erro.
      if (inicial) setErro(mensagemDeErro(e));
    } finally {
      if (inicial) setCarregando(false);
    }
  }

  // "Hoje" muda sozinho enquanto o gestor deixa a tela aberta (gente batendo
  // ponto no kiosk) — atualiza a cada 60s, só com a aba visível.
  useEffect(() => {
    carregarHoje(true);
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') carregarHoje(false);
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const dias = useMemo(() => diasDoPeriodo(periodo), [periodo]);

  useEffect(() => {
    setCarregandoPeriodo(true);
    listarRegistrosPorPeriodo(dias[0], dias[dias.length - 1])
      .then(setRegistrosPeriodo)
      .catch(() => setRegistrosPeriodo([]))
      .finally(() => setCarregandoPeriodo(false));
  }, [dias]);

  useEffect(() => {
    if (!menuAbertoId) return;
    const fechar = () => setMenuAbertoId(null);
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && fechar();
    document.addEventListener('click', fechar);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('click', fechar);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [menuAbertoId]);

  const ativos = equipe.filter((f) => f.ativo);
  const inativos = equipe.filter((f) => !f.ativo);

  const registrosDe = (id: string) => registrosHoje.filter((r) => r.funcionario_id === id);
  const primeiraEntradaHoje = (id: string) => registrosDe(id).find((r) => r.tipo === 'entrada') ?? null;
  const ultimoRegistroHoje = (id: string) => {
    const regs = registrosDe(id);
    return regs[regs.length - 1] ?? null;
  };

  const presentes = ativos.filter((f) => ultimoRegistroHoje(f.id) != null);
  const semRegistro = ativos.filter((f) => ultimoRegistroHoje(f.id) == null);
  const pctPresenca = ativos.length > 0 ? (presentes.length / ativos.length) * 100 : 0;

  const termo = normalizarTexto(busca);
  const filtrar = (lista: FuncionarioInterno[]) => (termo ? lista.filter((f) => normalizarTexto(f.nome).includes(termo)) : lista);

  const resumos = useMemo(() => calcularResumoJornada(registrosPeriodo, equipe).filter((r) => r.funcionario.ativo || r.registros > 0), [registrosPeriodo, equipe]);
  const totalAPagar = resumos.reduce((s, r) => s + (r.valorAPagar ?? 0), 0);
  const grade = useMemo(() => calcularGradePresenca(registrosPeriodo, ativos, dias), [registrosPeriodo, ativos, dias]);
  const hoje = dataLocal(new Date().toISOString());

  function alternarGrupo(titulo: string) {
    setGruposFechados((atual) => {
      const novo = new Set(atual);
      if (!novo.delete(titulo)) novo.add(titulo);
      return novo;
    });
  }

  function aoAbrirConfigJornada(f: FuncionarioInterno) {
    setMenuAbertoId(null);
    setConfigurandoId(f.id);
    setFormJornada({
      horario_entrada_padrao: f.horario_entrada_padrao?.slice(0, 5) ?? '',
      horario_saida_padrao: f.horario_saida_padrao?.slice(0, 5) ?? '',
      valor_hora: f.valor_hora != null ? String(f.valor_hora) : '',
      valor_hora_extra: f.valor_hora_extra != null ? String(f.valor_hora_extra) : '',
    });
  }

  async function aoSalvarJornada(id: string) {
    setSalvandoJornada(true);
    try {
      await atualizarJornadaFuncionario(id, {
        horario_entrada_padrao: formJornada.horario_entrada_padrao || null,
        horario_saida_padrao: formJornada.horario_saida_padrao || null,
        valor_hora: formJornada.valor_hora ? Number(formJornada.valor_hora) : null,
        valor_hora_extra: formJornada.valor_hora_extra ? Number(formJornada.valor_hora_extra) : null,
      });
      setEquipe(await listarFuncionariosInternos());
      setConfigurandoId(null);
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setSalvandoJornada(false);
    }
  }

  async function aoAlternarAtivo(f: FuncionarioInterno): Promise<boolean> {
    setMenuAbertoId(null);
    try {
      await definirAtivoFuncionario(f.id, !f.ativo);
      setEquipe(await listarFuncionariosInternos());
      return true;
    } catch (e) {
      toast.erro(mensagemDeErro(e));
      return false;
    }
  }

  const configurando = equipe.find((f) => f.id === configurandoId) ?? null;
  const dataExtenso = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <Cabecalho titulo="Ponto Interno" subtitulo="Controle de presença e horas da sua equipe." />
      <Conteudo>
        {erro && (
          <AlertaBanner tom="perigo" className="mb-4">
            {erro}
          </AlertaBanner>
        )}

        <Panel className="mb-4">
          <PanelHeader
            titulo="Equipe hoje"
            desc={dataExtenso.charAt(0).toUpperCase() + dataExtenso.slice(1)}
            acao={
              <Link to="/ponto-interno" className="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-[12px] font-medium text-text-dim hover:bg-raised hover:text-text">
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} /> Tela de bater ponto
              </Link>
            }
          />
          {carregando ? (
            <SkeletonLinhas />
          ) : (
            <MetricGrid>
              <MetricCard Icone={Users} rotulo="Funcionários" valor={String(ativos.length)} legenda="Ativos na equipe" categoria="pessoas" />
              <MetricCard Icone={UserCheck} rotulo="Presentes" valor={String(presentes.length)} legenda={`${formatarPercentual(pctPresenca)} da equipe`} categoria="pessoas" />
              <MetricCard Icone={Clock} rotulo="Sem registro" valor={String(semRegistro.length)} legenda={`${formatarPercentual(ativos.length > 0 ? 100 - pctPresenca : 0)} da equipe`} categoria="pessoas" />
              <div className="panel-glass flex flex-col items-center gap-2 p-4 text-center sm:flex-row sm:gap-4 sm:text-left">
                <AnelProgresso percentual={pctPresenca} />
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-text-faint">Presença hoje</p>
                  <p className="mt-1 text-[12.5px] text-text-dim">
                    {presentes.length} de {ativos.length} presentes
                  </p>
                </div>
              </div>
            </MetricGrid>
          )}
        </Panel>

        {!carregando && equipe.length === 0 ? (
          <Panel>
            <EstadoVazio Icone={Users} titulo="Nenhum funcionário cadastrado ainda" descricao="A pessoa aparece aqui no primeiro login dela na tela de bater ponto." />
          </Panel>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
              <Panel>
                <PanelHeader
                  titulo="Presença da equipe"
                  desc="Quem já bateu ponto hoje e quem ainda não."
                  acao={
                    <label className="flex items-center gap-2 rounded-sm border border-line bg-input px-2.5 py-1.5 text-text-faint focus-within:border-line-strong">
                      <Search className="h-3.5 w-3.5" strokeWidth={2} />
                      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar funcionário…" aria-label="Buscar funcionário" className="w-40 bg-transparent text-[12.5px] text-text outline-none placeholder:text-text-ultra" />
                    </label>
                  }
                />
                {carregando ? (
                  <SkeletonLinhas />
                ) : (
                  <>
                    {(
                      [
                        { titulo: 'Presentes', lista: filtrar(presentes), ponto: 'bg-success' },
                        { titulo: 'Sem registro', lista: filtrar(semRegistro), ponto: 'bg-pending' },
                      ] as const
                    ).map(({ titulo, lista, ponto }) => {
                      const fechado = gruposFechados.has(titulo);
                      return (
                        <div key={titulo} className="mb-4 last:mb-0">
                          <button type="button" onClick={() => alternarGrupo(titulo)} aria-expanded={!fechado} className="mb-1 flex w-full items-center gap-2 text-left">
                            <span className={`h-2 w-2 rounded-full ${ponto}`} />
                            <span className="text-[13px] font-semibold text-text">
                              {titulo} <span className="font-normal text-text-faint">({lista.length})</span>
                            </span>
                            <ChevronDown className={`h-3.5 w-3.5 text-text-faint transition-transform ${fechado ? '-rotate-90' : ''}`} strokeWidth={2} />
                          </button>
                          {!fechado &&
                            (lista.length === 0 ? (
                              <p className="px-1 py-2 text-[12px] text-text-faint">{termo ? 'Ninguém encontrado nesse grupo.' : 'Ninguém nesse grupo agora.'}</p>
                            ) : (
                              <div>
                                <div className={`${GRID_LINHA} px-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-text-faint`}>
                                  <span>Nome</span>
                                  <span className="hidden sm:block">Horário</span>
                                  <span>Chegada</span>
                                  <span className="hidden sm:block">Situação</span>
                                  <span />
                                </div>
                                {lista.map((f) => (
                                  <LinhaFuncionario
                                    key={f.id}
                                    f={f}
                                    primeiraEntrada={primeiraEntradaHoje(f.id)}
                                    ultimo={ultimoRegistroHoje(f.id)}
                                    menuAberto={menuAbertoId === f.id}
                                    onMenu={() => setMenuAbertoId(menuAbertoId === f.id ? null : f.id)}
                                    onConfigurar={() => aoAbrirConfigJornada(f)}
                                    onDesativar={() => aoAlternarAtivo(f)}
                                  />
                                ))}
                              </div>
                            ))}
                        </div>
                      );
                    })}

                    {inativos.length > 0 && (
                      <div className="mt-4 border-t border-line pt-3">
                        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Desativados — {inativos.length}</p>
                        <div className="flex flex-col gap-1.5">
                          {inativos.map((f) => (
                            <div key={f.id} className="flex items-center justify-between gap-2 rounded-sm border border-line bg-input px-3 py-1.5 text-[12.5px]">
                              <strong className="truncate text-text-faint line-through">{f.nome}</strong>
                              <button type="button" onClick={() => aoAlternarAtivo(f)} className="flex-shrink-0 text-[11.5px] font-medium text-text-dim hover:underline">
                                Reativar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Panel>

              <Panel>
                <PanelHeader
                  titulo="Horas trabalhadas"
                  acao={
                    <button
                      type="button"
                      disabled={registrosPeriodo.length === 0}
                      onClick={() =>
                        exportarCsv(
                          [
                            ['Funcionário', 'Dias trabalhados', 'Registros', 'Horas normais', 'Horas extras', 'Atraso acumulado', 'A pagar'],
                            ...calcularResumoJornada(registrosPeriodo, equipe).map((r) => [
                              r.funcionario.nome,
                              String(r.diasTrabalhados),
                              String(r.registros),
                              formatarMinutos(r.minutosNormais),
                              formatarMinutos(r.minutosExtras),
                              formatarMinutos(r.atrasoMin),
                              r.valorAPagar != null ? formatarMoeda(r.valorAPagar) : '—',
                            ]),
                          ],
                          `ponto-interno-${periodo}`
                        )
                      }
                      className="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] text-text-dim hover:bg-raised hover:text-text disabled:opacity-40"
                    >
                      <Download className="h-3 w-3" strokeWidth={2} />
                      Exportar CSV
                    </button>
                  }
                />
                <div className="mb-3 inline-flex flex-wrap gap-0.5 rounded-sm border border-line bg-input p-0.5" role="tablist" aria-label="Período">
                  {(['hoje', 'semana', 'mes'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="tab"
                      aria-selected={periodo === p}
                      onClick={() => setPeriodo(p)}
                      className={`rounded-[5px] px-3 py-1.5 text-[12px] font-medium transition-colors ${periodo === p ? 'bg-accent text-accent-ink' : 'text-text-dim hover:text-text'}`}
                    >
                      {ROTULO_PERIODO[p]}
                    </button>
                  ))}
                </div>

                {carregando || carregandoPeriodo ? (
                  <SkeletonLinhas />
                ) : (
                  <>
                    <div className="flex flex-col gap-2 lg:max-h-[560px] lg:overflow-y-auto lg:pr-1">
                    {resumos.map((r) => {
                      const taxa = Math.round((r.diasTrabalhados / dias.length) * 100);
                      const aPagarPositivo = r.valorAPagar != null && r.valorAPagar > 0;
                      return (
                        <div key={r.funcionario.id} className="rounded-sm border border-line bg-input px-3 py-3 text-[12.5px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-2.5">
                              <Avatar nome={r.funcionario.nome} categoria="pessoas" tamanho={30} />
                              <span className={`truncate ${r.funcionario.ativo ? 'font-medium text-text' : 'text-text-faint line-through'}`}>{r.funcionario.nome}</span>
                            </span>
                            <span className="flex-shrink-0 text-[11px] text-text-faint">
                              {r.diasTrabalhados} dia(s) · {r.registros} registro(s)
                            </span>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="w-[86px] flex-shrink-0 text-[10px] uppercase leading-tight tracking-wide text-text-faint">Presença no período</span>
                            <div className="flex-1">
                              <ProgressBar valor={taxa} categoria={taxa >= 80 ? 'execucao' : 'acao'} />
                            </div>
                            <span className="w-16 flex-shrink-0 text-right font-mono text-[11px] font-semibold text-text-dim">
                              {r.diasTrabalhados}/{dias.length} · {taxa}%
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-text-faint">Normais</p>
                              <p className="font-mono text-text">{formatarMinutos(r.minutosNormais)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-text-faint">Extras</p>
                              <p className={`font-mono ${r.minutosExtras > 0 ? 'font-semibold text-pending' : 'text-text-faint'}`}>{formatarMinutos(r.minutosExtras)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-text-faint">Atraso</p>
                              <p className={`font-mono ${r.atrasoMin > 0 ? 'font-semibold text-danger' : 'text-text-faint'}`}>{formatarMinutos(r.atrasoMin)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-text-faint">A pagar</p>
                              <p className={`font-mono font-semibold ${aPagarPositivo ? 'text-success' : 'text-text-faint'}`}>{r.valorAPagar != null ? formatarMoeda(r.valorAPagar) : '—'}</p>
                            </div>
                          </div>
                          {!r.jornadaConfigurada && r.funcionario.ativo && (
                            <p className="mt-2 text-[11px] text-pending">Jornada/valor-hora não configurado — use ⋮ → "Configurar jornada" pra separar hora extra e calcular pagamento.</p>
                          )}
                        </div>
                      );
                    })}
                    </div>
                    {totalAPagar > 0 && (
                      <div className="mt-3 flex items-center justify-between border-t border-line px-1 pt-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">Total a pagar no período</span>
                        <strong className="font-mono text-[16px] text-text">{formatarMoeda(totalAPagar)}</strong>
                      </div>
                    )}
                  </>
                )}
              </Panel>
            </div>

            {ativos.length > 0 && (
              <Panel>
                <PanelHeader
                  titulo="Grade de presença"
                  desc={ROTULO_PERIODO[periodo]}
                  acao={
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-dim">
                      <span className="flex items-center gap-1.5"><CelulaGrade estado="N" /> Normal</span>
                      <span className="flex items-center gap-1.5"><CelulaGrade estado="A" /> Atraso</span>
                      <span className="flex items-center gap-1.5"><CelulaGrade estado="E" /> Extra</span>
                      <span className="flex items-center gap-1.5"><CelulaGrade estado="F" /> Sem registro</span>
                    </div>
                  }
                />
                {carregando || carregandoPeriodo ? (
                  <SkeletonLinhas />
                ) : (
                  <div className="overflow-x-auto">
                    <div className="grid items-center" style={{ gridTemplateColumns: `200px repeat(${dias.length}, minmax(44px, 1fr))`, minWidth: `${200 + dias.length * 44}px` }}>
                      <span className="pb-2 text-[10px] font-bold uppercase tracking-wide text-text-faint">Funcionário</span>
                      {dias.map((dia) => {
                        const d = new Date(`${dia}T00:00:00`);
                        return (
                          <span key={dia} className={`pb-2 text-center leading-tight ${dia === hoje ? 'text-accent' : 'text-text-faint'}`}>
                            <span className="block text-[10px] font-semibold uppercase">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                            <span className="block font-mono text-[10px]">{dia.slice(8, 10)}/{dia.slice(5, 7)}</span>
                          </span>
                        );
                      })}
                      {ativos.map((f) => (
                        <div key={f.id} className="contents">
                          <span className="flex items-center gap-2.5 self-stretch border-t border-line py-2 pr-3">
                            <Avatar nome={f.nome} categoria="pessoas" tamanho={26} />
                            <span className="truncate text-[12.5px] text-text">{f.nome}</span>
                          </span>
                          {dias.map((dia) => (
                            <span key={dia} className="flex items-center justify-center self-stretch border-t border-line py-2">
                              <CelulaGrade estado={grade.get(f.id)?.get(dia) ?? 'F'} />
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            )}
          </>
        )}
      </Conteudo>

      {configurando && (
        <Drawer titulo={`Jornada — ${configurando.nome}`} onFechar={() => setConfigurandoId(null)}>
          <div className="flex flex-col gap-3">
            <Input rotulo="Entrada padrão" type="time" value={formJornada.horario_entrada_padrao} onChange={(e) => setFormJornada((v) => ({ ...v, horario_entrada_padrao: e.target.value }))} />
            <Input rotulo="Saída padrão" type="time" value={formJornada.horario_saida_padrao} onChange={(e) => setFormJornada((v) => ({ ...v, horario_saida_padrao: e.target.value }))} />
            <InputMoeda rotulo="Valor/hora normal" value={formJornada.valor_hora} onChange={(e) => setFormJornada((v) => ({ ...v, valor_hora: e.target.value }))} />
            <InputMoeda rotulo="Valor/hora extra" value={formJornada.valor_hora_extra} onChange={(e) => setFormJornada((v) => ({ ...v, valor_hora_extra: e.target.value }))} />
            <div className="mt-2 flex items-center gap-2">
              <button type="button" disabled={salvandoJornada} onClick={() => aoSalvarJornada(configurando.id)} className="flex-1 rounded-sm bg-accent px-3 py-2.5 text-[13px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
                {salvandoJornada ? 'Salvando…' : 'Salvar jornada'}
              </button>
              <button type="button" onClick={() => setConfigurandoId(null)} className="rounded-sm border border-line px-3 py-2.5 text-[13px] text-text-dim hover:bg-raised">
                Cancelar
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </>
  );
}
