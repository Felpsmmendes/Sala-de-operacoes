---
name: Sala de Operações
description: Painel interno de gestão da Em Cena Eventos — CRM, contratos, logística, financeiro e portal do cliente num só sistema.
colors:
  bg: "#141311"
  panel: "#1d1b19"
  raised: "#242220"
  input: "#0f0e0c"
  line: "#2d2b27"
  line-strong: "#413d37"
  text: "#f3eee2"
  text-dim: "#b6ac9a"
  text-faint: "#948a76"
  accent: "#e8a13d"
  accent-strong: "#f4b658"
  accent-ink: "#1c1206"
  success: "#10b981"
  pending: "#e8a13d"
  danger: "#ef4444"
  neutral: "#8a8272"
typography:
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "10.5px"
    fontWeight: 700
    letterSpacing: "0.05em"
  mono:
    fontFamily: "'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace"
    fontVariation: "tabular-nums"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  full: "9999px"
spacing:
  card-padding: "20px"
  card-gap: "16px"
components:
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding}"
  metric-card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    padding: "16px"
  badge-sucesso:
    backgroundColor: "{colors.success}"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
  badge-perigo:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.danger}"
    rounded: "{rounded.full}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
---

# Design System: Sala de Operações

## Overview

**Creative North Star: "Mission Control Operations"**

Um sistema pensado pra ficar aberto o dia inteiro numa sala de operações real — grafite quente e quase-preto (nunca preto puro), um único acento âmbar reservado pra ação primária e "isso está ativo agora", e dado real (números, horários, status) sempre em fonte monoespaçada, como um painel de controle de verdade. Não é um SaaS de vendas: é uma ferramenta operacional pra uma pessoa só (o gestor) tocar o negócio inteiro — casamentos, bar, logística, financeiro — sem ruído visual competindo com a informação.

Redesenhado (2026-09-08) inspirado numa referência de dashboard trazida pelo usuário (`docs/referencias/image.png`): estrutura mais "produto de dado" — cards de métrica com selo de tendência real, gráfico grande isolado, faixa de painéis com donut/número-em-destaque/barra-de-proporção, tabelas compactas com badge de status — mantendo a paleta e o acento âmbar já estabelecidos da marca Em Cena (decisão do usuário: preservar identidade, adotar estrutura).

**Key Characteristics:**
- Grafite quente (nunca preto puro), acento âmbar único e raro
- Todo dado real (valor, hora, contagem) em `IBM Plex Mono`, nunca na fonte de UI
- Estado nunca só por cor — todo Badge tem ícone junto (legível em escala de cinza)
- Tema claro e escuro são o mesmo sistema, tokens invertidos, nunca dois designs

## Colors

Paleta restrita (Restrained): neutros dominantes + um único acento âmbar, verde/vermelho/âmbar reservados só pra estado semântico (sucesso/perigo/pendente), nunca decorativos.

### Primary
- **Âmbar de marca** (`#e8a13d` escuro / mesmo tom no claro): botão primário, foco, seleção de texto, item ativo do menu, linha de tendência em gráfico, selo "pendente". É a ÚNICA cor não-neutra usada fora de estado semântico — The One Accent Rule (ver Do's/Don'ts).

### Neutral
- **Base escura** (`#141311` fundo / `#1d1b19` painel / `#242220` elevado / `#0f0e0c` campo de input): quatro camadas de profundidade sem sombra, grafite quente, nunca preto puro (`#000`).
- **Base clara** (`#f6f4ef` fundo / `#ffffff` painel e input / `#efebe2` elevado): mesmo papel dos tokens escuros, invertido.
- **Texto** (`#f3eee2` texto principal / `#b6ac9a` texto atenuado / `#948a76` texto apagado no escuro — `#292418`/`#6b6252`/`#6f6857` no claro): três níveis de ênfase, nunca uma quarta variação.
- **Borda** (`#2d2b27` linha / `#413d37` linha forte no escuro): toda borda do sistema usa a classe `.border-line`, que também aplica um realce (`--shadow-borda`) — fiapo claro no escuro, sombra escura suave no claro.

