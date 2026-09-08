# Roadmap — Sala de Operações

15 telas é grande demais pra construir de uma vez. Cada fase entrega um
núcleo (ou parte dele) com dado real, testado, antes de passar pra
próxima — mesmo ritmo do painel anterior (`../../Texto/`).

## Fase 1 — Fundação técnica ✅ (concluída)

Scaffold (Vite+React+TS+Tailwind v4), schema completo do banco (todas as
tabelas dos 5 núcleos + RLS), autenticação do gestor, roteamento com as 15
telas como placeholder, layout (sidebar desktop + barra inferior mobile).
Nenhuma funcionalidade de verdade ainda.

**Bloqueado até você fazer:** criar o projeto no Supabase e aplicar o
schema (ver README, seção "Como rodar pela primeira vez").

## Fase 2 — Núcleo Comercial ✅ (concluída)

CRM & Pipeline de Leads (pipeline + tabela, busca/filtro, criar/editar/
excluir, métricas do topo) + Gerador de Orçamentos (catálogo real de
serviços, cálculo 20/80, mensagem de WhatsApp, orçamentos salvos).
Testado de ponta a ponta com Playwright contra o Supabase real (login,
CRUD de lead, cálculo de orçamento, geração de mensagem, salvar).

Catálogo de serviços migrado com preço real do painel antigo — ver
`supabase/seed.sql`.

## Fase 3 — Contratos & Faturamento 20/80 ✅ (concluída)

Contrato nasce de um orçamento (botão "Gerar contrato" na lista de
orçamentos ainda não convertidos). Sinal (20%) e saldo (80%) calculados
automaticamente pelo banco (colunas geradas). Cobrança via PIX real:
QR Code + "Copia e Cola" gerados 100% offline (payload EMV/BR Code
próprio, `src/lib/pixBrCode.ts` — sem API de banco/PSP, só criptografia
de checksum). Badge de risco D-7 (regra inviolável do PRD: saldo tem que
estar quitado até 7 dias antes do evento). Chave PIX do negócio salva no
navegador (localStorage), não no banco — é config local, não dado
compartilhado.

Testado ponta a ponta com Playwright: gerar contrato a partir de
orçamento, valores de sinal/saldo corretos, badge D-7, QR code renderiza,
copiar código PIX, marcar sinal pago, mudar status do saldo, mensagem de
"100% liquidado". 1 bug real encontrado e corrigido: clique em
copiar (PIX e mensagem de orçamento) não tratava erro do
`navigator.clipboard.writeText`, gerando rejeição de promise não
capturada — corrigido com `.catch()` + aviso ao usuário.

**Pendência registrada:** "webhook de liberação da frota apenas após
100% pago" (PRD) depende do módulo de Logística (Fase 4), que ainda não
existe — o contrato já mostra "logística liberada" como texto quando
100% quitado, mas não há frota/romaneio de verdade pra liberar ainda.

## Fase 4 — Núcleo Planejamento (em andamento, dividida em sub-fases)

**4a. Agenda Operacional ✅ (concluída)** — calendário mensal com
eventos, métricas (total/agendados/em montagem-execução/encerrados),
lista de próximos eventos com troca de status. Mudança de arquitetura
importante: **todo contrato agora já cria o `evento` operacional
correspondente junto** (1:1, automático) — é o que Escala/Logística/
Estoque vão referenciar a seguir, sem precisar de um passo manual de
"criar evento" separado.

**4b. Estoque & Compras ✅ (concluída)** — cadastro de itens (bebida/
insumo/gelo/descartável), calculadora preditiva por convidado, badge de
nível crítico, ordem de compra emergencial (com sugestão de quantidade),
receber compra (já lança entrada no estoque), histórico de avarias.
2 bugs reais encontrados e corrigidos: (1) `ItemForm` mandava um campo
`ativo` que não existe na tabela `estoque_itens` — inserção quebrava
silenciosamente; (2) excluir item/receber/cancelar compra sem tratar erro
— uma restrição do banco (item com movimentação não pode ser excluído)
virava rejeição de promise não capturada em vez de aviso pro usuário.

**4c. Escala & Equipe ✅ (concluída)** — cadastro de freelancers (sem
login, decisão registrada), convocação por evento com diária, checklist
traje/EPI (booleano, ver nota abaixo), mensagem de convocação por
WhatsApp (texto pra copiar/colar, sem envio automático — sem API do
WhatsApp Business), simulador de hora extra (compara horário previsto x
real de encerramento).

