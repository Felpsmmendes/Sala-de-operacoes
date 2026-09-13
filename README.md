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

## Alerta automático de Trava D-15/D-20 (Fase A do roadmap, 2026-09-10)

E-mail diário quando existe contrato ativo com saldo não quitado e evento
em até 20 dias — mesma regra do card "Contratos em risco D-20" do
Dashboard, só que chega até você sem precisar abrir o sistema. Só manda
e-mail quando há algo pra alertar (sem "tudo ok" diário).

- **Código:** `supabase/functions/alerta-trava-d15/index.ts` (Edge
  Function) + `supabase/migration_025_alerta_trava_d15_cron.sql` (agenda
  via `pg_cron`, 1x por dia).
- **Envio:** [Resend](https://resend.com) (grátis até 3.000 e-mails/mês).
  Sem domínio verificado, o remetente é `onboarding@resend.dev` — funciona,
  só não tem o seu domínio no "De:".
- **Deploy (uma vez, e de novo só quando o código da function mudar):**
  ```bash
  npx supabase login
  npx supabase link --project-ref <seu-project-ref>
  npx supabase functions deploy alerta-trava-d15 --no-verify-jwt
  npx supabase secrets set RESEND_API_KEY=re_xxx ALERTA_EMAIL_DESTINO=voce@emcena.com.br
  ```
  Depois disso, rode `migration_025_alerta_trava_d15_cron.sql` no SQL
  Editor (trocando `<PROJECT_REF>` pelo real antes).
- **`--no-verify-jwt`:** decisão consciente — a function só envia e-mail,
  nunca devolve dado sensível, e só o cron interno do projeto a chama.
  Mesma lógica dos outros endpoints públicos do sistema (RPC security
  definer em vez de autenticação de usuário).

## Automações do CRM (2026-09-11, reescrita em fluxo visual 2026-09-13)

Editor visual em canvas (aba "Automações" do CRM, `FluxoCanvas.tsx`,
biblioteca [`@xyflow/react`](https://reactflow.dev)) — tipo Zapier/n8n:
o gestor arrasta nós conectados por linhas (gatilho → condição → espera
→ ação → ação...) e desenha o fluxo inteiro na tela, sem precisar chamar
desenvolvimento pra cada automação nova. Substitui a v1 (formulário de
"1 gatilho + 1 ação por regra").

- **Nó `gatilho`** (1 por fluxo, sempre a entrada) — 3 tipos: lead novo
  criado, lead entra num funil específico, lead sem contato há N dias.
- **Nó `condicao`** — 2 saídas (Sim/Não) avaliadas contra o lead:
  "tem telefone cadastrado" ou "origem é X".
- **Nó `espera`** — pausa a execução por N dias antes de seguir pro
  próximo nó.
- **Nó `acao`** — mesmas 4 ações de antes: mover pra outro funil,
  registrar nota automática, criar tarefa na Agenda, enviar WhatsApp
  (usa o mesmo `enviar-whatsapp` da Fase B — precisa de template
  aprovado).
- **Execução é stateful:** `automacoes_execucoes` guarda em qual nó cada
  lead está parado (`no_atual_id`) — inclusive "esperando até dia X" num
  nó de espera. `lead_criado`/`mudanca_funil` iniciam a execução na hora
  (`aplicarAutomacoesEvento`, chamado de `Crm.tsx` logo após criar/mover
  um lead) e andam pelo grafo até parar; `tempo_sem_contato`, e a
  retomada de execuções paradas num nó de espera, rodam 1x por dia via
  cron (`supabase/functions/aplicar-automacoes-tempo`, agendado em
  `migration_027_automacoes_crm.sql`) — mesmo motor de grafo reescrito em
  Deno (comentário no arquivo explica o porquê da duplicação). Nunca
  trava a ação principal do app se uma automação falhar.
- **Sem duplicar disparo:** só 1 execução ATIVA por (fluxo, lead) —
  índice único parcial no banco.
- **Deploy da function do cron** (mesmo fluxo das outras):
  ```bash
  npx supabase functions deploy aplicar-automacoes-tempo --no-verify-jwt
  ```
  Depois, rodar `migration_027_automacoes_crm.sql` no SQL Editor — ela já
  faz `drop table if exists` das tabelas da v1 antes de criar o novo
  schema em grafo (`automacoes_fluxos`/`automacoes_nos`/
  `automacoes_conexoes`/`automacoes_execucoes`), então pode rodar direto
  mesmo se a versão antiga da 027 já tiver rodado.

## Comercial: leads esfriando + Relatório Executivo (Fase D do roadmap, 2026-09-11)

- **Leads esfriando** (CRM): painel novo listando leads em negociação
  (nem ganho, nem perdido) sem contato há 7+ dias, ordenado pelos mais
  valiosos primeiro. "Contato" é a interação mais recente registrada
  (`lead_interacoes`) — busca em lote pra todos os leads de uma vez
  (`buscarUltimoContatoPorLead`, `src/lib/api/leads.ts`), nunca 1
  consulta por lead. Sempre calculado sobre TODOS os leads, nunca sobre
  a busca/filtro ativo no momento.
- **Relatório Executivo em PDF** (Finanças → botão no painel do DRE):
  consolida financeiro (faturamento, DRE), operação (eventos,
  convidados, escalas, Trava D-15), comercial (novos leads, conversão) e
  satisfação (NPS médio do mês) num PDF de 1 página — o "Relatório
  Executivo" que apareceu no print original e nunca existiu de verdade.
  Nunca fabrica número: sem auditoria no mês, o NPS vira "sem dado";
  sem histórico de ganho/perda, a conversão vira "sem dado suficiente".
  Código: `src/lib/pdfRelatorioExecutivo.ts`.

## Contador de drinks em tempo real (Fase C do roadmap, 2026-09-11)

Link público por evento (`/drinks/:eventoId`, mesmo molde sem login do
Ponto Eletrônico) — o head bartender toca "+1" a cada drink servido no
posto. Sem POS, sem catálogo de receita: é um log de toques
(`registros_drink`, append-only), que alimenta o card "Drinks servidos
hoje" e o ritmo (drinks/hora) no Dashboard em tempo real — no lugar do
número fabricado que o print original pedia.

- **Código:** `supabase/migration_026_registros_drink.sql` (tabela + RLS
  + RPC `contar_drinks_evento`), `src/lib/api/drinks.ts`,
  `src/pages/DrinksPublico.tsx`.
- **Segurança:** anon só INSERE (nunca lê a tabela bruta); a tela
  pública mostra o total via RPC `security definer`, mesma lógica do
  Portal do Cliente (ver "Segurança" acima). Gestor lê os registros
  individuais (com horário) por RLS pra calcular o ritmo.
- **Sem "desfazer"** — mesma aceitação de risco do Ponto Eletrônico
  público: não é dado financeiro nem prova jurídica, é visibilidade
  operacional. Toque errado precisa de correção manual (fora do sistema,
  por ora).
- **Link pra copiar:** botão "Copiar link do contador de drinks" no card
  de cada evento de hoje, no Dashboard.

## Testes

```bash
npm test
```

Primeira suíte automatizada do projeto (2026-09-10) — até aqui toda
validação era Playwright manual contra produção, uma vez, durante o
desenvolvimento de cada fase (ver `docs/ROADMAP.md`), sem rodar de novo
depois. Cobre as funções puras de maior risco financeiro/operacional
(`*.test.ts` ao lado do arquivo original): `calcularStaffNecessario`
(dimensionamento de equipe), `calcularFrete` (preço de frete),
`diasAteEvento`/`calcularFaturamentoPorMes` (Trava D-15/20 e gráficos de
tendência), `formatarMoeda`/`formatarData`. Roda com Vitest, `mode: test`
carrega `.env.test` (valores fictícios, só pra `lib/supabase.ts` não
travar ao importar um módulo de `lib/api/*.ts`) — nenhum teste chama o
Supabase de verdade. Ainda não cobre componente/UI nem está num CI —
próximo passo natural seria isso.

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
- [x] Roteamento com as 15 telas do PRD (todas como placeholder no início — o componente `EmConstrucao` que fazia isso foi removido em 2026-09-10, já sem uso desde que a última tela saiu de placeholder)
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
- [x] Carga & Logística: frota, calculadora de frete real (30% margem,
  mínimo R$150), compras a caminho com data de chegada prevista.
  ~~Romaneio por evento com 4 fases de conferência~~ — removido de
  propósito na migração 016 (2026-09-09, decisão do usuário): a tela virou
  só a calculadora de frete, sem vínculo com evento. O checklist de carga
  por evento continua existindo, só que dentro de Estoque (aba
  "Checklists", `src/components/estoque/ChecklistEvento.tsx`).

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

## Documento de contrato + assinatura do cliente (2026-09-13)

Fluxo: escolher tipo de contrato (Bar Service / Photo Booth / Combo) →
sistema preenche o template com os dados do contrato → gestor edita
livremente → salva e copia o link do Portal do Cliente → cliente lê e
assina eletronicamente (nome + CPF + hash SHA-256 do conteúdo, mesmo
padrão da assinatura de homologação de mídia — mas um evento SEPARADO:
"aprovei a moldura" e "assinei o contrato" nunca se misturam).

- `src/lib/contratoTemplates.ts` — os 3 templates (HTML) + `preencherTemplate`.
- `ModalDocumentoContrato.tsx` (aba Contratos, botão "Gerar/Ver documento" em cada card) — editor rico simples via `contentEditable` não controlado (evita o bug clássico do cursor pular pro início a cada tecla quando `dangerouslySetInnerHTML` é re-renderizado a cada input).
- Portal do Cliente (`/portal/:token`) — nova seção abaixo da homologação de mídia, com o documento em fundo branco (papel) e o formulário de assinatura; trava D-15 já existente também bloqueia a assinatura do contrato.
- Badge "Contrato assinado" / "Aguardando assinatura" na listagem de Contratos.
- **Rodar `migration_028_documento_contrato.sql`** no SQL Editor do Supabase antes de usar — adiciona as colunas em `contratos` e estende a view `vw_portal_publico` (mesma view que a homologação já usa, só com 4 colunas novas) + a RPC pública `portal_assinar_contrato`.
