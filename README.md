# Sala de Operações — Em Cena Eventos

Plataforma integrada de gestão operacional da Em Cena Eventos (bar de
coquetelaria autoral + atrações fotográficas). Substitui o painel anterior
(`../Texto/`, HTML/JS sem build + SQLite) — os dois convivem lado a lado
até este aqui cobrir tudo o que o antigo faz.

Origem: PRD executivo entregue pelo usuário (equipe cresceu — agora tem
freelancers, quer portal de cliente e infraestrutura própria). Ver
`../Texto/docs/referencias/stitch_em_cena_design_system/` pros modelos
visuais que inspiraram o design system.

## Stack

- **Frontend:** Vite + React + TypeScript
- **Estilo:** Tailwind CSS v4 (tokens do design system em `src/index.css`,
  bloco `@theme`)
- **Ícones:** lucide-react
- **Backend/dado:** Supabase (Postgres + Auth). Sem servidor próprio — o
  frontend fala direto com o Supabase via `@supabase/supabase-js`.
- **Hospedagem:** Vercel — **https://sala-de-operacoes.vercel.app**
  (produção real, não é mais só `localhost`).

## Como rodar pela primeira vez

### 1. Criar o projeto no Supabase (você precisa fazer isso, eu não crio conta por você)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (ou entre
   com GitHub/Google).
2. **New Project** → escolha um nome (ex: `em-cena-sala-operacoes`), uma
   senha de banco (guarde num lugar seguro) e a região mais próxima
   (`South America (São Paulo)`).
3. Espere o projeto provisionar (~2 min).
4. Vá em **Project Settings → API**. Copie:
   - **Project URL** → vai virar `VITE_SUPABASE_URL`
   - **anon public key** → vai virar `VITE_SUPABASE_ANON_KEY`
5. Vá em **Project Settings → Authentication → Providers → Email** e
   confirme que login por e-mail/senha está habilitado. Em
   **Authentication → Users**, clique **Add user** e crie o SEU usuário
   (o gestor) manualmente com e-mail e senha — é o único login que existe
   no sistema (ver "Acesso da equipe e do cliente" abaixo). Desative
   cadastro público se quiser (**Authentication → Settings → Allow new
   users to sign up** → off), já que ninguém além de você deve criar conta.

### 2. Aplicar o schema do banco

No painel do Supabase, vá em **SQL Editor → New query**, cole o conteúdo
de [`supabase/schema.sql`](supabase/schema.sql) e rode. Isso cria todas as
tabelas dos 5 núcleos (Comercial, Planejamento, Execução, Encerramento,
Controladoria) com RLS já configurado.

### 3. Configurar o app

```bash
npm install
cp .env.example .env.local
# edite .env.local com a URL e a chave anon do passo 1
npm run dev
```

Abra `http://localhost:5173` e entre com o e-mail/senha que você criou no
passo 1.

## Deploy (produção)

O sistema está no ar em **https://sala-de-operacoes.vercel.app** — é o
link que você usa no dia a dia (e o que dá pra mandar de verdade pros
links de Ponto e Portal do Cliente; copiado a partir do `localhost`, o
link não funciona pra mais ninguém).

Hospedado na Vercel (CLI, projeto `felipemendes1407-4350s-projects/sala-de-operacoes`),
sem repositório Git conectado ainda — cada deploy é manual:

```bash
npx vercel --prod --yes
```

As variáveis `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` já estão
configuradas no projeto Vercel (ambiente Production). Se trocar de
projeto Supabase, atualize lá também: `npx vercel env rm`/`env add`, ou
pelo painel da Vercel (Settings → Environment Variables).

`vercel.json` tem uma regra de rewrite pra tudo cair em `index.html` —
sem isso, recarregar a página em qualquer rota interna (ou abrir um link
direto de Ponto/Portal) dava 404, porque é um app de página única (SPA)
e o servidor não sabia que essas rotas existem de verdade.

## Segurança

