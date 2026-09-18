# REVIEW COMPLETO V2 — Sala de Operações
## Decisões de produto, design, UX e estilo — 16/16 telas
## Felps + Claude · Duas sessões completas de review

> **Como usar:** Este documento é a referência mestre de decisões.
> Leia inteiro antes de iniciar qualquer sessão do Claude Code.
> Complementa (não substitui) PROMPT_MASTER_REDESIGN.md e PROMPT_P2_P3.md.

---

## PARTE 1 — IDENTIDADE VISUAL

### Tokens de cor definitivos

```css
/* Aplicar em src/styles/design-tokens.css */
--bg:         #08090A;  /* fundo da página */
--surface:    #101214;  /* cards, panels */
--hover:      #16191C;  /* hover de surface */
--border:     #24282C;  /* bordas */
--primary:    #F5C400;  /* amarelo Em Cena — uso restrito */
--text:       #F5F5F5;  /* texto principal */
--muted:      #858B93;  /* texto secundário */
```

### Nome da identidade
**Em Cena — Operations OS**
Estilo: Dark Premium + Mission Control + Editorial SaaS

### Regras absolutas de estilo (nunca violar)

| Regra | Correto | Errado |
|---|---|---|
| Amarelo | Só para ação principal, elemento selecionado, indicador crítico | Decoração, bordas genéricas, highlights |
| Verde/vermelho | Só semânticos e discretos | Saturados, dominando a tela |
| Emojis | Zero em toda a interface | 🍸 📸 🔮 ✨ 🤖 qualquer um |
| Ícones | Lucide exclusivamente | Ícones de marcas (Instagram, WhatsApp) |
| Linguagem de IA | Proibida | "AI insights", "Smart Analytics", "Recomendação inteligente" |
| Gradientes | Zero decorativos | Qualquer gradiente que não seja semântico |
| Animações | 150–250ms discretas | Constantes, chamativas, pulsando em tudo |

---

## PARTE 2 — HIERARQUIA DE UI

### Três níveis (vale para todas as telas)

```
NÍVEL 1 — Surface
  Grandes áreas da página: Eventos, Equipe, Financeiro
  Fundo: --surface (#101214)

NÍVEL 2 — Sections
  Separadores, títulos de grupo, cabeçalhos de seção
  Nunca vira card com borda

NÍVEL 3 — Data
  Tabela, lista, barra, badge, número
  É o conteúdo — não o container
```

**Regra:** Não transformar tudo em card + borda + sombra + badge + botão.
Isso faz o sistema parecer dashboard genérico de IA.

### Hierarquia por tipo de tela

| Tipo | Princípio |
|---|---|
| Operacional (06–09, 16) | Velocidade de leitura > quantidade de informação |
| Financeiro (10–11) | Hierarquia numérica > alerta visual |
| Gerencial (11, 13) | Menos cards → mais hierarquia → dados densos |
| Campo (09 modo campo, 12 kiosk, 16) | Mobile-first, botões grandes, fonte maior |
| Externa (15, 16) | Premium + confiança + simplicidade |

---

## PARTE 3 — COMPONENTES

### Já existe (não recriar)
`AlertaBanner`, `ProgressBar`, `Panel`, `PanelHeader`, `MetricCard`,
`EstadoVazio`, `GraficoLinha`, `GraficoBarrasHorizontal`, `GraficoDonut`,
`Paginacao`, `OrdenacaoColuna`, `Button`, `Badge`, `DotLive`

### Criados na sessão anterior (verificar se existem antes de recriar)
- `Avatar` — iniciais com cor por categoria
- `NotificacoesContext` — sino global em memória
- `SinoNotificacoes` — componente do sino na topbar

### Padrões de componente

**AlertaBanner:** sempre clicável → ativa filtro ou ação (nunca só informativo)

**ProgressBar:** anima de 0% → valor real ao montar (não aparece preenchida)

**Toast "Desfazer":** 8 segundos, em todas as ações reversíveis comuns
- Marcar sinal pago (Contratos)
- Mover lead (CRM)
- Marcar lançamento pago (Financeiro)

**Drawer:** entrada `translateX(100%) → translateX(0)` em 150–250ms
Usar para: edição, detalhe, formulários, histórico, configuração por item

**Avatar:** iniciais (máx 2 letras) + cor por função/contexto
- Bartender: azul
- Barback: verde
- Contexto financeiro: tom de dinheiro
- Neutro: cinza

