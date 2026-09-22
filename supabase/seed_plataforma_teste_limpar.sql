-- Remove TUDO que `seed_plataforma_teste.sql` criou (e só isso).
-- Empresas de teste levam junto suas cobranças, chamados e comentários (ON DELETE CASCADE);
-- leads de teste levam junto as interações. Não toca na Em Cena nem em nada sem o marcador.
delete from empresas where slug like 'teste-%';
delete from leads_plataforma where nome_empresa like '[TESTE]%';
