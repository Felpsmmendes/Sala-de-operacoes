-- =============================================================================
-- Migração 007 — correções de segurança encontradas em auditoria (2026-09-06)
-- Rode isso no SQL Editor do Supabase (depois das migrações 001-006).
--
-- Achado 1 (CRÍTICO): `eh_gestor()` só checava "usuário autenticado", não
-- QUEM é. Como o projeto tem self-signup habilitado no Supabase Auth,
-- qualquer pessoa podia criar uma conta sozinha e ganhar acesso total ao
-- sistema (leads, contratos, financeiro). Corrigido: trava num usuário
-- específico (uuid abaixo = teste@teste.com, confirmado com o usuário
-- como a conta real de gestor).
--
-- **Ação manual complementar (não dá pra fazer por SQL):** desabilite o
-- cadastro público em Authentication → Providers → Email → "Allow new
-- users to sign up" (desligar), no painel do Supabase. Isso aqui é
-- defesa em profundidade — mesmo que o toggle seja religado sem querer
-- no futuro, `eh_gestor()` continua barrando qualquer conta que não seja
-- a sua.
--
-- Achado 2: as views públicas (`vw_portal_publico`, `vw_escala_presenca`)
-- e as policies de anon em `portal_cliente`/`ponto_registros` usavam
-- `using (true)` sem filtro — o app sempre filtrava por token/evento_id
-- na query, mas nada no banco IMPEDIA uma chamada direta à API sem esse
-- filtro (listaria/alteraria todo mundo, não só uma linha). Corrigido:
-- as views continuam existindo (uso interno do gestor), mas o acesso do
-- `anon` agora passa só por funções RPC `security definer` que exigem o
-- token/ids como parâmetro e nunca permitem listagem nem alteração em
-- massa.
-- =============================================================================

-- ---------- Achado 1: eh_gestor() travado num usuário específico ----------
create or replace function eh_gestor() returns boolean
language sql stable as $$
  select auth.uid() = '70fcba24-6cfb-43bf-b154-f9d58ac8cc69'::uuid;
$$;

-- ---------- Achado 2a: Portal do Cliente só por RPC ----------
drop policy if exists cliente_le_proprio_token on portal_cliente;
drop policy if exists cliente_atualiza_proprio_token on portal_cliente;
revoke select on vw_portal_publico from anon;

create or replace function portal_obter(p_token uuid)
returns setof vw_portal_publico
language sql stable security definer set search_path = public as $$
  select * from vw_portal_publico where token = p_token;
$$;
revoke all on function portal_obter(uuid) from public;
grant execute on function portal_obter(uuid) to anon, authenticated;

create or replace function portal_aprovar_moldura(p_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update portal_cliente set moldura_aprovada = true where token = p_token;
end;
$$;
revoke all on function portal_aprovar_moldura(uuid) from public;
grant execute on function portal_aprovar_moldura(uuid) to anon, authenticated;

create or replace function portal_aprovar_video(p_token uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update portal_cliente set video_aprovado = true where token = p_token;
end;
$$;
revoke all on function portal_aprovar_video(uuid) from public;
grant execute on function portal_aprovar_video(uuid) to anon, authenticated;

create or replace function portal_assinar(p_token uuid, p_nome text, p_cpf text, p_hash text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update portal_cliente
    set assinatura_nome = p_nome, assinatura_cpf = p_cpf, assinatura_hash = p_hash, assinatura_em = now()
    where token = p_token;
end;
$$;
revoke all on function portal_assinar(uuid, text, text, text) from public;
grant execute on function portal_assinar(uuid, text, text, text) to anon, authenticated;

-- ---------- Achado 2b: Ponto público só por RPC ----------
drop policy if exists anon_registra_chegada on ponto_registros;
revoke select on vw_escala_presenca from anon;

create or replace function ponto_obter_presenca(p_evento_id uuid)
returns setof vw_escala_presenca
language sql stable security definer set search_path = public as $$
  select * from vw_escala_presenca where evento_id = p_evento_id;
$$;
revoke all on function ponto_obter_presenca(uuid) from public;
grant execute on function ponto_obter_presenca(uuid) to anon, authenticated;

create or replace function ponto_registrar_chegada(p_evento_id uuid, p_membro_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from escalas where evento_id = p_evento_id and membro_id = p_membro_id) then
    raise exception 'Membro não está escalado para este evento';
  end if;
  insert into ponto_registros (evento_id, membro_id, tipo) values (p_evento_id, p_membro_id, 'entrada');
end;
$$;
revoke all on function ponto_registrar_chegada(uuid, uuid) from public;
grant execute on function ponto_registrar_chegada(uuid, uuid) to anon, authenticated;
