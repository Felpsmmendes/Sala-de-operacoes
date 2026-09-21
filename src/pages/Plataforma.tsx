import { Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { atualizarPlanoEmpresa, atualizarStatusEmpresa, listarEmpresas } from '../lib/api/empresas';
import { Badge, type TomBadge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Select } from '../components/ui/Select';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { formatarData } from '../lib/status';
import type { Empresa, PlanoEmpresa, StatusEmpresa } from '../lib/types';

const PLANO_ROTULO: Record<PlanoEmpresa, string> = { essencial: 'Essencial', profissional: 'Profissional', enterprise: 'Enterprise' };
const STATUS_INFO: Record<StatusEmpresa, { rotulo: string; tom: TomBadge }> = {
  ativa: { rotulo: 'Ativa', tom: 'sucesso' },
  trial: { rotulo: 'Trial', tom: 'pendente' },
  suspensa: { rotulo: 'Suspensa', tom: 'perigo' },
};

function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
}

/** Painel da plataforma (2026-09-21, pedido do usuário) — só pra você,
    dono do SaaS, acompanhar quantas empresas estão usando o sistema e
    qual o plano de cada uma. Nunca mostra dado de negócio de nenhuma
    empresa (leads, contratos, financeiro…) — só nome/plano/status,
    que é tudo que `empresas` guarda (ver migration_041). Sem link na
    sidebar de propósito: `ProtectedRouteSuperAdmin` já barra qualquer
    conta que não esteja em `super_admins`, mas a tela também não deve
    aparecer pra ninguém que nunca vai conseguir abrir. */
export default function Plataforma() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      setEmpresas(await listarEmpresas());
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function aoMudarPlano(id: string, plano: PlanoEmpresa) {
    setEmpresas((atual) => atual.map((e) => (e.id === id ? { ...e, plano } : e)));
    try {
      await atualizarPlanoEmpresa(id, plano);
    } catch (e) {
      aoFalhar(e);
      carregar();
    }
  }

  async function aoMudarStatus(id: string, status: StatusEmpresa) {
    setEmpresas((atual) => atual.map((e) => (e.id === id ? { ...e, status } : e)));
    try {
      await atualizarStatusEmpresa(id, status);
    } catch (e) {
      aoFalhar(e);
      carregar();
    }
  }

  const ativas = empresas.filter((e) => e.status === 'ativa').length;
  const emTrial = empresas.filter((e) => e.status === 'trial').length;

  return (
    <>
      <Cabecalho titulo="Plataforma" subtitulo="Quantas empresas estão usando o sistema e em qual plano — visível só pra você." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={Building2} rotulo="Empresas" valor={String(empresas.length)} legenda="Cadastradas na plataforma" categoria="neutro" />
          <MetricCard Icone={Building2} rotulo="Ativas" valor={String(ativas)} legenda="Status ativa" categoria="execucao" />
          <MetricCard Icone={Building2} rotulo="Em trial" valor={String(emTrial)} legenda="Ainda não confirmaram plano" categoria="pessoas" />
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        <Panel>
          <PanelHeader titulo="Empresas" desc={carregando ? undefined : `${empresas.length} cadastrada(s)`} />
          {carregando ? (
            <SkeletonLinhas />
          ) : empresas.length === 0 ? (
            <EstadoVazio Icone={Building2} titulo="Nenhuma empresa cadastrada ainda" descricao="Nova empresa entra manualmente pelo SQL Editor do Supabase, por enquanto." />
          ) : (
            <div className="flex flex-col gap-2">
              {empresas.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <strong className="text-text">{e.nome}</strong>
                    <span className="ml-2 font-mono text-[11.5px] text-text-faint">{e.slug}</span>
                    <p className="text-[11.5px] text-text-faint">desde {formatarData(e.criado_em)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tom={STATUS_INFO[e.status].tom} texto={STATUS_INFO[e.status].rotulo} />
                    <div className="w-40">
                      <Select value={e.plano} onChange={(ev) => aoMudarPlano(e.id, ev.target.value as PlanoEmpresa)}>
                        {(Object.keys(PLANO_ROTULO) as PlanoEmpresa[]).map((p) => (
                          <option key={p} value={p}>
                            {PLANO_ROTULO[p]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="w-36">
                      <Select value={e.status} onChange={(ev) => aoMudarStatus(e.id, ev.target.value as StatusEmpresa)}>
                        {(Object.keys(STATUS_INFO) as StatusEmpresa[]).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_INFO[s].rotulo}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </Conteudo>
    </>
  );
}
