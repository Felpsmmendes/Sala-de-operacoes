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
  money: "#4ade80"
  people: "#5b9bff"
  schedule: "#a855f7"
  ops: "#2dd4bf"
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
---

# Design System: Sala de Operações

## Overview

**Creative North Star: "Mission Control, com vida"**

Um sistema pensado pra ficar aberto o dia inteiro numa sala de operações real — grafite quente e quase-preto (nunca preto puro) como base — mas onde as métricas e ações de destaque ganham profundidade visual real: vidro (glassmorphism), gradiente sutil e cor com significado fixo. Não é mais um sistema de acento único; é um sistema de **cor por categoria**, onde cada tipo de informação (dinheiro, pessoas, agenda, operação) carrega sempre a mesma cor em qualquer tela — a cor vira atalho de leitura, não decoração solta. Dado real (números, horários, status) continua sempre em fonte monoespaçada, como um painel de controle de verdade.

Redesenhado (2026-09-08) inspirado numa referência de dashboard trazida pelo usuário — estrutura "produto de dado" (cards de métrica, gráfico grande, donut, barra de proporção). Revisado (2026-09-09, duas rodadas) para incorporar glassmorphism: primeiro restrito a elementos de destaque, depois — após o usuário notar que o resultado parecia "dois estilos colados" (cards modernos, resto do sistema simples) — expandido para ser a identidade visual de TODO o sistema, em duas intensidades (vidro leve na base, vidro forte no destaque), não uma exceção pontual.

**Key Characteristics:**
- Vidro (glassmorphism) é a identidade visual de todo container do sistema — em duas intensidades: leve como padrão (Panel, listas, formulários), forte nos elementos de destaque (MetricCard, botão primário, sidebar)
- Grafite quente (nunca preto puro) como base sobre a qual todo o vidro se apoia
- 5 cores fixas por significado — nunca decorativas, nunca escolhidas ao acaso (ver Colors)
- Todo dado real (valor, hora, contagem) em `IBM Plex Mono`, nunca na fonte de UI
- Estado nunca só por cor — todo Badge tem ícone junto (legível em escala de cinza)
- Tema claro e escuro são o mesmo sistema, tokens invertidos (com opacidade recalibrada por tema — ver The Theme-Intensity Rule), nunca dois designs

## Colors

### Sistema de cor por significado (The Meaning-Color Rule)

Substituiu o antigo "acento único". Cada categoria de informação tem uma cor fixa, usada em QUALQUER tela onde aquela categoria aparecer — a mesma métrica nunca muda de cor entre módulos:

| Cor | Token | Significado | Onde aparece |
|---|---|---|---|
| **Âmbar** | `accent` `#e8a13d` | Ação / atenção / marca | Botão primário, item ativo do menu, selo "pendente", logo |
| **Verde** | `money` `#4ade80` | Dinheiro / receita | Orçamentos, Contratos, Finanças, Fechamento Mensal |
| **Azul** | `people` `#5b9bff` | Pessoas / equipe | CRM/Leads, Equipe do Evento (Escala), Confirmação de Chegada, Ponto Interno |
| **Roxo** | `schedule` `#a855f7` | Eventos / agenda | Agenda, Roteiro do Evento, bloco "eventos de hoje" do Dashboard |
| **Teal** | `ops` `#2dd4bf` | Operação / logística | Estoque, Frota e Entregas |

Verde/vermelho/âmbar continuam também reservados para estado semântico (sucesso/perigo/pendente) nos Badges — não confundir com o verde de "dinheiro": no Badge, a cor comunica status; no MetricCard/ícone de menu, comunica categoria. O contexto (Badge vs. card/menu) já deixa isso sem ambiguidade.

### Neutral
- **Base escura** (`#141311` fundo / `#1d1b19` painel / `#242220` elevado / `#0f0e0c` campo de input): quatro camadas de profundidade, grafite quente, nunca preto puro (`#000`).
- **Base clara** (`#f6f4ef` fundo / `#ffffff` painel e input / `#efebe2` elevado): mesmo papel dos tokens escuros, invertido.
- **Texto** (`#f3eee2` texto principal / `#b6ac9a` texto atenuado / `#948a76` texto apagado no escuro — `#292418`/`#6b6252`/`#6f6857` no claro): três níveis de ênfase, nunca uma quarta variação.
- **Borda** (`#2d2b27` linha / `#413d37` linha forte no escuro): superfícies sólidas (tabelas, formulários, listas) continuam usando `.border-line` puro, sem vidro.