**DotLive:** pulse discreto — SOMENTE no cue atual (tela 09)
Nunca em múltiplos elementos simultaneamente

---

## PARTE 4 — MICROINTERAÇÕES

### Card hover (todos os cards clicáveis)
```css
transform: translateY(-1px);
border-color: var(--border-hover); /* ligeiramente mais evidente */
box-shadow: 0 4px 12px rgba(0,0,0,0.2);
transition: all 150ms ease;
```

### ProgressBar ao montar
```css
/* largura começa em 0, anima para o valor real */
transition: width 400ms ease-out;
```

### Transição de status
```
⏳ Convocado → ✓ Confirmado
```
Fade + mudança de cor em 200ms. Não piscar, não animar excessivamente.

### Drawer
```css
transform: translateX(100%) → translateX(0);
transition: transform 200ms ease-out;
```

### Cue atual (tela 09 — único lugar com pulse)
```css
/* Só o cue atual, nunca múltiplos */
border: 1px solid rgba(245, 196, 0, 0.4);
background: rgba(245, 196, 0, 0.08);
/* DotLive ao lado do horário */
```

### Pulse no calendário (tela 05)
```css
/* Só o indicador "● HOJE" — pequeno e discreto */
animation: pulse 2s infinite;
opacity: 0.8;
```

---

## PARTE 5 — PADRÕES TRANSVERSAIS

### Alertas contextuais
Padrão em todas as telas: banner no topo do conteúdo, condicional, clicável.

| Tela | Gatilho | Ação ao clicar |
|---|---|---|
| 02 Contratos | Evento em ≤20 dias com pendência | Filtra lista para D-20 |
| 03 CRM | Lead sem contato há ≥7 dias | Filtra para leads esfriando |
| 06 Escala | Evento em ≤7 dias com cobertura incompleta | Abre card do evento |
| 07 Estoque | Item crítico com evento em ≤7 dias | Filtra para críticos |
| 08 Logística | Conflito de veículo / frota insuficiente | Abre grid de alocação |
| 09 Roteiro | NPS ≤4 nos últimos 30 dias | Filtra para avaliações baixas |
| 13 Auditoria | Portais pendentes com evento ≤7 dias | Lista portais pendentes |
| 15 Portal Admin | Portais pendentes com evento ≤7 dias | Filtra lista |

### Estados vazios
Sempre definidos, sempre úteis:
- Quando há problema: mensagem clara com ação
- Quando está em dia: confirmação positiva (verde discreto)
  Ex: "✓ Nenhum lançamento vencido" / "✓ Nenhum impacto operacional"
- Quando não há dado: orientação ("Vá em Escala & Equipe primeiro")

### Ordenação padrão (nunca deixar sem critério)
| Tela | Critério padrão |
|---|---|
| 02 Contratos | D-20 primeiro, depois data crescente |
| 03 CRM | Maior valor no topo dentro de cada coluna |
| 07 Estoque | Zerados → críticos → saudáveis alfabético |
| 10 Financeiro | Vencidos primeiro, depois vencimento crescente |
| 16 Ponto | Presentes primeiro, depois aguardando |

### "Atualizado há Xs"
Mostrar em: Dashboard, telas com dados em tempo real, Ponto Público (auto-refresh)

### Mobile
| Tela | Comportamento específico |
|---|---|
| 06 Escala | Layout simplificado por evento: data + barra + alerta + [Convocar] |
| 07 Estoque | Filtros colapsáveis, ações visíveis sem scroll |
| 09 Roteiro | Modo campo P1: sem sidebar, fonte maior, botão Concluir dominante |
| 12 Kiosk | Tela centralizada, mínimo de elementos, botão grande |
| 14 Configurações | Cada item da sidebar navega para sub-rota própria |
| 16 Ponto Público | Lista principal, sem panorama dominando |

---

## PARTE 6 — DECISÕES POR TELA

### 01 — Dashboard
**Conceito:** Estado global da operação

**O que muda:**
- Estado global no topo: `● Operação normal` / `⚠ 4 itens precisam de atenção`
- "Atualizado há Xs" sempre visível
- Painel de Pendências: mini-tarefas clicáveis com link filtrado por página
- Sino global no topbar
- Nome do usuário no cabeçalho (não emoji 👋)
- Estado vazio positivo: "✓ Nenhuma pendência" quando limpo

