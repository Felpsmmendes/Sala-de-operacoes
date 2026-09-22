-- =============================================================================
-- Dados FICTÍCIOS pro painel da plataforma (2026-09-21) — só pra testar as telas.
--
-- NÃO é migração (não muda schema, não vai na sequência 0NN). Tudo criado aqui
-- é identificável: empresas com slug 'teste-*' e nome "[TESTE] …", leads com
-- nome "[TESTE] …". Chamados, cobranças, comentários e interações são filhos
-- dessas linhas (apagam junto). Pra remover tudo: rode
-- `supabase/seed_plataforma_teste_limpar.sql`.
--
-- Idempotente: apaga o que já for de teste e recria — pode rodar de novo (as
-- datas são relativas a HOJE, então rodar de novo "atualiza" o cenário).
-- Não toca na Em Cena nem em nenhum lead/empresa que não seja [TESTE].
-- Sem telefone nos leads e e-mails só em @example.com: nada aqui contata
-- ninguém de verdade.
-- =============================================================================

delete from empresas where slug like 'teste-%';
delete from leads_plataforma where nome_empresa like '[TESTE]%';

-- ---------- empresas (6) ----------
insert into empresas (nome, slug, plano, status, mrr, proxima_cobranca, saude, modulos_ativos, observacoes, url_sistema, criado_em) values
  ('[TESTE] Buffet Sabor & Arte', 'teste-buffet-sabor-arte', 'profissional', 'ativa', 599,
    (date_trunc('month', current_date) + interval '1 month' + interval '9 days')::date, 98,
    (select modulos from planos_plataforma where chave = 'profissional'), 'Cliente fictício — bom pagador.', 'https://buffet-sabor-arte.example.com', now() - interval '170 days'),
  ('[TESTE] Festa Total', 'teste-festa-total', 'essencial', 'ativa', 299,
    (date_trunc('month', current_date) + interval '1 month' + interval '9 days')::date, 95,
    (select modulos from planos_plataforma where chave = 'essencial'), null, 'https://festa-total.example.com', now() - interval '130 days'),
  ('[TESTE] Villa Eventos', 'teste-villa-eventos', 'profissional', 'ativa', 599,
    (date_trunc('month', current_date) + interval '1 month' + interval '9 days')::date, 62,
    (select modulos from planos_plataforma where chave = 'profissional'), 'Cliente fictício — mensalidade atrasada e chamado urgente.', 'https://villa-eventos.example.com', now() - interval '95 days'),
  ('[TESTE] Espaço Prime', 'teste-espaco-prime', 'profissional', 'manutencao', 599,
    (date_trunc('month', current_date) + interval '1 month' + interval '9 days')::date, 75,
    (select modulos from planos_plataforma where chave = 'profissional'), null, null, now() - interval '60 days'),
  ('[TESTE] Clube de Campo', 'teste-clube-de-campo', 'essencial', 'trial', 0,
    (current_date + 3), 100,
    (select modulos from planos_plataforma where chave = 'essencial'), 'Em período de teste.', null, now() - interval '12 days'),
  ('[TESTE] Restaurante do Vale', 'teste-restaurante-do-vale', 'essencial', 'suspensa', 299,
    null, 40,
    (select modulos from planos_plataforma where chave = 'essencial'), 'Suspensa por falta de pagamento.', null, now() - interval '165 days');

