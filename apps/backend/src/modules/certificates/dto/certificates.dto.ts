export interface CertificatesFilterDto {
  ano?: string
  curso?: string
  evento?: string
  busca?: string
}

export interface CertificateYearDto {
  year: number
}

export interface CertificateCourseDto {
  id: string
  name: string
}

export interface CertificateEventDto {
  id: string
  title: string
  workload: number | null
  classId: string | null
}

export interface CertificateInscriptionItemDto {
  id: string
  studentRa: string
  studentName: string
  eventId: string
  eventTitle: string
  workloadHours: number | null
  startDate: string | null
  endDate: string | null
  isPaid: boolean
  paymentDate: string | null
  attendanceCount: number
  hasAttendance: boolean
  isEligible: boolean
  blockedReason?: string
  emittedCount?: number
  lastEmittedAt?: string | null
}

export interface CertificateDocumentDto {
  inscricaoId: string
  studentRa: string
  studentName: string
  studentCpf: string | null
  eventId: string
  eventTitle: string
  workloadHours: number
  startDate: string | null
  endDate: string | null
  courseName: string | null
  issuedAt: string
  verificationCode: string
  institutionName: string
  issuedByName?: string
  logoUrl?: string | null
  certificateTemplateUrl?: string | null
  templateStyle?: any
  issnCode?: string | null
  verificationUrl?: string | null
  hash?: string | null
  monitorTemplateUrl?: string | null
  articleTemplateUrl?: string | null
}

export interface CreateCustomEventDto {
  title: string
  description?: string
  workloadHours: number
  speaker?: string
  courseName?: string
  startDate: string
  endDate?: string
  location?: string
  logoUrl?: string | null
  certificateTemplateUrl?: string | null
  templateStyle?: any
  bannerUrl?: string | null
  ticketType?: string
  paymentLink?: string | null
  pixKey?: string | null
  pixQrCodeUrl?: string | null
  ticketLimit?: number
  standardPrice?: number
  teacherPrice?: number
  promoPrice?: number
  promoDeadline?: string | null
  teacherPromoPrice?: number
  teacherPromoDeadline?: string | null
  targetAudience?: string
  acceptsArticles?: boolean
  articlesDeadline?: string | null
  issnCode?: string | null
  monitorTemplateUrl?: string | null
  articleTemplateUrl?: string | null
  certificateReleaseDate?: string | null
}

export interface UpdateCustomEventDto {
  title?: string
  description?: string
  workloadHours?: number
  speaker?: string
  courseName?: string
  startDate?: string
  endDate?: string
  location?: string
  isActive?: boolean
  logoUrl?: string | null
  certificateTemplateUrl?: string | null
  templateStyle?: any
  bannerUrl?: string | null
  ticketType?: string
  paymentLink?: string | null
  pixKey?: string | null
  pixQrCodeUrl?: string | null
  ticketLimit?: number
  standardPrice?: number
  teacherPrice?: number
  promoPrice?: number
  promoDeadline?: string | null
  teacherPromoPrice?: number
  teacherPromoDeadline?: string | null
  targetAudience?: string
  acceptsArticles?: boolean
  articlesDeadline?: string | null
  issnCode?: string | null
  monitorTemplateUrl?: string | null
  articleTemplateUrl?: string | null
  certificateReleaseDate?: string | null
}

export interface CreateCustomParticipantDto {
  studentName: string
  studentRa: string
  studentCpf?: string
  studentEmail?: string
  isPaid?: boolean
  hasAttendance?: boolean
  notes?: string
}

export interface UpdateParticipantStatusDto {
  studentName?: string
  isPaid?: boolean
  hasAttendance?: boolean
  notes?: string
}

export interface CustomEventSummaryDto {
  id: string
  title: string
  description: string | null
  workloadHours: number
  speaker: string | null
  courseName: string | null
  startDate: string
  endDate: string | null
  location: string | null
  isActive: boolean
  logoUrl: string | null
  certificateTemplateUrl: string | null
  templateStyle?: any
  totalParticipants: number
  paidParticipants: number
  eligibleParticipants: number
  createdAt: string
  bannerUrl?: string | null
  ticketType?: string | null
  paymentLink?: string | null
  pixKey?: string | null
  pixQrCodeUrl?: string | null
  ticketLimit?: number | null
  ticketsSold?: number | null
  standardPrice?: number | null
  teacherPrice?: number | null
  promoPrice?: number | null
  promoDeadline?: string | null
  teacherPromoPrice?: number | null
  teacherPromoDeadline?: string | null
  targetAudience?: string | null
  acceptsArticles?: boolean
  articlesDeadline?: string | null
  issnCode?: string | null
  monitorTemplateUrl?: string | null
  articleTemplateUrl?: string | null
  certificateReleaseDate?: string | null
}

export interface EventCatalogItemDto {
  id: string
  title: string
  description: string | null
  workloadHours: number
  speaker: string | null
  courseName: string | null
  startDate: string
  endDate: string | null
  location: string | null
  isActive: boolean
  logoUrl: string | null
  certificateTemplateUrl: string | null
  templateStyle?: any
  isRegistered?: boolean
  participantId?: string | null
  isPaid?: boolean
  hasAttendance?: boolean
  isEligible?: boolean
  issuedAt?: string | null
  bannerUrl?: string | null
  ticketType?: string | null
  standardPrice?: number | null
  promoPrice?: number | null
  promoDeadline?: string | null
  targetAudience?: string | null
  acceptsArticles?: boolean
  articlesDeadline?: string | null
  certificateReleaseDate?: string | null
  isReleaseLocked?: boolean
}

