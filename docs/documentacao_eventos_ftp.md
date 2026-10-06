# Documentação Técnica: Módulo de Eventos (Análise Integrada da Pasta `ftp` e Código-Fonte `eventos`) e Guia de Integração Aditiva no UniCore

> **Objetivo:** Mapear o funcionamento completo do ecossistema de eventos identificado nos arquivos da pasta [ftp](file:///home/nbtlc-0575/Documentos/unicore/ftp) e no código-fonte real em [eventos](file:///home/nbtlc-0575/Documentos/ftp/eventos), especificando **exclusivamente as novas funcionalidades e regras de negócio**, garantindo que as implementações atuais do UniCore (certificados legados do Unimestre, eventos customizados, logs e emissões) **permaneçam 100% preservadas e operacionais**.

---

## 1. Visão Geral das Fontes Analisadas

A análise combinada envolveu três fontes de dados e código:

1. **Painel Legado Unimestre ([admin_certificados.php](file:///home/nbtlc-0575/Documentos/unicore/ftp/public_html/admin_certificados.php)):**
   - Sistema em PHP focado em consulta à base do Unimestre (`cap_oferta`, `cap_inscricao`, `PESSOAS`, `mensalidades`, `diario_aulas_alunos`).
   - *Nota:* Esta funcionalidade **já está portada e ativa** no UniCore em [certificates.controller.ts](file:///home/nbtlc-0575/Documentos/unicore/apps/backend/src/modules/certificates/certificates.controller.ts) e [certificates-page.component.ts](file:///home/nbtlc-0575/Documentos/unicore/apps/frontend/src/app/pages/certificates-page.component.ts), permanecendo **100% intacta**.

2. **Banco Relacional dos Eventos FAIP ([eventosfaip_2026-10-05.sql](file:///home/nbtlc-0575/Documentos/unicore/ftp/eventosfaip_2026-10-05.sql)):**
   - Snapshot relacional com **15 tabelas** estruturadas contendo o histórico de simpósios e congressos acadêmicos (ex.: *XVII Simpósio de Ciências Aplicadas da FAIP*).

3. **Código-Fonte Completo da Aplicação de Eventos ([eventos/public_html](file:///home/nbtlc-0575/Documentos/ftp/eventos/public_html)):**
   - A implementação completa em PHP/JavaScript com painel do participante (`painel.php`), painel administrativo (`admin/`), módulo de scanner com câmera (`scanner_sala.php`), rotinas de cron (`cron_limpeza.php`), geração de PDFs (`gerar_certificado.php` e `gerar_requerimento.php`), disparo de e-mails transacionais e integrações assíncronas.

---

## 2. Comparativo: O Que Já Existe no UniCore vs. O Que É NOVO

Para cumprir estritamente a exigência de **não substituir ou alterar o que já existe**, o quadro abaixo define os limites da integração:

| Recurso / Funcionalidade | Situação no UniCore Atual | Situação no Legado (`eventos`) | Decisão de Integração |
|---|---|---|---|
| **Consulta Unimestre (Ofertas/Alunos)** | ✅ Presente (`/certificates/events`, etc.) | Presente no PHP (`admin_certificados.php`) | **Manter intacto** no UniCore |
| **Log de Emissão com Hash Único** | ✅ Presente (`CertificateEmissionLog`) | Presente (`certificados.hash_validacao`) | **Manter intacto**, reaproveitando para os novos fluxos |
| **Cadastro Básico de Evento Customizado** | ✅ Título, carga horária, curso, palestrante, datas | Presente, com muito mais campos de negócio | **Adicionar apenas os novos campos opcionais** em `CertificateEvent` |
| **Participantes Básicos do Evento** | ✅ Nome, RA, CPF, e-mail, flag de pago e presença | Gerenciado através de `tickets` e `usuarios` | **Manter modelo existente** e acoplar o ingresso digital |
| **Editor e Estilização Visual de Certificado** | ✅ Molduras, cores, fontes caligráficas, upload | Fundo fixo com FPDF/FPDI | **Manter o editor visual avançado do UniCore** |
| **Auto-Busca de CPF (Unimestre + Google)** | ❌ Inexistente | ✅ Detecta perfil, curso e e-mail institucional | 🚀 **NOVA FUNCIONALIDADE** |
| **Lotes Promocionais e Preços por Perfil** | ❌ Não existe | ✅ Aluno, Professor, Visitante, Prazos de Lote | 🚀 **NOVA FUNCIONALIDADE** |
| **Ingressos Digitais e Requerimentos** | ❌ Apenas booleano `isPaid` manual | ✅ Código único, QR Code, Requerimento 6 dígitos | 🚀 **NOVA FUNCIONALIDADE** |
| **Vencimento Dinâmico e Cron de Expiração** | ❌ Inexistente | ✅ 3 dias ou fim do lote; liberação de vagas | 🚀 **NOVA FUNCIONALIDADE** |
| **Workshops / Oficinas com Limite de Vagas** | ❌ Não existe | ✅ Vagas finitas e troca atômica com transação | 🚀 **NOVA FUNCIONALIDADE** |
| **Submissão Científica e Validação de Coautores**| ❌ Não existe | ✅ Envio Word/PDF, coautores com ingresso pago | 🚀 **NOVA FUNCIONALIDADE** |
| **Banca Científica com Lock de Avaliação** | ❌ Não existe | ✅ Lock anti-concorrência e relatório de plágio | 🚀 **NOVA FUNCIONALIDADE** |
| **Portaria com Câmera e Paridade Matemática** | ❌ Não existe (apenas contador estático) | ✅ Scanner HTML5, alternância Entrada/Saída | 🚀 **NOVA FUNCIONALIDADE** |
| **Certificado em 2 Páginas com Verso Autêntico**| ❌ Página única simples | ✅ Frente com auto-ajuste/ISSN e Verso com QR | 🚀 **NOVA FUNCIONALIDADE** |
| **Notificações por E-mail com QR Code** | ❌ Inexistente | ✅ PHPMailer com QR Code do ingresso no corpo | 🚀 **NOVA FUNCIONALIDADE** |
| **Gestão Financeira, Custos e Patrocinadores** | ❌ Não existe | ✅ Agrupamento financeiro, despesas e cotas | 🚀 **NOVA FUNCIONALIDADE** |
| **Pesquisa de Satisfação Pós-Evento (Feedback)** | ❌ Não existe | ✅ Notas de 1 a 5 e depoimento descritivo | 🚀 **NOVA FUNCIONALIDADE** |
| **Relatórios e Exportação em 6 Formatos Excel** | ❌ Não existe | ✅ Exportador XLS com filtros avançados | 🚀 **NOVA FUNCIONALIDADE** |

---

## 3. Especificação Completa das Novas Funcionalidades e Regras de Negócio

### 3.1. Auto-Detecção de Perfil e Integração com Unimestre/Google (`consulta_cpf.php`)
- **Funcionamento:** Ao digitar o CPF no formulário de inscrição ou checkout, uma requisição assíncrona busca o registro nas bases institucionais:
  1. **Docente:** Se localizado na tabela de professores do Unimestre, atribui automaticamente `perfil = 'professor'`.
  2. **Discente:** Se localizado em matrículas ativas, atribui `perfil = 'aluno'`, resgatando o nome oficial e o **curso** em que está matriculado.
  3. **E-mail Institucional Google Workspace:** Consulta `faip_contas_google` via `cd_pessoa` para preencher o e-mail institucional automaticamente.
  4. **Público Externo:** Se o CPF não constar em nenhuma base acadêmica, classifica automaticamente como `perfil = 'visitante'`.

---

### 3.2. Precificação Dinâmica, Lotes Promocionais e Meios de Pagamento (`eventos`)
- **Público-Alvo (`publico_alvo`):** Configuração de acesso por evento: `'todos'`, `'aluno'`, `'professor'`, `'visitante'`.
- **Tabela Diferenciada de Preços:**
  - `valor`: Preço padrão para estudantes / público geral.
  - `valor_professor`: Tarifa diferenciada para docentes.
- **Lotes Promocionais com Prazos Rigorosos:**
  - `valor_promo` e `data_limite_promo`: Valor com desconto para alunos/visitantes e deadline de expiração.
  - `valor_promo_professor` e `data_limite_promo_professor`: Valor promocional docente e deadline.
- **Modalidades de Pagamento (`tipo_ingresso`):**
  - `'requerimento'`: Débito acadêmico / pagamento presencial na tesouraria.
  - `'link'`: Gateway externo (ex.: link Cielo SuperLink em `link_pagamento`).
  - `'pix'`: Pagamento instantâneo via `chave_pix` e `qr_code_pix`.
- **Capacidade do Evento:** Campos `limite_ingressos` e `ingressos_vendidos`.

---

### 3.3. Ciclo do Ingresso Digital, Requerimento Impresso e Cron de Vencimento
- **Código Único (`codigo_unico`):** Token de 8 caracteres em caixa alta gerado via hash (ex.: `A91E75D4`) para QR Code e credenciamento.
- **Estados do Ingresso (`status`):**
  `aguardando_pagamento` ➔ `em_analise` ➔ `pago` ➔ `rejeitado` ➔ `utilizado`.
- **Cálculo da Data de Vencimento (`gerar_requerimento.php`):**
  - **Valor Integral:** Vencimento padrão de **3 dias corridos** (`+3 days`).
  - **Lote Promocional:** O vencimento **não é de 3 dias**, mas sim **cravado na data/hora exata do encerramento da promoção** (`data_limite_promo` ou `data_limite_promo_professor`).
  - **Trava de Segurança:** O vencimento nunca pode ultrapassar o horário de início do evento.
- **Requerimento Físico Oficial:**
  - Gera documento impresso para pagamento na tesouraria com protocolo de 6 dígitos formatado (`str_pad($ticket_id, 6, '0')`), dados do curso, termo de adesão e canhoto para carimbo/autenticação da tesouraria.
- **Rotina de Limpeza Automática (`cron_limpeza.php`):**
  - Executada periodicamente com chave de segurança (`?key=...`).
  - Identifica ingressos com `status = 'aguardando_pagamento'` cuja data de vencimento passou OU cuja promoção expirou.
  - Altera o status para `'rejeitado'`, **liberando imediatamente as vagas dos workshops vinculados**, registrando log de auditoria e preservando o histórico.

---

### 3.4. Workshops e Oficinas com Troca Atômica de Vagas (`workshops` & `ticket_workshops`)
- **Catálogo de Oficinas:** Cadastro de minicursos associados ao evento com título, curso de referência, descrição e **limite individual de vagas** (`vagas`).
- **Inscrição Restrita:** O participante vincula seu ingresso aos workshops desejados, respeitando a lotação.
- **Troca Atômica de Workshop (`admin/processar_alteracao_workshop.php`):**
  - Transação de banco com `beginTransaction` e `commit`:
    1. Verifica a disponibilidade de vagas no novo workshop escolhido.
    2. Devolve atomicamente a vaga ao workshop anterior (`vagas = vagas + 1`).
    3. Debita a vaga no novo workshop (`vagas = vagas - 1`).
    4. Atualiza o registro em `ticket_workshops` e cria log de auditoria.

---

### 3.5. Submissão Científica e Banca Avaliadora com Lock de Concorrência (`artigos`)
- **Regra Rígida de Coautoria (`api/api_autores.php`):**
  - Ao cadastrar coautores no artigo, o sistema só permite selecionar usuários que **já possuam ingresso com status `'pago'` no mesmo evento**.
- **Arquivos Submetidos:** Envio do documento editável em Word (`.docx`), versão para publicação em `.pdf`, orientador principal e coorientador.
- **Gestão da Banca (`admin/banca.php`):** Painel administrativo para habilitar professores e coordenadores como membros da comissão científica (`avaliador_artigos = 1`).
- **Trava de Concorrência em Tempo Real (`set_lock`):**
  - Quando um avaliador abre um artigo para analisar, o sistema preenche `avaliador_atual_id = ID_AVALIADOR` via AJAX.
  - Bloqueia o artigo para outros avaliadores, impedindo sobreposição de pareceres.
- **Parecer e Documentação:**
  - Anexo de parecer anti-plágio em PDF/imagem (`relatorio_plagio`).
  - Anexo de arquivo com correções sugeridas (`arquivo_correcao`).
  - Decisão: `'pendente'`, `'aprovado'` ou `'rejeitado'`.

---

### 3.6. Portaria com Câmera e Alternância Matemática de Entrada/Saída (`scanner_sala.php`)
- **Tecnologia:** Leitor de QR Code via câmera integrada (HTML5-QRCode) no smartphone/computador ou digitação manual de CPF/RA.
- **Lógica Matemática de Fluxo (Entrada vs. Saída):**
  - Consulta o histórico do participante naquela sala e data: `COUNT(*) FROM presencas`.
  - Se o resultado for **Par (0, 2, 4...)** ➔ Registra **ENTRADA** (toca beep de sucesso, abre modal verde com nome, perfil e hora).
  - Se o resultado for **Ímpar (1, 3, 5...)** ➔ Registra **SAÍDA** (toca beep, abre modal laranja).
- **Check-in Geral Automático:** Ao registrar a primeira `entrada` em sala, o sistema atualiza o ingresso geral para `usado = 1`, **liberando a emissão do certificado**.
- **Controle de Acesso ao Scanner:** Apenas administradores OU os professores cadastrados no campo `professor_id` da sala (suporta múltiplos IDs separados por vírgula) têm permissão para operar o scanner daquele ambiente.

---

### 3.7. Certificado em 2 Páginas (Frente e Verso com QR Code) e Cache em Disco (`gerar_certificado.php`)
- **Suporte Híbrido de Template:** Aceita arquivos base em **PDF** (via biblioteca FPDI) ou imagens (JPG/PNG).
- **Três Modalidades com Templates Independentes:**
  - `participacao` ➔ Fundo `img_certificado`.
  - `monitoria` ➔ Fundo `img_certificado_monitor` (exige `is_monitor = 1`).
  - `artigo` ➔ Fundo `img_certificado_artigo` (vinculado a artigo aprovado).
- **Auto-Ajuste de Tipografia:** Se o nome do participante for longo, o sistema reduz dinamicamente o tamanho da fonte de 38pt para até 20pt para não invadir as margens da arte.
- **Texto Oficial com ISSN:** No certificado de artigo, injeta parágrafo formal citando o título do trabalho, autores e o código **ISSN** oficial dos anais do evento (ex.: ISSN 2178-857X).
- **Verso Oficial (Página 2):**
  - Adiciona uma segunda página ao PDF com título *"VERIFICAÇÃO DE AUTENTICIDADE"*.
  - Renderiza imagem de QR Code centralizada (50x50 mm) apontando para a URL de validação.
  - Imprime o código hash alfanumérico e link hiperlinkado direto.
- **Cache de PDF em Disco:** Salva o PDF gerado em `uploads/certificados_emitidos/`. Downloads subsequentes são entregues diretamente do disco, eliminando processamento repetido.
- **Trava de Liberação Temporizada (`data_liberacao_cert`):** O botão de download permanece bloqueado para alunos até a data e hora estipuladas para o encerramento do evento.

---

### 3.8. Notificações Transacionais por E-mail (`mail.php` & `templates_email.php`)
- E-mails formatados em HTML com identidade visual institucional:
  - **Inscrição Solicitada:** Alerta de vencimento e orientações de pagamento.
  - **Pagamento Aprovado:** Notificação de sucesso com **o QR Code do ingresso renderizado diretamente no corpo do e-mail** para apresentação na portaria.
  - **Inscrição Cancelada:** Aviso de expiração ou recusa de comprovante.
  - **Recuperação de Senha:** Envio de token temporário de redefinição.

---

### 3.9. Gestão Financeira, Despesas e Patrocinadores
- **Grupos Financeiros (`financeiro_grupos`):** Consolidação de múltiplos eventos (ex.: agrupar simpósio de alunos, professores e visitantes) para apuração de faturamento unificado.
- **Lançamento de Despesas (`despesas_eventos`):** Cadastro de saídas por categoria (coffee break, banners, transporte, palestrantes) com data, valor e upload do comprovante fiscal.
- **Patrocinadores e Movimentações (`patrocinadores` & `patrocinadores_movimentacoes`):** Cadastro de empresas apoiadoras, acompanhamento de cotas e entradas financeiras ou de materiais (brindes, serviços, dinheiro).

---

### 3.10. Relatórios Gerenciais e Exportação em Excel (`exportar.php` & `relatorios.php`)
- Exportação nativa para formato Excel (`.xls`) em 6 relatórios estruturados:
  1. **Financeiro e Vendas:** Listagem de ingressos por método de pagamento, valores pagos e pendências.
  2. **Ocupação de Salas:** Fluxo de presenças por sala com horários de entrada e saída.
  3. **Artigos Científicos:** Relação de trabalhos, autores, pareceres e orientadores.
  4. **Perfil Demográfico:** Divisão percentual de público (alunos, docentes e visitantes).
  5. **Participantes por Curso:** Agrupamento de adesão por graduação.
  6. **Inscritos por Workshop:** Lotação de cada sala e relação nominal de matriculados.

---

### 3.11. Pesquisa de Satisfação Pós-Evento (`feedbacks`)
- Coleta de notas (1 a 5 estrelas) e depoimentos avaliativos enviados pelos participantes após a conclusão das atividades.

---

## 4. Modelagem Integrada para o UniCore (`schema.prisma`)

A modelagem abaixo reflete todas as descobertas de forma **puramente aditiva**. O modelo `CertificateEvent` existente ganha novos campos opcionais e novas tabelas são criadas, sem tocar em nada que já existe:

```prisma
// =======================================================
// 1. EXTENSÃO NÃO DESTRUTIVA DE CertificateEvent
// =======================================================

model CertificateEvent {
  // --- CAMPOS JÁ EXISTENTES NO UNICORE (MANTIDOS INTACTOS) ---
  id                     String                   @id @default(uuid()) @db.Uuid
  title                  String
  description            String?
  workloadHours          Int                      @default(20) @map("workload_hours")
  speaker                String?
  courseName             String?                  @map("course_name")
  startDate              DateTime                 @map("start_date")
  endDate                DateTime?                @map("end_date")
  location               String?
  isActive               Boolean                  @default(true) @map("is_active")
  logoUrl                String?                  @map("logo_url")
  certificateTemplateUrl String?                  @map("certificate_template_url")
  templateStyle          Json?                    @map("template_style")
  createdById            String?                  @map("created_by_id") @db.Uuid
  createdBy              User?                    @relation(fields: [createdById], references: [id], onDelete: SetNull)
  participants           CertificateParticipant[]
  createdAt              DateTime                 @default(now()) @map("created_at")
  updatedAt              DateTime                 @updatedAt @map("updated_at")

  // --- NOVOS CAMPOS ADICIONAIS (TODOS OPCIONAIS) ---
  bannerUrl              String?                  @map("banner_url")
  ticketType             String?                  @default("requerimento") @map("ticket_type") // requerimento, link, pix
  paymentLink            String?                  @map("payment_link")
  pixKey                 String?                  @map("pix_key")
  pixQrCodeUrl           String?                  @map("pix_qr_code_url")
  ticketLimit            Int?                     @default(0) @map("ticket_limit")
  ticketsSold            Int?                     @default(0) @map("tickets_sold")
  
  // Tarifação por público e lotes promocionais
  standardPrice          Decimal?                 @default(0.00) @map("standard_price") @db.Decimal(10, 2)
  teacherPrice           Decimal?                 @map("teacher_price") @db.Decimal(10, 2)
  promoPrice             Decimal?                 @map("promo_price") @db.Decimal(10, 2)
  promoDeadline          DateTime?                @map("promo_deadline")
  teacherPromoPrice      Decimal?                 @map("teacher_promo_price") @db.Decimal(10, 2)
  teacherPromoDeadline   DateTime?                @map("teacher_promo_deadline")
  targetAudience         String?                  @default("todos") @map("target_audience") // todos, aluno, professor, visitante
  
  // Submissão científica
  acceptsArticles        Boolean                  @default(false) @map("accepts_articles")
  articlesDeadline       DateTime?                @map("articles_deadline")
  issnCode               String?                  @map("issn_code") // Ex: ISSN 2178-857X
  
  // Templates adicionais e trava temporizada
  monitorTemplateUrl     String?                  @map("monitor_template_url")
  articleTemplateUrl     String?                  @map("article_template_url")
  certificateReleaseDate DateTime?                @map("certificate_release_date")

  // Relacionamentos com os novos módulos
  workshops              EventWorkshop[]
  tickets                EventTicket[]
  articles               EventArticle[]
  attendances            EventAttendance[]
  expenses               EventExpense[]
  sponsors               EventSponsor[]
  feedbacks              EventFeedback[]

  @@index([createdById])
  @@map("certificate_events")
}

// =======================================================
// 2. NOVOS MODELOS COMPLEMENTARES
// =======================================================

/// Oficinas e workshops com controle rígido de vagas
model EventWorkshop {
  id          String                @id @default(uuid()) @db.Uuid
  eventId     String                @map("event_id") @db.Uuid
  event       CertificateEvent      @relation(fields: [eventId], references: [id], onDelete: Cascade)
  title       String
  courseName  String?               @map("course_name")
  description String?
  vacancies   Int                   @default(50)
  tickets     EventTicketWorkshop[]
  createdAt   DateTime              @default(now()) @map("created_at")
  updatedAt   DateTime              @updatedAt @map("updated_at")

  @@index([eventId])
  @@map("event_workshops")
}

/// Ingressos digitais, requerimentos e ciclo de cobrança
model EventTicket {
  id             String                @id @default(uuid()) @db.Uuid
  eventId        String                @map("event_id") @db.Uuid
  event          CertificateEvent      @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId         String?               @map("user_id") @db.Uuid
  user           User?                 @relation(fields: [userId], references: [id], onDelete: SetNull)
  uniqueCode     String                @unique @map("unique_code") // Ex: A91E75D4
  status         String                @default("aguardando_pagamento") // aguardando_pagamento, em_analise, pago, rejeitado, utilizado
  amountPaid     Decimal               @default(0.00) @map("amount_paid") @db.Decimal(10, 2)
  dueDate        DateTime?             @map("due_date") // Data calculada de vencimento
  receiptUrl     String?               @map("receipt_url")
  isMonitor      Boolean               @default(false) @map("is_monitor")
  isUsed         Boolean               @default(false) @map("is_used") // Destrava certificado após check-in
  usedAt         DateTime?             @map("used_at")
  validatedAt    DateTime?             @map("validated_at")
  validatedById  String?               @map("validated_by_id") @db.Uuid
  workshops      EventTicketWorkshop[]
  createdAt      DateTime              @default(now()) @map("created_at")
  updatedAt      DateTime              @updatedAt @map("updated_at")

  @@index([eventId])
  @@index([userId])
  @@index([uniqueCode])
  @@map("event_tickets")
}

/// Vínculo entre ingresso e workshops escolhidos
model EventTicketWorkshop {
  id         String        @id @default(uuid()) @db.Uuid
  ticketId   String        @map("ticket_id") @db.Uuid
  ticket     EventTicket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  workshopId String        @map("workshop_id") @db.Uuid
  workshop   EventWorkshop @relation(fields: [workshopId], references: [id], onDelete: Cascade)

  @@unique([ticketId, workshopId])
  @@index([ticketId])
  @@index([workshopId])
  @@map("event_ticket_workshops")
}

/// Submissão e avaliação de artigos científicos
model EventArticle {
  id               String           @id @default(uuid()) @db.Uuid
  eventId          String           @map("event_id") @db.Uuid
  event            CertificateEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  authorId         String           @map("author_id") @db.Uuid
  author           User             @relation("ArticleAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  title            String
  coauthors        String?          // IDs de coautores (obrigatoriamente com ticket pago)
  docFileUrl       String           @map("doc_file_url")
  pdfFileUrl       String?          @map("pdf_file_url")
  plagiarismReport String?          @map("plagiarism_report")
  correctionFile   String?          @map("correction_file")
  status           String           @default("pendente") // pendente, aprovado, rejeitado
  advisorName      String?          @map("advisor_name")
  coAdvisorName    String?          @map("co_advisor_name")
  currentLockId    String?          @map("current_lock_id") @db.Uuid // Lock anti-concorrência
  evaluatorId      String?          @map("evaluator_id") @db.Uuid
  evaluator        User?            @relation("ArticleEvaluator", fields: [evaluatorId], references: [id], onDelete: SetNull)
  evaluatedAt      DateTime?        @map("evaluated_at")
  createdAt        DateTime         @default(now()) @map("created_at")
  updatedAt        DateTime         @updatedAt @map("updated_at")

  @@index([eventId])
  @@index([authorId])
  @@index([evaluatorId])
  @@map("event_articles")
}

/// Cadastro de salas e auditórios físicos
model EventRoom {
  id             String            @id @default(uuid()) @db.Uuid
  name           String
  description    String?
  capacity       Int               @default(0)
  isActive       Boolean           @default(true) @map("is_active")
  responsibleIds String[]          @default([]) @map("responsible_ids") // IDs de professores autorizados a escanear
  attendances    EventAttendance[]
  createdAt      DateTime          @default(now()) @map("created_at")
  updatedAt      DateTime          @updatedAt @map("updated_at")

  @@map("event_rooms")
}

/// Registro refinado de presença (Entrada / Saída por paridade matemática)
model EventAttendance {
  id             String            @id @default(uuid()) @db.Uuid
  eventId        String            @map("event_id") @db.Uuid
  event          CertificateEvent  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId         String            @map("user_id") @db.Uuid
  user           User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  roomId         String?           @map("room_id") @db.Uuid
  room           EventRoom?        @relation(fields: [roomId], references: [id], onDelete: SetNull)
  checkinType    String            @default("entrada") @map("checkin_type") // entrada, saida
  checkinDate    DateTime          @default(now()) @map("checkin_date")
  operatorId     String?           @map("operator_id") @db.Uuid
  validationHash String?           @map("validation_hash")

  @@index([eventId])
  @@index([userId])
  @@index([roomId])
  @@map("event_attendances")
}

/// Consolidação orçamentária de múltiplos eventos
model EventFinancialGroup {
  id        String         @id @default(uuid()) @db.Uuid
  title     String
  eventIds  String[]       @map("event_ids")
  expenses  EventExpense[]
  createdAt DateTime       @default(now()) @map("created_at")

  @@map("event_financial_groups")
}

/// Despesas operacionais do evento
model EventExpense {
  id          String               @id @default(uuid()) @db.Uuid
  eventId     String?              @map("event_id") @db.Uuid
  event       CertificateEvent?    @relation(fields: [eventId], references: [id], onDelete: SetNull)
  groupId     String?              @map("group_id") @db.Uuid
  group       EventFinancialGroup? @relation(fields: [groupId], references: [id], onDelete: SetNull)
  description String
  category    String
  amount      Decimal              @db.Decimal(10, 2)
  receiptUrl  String?              @map("receipt_url")
  expenseDate DateTime             @map("expense_date")
  createdAt   DateTime             @default(now()) @map("created_at")

  @@index([eventId])
  @@index([groupId])
  @@map("event_expenses")
}

/// Empresas patrocinadoras
model EventSponsor {
  id          String                   @id @default(uuid()) @db.Uuid
  eventId     String                   @map("event_id") @db.Uuid
  event       CertificateEvent         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name        String
  contact     String?
  movements   EventSponsorMovement[]
  createdAt   DateTime                 @default(now()) @map("created_at")

  @@index([eventId])
  @@map("event_sponsors")
}

/// Movimentações de patrocínio e cotas
model EventSponsorMovement {
  id           String       @id @default(uuid()) @db.Uuid
  sponsorId    String       @map("sponsor_id") @db.Uuid
  sponsor      EventSponsor @relation(fields: [sponsorId], references: [id], onDelete: Cascade)
  type         String       @default("entrada")
  nature       String       // dinheiro, brindes, servico, equipamento
  description  String
  amount       Decimal      @default(0.00) @db.Decimal(10, 2)
  quantity     Int          @default(1)
  receiptUrl   String?      @map("receipt_url")
  movementDate DateTime     @default(now()) @map("movement_date")

  @@index([sponsorId])
  @@map("event_sponsor_movements")
}

/// Pesquisa de satisfação pós-evento
model EventFeedback {
  id        String           @id @default(uuid()) @db.Uuid
  eventId   String           @map("event_id") @db.Uuid
  event     CertificateEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId    String           @map("user_id") @db.Uuid
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  rating    Int              // 1 a 5
  comment   String?
  createdAt DateTime         @default(now()) @map("created_at")

  @@index([eventId])
  @@index([userId])
  @@map("event_feedbacks")
}
```

---

## 5. Endpoints NestJS Sugeridos para os Novos Módulos

### Inscrições e Bilheteria (`/events/:eventId/tickets`)
- `GET /events/lookup-cpf/:cpf`: Busca antecipada de CPF no Unimestre e preenchimento de perfil e e-mail Google.
- `POST /events/:eventId/tickets`: Reserva de ingresso com cálculo automático de vencimento (3 dias ou fim do lote).
- `GET /events/tickets/my`: Lista de ingressos do participante autenticado.
- `POST /events/tickets/:ticketId/receipt`: Upload do comprovante de pagamento.
- `PATCH /events/tickets/:ticketId/validate`: Homologação da tesouraria com envio automático de e-mail e QR Code.
- `POST /events/tickets/cron-expire`: Execução da rotina de limpeza de ingressos vencidos e devolução de vagas.

### Workshops (`/events/:eventId/workshops`)
- `GET /events/:eventId/workshops`: Listagem com total de vagas disponíveis em tempo real.
- `POST /events/:eventId/workshops`: Cadastro de oficina.
- `PATCH /events/tickets/:ticketId/switch-workshop`: Troca transacional de oficina com devolução/débito de vaga.

### Artigos Científicos (`/events/:eventId/articles`)
- `GET /events/:eventId/eligible-coauthors`: Lista de alunos/professores com ingresso pago aptos a coautoria.
- `POST /events/:eventId/articles`: Submissão de artigo com Word e PDF.
- `PATCH /events/articles/:articleId/lock`: Ativação ou liberação da trava de concorrência (`set_lock`).
- `PATCH /events/articles/:articleId/review`: Emissão de parecer final com relatório de plágio e correções.
- `GET /events/committee`: Gestão dos membros docentes da comissão científica (`avaliador_artigos`).

### Portaria e Salas (`/events/rooms` e `/events/attendance`)
- `GET /events/rooms`: Listagem de salas físicas com permissão de operadores.
- `POST /events/attendance/scan`: Processamento de bipagem da câmera:
  - Avalia paridade do dia (`COUNT(*)`) para registrar Entrada ou Saída.
  - Na primeira entrada, atualiza o ticket para `isUsed = true`.

### Certificação Avançada (`/certificates`)
- `GET /certificates/event/:eventId/download`: Geração e entrega do PDF em 2 páginas:
  - Frente personalizada por tipo (`participacao`, `monitoria`, `artigo`) com ISSN e auto-redução de fonte.
  - Verso de autenticidade com QR Code (50x50 mm) e código hash.
  - Cache em disco para entregas rápidas.

### Finanças, Patrocínio e Exportação (`/events/:eventId/finances` e `/events/export`)
- `GET /events/:eventId/financial-summary`: Balanço consolidado (ingressos + patrocínios - despesas).
- `POST /events/:eventId/expenses`: Lançamento de despesas com comprovante.
- `POST /events/:eventId/sponsors`: Cadastro de patrocinadores e movimentações de cotas.
- `GET /events/export/:reportType`: Download do relatório em Excel (`.xls`) em um dos 6 formatos.