**Prioridades:**
- P1: Estado global + Pendências clicáveis + "Atualizado há Xs"
- P3: Filtros de período (rework nas queries) / Atividades Recentes

---

### 02 — Contratos
**Conceito:** Situação financeira dos contratos + alertas de proximidade

**O que muda:**
- Faixa D-20 por linha de contrato: nome + dias restantes + tipo de pendência + seta
- MetricCards: valor + quantidade ("8 sinais / R$24.800")
- Card: Avatar + linha SINAL/SALDO/TOTAL horizontal + barra 3 estágios + % liquidado
- Estado mais crítico no card (hierarquia: risco D-20 > saldo pendente > sinal pendente > em dia)
- Ações: [Ver documento] amarelo + ⋮ menu
- Ordenação: D-20 primeiro, depois data crescente
- Toast "Desfazer" ao marcar sinal pago (8s)
- ConfigPix: mover para Configurações

**O que não muda:** lógica de negócio, cálculos de saldo/sinal, autenticação

---

### 03 — CRM & Pipeline
**Conceito:** Funil de vendas + saúde do pipeline

**O que muda:**
- 4 MetricCards: Total + Negociação (qtd+valor) + Ganhos (qtd+valor) + Conversão (%)
- Leads esfriando: bloco de alerta (não MetricCard) com cor por tempo:
  0–3d normal / 4–7d âmbar / 8–14d vermelho / 15d+ vermelho forte
- Kanban: cabeçalho de coluna com qtd + valor total
- Card Kanban: Avatar + nome + valor em destaque + origem como badge
  + barra lateral 3px por estado (não card inteiro colorido)
- Ordenação dentro da coluna: maior valor no topo
- Toast "Desfazer" ao mover lead (8s)
- Filtros: busca + funil + valor + origem + último contato

**P3:** "Próxima ação" (sem campo no banco ainda)

---

### 04 — Orçamentos
**Conceito:** Construtor de proposta com fluxo guiado

**O que muda:**
- Indicador de progresso: `✓ Cliente ── ✓ Evento ── ● Serviços ── ○ Revisão`
- Serviço selecionado: borda âmbar + tint + check (não card inteiro colorido)
- Contador de selecionados por categoria
- Resumo lateral: mini proposta com breakdown por categoria + barras proporcionais
- Hierarquia botões: Salvar → PDF → WhatsApp → Converter
- Barra fixa inferior no mobile: total + botão
- Menu ⋮ na lista de salvos
- Duplicar: pré-preencher sem renomear como "Cópia — Nome"
- Validação: indicador de progresso pisca vermelho (não botão desabilitado)

---

### 05 — Agenda
**Conceito:** Visão espacial do calendário operacional

**4 camadas:**
1. Calendário — visão espacial
2. Popover — contexto rápido (hover)
3. Sidebar — próximas ações
4. Detalhe — informações completas

**O que muda:**
- Células: até 2 nomes + "+N" com horário
- Hoje: borda âmbar + número em destaque + `● HOJE` com pulse pequeno
- Hover → Popover: nome + status + horário + local + convidados + links de ação
- Sidebar: HOJE → AMANHÃ → dias da semana → bloqueios → próximos meses (só contador)
- Filtros: segmented control com contadores
- Células com bloqueio: fundo acinzentado, sem hover interativo
- Exportar PDF: no menu ⋮

---

### 06 — Escala & Equipe
**Conceito:** Operations Card por evento + visão de cobertura

**Visão de cobertura ANTES dos cards:**
```
20 SET · ████████████░░  92%  ⚠ Falta 1 bartender
23 SET · ████████████████ 100% ✓
```

**Operations Card:**
```
20 SET • CASAMENTO ANA + JOÃO         ● ATENÇÃO
Espaço Villa X • 180 convidados

COBERTURA
Bartenders  ██████████░░  4/5
Barbacks    ████████████  2/2 ✓

EQUIPE ESCALADA
[FM] Felipe    Bartender  ✓ Confirmado  R$ 180
[JC] João      Bartender  ✓ Confirmado  R$ 180
[AS] André     Barback    ⏳ Convocado  R$ 140

[ + Convocar membro ]  [ Enviar todos ]  ⋮
```

**Regras:**
- Status: cor + texto + número (`● 4/5 Bartenders`) — nunca só cor
- Avatar cor por função: azul = bartender / verde = barback
- Drawer do freelancer ao clicar no nome (não inline)
- Alerta contextual: cobertura incompleta com evento ≤7 dias
- Cadastro de equipe: aba/seção separada da operação

