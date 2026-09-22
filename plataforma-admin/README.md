# Painel da Plataforma

Aplicação **separada** do Sala de Operações (`../`) — código, build e deploy
próprios, sem nenhum import cruzado com `../src`. É a ferramenta interna de
quem opera a plataforma (você), não uma tela a mais dentro do produto que
cada empresa (Em Cena incluída) usa no dia a dia.

Usa o **mesmo projeto Supabase** por baixo (mesmo banco, mesmas migrações
em `../supabase/`), só que só enxerga as tabelas de plataforma
(`empresas`, `super_admins`, `leads_plataforma*`) — RLS restringe tudo a
quem está em `super_admins` (ver `../supabase/migration_041_super_admins.sql`).

## Telas

| Rota | O que é | Dado |
|---|---|---|
| `/` Dashboard | MRR, clientes, leads, manutenções, receita 6 meses, funil, próximas ações, "Acessar sistemas" | calculado das outras tabelas |
| `/crm` | Funil de prospecção: cards arrastáveis entre colunas e **Editar pipeline** (criar, renomear, reordenar e excluir etapas) | `leads_plataforma*`, `etapas_plataforma` |
| `/empresas` | Clientes: plano, status, MRR, módulos, **endereço do sistema + botão Acessar sistema** | `empresas` |
| `/manutencoes` | Central de chamados, com comentários | `chamados_plataforma*` |
| `/financeiro` | Cobranças (lançar, baixar, reabrir), receita por mês, MRR por plano, indicadores | `cobrancas_plataforma` |
| `/configuracoes` | Planos (preço e módulos) | `planos_plataforma` |
| `/atividades` | Linha do tempo geral | montada das tabelas acima (sem tabela de log própria) |

Requer as migrações `039` a `045` (a `044` cria chamados, cobranças, planos e `empresas.url_sistema`; a `045` torna as etapas do pipeline editáveis).
Sem gateway de pagamento: cobrança é lançada e baixada à mão. "Atrasada" é derivada
(pendente + vencimento passado), nunca gravada.

Testes: `npm test` (cálculos de MRR, atraso, inadimplência, receita por mês, funil).

## Rodar localmente

```
cd plataforma-admin
npm install
npm run dev
```

Copie `.env.example` para `.env.local` com os mesmos valores do `../.env.local`
do app principal (mesmo projeto Supabase).

Login: a mesma conta que você já usa no Sala de Operações — o acesso é
decidido por estar ou não em `super_admins`, não por uma senha diferente.

## Deploy

Projeto Vite independente — na Vercel, aponte um projeto novo com
**Root Directory** = `plataforma-admin` (o app principal continua sendo
outro projeto Vercel, apontando pra raiz do repositório). Configure as
mesmas duas variáveis de ambiente (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) no painel do novo projeto Vercel, e um
domínio/subdomínio só seu (nunca sob o domínio de nenhuma empresa cliente).

## Por que um app à parte (e não uma tela dentro do Sala de Operações)

Decisão explícita do usuário (2026-09-21): o painel de gerenciar empresas é
ferramenta do dono da plataforma, não parte do produto que qualquer empresa
(Em Cena inclusive) usa. Antes disso ele vivia dentro do próprio Sala de
Operações (rotas `/plataforma` e `/plataforma/crm`, visíveis só a
`super_admins`) — funcionava, mas ficava com a cara de "mais uma tela do
sistema da Em Cena", o que é o oposto do que deveria transmitir. Virou este
app separado; as rotas/links equivalentes foram removidos do app principal.