-- ---------- cobranças: mensalidades pagas dos meses anteriores ----------
-- (slug, valor, meses atrás em que começou, folga de pagamento em dias vs. vencimento)
insert into cobrancas_plataforma (empresa_id, descricao, tipo, valor, vencimento, status, pago_em, criado_em)
select e.id,
       'Mensalidade ' || (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[extract(month from v.venc)::int] || '/' || to_char(v.venc, 'YY'),
       'mensalidade', c.valor, v.venc, 'pago', v.venc + c.folga, v.venc - 10
from (values
  ('teste-buffet-sabor-arte', 599, -5, -1),
  ('teste-festa-total',       299, -4,  0),
  ('teste-villa-eventos',     599, -3,  2),
  ('teste-espaco-prime',      599, -2,  1)
) as c(slug, valor, de, folga)
join empresas e on e.slug = c.slug
cross join lateral (
  select (date_trunc('month', current_date) + make_interval(months => m) + interval '9 days')::date as venc
  from generate_series(c.de, -1) as m
) v;

-- Restaurante do Vale: pagou até 3 meses atrás, depois o mês seguinte foi cancelado (suspensão)
insert into cobrancas_plataforma (empresa_id, descricao, tipo, valor, vencimento, status, pago_em, criado_em)
select e.id,
       'Mensalidade ' || (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[extract(month from v.venc)::int] || '/' || to_char(v.venc, 'YY'),
       'mensalidade', 299, v.venc,
       case when m <= -3 then 'pago' else 'cancelado' end,
       case when m <= -3 then v.venc + 1 end,
       v.venc - 10
from empresas e
cross join generate_series(-5, -2) as m
cross join lateral (select (date_trunc('month', current_date) + make_interval(months => m) + interval '9 days')::date as venc) v
where e.slug = 'teste-restaurante-do-vale';

-- ---------- cobranças: mês atual + avulsas (implantação) ----------
insert into cobrancas_plataforma (empresa_id, descricao, tipo, valor, vencimento, status, pago_em, criado_em)
select e.id, x.descricao, x.tipo, x.valor, x.venc, x.status, x.pago_em, x.criado
from (values
  ('teste-buffet-sabor-arte', 'Mensalidade do mês', 'mensalidade', 599, (date_trunc('month', current_date) + interval '9 days')::date, 'pago', least(current_date, (date_trunc('month', current_date) + interval '9 days')::date), now() - interval '10 days'),
  ('teste-festa-total',       'Mensalidade do mês', 'mensalidade', 299, current_date + 5,  'pendente', null::date, now() - interval '5 days'),
  ('teste-villa-eventos',     'Mensalidade do mês', 'mensalidade', 599, current_date - 6,  'pendente', null::date, now() - interval '16 days'),
  ('teste-espaco-prime',      'Mensalidade do mês', 'mensalidade', 599, current_date + 12, 'pendente', null::date, now() - interval '3 days'),
  ('teste-espaco-prime',      'Implantação',        'implantacao', 1500, current_date - 40, 'pago', current_date - 38, now() - interval '55 days'),
  ('teste-clube-de-campo',    'Implantação',        'implantacao', 800, current_date + 3,  'pendente', null::date, now() - interval '2 days')
) as x(slug, descricao, tipo, valor, venc, status, pago_em, criado)
join empresas e on e.slug = x.slug;

-- "último pagamento" de cada empresa de teste = pagamento mais recente dela
update empresas e
set ultimo_pagamento_em = (select max(c.pago_em) from cobrancas_plataforma c where c.empresa_id = e.id and c.status = 'pago')
where e.slug like 'teste-%';

-- ---------- chamados (7) ----------
insert into chamados_plataforma (empresa_id, titulo, descricao, modulo, prioridade, status, responsavel, criado_em, atualizado_em, resolvido_em)
select e.id, x.titulo, x.descricao, x.modulo, x.prioridade, x.status, x.responsavel, now() - x.criado, now() - x.criado,
       case when x.status = 'resolvido' then now() - x.resolvido end
from (values
  ('teste-villa-eventos',       'Erro ao gerar contrato em PDF',           'Ao clicar em "Gerar documento" a tela trava e nada é baixado.', 'contratos',  'urgente', 'aberto',       'Felipe', interval '1 day',   null::interval),
  ('teste-espaco-prime',        'Sistema não envia e-mails de alerta',     'Os alertas de trava D-15 não chegam desde segunda.',            'crm',        'alta',    'em_andamento', 'Ana',    interval '2 days',  null),
  ('teste-festa-total',         'Migração dos dados de estoque',           'Importar planilha antiga de insumos.',                          'estoque',    'media',   'agendado',     'Ana',    interval '3 days',  null),
  ('teste-buffet-sabor-arte',   'Dúvida sobre o relatório de fechamento',  null,                                                            'fechamento', 'baixa',   'aberto',       null,     interval '5 hours', null),
  ('teste-villa-eventos',       'Ajustar template de contrato',            'Trocar cláusula de cancelamento.',                              'contratos',  'baixa',   'em_andamento', 'Felipe', interval '4 days',  null),
  ('teste-buffet-sabor-arte',   'Lentidão na agenda',                      'Calendário demorava para abrir.',                               'agenda',     'media',   'resolvido',    'Felipe', interval '7 days',  interval '5 days'),
  ('teste-restaurante-do-vale', 'Não consegue acessar o sistema',          null,                                                            null,         'urgente', 'resolvido',    'Ana',    interval '22 days', interval '20 days')
) as x(slug, titulo, descricao, modulo, prioridade, status, responsavel, criado, resolvido)
join empresas e on e.slug = x.slug;

-- comentários em alguns chamados
insert into chamados_plataforma_comentarios (chamado_id, autor, conteudo, criado_em)
select ch.id, x.autor, x.conteudo, now() - x.quando
from (values
  ('Erro ao gerar contrato em PDF',       'Felipe', 'Reproduzi o erro. Parece ser o template com aspas especiais.', interval '20 hours'),
  ('Erro ao gerar contrato em PDF',       'Felipe', 'Corrigindo — publico ainda hoje.',                              interval '3 hours'),
  ('Sistema não envia e-mails de alerta', 'Ana',    'Cliente confirmou que o e-mail cadastrado está correto.',         interval '1 day'),
  ('Lentidão na agenda',                  'Felipe', 'Resolvido com o ajuste de índice. Cliente confirmou.',            interval '5 days')
) as x(titulo, autor, conteudo, quando)
join chamados_plataforma ch on ch.titulo = x.titulo
join empresas e on e.id = ch.empresa_id and e.slug like 'teste-%';

-- ---------- prospecção: 8 leads, um em cada etapa ----------
insert into leads_plataforma (nome_empresa, contato_nome, contato_email, origem, etapa, plano_interesse, valor_potencial, observacoes, criado_em, atualizado_em) values
  ('[TESTE] Restaurante Bom Sabor',    'Carla Mendes',  'carla@example.com',   'Instagram', 'lead',         'essencial',    299,  null,               now() - interval '2 days',  now() - interval '2 days'),
  ('[TESTE] Bufê Encanto',             'Roberto Alves', 'roberto@example.com', 'Indicação', 'lead',         'profissional', 599,  null,               now() - interval '4 days',  now() - interval '4 days'),
  ('[TESTE] Casa de Festas Aurora',    'Patrícia Lima', 'patricia@example.com','Site',      'contato',      'profissional', 599,  'Pediu retorno na semana que vem.', now() - interval '9 days', now() - interval '3 days'),
  ('[TESTE] Eventos Premium SP',       'Marcos Souza',  'marcos@example.com',  'Indicação', 'demonstracao', 'enterprise',   1199, null,               now() - interval '15 days', now() - interval '2 days'),
  ('[TESTE] Salão Vila Nova',          'Julia Rocha',   'julia@example.com',   'Instagram', 'proposta',     'profissional', 599,  null,               now() - interval '20 days', now() - interval '1 day'),
  ('[TESTE] Rede Sabores',             'Diego Martins', 'diego@example.com',   'Indicação', 'negociacao',   'enterprise',   1199, 'Negociando desconto anual.', now() - interval '28 days', now() - interval '1 day'),
  ('[TESTE] Cerimonial Lumière',       'Helena Costa',  'helena@example.com',  'Site',      'ganho',        'profissional', 599,  null,               now() - interval '40 days', now() - interval '12 days'),
  ('[TESTE] Bar do Zé',                'José Ferreira', 'jose@example.com',    'Instagram', 'perdido',      'essencial',    299,  'Achou o valor alto.', now() - interval '35 days', now() - interval '18 days');

insert into leads_plataforma_interacoes (lead_id, tipo, conteudo, criado_em)
select l.id, x.tipo, x.conteudo, now() - x.quando
from (values
  ('[TESTE] Casa de Festas Aurora', 'ligacao',           'Primeiro contato — pediu material.',                interval '9 days'),
  ('[TESTE] Eventos Premium SP',    'reuniao',           'Demonstração realizada, pediu proposta.',           interval '2 days'),
  ('[TESTE] Eventos Premium SP',    'mensagem_whatsapp', 'Enviei o resumo dos módulos.',                      interval '3 days'),
  ('[TESTE] Salão Vila Nova',       'email',             'Proposta enviada (Profissional).',                  interval '1 day'),
  ('[TESTE] Rede Sabores',          'nota',              'Quer contrato anual com desconto.',                 interval '1 day'),
  ('[TESTE] Bar do Zé',             'ligacao',           'Disse que por enquanto não compensa.',              interval '18 days')
) as x(nome, tipo, conteudo, quando)
join leads_plataforma l on l.nome_empresa = x.nome;
