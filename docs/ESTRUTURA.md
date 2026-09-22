# Estrutura do repositório

Monorepo com npm workspaces. Um repositório, vários apps, um Supabase
compartilhado — decidido em 2026-09-21 para não repetir a confusão que
tínhamos com o painel dentro do app de eventos (`plataforma-admin/` como
pasta solta na raiz, sem workspace, com lockfile próprio).

```
sala-de-operacoes/
├─ apps/
│  ├─ eventos/        ← Sala de Operações (Em Cena Eventos) — o produto que
│  │                     cada empresa cliente usa no dia a dia
│  └─ painel/         ← Painel da plataforma — ferramenta interna de quem
│                        opera a plataforma (você), gerencia as empresas
├─ supabase/
│  ├─ migrations/      ← formato padrão do Supabase CLI
│  │                     (<timestamp>_<descrição>.sql, aplicado com
│  │                     `supabase db push`/`migration list`)
│  ├─ functions/       ← Edge Functions (alerta-trava-d15,
│  │                     aplicar-automacoes-tempo, enviar-whatsapp,
│  │                     whatsapp-status)
│  ├─ schema.sql        ← schema base (histórico, ver README raiz)
│  └─ seed*.sql         ← seeds manuais (catálogo real, dados fictícios)
├─ docs/                ← ROADMAP, checklists, este arquivo
├─ .github/workflows/   ← CI (lint + test + build dos dois apps)
└─ package.json         ← workspaces: ["apps/*", "packages/*"]
```

`packages/` ainda não existe — só é criada quando houver código realmente
compartilhado entre apps (hoje não há nenhum import cruzado entre
`apps/eventos` e `apps/painel`, de propósito).

## Por que separado por app, e não por pasta solta

- **Cada app é um projeto Vercel independente**, com seu próprio
  `Root Directory` (`apps/eventos`, `apps/painel`) — deploys, domínios e
  variáveis de ambiente de um não afetam o outro.
- **Um só `npm install`** na raiz instala os dois (workspaces), e o CI
  (`npm run lint` / `npm run test` / `npm run build` na raiz) cobre os dois
  de uma vez — antes só o app da raiz (eventos) era testado, o painel
  ficava de fora.
- **Um terceiro app** (produto diferente, ou uma cópia isolada do sistema
  de eventos para um cliente que exija banco separado) entra como
  `apps/<nome>/` do mesmo jeito. Só cria repositório e Supabase à parte se
  o produto for mesmo independente — para "mais uma empresa cliente do
  sistema de eventos", o caminho é dados isolados por `empresa_id` dentro
  do mesmo `apps/eventos`, não um app novo (ver o plano de separação
  multi-empresa, discutido em conversa, ainda não documentado em arquivo).

## Comandos úteis (raiz do repositório)

```bash
npm install                 # instala eventos + painel de uma vez
npm run dev:eventos         # = npm run dev -w @sala/eventos
npm run dev:painel          # = npm run dev -w @sala/painel
npm run lint                # oxlint nos dois apps
npm run test                # vitest nos dois apps
npm run build               # tsc -b + vite build nos dois apps
```

## Supabase: um projeto só, dois apps

Os dois apps (`eventos` e `painel`) apontam para o **mesmo** projeto
Supabase (mesma `VITE_SUPABASE_URL`), cada um com seu `.env.local` próprio
dentro da pasta do app. O que diferencia o que cada um enxerga é RLS:
`eh_gestor()` para o app de eventos, `eh_super_admin()` para o painel.

As migrações agora vivem todas em `supabase/migrations/`, no formato que o
Supabase CLI espera. As 44 já aplicadas ao banco de produção foram só
renomeadas (mesmo conteúdo, mesma ordem — o número original de cada uma,
ex. `_039_`, continua no nome do arquivo). Uma migração nova, a partir de
agora, é criada com `npx supabase migration new <descrição>` (gera o
timestamp certo automaticamente).
