---
name: Sala de Operações
description: Painel interno de gestão da Em Cena Eventos — CRM, contratos, logística, financeiro e portal do cliente num só sistema.
colors:
  bg: "#050507"
  sidebar: "#08090d"
  panel: "#0b0d11"
  raised: "#111419"
  input: "#13171f"
  line: "rgba(255,255,255,0.07)"
  line-strong: "rgba(255,255,255,0.13)"
  line-focus: "rgba(255,255,255,0.18)"
  text: "#ffffff"
  text-dim: "rgba(226,232,240,0.80)"
  text-faint: "rgba(148,163,184,0.55)"
  text-ultra: "rgba(148,163,184,0.30)"
  accent: "#f59e0b"
  accent-strong: "#fbbf24"
  accent-ink: "#1c1206"
  success: "#22c55e"
  pending: "#f59e0b"
  danger: "#ef4444"
  neutral: "#94a3b8"
  money: "#16a34a"
  people: "#3b82f6"
  schedule: "#a855f7"
  ops: "#14b8a6"
  execucao: "#22c55e"
typography:
  body:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace"
    fontSize: "9-10px"
    fontWeight: 600
    letterSpacing: "0.12em"
    textTransform: uppercase
  mono:
    fontFamily: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace"
    fontVariation: "tabular-nums"
rounded:
  sm: "6px"
  md: "12px"
  lg: "18px"
  icon: "9px"
  full: "9999px"
spacing:
  card-padding: "16px"
  card-gap: "16px"
---

# Design System: Sala de Operações

## Overview

**Creative North Star: "Painel premium, sóbrio, dado em primeiro lugar"** — v2, 2026-09-10.

Substitui por completo o sistema anterior ("Mission Control Operations"/glassmorphism-everywhere). Referência declarada: dashboards como Linear, Vercel, Raycast — escuro mas não pesado, cor como sinal e nunca decoração, cada elemento com exatamente o peso certo. A mudança central em relação à v1: **superfícies sólidas, não vidro**. Só a TopBar mantém um traço de blur (fixa no topo, precisa se destacar do conteúdo passando por baixo); cards, sidebar, sub-boxes e listas são todos fundo sólido + borda + sombra, sem `backdrop-filter`.

O sistema de **cor por núcleo** (herdado da v1, "The Meaning-Color Rule") continua — cada tipo de informação carrega sempre a mesma cor em qualquer tela —, mas agora são **6 núcleos**, não 5 (ver Colors), e a cor de núcleo fica restrita a um punhado de elementos bem específicos (ícone de card, sparkline, dot "ao vivo", barra de progresso, badge de status ativo), nunca em borda/fundo de card, número KPI ou rótulo — ver "The Nucleus-Restraint Rule" abaixo. Essa é a maior mudança de filosofia da v2: a v1 tingia o card inteiro na cor da categoria; a v2 deixa o card neutro e concentra a cor num único elemento pequeno.

**Key Characteristics:**
- Superfícies sólidas (sem vidro/blur), exceto a TopBar — ver "The Solid-Surface Rule"
- Fundo quase-preto (nunca preto puro) como base; 4 camadas de profundidade (bg / sidebar / card / sub-box)
- 6 cores fixas de núcleo — restritas a IconBox, Sparkline, DotLive, ProgressBar, badge de status ativo e valor "herói"; nunca em borda/fundo de card ou label
- Todo dado real (valor, hora, contagem) em `JetBrains Mono`, nunca na fonte de UI (`Plus Jakarta Sans`)
- Estado nunca só por cor — todo Badge tem ícone junto (legível em escala de cinza)
- Item ativo do menu lateral é sempre âmbar (cor de marca/ação) — nunca a cor do núcleo daquele módulo
- Tema claro e escuro são o mesmo sistema, tokens invertidos (com contraste recalibrado por tema), nunca dois designs

## Colors

### Mapa de Núcleo → Cor (The Meaning-Color Rule)

Cada categoria de informação tem uma cor fixa, usada em QUALQUER tela onde aquela categoria aparecer:

| Cor | Token | Núcleo / significado | Onde aparece |
|---|---|---|---|
| **Âmbar** | `accent` `#f59e0b` | Ação / Comercial / marca | Botão primário, item ativo do menu, selo "pendente", logo |
| **Verde-escuro** | `money` `#16a34a` | Finanças / Dinheiro | Orçamentos, Contratos, Finanças, Fechamento Mensal |
| **Azul** | `people` `#3b82f6` | Equipe / Pessoas | CRM/Leads, Equipe do Evento (Escala), Confirmação de Chegada, Ponto Interno |
| **Roxo** | `schedule` `#a855f7` | Planejamento / Agenda | Agenda, Roteiro do Evento, bloco "eventos de hoje" do Dashboard |
| **Teal** | `ops` `#14b8a6` | Logística / Operações | Estoque, Frota e Entregas |
| **Verde-claro** | `execucao` `#22c55e` | Execução / Eventos ativos | Evento em andamento, dot "Operação Normal" da sidebar — **novo em 2026-09-10**, separado de `money` |

Verde (`success`)/vermelho (`danger`)/âmbar (`pending`) continuam também reservados para estado semântico dos Badges — não confundir com núcleo: no Badge, a cor comunica status (confirmado/pendente/recusado); no IconBox/Sparkline, comunica núcleo (de qual módulo é essa métrica). O contexto já deixa isso sem ambiguidade.

### Neutral
- **Base escura** (`#050507` fundo / `#08090d` sidebar / `#0b0d11` card / `#111419` sub-box): quatro camadas de profundidade, quase-preto, nunca `#000` puro.
- **Base clara** (`#f7f7f9` fundo / `#ffffff` sidebar, card e input / `#f1f2f5` sub-box): mesmo papel dos tokens escuros, invertido.
- **Texto**, 4 níveis (não mais 3): `text` branco (títulos/números) — `text-dim` 80% (conteúdo principal) — `text-faint` 55% (labels/descrições) — `text-ultra` 30% (metadados/rodapé). No claro, os mesmos 4 níveis em slate escuro.
- **Borda**, 3 níveis: `line` padrão (7% branco) — `line-strong` hover (13%) — `line-focus` foco/destaque (18%). Já são translúcidos por natureza (rgba), não precisam de sombra extra pra "brilhar" contra o fundo escuro como na v1.

### Named Rules

**The Meaning-Color Rule.** Toda cor de núcleo é fixa por significado, nunca por preferência estética da tela. Se uma métrica é sobre dinheiro, é `money` — em qualquer tela do sistema, sempre.

**The Solid-Surface Rule (substitui a Glass-Everywhere Rule da v1).** Nenhuma superfície do sistema usa `backdrop-filter`/vidro, exceto a TopBar (fixa, precisa se destacar do conteúdo por baixo ao rolar). Card, sidebar, sub-box e linha de lista são todos fundo sólido (`--color-panel`/`--color-raised`) + borda 1px + sombra — profundidade vem de sombra em camadas (`--shadow-card`), não de translucidez.

**The Nucleus-Restraint Rule (nova, a regra mais importante da v2).** Cor de núcleo aparece SÓ em: ícone do card (IconBox), Sparkline, DotLive, ProgressBar preenchida, badge de status operacional ativo, e o valor "herói" quando ele É o dado principal do núcleo. Cor de núcleo NUNCA aparece em: ícone da sidebar em repouso, borda de card, fundo de card, número KPI grande (sempre branco), label/título de seção, badge de contagem. Isso é uma inversão deliberada da v1 (que tingia o card inteiro na cor da categoria) — o card fica neutro, só o IconBox carrega a cor.

**The Brand-Not-Nucleus Rule (nova).** O item ativo do menu lateral usa sempre âmbar (cor de ação/marca), nunca a cor de núcleo do módulo — diferente da v1, que usava uma cor por item de menu. Simplifica a leitura: "onde estou" é sempre a mesma cor, "que tipo de dado é esse" é a cor de núcleo do card.

**The Icon-Plus-Color Rule.** Nenhum estado (sucesso/pendente/perigo) é comunicado só por cor — todo `Badge` carrega um ícone (`Check`/`Clock`/`AlertTriangle`/`Circle`), pensado pra continuar legível em escala de cinza.

## Typography

**Body Font:** Plus Jakarta Sans (com fallback de sistema)
**Mono/Label Font:** JetBrains Mono

