-- =============================================================================
-- Migração 032 — Link de confirmação de presença da escala (2026-09-14).
-- Rode isso no SQL Editor do Supabase (depois da 001-031).
--
-- Pedido do usuário: hoje "convocado → confirmado" só acontecia pelo
-- gestor mudando o status na mão, na tela de Escala, depois de receber a
-- resposta do freelancer por fora (WhatsApp, ligação). Isso dá um link
-- ÚNICO por pessoa por convocação (token aleatório — `escalas` já é 1
-- linha por membro por evento, então 1 token cobre "por contrato e por
-- pessoa" de uma vez) pro próprio freelancer confirmar ou recusar, sem
-- login — mesmo padrão do Portal do Cliente (schema.sql) e do Ponto
-- público: `anon` nunca tem select/update direto, só via função RPC
-- `security definer` que exige o token como parâmetro.
-- =============================================================================

alter table escalas add column if not exists token uuid not null default gen_random_uuid() unique;

-- View com só o necessário pra ESSA pessoa decidir sobre ESSA convocação
-- — inclui a diária (ao contrário de `vw_escala_presenca`) porque só quem
-- tem o token de uma linha específica enxerga essa linha, nunca a escala
-- de outra pessoa.
create or replace view vw_confirmacao_escala as
select
  esc.id          as escala_id,
  esc.token,
  esc.evento_id,
  esc.membro_id,
  eq.nome         as membro_nome,
  eq.funcao       as membro_funcao,
  esc.diaria,
  esc.status,
  esc.confirmado_em,
  ev.data_evento,
  ev.hora_inicio,
  ev.local,
  l.nome          as cliente_nome
from escalas esc
join equipe eq on eq.id = esc.membro_id
join eventos ev on ev.id = esc.evento_id
join contratos c on c.id = ev.contrato_id
join leads l on l.id = c.lead_id;

grant select on vw_confirmacao_escala to authenticated;

create or replace function confirmacao_obter(p_token uuid)
returns setof vw_confirmacao_escala
language sql stable security definer set search_path = public as $$
  select * from vw_confirmacao_escala where token = p_token;
$$;
revoke all on function confirmacao_obter(uuid) from public;
grant execute on function confirmacao_obter(uuid) to anon, authenticated;

create or replace function confirmacao_responder(p_token uuid, p_confirmar boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from escalas where token = p_token) then
    raise exception 'Link inválido — peça um novo link pra Em Cena.';
  end if;
  update escalas
    set status = case when p_confirmar then 'confirmado' else 'recusado' end,
        confirmado_em = case when p_confirmar then now() else null end
    where token = p_token;
end;
$$;
revoke all on function confirmacao_responder(uuid, boolean) from public;
grant execute on function confirmacao_responder(uuid, boolean) to anon, authenticated;
