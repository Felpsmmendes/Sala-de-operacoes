-- =============================================================================
-- Migração 011 — texto comercial real por serviço, pro Gerador de Mensagens
-- (2026-09-07). Rode isso no SQL Editor do Supabase (depois da 001-010).
--
-- Achado: o "Gerar mensagem" dos Orçamentos usava só `servicos.descricao`
-- (uma linha curta, pensada pra UI interna — card de seleção, tabela do
-- PDF) pra montar a mensagem inteira, resultando num texto genérico
-- ("• Serviço — Valor"). O painel ANTERIOR da empresa
-- (../../Texto/gerador-mensagens-em-cena.html) já tinha, por serviço, um
-- parágrafo de venda de verdade + duração + lista de benefícios (✔) —
-- nunca migrado pra cá. Este texto é REAL (escrito pela empresa,
-- confirmado contra uma mensagem de verdade que o usuário já mandou pra
-- um cliente), não inventado agora.
--
-- 3 colunas novas, só pro Gerador de Mensagens (a `descricao` curta
-- continua sendo usada nos cards/PDF, sem mudar):
--   mensagem_descricao   — parágrafo de venda completo (1ª pessoa da empresa)
--   mensagem_horas       — duração do serviço, texto livre
--   mensagem_informacoes — bullets "✔ ..." (um por linha), prontos pra colar
-- Todas nullable — serviço sem essas colunas preenchidas cai de volta na
-- `descricao` curta (ver `montarMensagemOrcamento`).
-- =============================================================================

alter table servicos add column if not exists mensagem_descricao text;
alter table servicos add column if not exists mensagem_horas text;
alter table servicos add column if not exists mensagem_informacoes text;

-- Correção do usuário (2026-09-07): o Intermediário NÃO tem copo de vidro
-- (eu tinha padronizado errado pra vidro em todos os bares alcoólicos —
-- o dado real, batendo com o painel anterior, é descartável aqui).
update servicos set
  mensagem_descricao = 'Uma experiência completa para o seu evento, com drinks de qualidade, atendimento profissional e estrutura pronta para receber seus convidados.',
  mensagem_horas = '05 horas de evento',
  mensagem_informacoes = '✔ Todos os insumos inclusos
✔ Frutas sempre frescas e selecionadas
✔ Equipe de apoio para garantir agilidade no atendimento
✔ Estrutura completa de bar
🥃 Copos descartáveis'
where nome = 'Bar Intermediário';

update servicos set
  mensagem_descricao = 'Uma experiência ainda mais sofisticada, com cardápio ampliado de drinks e equipe dimensionada para atender eventos com maior fluxo de convidados.',
  mensagem_horas = '05 horas de evento',
  mensagem_informacoes = '✔ Todos os benefícios do Bar Intermediário
✔ Cardápio mais amplo de drinks
✔ Estrutura completa para uma experiência sofisticada
🥂 Copos de vidro inclusos'
where nome = 'Bar Premium';

-- Tipo de copo não confirmado pro Clássico (nem o painel anterior
-- especificava) — deixei de fora em vez de adivinhar de novo; se usar
-- vidro ou descartável, é só completar a linha direto nesta coluna.
update servicos set
  mensagem_descricao = 'Uma seleção especial de drinks clássicos, com atendimento profissional e estrutura completa para tornar o seu evento ainda mais especial.',
  mensagem_horas = '05 horas de evento',
  mensagem_informacoes = '✔ Insumos selecionados
✔ Frutas frescas
✔ Estrutura completa de bar'
where nome = 'Bar Clássico';

update servicos set
  mensagem_descricao = 'Nossa experiência mais completa e exclusiva, criada para proporcionar um atendimento de alto padrão e uma experiência marcante aos convidados.',
  mensagem_horas = '05 horas de evento',
  mensagem_informacoes = '✔ Seleção premium de drinks e insumos
✔ Equipe completa para atendimento de alto padrão
✔ Estrutura diferenciada
🥂 Copos de vidro inclusos'
where nome = 'Bar Black';