### Named Rules
**The Meaning-Color Rule.** Toda cor de categoria (âmbar/verde/azul/roxo/teal) é fixa por significado, nunca por preferência estética da tela. Se uma métrica é sobre dinheiro, é verde — em qualquer tela do sistema, sempre.

**The Glass-Everywhere Rule (revisada 2026-09-09, substitui a Glass-For-Emphasis Rule original).** Vidro (blur + gradiente sutil) deixou de ser exclusividade de 3 elementos — agora é a linguagem visual padrão de TODO container do sistema, em duas intensidades:
  - **Vidro forte** (destaque): MetricCard principal, botão de ação primária, item ativo/hover da sidebar. Gradiente mais opaco, blur mais alto, sombra colorida mais presente — ver valores em Components.
  - **Vidro leve** (base): Panel/container de qualquer painel (inclusive os que envolvem tabelas e formulários), e cada LINHA de conteúdo dentro de listas (ex.: uma linha de contrato, um item de checklist) — que deixam de ser `<tr>`/linha crua e passam a ser mini-cards com vidro leve, gradiente quase neutro (ou na cor de status/categoria quando fizer sentido, ex.: linha de contrato pago com leve tom verde) e borda quase invisível.
  Isso resolve a sensação de "dois sistemas colados" — o vidro passa a ser a identidade visual de TUDO, com a intensidade variando por importância, nunca por presença/ausência total do efeito.

**The Legibility-First Rule (nova).** Mesmo com vidro em tudo, o TEXTO de dado real (número, nome, status) nunca fica sobre um fundo tão translúcido que prejudique a leitura — o vidro leve usa opacidade baixa o suficiente para nunca comprometer contraste. Listas com muitas linhas (ex.: 50 leads) não precisam de blur pesado em cada linha — o mini-card pode usar só gradiente + borda sutil, sem `backdrop-filter`, se a performance ou legibilidade justificar (ver nota de performance em Components > Tables).

**The Theme-Intensity Rule.** Todo elemento com vidro/gradiente usa opacidades DIFERENTES entre os temas — nunca os mesmos números só com a cor de base invertida. Fundo claro dilui cor visualmente mais que fundo escuro (se aproxima do branco), então o tema claro precisa de opacidade sensivelmente mais alta (na prática, cerca do dobro) para o efeito parecer igualmente presente nos dois temas. A meta é o mesmo EFEITO PERCEBIDO, não os mesmos valores de opacidade. Isso vale tanto pro vidro forte quanto pro vidro leve.

**The Icon-Plus-Color Rule.** Nenhum estado (sucesso/pendente/perigo) é comunicado só por cor — todo `Badge` carrega um ícone (`Check`/`Clock`/`AlertTriangle`/`Circle`), pensado pra continuar legível em escala de cinza.

## Typography

**Body Font:** Inter (com fallback de sistema)
**Mono/Label Font:** IBM Plex Mono

**Character:** Inter carrega toda a prosa/rótulo da interface — neutra, sem personalidade própria de propósito, pra nunca competir com o dado. IBM Plex Mono é reservado exclusivamente pra QUALQUER número, hora ou identificador real (valor monetário, contagem, relógio, horário de evento) — a mudança de fonte sozinha já sinaliza "isso é dado real", sem precisar de cor.

### Hierarchy
- **Display** (700, 26px, tight): título de página (`Cabecalho`), um por tela.
- **Title** (600, 16px): título de painel (`PanelHeader`).
- **Body** (400, 14px, 1.55): texto corrido, padrão do `<body>`.
- **Label** (700, 10.5px, uppercase, tracked 0.05em): rótulo de campo e de métrica — sempre `text-faint` ou `text-dim`, nunca a cor de texto principal (exceto dentro de um MetricCard glass, onde o rótulo herda um tom claro da cor de categoria — ver Components).
- **Mono/valor** (600, 24–30px, tabular-nums): valor grande de `MetricCard` e totais — sempre `IBM Plex Mono`.