**4d. Carga & Logística ✅ (concluída)** — cadastro de frota, romaneio
por evento com 4 fases de conferência (separado → embarcado →
descarregado → devolvido) rastreadas por item, sugestão automática de
itens a partir do checklist padrão real da empresa (rastreia evento →
contrato → orçamento → serviço, ver `supabase/seed_checklist_carga.sql`),
calculadora de frete real (mesma fórmula da planilha da empresa, 30% de
margem, mínimo R$150) e aviso (não bloqueio automático) ao tentar
embarcar sem o saldo do contrato quitado — regra do PRD.

Testado ponta a ponta com Playwright contra o Supabase real: cadastro de
freelancer, convocação, checklist traje/EPI, mudança de status,
mensagem de WhatsApp copiada, aviso de hora prevista ausente; cadastro
de veículo, sugestão real de itens (63 itens do Bar Black pra 50
convidados, batendo com a planilha), criação de romaneio, avanço de fase
com aviso de saldo pendente, cálculo de frete conferido contra a fórmula
(R$390 pro cenário de teste), exclusão de romaneio/veículo. Banco limpo
de dado de teste ao final.

1 bug real encontrado e corrigido: `listarEscalasDoEvento`
(`src/lib/api/escalas.ts`) ordenava por uma coluna `criado_em` que não
existe na tabela `escalas` — a query falhava silenciosamente (erro
capturado, mas a tela só mostrava "Ninguém convocado ainda" em vez do
erro real) e a lista de convocados nunca carregava. Corrigido: a tabela
não tem timestamp de criação mesmo, então a ordenação passou a ser pelo
nome do membro (só estética, sem query inválida).

**Pendências registradas:**
- **Checklist de traje/EPI ainda é só um booleano genérico** — as 3
  planilhas recebidas (`Checklist Totem`, `Checklist_Black`,
  `Checklist_Premium`) são todas de **carga/embarque**, não de
  traje/EPI de pessoal. Se existir uma planilha separada de
  traje/EPI por função, ela pode virar um checklist padrão real do
  mesmo jeito que o de carga.
- **"Checklist Totem.xlsx" não foi migrado pra seed** — layout em duas
  colunas (item específico por atração + item geral compartilhado) é
  ambíguo demais pra transcrever automaticamente com confiança. Fica
  como pendência pra um passo dedicado, se for útil.

## Fase 5 — Núcleo Execução ✅ (concluída)

**Sala de Operações (Dashboard)** — monitor ao vivo dos eventos de hoje:
cliente, local, canal de rádio, horário, convidados, veículo do romaneio,
badges reais de saldo/equipe confirmada/fase do romaneio, atalhos rápidos
(novo orçamento, romaneio, agenda) e lista de próximas datas. Só dado
real — sem telemetria inventada (o mockup de referência tinha campos
como "tanque de combustível %" que não existem no schema; não foram
replicados).

**Ficha Técnica & Cue Sheet** — cronograma de cues por evento (número,
horário, título, descrição, concluído).

**Ponto Eletrônico simplificado** — decisão do usuário (2026-09-06):
sem PIN, sem geofence/GPS, não alimenta folha de pagamento. Link público
por evento (`/ponto/:eventoId`, sem login) onde a equipe escalada
confirma a própria chegada escolhendo o nome numa lista. Painel do
gestor mostra quem já chegou por evento e uma tabela de "próximas
datas" com confirmados/chegados, pra pegar buraco de escala com
antecedência. View `vw_escala_presenca` nunca expõe a diária (dado de
pagamento) — ver `supabase/migration_003_ponto_publico.sql`.

**Deep-link entre telas:** Dashboard → Cue Sheet/Escala/Logística/Ponto
via `?evento=<id>`, cada botão do card já abre a tela certa com o evento
pré-selecionado.

Testado ponta a ponta com Playwright contra o Supabase real: evento de
hoje aparecendo no monitor com todos os badges corretos, os 3 deep-links
abrindo o evento certo, criação/conclusão de cue, painel de presença do
gestor, cópia do link de check-in, check-in público sem login
registrando a chegada e refletindo de volta no painel do gestor. Nenhum
bug novo encontrado. Banco limpo de dado de teste ao final.

## Fase 6 — Encerramento & Controladoria ✅ (concluída)

**Pós-Evento & Auditoria** — por evento: sobras reintegradas (flag),
avarias (descrição + valor), link da foto da doca (texto colável, sem
upload real de arquivo — não há bucket de storage construído), nota NPS
(0-10) e comentário do cliente. Lista lateral de eventos com badge
Auditado/Pendente, métricas de NPS médio e avarias acumuladas.