**Character:** Plus Jakarta Sans carrega toda a prosa/rótulo da interface. JetBrains Mono é reservado a QUALQUER número, hora ou identificador real (valor monetário, contagem, relógio, horário de evento) E a todo label/badge uppercase — a mudança de fonte sozinha já sinaliza "isso é dado real ou rótulo estrutural", sem precisar de cor.

### Hierarchy
- **H1** (800, 22-26px, tracking -0.5px): título de página (`Cabecalho`).
- **H2/H3 de card** (700, 13-14px, tracking -0.2px): título de painel (`PanelHeader`).
- **KPI grande** (700, 28-30px, mono, tracking -1px): valor de `MetricCard` — sempre branco.
- **KPI médio** (700, 20-22px, mono): totais secundários.
- **Label de seção** (600, 9px, mono, uppercase, tracking 1.8px, `text-ultra`): títulos de grupo da sidebar, cabeçalhos de coluna.
- **Label de card** (600, 9-10px, mono, uppercase, tracking 1.2px, `text-faint`): rótulo de `MetricCard`, sempre neutro (nunca a cor do núcleo — ver Nucleus-Restraint Rule).
- **Body** (400, 14px, 1.55): texto corrido, padrão do `<body>`.
- **Descrição/subtítulo** (400, 10-11px, `text-faint`).
- **Metadados/rodapé** (mono, 9-10px, `text-ultra`).

### Named Rules
**The Mono-For-Structure Rule.** Se é um número/hora vindo do banco OU um label/badge uppercase, é `font-mono`. Se é prosa/título escrito por humano, é `Plus Jakarta Sans`. Nunca misturar.

## Layout

Container de conteúdo com teto de 1680px (`Conteudo`, `Cabecalho`), respiro lateral de 20–32px. Sidebar fixa à esquerda no desktop (≥960px), 210px de largura (recolhível a 64px, preferência salva em `localStorage`). Abaixo de 960px, barra inferior fixa com os módulos mais usados; sidebar e barra inferior nunca coexistem. TopBar de 48px acima do conteúdo, com blur — único ponto do sistema que ainda leva esse efeito.

## Elevation & Depth

Sem vidro (ver The Solid-Surface Rule) — profundidade vem de 3 camadas de sombra sobrepostas em `--shadow-card`:
1. `inset 0 1px 0 rgba(255,255,255,.06)` — bisel de luz vindo de cima, no topo interno do card.
2. Sombra ambiente larga e suave (`0 8px 24px -8px rgba(0,0,0,.7)`) — a profundidade "de verdade".
3. No hover, as duas intensificam (`--shadow-card-hover`) e o card sobe `translateY(-1px)`.

### Named Rules
**The Tone-Not-Glass Rule.** Onde antes um degradê de cor indicava hierarquia (v1), agora é o tom de fundo (`panel` vs. `raised` vs. `input`) que faz esse trabalho — 3 camadas sólidas, cada uma um degrau mais clara que a anterior.

## Shapes

Cantos consistentemente arredondados em 4 passos: `6px` (botão secundário, input, badge pequeno), `9px` (IconBox), `12px` (sub-box, item de menu), `18px` (Card/MetricCard/Panel — todo container de nível de página). Nunca canto reto em superfície interativa. Badges e chips de status são sempre `rounded-full` (pílula).

## Components

### AppShell (Sidebar + TopBar)
- **Sidebar:** 210px fixo, fundo sólido `--color-sidebar`, borda direita 1px `--color-line`. Logo "EC" em quadrado branco 34px (`rounded-[11px]`, texto preto peso 900). Nome "EM CENA" (peso 800) + "Sala de Operações" (mono 8px, `text-ultra`, uppercase).
- **Nav item:** SEMPRE neutro em repouso (ícone e texto `text-faint`) — cor de núcleo NUNCA aparece aqui (The Nucleus-Restraint Rule). Hover: fundo `rgba(255,255,255,.03)`, texto sobe pra `text-dim`. Ativo: fundo âmbar a 7%, borda âmbar a 15%, texto e ícone âmbar (The Brand-Not-Nucleus Rule) — nunca a cor do módulo.
- **Rodapé:** `DotLive` verde (`execucao`) pulsante + "Operação Normal", depois o atalho de perfil (leva a Configurações).
- **TopBar:** dentro de `Cabecalho`, faixa fixa com label mono "Centro Integrado de Controle" + `DotLive` âmbar + relógio à esquerda, alternador de tema à direita. Único elemento com `backdrop-filter` (`.topbar-glass`, blur médio) — precisa se destacar do conteúdo passando por baixo.