### Named Rules
**The Mono-For-Real-Data Rule.** Se é um número ou hora que vem do banco, é `font-mono`. Se é rótulo/prosa escrito por humano, é Inter. Nunca misturar.

## Layout

Container de conteúdo com teto de 1680px (`Conteudo`, `Cabecalho`), respiro lateral de 20–32px. Grid responsivo (`grid-cols-1` — `lg:grid-cols-N`), nunca largura fixa em pixel pro conteúdo principal. Sidebar fixa à esquerda no desktop (≥960px), recolhível entre 220px (com rótulo) e 64px (só ícone) — preferência por dispositivo salva em `localStorage`. Abaixo de 960px, a navegação vira barra inferior fixa com os módulos mais usados; sidebar e barra inferior nunca coexistem.

Ritmo de página padrão: grade de métricas glass (2–3 colunas, cor por categoria) — gráfico grande isolado, largura total — faixa de 2–3 painéis complementares (donut, número em destaque, barra de proporção) — conteúdo operacional principal (cards ricos com vidro leve) + coluna lateral estreita (ações/lista compacta).

## Elevation & Depth

Duas intensidades de vidro coexistem, cobrindo o sistema inteiro (revisado 2026-09-09 — ver The Glass-Everywhere Rule):

1. **Vidro leve (a maior parte do sistema — NOVO padrão)**: todo Panel/container, e cada linha de conteúdo dentro de listas (contratos, leads, itens de checklist) usa gradiente sutil quase neutro (ou com leve tom da cor de status/categoria), borda quase invisível, sombra suave — sem o brilho forte do vidro de destaque. Substitui o antigo "tom sólido sem sombra" como base do sistema.
2. **Vidro forte (destaque)**: gradiente mais opaco, blur mais alto, borda e sombra coloridas mais presentes — reservado a MetricCard principal, botão de ação primária, item ativo/hover da sidebar. Continua sendo o que "chama atenção primeiro" numa tela — a diferença de intensidade em relação ao vidro leve é o que cria hierarquia visual, não a ausência total de vidro num dos dois.

### Named Rules
**The Tone-Not-Shadow Rule (mantida, mas escopo reduzido).** Elementos que não usam vidro (raro agora — ex.: um input de texto simples dentro de um formulário) continuam preferindo tom de fundo a sombra projetada quando precisam indicar profundidade sem o efeito de vidro completo.

**The Glass-Everywhere Rule (ver Colors).** Vidro (nas duas intensidades) é a linguagem visual padrão de todo container do sistema — não uma exceção pontual.

## Shapes

Cantos consistentemente arredondados em 3 passos: `6px` (botão secundário, input, badge pequeno), `10px` (botão primário, segmentado, elementos médios), `16px` (Panel, MetricCard — todo container de nível de página). Nunca canto reto (`rounded-none`) em superfície interativa. Badges e chips de status são sempre `rounded-full` (pílula), nunca `rounded-lg`.

## Components

### Buttons
- **Shape:** `10px` (`rounded-md`) para o primário; `6px` (`rounded-sm`) para o secundário.
- **Primary:** gradiente `linear-gradient(135deg, {accent-strong}, {accent})` — cor sólida forte, não diluída em transparência, então funciona igual nos dois temas sem precisar de ajuste de opacidade (a Theme-Intensity Rule se aplica a gradientes translúcidos sobre fundo, não a este caso). Texto `{accent-ink}` (quase preto — máximo contraste), sombra `0 4px 16px` na cor do âmbar a 35% (escuro) / 25% (claro, sombra colorida tende a pesar mais visualmente sobre fundo claro). Padding `12px 20px`.
- **Secondary/Ghost:** borda `{colors.line}`, texto `text-dim`, `hover:` fundo `raised` + texto `text`. Continua sólido, sem gradiente — o gradiente é exclusivo do botão de ação primária, pra não perder força.
- **Perigo (ConfirmDialog):** nunca preenchido sólido — borda + fundo tintado a 10-15% da cor (`border-danger/40 bg-danger/10 text-danger`), a mesma receita do banner de erro.