**Finanças — Fluxo & Lançamentos** — lançamentos manuais (receita/
despesa avulsa), marcar pago/pendente, métricas de a receber/a pagar/
saldo do mês. **Ponte automática Contratos → Finanças:** marcar o sinal
(20%) ou o saldo (80%) de um contrato como pago em Contratos gera (ou
remove, se desmarcar) sozinho o lançamento de receita correspondente —
sem digitar de novo algo que já está no contrato, e sem lançamento órfão
se o pagamento for revertido. Implementado em
`src/lib/api/contratos.ts` → `sincronizarLancamentoDeContrato`
(`financeiro.ts`), nunca duplica (procura por evento_id + prefixo da
descrição antes de inserir).

**Fechamento Mensal & DRE** — lê a view `dre_mensal` (nunca uma tabela
própria — receita bruta, custos e lucro líquido são sempre calculados a
partir dos lançamentos pagos, nunca gravados à parte). Histórico mensal
+ margem calculada.

Testado ponta a ponta com Playwright contra o Supabase real, incluindo a
sincronização automática (marcar sinal pago no contrato → lançamento
aparece em Finanças com o valor certo → desmarcar → lançamento some) e a
persistência da auditoria após recarregar a página. Nenhum bug novo
encontrado. Banco limpo ao final.

## Fase 7 — Portal do Cliente ✅ (concluída)

**Todo contrato agora já nasce com o `portal_cliente` correspondente**
(1:1, automático, mesmo padrão do evento — `criarContrato` faz as 3
inserções em sequência com rollback se alguma falhar).

**Painel do gestor** (`/portal-cliente`): lista de contratos, link do
portal pra copiar/enviar, cadastro dos links de moldura/vídeo propostos,
status de aprovação de cada um, e os dados da assinatura quando o
cliente homologa.

**Portal público** (`/portal/:token`, sem login): o cliente vê data/local
do evento (view `vw_portal_publico`, só campos não sensíveis — nunca
valor/sinal/saldo), aprova moldura e vídeo, e assina a homologação (nome
+ CPF). Assinatura gera um hash SHA-256 (Web Crypto, nativo do
navegador) do conteúdo homologado no momento — evidência de integridade
real, sem inventar certificado digital. **Limitação conhecida:**
`assinatura_ip` fica sempre null — capturar IP real exigiria um serviço
externo, fora de escopo por ora.

**Trava D-15:** 15 dias antes do evento, o portal público vira só-leitura
(calculado a partir da data do evento, nunca gravado — mesmo princípio
do D-7 de Contratos).

**Pendência registrada:** seleção de até 5 "coquetéis autorais"
(`coquetel_ids`) não foi implementada — o catálogo real de serviços só
tem PACOTES de bar (Intermediário/Premium/Clássico/Black/Sem álcool), não
receitas individuais de drinks. O usuário tem um PDF de catálogo real que
vai enviar; assim que chegar, criar uma tabela de coquetéis de verdade e
ligar ao portal.

**Bônus fora do escopo original, pedido durante a fase:** gerador de PDF
de proposta comercial (`src/lib/pdfProposta.ts`, biblioteca `jspdf` +
`jspdf-autotable`) — mesmo conteúdo do "Gerar mensagem" de Orçamentos,
como PDF pra anexar/enviar por e-mail. Precisou externalizar dependências
opcionais do jsPDF (`canvg`, `html2canvas` etc., só usadas pelo método
`.html()` que não usamos) no `vite.config.ts` pra não quebrar o build.

Testado ponta a ponta com Playwright contra o Supabase real: geração de
contrato criando o portal automaticamente, configuração de moldura/vídeo
pelo gestor, aprovação e assinatura pelo cliente via link público (sem
login), reflexo da assinatura no painel do gestor, bloqueio real da trava
D-15 num segundo contrato com evento em 5 dias, e download do PDF de
proposta. Nenhum bug novo encontrado. Banco limpo ao final.

## Revisão de coerência geral (pós-Fase 7) — 2026-09-06

Com as 13 telas construídas, o usuário pediu uma passada de "pensamento
lógico e geral de como cada etapa da Sala de Operações vai funcionar" —
uma revisão de como os módulos se conectam, não uma fase de código nova.
Ver relatório completo na resposta da sessão; resumo do que foi
encontrado e feito:

**1 bug real corrigido:** o botão "Excluir" de Contratos nunca funcionava
desde a Fase 4a — `eventos.contrato_id` é `on delete restrict`, então
excluir um contrato com evento (todo contrato tem, desde a Fase 4a) sempre
dava erro de FK. Corrigido: `excluirContrato` agora apaga em cascata
manual (romaneios, ponto_registros, escalas, cue_sheet_itens,
auditoria_pos_evento, depois o evento, depois o contrato). Também
adicionei `cancelarContrato` (cancelamento "de verdade", preserva
histórico, sincroniza `evento.status = 'cancelado'` junto) — antes só
existia o delete definitivo, sem opção de só marcar como cancelado.

