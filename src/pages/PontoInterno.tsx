import type { Session } from '@supabase/supabase-js';
import { Check, Clock, LogIn, LogOut, ShieldOff, Users } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { baterPonto, cadastrarMeuNome, definirAtivoFuncionario, listarFuncionariosInternos, listarMeusRegistrosHoje, listarRegistrosDeHoje, obterMeuFuncionario } from '../lib/api/pontoInterno';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { supabasePontoInterno } from '../lib/supabasePontoInterno';
import type { FuncionarioInterno, PontoInternoRegistro, TipoPontoInterno } from '../lib/types';

const SEGUNDOS_ATE_SAIR = 8;

function horaCurta(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
      window.alert(mensagemDeErro(e));
    } finally {
      setBatendo(false);
    }
  }

  const campo = 'w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-neutral';

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
            <p className="text-sm text-text-dim">Carregando…</p>
          ) : !session ? (
            <form onSubmit={aoEntrar} className="flex flex-col gap-3">
              <label>
                <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">E-mail</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
              </label>
              <label>
                <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Senha</span>
                <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} />
              </label>
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
            <p className="text-sm text-text-dim">Carregando…</p>
          ) : meuFuncionario === null ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-dim">Primeiro acesso — qual é o seu nome?</p>
              <input value={nomeCadastro} onChange={(e) => setNomeCadastro(e.target.value)} placeholder="Nome completo" className={campo} />
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
            a conta travada em eh_gestor() recebe esses dados. */}
        {ehGestor && equipe && (
          <div className="rounded-lg border border-line bg-panel p-5">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-text-faint" strokeWidth={2} />
              <p className="text-[13px] font-semibold text-text">Equipe interna hoje</p>
            </div>
            {equipe.length === 0 ? (
              <p className="text-[12.5px] text-text-dim">Nenhum funcionário cadastrado ainda — a pessoa aparece aqui no primeiro login dela.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {equipe.map((f) => {
                  const registros = registrosEquipe.filter((r) => r.funcionario_id === f.id);
                  const ultimo = registros[registros.length - 1];
                  const status = !ultimo ? 'Não bateu ponto hoje' : ultimo.tipo === 'entrada' ? `Entrada às ${horaCurta(ultimo.horario)}` : `Saiu às ${horaCurta(ultimo.horario)}`;
                  return (
                    <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-line bg-input px-3 py-2 text-[12.5px]">
                      <div>
                        <strong className={f.ativo ? 'text-text' : 'text-text-faint line-through'}>{f.nome}</strong>
                        <span className="ml-2 text-text-faint">{status}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => definirAtivoFuncionario(f.id, !f.ativo).then(() => listarFuncionariosInternos().then(setEquipe))}
                        className="text-[11.5px] font-medium text-text-dim hover:underline"
                      >
                        {f.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