### Buttons
- **Shape:** `6px` (`rounded-sm`) em ambos — a v2 abandonou o `rounded-md` maior do primário da v1.
- **Primary:** fundo sólido `accent`, texto `accent-ink`. Hover: `translateY(-1px)` + fundo `accent-strong` + sombra `0 4px 12px rgba(0,0,0,.3)` (prompt master, seção 6.1) — v2 trocou o gradiente+glow colorido da v1 por um sólido simples, igual ao que todo botão inline do sistema já usa.
- **Secondary/Ghost:** borda `line`, texto `text-dim`, hover fundo `raised` + texto `text`. Sem mudança.
- **Perigo (ConfirmDialog):** nunca preenchido sólido — borda + fundo tintado a 10-15% (`border-danger/40 bg-danger/10 text-danger`).
- **`Button.tsx`** (componente, 2026-09-10): 5 variantes — `primary`/`secondary` (já existiam) + `ghost`/`danger`/`nucleus` (prompt master, seção 4.12, completadas nesta rodada). `nucleus` aceita `categoria` (mesmo mapa de núcleo do `MetricCard`) e tinge fundo/borda/texto a 10%/20%/100% via `color-mix` — pra ação cuja cor deve seguir o módulo (ex. "Ver logística"), diferente de `primary` (sempre âmbar, ação de marca). Os botões inline de cada tela continuam como estão — migrar é trabalho futuro, tela por tela.

### Badges (pílula de status)
- **Estilo:** fundo tintado a 15% da cor semântica, texto na cor cheia, ícone de 10px antes do texto, `rounded-full`, padding `9px/4px`, **fonte mono uppercase** (v2 — era sans na v1).
- **4 tons fixos de status:** sucesso (verde, `Check`), pendente (âmbar, `Clock`), perigo (vermelho, `AlertTriangle`), neutro (cinza, `Circle`) — sistema separado da cor de núcleo (Badge = status, IconBox = núcleo).

### Card / MetricCard (redesenhado 2026-09-10 — mudança de filosofia)
- **Corner:** `18px`. **Fundo:** sólido `--color-panel`, SEM gradiente/vidro. **Borda:** sempre neutra `--color-line` (nunca a cor do núcleo — era colorida na v1). **Sombra:** `--shadow-card` (ver Elevation). Hover (quando clicável): borda `line-strong`, `translateY(-1px)`, `--shadow-card-hover`.
- **IconBox** (30×30, `rounded-icon`/9px): único lugar do card com cor de núcleo — fundo a 8% da cor, borda a 20%, ícone a 90% de opacidade na cor (tom "-label" no tema claro, pra contraste).
- **Label:** mono uppercase, sempre `text-faint` (neutro — não mais a cor do núcleo, diferente da v1).
- **Valor grande:** sempre branco/mono, nunca a cor do núcleo — é o número KPI, banido da lista de "onde núcleo aparece".
- **Sparkline** (opcional): mini-linha na cor do núcleo, ao lado do valor — um dos poucos lugares permitidos.
- **DotLive** (opcional, `aoVivo`): dot pulsante na cor do núcleo, ao lado do label — só métrica em tempo real/"hoje".
- **Categoria:** `dinheiro | pessoas | agenda | operacao | acao | execucao | neutro` — 6 núcleos + neutro. Métrica que não se encaixa usa `neutro`, nunca força numa das 6 nem inventa uma 7ª.