**1 ajuste de coerência:** Auditoria & Pós-Evento deixava auditar
qualquer evento não cancelado, incluindo eventos futuros que ainda nem
aconteceram. Corrigido: lista só eventos com `data_evento <= hoje`.

**2 gaps arquiteturais identificados — o usuário pediu pra resolver os
dois, feito em seguida (mesmo dia):**

**1. Estoque ⇄ Logística agora conversam de verdade** (migration_005).
Não criamos um catálogo de `estoque_itens` automático a partir das 356
linhas do checklist real (muita entrada mistura ingrediente com
utensílio/equipamento, ex. "Coquet(Pegador, Pá, macerador...)" — viraria
uma bagunça de SKU fabricado). Em vez disso:
- `checklist_padrao_itens` e `romaneio_itens` ganharam `estoque_item_id`
  (nullable) — o vínculo é manual e gradual: nova seção "Vincular
  checklist de carga ao estoque" em Estoque, o gestor liga cada descrição
  (ex. "Vodka") a um item real, aos poucos.
- Quando um romaneio avança pra fase **embarcado** pela primeira vez
  (`romaneios.estoque_baixado` garante que só acontece uma vez), todo
  item do romaneio já vinculado a um `estoque_item` desconta de verdade
  (`registrarMovimento` tipo `saida`). Item ainda não vinculado
  simplesmente não afeta o estoque — nunca inventa uma baixa de algo que
  não sabemos qual item real é.

**2. Despesas automáticas no DRE** (generalizei a ponte que já existia só
pra Contratos→Finanças, `sincronizarLancamento` em `financeiro.ts`):
- **Compra de estoque** (Estoque): ao marcar uma compra como recebida, já
  gera a despesa correspondente, como **paga** (o dinheiro sai quando a
  compra chega).
- **Frete** (Logística): toda vez que o frete de um romaneio é calculado/
  salvo, sincroniza uma despesa **pendente** com o valor atual (recalcular
  só atualiza o mesmo lançamento, nunca duplica); excluir o romaneio
  remove a despesa.
- **Diária de freelancer** (Escala): convocar já gera a despesa
  **pendente**; remover a escala ou marcar como "recusado" remove/some
  com ela (sem custo se o freelancer não vem).

Testado ponta a ponta com Playwright contra o Supabase real: vínculo
checklist→estoque, criação de romaneio com item vinculado, embarque
debitando o estoque de verdade (com prova de idempotência — avançar fase
de novo não desconta duas vezes), despesa de frete/diária/compra
aparecendo e sumindo nos momentos certos, e o vínculo do checklist
voltando a `null` depois de excluir o item de teste (sem sujar o dado
real). Banco limpo ao final.

## Feedback de uso real — CRM (2026-09-06)

Usuário testando o sistema como usuário final reportou 2 pontos:

**1. "Pra ser CRM de verdade precisa de canal de conversa/contato"** —
faltava histórico de interação por lead, que todo CRM de mercado tem.
Adicionado (`migration_006_crm_interacoes.sql`, tabela `lead_interacoes`):
seção "Histórico de conversa/contato" no detalhe do lead (CRM), com tipos
mensagem/ligação/e-mail/reunião/nota. A mensagem de WhatsApp do orçamento
**se registra sozinha** ali quando gerada (`Orcamentos.tsx` →
`registrarInteracao`); o resto é lançado manualmente (textarea + botão
Registrar).

**2. Scroll do Pipeline estilo Figma** — pedido de arrastar o funil
segurando o botão do meio do mouse, em vez de mirar na barra de rolagem
fina. Implementado em `src/lib/useArrastarRolagem.ts` (hook reaproveitável)
e aplicado em `PipelineLeads.tsx`.

Testado ponta a ponta com Playwright: interação manual registrada e
persistida, mensagem de orçamento auto-registrando no histórico com o
texto certo, e o arrasto com o botão do meio realmente rolando o pipeline
(scrollLeft mudou de 0 pra >100 depois do gesto). Banco limpo ao final.

## Auditoria de segurança pós-deploy (2026-09-06)

Usuário perguntou como verificar a segurança do site em produção.
Auditoria encontrou e corrigiu 2 achados reais (`migration_007_seguranca.sql`):

**1. CRÍTICO — qualquer conta autenticada tinha acesso total.**
`eh_gestor()` checava só `auth.role() = 'authenticated'`, não QUEM. O
projeto Supabase tinha self-signup habilitado (confirmado testando a API
de auth diretamente) — qualquer pessoa podia criar conta sozinha e virar
"gestor" (ver leads, contratos, financeiro). Corrigido: `eh_gestor()`
trava num `auth.uid()` específico (a conta real do usuário). Ação
manual complementar pedida ao usuário: desabilitar "Allow new users to
sign up" no painel do Supabase (defesa em profundidade).