### Named Rules
**The One Accent Rule.** O âmbar aparece em no máximo um elemento por decisão de UI — nunca dois botões âmbar concorrendo, nunca âmbar como cor de fundo de card. Everything else is neutral until it needs to mean something.

**The Icon-Plus-Color Rule.** Nenhum estado (sucesso/pendente/perigo) é comunicado só por cor — todo `Badge` carrega um ícone (`Check`/`Clock`/`AlertTriangle`/`Circle`), pensado pra continuar legível em escala de cinza.

## Typography

**Body Font:** Inter (com fallback de sistema)
**Mono/Label Font:** IBM Plex Mono

**Character:** Inter carrega toda a prosa/rótulo da interface — neutra, sem personalidade própria de propósito, pra nunca competir com o dado. IBM Plex Mono é reservado exclusivamente pra QUALQUER número, hora ou identificador real (valor monetário, contagem, relógio, horário de evento) — a mudança de fonte sozinha já sinaliza "isso é dado real", sem precisar de cor.

### Hierarchy
- **Display** (700, 26px, tight): título de página (`Cabecalho`), um por tela.
- **Title** (600, 16px): título de painel (`PanelHeader`).
- **Body** (400, 14px, 1.55): texto corrido, padrão do `<body>`.
- **Label** (700, 10.5px, uppercase, tracked 0.05em): rótulo de campo e de métrica — sempre `text-faint` ou `text-dim`, nunca a cor de texto principal.
- **Mono/valor** (600, 24–30px, tabular-nums): valor grande de `MetricCard` e totais — sempre `IBM Plex Mono`.

### Named Rules
**The Mono-For-Real-Data Rule.** Se é um número ou hora que vem do banco, é `font-mono`. Se é rótulo/prosa escrito por humano, é Inter. Nunca misturar.

## Layout

Container de conteúdo com teto de 1680px (`Conteudo`, `Cabecalho`), respiro lateral de 20–32px. Grid responsivo (`grid-cols-1` → `lg:grid-cols-N`), nunca largura fixa em pixel pro conteúdo principal. Sidebar fixa à esquerda no desktop (≥960px), recolhível entre 220px (com rótulo) e 64px (só ícone) — preferência por dispositivo salva em `localStorage`. Abaixo de 960px, a navegação vira barra inferior fixa com os módulos mais usados; sidebar e barra inferior nunca coexistem.

Ritmo de página padrão (2026-09-08): grade de métricas (2–3 colunas) → gráfico grande isolado, largura total → faixa de 2–3 painéis complementares (donut, número em destaque, barra de proporção) → conteúdo operacional principal (cards ricos ou tabela) + coluna lateral estreita (ações/lista compacta).

## Elevation & Depth

Sistema quase sem sombra — profundidade vem de CAMADA de tom (`bg` → `panel` → `raised` → `input`, cada um um degrau mais claro no escuro / mais escuro no claro), não de `box-shadow` dramático. A única sombra real do sistema é o realce de borda (`--shadow-borda`, aplicado via `.border-line` em todo elemento com borda): um fiapo branco sutil no tema escuro, uma sombra escura suave no tema claro — nunca as duas ao mesmo tempo, nunca em outro lugar do sistema.

### Named Rules
**The Tone-Not-Shadow Rule.** Elevação é uma mudança de tom de fundo, não uma sombra projetada. Um card "elevado" fica mais claro (escuro) ou mais escuro (claro) que o painel ao redor — não ganha `box-shadow`.

## Shapes

Cantos consistentemente arredondados em 3 passos: `6px` (botão, input, badge pequeno), `10px` (segmentado, elementos médios), `16px` (Panel, MetricCard — todo container de nível de página). Nunca canto reto (`rounded-none`) em superfície interativa. Badges e chips de status são sempre `rounded-full` (pílula), nunca `rounded-lg`.

## Components