### Badges (pílula de status)
- **Estilo:** fundo tintado a 15% da cor semântica (`bg-success/15`), texto na cor cheia, ícone de 10px antes do texto, `rounded-full`, padding `10px/4px`. Sem vidro/blur — badge é elemento pequeno e denso, o efeito não cabe bem nesse tamanho.
- **4 tons fixos de status:** sucesso (verde, `Check`), pendente (âmbar, `Clock`), perigo (vermelho, `AlertTriangle`), neutro (cinza, `Circle`) — nunca uma 5ª cor de status (não confundir com as 5 cores de categoria, que são um sistema diferente, usado em MetricCard/menu, não em Badge).

### Cards / MetricCard (redesenhado 2026-09-09)
- **Corner:** `16px` (`rounded-lg`)
- **Background:** gradiente diagonal na cor da categoria, sobre o fundo base da página (nunca branco/painel sólido por baixo — o card usa a MESMA base de fundo que o resto da tela, com o gradiente por cima, em ambos os temas).
  - **Tema escuro:** `linear-gradient(135deg, cor-categoria a 22%, cor-categoria a 5%), var(--bg)`.
  - **Tema claro:** `linear-gradient(135deg, cor-categoria a 45%, cor-categoria a 12%), var(--bg)` — opacidade bem mais alta que no escuro. Testado visualmente: os mesmos valores de opacidade do tema escuro ficam "lavados"/sem força sobre fundo claro, porque o fundo claro já se aproxima do branco que dilui o gradiente. A regra não é "mesmos números, tons invertidos" — é "mesmo efeito percebido", o que exige mais que o dobro de opacidade no claro.
- **Backdrop-filter:** `blur(12px)` em ambos os temas.
- **Borda:** `1px solid`, cor da categoria — 35% no escuro, 50% no claro (mesma lógica de compensação de intensidade).
- **Sombra:** `0 8px 32px` na cor da categoria a 12% (escuro) / 18% (claro) de opacidade + `inset 0 1px 0 rgba(255,255,255,0.08)` no escuro / `rgba(255,255,255,0.5)` no claro (fiapo de luz no topo, reforça o efeito vidro nos dois temas).
- **Estrutura interna:** rótulo uppercase na cor da categoria — tom claro sobre fundo escuro (ex. `#f4b658`), tom mais escuro/saturado sobre fundo claro (ex. `#7a4d0c`) para manter contraste de leitura — linha 1 — valor grande mono em `text` (cor de texto principal do tema, não a cor da categoria — precisa de contraste máximo para leitura rápida) + selo de tendência opcional — linha 2 — legenda em `text-dim` — linha 3.
- **Categoria obrigatória:** todo MetricCard precisa declarar a qual categoria pertence (dinheiro/pessoas/agenda/operação/ação) — isso decide a cor. Uma métrica que não se encaixa em nenhuma categoria usa o cinza neutro (`neutral`), sem forçar em uma das 5.
- **Internal Padding:** 20px.

### Panel (container — atualizado 2026-09-09)
- **Corner:** `16px` (`rounded-lg`).
- **Background (vidro leve):** gradiente quase neutro sobre o fundo base — escuro: `linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015)), var(--bg)`; claro: `linear-gradient(160deg, rgba(0,0,0,0.04), rgba(0,0,0,0.01)), var(--bg)` (Theme-Intensity Rule também vale aqui — testar visualmente antes de travar o número exato).
- **Backdrop-filter:** `blur(20px)` — mais alto que o MetricCard, porque o gradiente de base é bem mais sutil, então o blur é o que garante a sensação de vidro real sem depender de cor forte.
- **Borda:** `1px solid rgba(255,255,255,0.09)` no escuro / `rgba(0,0,0,0.08)` no claro.
- **Sombra:** `0 12px 40px rgba(0,0,0,0.45)` no escuro / `rgba(0,0,0,0.12)` no claro + `inset 0 1px 0 rgba(255,255,255,0.06)` (fiapo de luz no topo, igual aos outros elementos de vidro).
- Todo `PanelHeader`, formulário e bloco de conteúdo dentro do Panel herda esse fundo — não é preciso vidro duplicado dentro do vidro.

