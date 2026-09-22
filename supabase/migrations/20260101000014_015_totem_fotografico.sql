-- =============================================================================
-- Migração 015 — Novo item de catálogo: "Totem Fotográfico" (2026-09-09).
-- Rode isso no SQL Editor do Supabase (depois da 001-014).
--
-- Pedido do usuário: produto distinto do "Totem Retrô" já existente, mesmo
-- valor_base (R$1.600,00). Sem `descricao`/`mensagem_*` por enquanto —
-- não é texto comercial real (ver nota em migration_011: esse texto só
-- entra quando vem de fonte real da empresa, nunca inventado aqui). O
-- serviço funciona normalmente sem isso (cai sem parágrafo de venda na
-- mensagem/PDF até alguém preencher depois).
-- =============================================================================

insert into servicos (categoria, nome, valor_base, valor_por_convidado)
select 'atracao', 'Totem Fotográfico', 1600, null
where not exists (select 1 from servicos where nome = 'Totem Fotográfico');
