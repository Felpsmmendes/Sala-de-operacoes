-- =============================================================================
-- Migração 038 — Registro de erros do aplicativo (2026-09-19).
-- Rode isso no SQL Editor do Supabase (depois da 001-037).
--
-- Monitoramento próprio de erros (sem serviço externo): o front grava aqui
-- erros de janela, promessas não tratadas, falhas de renderização e toasts de
-- erro; a página /status lista agrupado. Só o gestor lê/apaga.
--
-- Quem INSERE: qualquer conta autenticada. Páginas públicas (portal do
-- cliente, ponto público) NÃO gravam — insert anônimo aberto numa tabela de log
-- é convite pra encher o banco; os limites de tamanho abaixo + o teto por
-- sessão no cliente (registrarErro.ts) cobrem o resto.
-- =============================================================================

create table erros_app (
  id          uuid primary key default gen_random_uuid(),
  criado_em   timestamptz not null default now(),
  origem      text not null check (origem in ('janela', 'promessa', 'react', 'toast')),
  mensagem    text not null check (char_length(mensagem) <= 1000),
  stack       text check (char_length(stack) <= 4000),
  rota        text check (char_length(rota) <= 300),
  user_agent  text check (char_length(user_agent) <= 300),
  usuario_id  uuid default auth.uid()
);
create index idx_erros_app_criado_em on erros_app(criado_em desc);

alter table erros_app enable row level security;
create policy gestor_tudo on erros_app for all using (eh_gestor()) with check (eh_gestor());
create policy autenticado_registra on erros_app for insert to authenticated with check (true);
