import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { Cabecalho, Conteudo } from '../components/Layout';
import { Panel, PanelHeader } from '../components/Panel';
import { useAuth } from '../lib/AuthContext';

const campo = 'w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-neutral';
const rotulo = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint';

export default function Configuracoes() {
  const { session, sair, atualizarNome, atualizarSenha } = useAuth();
  const email = session?.user?.email ?? '—';
  const nomeAtual = (session?.user?.user_metadata as { nome?: string } | undefined)?.nome ?? '';

  const [nome, setNome] = useState(nomeAtual);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [msgNome, setMsgNome] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const [senhaNova, setSenhaNova] = useState('');
  const [senhaConfirma, setSenhaConfirma] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  async function aoSalvarNome() {
    setSalvandoNome(true);
    setMsgNome(null);
    const { erro } = await atualizarNome(nome.trim());
    setMsgNome(erro ? { tipo: 'erro', texto: erro } : { tipo: 'ok', texto: 'Nome atualizado.' });
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
              <label>
                <span className={rotulo}>E-mail (login)</span>
                <input className={campo} value={email} disabled />
              </label>
              <label>
                <span className={rotulo}>Nome de exibição</span>
                <input className={campo} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Felipe" />
              </label>
              {msgNome && <p className={`text-[12.5px] ${msgNome.tipo === 'erro' ? 'text-danger' : 'text-success'}`}>{msgNome.texto}</p>}
              <button
                type="button"
                onClick={aoSalvarNome}
                disabled={salvandoNome || nome.trim() === nomeAtual}
                className="self-start rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
              >
                {salvandoNome ? 'Salvando…' : 'Salvar perfil'}
              </button>
            </div>
          </Panel>

          <Panel>
            <PanelHeader titulo="Segurança" desc="Trocar a senha de acesso ao sistema." />
            <div className="flex flex-col gap-4">
              <label>
                <span className={rotulo}>Nova senha</span>
                <input className={campo} type="password" value={senhaNova} onChange={(e) => setSenhaNova(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </label>
              <label>
                <span className={rotulo}>Confirmar nova senha</span>
                <input className={campo} type="password" value={senhaConfirma} onChange={(e) => setSenhaConfirma(e.target.value)} />
              </label>
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
        </div>
      </Conteudo>
    </>
  );
}