### Charts (SVG à mão, sem biblioteca — revisado 2026-09-09)
- **Linha** (`GraficoLinha`, `GraficoFaturamento`/ex-`GraficoDRE`): curva suavizada (Bezier/`curveMonotone`, não segmentos retos ponta-a-ponta) — visual mais orgânico, alinhado à referência "Efferd". Continua com pontos marcados e área preenchida em gradiente por baixo. **Atenção:** a troca para curva deve ser feita com cuidado, dado o bug de renderização já identificado (linha aparecendo como traço reto diagonal) — validar visualmente após a troca, não assumir que resolve o bug sozinho.
- **Barras** (`GraficoFaturamento`/ex-`GraficoDRE`, qualquer gráfico de barra): cantos superiores arredondados (`rx` ~6px) em vez de retos, com gradiente vertical sutil (cor cheia no topo — ~35% opacidade na base) em vez de preenchimento sólido uniforme.
- **Donut** (`GraficoDonut`): anel mais fino que o atual (testar espessura ~8-10% do raio, contra o padrão anterior mais grosso), com leve `drop-shadow`/glow (blur pequeno, 3-4px, na cor da fatia) na fatia principal ou em hover — mesma lógica de destaque sutil do resto do sistema. Legenda lateral e número central continuam como já eram.
- **Sparkline (novo componente)**: mini-gráfico de linha sem eixo, sem grade, sem rótulo — só a curva do valor ao longo do tempo, dimensão pequena (ex. 60×24px), inserido dentro do próprio MetricCard de métricas com tendência histórica (ex.: Faturamento do Mês). Usa a cor da categoria daquele card. Não substitui o gráfico grande da tela — é um resumo visual adicional dentro do card.
- **Barra de proporção** (`GraficoBarraSplit`): sem mudança — 2+ segmentos empilhados na horizontal (`rounded-full`, 8px de altura) + legenda com bolinha.
- Gráficos em si continuam desenhados sem vidro/blur pesado no próprio SVG traço (isso prejudicaria a legibilidade da linha/barra fina) — o glow do donut e o gradiente das barras são exceções pontuais e sutis, não uma aplicação geral de blur.

### Navigation (Sidebar — redesenhada 2026-09-09)
- **Contêiner:** fundo em vidro — escuro: `linear-gradient(180deg, panel a 60%, bg a 70%)` + `blur(16px)`, borda branca a 8%, sombra `0 8px 32px rgba(0,0,0,0.4)`; claro: `linear-gradient(180deg, panel a 75%, bg a 85%)` + `blur(16px)` (opacidade mais alta, mesma lógica da Theme-Intensity Rule), borda preta a 6%, sombra `0 8px 24px rgba(0,0,0,0.10)`.
- **Item em repouso:** sem cor de fundo, ícone na cor da categoria daquele módulo (ex.: ícone do CRM em azul, ícone do Estoque em teal), texto em `text-dim`.
- **Item em hover:** fundo ganha um gradiente leve na cor da categoria daquele item — escuro: ~16%/4%; claro: ~32%/8% (Theme-Intensity Rule), borda sutil na mesma cor (25% escuro / 40% claro), texto sobe para a cor da categoria (usando o tom mais escuro/saturado no claro para manter contraste, igual ao MetricCard).
- **Item ativo:** mesmo tratamento do hover, mais intenso (escuro: gradiente 22%/6%, borda 35%, sombra colorida `0 4px 16px` na cor a 15%; claro: gradiente 45%/12%, borda 55%, sombra a 22%) — reforça "você está aqui" sem precisar de texto extra.
- Item "Painel" (Dashboard, sempre no topo, fora dos núcleos) usa a cor âmbar (ação/marca), não uma categoria específica.

