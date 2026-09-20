import { AlertTriangle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { registrarErro } from '../lib/registrarErro';

type Props = {
  children: ReactNode;
  /** Quando muda (ex.: a rota), o boundary tenta de novo em vez de ficar
      preso na tela de erro depois de o usuário navegar pra outro lugar. */
  resetKey?: string;
  /** Dentro do Layout: mantém sidebar/topbar e só troca o conteúdo. */
  compacto?: boolean;
};

type Estado = { erro: Error | null };

/** Sem isso, qualquer erro de renderização (ou um chunk que sumiu depois de
    um deploy novo) deixava a tela TODA em branco. Agora mostra uma saída e
    registra o erro (`erros_app`, ver registrarErro.ts). */
export class ErrorBoundary extends Component<Props, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    registrarErro({ origem: 'react', mensagem: erro.message, stack: `${erro.stack ?? ''}\n${info.componentStack ?? ''}` });
  }

  componentDidUpdate(anterior: Props) {
    if (this.state.erro && anterior.resetKey !== this.props.resetKey) this.setState({ erro: null });
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className={`flex flex-col items-center justify-center gap-4 px-6 text-center ${this.props.compacto ? 'py-24' : 'min-h-screen bg-bg'}`} role="alert">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-raised text-danger">
          <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-text">Algo deu errado nesta tela</p>
          <p className="mt-1 max-w-[360px] text-[13px] text-text-dim">O erro foi registrado. Se acabou de sair uma versão nova do sistema, recarregar costuma resolver.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.location.reload()} className="rounded-sm bg-accent px-4 py-2 text-[13px] font-semibold text-accent-ink hover:bg-accent-strong">
            Recarregar
          </button>
          <button type="button" onClick={() => window.location.assign('/')} className="rounded-sm border border-line px-4 py-2 text-[13px] text-text-dim hover:bg-raised hover:text-text">
            Ir pro início
          </button>
        </div>
      </div>
    );
  }
}
