-- =============================================================================
-- Migração — lead público da landing (2026-09-22).
--
-- A landing de venda (apps/landing, marca "Firme") é site estático,
-- sem login. Pra um visitante virar lead no CRM da plataforma
-- (`leads_plataforma`, migration_043) sem digitar nada à mão depois,
-- precisa de ALGUM jeito de gravar como `anon`.
--
-- NÃO abrimos uma policy de INSERT direto na tabela pro `anon` — isso
-- deixaria a chave anônima (pública, embutida no HTML) escrever
-- qualquer coluna, inclusive `etapa` ('ganho' etc.) ou `valor_potencial`
-- arbitrário. Em vez disso, uma função SECURITY DEFINER: só os campos
-- de contato passam, `etapa` fica sempre travada em 'lead', e é a
-- ÚNICA porta de entrada anônima pra essa tabela (a tabela continua
-- 100% fechada pra `anon` fora daqui — nem leitura).
--
-- Mesmo padrão de "porta estreita" que os outros fluxos públicos do
-- sistema já usam (RPC security definer em vez de policy aberta) — ver
-- `eh_gestor()`/portal do cliente no app principal.
-- =============================================================================

create or replace function criar_lead_publico(
  p_nome_empresa     text,
  p_contato_nome     text default null,
  p_contato_telefone text default null,
  p_contato_email    text default null,
  p_origem           text default null,
  p_observacoes      text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_nome_empresa is null or length(trim(p_nome_empresa)) = 0 then
    raise exception 'nome_empresa é obrigatório';
  end if;
  if length(p_nome_empresa) > 200 or length(coalesce(p_observacoes, '')) > 2000 then
    raise exception 'campo grande demais';
  end if;

  insert into leads_plataforma (nome_empresa, contato_nome, contato_telefone, contato_email, origem, etapa, observacoes)
  values (
    trim(p_nome_empresa),
    nullif(trim(coalesce(p_contato_nome, '')), ''),
    nullif(trim(coalesce(p_contato_telefone, '')), ''),
    nullif(trim(coalesce(p_contato_email, '')), ''),
    coalesce(nullif(trim(coalesce(p_origem, '')), ''), 'Site (Firme)'),
    'lead',
    nullif(trim(coalesce(p_observacoes, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Só quem não está logado precisa disso (o painel, autenticado, insere
-- direto na tabela via `super_admin_tudo`, já existente).
grant execute on function criar_lead_publico(text, text, text, text, text, text) to anon;
