import { LogOut, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Cabecalho, Conteudo } from '../components/Layout';
import { ConfigPix } from '../components/contratos/ConfigPix';
import { Panel, PanelHeader } from '../components/Panel';
import { Skeleton } from '../components/Skeleton';
import { Input } from '../components/ui/Input';
import { useAuth } from '../lib/AuthContext';
import { listarGestores } from '../lib/api/gestores';
import { carregarAlertaSatisfacaoNota, salvarAlertaSatisfacaoNota } from '../lib/configAlertas';
import { carregarDadosEmpresa, salvarDadosEmpresa, type DadosEmpresa } from '../lib/dadosEmpresa';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { formatarData } from '../lib/status';
import type { Gestor } from '../lib/types';

const CHAVE_META_MENSAL = 'emcena_meta_mensal';

/** Sidebar Conta×Sistema (REVIEW_DECISOES_V2, Parte 14/16, P2) — "escala
    melhor que grid fixo". Sub-rota própria por item (`/configuracoes/
    operacional`) é o que o documento pede pro mobile; ficou como estado
    de aba na mesma rota em vez disso (`secaoAtiva`) pra não abrir mão do
    "salvamento por seção" (que já existia, cada Panel salva sozinho) só
    por causa de roteamento — o comportamento visto pelo usuário é o
    mesmo, só sem URL própria por seção. */
type Secao = 'perfil' | 'seguranca' | 'acessos' | 'operacional' | 'financeiro' | 'empresa';
const GRUPOS_SECAO: { titulo: string; itens: { id: Secao; rotulo: string }[] }[] = [
  {
    titulo: 'Conta',
    itens: [
      { id: 'perfil', rotulo: 'Perfil' },
      { id: 'seguranca', rotulo: 'Segurança' },
      { id: 'acessos', rotulo: 'Acessos' },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      { id: 'operacional', rotulo: 'Operacional' },
      { id: 'financeiro', rotulo: 'Financeiro' },
      { id: 'empresa', rotulo: 'Empresa' },
    ],
  },
];