### Tables & Lists (redesenhado 2026-09-09 — mini-cards de vidro leve, substitui a tabela crua)
- **Estrutura:** listas de registro (contratos, leads, itens de checklist, lançamentos financeiros) deixam de ser uma `<table>`/`<tr>` tradicional e passam a ser uma coluna de **mini-cards** — cada linha de dado é seu próprio container com vidro leve, não uma linha dividida por borda inferior.
- **Corner:** `12px` por linha (um pouco menor que o Panel que as envolve, para dar noção de hierarquia).
- **Background:** gradiente quase neutro (igual ao Panel), OU, quando a linha tem um status/categoria clara (ex.: contrato pago = dinheiro, item crítico de estoque = operação), gradiente sutil na cor daquele status — escuro: cor a 10%/2%; claro: cor a 22%/5% (Theme-Intensity Rule).
- **Borda:** `1px solid`, quase invisível quando neutro (`rgba(255,255,255,0.06)` escuro / `rgba(0,0,0,0.05)` claro) ou na cor do status quando aplicável (~18% escuro / ~30% claro).
- **Backdrop-filter:** opcional por lista — ver nota de performance abaixo. Quando presente, `blur(8px)` (mais leve que o Panel, para não empilhar blur sobre blur em excesso).
- **Nota de performance/legibilidade:** listas muito longas (50+ linhas visíveis ao mesmo tempo, ex. uma tabela de leads sem paginação) podem omitir o `backdrop-filter` de cada linha individual — o gradiente + borda sutil já comunicam a mesma identidade visual sem o custo de repetir blur dezenas de vezes na tela. O Panel que envolve a lista continua com blur normal; a omissão é só nas linhas internas, e só quando a contagem justificar.
- **Status:** sempre via `Badge`, nunca texto colorido cru numa célula/linha.
- **Cabeçalho de coluna** (quando a lista precisar, ex.: para ordenação): rótulo uppercase 10–10.5px, `text-faint`, sem fundo próprio — repousa diretamente sobre o vidro leve do Panel.

## Motion (novo, 2026-09-09)

Princípios gerais (seguindo a orientação de motion design consultada): animar só `transform` e `opacity` (nunca propriedades de layout como `top`/`width`/`height`), manter uma única linguagem de movimento em todo o sistema, stagger só em grupos pequenos (uma grade de métricas — não uma lista de 50 linhas), e sempre respeitar `prefers-reduced-motion` (remover/reduzir drasticamente qualquer animação automática para quem pediu menos movimento no sistema operacional).

### Entrada de página (cascata diagonal)
- Todo grupo pequeno de elementos de destaque (grade de MetricCards, painéis complementares) entra com fade + leve deslocamento diagonal de cima-esquerda (`translate(-24px, -18px)` → `translate(0,0)`, opacidade 0 → 1).
- Duração ~900-950ms por elemento, `cubic-bezier(.22,1,.36,1)` (easing "overshoot suave", mesmo já usado nas animações existentes do sistema).
- Delay em cascata de ~180ms entre um elemento e o próximo, na ordem em que aparecem na grade (esquerda pra direita, cima pra baixo).
- Aplica-se à entrada inicial da tela — não repete a cada re-render ou troca de filtro, só no carregamento/navegação para aquela tela.

### Hover elevado
- Cards clicáveis (MetricCard quando for link, linha de lista, card de contrato) sobem levemente (`translateY(-3px)`) e a sombra colorida já existente na categoria daquele elemento intensifica, ao passar o mouse.
- Transição rápida: ~200ms, mesmo easing da entrada.
- Não aplicar em elementos que não são clicáveis — hover elevado sinaliza interatividade, então usá-lo em algo estático confunde o usuário.

### Skeleton loading
- Enquanto um dado real (métrica, lista, gráfico) ainda não chegou do banco, mostrar um placeholder no formato/tamanho aproximado do conteúdo final, com um brilho horizontal (`background-position` animado em loop, gradiente claro passando da esquerda pra direita) — nunca um spinner genérico sozinho para conteúdo estruturado.
- Usar nos mesmos lugares que hoje mostrariam "Carregando..." em texto puro.

### Indicador "ao vivo" pulsante
- Uma bolinha pequena (~7px), na cor de status ou categoria relevante, com uma animação de pulso suave (`box-shadow` crescendo e desaparecendo em loop, ~2s de ciclo) — usada ao lado de métricas que representam algo em tempo real ou "hoje" (ex.: "eventos hoje", "equipe confirmada agora").
- Não usar em métricas históricas/estáticas (ex.: faturamento do mês passado) — o pulso comunica "isso pode mudar a qualquer momento", então só cabe onde isso é verdade.

