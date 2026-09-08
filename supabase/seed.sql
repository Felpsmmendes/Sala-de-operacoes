-- =============================================================================
-- Catálogo de serviços — dado real, migrado do painel antigo
-- (../../Texto/gerador-mensagens-em-cena.html), não é dado de exemplo.
-- Preço por convidado é o valor vigente de 2026 (o antigo tinha uma tabela
-- de reajuste 2026/2027/2028 — simplificado aqui pra só o ano corrente;
-- revisar quando 2027 chegar).
-- Rode uma vez, no SQL Editor do Supabase, depois do schema.sql.
-- =============================================================================

insert into servicos (categoria, nome, descricao, valor_base, valor_por_convidado) values
  ('bar', 'Bar Intermediário', 'Experiência completa com drinks de qualidade, atendimento profissional e estrutura pronta.', 2850, 28.50),
  ('bar', 'Bar Premium', 'Cardápio ampliado de drinks e equipe dimensionada para maior fluxo de convidados.', 3570, 35.70),
  ('bar', 'Bar Clássico', 'Seleção especial de drinks clássicos, atendimento profissional e estrutura completa.', 4530, 45.30),
  ('bar', 'Bar Black', 'Experiência mais completa e exclusiva, atendimento de alto padrão.', 5100, 51.00),
  ('bar', 'Bar Sem Álcool', 'Drinks sem álcool com frutas frescas, sucos, chás gelados e mocktails.', 2740, 27.40),
  ('atracao', 'Totem Retrô', 'Totem fotográfico retrô, fotos e impressões ilimitadas.', 1600, null),
  ('atracao', 'Cabine Fotográfica', 'Cabine fotográfica para registros divertidos e interação entre convidados.', 1900, null),
  ('atracao', 'Espelho Mágico Luxo', 'Espelho interativo, elegante e divertido para os convidados.', 1750, null),
  ('atracao', 'Plataforma 360', 'Atração interativa que transforma momentos em vídeos com efeitos e música.', 1500, null),
  ('atracao', 'Pista de LED', 'Pista de LED com estrutura moderna e sofisticada para valorizar a pista de dança.', 2000, null),
  ('atracao', 'Capa de Revista', 'Capa personalizada com a identidade do evento, experiência criativa e exclusiva.', 3900, null),
  ('adicional', 'Scrapbook', 'Álbum para recordações com materiais de decoração e canetinhas para mensagens.', 200, null)
on conflict do nothing;
