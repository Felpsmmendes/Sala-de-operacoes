---
target: src (auditoria geral do app)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-09-07T02-28-44Z
slug: src-auditoria-geral-do-app
---
**Method: dual-agent (A: ae8194976a2f38215 · B: ac5d5d1409253e2d0)**

## Design Health Score

| # | Heurística | Nota | Achado-chave |
|---|-----------|------|--------------|
| 1 | Visibilidade do status | 3 | Dashboard recarrega sozinho com indicador "ao vivo" (Dashboard.tsx:31-76), mas ações como marcar sinal pago não mostram estado de "salvando" na própria linha |
| 2 | Correspondência com mundo real | 4 | Vocabulário 100% do negócio (sinal/saldo, D-7, romaneio, canal rádio) — nenhum termo de admin-template genérico |
| 3 | Controle e liberdade | 2 | Nenhum undo em lugar nenhum do app; ações destrutivas dependem só de window.confirm |
| 4 | Consistência e padrões | 3 | Badge/status.ts centralizam cor, mas 52 ocorrências de classe de cor crua (text-success/danger/pending) espalhadas em 23 arquivos fora desse sistema (confirmado por grep) |
| 5 | Prevenção de erros | 2 | Avisos existem (D-7, saldo pendente), mas formulários não validam além do HTML nativo; nenhum limite de sanidade em campos numéricos |
| 6 | Reconhecimento > memorização | 3 | Deep-links ?evento= eliminam reseleção entre telas; mas lista de Orçamentos não indica quais já viraram contrato |
| 7 | Flexibilidade e eficiência | 2 | Zero tabIndex em todo o src/ (confirmado); mover um lead entre funis do Pipeline só é possível arrastando — não há alternativa nenhuma |
| 8 | Estética minimalista | 3 | Paleta consistente; Estoque empilha 6 painéis completos numa rolagem só, sem segmentação |
| 9 | Recuperação de erros | 2 | Erros do Postgres/Supabase (e.message cru) chegam ao usuário via window.alert/texto vermelho, sem tradução nem próximo passo |
| 10 | Ajuda e documentação | 1 | Sem tooltip custom em lugar nenhum (0 ocorrências); só title= nativo em 4 arquivos; telas públicas sem link de contato clicável |
| **Total** | | **25/40** | **Aceitável** |

## Veredito de Especificidade de Design

**Avaliação (LLM)**: Não é um admin-template genérico — produto desenhado em cima de regras reais do negócio: staffing por convidado com barback sempre obrigatório (staffing.ts), D-7/D-15 calculados (não gravados), PIX BR Code offline, vínculo manual checklist↔estoque em vez de catálogo fabricado.

**Scan determinístico**: 0 achados do detector em src/ — fato estrutural, não nota de qualidade: os analisadores de página inteira do detector só rodam em .html/.astro/.vue/.svelte, nunca em .tsx/.ts. Único achado real veio de testar index.html fora do escopo: overused-font (Google Fonts Inter, linha 17), num scan já avisado como degradado nesta máquina.

**Evidência visual**: indisponível nesta sessão — sem ferramenta de navegador/screenshot.

## Impressão Geral

Densidade de domínio real em cada tela, não abstrações de CRUD. O ponto fraco: o produto trata risco de forma binária — ou clique trivial sem fricção (marcar saldo quitado, arrastar um lead), ou window.confirm genérico (excluir contrato com cascata). Falta um meio-termo calibrado por risco.

## O Que Está Funcionando

1. Cancelar vs. Excluir em Contratos (Contratos.tsx:213-234) — o texto do confirm já explica a diferença no momento da decisão.
2. Dashboard "ao vivo" sem piscar (Dashboard.tsx:31-76) — recarrega a cada 60s/foco, só mostra "Carregando…" na primeira busca.
3. Aviso de staffing ao vivo (Escala.tsx:117-124 + staffing.ts) — calculado contra a regra real do negócio, no lugar certo.

## Problemas Prioritários

**[P0] Assinatura de homologação sem nenhuma etapa de confirmação**
- Onde: PortalClientePublico.tsx:69-80, 174
- Por que importa: ação mais irreversível do produto, sem login, no celular — um clique já grava.
- Fix: passo intermediário de revisão (moldura/vídeo/nome/CPF) com confirmação separada.
- Comando sugerido: /impeccable harden

**[P1] Mover um lead entre funis só é possível arrastando — sem alternativa**
- Onde: components/crm/PipelineLeads.tsx; TabelaLeads.tsx e DetalheLead.tsx só exibem o funil, nunca deixam trocar.
- Por que importa: 0 tabIndex em todo o src/ — ação central do CRM sem via alternativa nenhuma.
- Fix: select de funil no card/detalhe como via alternativa ao drag.
- Comando sugerido: /impeccable harden

**[P1] Ações financeiras de alto impacto com a mesma affordance de ações triviais; confirmação destrutiva só via diálogo nativo**
- Onde: Contratos.tsx:166-169, 184-192 (mesma affordance de Escala.tsx:230-237, risco zero); window.confirm/alert em 36 ocorrências/16 arquivos, incluindo Logistica.tsx:130,143, Crm.tsx:104, Contratos.tsx:217,228.
- Por que importa: marcar saldo quitado libera embarque e fecha risco D-7 com o mesmo peso visual de um checkbox de traje.
- Fix: diferenciar visualmente ações que liberam dinheiro/logística; diálogo estilizado com fricção extra nas mais destrutivas.
- Comando sugerido: /impeccable clarify, depois /impeccable harden

**[P2] Erros do banco chegam crus ao usuário**
- Onde: Estoque.tsx:38-40, Crm.tsx:81-82, Logistica.tsx:20-22.
- Por que importa: gestor sozinho, de madrugada/campo, sem tradução do erro técnico.
- Fix: camada de tradução de erros comuns do Postgres/Supabase.
- Comando sugerido: /impeccable clarify

**[P2] Estoque empilha 6 tarefas heterogêneas numa rolagem só**
- Onde: Estoque.tsx:135-311.
- Por que importa: falha 4 dos 8 itens do checklist de carga cognitiva; tela mais "suja" operacionalmente.
- Fix: abas como Crm.tsx:159-174 já usa.
- Comando sugerido: /impeccable layout

## Persona Red Flags

**Alex (gestor avançado)**: zero atalho de teclado; lista de Orçamentos não indica quais já viraram contrato; Estoque exige rolar tudo pra chegar em Compras; sem visão agregada de PIX pendentes.

**Casey (freelancer/cliente no celular, sem login)**: erro em window.alert (PontoPublico.tsx:45) pode passar despercebido; lista de nomes sem busca e sem confirmação de toque; CPF/nome sem máscara (PortalClientePublico.tsx:172-173); nenhum tel:/wa.me clicável nas telas públicas.

## Observações Menores

- Layout.tsx:225-247 — relógio com setInterval de 1s numa tela sempre aberta.
- Orcamentos.tsx:250 — input date sem min, aceita data no passado.
- ConfigPix.tsx:9-11 — chave PIX em localStorage, perde config ao trocar de computador sem aviso.
- Botões "Excluir" ora texto sublinhado, ora ícone de lixeira — inconsistência visual pequena.
- aria-label existe em exatamente 1 arquivo do projeto inteiro.

## Perguntas Provocativas

1. window.confirm/alert foi escolha consciente ou nunca foi revisitado à luz do risco real?
2. "Não embarca sem saldo quitado" deveria virar bloqueio de verdade em algum momento?
3. Existe teste real (não headless) das telas públicas no celular físico de um freelancer/cliente?
