import { LogOut, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Cabecalho, Conteudo } from '../components/Layout';
import { Panel, PanelHeader } from '../components/Panel';
import { Skeleton } from '../components/Skeleton';
import { Input } from '../components/ui/Input';
import { useAuth } from '../lib/AuthContext';
import { listarGestores } from '../lib/api/gestores';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { formatarData } from '../lib/status';
import type { Gestor } from '../lib/types';

export default function Configuracoes() {
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

          <Panel>
            <PanelHeader titulo="Quem tem acesso" desc="Contas com acesso total ao sistema — adicionar uma nova é manual pelo SQL Editor do Supabase (ver migration_030), de propósito." />
            {erroGestores ? (
              <p className="text-[12.5px] text-text-dim">Ainda não disponível — rode a migração mais recente no Supabase (migration_030_multiplos_gestores.sql).</p>
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
        </div>
      </Conteudo>
    </>
  );
}
