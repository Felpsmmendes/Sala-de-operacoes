-- Migration 033 — Portal do Cliente: registra quando o cliente abre o link
-- (pedido do usuário, 2026-09-14: "não dá pra saber se o cliente já viu o
-- portal"). Mesmo padrão de segurança do resto do portal público (ver
-- 20260101000006_007_seguranca.sql) — nunca update direto na tabela a partir do
-- token anônimo, só por função RPC security definer.

alter table portal_cliente
  add column if not exists aberto_em timestamptz,
  add column if not exists visualizacoes int not null default 0;

-- RPC pública: registra a visita (incrementa contador, grava a data da
-- PRIMEIRA abertura — coalesce não sobrescreve se já tinha aberto antes).
create or replace function portal_registrar_visualizacao(p_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update portal_cliente set
    visualizacoes = visualizacoes + 1,
    aberto_em = coalesce(aberto_em, now())
  where token = p_token;
end;
$$;
revoke all on function portal_registrar_visualizacao(uuid) from public;
grant execute on function portal_registrar_visualizacao(uuid) to anon, authenticated;