**2. As views públicas podiam ser lidas/alteradas por fora do fluxo
normal.** `vw_portal_publico`/`vw_escala_presenca` e as policies de
`portal_cliente`/`ponto_registros` usavam `using (true)` — o app sempre
filtrava por token/evento_id, mas nada no banco impedia uma chamada de
API direta sem esse filtro (listaria/alteraria todo mundo de uma vez).
Corrigido: todo acesso `anon` a esses dados agora passa por funções RPC
`security definer` (`portal_obter`, `portal_aprovar_moldura`,
`portal_aprovar_video`, `portal_assinar`, `ponto_obter_presenca`,
`ponto_registrar_chegada`) que exigem o token/id como parâmetro
obrigatório e nunca permitem listagem ou alteração em massa. Código do
app (`portalCliente.ts`, `ponto.ts`) migrado de select/update direto pra
`.rpc(...)`.

Verificado direto contra a API de produção: `eh_gestor()` barra qualquer
conta que não seja a travada, view pública dá "permission denied" pra
select direto, RPC funciona normalmente. Testado ponta a ponta com
Playwright **contra a URL de produção real** (não só localhost) depois
do redeploy: portal público (ler/aprovar/assinar) e ponto público (ler/
check-in) funcionando via RPC, painel do gestor refletindo tudo
corretamente. Banco limpo ao final.

## Reorganização do menu + dado de demonstração (2026-09-06)

Usuário pediu (1) melhorar a ordem do menu lateral, tirando coisas
desconectadas, e (2) povoar o sistema com dado fictício mostrando como
os módulos se conectam.

**Menu:** achei 2 problemas reais — "Sala de Operações" (o Painel,
rota `/`) estava enterrado dentro do núcleo "Execução em Tempo Real",
apesar de ser a tela-lar; e **o Portal do Cliente não tinha link nenhum
no menu** (só dava pra chegar lá digitando a URL — a tela existe e
funciona desde a Fase 7, só faltava a entrada de navegação). Corrigido
em `Layout.tsx`: Painel isolado no topo, fora dos núcleos; Portal do
Cliente adicionado ao núcleo "Comercial & Cliente" (onde o PRD original
já o lista); Agenda movida pro início de "Planejamento" (é o hub que
Escala/Estoque/Logística referenciam).

**Dado de demonstração:** povoado direto na produção (banco estava
vazio, confirmado antes de rodar) — um ciclo completo (Camila Duarte:
Lead → Orçamento → Contrato → Evento → Portal homologado → Escala →
Romaneio embarcado (debitando estoque de verdade) → Cue Sheet → Ponto →
Financeiro), mais 4 leads no pipeline em outros estágios e 1 evento
corporativo já REALIZADO com auditoria e financeiro 100% quitado —
pra mostrar o ciclo fechado também. **Esse dado fica salvo** (não é
descartado como os testes E2E) — é conteúdo real da conta do usuário
agora, só que fictício.

Verificado com Playwright contra a produção: menu na ordem certa, link
do Portal funcionando, e o dado aparecendo corretamente em todas as
telas (Dashboard, CRM, Contratos, Agenda, Escala, Estoque, Logística,
Financeiro, Fechamento, Auditoria, Portal do Cliente).

## Melhorias de UX pedidas pelo usuário (2026-09-06)

**1-2. Inputs de data/número "brancos" demais** — causa raiz era a
mesma pros dois: sem `color-scheme: dark` declarado, o navegador desenha
os controles NATIVOS (ícone do seletor de data, setas do input number)
com a paleta clara padrão, destoando do tema escuro. Uma linha em
`index.css` (`html { color-scheme: dark }`) resolve os dois de uma vez,
sem precisar reconstruir os componentes do zero.

**3. Editar orçamento salvo** — `atualizarOrcamento` em `orcamentos.ts`
(atualiza os dados gerais e reconstrói os itens do zero) + botão de lápis
em cada orçamento salvo, que carrega tudo de volta no formulário; o botão
"Salvar" vira "Atualizar orçamento" enquanto editando, com opção de
cancelar.

**4. Escala separada por evento + aviso de staffing** — antes a tela
tinha um dropdown pra selecionar UM evento por vez; agora cada evento
não cancelado ganha sua própria caixa, todas visíveis ao mesmo tempo,
com os escalados já dentro da caixa do evento (sem precisar trocar de
seleção pra comparar cobertura entre eventos). Cada caixa mostra um
aviso "Falta N bartender(s)/barback" ou "Equipe de bar completa".