Auditoria feita em 2026-09-06 (ver `docs/ROADMAP.md`, seção "Auditoria de
segurança pós-deploy") encontrou e corrigiu 2 problemas reais:
`eh_gestor()` agora trava num usuário específico (não bastava mais estar
"autenticado" — self-signup do Supabase permitia qualquer um virar
gestor), e o Portal do Cliente/Ponto público passaram a usar funções RPC
(`security definer`) em vez de select/update direto nas views, pra
ninguém conseguir listar/alterar tudo de uma vez sem o token certo.

Cadastro público desabilitado no Supabase Auth (confirmado via teste real
na API — `signup_disabled`) + `eh_gestor()` travado no uuid do gestor:
as duas camadas de proteção estão ativas.

## Acesso da equipe e do cliente (decisão de arquitetura)

- **Gestor** (você): único login de verdade no sistema, via Supabase Auth.
- **Freelancers** (bartenders, técnicos, motoristas): **não têm conta**.
  Cadastro fica na tabela `equipe`, sem autenticação. Convocação e
  confirmação de escala acontecem por WhatsApp/link (fora do sistema).
  **Ponto Eletrônico** (decisão do usuário, 2026-09-06): sem PIN, sem
  geofence/GPS — não é folha de pagamento nem prova de jornada, é só
  visibilidade operacional. Cada evento tem um link público
  (`/ponto/:eventoId`) onde o escalado confirma a própria chegada
  escolhendo o nome numa lista; o gestor vê quem chegou por evento e uma
  tabela de cobertura por data.
- **Cliente** (noivo/contratante): acessa o Portal do Cliente por link
  público com token (`/portal/:token`, ver `src/pages/PortalClientePublico.tsx`),
  sem criar conta. O token identifica o contrato; a trava D-15 é checada
  no momento da escrita, não é um `CHECK` de banco (data de hoje muda todo
  dia).

## Estrutura

```
src/
  lib/         cliente Supabase, contexto de autenticação, tipos do banco
  components/  Layout (sidebar desktop + barra inferior mobile), rotas protegidas
  pages/       uma página por tela do PRD (ver docs/ROADMAP.md pra ordem de construção)
supabase/
  schema.sql   schema completo (todas as tabelas + RLS)
```

## Roadmap

Ver [`docs/ROADMAP.md`](docs/ROADMAP.md) — este projeto é grande demais
pra construir de uma vez; cada núcleo do PRD vira uma fase própria, do
jeito que sempre foi feito no painel anterior (uma fase por vez, reporta e
para pra confirmar antes da próxima).

## Estado atual (Fase 1 — fundação)

- [x] Scaffold Vite + React + TS + Tailwind v4, tokens do design system
- [x] Schema completo do banco (`supabase/schema.sql`), RLS configurado
- [x] Roteamento com as 15 telas do PRD (todas como placeholder — ver `EmConstrucao`)
- [x] Autenticação (login do gestor, rota protegida)
- [x] Layout: sidebar fixa (desktop) + barra inferior (mobile), mesmo design system "Mission Control Operations"
## Estado atual (Fase 2 — Núcleo Comercial)

- [x] CRM & Pipeline de Leads: pipeline (kanban por status), tabela,
  busca/filtro, criar/editar/excluir, métricas do topo
- [x] Gerador de Orçamentos: catálogo real de serviços (`supabase/seed.sql`),
  cálculo 20% sinal / 80% quitação, mensagem de WhatsApp gerada e
  copiável, orçamentos salvos
- [x] Contratos & Faturamento 20/80: gera contrato a partir de orçamento,
  sinal/saldo automáticos, cobrança PIX real (QR Code + Copia e Cola
  gerados offline, sem API de banco), alerta de risco D-7
- [x] Agenda Operacional: calendário mensal, métricas, próximos eventos,
  troca de status. Todo contrato agora cria o `evento` operacional junto
  (automático, 1:1)
- [x] Estoque & Compras: itens do galpão, calculadora preditiva por
  convidado, ordem de compra emergencial, receber compra (lança entrada
  automática), histórico de avarias
- [x] Escala & Equipe: cadastro de freelancers (sem login), convocação por
  evento com diária, checklist traje/EPI, mensagem de convocação por
  WhatsApp (copiar/colar), simulador de hora extra
- [x] Carga & Logística: frota, romaneio por evento com 4 fases de
  conferência, sugestão automática de itens a partir do checklist padrão
  real da empresa, calculadora de frete real (30% margem, mínimo R$150),
  aviso ao tentar embarcar sem saldo quitado

Testado ponta a ponta com Playwright contra o Supabase real (ver
`docs/ROADMAP.md`, Fase 4c/4d, pra detalhes e o bug real corrigido).

## Estado atual (Fase 5 — Núcleo Execução)

- [x] Sala de Operações (Dashboard): monitor ao vivo dos eventos de hoje,
  badges reais de saldo/equipe/romaneio, atalhos rápidos, próximas datas
- [x] Ficha Técnica & Cue Sheet: cronograma de cues por evento
- [x] Ponto Eletrônico simplificado: sem PIN/geofence, link público de
  check-in por evento, painel de presença e cobertura por data

Testado ponta a ponta com Playwright contra o Supabase real, incluindo o
check-in público sem login (ver `docs/ROADMAP.md`, Fase 5).

## Estado atual (Fase 6 — Encerramento & Controladoria)

- [x] Pós-Evento & Auditoria: sobras/avarias/foto/NPS por evento
- [x] Finanças: lançamentos manuais + sincronização automática com
  Contratos (marcar sinal/saldo pago gera o lançamento sozinho)
- [x] Fechamento Mensal & DRE: lê a view `dre_mensal`, nunca duplica dado

Testado ponta a ponta com Playwright contra o Supabase real (ver
`docs/ROADMAP.md`, Fase 6).

## Estado atual (Fase 7 — Portal do Cliente)

- [x] Todo contrato já nasce com o portal do cliente (link único, sem login)
- [x] Painel do gestor: link do portal, moldura/vídeo propostos, status de aprovação, dados da assinatura
- [x] Portal público: aprovação de moldura/vídeo, assinatura digital (hash SHA-256), trava D-15
- [x] Bônus: gerador de PDF de proposta comercial em Orçamentos (`src/lib/pdfProposta.ts`)
- [ ] Seleção de coquetéis autorais — aguardando catálogo real (PDF do usuário)

Testado ponta a ponta com Playwright contra o Supabase real, incluindo o
fluxo completo do cliente sem login e a trava D-15 (ver `docs/ROADMAP.md`,
Fase 7).

## Estado atual (revisão de coerência geral pós-Fase 7)

- [x] Bug corrigido: "Excluir contrato" nunca funcionava desde a Fase 4a (FK restrict) — adicionado também "Cancelar" (reversível, sincroniza o evento)
- [x] Estoque ⇄ Logística conectados de verdade: vínculo manual checklist→item real, embarque desconta estoque de verdade
- [x] Despesas automáticas no DRE: compra recebida, frete calculado e diária de freelancer geram lançamento sozinhos (antes só a receita de contrato era automática)

Testado ponta a ponta com Playwright contra o Supabase real (ver
`docs/ROADMAP.md`, seção "Revisão de coerência geral").

## Feedback de uso real (CRM)

- [x] Histórico de conversa/contato por lead (mensagem/ligação/e-mail/reunião/nota) — mensagem de orçamento se registra sozinha
- [x] Scroll do Pipeline estilo Figma (arrastar segurando o botão do meio do mouse)

Ver `docs/ROADMAP.md`, seção "Feedback de uso real — CRM".
