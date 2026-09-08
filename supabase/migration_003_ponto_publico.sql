-- =============================================================================
-- Migração 003 — Ponto Eletrônico simplificado (sem geofence/PIN)
-- Rode isso no SQL Editor do Supabase (depois das migrações 001/002).
--
-- Decisão do usuário (2026-09-06): não precisa de ponto formal com
-- entrada/saída/geofence — só precisa de um jeito de ver, por data de
-- evento, quem já "se registrou" (chegou) e quem ainda não, pra ter
-- controle de datas com falta de gente. Sem PIN, sem checagem de GPS.
--
-- O freelancer confirma a chegada por um link público (`/ponto/:eventoId`,
-- mesmo padrão de "sem login" do Portal do Cliente) escolhendo o próprio
-- nome na lista de quem foi escalado pro evento. Não valida identidade
-- (qualquer um com o link pode marcar a chegada de qualquer escalado) —
-- aceitável porque isso não alimenta folha de pagamento nem é prova
-- jurídica de jornada, é só visibilidade operacional pro gestor.
-- =============================================================================

-- view "seguranca": dono é o dono das tabelas (bypassa RLS na leitura),
-- mas só expõe o necessário pra tela de check-in e pro resumo do gestor —
-- nunca a diária (`escalas.diaria`), que é dado sensível de pagamento.
create or replace view vw_escala_presenca as
select
  esc.id           as escala_id,
  esc.evento_id,
  esc.membro_id,
  eq.nome          as membro_nome,
  eq.funcao        as membro_funcao,
  esc.status       as status_escala,
  ev.data_evento,
  ev.local,
  (
    select max(pr.horario)
    from ponto_registros pr
    where pr.membro_id = esc.membro_id and pr.evento_id = esc.evento_id and pr.tipo = 'entrada'
  ) as chegada_em
from escalas esc
join equipe eq on eq.id = esc.membro_id
join eventos ev on ev.id = esc.evento_id
where esc.status <> 'recusado';

grant select on vw_escala_presenca to anon, authenticated;

-- anon só pode INSERIR um registro de chegada, e só pra uma combinação
-- membro/evento que realmente está escalada (não dá pra "criar presença"
-- de quem não foi convocado) — não pode ler a tabela bruta nem apagar.
create policy anon_registra_chegada on ponto_registros for insert to anon
  with check (
    tipo = 'entrada'
    and exists (
      select 1 from escalas
      where escalas.membro_id = ponto_registros.membro_id
        and escalas.evento_id = ponto_registros.evento_id
    )
  );
