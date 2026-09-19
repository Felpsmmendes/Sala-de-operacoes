import { AlertaBanner } from '../components/AlertaBanner';
import { Cabecalho, Conteudo } from '../components/Layout';
import { ListaLancamentos } from '../components/financeiro/ListaLancamentos';
import { LancamentoForm } from '../components/financeiro/LancamentoForm';
import { Drawer } from '../components/ui/Drawer';
import { useFinanceiro } from '../hooks/useFinanceiro';

/** `/financeiro/pagar` (2026-09-19, SPEC_CAMADA2 2E) — recorte só de
    despesas da lista de lançamentos que antes vivia junto com receitas
    e DRE numa tela só (ver Financeiro.tsx original, agora
    FinanceiroVisaoGeral.tsx). */
export default function ContasPagar() {
  const { lancamentos, eventos, carregando, erro, salvando, novoAberto, setNovoAberto, aoCriar, aoMarcarPago, aoExcluir, idsVencidos, em7diasStr, mesAtual, vencidos } = useFinanceiro();

  return (
    <>
      <Cabecalho titulo="Contas a Pagar" subtitulo="Despesas de campo, equipe e fornecedores." />
      <Conteudo>
        {erro && (
          <AlertaBanner tom="perigo" className="mb-4">
            {erro}
          </AlertaBanner>
        )}
        <div className="mb-4 flex justify-end">
          <button type="button" onClick={() => setNovoAberto(true)} className="rounded-sm bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong">
            + Novo lançamento
          </button>
        </div>
        {!carregando && vencidos.filter((l) => l.tipo === 'despesa').length > 0 && (
          <AlertaBanner tom="perigo" titulo={`${vencidos.filter((l) => l.tipo === 'despesa').length} despesa${vencidos.filter((l) => l.tipo === 'despesa').length > 1 ? 's' : ''} com vencimento em atraso`} className="mb-4" dispensavel>
            <p>Regularize os pagamentos vencidos para manter o fluxo de caixa.</p>
          </AlertaBanner>
        )}
        <ListaLancamentos tipo="despesa" lancamentos={lancamentos} idsVencidos={idsVencidos} em7diasStr={em7diasStr} mesAtual={mesAtual} carregando={carregando} aoMarcarPago={aoMarcarPago} aoExcluir={aoExcluir} />
      </Conteudo>

      {novoAberto && (
        <Drawer titulo="Novo lançamento" onFechar={() => setNovoAberto(false)}>
          <LancamentoForm eventos={eventos} onSalvar={aoCriar} salvando={salvando} />
        </Drawer>
      )}
    </>
  );
}