export interface CustomParticipantItemDto {
  id: string
  eventId: string
  eventTitle: string
  workloadHours: number
  studentName: string
  studentRa: string
  studentCpf: string | null
  studentEmail: string | null
  isPaid: boolean
  paymentDate: string | null
  hasAttendance: boolean
  attendanceCount: number
  isEligible: boolean
  blockedReason?: string
  notes: string | null
  createdAt: string
  emittedCount?: number
  lastEmittedAt?: string | null
}

// ==========================================
// NOVOS DTOS: BILHETERIA, WORKSHOPS, ARTIGOS, PORTARIA
// ==========================================

export interface LookupCpfResultDto {
  cpf: string
  encontrado: boolean
  perfil: 'aluno' | 'professor' | 'visitante'
  nome?: string
  email?: string
  curso?: string
  ra?: string
}

export interface CreateEventTicketDto {
  workshopIds?: string[]
}

export interface ValidateTicketDto {
  status: 'pago' | 'rejeitado' | 'aguardando_pagamento' | 'em_analise' | 'utilizado'
  isMonitor?: boolean
}

export interface EventTicketDto {
  id: string
  eventId: string
  userId: string | null
  uniqueCode: string
  status: string
  amountPaid: number
  dueDate: string | null
  receiptUrl: string | null
  isMonitor: boolean
  isUsed: boolean
  usedAt: string | null
  validatedAt: string | null
  validatedById: string | null
  createdAt: string
  workshops?: {
    id: string
    title: string
    courseName: string | null
  }[]
  userName?: string
  userEmail?: string
  userCpf?: string | null
  eventTitle?: string
}

export interface CreateEventWorkshopDto {
  title: string
  courseName?: string
  description?: string
  vacancies?: number
}

export interface UpdateEventWorkshopDto {
  title?: string
  courseName?: string
  description?: string
  vacancies?: number
}

export interface EventWorkshopDto {
  id: string
  eventId: string
  title: string
  courseName: string | null
  description: string | null
  vacancies: number
  occupiedVacancies: number
  remainingVacancies: number
  createdAt: string
}

export interface CreateEventArticleDto {
  title: string
  coauthors?: string
  advisorName?: string
  coAdvisorName?: string
}

export interface ReviewEventArticleDto {
  status: 'aprovado' | 'rejeitado'
  notes?: string
}

export interface EventArticleDto {
  id: string
  eventId: string
  eventTitle?: string
  authorId: string
  authorName: string
  authorEmail?: string
  title: string
  coauthors: string | null
  docFileUrl: string
  pdfFileUrl: string | null
  plagiarismReport: string | null
  correctionFile: string | null
  status: string
  advisorName: string | null
  coAdvisorName: string | null
  currentLockId: string | null
  evaluatorId: string | null
  evaluatorName?: string | null
  evaluatedAt: string | null
  createdAt: string
}

export interface CreateEventRoomDto {
  name: string
  description?: string
  capacity?: number
  responsibleIds?: string[]
}

export interface EventRoomDto {
  id: string
  name: string
  description: string | null
  capacity: number
  isActive: boolean
  responsibleIds: string[]
  createdAt: string
}

export interface ScanAttendanceDto {
  roomId: string
  eventId: string
  code: string // uniqueCode, CPF ou ID do aluno
}

export interface ScanAttendanceResultDto {
  status: 'entrada' | 'saida' | 'erro'
  message: string
  studentName?: string
  studentProfile?: string
  timestamp: string
  totalScansToday?: number
  roomName?: string
}

export interface CreateEventExpenseDto {
  description: string
  category: string
  amount: number
  expenseDate: string
  groupId?: string
}

export interface EventExpenseDto {
  id: string
  eventId: string | null
  groupId: string | null
  description: string
  category: string
  amount: number
  receiptUrl: string | null
  expenseDate: string
  createdAt: string
}

export interface CreateEventSponsorDto {
  name: string
  contact?: string
}

export interface CreateSponsorMovementDto {
  type?: string
  nature: string // dinheiro, brindes, servico, equipamento
  description: string
  amount?: number
  quantity?: number
}

export interface EventSponsorDto {
  id: string
  eventId: string
  name: string
  contact: string | null
  movementsCount: number
  totalAmount: number
  createdAt: string
}

export interface FinancialSummaryDto {
  eventId: string
  eventTitle: string
  ticketsRevenue: number
  ticketsCount: number
  paidTicketsCount: number
  sponsorsTotal: number
  expensesTotal: number
  netBalance: number
  expenses?: EventExpenseDto[]
  sponsors?: EventSponsorDto[]
}

export interface CreateEventFeedbackDto {
  rating: number // 1 a 5
  comment?: string
}

export interface EventFeedbackDto {
  id: string
  eventId: string
  userId: string
  userName: string
  rating: number
  comment: string | null
  createdAt: string
}
