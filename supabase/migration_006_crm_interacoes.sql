-- =============================================================================
-- Migração 006 — canal de conversa/contato do CRM
-- Rode isso no SQL Editor do Supabase (depois das migrações 001-005).
--
-- Feedback do usuário testando como CRM de verdade: falta um histórico de
-- interações por lead (mensagem, ligação, reunião, nota) — o que todo CRM
-- de mercado tem. A mensagem de WhatsApp do orçamento já se registra
-- sozinha aqui quando gerada; o resto é manual (ligação, reunião, nota).
-- =============================================================================
create table if not exists lead_interacoes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  tipo        text not null check (tipo in ('mensagem_whatsapp','ligacao','email','reuniao','nota')),
  conteudo    text not null,
  criado_em   timestamptz not null default now()
);
create index if not exists idx_lead_interacoes_lead on lead_interacoes(lead_id);

alter table lead_interacoes enable row level security;
drop policy if exists gestor_tudo on lead_interacoes;
create policy gestor_tudo on lead_interacoes for all using (eh_gestor()) with check (eh_gestor());