Regra de staffing (`src/lib/staffing.ts`, confirmada com o usuário,
incluindo o degrau acima de 150 numa segunda resposta): todo pacote de
bar sai com vidro de verdade, por isso **sempre precisa de 1 barback**,
não importa o tamanho do evento; bartender escala pelo número de
convidados — até 40 → 1, até 150 → 2, acima de 150 → 3 (não há mais
degraus além desse). `head_bartender` conta como bartender pra fins de
cobertura mínima.

Testado contra produção real (usando o próprio dado de demonstração já
populado): `color-scheme` aplicado, edição de orçamento gravando os
itens certos no banco, e os dois estados do aviso de staffing
("completo" pro evento com equipe suficiente, "faltando" pro que não
tem) — inclusive um teste que sem querer capturou uma convocação real
feita pelo usuário entre a popular a demo e testar, confirmando o
cálculo ao vivo com dado genuíno.

## CRM reorganizado em abas + aba de Conversas estilo WhatsApp (2026-09-06)

Usuário pediu um submenu horizontal fixo (sempre visível, nunca um
dropdown) no CRM, separando Leads / Conversas / Adicionar Lead — e que
"Conversas" realmente parecesse um WhatsApp, com lista de contatos,
thread no meio e dados do cliente à direita.

- **Aba Leads**: exatamente o que já existia (pipeline/tabela + busca/
  filtro + detalhe do lead), só sem o formulário de cadastro misturado
  junto.
- **Aba Conversas** (`src/components/crm/Conversas.tsx`, nova): 3
  colunas — lista de contatos com avatar/iniciais e status à esquerda,
  thread de mensagens em bolhas (cor de destaque, alinhadas à direita,
  reaproveitando `lead_interacoes`) no meio, dados do cliente
  (telefone/e-mail/origem/valor estimado/observações) à direita. Digitar
  e mandar registra uma interação (mesma tabela de sempre) e aparece na
  hora, como um chat de verdade.
- **Aba Adicionar Lead**: o formulário isolado, sem lista misturada.

O histórico de conversa saiu do painel de detalhe da aba Leads (não
duplica mais — agora mora só na aba Conversas).

Testado ponta a ponta com Playwright contra produção real, usando o
próprio dado de demonstração: as 3 abas trocam sem recarregar a página,
selecionar um contato na aba Conversas carrega a thread e os dados
certos, enviar uma mensagem registra e aparece na bolha na hora. 1 lição
de teste anotada (não bug do app): texto de `placeholder` não conta como
texto renderizado pro `page.locator('text=...')` do Playwright — precisa
buscar pelo atributo (`input[placeholder="..."]`).

## Layout mais largo + menu recolhível (2026-09-06)

Usuário reclamou que as seções (ex.: colunas do Pipeline do CRM) ficavam
apertadas, concentradas no meio da tela, e sugeriu um "hamburguer" pra
recolher o menu lateral e sobrar mais espaço.

- **Teto de largura do conteúdo** (`Conteudo`/`Cabecalho` em
  `Layout.tsx`) aumentado de 1200px pra 1680px — todas as telas ganharam
  mais espaço, não só o CRM.
- **Menu lateral recolhível**: botão de hamburguer no topo da sidebar
  alterna entre 220px (com rótulo) e 64px (só ícone, com tooltip nativo
  no hover). Preferência salva em `localStorage`
  (`emcena_sidebar_colapsada`), cada aparelho lembra o que foi escolhido.

Testado contra produção real em duas larguras de tela: num monitor
grande (1920px), o teto de 1680px já cobre o espaço mesmo com o menu
aberto (comportamento esperado — não deixa o conteúdo esticar até a
borda da tela, o que prejudicaria leitura); num notebook comum (1440px),
recolher o menu realmente ganha ~156px a mais de conteúdo útil.
Confirmado também que a preferência persiste depois de recarregar a
página, e que expandir/recolher funciona nos dois sentidos.

## Página de Configurações (perfil/senha/sair) (2026-09-06)

Usuário pediu pra trocar o botão solto "Sair" da sidebar por um bloco de
perfil/configurações — clicar no perfil ou na "foto" leva pra uma tela
onde ficam perfil, trocar senha e sair, tudo junto.

- **`src/pages/Configuracoes.tsx`** (nova, rota `/configuracoes`): Perfil
  (nome de exibição, guardado em `user_metadata` do Supabase Auth — não
  existe tabela de perfil separada, sistema é de 1 usuário só), Segurança
  (trocar senha — Supabase não pede a senha atual, a sessão já logada
  prova quem é), Sessão (botão Sair).