export default function Configuracoes() {
  const [secaoAtiva, setSecaoAtiva] = useState<Secao>('perfil');
  const { session, sair, atualizarNome, atualizarSenha } = useAuth();
  const email = session?.user?.email ?? '—';
  const nomeAtual = (session?.user?.user_metadata as { nome?: string } | undefined)?.nome ?? '';
  const cargoAtual = (session?.user?.user_metadata as { cargo?: string } | undefined)?.cargo ?? '';

  const [gestores, setGestores] = useState<Gestor[] | null>(null);
  const [erroGestores, setErroGestores] = useState<string | null>(null);
  useEffect(() => {
    listarGestores()
      .then(setGestores)
      .catch((e) => setErroGestores(mensagemDeErro(e)));
  }, []);

  const [nome, setNome] = useState(nomeAtual);
  const [cargo, setCargo] = useState(cargoAtual);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [msgNome, setMsgNome] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const [senhaNova, setSenhaNova] = useState('');
  const [senhaConfirma, setSenhaConfirma] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // Meta de faturamento mensal (2026-09-17, "master redesign") — só
  // referência pro Fechamento Mensal calcular % de atingimento; não é
  // dado de negócio real, então localStorage basta (regra global do
  // prompt: nada de tabela nova no Supabase pra isso).
  const [metaMensal, setMetaMensal] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(CHAVE_META_MENSAL) ?? 0);
    } catch {
      return 0;
    }
  });
  const [salvandoMeta, setSalvandoMeta] = useState(false);

  // Thresholds (REVIEW_DECISOES_V2, Parte 14/16, P2) — ver
  // src/lib/configAlertas.ts pro porquê só este e não o de proximidade
  // de evento (D-20 é regra fixa do PRD, não um alerta ajustável).
  const [alertaSatisfacaoNota, setAlertaSatisfacaoNota] = useState<number>(carregarAlertaSatisfacaoNota);
  const [salvandoAlertas, setSalvandoAlertas] = useState(false);

  function aoSalvarOperacional() {
    setSalvandoMeta(true);
    setSalvandoAlertas(true);
    try {
      localStorage.setItem(CHAVE_META_MENSAL, String(metaMensal));
      salvarAlertaSatisfacaoNota(alertaSatisfacaoNota);
      toast.sucesso('Configurações operacionais salvas.');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setSalvandoMeta(false);
      setSalvandoAlertas(false);
    }
  }

  // Dados da empresa (2026-09-18, REVIEW_DECISOES_V2 Parte 6/14, P1) —
  // só os campos que os PDFs (proposta comercial) de fato usam. Mesma
  // lógica de localStorage do ConfigPix/meta mensal — configuração local
  // do negócio, não dado compartilhado no banco.
  const [dadosEmpresa, setDadosEmpresa] = useState<DadosEmpresa>(carregarDadosEmpresa);
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);

  function aoSalvarEmpresa() {
    setSalvandoEmpresa(true);
    try {
      salvarDadosEmpresa(dadosEmpresa);
      toast.sucesso('Dados da empresa salvos.');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setSalvandoEmpresa(false);
    }
  }

  async function aoSalvarNome() {
    setSalvandoNome(true);
    setMsgNome(null);
    const { erro } = await atualizarNome(nome.trim(), cargo.trim());
    setMsgNome(erro ? { tipo: 'erro', texto: erro } : { tipo: 'ok', texto: 'Perfil atualizado.' });
    setSalvandoNome(false);
  }

  async function aoSalvarSenha() {
    setMsgSenha(null);
    if (senhaNova.length < 6) {
      setMsgSenha({ tipo: 'erro', texto: 'A senha precisa ter pelo menos 6 caracteres.' });
      return;
    }
    if (senhaNova !== senhaConfirma) {
      setMsgSenha({ tipo: 'erro', texto: 'As senhas não conferem.' });
      return;
    }
    setSalvandoSenha(true);
    const { erro } = await atualizarSenha(senhaNova);
    if (erro) {
      setMsgSenha({ tipo: 'erro', texto: erro });
    } else {
      setMsgSenha({ tipo: 'ok', texto: 'Senha atualizada com sucesso.' });
      setSenhaNova('');
      setSenhaConfirma('');
    }
    setSalvandoSenha(false);
  }

  return (
    <>
      <Cabecalho titulo="Configurações" subtitulo="Perfil, senha e sessão do gestor." />
      <Conteudo>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr] lg:items-start">
          <nav className="flex gap-4 overflow-x-auto lg:flex-col lg:gap-5 lg:overflow-visible">
            {GRUPOS_SECAO.map((grupo) => (
              <div key={grupo.titulo} className="flex-shrink-0">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-faint">{grupo.titulo}</p>
                <div className="flex gap-1 lg:flex-col lg:gap-0.5">
                  {grupo.itens.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSecaoAtiva(item.id)}
                      className={`whitespace-nowrap rounded-sm px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors ${
                        secaoAtiva === item.id ? 'bg-raised text-accent' : 'text-text-dim hover:bg-raised hover:text-text'
                      }`}
                    >
                      {item.rotulo}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="flex flex-col gap-4">
            {secaoAtiva === 'perfil' && (
              <Panel>
                <PanelHeader titulo="Perfil" desc="Sistema de usuário único — sem cadastro de equipe aqui (freelancers ficam em Escala & Equipe)." />
                <div className="flex flex-col gap-4">
                  <Input rotulo="E-mail (login)" value={email} disabled />
                  <Input rotulo="Nome de exibição" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Felipe" />
                  <Input
                    rotulo="Cargo / função"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="Ex: Coordenador Geral, Sócio-Diretor…"
                  />
                  {msgNome && <p className={`text-[12.5px] ${msgNome.tipo === 'erro' ? 'text-danger' : 'text-success'}`}>{msgNome.texto}</p>}
                  <button
                    type="button"
                    onClick={aoSalvarNome}
                    disabled={salvandoNome || (nome.trim() === nomeAtual && cargo.trim() === cargoAtual)}
                    className="self-start rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
                  >
                    {salvandoNome ? 'Salvando…' : 'Salvar perfil'}
                  </button>
                </div>
              </Panel>
            )}

            {secaoAtiva === 'seguranca' && (
              <>
                <Panel>
                  <PanelHeader titulo="Segurança" desc="Trocar a senha de acesso ao sistema." />
                  <div className="flex flex-col gap-4">
                    <Input rotulo="Nova senha" type="password" value={senhaNova} onChange={(e) => setSenhaNova(e.target.value)} placeholder="Mínimo 6 caracteres" />
                    <Input rotulo="Confirmar nova senha" type="password" value={senhaConfirma} onChange={(e) => setSenhaConfirma(e.target.value)} />
                    {msgSenha && <p className={`text-[12.5px] ${msgSenha.tipo === 'erro' ? 'text-danger' : 'text-success'}`}>{msgSenha.texto}</p>}
                    <button
                      type="button"
                      onClick={aoSalvarSenha}
                      disabled={salvandoSenha || !senhaNova || !senhaConfirma}
                      className="self-start rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
                    >
                      {salvandoSenha ? 'Salvando…' : 'Atualizar senha'}
                    </button>
                  </div>
                </Panel>

                <Panel>
                  <PanelHeader titulo="Sessão" desc="Encerrar o acesso neste navegador." />
                  <button type="button" onClick={sair} className="flex items-center gap-2 rounded-sm border border-line px-4 py-2.5 text-sm font-medium text-text-dim hover:bg-raised hover:text-danger">
                    <LogOut className="h-4 w-4" strokeWidth={2} />
                    Sair da conta
                  </button>
                </Panel>
              </>
            )}

            {secaoAtiva === 'acessos' && (
              <Panel>
                <PanelHeader titulo="Quem tem acesso" desc="Contas com acesso total ao sistema — adicionar uma nova é manual pelo SQL Editor do Supabase (ver migration_030), de propósito." />
                {erroGestores ? (
                  <p className="text-[12.5px] text-text-dim">Ainda não disponível — rode a migração mais recente no Supabase (20260102000029_030_multiplos_gestores.sql).</p>
                ) : !gestores ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} h="38px" className="rounded-sm" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {gestores.map((g) => (
                      <div key={g.id} className="flex items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-[12.5px]">
                        <span className="flex items-center gap-1.5 text-text">
                          <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-success" strokeWidth={2} />
                          {g.nome || g.id}
                        </span>
                        <span className="text-text-faint">desde {formatarData(g.criado_em)}</span>
                      </div>
                    ))}
                    {gestores.length <= 1 && <p className="mt-1 text-[11.5px] text-pending">Só 1 conta com acesso — se ela travar, ninguém mais administra o sistema. Vale criar uma 2ª.</p>}
                  </div>
                )}
              </Panel>
            )}

            {secaoAtiva === 'operacional' && (
              <Panel>
                <PanelHeader titulo="Operacional" desc="Parâmetros usados nos indicadores do sistema." />
                <div className="flex flex-col gap-4">
                  <Input
                    rotulo="Meta de faturamento mensal (R$)"
                    dica="Aparece no Fechamento Mensal como referência de atingimento."
                    type="number"
                    value={metaMensal || ''}
                    onChange={(e) => setMetaMensal(Number(e.target.value))}
                    placeholder="Ex: 50000"
                    min={0}
                    step={1000}
                  />
                  {/* Threshold (P2) — nota igual ou inferior a isso gera
                      alerta no Dashboard/Auditoria e cria a tarefa de
                      follow-up automática. */}
                  <Input
                    rotulo="Alerta de satisfação — nota igual ou inferior a"
                    dica="Eventos com essa nota (ou menor) geram alerta e follow-up automático na Agenda."
                    type="number"
                    min={0}
                    max={10}
                    value={alertaSatisfacaoNota}
                    onChange={(e) => setAlertaSatisfacaoNota(Math.min(10, Math.max(0, Number(e.target.value))))}
                  />
                  <button
                    type="button"
                    onClick={aoSalvarOperacional}
                    disabled={salvandoMeta || salvandoAlertas}
                    className="self-start rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
                  >
                    {salvandoMeta || salvandoAlertas ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </Panel>
            )}

            {secaoAtiva === 'financeiro' && (
              <Panel>
                <PanelHeader titulo="Chave PIX do negócio" desc="Usada pra gerar a cobrança (QR Code) do sinal e do saldo de cada contrato." />
                <ConfigPix onSalvar={() => {}} />
              </Panel>
            )}

            {secaoAtiva === 'empresa' && (
              <Panel>
                <PanelHeader titulo="Empresa" desc="Só os campos que os PDFs (proposta comercial) realmente usam." />
                <div className="flex flex-col gap-4">
                  <Input rotulo="Nome da empresa" value={dadosEmpresa.nome} onChange={(e) => setDadosEmpresa((v) => ({ ...v, nome: e.target.value }))} />
                  <Input rotulo="CNPJ" value={dadosEmpresa.cnpj} onChange={(e) => setDadosEmpresa((v) => ({ ...v, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
                  <Input rotulo="Endereço" value={dadosEmpresa.endereco} onChange={(e) => setDadosEmpresa((v) => ({ ...v, endereco: e.target.value }))} placeholder="Rua, número, bairro, cidade/UF" />
                  <Input rotulo="Telefone" value={dadosEmpresa.telefone} onChange={(e) => setDadosEmpresa((v) => ({ ...v, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
                  <Input rotulo="Site" value={dadosEmpresa.site} onChange={(e) => setDadosEmpresa((v) => ({ ...v, site: e.target.value }))} />
                  <Input rotulo="E-mail" value={dadosEmpresa.email} onChange={(e) => setDadosEmpresa((v) => ({ ...v, email: e.target.value }))} />
                  <button
                    type="button"
                    onClick={aoSalvarEmpresa}
                    disabled={salvandoEmpresa}
                    className="self-start rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
                  >
                    {salvandoEmpresa ? 'Salvando…' : 'Salvar dados da empresa'}
                  </button>
                </div>
              </Panel>
            )}
          </div>
        </div>
      </Conteudo>
    </>
  );
}