### Buttons
- **Shape:** `6px` (`rounded-sm`)
- **Primary:** fundo `{colors.accent}`, texto `{colors.accent-ink}` (quase preto — máximo contraste sobre o âmbar), `hover:` `{colors.accent-strong}`. Padding `10px 16px`.
- **Secondary/Ghost:** borda `{colors.line}`, texto `text-dim`, `hover:` fundo `raised` + texto `text`. Nunca borda colorida em botão secundário.
- **Perigo (ConfirmDialog):** nunca preenchido sólido — borda + fundo tintado a 10-15% da cor (`border-danger/40 bg-danger/10 text-danger`), a mesma receita do banner de erro. The system has no solid-red button anywhere.

### Badges (pílula de status)
- **Estilo:** fundo tintado a 15% da cor semântica (`bg-success/15`), texto na cor cheia, ícone de 10px antes do texto, `rounded-full`, padding `10px/4px`.
- **4 tons fixos:** sucesso (verde, `Check`), pendente (âmbar, `Clock`), perigo (vermelho, `AlertTriangle`), neutro (cinza, `Circle`) — nunca uma 5ª cor.

### Cards / MetricCard
- **Corner:** `16px` (`rounded-lg`)
- **Background:** `{colors.panel}`, borda `{colors.line}` + realce de `.border-line`
- **Estrutura interna (MetricCard):** rótulo uppercase + ícone (linha 1) → valor grande mono + selo de tendência opcional (linha 2) → legenda (linha 3). O selo de tendência (2026-09-08) só aparece quando existe uma comparação real de período — nunca um número fabricado.
- **Internal Padding:** 16–20px

### Charts (SVG à mão, sem biblioteca)
- **Donut** (`GraficoDonut`): rosca + legenda lateral (bolinha colorida + rótulo + valor mono), texto no centro mostra o total ou a fatia em hover.
- **Barra de proporção** (`GraficoBarraSplit`, novo 2026-09-08): 2+ segmentos empilhados na horizontal (`rounded-full`, 8px de altura) + legenda com bolinha, pra comparação parte/todo onde um donut seria exagero (ex.: recebido × a receber).
- **Combo DRE** (`GraficoDRE`): barras (receita/custo) + linha (lucro, pode ser negativo — escala calcula o zero real).
- Toda cor de gráfico é herdada via `fill="currentColor"`/classe Tailwind — nunca uma cor hardcoded fora do sistema de tokens.

### Navigation
- **Sidebar:** seções agrupadas por rótulo pequeno uppercase (`text-faint`), item ativo = fundo `raised` + texto `accent`, ícone sempre presente (com ou sem rótulo, dependendo do estado recolhido).
- **Estados:** hover = fundo `raised` + texto `text`; ativo = fundo `raised` + texto `accent` (mesma cor do acento único de marca).

### Tables (padrão emergente, 2026-09-08)
- **Header:** rótulo uppercase 10–10.5px, `text-faint`, borda inferior `line`.
- **Linha:** borda inferior `line/50`, sem fundo alternado (nunca zebra-striping).
- **Status:** sempre via `Badge`, nunca texto colorido cru numa célula.

## Do's and Don'ts

### Do:
- **Do** usar `IBM Plex Mono` pra todo número/hora real vindo do banco — nunca Inter pra dado numérico.
- **Do** dar ícone a todo Badge de status — nunca cor sozinha.
- **Do** reservar o âmbar pra UM elemento por decisão de UI (ação primária OU item ativo OU selo pendente — nunca dois ao mesmo tempo competindo).
- **Do** só mostrar selo de tendência (↑/↓ %) quando houver comparação real de período — omitir o selo é sempre válido, fabricar o número nunca é.

### Don't:
- **Don't** usar preto puro (`#000`) — a base escura é grafite quente (`#141311`), nunca preto absoluto.
- **Don't** criar um botão vermelho sólido — ações destrutivas usam a mesma receita tintada dos banners de erro (`border-danger/40 bg-danger/10 text-danger`).
- **Don't** aplicar zebra-striping em tabela — linhas se diferenciam só pela borda inferior.
- **Don't** misturar tema: nenhuma cor pode existir só no `@theme` escuro sem uma contrapartida em `:root[data-theme='light']`, e vice-versa.
