-- =============================================================================
-- Migração 025 — Agenda o alerta automático de "Trava D-15/D-20" por e-mail
-- (2026-09-10/11, Fase A do roadmap). Já feito (2026-09-11): deploy da
-- Edge Function `alerta-trava-d15` (--no-verify-jwt), secrets
-- RESEND_API_KEY/ALERTA_EMAIL_DESTINO configurados, function testada
-- (invocação manual + e-mail de teste via Resend, ambos OK). Só falta
-- rodar isto aqui no SQL Editor do Supabase pra agendar o cron.
--
-- `pg_cron`/`pg_net` são extensões do próprio Supabase (não precisa
-- instalar nada externo). O horário do cron é UTC — "0 11" = 11h UTC =
-- 8h da manhã em São Paulo (UTC-3).
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'alerta-trava-d15-diario',
  '0 11 * * *', -- 8h da manhã em São Paulo (UTC-3)
  $$
  select net.http_post(
    url := 'https://ugnworqdnensqfzrxahk.supabase.co/functions/v1/alerta-trava-d15',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);

-- Pra checar se está agendado:
--   select * from cron.job where jobname = 'alerta-trava-d15-diario';
-- Pra cancelar, se precisar:
--   select cron.unschedule('alerta-trava-d15-diario');