**P1:** Barras de cobertura + alerta + hierarquia de ações
**P2:** Avatar + Drawer freelancer + separar cadastro
**P3:** Histórico freelancer + WhatsApp individual + disponibilidade por data

---

### 07 — Estoque
**Conceito:** Central de abastecimento operacional

**Fluxo:** Situação atual → Impacto nos eventos → Ação de compra → Movimentação → Histórico

**Painel de situação (clicável → filtra lista):**
```
[● 118 OK]  [⚠ 3 Críticos]  [! 2 Zerados]
```

**Filtro:** `[Todos] [Zerados 2] [Críticos 3] [Saudáveis 118]`
(zerado = caso extremo de crítico — não seção separada)

**Seção "Impacto nos próximos eventos":**
```
⚠ Gin Tônica
Estoque: 18un  Mínimo: 20un
CASAMENTO SILVA — em 4 dias
Necessário: 24  Disponível: 18  Déficit: 6
[ Gerar compra ]
```

**ProgressBar por item:** barra + atual/mínimo + déficit projetado por evento

**Ações rápidas no topo:** `[+ Entrada]  [− Saída]` (ação primeiro, item depois)

**Calculadora preditiva:**
- Em destaque no topo da aba
- Seletor de evento (não só campo de número de convidados)
- Ícone: Lucide `<Calculator>` (não emoji 🔮)

**Aba "Compras"** separada com urgência por evento

**Ordenação:** zerados → críticos → saudáveis alfabético

**P1:** Painel clicável + ProgressBar + Impacto + Ações rápidas + Filtro
**P2:** Calculadora em destaque + Aba compras + Histórico no drawer
**P3:** Consumo planejado vs realizado + Busca + Filtro por categoria

---

### 08 — Logística & Frota
**Conceito:** Fluxo operacional completo

**Sequência:**
```
Eventos → Alocação → Preparação → Checklist → Saída → Em trânsito → Chegada → Custo real
```

**MetricCards:** disponibilidade real (Disponíveis / Em operação / Manutenção / Bloqueados)

**Grid de alocação semanal:**
```
         18/09  19/09  20/09  21/09  22/09
Sprinter   ●     —      ●     —      —
Master     —     ●      —     —      ●
Fiorino    —     —      ●     —      —
```
Cores: verde=disponível / amarelo=pendente / azul=alocado / vermelho=conflito / cinza=manutenção
Hover → popover com nome do evento + horário

**Conflito de veículo (P1):**
```
⚠ CONFLITO — Van Sprinter
19/09: Casamento Silva (18:00) + Evento Corporativo (21:00) — sobreposição
[ Ver eventos ]  [ Trocar veículo ]
```

**Timeline operacional com âncora temporal:**
```
● Aguardando        —
● Preparação        18:05 — carga iniciada
● Carregado         18:20 — saída prevista
○ Em trânsito       —
○ Chegou            —
```

**"Pronto para saída":** verde=pronto / amarelo=preparação / vermelho=impedido

**Calculadora:** dois cards grandes — Custo real (empresa) | Valor cobrado (cliente)

**Compras em trânsito:** "⚠ Necessário para evento em X dias"

**Cadastro:** seção colapsável separada da operação

**Sem:** GPS, rastreamento, mapa, localização em tempo real

**P1:** Calculadora em destaque + conflito de veículo + AlertaBanner + timeline
**P2:** Grid semanal + status por veículo + Checklist pré-saída + Compras × eventos
**P3:** Estimado × realizado + histórico de veículo

---

### 09 — Roteiro do Evento
**Conceito:** Editor (antes) + Painel de controle (durante)

**Dois momentos distintos:**
- Antes: montar e revisar o roteiro
- Durante: acompanhar em tempo real

**Cabeçalho rico:**
```
CASAMENTO ANA & JOÃO
20 SET 2026 · 18:00—01:00
Espaço Villa X · Rádio Canal 03

7 concluídos · 1 em andamento · 4 próximos
████████████░░░░░░  58%
```

**Cue atual (ÚNICO com DotLive e pulse):**
```
✓ 17:30  Chegada da equipe       AUTO
✓ 18:00  Montagem do bar         AUTO

━━━━━━━━━━━ ● AGORA 18:47 ━━━━━━━━━━━
18:45  INÍCIO DO SERVIÇO DE BAR  AUTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

→ PRÓXIMO · 19:30
Entrada dos convidados — Daqui a 43 min

○ 20:00  Jantar                  MANUAL
```