-- Único bar com copo descartável em vez de vidro — mesmo padrão da
-- mensagem real já usada com cliente (referência do usuário, 2026-09-07).
update servicos set
  mensagem_descricao = 'Cardápio personalizado conforme a sua preferência — um bar completo com drinks sem álcool, preparados na hora, garantindo uma experiência diferenciada para todos os convidados, sem abrir mão do sabor, da apresentação e da qualidade.',
  mensagem_horas = '05 horas de evento',
  mensagem_informacoes = '✔ Todos os insumos inclusos
✔ Trabalhamos exclusivamente com frutas frescas
✔ Estrutura completa de bar
🥃 Copos descartáveis'
where nome = 'Bar Sem Álcool';

update servicos set
  mensagem_descricao = 'Totem fotográfico retrô para deixar o evento mais divertido, interativo e inesquecível.',
  mensagem_horas = '04 horas de operação',
  mensagem_informacoes = '✔ Equipamento disponível durante todo o período contratado
✔ Fotos e impressões ilimitadas
✔ Layout personalizado com a identidade do evento
✔ Kit de adereços divertidos
✔ Montagem, operação e desmontagem
✔ Fotos entregues em formato digital após o evento'
where nome = 'Totem Retrô';

update servicos set
  mensagem_descricao = 'Cabine fotográfica para garantir registros divertidos e especiais, com muita interação entre os convidados.',
  mensagem_horas = '04 horas de operação',
  mensagem_informacoes = '✔ Equipamento disponível durante todo o período contratado
✔ Fotos e impressões ilimitadas
✔ Layout personalizado
✔ Kit de adereços divertidos
✔ Montagem, operação e desmontagem
✔ Fotos entregues em formato digital após o evento'
where nome = 'Cabine Fotográfica';

update servicos set
  mensagem_descricao = 'Espelho Mágico Luxo, com uma experiência interativa, elegante e divertida para os convidados.',
  mensagem_horas = '04 horas de operação',
  mensagem_informacoes = '✔ Equipamento disponível durante todo o período contratado
✔ Fotos e impressões ilimitadas
✔ Layout personalizado
✔ Kit de adereços divertidos
✔ Montagem, operação e desmontagem
✔ Fotos entregues em formato digital após o evento'
where nome = 'Espelho Mágico Luxo';

update servicos set
  mensagem_descricao = 'Uma atração moderna e interativa que transforma os momentos do seu evento em vídeos incríveis.',
  mensagem_horas = '04 horas de operação',
  mensagem_informacoes = '✔ Gravação com câmera em alta qualidade
✔ Vídeos personalizados com efeitos, música e identidade visual
✔ Envio imediato por QR Code
✔ Operador durante toda a ativação
✔ Montagem e desmontagem da estrutura'
where nome = 'Plataforma 360';

update servicos set
  mensagem_descricao = 'Pista de LED com estrutura moderna e sofisticada para valorizar a pista de dança e transformar o ambiente.',
  mensagem_horas = '04 horas de operação',
  mensagem_informacoes = '✔ Estrutura moderna e sofisticada
✔ Equipamento de alta qualidade
✔ Montagem e desmontagem pela nossa equipe
✔ Acabamento elegante para valorizar a pista de dança'
where nome = 'Pista de LED';

update servicos set
  mensagem_descricao = 'Uma experiência diferenciada para os convidados, com uma capa personalizada para registrar o seu evento de forma criativa e exclusiva.',
  mensagem_horas = '04 horas de operação',
  mensagem_informacoes = '✔ Capa personalizada com a identidade do evento
✔ Registro fotográfico para composição da capa
✔ Uma lembrança criativa e exclusiva do seu evento'
where nome = 'Capa de Revista';

update servicos set
  mensagem_descricao = 'Uma lembrança afetiva e criativa para reunir fotos e mensagens dos convidados em um álbum especial.',
  mensagem_horas = null,
  mensagem_informacoes = '✔ Álbum para recordações
✔ Materiais de decoração
✔ Canetinhas para mensagens dos convidados'
where nome = 'Scrapbook';
