-- =============================================================================
-- Migração 031 — Conectar/desconectar WhatsApp pela própria tela (pedido
-- do usuário, 2026-09-14: "vai que a empresa troque de número"). Antes
-- disso (Fase B), a credencial só existia como secret de Edge Function
-- (`WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`), configurável só
-- por `supabase secrets set` (CLI) — trocar de número exigiria me
-- chamar de novo toda vez. Agora fica numa tabela: o gestor conecta e
-- desconecta pela aba "CRM > Conectar WhatsApp" quando quiser.
--
-- Tabela "singleton" (sempre 1 linha só, id fixo 'atual') — mais simples
-- que modelar "qual é o número ativo" com múltiplas linhas quando só
-- existe UM número de WhatsApp da empresa por vez.
--
-- Segurança: NENHUMA policy de SELECT pra `authenticated` — nem o
-- próprio gestor lê o token de volta pela tela depois de salvo (uma vez
-- gravado, não precisa voltar pro navegador nunca mais). Só as Edge
-- Functions, usando a service role key (ignora RLS por padrão — ver
-- supabase/functions/_shared/whatsapp.ts), conseguem ler pra mandar
-- mensagem/checar status junto à Meta.
-- =============================================================================

create table integracao_whatsapp (
  id                text primary key default 'atual' check (id = 'atual'),
  phone_number_id   text not null,
  access_token      text not null,
  conectado_em      timestamptz not null default now()
);

alter table integracao_whatsapp enable row level security;

create policy gestor_conecta on integracao_whatsapp for insert to authenticated with check (eh_gestor());
create policy gestor_reconecta on integracao_whatsapp for update to authenticated using (eh_gestor()) with check (eh_gestor());
create policy gestor_desconecta on integracao_whatsapp for delete to authenticated using (eh_gestor());