**Badges:** texto simples `AUTO` e `MANUAL` (sem emoji ⚡ ✦)

**Modo campo (P1):**
- Sem sidebar
- Fonte maior
- Botão `[ ✓ CONCLUIR CUE ]` dominante
- Mobile-first
- Clicar → atual vira concluído → próximo vira atual

**Dois modos:**
- Lista = execução (default durante o evento)
- Timeline = planejamento (default antes do evento)

**Novo cue:** Drawer com "+ Adicionar cue" (não formulário inline)

**Notas operacionais:** seção própria (não MetricCard)

**Auto-scroll:** `scrollIntoView({ behavior: 'smooth', block: 'center' })` ao mudar cue

**Indicador de atraso:** "25 min de atraso" discreto

**Duplicar com horários relativos (+00:30, +01:15):** P3

**P1:** Cue atual + cabeçalho rico + barra de progresso + modo campo + Concluir cue
**P2:** Próximo cue com contador + separador Agora + notas + Drawer
**P3:** PDF + duplicar roteiro

---

### 10 — Financeiro
**Conceito:** Situação atual + compromissos + previsão

**Filosofia:** hierarquia numérica em vez de alerta visual

**Responde:**
1. Quanto tenho para receber?
2. Quanto preciso pagar?
3. Quanto já entrou?
4. Quanto já saiu?
5. Quanto vou fechar o mês?
6. O que está atrasado?

**Saldo como protagonista:**
```
Receitas    R$ 24.800   ████████████████████
Despesas    R$  9.400   ████████
Saldo       R$ 15.400
```

**Projeção decomposta (não "recebido + pendente"):**
```
Receita recebida    R$ 24.800
Receita pendente    R$ 18.500
Despesas previstas  R$ 11.200
─────────────────────────────
Saldo projetado     R$ 32.100
```

**Filtros:** `[Todos] [Receitas] [Despesas] [Vencidos] [Próx. 7 dias]`

**Lista única** com borda lateral sutil por tipo:
- Verde = receita
- Vermelho = despesa
- Vencido: `border-l-2 border-danger` + "Vencido há X dias"

**Linha de totais no rodapé:** `Receitas +R$X · Despesas −R$X · Saldo +R$X`

**Ordenação:** vencidos primeiro, depois vencimento crescente

**Alerta de vencidos:** clicável → ativa filtro "Vencidos"

**Toast "Desfazer"** ao marcar pago (8s)

**Formulário:** Drawer com campo "Evento relacionado"

**DRE:** resumida + "Ver DRE completa" (não inline gigante)

**Relatório Executivo:** no header (não na DRE)

**P1:** Linha de totais + vencidos destacados + alerta + projeção + saldo
**P2:** Filtros rápidos + Drawer formulário + Próx. 7 dias + borda lateral
**P3:** DRE resumida + estimado × realizado + vínculo evento

---

### 11 — Fechamento Mensal
**Conceito:** "Qual foi o desempenho e para onde está indo?"

**Diferença do Financeiro:**
- Financeiro: situação atual
- Fechamento: desempenho histórico + tendência

**Meta junto do faturamento (não 5º MetricCard):**
```
FATURADO NO MÊS
R$ 48.750

Meta: R$ 55.000
██████████████████░░  88,6%
```

**Comparativo anual no gráfico (não card separado):**
```
    ─── 2025
    ─── 2026  ← linha destacada
```
Não mostrar se não houver dado do ano anterior.

**Variação % discreta na tabela:**
- ↑ verde suave (não saturado)
- ↓ vermelho suave
- — cinza

**Mês atual:** borda âmbar sutil na linha (não fundo amarelo)

**Projeção separada em 3:**
```
Fechado         R$ 48.750
Em negociação   R$ 14.500
Potencial       R$ 63.250   ← não afirmar como receita garantida
```

**Ranking:** barras horizontais sem numeração (não "1º 2º 3º")

**Layout assimétrico:** gráfico maior + composição menor

**Anotação do mês atual no gráfico:** ponto destacado + tooltip

**Coluna de contratos na tabela histórica**

**Pipeline em painel próprio** (separado do ranking)

**P1:** Variação % + mês atual + meta + substituir emojis por Lucide
**P2:** Comparativo anual + valores no breakdown + gráfico melhorado
**P3:** Pipeline/potencial + PDF