### Feedback de clique
- Todo botão e controle clicável encolhe ligeiramente (`scale(0.96)`) no exato momento do clique/toque, retornando ao normal ao soltar — transição bem rápida (~100ms), sem easing elaborado (o objetivo é resposta imediata, não uma animação vistosa).

### Número contando
- Valores grandes em destaque (o número principal de um MetricCard, especialmente ao carregar a tela pela primeira vez) sobem de 0 até o valor real numa animação curta (~1s), em vez de aparecer já no valor final.
- Usar com moderação — só no valor "herói" de cada tela (1-2 números por carregamento de página), nunca em toda métrica pequena, ou o efeito perde força e a tela demora a "assentar" visualmente.

### Named Rules
**The One-Motion-Language Rule.** Todo o sistema usa o mesmo easing (`cubic-bezier(.22,1,.36,1)`) e a mesma filosofia de movimento (transform + opacity, nunca layout) em qualquer animação — nunca misturar uma tela com springs físicos e outra com easing linear, por exemplo.

**The Reduced-Motion Rule.** Toda animação automática ou decorativa (entrada em cascata, pulso, número contando, skeleton shimmer) precisa de um fallback dentro de `@media (prefers-reduced-motion: reduce)` que remova ou reduza drasticamente o movimento — animações que só respondem a uma ação direta do usuário (hover, clique) podem se manter mais leves, mas também precisam respeitar essa preferência.

## Do's and Don'ts

### Do:
- **Do** usar `IBM Plex Mono` pra todo número/hora real vindo do banco — nunca Inter pra dado numérico.
- **Do** dar ícone a todo Badge de status — nunca cor sozinha.
- **Do** manter a cor de uma categoria (dinheiro/pessoas/agenda/operação) sempre igual em qualquer tela — nunca reescolher a cor por gosto pontual daquela tela.
- **Do** aplicar vidro em TODO container (Panel, lista, formulário) — vidro leve como padrão, vidro forte só nos elementos de destaque (MetricCard, botão primário, sidebar). A diferença é de intensidade, não de presença/ausência.
- **Do** manter o texto de dado real (número, nome, status) sempre legível sobre o vidro — se uma lista muito longa sofrer de performance ou legibilidade com blur em cada linha, omitir só o `backdrop-filter` daquela linha (mantendo gradiente + borda), nunca abandonar a identidade visual por completo.
- **Do** só mostrar selo de tendência (↑/↓ %) quando houver comparação real de período — omitir o selo é sempre válido, fabricar o número nunca é.
- **Do** aplicar a entrada em cascata diagonal em toda grade pequena de destaque (MetricCards, painéis complementares) ao carregar uma tela — mas nunca repetir a animação em toda troca de filtro/re-render, só na entrada real da página.

### Don't:
- **Don't** usar preto puro (`#000`) — a base escura é grafite quente (`#141311`), nunca preto absoluto.
- **Don't** criar um botão vermelho sólido — ações destrutivas usam a mesma receita tintada dos banners de erro (`border-danger/40 bg-danger/10 text-danger`).
- **Don't** aplicar zebra-striping — mini-cards de vidro leve já diferenciam cada linha visualmente, um fundo alternado por cima seria redundante.
- **Don't** deixar qualquer painel, tabela ou lista "sólido cru" sem nenhum vidro — isso é o que causava a sensação de "dois estilos colados" que motivou esta revisão; toda superfície do sistema participa da mesma linguagem visual, ainda que em intensidade leve.
- **Don't** inventar uma 6ª cor de categoria — se uma métrica não encaixa nas 5 (dinheiro/pessoas/agenda/operação/ação), ela é neutra (cinza), nunca ganha uma cor nova sem essa decisão passar por revisão do design system.
- **Don't** aplicar stagger (entrada em cascata) em listas longas (dezenas de linhas) — o efeito vira lentidão perceptível em vez de polimento; reservar cascata para grupos pequenos (uma grade de métricas, poucos painéis).
- **Don't** usar número contando em toda métrica pequena da tela — reservar para 1-2 números "herói" por tela, ou o efeito perde força.
- **Don't** misturar tema: nenhuma cor pode existir só no `@theme` escuro sem uma contrapartida em `:root[data-theme='light']`, e vice-versa.