### SubBox / Tables & Lists
- **Corner:** `12px`. **Fundo:** sólido `--color-raised` (um degrau mais claro que o card ao redor), sem gradiente. **Borda:** `--color-line`, ou tintada na cor de status/núcleo quando a linha tiver um status claro (ex.: contrato pago = `money` a 25%/7%, mesmo mecanismo `--row-color` de antes). **Hover** (linha clicável): borda `line-strong`/cor mais intensa, `translateY(-1px)`.
- **Sem blur** em nenhum caso — a v1 tinha uma exceção opt-in de blur leve pra listas curtas; a v2 não usa blur em superfície nenhuma além da TopBar.
- **Status:** sempre via `Badge`, nunca texto colorido cru numa célula/linha.
- **Componentes** (2026-09-10): `SubBox` (`ui/SubBox.tsx`, wrapper de props sobre a classe `.list-row` já existente) e `Tabela`/`CabecalhoTabela`/`ColunaTitulo`/`CorpoTabela`/`LinhaTabela`/`CelulaTabela` (`ui/Table.tsx`, prompt master seção 4.15) — até aqui só existia a classe CSS, sem componente; `LinhaTabela` aceita `categoria` pra tingir o hover na cor do núcleo, igual ao `--row-color` do `.list-row-tint`. 4 telas (Dashboard, Fechamento, Ponto, Financeiro) ainda usam `<table>` cru — migrar é trabalho futuro.

### Form Fields (2026-09-10 — novo)
- **`Input`/`InputMoeda`/`Select`/`Textarea`** (`ui/`, prompt master seção 4.7-4.9): fundo `--color-input`, borda `line`, `10px` de raio, todos compartilhando a classe `.campo` (index.css). **Foco: cor do `categoria` do campo** (mesmo mapa de núcleo do `MetricCard`, via `--campo-cor` inline) — decisão do usuário (2026-09-10) de preservar a convenção que as 35 telas com input cru já usam (`focus:border-money` em Contratos/Orçamentos, `-people` em CRM/Escala, `-schedule` em Agenda/Roteiro, `-ops` em Estoque/Logística), em vez do teal fixo que o prompt master original pedia. Sem `categoria`, cai em `--color-neutral` (mesmo default de telas sem núcleo forte, ex. Configurações/Auditoria). Erro: borda/glow vermelho (`--color-danger`) via classe `campo-erro`, sobrepõe a cor de núcleo.
- **`Checkbox`/`Toggle`** (`ui/`, seção 4.10-4.11): mesma regra — `categoria` decide a cor quando marcado/ativo, default neutro.
- **`RotuloCampo`** (`ui/RotuloCampo.tsx`): label mono uppercase ultra-muted, compartilhado pelos campos acima.
- **Migração concluída (2026-09-10)** — as ~30 telas/forms que tinham `<input>`/`<select>`/`<textarea>` cru agora usam `Input`/`Select`/`Textarea`/`Checkbox`, cada uma com a `categoria` que já tinha (dinheiro/pessoas/agenda/operação/neutro). Ficaram de fora, de propósito, os controles que não são "campo de formulário padrão": busca com ícone prefixado (`SeletorCliente`), composer de chat (`Conversas`), edição inline sem caixa visível (rename de funil em `PipelineLeads`), seletor de cor circular (idem), checkbox que dirige um card inteiro (`ServicoCard`) e o input compacto do checklist imprimível (`ChecklistEvento`) — forçar esses pro componente genérico pioraria o resultado, não padronizaria nada.

### Modal / EmptyState (2026-09-10 — novo)
- **`Modal`** (`ui/Modal.tsx`, seção 4.14): genérico, pra conteúdo que não é confirmação (isso já é o `ConfirmDialog`) — mesma receita visual (overlay `bg-black/70` sem blur, painel `bg-panel`/`border-line`/`rounded-lg`) de propósito, pra não ter dois estilos de modal concorrentes.
- **`EstadoVazio`** (`ui/EmptyState.tsx`, seção 4.17): ícone em sub-box + título + descrição + ação opcional, no lugar do `<p>` solto "Nenhum X encontrado" que cada tela escreve hoje.

### ProgressBar
- Trilho `--color-sidebar` (tom mais escuro do sistema), `rounded-full`, 5px de altura, borda `line`. Preenchimento na cor do núcleo a 75% de opacidade — único elemento de barra que carrega cor de núcleo.

