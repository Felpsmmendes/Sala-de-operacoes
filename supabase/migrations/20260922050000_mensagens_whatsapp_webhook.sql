-- =============================================================================
-- Migração — mensagens de WhatsApp recebidas + credenciais de webhook
-- (2026-09-22).
--
-- Até aqui a integração de WhatsApp só ENVIAVA mensagem (Edge Function
-- `enviar-whatsapp`, template aprovado pela Meta) — não existia em lugar
-- nenhum do banco um registro de mensagem que o CLIENTE mandou de volta.
-- "Conversas" (Conversas.tsx) era só um log manual (`lead_interacoes`),
-- não uma conversa de verdade. Sem esse dado, o motor de automação do
-- CRM (automacoes_*, migration_027) não tem como reagir a "cliente
-- respondeu" — a limitação não era de UI, era de infraestrutura.
--
-- Esta migração cria essa infraestrutura (a base — os novos tipos de
-- gatilho/condição de automação que LEEM essa tabela são uma entrega
-- separada, depois que o webhook estiver rodando de verdade em
-- produção). Mensagens ENVIADAS por template continuam registradas só
-- em `lead_interacoes` por enquanto — integrar as duas fontes numa
-- timeline única de conversa é possível depois, sem quebrar nada disto.
-- =============================================================================

create table mensagens_whatsapp (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresas(id) on delete cascade,
  -- Tenta casar pelo telefone com um lead existente no momento em que a
  -- mensagem chega (Edge Function faz esse match); null quando não bate
  -- com nenhum lead cadastrado (ex.: número desconhecido mandando spam,
  -- ou lead ainda não cadastrado) — a mensagem fica salva do mesmo jeito,
  -- só sem vínculo.
  lead_id               uuid references leads(id) on delete set null,
  telefone              text not null,
  direcao               text not null check (direcao in ('recebida', 'enviada')),
  -- Mensagem de texto grava o conteúdo real; qualquer outro tipo (áudio,
  -- imagem, documento, figurinha, localização...) grava só um rótulo —
  -- decodificar/baixar mídia da Meta é escopo futuro, não bloqueia ter
  -- o registro "chegou uma mensagem".
  tipo                  text not null default 'texto' check (tipo in ('texto', 'outro')),
  conteudo              text,
  -- id da mensagem na Meta — a Meta reenvia o mesmo webhook em caso de
  -- timeout/retry; sem isso, duplicaria a mensagem no banco a cada retry.
  whatsapp_message_id   text unique,
  criado_em             timestamptz not null default now()
);
create index idx_mensagens_whatsapp_lead on mensagens_whatsapp (lead_id, criado_em desc);
create index idx_mensagens_whatsapp_telefone on mensagens_whatsapp (telefone, criado_em desc);
create index idx_mensagens_whatsapp_empresa on mensagens_whatsapp (empresa_id, criado_em desc);

alter table mensagens_whatsapp enable row level security;
-- só leitura por gestor (mesmo padrão de `automacoes_execucoes`) — quem
-- ESCREVE é só a Edge Function do webhook, com a service role (ignora
-- RLS), nunca o app direto.
create policy gestor_le_mensagens on mensagens_whatsapp for select to authenticated using (eh_gestor());

-- ---------- credenciais do webhook (verificação da Meta) ----------
-- `webhook_verify_token`: string que você mesmo escolhe e cola nos dois
-- lugares (aqui e no painel da Meta, "Webhooks" do app) — é o "aperto de
-- mão" inicial que prova que só você (e a Meta) sabem configurar o
-- endpoint. `app_secret`: o "App Secret" do app na Meta (Configurações
-- básicas), usado pra validar a assinatura HMAC de cada mensagem
-- recebida — opcional (nullable): sem ele, o endpoint continua
-- funcionando (o verify_token já barra configuração indevida), só sem a
-- camada extra de "essa mensagem específica realmente veio da Meta".
alter table integracao_whatsapp add column webhook_verify_token text;
alter table integracao_whatsapp add column app_secret text;