---

### 12 — Ponto Interno
**Conceito:** Dois produtos — Kiosk (registro) + Gestão (análise)

**KIOSK — mexer pouco:**
```
        08:47:32

    Bom dia, Maria

    08:00 — 18:00

 ┌──────────────────┐
 │   BATER PONTO    │
 └──────────────────┘

Entrada    08:03
Saída      —
Trabalhando há 3h42m
```

- Relógio: fonte mono, sem animação (precisão)
- Saudação: "Bom dia/Boa tarde/Boa noite, [nome]"
- Jornada visível: horário entrada–saída
- Histórico do dia: compacto
- Nada mais: sem calendário, métricas, gráficos, ranking

**GESTOR — MetricGrid (só dados de hoje):**
```
[12 Funcionários] [9 Presentes] [3 Sem registro]
```
Horas extras do período: seção própria abaixo (não misturar com hoje)

**Lista presença hoje:**
```
Presentes — 9
● Maria Silva    Entrada 08:03    08:00–18:00
● João Santos    Entrada 08:17    08:00–18:00

Sem registro — 3
○ Pedro Lima     Sem registro
○ Lucas Alves    Sem registro
```

**"Sem registro" ≠ "falta"** — sistema não sabe o motivo

**Lista compacta por funcionário** (não cards grandes — escala para 20+)

**Drawer** para configuração de jornada

**Filtros:** Hoje / Semana / Mês no topo

**Grade de presença (P2):** estados ricos N=normal / A=atraso / E=extra / F=sem registro / —=folga

**Alerta ausência:** "Atenção — X funcionários com dias sem registro acima do limite"
(não "X faltas" — sistema não afirma o que não sabe)

**Total a pagar** no rodapé do relatório

**Sem:** geolocalização, biometria, reconhecimento facial, IA de RH

**P1:** Separar presentes/sem registro + MetricGrid gestor + visual do relatório + Drawer jornada
**P2:** Relógio + saudação + CSV + filtros + lista por funcionário + grade
**P3:** Grade de presença + alertas + período personalizado

---

### 13 — Auditoria Pós-Evento
**Conceito:** Ciclo de aprendizado pós-evento
```
Evento → auditoria → satisfação → problemas → correção → histórico
```

**CORREÇÃO TÉCNICA CRÍTICA:**
```
NPS real = % promotores − % detratores   (não média das notas)

Se o sistema usa média das notas → chamar "Nota média: 9,1"
Se calcula corretamente          → exibir "NPS: +72"
Nunca misturar os dois.
```

**Hierarquia do painel de satisfação:**
```
              9,1
         NOTA MÉDIA

Promotores 18   Neutros 4   Detratores 2
```
NPS/nota em destaque grande → distribuição como dados secundários abaixo

**Separar:**
- Satisfação: como o cliente percebeu (nota, NPS, feedbacks)
- Operação: como terminou (avarias, sobras, foto da doca)

**Avarias:** valor + ocorrências + eventos afetados

**Tendência no MetricCard:** "↑ +0,4 vs 90 dias anteriores"

**Feedbacks negativos:**
```
Cliente: Maria Silva · Evento: Casamento Silva · Nota: 4
"Comentário do cliente..."
● Follow-up criado    [Ver evento]
```
"Follow-up criado ●" (não botão — automação já existe)

**Formulário em 4 seções:** Operação / Avarias / Evidência / Satisfação

**Lista de eventos:** data + convidados + nota visível sem abrir

**Comparativo por tipo:** identificar padrões, não ranking competitivo

**P1:** Hierarquia NPS/nota + alerta avaliações baixas + barra por evento + lista melhorada
**P2:** Tendência + feedbacks com contexto + separar satisfação/avarias + formulário em seções
**P3:** Comparativo por tipo + WhatsApp pesquisa

---

### 14 — Configurações
**Conceito:** Central administrativa do sistema

**Sidebar interna (escala melhor que grid fixo):**
```
CONTA           │  [conteúdo da seção selecionada]
  Perfil        │
  Segurança     │
  Acessos       │
                │
SISTEMA         │
  Operacional   │
  Financeiro    │
  Empresa       │
  Preferências  │
```

**Perfil:** nome + cargo (não avatar, foto, bio — sistema interno)

