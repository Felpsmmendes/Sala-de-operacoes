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

Redesenhado (2026-09-08) inspirado numa referência de dashboard trazida pelo usuário — estrutura "produto de dado" (cards de métrica, gráfico grande, donut, barra de proporção). Revisado (2026-09-09) para incorporar glassmorphism e paleta por significado, após o usuário avaliar o resultado do primeiro redesign e pedir mais vida visual, comparando com referências de dashboards modernos.

**Key Characteristics:**
- Grafite quente (nunca preto puro) como base; vidro + gradiente reservados aos elementos de destaque (métricas, botão primário, item ativo do menu)
- 5 cores fixas por significado — nunca decorativas, nunca escolhidas ao acaso (ver Colors)
- Todo dado real (valor, hora, contagem) em `IBM Plex Mono`, nunca na fonte de UI
- Estado nunca só por cor — todo Badge tem ícone junto (legível em escala de cinza)
- Tema claro e escuro são o mesmo sistema, tokens invertidos, nunca dois designs

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

**The Glass-For-Emphasis Rule.** Vidro (blur) e gradiente aparecem só em elementos de destaque: MetricCard principal, botão de ação primária, item ativo da sidebar, card em hover na sidebar. Tabelas, formulários, listas e inputs continuam sólidos e sem blur — o vidro nunca compromete a leitura de dado denso.

**The Theme-Intensity Rule.** Todo elemento com vidro/gradiente usa opacidades DIFERENTES entre os temas — nunca os mesmos números só com a cor de base invertida. Fundo claro dilui cor visualmente mais que fundo escuro (se aproxima do branco), então o tema claro precisa de opacidade sensivelmente mais alta (na prática, cerca do dobro) para o efeito parecer igualmente presente nos dois temas. A meta é o mesmo EFEITO PERCEBIDO, não os mesmos valores de opacidade.

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

Container de conteúdo com teto de 1680px (`Conteudo`, `Cabecalho`), respiro lateral de 20–32px. Grid responsivo (`grid-cols-1` → `lg:grid-cols-N`), nunca largura fixa em pixel pro conteúdo principal. Sidebar fixa à esquerda no desktop (≥960px), recolhível entre 220px (com rótulo) e 64px (só ícone) — preferência por dispositivo salva em `localStorage`. Abaixo de 960px, a navegação vira barra inferior fixa com os módulos mais usados; sidebar e barra inferior nunca coexistem.

Ritmo de página padrão: grade de métricas glass (2–3 colunas, cor por categoria) → gráfico grande isolado, largura total → faixa de 2–3 painéis complementares (donut, número em destaque, barra de proporção) → conteúdo operacional principal (cards ricos ou tabela sólida) + coluna lateral estreita (ações/lista compacta).

## Elevation & Depth

Duas camadas de profundidade coexistem, cada uma com seu papel:

1. **Camada base (a maior parte do sistema)**: profundidade por tom (`bg` → `panel` → `raised` → `input`), sem sombra dramática — igual antes. Usada em tabelas, formulários, listas, painéis de conteúdo denso.
2. **Camada de destaque (nova)**: vidro + gradiente + sombra colorida suave, usada só nos elementos que devem chamar atenção primeiro numa tela (MetricCard, botão primário, item ativo/hover da sidebar). A sombra aqui é intencional e colorida (`box-shadow` na cor da categoria, opacidade baixa), diferente do resto do sistema.

### Named Rules
**The Tone-Not-Shadow Rule (mantida para a camada base).** Fora dos elementos de destaque, elevação continua sendo mudança de tom de fundo, não sombra projetada.

**The Glass-For-Emphasis Rule (ver Colors).** Vidro e sombra colorida só nos elementos de destaque — nunca espalhados pelo sistema inteiro.

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

### Charts (SVG à mão, sem biblioteca)
- **Donut** (`GraficoDonut`): rosca + legenda lateral (bolinha colorida + rótulo + valor mono), texto no centro mostra o total ou a fatia em hover. Cores dos segmentos seguem a paleta de categoria quando fizer sentido (ex.: funil de leads usa tons de azul/roxo, não cores arbitrárias).
- **Barra de proporção** (`GraficoBarraSplit`): 2+ segmentos empilhados na horizontal (`rounded-full`, 8px de altura) + legenda com bolinha, pra comparação parte/todo onde um donut seria exagero.
- **Combo de faturamento** (`GraficoFaturamento`, ex-`GraficoDRE`): barras (receita/custo) + linha (lucro, pode ser negativo). Usa a cor `money` (verde) como cor principal, já que é sobre dinheiro.
- Gráficos continuam sólidos, sem vidro — o efeito de destaque já vem do MetricCard ao redor; aplicar blur no próprio gráfico prejudicaria a leitura da linha/barra.