- **Sidebar**: o botão "Sair" avulso saiu; no lugar tem um bloco de
  perfil (avatar + nome) que é um link pra `/configuracoes` — cliclar no
  avatar ou no nome leva pro mesmo lugar.
- `AuthContext.tsx` ganhou `atualizarNome`/`atualizarSenha`.

Testado ponta a ponta com Playwright contra produção real, incluindo
troca de senha de verdade (validações de senha curta/senhas diferentes,
troca bem-sucedida, login com a senha nova) — sempre com rollback pra
senha original ao final. **Quase travei a conta real** nesse teste: o
script de verificação final tentava logar de novo enquanto a sessão
ainda estava válida, e a tela de login redireciona sozinha quando já tem
sessão (nunca mostra o formulário) — pareceu falha de restauração, mas
era só o script de teste checando errado. Confirmei por chamada direta
na API do Supabase (sem navegador no meio) que a senha real
(`123456`) ficou intacta.

## Modo claro/escuro (2026-09-06)

Usuário pediu um botão de modo claro/escuro no canto superior direito.

- **Paleta clara** em `index.css` (`:root[data-theme='light']`) — mesma
  estrutura de tokens do escuro (bg/panel/raised/input/line/text), só
  invertendo os tons de base pra um branco/bege quente; acento e cores
  semânticas (sucesso/perigo/pendente) continuam as mesmas, já funcionam
  bem nos dois fundos.
- **`src/lib/useTema.ts`** (novo hook): aplica/lê a preferência via
  `localStorage` (`emcena_tema`) e o atributo `data-theme` na tag
  `<html>`. `index.html` tem um script inline mínimo que aplica o tema
  salvo ANTES do React montar, pra não piscar o tema errado a cada
  navegação de página.
- Botão (ícone sol/lua) adicionado na faixa de status de `Cabecalho`
  (topo de cada tela, canto direito, ao lado do relógio).

Testado ponta a ponta com Playwright contra produção real: alterna
corretamente, cor de fundo muda de verdade, persiste ao navegar entre
telas e depois de recarregar a página (sem flash do tema errado), e
volta pro escuro normalmente.

**Achado durante o teste, não é bug do app:** apareceu um banner de erro
"JWT issued at future" no print de uma tela — investigado e confirmado
que é o **relógio do ambiente de sandbox onde os testes rodam**, que
está ~2h atrasado em relação à hora real (comparado direto contra o
cabeçalho `Date` do servidor do Supabase). O supabase-js do navegador
rejeita um token que "parece vir do futuro" comparado a esse relógio
errado — não acontece no computador real do usuário (relógio sincronizado
por NTP normalmente). Nada foi alterado no código por causa disso.

## Realce de borda por tema (2026-09-06)

Usuário pediu um brilho claro nas bordas no tema escuro, e o oposto
(sombra escura) no tema claro.

Implementado sem editar componente por componente: `--shadow-borda`
(token novo em `index.css`, valor diferente por tema) aplicado direto na
classe utilitária `.border-line` — como praticamente todo elemento com
borda do sistema (Panel, MetricCard, inputs, linhas de lista) já usa
essa mesma cor de borda, o realce aparece em tudo automaticamente, sem
precisar tocar em cada arquivo. Removido `shadow-sm` duplicado de
`Panel.tsx`/`Login.tsx` (senão as duas sombras entrariam em conflito de
cascata CSS).

Testado contra produção: box-shadow correto nos dois temas (fiapo branco
sutil no escuro, sombra escura suave no claro), conferido tanto via
CSS computado quanto visualmente por print.

## Pipeline vira Kanban de verdade + funis dinâmicos (2026-09-06)

Usuário pediu três coisas juntas: arrastar lead entre colunas com o
mouse, um botão pra criar funil (coluna) novo, e um modo "editar funil"
pra arrastar as próprias colunas de lugar.

Isso esbarrava numa limitação de arquitetura: `leads.status` era um
CHECK fixo em 5 valores (`novo`, `degustacao_agendada`,
`proposta_enviada`, `contrato_fechado`, `perdido`) — dava pra mudar
rótulo/cor no código, mas nunca adicionar coluna sem alterar o banco.
Resolvido convertendo pra uma tabela de verdade:

- `funis_lead` (`supabase/migration_008_funis_lead.sql`): cada linha é
  uma coluna do Pipeline (`id`, `nome`, `cor`, `ordem`). `leads.status`
  virou FOREIGN KEY pra essa tabela (era CHECK). Os 5 funis antigos
  foram migrados como linhas iniciais, mesmos ids de sempre (nenhum
  lead existente muda de coluna).
