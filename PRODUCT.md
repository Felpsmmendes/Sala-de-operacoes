# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Usuário primário: o gestor/operador da Em Cena Eventos (empresa de produção de eventos — bar/coquetelaria + atrações fotográficas para casamentos, aniversários, debutantes, eventos corporativos). Hoje é literalmente 1 pessoa administrando o negócio inteiro pelo sistema, dia a dia — da prospecção de um lead até o fechamento financeiro do mês. Um segundo usuário interno ("o chefe") está entrando via Ponto Eletrônico (conta própria, ainda não gestor), e a equipe interna deve crescer aos poucos.

Usuários secundários, sem login: freelancers escalados por evento (confirmam chegada por link público) e clientes/contratantes (aprovam moldura/vídeo e assinam homologação pelo Portal do Cliente, por link com token).

## Product Purpose

"Sala de Operações" é o sistema interno de gestão da Em Cena Eventos — substitui um painel anterior mais simples (`../Texto/`, fora deste repositório) e planilhas soltas. Cobre os 5 núcleos do PRD da empresa: Comercial (CRM/Pipeline, Orçamentos, Contratos), Planejamento (Agenda, Escala & Equipe, Estoque & Compras, Carga & Logística), Execução em tempo real (Dashboard/monitor do dia, Ficha Técnica/Cue Sheet, Ponto), Encerramento & Controladoria (Auditoria pós-evento, Financeiro, Fechamento/DRE), e o Portal do Cliente. Sucesso = o gestor conseguir rodar o negócio inteiro (do lead ao evento realizado e pago) só por este sistema, com dado real, sem planilha paralela.

## Positioning

Não compete com um CRM/ERP genérico de mercado — é construído em cima das regras operacionais REAIS e específicas da Em Cena Eventos, que um concorrente genérico não replicaria: fórmula real de staffing de bar (bartender/barback por convidado), modelo de faturamento 20% sinal + 80% saldo com prazo D-20, fórmula real de cálculo de frete (combustível + ajuda de custo por barman + margem + mínimo), catálogo real de serviços (pacotes de bar, atrações) com preço vigente, e checklist real de carga migrado das planilhas da empresa.

## Operating Context

Eventos presenciais reais (casamentos, aniversários, debutantes, corporativo) com equipe de bar (bartenders/barbacks/head bartender), atrações fotográficas, frota própria (caminhão/van/sedan) fazendo romaneio de carga entre um galpão (estoque físico) e o local do evento. Pagamento ao cliente via PIX (BR Code gerado offline, sem integração bancária). O Dashboard ("Sala de Operações") é pensado como uma tela "sala de guerra" — fica aberta o dia inteiro num monitor fixo mostrando os eventos de hoje ao vivo. Operação no Brasil (Real, CPF, PIX) — interface 100% em português.

## Capabilities and Constraints

- Backend Supabase (Postgres + RLS + Auth), sem servidor próprio.
- Deploy manual via Vercel CLI (`vercel --prod`) — **este projeto não usa Git**, então nada é publicado automaticamente; cada mudança precisa de build + deploy explícito.
- Uma conta gestora trava acesso total (`eh_gestor()`, UUID fixo); contas de funcionário interno (Ponto Eletrônico) autenticam separado, sem acesso ao painel de gestão.
- Self-signup desabilitado no Supabase Auth (achado de auditoria de segurança).
- Migrações SQL são arquivos numerados em `supabase/`, aplicados manualmente pelo usuário no SQL Editor do Supabase — eu não tenho acesso de escrita direto ao banco.
- Stack: Vite + React 19 + TypeScript + Tailwind v4 (tokens via `@theme` em `src/index.css`) + React Router + `@supabase/supabase-js`. Sem framework de componentes de terceiros (nem shadcn/Radix) — componentes próprios (`Panel`, `Badge`, `MetricCard`, gráficos SVG à mão).
- 17 telas (15 internas + 2 públicas sem login), código-splitted por rota.

## Brand Commitments

Nome fixo: **Em Cena Eventos**. Selo de marca atual: emblema quadrado "EC" em cor de destaque (usado no topo da sidebar e nas telas públicas/login) — tratar como ativo de marca a preservar em qualquer redesign, mesmo que a paleta/tema visual mude.

O sistema tem hoje um design system já em produção, "Mission Control Operations" (dark, grafite quente, acento âmbar `#e8a13d`, `Inter` + `IBM Plex Mono`, ver `src/index.css`) — é evidência do estado visual atual, não necessariamente vinculante; o usuário pediu uma referência nova (`docs/referencias/image.png`, um dashboard SaaS "Efferd") como direção pra um redesign, então a decisão de manter/substituir esse sistema visual específico é do `new-work`, não deste arquivo.

## Evidence on Hand

- `docs/ROADMAP.md` — histórico completo de todas as fases de construção, decisões de negócio confirmadas com o usuário, e bugs reais já corrigidos.
- `docs/referencias/image.png` — referência visual nova fornecida pelo usuário (dashboard "Efferd": sidebar com seções agrupadas, cards de KPI com badge de tendência, gráfico de área, donut com legenda lateral, barra de split horizontal, tabela com pills de status).
- Catálogo real de serviços (`supabase/seed.sql`) e planilhas reais de checklist de carga (`docs/*.xlsx`).
- Produção já populada com dado de demonstração real (não fictício em estrutura, só em nome de cliente) cobrindo o ciclo completo lead → evento → financeiro.
- Não fabricar: métricas/depoimentos/clientes de mercado (não é produto vendido a terceiros, é uso interno de uma empresa só).

## Product Principles

1. Nunca inventar dado ou fórmula — toda regra de negócio (staffing, frete, 20/80, D-20) vem confirmada com o usuário ou migrada de planilha/painel real da empresa.
2. Interação construída à mão em vez de biblioteca pesada, quando dá — drag-and-drop nativo, gráficos SVG próprios, sem framework de componentes de terceiros.
3. Nunca duplicar dado entre tabelas — valores derivados (DRE, saldo) sempre calculados a partir do lançamento real, nunca gravados à parte.
4. Público sem login (freelancer, cliente) só vê e faz o mínimo necessário, nunca dado sensível (diária, valor de contrato).
5. Todo achado de bug/decisão de negócio fica registrado no ROADMAP.md, na ordem em que aconteceu.

## Accessibility & Inclusion

Nenhum requisito formal estabelecido. Auditoria própria (2026-09-06/07) encontrou lacunas reais (quase nenhum `aria-label`, zero `tabIndex`, contraste de cor abaixo do WCAG AA em parte da paleta clara — parte já corrigida) — registrado como dívida conhecida, não como meta confirmada, já que hoje o uso é só o gestor + 1 pessoa. Reavaliar se a equipe interna crescer.