### Navigation (Sidebar — redesenhada 2026-09-09)
- **Contêiner:** fundo em vidro — escuro: `linear-gradient(180deg, panel a 60%, bg a 70%)` + `blur(16px)`, borda branca a 8%, sombra `0 8px 32px rgba(0,0,0,0.4)`; claro: `linear-gradient(180deg, panel a 75%, bg a 85%)` + `blur(16px)` (opacidade mais alta, mesma lógica da Theme-Intensity Rule), borda preta a 6%, sombra `0 8px 24px rgba(0,0,0,0.10)`. É o único painel "estrutural" (não-métrica) que ganha vidro, porque fica visível o tempo todo e ancora visualmente o resto do sistema.
- **Item em repouso:** sem cor de fundo, ícone na cor da categoria daquele módulo (ex.: ícone do CRM em azul, ícone do Estoque em teal), texto em `text-dim`.
- **Item em hover:** fundo ganha um gradiente leve na cor da categoria daquele item — escuro: ~16%/4%; claro: ~32%/8% (Theme-Intensity Rule), borda sutil na mesma cor (25% escuro / 40% claro), texto sobe para a cor da categoria (usando o tom mais escuro/saturado no claro para manter contraste, igual ao MetricCard).
- **Item ativo:** mesmo tratamento do hover, mais intenso (escuro: gradiente 22%/6%, borda 35%, sombra colorida `0 4px 16px` na cor a 15%; claro: gradiente 45%/12%, borda 55%, sombra a 22%) — reforça "você está aqui" sem precisar de texto extra.
- Item "Painel" (Dashboard, sempre no topo, fora dos núcleos) usa a cor âmbar (ação/marca), não uma categoria específica.

### Tables (sólidas, sem vidro)
- **Header:** rótulo uppercase 10–10.5px, `text-faint`, borda inferior `line`.
- **Linha:** borda inferior `line/50`, sem fundo alternado (nunca zebra-striping).
- **Status:** sempre via `Badge`, nunca texto colorido cru numa célula.
- Tabelas ficam **fora** da regra de vidro — são conteúdo denso de leitura prolongada (Contratos, Financeiro, Estoque), e blur ali prejudicaria a leitura rápida de linha por linha.

## Do's and Don'ts

### Do:
- **Do** usar `IBM Plex Mono` pra todo número/hora real vindo do banco — nunca Inter pra dado numérico.
- **Do** dar ícone a todo Badge de status — nunca cor sozinha.
- **Do** manter a cor de uma categoria (dinheiro/pessoas/agenda/operação) sempre igual em qualquer tela — nunca reescolher a cor por gosto pontual daquela tela.
- **Do** reservar vidro/gradiente para os elementos de destaque (MetricCard, botão primário, sidebar) — nunca aplicar em tabela, formulário ou lista densa.
- **Do** só mostrar selo de tendência (↑/↓ %) quando houver comparação real de período — omitir o selo é sempre válido, fabricar o número nunca é.

### Don't:
- **Don't** usar preto puro (`#000`) — a base escura é grafite quente (`#141311`), nunca preto absoluto.
- **Don't** criar um botão vermelho sólido — ações destrutivas usam a mesma receita tintada dos banners de erro (`border-danger/40 bg-danger/10 text-danger`).
- **Don't** aplicar zebra-striping em tabela — linhas se diferenciam só pela borda inferior.
- **Don't** aplicar blur/vidro em tabelas, formulários ou qualquer superfície de leitura densa e prolongada.
- **Don't** inventar uma 6ª cor de categoria — se uma métrica não encaixa nas 5 (dinheiro/pessoas/agenda/operação/ação), ela é neutra (cinza), nunca ganha uma cor nova sem essa decisão passar por revisão do design system.
- **Don't** misturar tema: nenhuma cor pode existir só no `@theme` escuro sem uma contrapartida em `:root[data-theme='light']`, e vice-versa.
