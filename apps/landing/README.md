# Firme — landing page

Site estático (1 arquivo HTML, sem build) de venda do produto pra outras
empresas de eventos — diferente de `apps/eventos` (o produto em si) e
`apps/painel` (ferramenta interna de quem opera a plataforma).

## Rodar localmente

```
cd apps/landing
python -m http.server 8080   # ou qualquer servidor estático
```

Não precisa de `npm install` — é HTML/CSS/JS puro, sem dependência.

## Sobre as imagens em `assets/`

Os 5 prints (`dashboard.png`, `dashboard-full.png`, `crm.png`,
`equipe.png`, `financeiro.png`, `roteiro.png`) são capturas **reais da
interface** de `apps/eventos`, com **dado fictício** (leads, contratos e
equipe inventados — nenhum dado de cliente real). Foram tiradas
simulando login e respostas do Supabase via Playwright, não são
mockup desenhado — ver decisão em conversa (2026-09-22): a versão
anterior da landing usava um dashboard ilustrado à mão, e a tela real do
produto comunica muito mais "isso existe de verdade" do que um desenho.

Pra atualizar as imagens depois de uma mudança visual no produto, seria
preciso repetir esse processo (rodar `apps/eventos` localmente com dado
de teste e recapturar as telas).

## Pendente antes de publicar

- **Nome "Firme"**: verificado por busca (sem conflito de software
  encontrado — ver conversa), mas **sem checagem formal de INPI/domínio**.
  Confirme o registro antes de investir em marca de verdade.
- **Domínio e e-mail**: `firme.app` / `contato@firme.app` são placeholder
  — não foram comprados/configurados.
- **WhatsApp**: o número nos botões (`5511999999999`) é fictício —
  trocar pelo número real antes de publicar.
- **Preços**: de propósito sem valor fixo (`R$ ...`), só os 3 planos e
  "Fale com a gente" — decisão consciente até o modelo comercial estar
  definido (ver conversa).
- **Depoimentos/logos de cliente**: de propósito NÃO incluídos —
  a versão anterior usava nomes inventados ("Bar & Arte", "Cocktail
  Co."), que foram removidos. Só adicionar depoimento/logo real, com
  autorização de quem deu o depoimento.
- **Deploy**: ainda não publicado em lugar nenhum (nem Vercel). Precisa
  de confirmação antes de ir ao ar, igual aos outros dois apps (ver
  `../../docs/ESTRUTURA.md`).