### Charts (SVG à mão, sem biblioteca)
- **Linha** (`GraficoLinha`, `GraficoFaturamento`/ex-`GraficoDRE`): cor principal `money` (é sobre dinheiro).
- **Barras** (`GraficoBarras`/leads por funil): paleta dentro da família `people`/`schedule` (é sobre pessoas/pipeline) — nunca cor arbitrária fora da paleta do sistema.
- **Donut** (`GraficoDonut`): mesma lógica de herdar núcleo quando fizer sentido.
- **Sparkline:** ver Card acima.
- **Barra de proporção** (`GraficoBarraSplit`): sem mudança — segmentos empilhados, cor por status semântico (`success`/`pending`), não núcleo.

## Motion

Mesmos princípios de sempre: animar só `transform`/`opacity`, uma única linguagem de movimento, stagger só em grupos pequenos, sempre respeitando `prefers-reduced-motion`.

- **Entrada em cascata diagonal** (`.metric-grid`): grade de MetricCards entra com fade + `translate(-24px,-18px)` → `(0,0)`, ~900ms, delay de 180ms em cascata.
- **Scroll-reveal** (`Reveal`/`RevealGroup`, novo 2026-09-10): seções de página (não só grades pequenas) aparecem com fade + slide-de-cima conforme entram na viewport ao rolar — `once: true` (nunca reanima ao sair/voltar), `margin: -40px` (dispara um pouco antes de bater na borda). `RevealGroup` faz stagger de ~70ms entre filhos, pra grids de card. Implementado via `IntersectionObserver` puro (`useInView`) — o projeto não usa Framer Motion.
- **Hover elevado:** `translateY(-1px)` (v2 — era `-3px` na v1) em card/linha clicável, ~200ms.
- **Skeleton loading:** brilho horizontal em loop, no lugar de "Carregando..." em texto puro.
- **DotLive** (indicador "ao vivo"): dot pulsante (`box-shadow` crescendo/desaparecendo, ~2s), só em métrica/status em tempo real.
- **Feedback de clique:** todo botão encolhe (`scale(0.96)`) no clique.
- **Número contando:** valor "herói" sobe de 0 até o real (~1s) — 1-2 por tela, nunca toda métrica.

### Named Rules
**The One-Motion-Language Rule.** Todo o sistema usa o mesmo easing (`cubic-bezier(.22,1,.36,1)` pra entrada/hover, `cubic-bezier(.25,.46,.45,.94)` pro scroll-reveal) e a mesma filosofia (transform + opacity, nunca layout).

**The Reduced-Motion Rule.** Toda animação automática/decorativa precisa de fallback em `@media (prefers-reduced-motion: reduce)`.

## Do's and Don'ts

### Do:
- **Do** usar `JetBrains Mono` pra todo número/hora real e todo label/badge uppercase.
- **Do** manter a cor de um núcleo (dinheiro/pessoas/agenda/operação/execução) sempre igual em qualquer tela.
- **Do** restringir cor de núcleo a IconBox/Sparkline/DotLive/ProgressBar/badge de status ativo/valor-herói — nunca borda/fundo de card, número KPI ou label (The Nucleus-Restraint Rule).
- **Do** manter o item ativo do menu sempre âmbar, nunca a cor do módulo (The Brand-Not-Nucleus Rule).
- **Do** usar superfícies sólidas em tudo, exceto a TopBar (The Solid-Surface Rule).
- **Do** só mostrar selo de tendência (↑/↓ %) quando houver comparação real de período.
- **Do** aplicar scroll-reveal em seções de página e cascata em grades pequenas — nunca em listas longas (dezenas de linhas).

### Don't:
- **Don't** usar preto puro (`#000`) — a base escura é `#050507`, nunca preto absoluto.
- **Don't** aplicar vidro/`backdrop-filter` em card, sidebar, sub-box ou lista — só a TopBar.
- **Don't** tingir borda ou fundo de card na cor do núcleo — isso é a v1; a v2 deixa o card neutro.
- **Don't** colorir o item ativo do menu com a cor do módulo — é sempre âmbar.
- **Don't** inventar uma 7ª cor de núcleo — se uma métrica não encaixa nas 6, ela é neutra (cinza).
- **Don't** aplicar stagger/scroll-reveal em listas longas — reservar para grupos pequenos.
- **Don't** usar número contando em toda métrica pequena — reservar para 1-2 números "herói" por tela.
- **Don't** misturar tema: nenhuma cor pode existir só no `@theme` escuro sem contrapartida em `:root[data-theme='light']`.