**Operacional (linguagem humana, não técnica):**
```
Meta mensal
R$ 55.000
Usada como referência no Fechamento Mensal.
Setembro: R$ 48.750 / R$ 55.000 · 88,6%

Alerta de proximidade do evento
[ 20 ] dias
Eventos com início dentro desse período serão sinalizados.

Alerta de satisfação
Nota igual ou inferior a [ 4 ]
Gera alerta e follow-up automático.
```

**Financeiro:** ConfigPix (movido de Contratos) + nome do favorecido

**Empresa:** apenas campos consumidos pelos PDFs (nome/CNPJ/endereço/telefone)

**Preferências:** tema em select de uma linha (Escuro como padrão)

**Salvamento por seção** (não global, não por campo individual)

**Versão do sistema** no rodapé

**Sem:** "Configurações avançadas" com parâmetros técnicos, Supabase, API, logs, feature flags

**Mobile:** cada item da sidebar navega para sub-rota (`/configuracoes/operacional`)

**P1:** Meta mensal + ConfigPix + dados da empresa
**P2:** Thresholds + organização Conta×Sistema + salvamento por seção
**P3:** Preview da meta + tema persistido + importar/exportar JSON

---

### 15 — Portal do Cliente

#### Admin
**Conceito:** Central de acompanhamento de homologações

**Status em 4 estados:**
1. Aguardando aprovação (moldura/vídeo pendente)
2. Aguardando homologação (mídia aprovada, assinatura pendente)
3. Aguardando contrato (homologação feita, contrato pendente)
4. Concluído (tudo assinado)

**Lista lateral:**
```
Casamento Felipe
20/09 · ● Aguardando homologação
3 visualizações · Último: hoje 18:42
```

**Alerta D-7:**
```
⚠ 3 portais pendentes nos próximos 7 dias
Casamento Silva    2 etapas pendentes
Formatura XPTO     1 etapa pendente
```

**Ações no painel:** `[Abrir portal]  [Copiar link]  [WhatsApp]`

**WhatsApp:** mensagem pré-formatada com nome do cliente e link

**P1:** WhatsApp + alerta D-7 + status rico
**P2:** Estado final + visualizações + lista melhorada + identidade visual
**P3:** Último acesso com timestamp (só se backend tiver dado)

#### Público
**Conceito:** Jornada guiada de aprovação

**Pergunta-guia:** "O que preciso fazer agora?"

**Hierarquia:**
```
Evento → progresso → próxima ação → etapas concluídas
```

**Barra de progresso:**
```
✓ Moldura ─── ✓ Vídeo ─── ● Homologação ─── ○ Contrato
```

**Etapas:**
- Atual: aberta e em destaque (âmbar)
- Concluídas: colapsadas (✓ discreto)
- Futuras: bloqueadas/cinza
- Bloqueada (D-15): cinza escuro

**Identidade:** "EM CENA EVENTOS" completo (não só "EC")

**Sem:** gradientes excessivos, partículas, animações chamativas
("o cliente está assinando documentos — premium e confiável, não futurista")

**Trava D-15:** explicação humana
```
Este portal entrou no período final de preparação.
As alterações estão encerradas.
Fale com a Em Cena Eventos para qualquer ajuste.
```

**Estado final:**
```
         ✓
  Tudo em ordem

✓ Moldura
✓ Vídeo
✓ Homologação
✓ Contrato

Obrigado por confirmar as informações do seu evento.
```
Sem confete, sem animação chamativa.

**SEGURANÇA:**
- CPF não exibido após assinatura
- CPF não incluído em links, URLs ou mensagens de WhatsApp
- Token do portal: não previsível, não exposto desnecessariamente

**Botão de vídeo:** habilitado só após iniciar a visualização

**P1:** Barra de progresso + WhatsApp admin + alerta D-7 + status rico
**P2:** Estado final + visualizações + hierarquia das etapas + identidade visual
**P3:** Último acesso + refinamentos de preview

---

### 16 — Ponto Público (Confirmação de Chegada)
**Conceito:** "Quem já chegou neste evento e quem ainda está faltando?"

**2 MetricCards:** Escalados + Chegaram (com percentual)
(não 4 — os outros pertencem ao panorama inferior)

**Lista dividida (não mista):**
```
PRESENTES · 3
[MS] Maria Santos    Bartender    18:32
[JS] João Silva      Barback      18:41

AGUARDANDO · 5
[FM] Felipe Mendes   Bartender    Aguardando
[LC] Lucas Costa     Barback      Aguardando
```

