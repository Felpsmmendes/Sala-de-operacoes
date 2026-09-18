import type { Session } from '@supabase/supabase-js';
import { Check, Clock, LogIn, LogOut, Settings, ShieldOff, UserCheck, Users } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { atualizarJornadaFuncionario, baterPonto, cadastrarMeuNome, definirAtivoFuncionario, listarFuncionariosInternos, listarMeusRegistrosHoje, listarRegistrosDeHoje, listarRegistrosPorPeriodo, obterMeuFuncionario } from '../lib/api/pontoInterno';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { SkeletonLinhas } from '../components/Skeleton';
import { Avatar } from '../components/ui/Avatar';
import { Drawer } from '../components/ui/Drawer';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Input, InputMoeda } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/ProgressBar';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { formatarMoeda } from '../lib/status';
import { supabasePontoInterno } from '../lib/supabasePontoInterno';
import type { FuncionarioInterno, PontoInternoRegistro, TipoPontoInterno } from '../lib/types';

const SEGUNDOS_ATE_SAIR = 8;

function horaCurta(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function horaParaMinutos(hora: string): number {
  const [h, m] = hora.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

/** Data LOCAL (não UTC) de um timestamp — agrupar por `.slice(0,10)` do
    ISO cru mistura dias errado pra quem bate ponto perto da meia-noite
    em UTC-3 (ex.: 21h de Brasília já é dia seguinte em UTC). */
function dataLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatarMinutos(min: number): string {
  if (min <= 0) return '—';
  return `${Math.floor(min / 60)}h${Math.round(min % 60) > 0 ? ` ${Math.round(min % 60)}min` : ''}`;
}

type ResumoJornada = {
  funcionario: FuncionarioInterno;
  minutosNormais: number;
  minutosExtras: number;
  atrasoMin: number;
  diasTrabalhados: number;
  registros: number;
  jornadaConfigurada: boolean;
  valorAPagar: number | null;
};

/** Agrupa por DIA (jornada/hora extra são um conceito diário — "8h hoje
    + 10h ontem" não é "9h extra hoje"), soma pares entrada→saída de cada
    dia (par quebrado, ex. jornada em andamento, simplesmente não soma
    esse dia — não trava o resto), e compara contra a jornada esperada do
    funcionário pra separar normal de extra. Sem jornada configurada,
    tudo conta como "normal" (não dá pra saber o que seria extra) e
    "valorAPagar" fica null. Sem tolerância (decisão do usuário): 1
    minuto além do horário já conta. */
function calcularResumoJornada(registros: PontoInternoRegistro[], funcionarios: FuncionarioInterno[]): ResumoJornada[] {
  return funcionarios.map((f) => {
    const regs = registros.filter((r) => r.funcionario_id === f.id).sort((a, b) => a.horario.localeCompare(b.horario));

    const porDia = new Map<string, PontoInternoRegistro[]>();
    for (const r of regs) {
      const dia = dataLocal(r.horario);
      if (!porDia.has(dia)) porDia.set(dia, []);
      porDia.get(dia)!.push(r);
    }

    const entradaPadraoMin = f.horario_entrada_padrao ? horaParaMinutos(f.horario_entrada_padrao) : null;
    const saidaPadraoMin = f.horario_saida_padrao ? horaParaMinutos(f.horario_saida_padrao) : null;
    const minutosEsperadosDia = entradaPadraoMin != null && saidaPadraoMin != null ? saidaPadraoMin - entradaPadraoMin : null;
    // jornada virada (saída "antes" da entrada, ex. turno noturno cruzando
    // meia-noite) não é suportada ainda — trata como não configurada em
    // vez de gerar hora extra negativa sem sentido.
    const jornadaConfigurada = minutosEsperadosDia != null && minutosEsperadosDia > 0;

    let minutosNormais = 0;
    let minutosExtras = 0;
    let atrasoMin = 0;
    let diasTrabalhados = 0;

    for (const regsDoDia of porDia.values()) {
      const ordenados = regsDoDia.slice().sort((a, b) => a.horario.localeCompare(b.horario));
      let minutosDoDia = 0;
      let i = 0;
      while (i < ordenados.length - 1) {
        if (ordenados[i].tipo === 'entrada' && ordenados[i + 1].tipo === 'saida') {
          minutosDoDia += (new Date(ordenados[i + 1].horario).getTime() - new Date(ordenados[i].horario).getTime()) / 60_000;
          i += 2;
        } else {
          i++;
        }
      }
      if (minutosDoDia <= 0) continue;
      diasTrabalhados++;

      if (jornadaConfigurada) {
        minutosNormais += Math.min(minutosDoDia, minutosEsperadosDia!);
        minutosExtras += Math.max(0, minutosDoDia - minutosEsperadosDia!);
      } else {
        minutosNormais += minutosDoDia;
      }

      if (entradaPadraoMin != null) {
        const primeiraEntrada = ordenados.find((r) => r.tipo === 'entrada');
        if (primeiraEntrada) {
          const d = new Date(primeiraEntrada.horario);
          const minEntrada = d.getHours() * 60 + d.getMinutes();
          if (minEntrada > entradaPadraoMin) atrasoMin += minEntrada - entradaPadraoMin;
        }
      }
    }

    const valorAPagar = f.valor_hora != null ? (minutosNormais / 60) * f.valor_hora + (minutosExtras / 60) * (f.valor_hora_extra ?? f.valor_hora) : null;

    return { funcionario: f, minutosNormais, minutosExtras, atrasoMin, diasTrabalhados, registros: regs.length, jornadaConfigurada, valorAPagar };
  });
}

/**
 * Ponto Eletrônico DE VERDADE — só pros funcionários fixos da empresa (hoje
 * só o gestor + o chefe dele, crescendo aos poucos), diferente do check-in
 * de freelancer por evento (`/ponto/:eventoId`, sem login, ver Ponto.tsx).
 *
 * Pensado pra rodar num dispositivo FIXO e compartilhado (tablet/computador
 * na entrada) — login de verdade (conta própria no Supabase Auth, criada
 * manualmente pelo gestor no painel do Supabase, já que self-signup
 * continua desligado desde a auditoria de segurança). Cada toque em
 * "bater ponto" desloga a conta sozinho alguns segundos depois, pra deixar
 * a tela pronta pro próximo funcionário sem herdar a sessão de quem bateu
 * antes.
 *
 * Usa um client de Supabase próprio (`supabasePontoInterno`, chave de
 * sessão separada — ver `src/lib/supabasePontoInterno.ts`), então essa
 * tela funciona no MESMO navegador/aba do painel de gestão sem uma sessão
 * derrubar a outra: o gestor pode estar logado administrando o sistema
 * (client `supabase`) e um funcionário logado aqui batendo ponto (client
 * `supabasePontoInterno`) ao mesmo tempo, sem conflito nenhum.
 */
export default function PontoInterno() {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ehGestor, setEhGestor] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function aplicarSessao(novaSessao: Session | null) {
      setSession(novaSessao);
      if (!novaSessao) {
        setEhGestor(null);
        return;
      }
      const { data, error } = await supabasePontoInterno.rpc('eh_gestor');
      if (!cancelado) setEhGestor(error ? false : Boolean(data));
    }

    supabasePontoInterno.auth.getSession().then(({ data }) => {
      aplicarSessao(data.session).finally(() => {
        if (!cancelado) setCarregando(false);
      });
    });
    const { data: assinatura } = supabasePontoInterno.auth.onAuthStateChange((_evento, novaSessao) => aplicarSessao(novaSessao));

    // mesma lógica de "acordar" do AuthContext principal — token de 1h,
    // timer de renovação pausa com a aba em segundo plano/tablet dormindo.
    function aoVoltarVisivel() {
      if (document.visibilityState === 'visible') supabasePontoInterno.auth.refreshSession().catch(() => {});
    }
    document.addEventListener('visibilitychange', aoVoltarVisivel);
    window.addEventListener('focus', aoVoltarVisivel);

    return () => {
      cancelado = true;
      assinatura.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', aoVoltarVisivel);
      window.removeEventListener('focus', aoVoltarVisivel);
    };
  }, []);

  async function entrar(email: string, senha: string) {
    const { error } = await supabasePontoInterno.auth.signInWithPassword({ email, password: senha });
    return { erro: error ? mensagemDeErro(error) : null };
  }

  async function sair() {
    await supabasePontoInterno.auth.signOut();
  }

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erroLogin, setErroLogin] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const [meuFuncionario, setMeuFuncionario] = useState<FuncionarioInterno | null | undefined>(undefined);
  const [registrosHoje, setRegistrosHoje] = useState<PontoInternoRegistro[]>([]);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);

  const [nomeCadastro, setNomeCadastro] = useState('');
  const [cadastrando, setCadastrando] = useState(false);
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);

  const [batendo, setBatendo] = useState(false);
  const [confirmacao, setConfirmacao] = useState<{ tipo: TipoPontoInterno; horario: string } | null>(null);
  const [contagem, setContagem] = useState<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const intervaloRef = useRef<number | null>(null);

  const [equipe, setEquipe] = useState<FuncionarioInterno[] | null>(null);
  const [registrosEquipe, setRegistrosEquipe] = useState<PontoInternoRegistro[]>([]);
  const [periodoRelatorio, setPeriodoRelatorio] = useState<'semana' | 'mes'>('semana');
  const [registrosPeriodo, setRegistrosPeriodo] = useState<PontoInternoRegistro[]>([]);
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(false);
  const [configurandoId, setConfigurandoId] = useState<string | null>(null);
  // formulário sempre em string (inclusive os valores) — os campos viram
  // number|null só na hora de salvar (ver aoSalvarJornada).
  const [formJornada, setFormJornada] = useState({ horario_entrada_padrao: '', horario_saida_padrao: '', valor_hora: '', valor_hora_extra: '' });
  const [salvandoJornada, setSalvandoJornada] = useState(false);

  function pararContagem() {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (intervaloRef.current) window.clearInterval(intervaloRef.current);
    timeoutRef.current = null;
    intervaloRef.current = null;
    setContagem(null);
  }

  function agendarSaida() {
    setContagem(SEGUNDOS_ATE_SAIR);
    intervaloRef.current = window.setInterval(() => setContagem((atual) => (atual != null ? atual - 1 : atual)), 1000);
    timeoutRef.current = window.setTimeout(() => {
      pararContagem();
      sair();
    }, SEGUNDOS_ATE_SAIR * 1000);
  }

  useEffect(() => () => pararContagem(), []);

  async function carregarMeu(userId: string) {
    setErroCarregar(null);
    try {
      const f = await obterMeuFuncionario(userId);
      setMeuFuncionario(f);
      if (f) setRegistrosHoje(await listarMeusRegistrosHoje(f.id));
    } catch (e) {
      setErroCarregar(mensagemDeErro(e));
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      carregarMeu(session.user.id);
    } else {
      // sessão saiu (logout — automático ou manual) — limpa tudo, pro
      // próximo funcionário no dispositivo começar do zero, sem herdar
      // nada de quem usou o kiosk antes.
      setMeuFuncionario(undefined);
      setRegistrosHoje([]);
      setConfirmacao(null);
      setEquipe(null);
      pararContagem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => {
    if (!ehGestor || !session) return;
    Promise.all([listarFuncionariosInternos(), listarRegistrosDeHoje()])
      .then(([f, r]) => {
        setEquipe(f);
        setRegistrosEquipe(r);
      })
      .catch(() => {});
  }, [ehGestor, session, confirmacao]);

  /** Relatório de horas (2026-09-13) — período separado do "hoje" acima,
      só recarrega quando o gestor troca semana/mês, não a cada ponto
      batido. */
  useEffect(() => {
    if (!ehGestor || !session) return;
    setCarregandoRelatorio(true);
    const fim = new Date().toISOString().slice(0, 10);
    const inicio = new Date();
    if (periodoRelatorio === 'semana') inicio.setDate(inicio.getDate() - 7);
    else inicio.setDate(1);
    listarRegistrosPorPeriodo(inicio.toISOString().slice(0, 10), fim)
      .then(setRegistrosPeriodo)
      .catch(() => setRegistrosPeriodo([]))
      .finally(() => setCarregandoRelatorio(false));
  }, [ehGestor, session, periodoRelatorio]);

  function aoAbrirConfigJornada(f: FuncionarioInterno) {
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

  async function aoEntrar(ev: FormEvent) {
    ev.preventDefault();
    setEntrando(true);
    setErroLogin(null);
    const { erro } = await entrar(email, senha);
    if (erro) setErroLogin(erro);
    setEntrando(false);
    setSenha('');
  }

  async function aoCadastrarNome() {
    if (!session?.user?.id || !nomeCadastro.trim()) return;
    setCadastrando(true);
    setErroCadastro(null);
    try {
      setMeuFuncionario(await cadastrarMeuNome(session.user.id, nomeCadastro.trim()));
    } catch (e) {
      setErroCadastro(mensagemDeErro(e));
    } finally {
      setCadastrando(false);
    }
  }

  const ultimoTipo = registrosHoje[registrosHoje.length - 1]?.tipo ?? null;
  const proximoTipo: TipoPontoInterno = ultimoTipo === 'entrada' ? 'saida' : 'entrada';

  // Presentes/Sem registro hoje (2026-09-18, REVIEW_DECISOES_V2 Parte
  // 6/12, P1) — só entre os ATIVOS: desativado não é "sem registro", é
  // outra situação (fica numa seção própria, separada, mais abaixo).
  const equipeAtiva = equipe?.filter((f) => f.ativo) ?? [];
  const equipeInativa = equipe?.filter((f) => !f.ativo) ?? [];
  function ultimoRegistroHoje(funcionarioId: string) {
    const regs = registrosEquipe.filter((r) => r.funcionario_id === funcionarioId);
    return regs[regs.length - 1] ?? null;
  }
  const presentesHoje = equipeAtiva.filter((f) => ultimoRegistroHoje(f.id) != null);
  const semRegistroHoje = equipeAtiva.filter((f) => ultimoRegistroHoje(f.id) == null);

  async function aoBaterPonto() {
    if (!meuFuncionario) return;
    setBatendo(true);
    try {
      await baterPonto(meuFuncionario.id, proximoTipo);
      const atualizados = await listarMeusRegistrosHoje(meuFuncionario.id);
      setRegistrosHoje(atualizados);
      setConfirmacao({ tipo: proximoTipo, horario: atualizados[atualizados.length - 1].horario });
      agendarSaida();
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setBatendo(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="rounded-lg border border-line bg-panel p-6">
          <div className="mb-5 flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-sm bg-gradient-to-br from-accent-strong to-accent text-accent-ink"
              style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.35), 0 2px 6px -1px rgba(0,0,0,0.4)' }}
            >
              <Clock className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <p className="text-sm font-semibold text-text">Ponto Eletrônico</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-faint">Em Cena · Equipe interna</p>
            </div>
          </div>

          {carregando ? (
            <SkeletonLinhas />
          ) : !session ? (
            <form onSubmit={aoEntrar} className="flex flex-col gap-3">
              <Input rotulo="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input rotulo="Senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
              {erroLogin && <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erroLogin}</p>}
              <button type="submit" disabled={entrando} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
                {entrando ? 'Entrando…' : 'Entrar'}
              </button>
              <p className="text-center text-[11.5px] text-text-faint">Conta criada pelo gestor — sem conta própria, fale com ele.</p>
            </form>
          ) : erroCarregar ? (
            <div className="flex flex-col gap-3">
              <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erroCarregar}</p>
              <button type="button" onClick={sair} className="rounded-sm border border-line px-4 py-2.5 text-sm font-medium text-text-dim hover:bg-raised hover:text-text">
                Sair
              </button>
            </div>
          ) : meuFuncionario === undefined ? (
            <SkeletonLinhas />
          ) : meuFuncionario === null ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-dim">Primeiro acesso — qual é o seu nome?</p>
              <Input value={nomeCadastro} onChange={(e) => setNomeCadastro(e.target.value)} placeholder="Nome completo" />
              {erroCadastro && <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erroCadastro}</p>}
              <button type="button" disabled={cadastrando || !nomeCadastro.trim()} onClick={aoCadastrarNome} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
                {cadastrando ? 'Salvando…' : 'Continuar'}
              </button>
            </div>
          ) : !meuFuncionario.ativo ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <ShieldOff className="h-8 w-8 text-danger" strokeWidth={1.75} />
              <p className="text-sm text-text-dim">Seu acesso ao Ponto Eletrônico foi desativado. Fale com o gestor.</p>
              <button type="button" onClick={sair} className="rounded-sm border border-line px-4 py-2.5 text-sm font-medium text-text-dim hover:bg-raised hover:text-text">
                Sair
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-text">
                Olá, <strong>{meuFuncionario.nome}</strong>!
              </p>

              {registrosHoje.length > 0 && (
                <div className="flex flex-col gap-1.5 rounded-sm border border-line bg-input px-3 py-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Hoje</p>
                  {registrosHoje.map((r) => (
                    <p key={r.id} className="text-[12.5px] text-text-dim">
                      {r.tipo === 'entrada' ? 'Entrada' : 'Saída'} · <span className="font-mono text-text">{horaCurta(r.horario)}</span>
                    </p>
                  ))}
                </div>
              )}

              {confirmacao ? (
                <div className="flex flex-col items-center gap-3 rounded-sm border border-success/30 bg-success/10 px-4 py-5 text-center">
                  <Check className="h-8 w-8 text-success" strokeWidth={2} />
                  <p className="text-sm text-success">
                    {confirmacao.tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada às <strong className="font-mono">{horaCurta(confirmacao.horario)}</strong>
                  </p>
                  <p className="text-[12px] text-text-dim">{contagem != null ? `Saindo em ${contagem}s, pra deixar pronto pro próximo…` : ''}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={sair} className="rounded-sm bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong">
                      Sair agora
                    </button>
                    <button type="button" onClick={pararContagem} className="rounded-sm border border-line px-3 py-1.5 text-[12.5px] text-text-dim hover:bg-raised hover:text-text">
                      Ficar conectado
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={batendo}
                    onClick={aoBaterPonto}
                    className={`flex items-center justify-center gap-2 rounded-md px-4 py-5 text-base font-semibold disabled:opacity-50 ${
                      proximoTipo === 'entrada' ? 'bg-accent text-accent-ink hover:bg-accent-strong' : 'border border-line text-text hover:bg-raised'
                    }`}
                  >
                    {proximoTipo === 'entrada' ? <LogIn className="h-5 w-5" strokeWidth={2} /> : <LogOut className="h-5 w-5" strokeWidth={2} />}
                    {batendo ? 'Registrando…' : proximoTipo === 'entrada' ? 'Bater entrada' : 'Bater saída'}
                  </button>
                  <button type="button" onClick={sair} className="text-center text-[11.5px] text-text-faint hover:text-text-dim hover:underline">
                    Sair sem bater ponto
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* painel do gestor: panorama de todo mundo — RLS já garante que só
            a conta travada em eh_gestor() recebe esses dados.
            REVIEW_DECISOES_V2 Parte 6/12, P1: MetricGrid só de hoje +
            Presentes/Sem registro separados (nunca "falta" — o sistema
            não sabe o motivo de quem não bateu ponto ainda). */}
        {ehGestor && equipe && (
          <div className="rounded-lg border border-line bg-panel p-5">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-text-faint" strokeWidth={2} />
              <p className="text-[13px] font-semibold text-text">Equipe interna hoje</p>
            </div>
            {equipe.length === 0 ? (
              <EstadoVazio Icone={Users} titulo="Nenhum funcionário cadastrado ainda" descricao="A pessoa aparece aqui no primeiro login dela." />
            ) : (
              <>
                <MetricGrid>
                  <MetricCard Icone={Users} rotulo="Funcionários" valor={String(equipeAtiva.length)} legenda="Ativos" categoria="pessoas" />
                  <MetricCard Icone={UserCheck} rotulo="Presentes" valor={String(presentesHoje.length)} legenda="Bateram ponto hoje" categoria="pessoas" />
                  <MetricCard Icone={Clock} rotulo="Sem registro" valor={String(semRegistroHoje.length)} legenda="Ainda não bateram hoje" categoria="pessoas" />
                </MetricGrid>

                {([
                  { titulo: 'Presentes', lista: presentesHoje },
                  { titulo: 'Sem registro', lista: semRegistroHoje },
                ] as const).map(({ titulo, lista }) => (
                  <div key={titulo} className="mt-4">
                    <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                      {titulo} — {lista.length}
                    </p>
                    {lista.length === 0 ? (
                      <p className="text-[12px] text-text-faint">Ninguém nesse grupo agora.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {lista.map((f) => {
                          const ultimo = ultimoRegistroHoje(f.id);
                          const status = !ultimo ? 'Sem registro' : ultimo.tipo === 'entrada' ? `Entrada ${horaCurta(ultimo.horario)}` : `Saiu ${horaCurta(ultimo.horario)}`;
                          const jornadaConfigurada = f.horario_entrada_padrao && f.horario_saida_padrao;
                          return (
                            <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-line bg-input px-3 py-1.5 text-[12.5px]">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${ultimo ? 'bg-success' : 'border border-line'}`} />
                                <strong className="truncate text-text">{f.nome}</strong>
                                <span className="flex-shrink-0 font-mono text-text-faint">{status}</span>
                                {jornadaConfigurada && (
                                  <span className="hidden flex-shrink-0 font-mono text-[11px] text-text-faint sm:inline">
                                    {f.horario_entrada_padrao!.slice(0, 5)}–{f.horario_saida_padrao!.slice(0, 5)}
                                  </span>
                                )}
                              </span>
                              <button type="button" onClick={() => aoAbrirConfigJornada(f)} className="flex flex-shrink-0 items-center gap-1 text-[11.5px] font-medium text-text-dim hover:underline">
                                <Settings className="h-3 w-3" strokeWidth={2} /> Configurar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {/* Desativados — não entra na conta de presente/sem registro
                    (não é a mesma pergunta: aqui é "essa pessoa ainda
                    trabalha aqui", não "bateu ponto hoje"). */}
                {equipeInativa.length > 0 && (
                  <div className="mt-4 border-t border-line pt-3">
                    <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Desativados — {equipeInativa.length}</p>
                    <div className="flex flex-col gap-1.5">
                      {equipeInativa.map((f) => (
                        <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-line bg-input px-3 py-1.5 text-[12.5px]">
                          <strong className="truncate text-text-faint line-through">{f.nome}</strong>
                          <button
                            type="button"
                            onClick={() => definirAtivoFuncionario(f.id, true).then(() => listarFuncionariosInternos().then(setEquipe))}
                            className="flex-shrink-0 text-[11.5px] font-medium text-text-dim hover:underline"
                          >
                            Reativar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Drawer de configuração de jornada (2026-09-18,
            REVIEW_DECISOES_V2 Parte 6/12, P1 — "Drawer para configuração
            de jornada") — antes era um form inline que expandia dentro da
            própria linha; virou painel lateral, mesmo padrão que a Parte
            5 do review pede pra configuração por item em qualquer tela. */}
        {configurandoId && (
          <Drawer titulo={`Jornada — ${equipe?.find((f) => f.id === configurandoId)?.nome ?? ''}`} onFechar={() => setConfigurandoId(null)}>
            <div className="flex flex-col gap-3">
              <Input rotulo="Entrada padrão" type="time" value={formJornada.horario_entrada_padrao} onChange={(e) => setFormJornada((v) => ({ ...v, horario_entrada_padrao: e.target.value }))} />
              <Input rotulo="Saída padrão" type="time" value={formJornada.horario_saida_padrao} onChange={(e) => setFormJornada((v) => ({ ...v, horario_saida_padrao: e.target.value }))} />
              <InputMoeda rotulo="Valor/hora normal" value={formJornada.valor_hora} onChange={(e) => setFormJornada((v) => ({ ...v, valor_hora: e.target.value }))} />
              <InputMoeda rotulo="Valor/hora extra" value={formJornada.valor_hora_extra} onChange={(e) => setFormJornada((v) => ({ ...v, valor_hora_extra: e.target.value }))} />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={salvandoJornada}
                  onClick={() => aoSalvarJornada(configurandoId)}
                  className="flex-1 rounded-sm bg-accent px-3 py-2.5 text-[13px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
                >
                  {salvandoJornada ? 'Salvando…' : 'Salvar jornada'}
                </button>
                <button type="button" onClick={() => setConfigurandoId(null)} className="rounded-sm border border-line px-3 py-2.5 text-[13px] text-text-dim hover:bg-raised">
                  Cancelar
                </button>
              </div>
              {equipe?.find((f) => f.id === configurandoId) && (
                <button
                  type="button"
                  onClick={() => {
                    const f = equipe.find((x) => x.id === configurandoId)!;
                    definirAtivoFuncionario(f.id, !f.ativo)
                      .then(() => listarFuncionariosInternos().then(setEquipe))
                      .then(() => setConfigurandoId(null));
                  }}
                  className="text-center text-[11.5px] font-medium text-text-faint hover:text-danger hover:underline"
                >
                  {equipe.find((f) => f.id === configurandoId)!.ativo ? 'Desativar acesso desta pessoa' : 'Reativar acesso desta pessoa'}
                </button>
              )}
            </div>
          </Drawer>
        )}

        {/* relatório de horas por período (2026-09-13) — separado do
            "hoje" acima: soma pares entrada/saída dentro da janela
            escolhida, não trava se alguém esqueceu de bater a saída. */}
        {ehGestor && equipe && (
          <div className="mt-4 rounded-lg border border-line bg-panel p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-text">Horas trabalhadas</p>
              <div className="inline-flex gap-0.5 rounded-sm border border-line bg-input p-0.5">
                {(['semana', 'mes'] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setPeriodoRelatorio(p)} className={`rounded-[5px] px-3 py-1 text-[12px] font-medium transition-colors ${periodoRelatorio === p ? 'bg-raised text-text' : 'text-text-dim hover:text-text'}`}>
                    {p === 'semana' ? 'Últimos 7 dias' : 'Este mês'}
                  </button>
                ))}
              </div>
            </div>

            {carregandoRelatorio ? (
              <SkeletonLinhas />
            ) : equipe.length === 0 ? (
              <p className="text-[12.5px] text-text-dim">Nenhum funcionário ainda.</p>
            ) : (
              (() => {
                const resumos = calcularResumoJornada(registrosPeriodo, equipe);
                const totalAPagar = resumos.reduce((s, r) => s + (r.valorAPagar ?? 0), 0);
                // dias do período em janela (2026-09-17, "P2/P3") — mesma
                // janela usada na busca acima (`inicio`): 7 dias fixos, ou
                // do dia 1 até hoje ("mes" não é o mês inteiro, é o
                // decorrido dele).
                const diasNoPeriodo = periodoRelatorio === 'semana' ? 7 : new Date().getDate();
                return (
                  <div className="flex flex-col gap-2">
                    {resumos.map((r) => {
                      const taxaPresenca = Math.round((r.diasTrabalhados / diasNoPeriodo) * 100);
                      return (
                      <div key={r.funcionario.id} className="rounded-sm border border-line bg-input px-3 py-2.5 text-[12.5px]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <Avatar nome={r.funcionario.nome} categoria="pessoas" tamanho={26} />
                            <span className={r.funcionario.ativo ? 'font-medium text-text' : 'text-text-faint line-through'}>{r.funcionario.nome}</span>
                          </span>
                          <span className="text-[11px] text-text-faint">
                            {r.diasTrabalhados} dia(s) · {r.registros} registro(s)
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="w-24 flex-shrink-0 text-[10px] uppercase tracking-wide text-text-faint">Presença no período</span>
                          <div className="flex-1">
                            <ProgressBar valor={taxaPresenca} categoria={taxaPresenca >= 80 ? 'execucao' : taxaPresenca >= 60 ? 'acao' : 'acao'} />
                          </div>
                          <span className={`font-mono text-[11px] font-semibold ${taxaPresenca >= 80 ? 'text-execucao' : taxaPresenca >= 60 ? 'text-pending' : 'text-danger'}`}>{taxaPresenca}%</span>
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-text-faint">Normais</p>
                            <p className="font-mono text-text">{formatarMinutos(r.minutosNormais)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-text-faint">Extras</p>
                            <p className={`font-mono ${r.minutosExtras > 0 ? 'font-semibold text-pending' : 'text-text-faint'}`}>{formatarMinutos(r.minutosExtras)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-text-faint">Atraso acumulado</p>
                            <p className={`font-mono ${r.atrasoMin > 0 ? 'font-semibold text-danger' : 'text-text-faint'}`}>{formatarMinutos(r.atrasoMin)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-text-faint">A pagar</p>
                            <p className="font-mono font-semibold text-success">{r.valorAPagar != null ? formatarMoeda(r.valorAPagar) : '—'}</p>
                          </div>
                        </div>
                        {!r.jornadaConfigurada && <p className="mt-1.5 text-[11px] text-pending">Jornada/valor-hora não configurado — clique em "Configurar" acima pra separar hora extra e calcular pagamento.</p>}
                      </div>
                      );
                    })}
                    {totalAPagar > 0 && (
                      <div className="flex items-center justify-between rounded-sm border border-success/25 bg-success/10 px-3 py-2.5 text-[12.5px]">
                        <strong className="text-text">Total a pagar no período</strong>
                        <strong className="font-mono text-success">{formatarMoeda(totalAPagar)}</strong>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
