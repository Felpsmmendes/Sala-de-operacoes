-- =============================================================================
-- Migração 009 — movimento de estoque atômico (2026-09-06)
-- Rode isso no SQL Editor do Supabase (depois das migrações 001-008).
--
-- Achado de revisão: `registrarMovimento` (src/lib/api/estoque.ts) fazia
-- SELECT estoque_atual → calcula em JS → UPDATE com o valor absoluto, em
-- duas chamadas REST separadas. Duas escritas concorrentes no mesmo item
-- (duas abas do gestor, ou um embarque de romaneio debitando ao mesmo
-- tempo que um ajuste manual) podiam perder uma atualização — a segunda
-- escrita sobrescrevia com um valor calculado a partir de um
-- `estoque_atual` já desatualizado.
--
-- Corrigido: a leitura e a escrita viram uma única instrução SQL
-- (`estoque_atual = estoque_atual + delta`), dentro de uma função —
-- o Postgres resolve isso com lock de linha normal (a segunda transação
-- espera a primeira liberar e enxerga o valor já atualizado), sem
-- depender de round-trip nenhum do cliente.
-- =============================================================================

create or replace function estoque_registrar_movimento(
  p_item_id uuid,
  p_tipo text,
  p_quantidade numeric,
  p_evento_id uuid,
  p_observacao text
) returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_sinal numeric;
begin
  if p_tipo not in ('entrada', 'saida', 'avaria', 'reintegracao') then
    raise exception 'Tipo de movimento inválido: %', p_tipo;
  end if;
  if p_quantidade <= 0 then
    raise exception 'Quantidade precisa ser maior que zero';
  end if;

  v_sinal := case when p_tipo in ('entrada', 'reintegracao') then 1 else -1 end;

  insert into estoque_movimentos (item_id, tipo, quantidade, evento_id, observacao)
  values (p_item_id, p_tipo, p_quantidade, p_evento_id, p_observacao);

  -- leitura + escrita numa instrução só: sem isso é onde a corrida acontecia.
  update estoque_itens
    set estoque_atual = greatest(0, estoque_atual + v_sinal * p_quantidade),
        atualizado_em = now()
    where id = p_item_id;

  if not found then
    raise exception 'Item de estoque não encontrado: %', p_item_id;
  end if;
end;
$$;

-- `security invoker` (padrão) de propósito, não `security definer`: quem
-- chama já é o gestor autenticado, as policies de `estoque_itens`/
-- `estoque_movimentos` (`gestor_tudo`) já liberam as duas escritas —
-- não precisa (nem deve) escalar privilégio pra isso.
revoke all on function estoque_registrar_movimento(uuid, text, numeric, uuid, text) from public;
grant execute on function estoque_registrar_movimento(uuid, text, numeric, uuid, text) to authenticated;
