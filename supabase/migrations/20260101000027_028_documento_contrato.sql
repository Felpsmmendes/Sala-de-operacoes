-- =============================================================================
-- Migração 028 — Documento de contrato: template + editor + assinatura do
-- cliente (pedido do usuário, 2026-09-13). Do zero até aqui existia
-- "contrato" só como registro financeiro (valores, prazos, PIX) — esta
-- migração adiciona o TEXTO jurídico do contrato em si, editável pelo
-- gestor e assinável pelo cliente pelo Portal.
--
-- Assinatura do CONTRATO fica em colunas próprias em `contratos`,
-- separada da assinatura de HOMOLOGAÇÃO (moldura/vídeo) que já existe em
-- `portal_cliente.assinatura_*` — são 2 eventos de assinatura diferentes,
-- misturar os dois confundiria "aprovei a moldura" com "assinei o
-- contrato". O hash (mesmo padrão de `portal_assinar`) cobre o
-- CONTEÚDO do documento no momento da assinatura — se o gestor editar o
-- texto depois, o hash gravado não bate mais com o texto atual,
-- evidência de alteração pós-assinatura.
-- =============================================================================

alter table contratos
  add column if not exists tipo_contrato text check (tipo_contrato in ('bar_service', 'photo_booth', 'combo')),
  add column if not exists documento_texto text,
  add column if not exists documento_gerado_em timestamptz,
  add column if not exists contrato_assinatura_nome text,
  add column if not exists contrato_assinatura_cpf text,
  add column if not exists contrato_assinatura_hash text,
  add column if not exists contrato_assinado_em timestamptz;

-- Estende a view pública existente (não cria uma nova) — o Portal do
-- Cliente já busca tudo numa chamada só (`portal_obter`); o documento e o
-- status de assinatura entram nela igual ao resto. Nunca inclui
-- valor_total/sinal/saldo/chave_pix aqui (regra já documentada na view
-- original) — o texto do contrato já leva os valores substituídos
-- quando o gestor gera/salva, então o cliente nunca precisa consultar o
-- valor bruto por uma via separada.
create or replace view vw_portal_publico as
select
  pc.id,
  pc.token,
  pc.contrato_id,
  pc.coquetel_ids,
  pc.moldura_arquivo_url,
  pc.moldura_aprovada,
  pc.video_arquivo_url,
  pc.video_aprovado,
  pc.assinatura_nome,
  pc.assinatura_cpf,
  pc.assinatura_em,
  c.data_evento,
  c.local,
  l.nome as lead_nome,
  c.tipo_contrato,
  c.documento_texto,
  c.contrato_assinatura_nome,
  c.contrato_assinado_em
from portal_cliente pc
join contratos c on c.id = pc.contrato_id
join leads l on l.id = c.lead_id;

grant select on vw_portal_publico to authenticated;

-- RPC pública: cliente assina o CONTRATO (separada de `portal_assinar`,
-- que é a homologação de mídia). Idempotente — não sobrescreve se já
-- assinado, mesmo padrão de outras RPCs públicas do sistema.
create or replace function portal_assinar_contrato(p_token uuid, p_nome text, p_cpf text, p_hash text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_contrato_id uuid;
begin
  select pc.contrato_id into v_contrato_id from portal_cliente pc where pc.token = p_token;

  if v_contrato_id is null then
    raise exception 'Token inválido';
  end if;

  update contratos set
    contrato_assinatura_nome = p_nome,
    contrato_assinatura_cpf  = p_cpf,
    contrato_assinatura_hash = p_hash,
    contrato_assinado_em     = now()
  where id = v_contrato_id
    and contrato_assinado_em is null;
end;
$$;
revoke all on function portal_assinar_contrato(uuid, text, text, text) from public;
grant execute on function portal_assinar_contrato(uuid, text, text, text) to anon, authenticated;
