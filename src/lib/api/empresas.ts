import { supabase } from '../supabase';
import type { Empresa } from '../types';

/** Resolve a empresa do usuário logado (Etapa 1 / Entrega 1.3 da fundação
    multiempresa — ver documento de auditoria) — hoje sempre a Em Cena,
    já que `membros_empresa` (migration_040) só tem uma linha por gestor
    existente. `null` quando o usuário não tem vínculo nenhum (não deve
    acontecer pra quem já é gestor via `gestores`, mas cobre o caso de
    conta nova/funcionário interno, que não tem linha em `membros_empresa`
    hoje).

    O CRUD de empresas em si (listar/criar/editar plano/módulos etc.)
    NÃO mora mais aqui — mora no app separado `plataforma-admin/`
    (decisão do usuário, 2026-09-21: painel de gerenciar empresas é
    ferramenta do dono da plataforma, não uma tela do produto que cada
    empresa usa). Este app só precisa saber "qual é a MINHA empresa". */
export async function buscarMinhaEmpresa(userId: string): Promise<Empresa | null> {
  const { data, error } = await supabase.from('membros_empresa').select('empresa:empresas(*)').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.empresa as Empresa | null) ?? null;
}
