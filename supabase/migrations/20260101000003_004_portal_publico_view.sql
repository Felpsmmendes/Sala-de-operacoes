-- =============================================================================
-- Migração 004 — view pública do Portal do Cliente
-- Rode isso no SQL Editor do Supabase (depois das migrações 001/002/003).
--
-- `portal_cliente` sozinho não basta pra tela pública: ela precisa mostrar
-- data/local do evento e nome do cliente, que vivem em `contratos`/`leads`
-- — tabelas travadas pro `anon` (só o gestor lê). Esta view expõe só os
-- campos não sensíveis (nunca valor_total/sinal/saldo/chave_pix) pro
-- token identificar visualmente o evento certo. Mesma lógica de segurança
-- já usada em `portal_cliente`: sem filtro de token aqui dentro, mas a
-- aplicação SEMPRE filtra por `where token = :token` — não há como listar
-- sem já saber o token de alguém (mesmo raciocínio do schema original).
-- =============================================================================
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
  l.nome as lead_nome
from portal_cliente pc
join contratos c on c.id = pc.contrato_id
join leads l on l.id = c.lead_id;

grant select on vw_portal_publico to anon, authenticated;