- `papel` (`'novo' | 'ganho' | 'perdido' | null`) marca os 3 estágios
  que o próprio sistema depende: lead novo nasce no funil com
  `papel='novo'`; os cards "Ganhos"/"Perdidos" do CRM somam por
  `papel='ganho'`/`'perdido'`. Só esses 3 não podem ser excluídos pela
  tela (continuam livres pra renomear/recolorir/reordenar). Os demais —
  inclusive os 2 do meio que já existiam — são livres por completo.
- Arrastar lead: `PipelineLeads.tsx` usa Drag and Drop nativo do HTML5
  (`draggable` + `onDragStart`/`onDragOver`/`onDrop`), sem biblioteca
  nova — mesma filosofia do `useArrastarRolagem` (interação
  feita à mão). Ao soltar, muda `leads.status` com update otimista
  (reflete na hora, sem esperar a rede).
- "Editar funis" (botão no topo do Pipeline) liga um modo onde: o nome
  vira editável ao clicar, a cor vira um seletinho, um ícone de lixeira
  exclui (desabilitado nos 3 `papel`s), uma coluna tracejada
  "+ Novo funil" cria coluna nova, e a própria coluna vira arrastável
  pra reordenar (grava a nova ordem de todas de uma vez).
- `STATUS_LEAD_INFO`/`STATUS_LEAD_ORDEM` (mapa fixo em `status.ts`)
  removidos — toda tela que mostrava o funil de um lead (`TabelaLeads`,
  `DetalheLead`, `Conversas`, `LeadForm`) agora recebe a lista de
  `funis` carregada do banco e usa `funilDoLead()`.

Migração é manual (SQL Editor do Supabase, mesmo fluxo de sempre — não
tenho acesso de escrita direto ao Postgres, só a anon key do app).

Testado ponta a ponta com Playwright contra produção: criar funil novo
("+ Novo funil" no modo "Editar funis") apareceu na hora; excluir funil
de teste funcionou e sumiu; arrastar um lead de verdade (Rodrigo Almeida)
de "Novo" pra "Degustação agendada" moveu o card, atualizou o badge de
contagem e o gráfico "Leads por funil" instantaneamente — e restaurado
de volta ao estado original ao final, conferido por screenshot antes/
depois. **Lição de teste nova:** Playwright `locator.dragTo()` (baseado
em mouse.move) não dispara Drag and Drop HTML5 nativo de forma
confiável em Chromium headless — o card não se move. O jeito que
funcionou: disparar os `DragEvent` (`dragstart`/`dragover`/`drop`)
manualmente via `page.evaluate()` num par de `elementHandle` (source e
target), com um `DataTransfer` real construído no browser. Vale lembrar
pra qualquer teste futuro de D&D nativo neste projeto.

## Gráficos e animações no sistema (2026-09-06)

Usuário pediu "mais dinâmico, gráficos, animações" — sistema era só
texto/tabela até aqui. Sem biblioteca de gráfico nova (mesma filosofia
de interação feita à mão do resto do projeto): 3 componentes em
`src/components/charts/` (SVG puro, cor herdada via `fill="currentColor"`
+ classe Tailwind, então já respeita tema claro/escuro automaticamente):

- `GraficoBarras` — barra vertical simples, cada barra "cresce" ao
  montar (`transform: scaleY()` animado, origem embaixo), tooltip ao
  passar o mouse.
- `GraficoDonut` — rosca com fatias desenhando (`stroke-dashoffset`
  animado), legenda ao lado, texto no centro mostra o total (ou a fatia
  em hover).
- `GraficoDRE` — combo barras (receita verde + custos vermelho) + linha
  (lucro líquido, cor de acento) específico do Fechamento, porque lucro
  pode ser negativo — a escala calcula uma linha de zero real, não
  assume tudo positivo.

Onde entrou: **Fechamento/DRE** (tendência mensal — era só tabela,
virou o gráfico mais óbvio e útil do sistema todo); **Finanças**
(donut "Composição do mês", receita paga vs. despesa paga); **CRM**
(barra "Leads por funil", cores batendo com a cor de cada funil,
reagindo em tempo real ao arrastar lead ou criar/excluir funil);
**Sala de Operações/Dashboard** (donut "Cobertura de equipe hoje",
confirmado/convocado/recusado — só aparece quando tem gente escalada
pro dia). Testado contra produção nos 4 lugares, com hover funcionando
e os dados batendo com os números das métricas ao lado.

---

Esta ordem é uma proposta, não uma decisão fechada — o usuário confirma
(ou muda) a ordem antes de cada fase começar, do jeito que já era feito no
painel anterior.