**Horário:** font-mono fora do badge

**Distinção confirmados × chegaram:**
```
8/10 confirmados
5/8 presentes
```
Diagnóstico: problema de escala (não confirmaram) vs atraso (confirmaram, não chegaram)

**WhatsApp:** `[Copiar link]  [WhatsApp]` com nome do evento na mensagem

**Auto-refresh (60s):**
- Só quando evento selecionado + evento é hoje + na tela
- Limpar no unmount
- "Atualizado há 12s" discreto no header
- Sem WebSocket se projeto não usa

**Estado vazio "todos chegaram":**
```
✓ Equipe completa — todos confirmaram chegada
```

**Panorama:** barras de cobertura + números (barra complementa, não substitui)

**Sem:** GPS, geolocalização, reconhecimento facial, notificações complexas, IA

**P1:** Separar Presentes/Aguardando + WhatsApp
**P2:** Auto-refresh + Avatar + horário mono
**P3:** Barras cobertura + 2 MetricCards + confirmados×presentes

---

## PARTE 7 — O QUE FOI EXPLICITAMENTE REJEITADO

Esta lista existe para o Claude Code não reintroduzir funcionalidades descartadas.

### Funcionalidades rejeitadas
- Estado intermediário "Processando..." em Contratos (atualização otimista já funciona)
- "Próxima ação" no CRM (sem campo no banco ainda)
- Wizard obrigatório em Orçamentos (indicador de progresso resolve)
- GPS/rastreamento/mapa em Logística
- Rastreamento de localização em tempo real em qualquer tela
- Geolocalização em Ponto (público ou interno)
- Biometria em Ponto Interno
- Reconhecimento facial em qualquer tela
- WebSocket/realtime onde polling de 60s resolve
- Ranking competitivo em Fechamento Mensal e Auditoria
- Configurações avançadas com parâmetros técnicos em Configurações
- Supabase/API/logs em Configurações (é painel de desenvolvedor, não de gestor)
- "AI insights" em qualquer tela
- "Smart Analytics" em qualquer tela
- "Recomendação inteligente" em qualquer tela
- Confete no estado final do Portal público
- Animações chamativas no Portal público
- Gradientes decorativos em qualquer tela
- Ícones de marcas (Instagram, WhatsApp) — Lucide apenas
- Emojis em qualquer parte da interface
- Chat em qualquer tela
- Notificações push
- Dois botões de "Criar follow-up" quando automação já existe (tela 13)
- Dois MetricCards de mesmo peso para NPS e promotores/neutros/detratores

### Estética rejeitada
- Dashboard genérico estilo BI
- Estética "feito por IA"
- Visual "futurista" com partículas
- Gradientes decorativos em backgrounds
- Glassmorphism excessivo
- Cards com sombra excessiva em tudo
- Pulse constante em múltiplos elementos
- Animações que não param (loading spinners onde não há carregamento)
- Fonte sem serifa genérica sem hierarquia tipográfica
- Verde/vermelho saturados em tabelas gerenciais

### Nomenclatura rejeitada
- "Threshold D-X" (usar "Alerta de proximidade do evento — X dias")
- "Itens do galpão" como nome de aba (usar "Estoque" ou "Inventário")
- "NPS médio" quando é média das notas (usar "Nota média")
- "Falta/Ausente" quando sistema só sabe que não há registro (usar "Sem registro")
- "Cópia — Nome" ao duplicar orçamento

---

## PARTE 8 — REFERÊNCIA DE ARQUIVOS

### Specs existentes (não duplicar)
```
PROMPT_MASTER_REDESIGN.md  — P1 com código real (1081 linhas)
PROMPT_P2_P3.md            — P2/P3 detalhados (790 linhas)
PROMPT_TOPBAR_NOTIFICACOES.md — sino + alertas contextuais (443 linhas)
DESIGN.md                  — design system atual do projeto
```

### Hierarquia de leitura para o Claude Code
1. Ler REVIEW_DECISOES_V2.md (este arquivo) — decisões de produto
2. Ler PROMPT_MASTER_REDESIGN.md — implementação P1 com código
3. Auditar o arquivo que vai editar — nunca assumir o que existe
4. Implementar a etapa específica
5. `npm run build` deve passar sem erros
6. `git commit` com mensagem descritiva

---

*Gerado em revisão completa de 16/16 telas — setembro 2026*
