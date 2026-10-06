import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable } from '@angular/core'
import type { Observable } from 'rxjs'

export interface CertificateYear {
  year: number
}

export interface CertificateCourse {
  id: string
  name: string
}

export interface CertificateEvent {
  id: string
  title: string
  workload: number | null
  classId: string | null
}

export interface CertificateInscription {
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

export interface CertificateDocument {
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
  templateStyle?: CertificateTemplateStyle | null
  issnCode?: string | null
  verificationUrl?: string | null
  hash?: string | null
  monitorTemplateUrl?: string | null
  articleTemplateUrl?: string | null
}

export interface CertificateTemplateStyle {
  // Fundo
  useUploadedBackground?: boolean
  backgroundColor?: string

  // Moldura
  frameStyle?: 'classic-double' | 'modern-single' | 'ornate-gold' | 'minimal' | 'none'
  frameBorderColor?: string
  frameInnerBorderColor?: string
  frameBorderWidth?: number
  showInnerBorder?: boolean

  // Tipografia e Cores
  fontFamily?:
    | 'serif'
    | 'playfair'
    | 'cinzel'
    | 'sans'
    | 'times'
    | 'montserrat'
    | 'great-vibes'
    | 'alex-brush'
    | 'pinyon'
    | 'dancing'
  studentNameFontFamily?:
    | 'same'
    | 'great-vibes'
    | 'alex-brush'
    | 'pinyon'
    | 'dancing'
    | 'playfair'
    | 'cinzel'
    | 'montserrat'
    | 'times'
    | 'serif'
  titleColor?: string
  institutionColor?: string
  subheadingColor?: string
  textColor?: string
  eventHighlightColor?: string
  studentNameColor?: string
  studentNameFontSize?: number
  studentNameTop?: number

  // Textos Institucionais Customizáveis
  institutionName?: string
  institutionSub?: string
  certificateTitle?: string
  customText?: string
  city?: string

  // Assinaturas
  showSignatures?: boolean
  signer1Name?: string
  signer1Role?: string
  signer1Dept?: string
  signer2Name?: string
  signer2Role?: string
  signer2Dept?: string
  // Exibições
  showLogo?: boolean
  showInstitutionHeader?: boolean
}

export function getDefaultTemplateStyle(): CertificateTemplateStyle {
  return {
    useUploadedBackground: false,
    backgroundColor: '#ffffff',
    frameStyle: 'classic-double',
    frameBorderColor: '#0f172a',
    frameInnerBorderColor: '#d97706',
    frameBorderWidth: 4,
    showInnerBorder: true,
    fontFamily: 'serif',
    studentNameFontFamily: 'same',
    titleColor: '#0f172a',
    institutionColor: '#0f172a',
    subheadingColor: '#d97706',
    textColor: '#334155',
    eventHighlightColor: '#1e3a8a',
    studentNameColor: '#0f172a',
    studentNameFontSize: 34,
    studentNameTop: 48,
    institutionName: 'FAIP - FACULDADE DE ENSINO SUPERIOR DO INTERIOR PAULISTA',
    institutionSub: 'Secretaria Geral de Cursos de Extensão e Capacitação',
    certificateTitle: 'CERTIFICADO',
    customText: '',
    city: 'Marília - SP',
    showSignatures: true,
    signer1Name: '',
    signer1Role: 'Coordenação de Extensão',
    signer1Dept: 'UniCore / FAIP',
    signer2Name: '',
    signer2Role: 'Secretaria Acadêmica Geral',
    signer2Dept: 'Diretoria de Registros',
    showLogo: true,
    showInstitutionHeader: true,
  }
}

export interface CertificateEmissionLog {
  id: string
  inscricaoId: string
  studentRa: string
  studentName: string
  eventTitle: string
  workloadHours: number
  verificationCode: string
  issuedAt: string
  issuedByUserId: string | null
  issuedByUser?: { username: string } | null
}

export interface CertificatesFilter {
  ano?: string
  curso?: string
  evento?: string
  busca?: string
}

// ==========================================
// CUSTOM EVENTS & REGRAS ESTENDIDAS (UniCore)
// ==========================================

export interface CreateCustomEvent {
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
  templateStyle?: CertificateTemplateStyle | null
  bannerUrl?: string | null
  ticketType?: string
  paymentLink?: string | null
  pixKey?: string | null
  pixQrCodeUrl?: string | null
  ticketLimit?: number | null
  standardPrice?: number | null
  teacherPrice?: number | null
  promoPrice?: number | null
  promoDeadline?: string | null
  teacherPromoPrice?: number | null
  teacherPromoDeadline?: string | null
  targetAudience?: string
  acceptsArticles?: boolean
  articlesDeadline?: string | null
  issnCode?: string | null
  monitorTemplateUrl?: string | null
  articleTemplateUrl?: string | null
  certificateReleaseDate?: string | null
}

export interface UpdateCustomEvent {
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
  templateStyle?: CertificateTemplateStyle | null
  bannerUrl?: string | null
  ticketType?: string
  paymentLink?: string | null
  pixKey?: string | null
  pixQrCodeUrl?: string | null
  ticketLimit?: number | null
  standardPrice?: number | null
  teacherPrice?: number | null
  promoPrice?: number | null
  promoDeadline?: string | null
  teacherPromoPrice?: number | null
  teacherPromoDeadline?: string | null
  targetAudience?: string
  acceptsArticles?: boolean
  articlesDeadline?: string | null
  issnCode?: string | null
  monitorTemplateUrl?: string | null
  articleTemplateUrl?: string | null
  certificateReleaseDate?: string | null
}

export interface CreateCustomParticipant {
  studentName: string
  studentRa: string
  studentCpf?: string
  studentEmail?: string
  isPaid?: boolean
  hasAttendance?: boolean
  notes?: string
}

export interface UpdateParticipantStatus {
  studentName?: string
  isPaid?: boolean
  hasAttendance?: boolean
  notes?: string
}

export interface CustomEventSummary {
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
  logoUrl?: string | null
  certificateTemplateUrl?: string | null
  templateStyle?: CertificateTemplateStyle | null
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

export interface EventCatalogItem {
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
  logoUrl?: string | null
  certificateTemplateUrl?: string | null
  templateStyle?: CertificateTemplateStyle | null
  isRegistered?: boolean
  participantId?: string | null
  isPaid?: boolean
  hasAttendance?: boolean
  isEligible?: boolean
  issuedAt?: string | null
  bannerUrl?: string | null
  ticketType?: string | null
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
  certificateReleaseDate?: string | null
  isReleaseLocked?: boolean
  pixKey?: string | null
  pixQrCodeUrl?: string | null
}

export interface CustomParticipantItem {
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

export interface CustomEventDetails {
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
  logoUrl?: string | null
  certificateTemplateUrl?: string | null
  templateStyle?: CertificateTemplateStyle | null
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
  participants: CustomParticipantItem[]
}

// ==========================================
// INTERFACES DOS NOVOS MÓDULOS DE EVENTOS
// ==========================================

export interface LookupCpfResult {
  cpf: string
  encontrado: boolean
  perfil: 'aluno' | 'professor' | 'visitante'
  nome?: string
  curso?: string
  ra?: string
  email?: string
}

export interface CreateEventTicket {
  workshopIds?: string[]
}

export interface ValidateTicket {
  status: 'pago' | 'rejeitado'
  isMonitor?: boolean
}

export interface EventTicket {
  id: string
  eventId: string
  eventTitle: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  userRole?: string | null
  uniqueCode: string
  status: string // aguardando_pagamento, em_analise, pago, rejeitado, utilizado
  amountPaid: number
  dueDate: string | null
  receiptUrl: string | null
  isMonitor: boolean
  isUsed: boolean
  usedAt: string | null
  validatedAt: string | null
  workshops: { id: string; title: string; courseName?: string | null }[]
  createdAt: string
}

export interface CreateEventWorkshop {
  title: string
  courseName?: string
  description?: string
  vacancies: number
}

export interface UpdateEventWorkshop {
  title?: string
  courseName?: string
  description?: string
  vacancies?: number
}

export interface EventWorkshop {
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

export interface CreateEventArticle {
  title: string
  coauthors?: string
  advisorName?: string
  coAdvisorName?: string
}

export interface ReviewEventArticle {
  status: 'aprovado' | 'reprovado' | 'correcao'
  score?: number
  feedbackNotes?: string
}

export interface EventArticle {
  id: string
  eventId: string
  authorId: string
  authorName: string
  authorEmail: string
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

export interface CreateEventRoom {
  name: string
  description?: string
  capacity?: number
  responsibleIds?: string[]
}

export interface EventRoom {
  id: string
  name: string
  description: string | null
  capacity: number
  isActive: boolean
  responsibleIds: string[]
  createdAt: string
}

export interface ScanAttendance {
  eventId: string
  roomId: string
  code: string
}

export interface ScanAttendanceResult {
  status: 'entrada' | 'saida' | 'erro'
  message: string
  studentName?: string
  studentProfile?: string
  timestamp: string
  totalScansToday?: number
  roomName?: string
}

export interface EventAttendanceItem {
  id: string
  eventId: string
  userId: string
  userName: string
  userRole: string
  roomId: string | null
  roomName: string
  operatorId: string | null
  operatorName: string
  checkinType: string
  checkinDate: string
}

export interface CreateEventExpense {
  description: string
  category: string
  amount: number
  expenseDate: string
  groupId?: string
}

export interface EventExpense {
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

export interface CreateEventSponsor {
  name: string
  contact?: string
}

export interface CreateSponsorMovement {
  type?: 'entrada' | 'saida'
  nature: string
  description: string
  amount?: number
  quantity?: number
}

export interface EventSponsor {
  id: string
  eventId: string
  name: string
  contact: string | null
  movementsCount: number
  totalAmount: number
  createdAt: string
}

export interface FinancialSummary {
  eventId: string
  eventTitle: string
  ticketsRevenue: number
  ticketsCount: number
  paidTicketsCount: number
  sponsorsTotal: number
  expensesTotal: number
  netBalance: number
  expenses?: EventExpense[]
  sponsors?: EventSponsor[]
}

export interface EventFinancialGroup {
  id: string
  eventIds: string[]
  name: string
  createdAt: string
}

export interface CreateEventFeedback {
  rating: number
  comment?: string
}

export interface EventFeedback {
  id: string
  eventId: string
  userId: string
  userName: string
  rating: number
  comment: string | null
  createdAt: string
}

@Injectable({
  providedIn: 'root',
})
export class CertificatesService {
  constructor(private readonly http: HttpClient) {}

  // ==========================================
  // CATÁLOGO PÚBLICO / ACADÊMICO DE EVENTOS
  // ==========================================

  getEventsCatalog(): Observable<EventCatalogItem[]> {
    return this.http.get<EventCatalogItem[]>('/api/certificates/catalog')
  }

  getMyCertificate(participantId: string): Observable<CertificateDocument> {
    return this.http.get<CertificateDocument>(`/api/certificates/my-certificate/${participantId}`)
  }

  // ==========================================
  // UNIMESTRE / EVENTOS LEGADOS
  // ==========================================

  getYears(): Observable<CertificateYear[]> {
    return this.http.get<CertificateYear[]>('/api/certificates/years')
  }

  getCourses(): Observable<CertificateCourse[]> {
    return this.http.get<CertificateCourse[]>('/api/certificates/courses')
  }

  getEvents(year?: number, course?: string): Observable<CertificateEvent[]> {
    let params = new HttpParams()
    if (year) params = params.set('year', year.toString())
    if (course) params = params.set('course', course)
    return this.http.get<CertificateEvent[]>('/api/certificates/events', { params })
  }

  searchInscriptions(filters: CertificatesFilter): Observable<CertificateInscription[]> {
    let params = new HttpParams()
    if (filters.ano) params = params.set('ano', filters.ano.toString())
    if (filters.curso) params = params.set('curso', filters.curso)
    if (filters.evento) params = params.set('evento', filters.evento)
    if (filters.busca) params = params.set('busca', filters.busca)
    return this.http.get<CertificateInscription[]>('/api/certificates/inscriptions', { params })
  }

  getDocument(inscricaoId: string): Observable<CertificateDocument> {
    return this.http.get<CertificateDocument>(`/api/certificates/document/${inscricaoId}`)
  }

  getLogs(inscricaoId?: string): Observable<CertificateEmissionLog[]> {
    let params = new HttpParams()
    if (inscricaoId) params = params.set('inscricaoId', inscricaoId)
    return this.http.get<CertificateEmissionLog[]>('/api/certificates/logs', { params })
  }

  // ==========================================
  // EVENTOS CUSTOMIZADOS (UniCore)
  // ==========================================

  createCustomEvent(data: CreateCustomEvent): Observable<CustomEventSummary> {
    return this.http.post<CustomEventSummary>('/api/certificates/custom-events', data)
  }

  listCustomEvents(search?: string): Observable<CustomEventSummary[]> {
    let params = new HttpParams()
    if (search?.trim()) params = params.set('search', search.trim())
    return this.http.get<CustomEventSummary[]>('/api/certificates/custom-events', { params })
  }

  getCustomEventById(id: string): Observable<CustomEventDetails> {
    return this.http.get<CustomEventDetails>(`/api/certificates/custom-events/${id}`)
  }

  updateCustomEvent(id: string, data: UpdateCustomEvent): Observable<any> {
    return this.http.put(`/api/certificates/custom-events/${id}`, data)
  }

  deleteCustomEvent(id: string): Observable<any> {
    return this.http.delete(`/api/certificates/custom-events/${id}`)
  }

  uploadEventAsset(
    eventId: string,
    type: 'logo' | 'template' | 'banner' | 'monitorTemplate' | 'articleTemplate' | 'pixQrCode',
    file: File,
  ): Observable<{ assetUrl: string; fileName: string }> {
    const formData = new FormData()
    formData.append('file', file)
    return this.http.post<{ assetUrl: string; fileName: string }>(
      `/api/certificates/custom-events/${eventId}/assets?type=${type}`,
      formData,
    )
  }

  addParticipant(eventId: string, data: CreateCustomParticipant): Observable<any> {
    return this.http.post(`/api/certificates/custom-events/${eventId}/participants`, data)
  }

  updateParticipantStatus(participantId: string, data: UpdateParticipantStatus): Observable<any> {
    return this.http.patch(`/api/certificates/participants/${participantId}/status`, data)
  }

  removeParticipant(participantId: string): Observable<any> {
    return this.http.delete(`/api/certificates/participants/${participantId}`)
  }

  getParticipantDocument(participantId: string): Observable<CertificateDocument> {
    return this.http.get<CertificateDocument>(`/api/certificates/participants/${participantId}/document`)
  }

  // ==========================================
  // CONSULTA INTELIGENTE DE CPF
  // ==========================================

  lookupCpf(cpf: string): Observable<LookupCpfResult> {
    return this.http.get<LookupCpfResult>(`/api/certificates/lookup-cpf/${cpf}`)
  }

  // ==========================================
  // INGRESSOS & BILHETERIA
  // ==========================================

  createTicket(eventId: string, data: CreateEventTicket): Observable<EventTicket> {
    return this.http.post<EventTicket>(`/api/certificates/custom-events/${eventId}/tickets`, data)
  }

  getEventTickets(eventId: string, status?: string): Observable<EventTicket[]> {
    let params = new HttpParams()
    if (status?.trim()) params = params.set('status', status.trim())
    return this.http.get<EventTicket[]>(`/api/certificates/custom-events/${eventId}/tickets`, { params })
  }

  getMyTickets(): Observable<EventTicket[]> {
    return this.http.get<EventTicket[]>('/api/certificates/my-tickets')
  }

  getTicketDetails(ticketId: string): Observable<EventTicket> {
    return this.http.get<EventTicket>(`/api/certificates/tickets/${ticketId}`)
  }

  uploadTicketReceipt(ticketId: string, file: File): Observable<EventTicket> {
    const formData = new FormData()
    formData.append('file', file)
    return this.http.post<EventTicket>(`/api/certificates/tickets/${ticketId}/receipt`, formData)
  }

  validateTicket(ticketId: string, data: ValidateTicket): Observable<EventTicket> {
    return this.http.patch<EventTicket>(`/api/certificates/tickets/${ticketId}/validate`, data)
  }

  cronExpireTickets(): Observable<{ canceledCount: number }> {
    return this.http.post<{ canceledCount: number }>('/api/certificates/tickets/cron-expire', {})
  }

  switchWorkshop(ticketId: string, workshopId: string): Observable<any> {
    return this.http.patch(`/api/certificates/tickets/${ticketId}/switch-workshop`, { workshopId })
  }

  // ==========================================
  // WORKSHOPS E VAGAS
  // ==========================================

  getEventWorkshops(eventId: string): Observable<EventWorkshop[]> {
    return this.http.get<EventWorkshop[]>(`/api/certificates/custom-events/${eventId}/workshops`)
  }

  createWorkshop(eventId: string, data: CreateEventWorkshop): Observable<EventWorkshop> {
    return this.http.post<EventWorkshop>(`/api/certificates/custom-events/${eventId}/workshops`, data)
  }

  updateWorkshop(workshopId: string, data: UpdateEventWorkshop): Observable<EventWorkshop> {
    return this.http.put<EventWorkshop>(`/api/certificates/workshops/${workshopId}`, data)
  }

  deleteWorkshop(workshopId: string): Observable<any> {
    return this.http.delete(`/api/certificates/workshops/${workshopId}`)
  }

  // ==========================================
  // SUBMISSÃO E AVALIAÇÃO DE ARTIGOS CIENTÍFICOS
  // ==========================================

  getEligibleCoauthors(eventId: string): Observable<{ id: string; name: string; email: string }[]> {
    return this.http.get<{ id: string; name: string; email: string }[]>(
      `/api/certificates/custom-events/${eventId}/eligible-coauthors`,
    )
  }

  submitArticle(eventId: string, data: CreateEventArticle, docFile: File, pdfFile?: File): Observable<EventArticle> {
    const formData = new FormData()
    formData.append('title', data.title)
    if (data.coauthors) formData.append('coauthors', data.coauthors)
    if (data.advisorName) formData.append('advisorName', data.advisorName)
    if (data.coAdvisorName) formData.append('coAdvisorName', data.coAdvisorName)
    formData.append('docFile', docFile)
    if (pdfFile) formData.append('pdfFile', pdfFile)

    return this.http.post<EventArticle>(`/api/certificates/custom-events/${eventId}/articles`, formData)
  }

  listEventArticles(eventId: string, status?: string): Observable<EventArticle[]> {
    let params = new HttpParams()
    if (status?.trim()) params = params.set('status', status.trim())
    return this.http.get<EventArticle[]>(`/api/certificates/custom-events/${eventId}/articles`, { params })
  }

  getMyArticles(): Observable<EventArticle[]> {
    return this.http.get<EventArticle[]>('/api/certificates/my-articles')
  }

  lockArticle(articleId: string, lock: boolean): Observable<{ success: boolean; locked: boolean }> {
    return this.http.patch<{ success: boolean; locked: boolean }>(`/api/certificates/articles/${articleId}/lock`, {
      lock,
    })
  }

  reviewArticle(
    articleId: string,
    data: ReviewEventArticle,
    plagioFile?: File,
    correcaoFile?: File,
  ): Observable<any> {
    const formData = new FormData()
    formData.append('status', data.status)
    if (data.score !== undefined) formData.append('score', String(data.score))
    if (data.feedbackNotes) formData.append('feedbackNotes', data.feedbackNotes)
    if (plagioFile) formData.append('plagioFile', plagioFile)
    if (correcaoFile) formData.append('correcaoFile', correcaoFile)

    return this.http.patch(`/api/certificates/articles/${articleId}/review`, formData)
  }

  getCommitteeMembers(): Observable<any[]> {
    return this.http.get<any[]>('/api/certificates/committee')
  }

  toggleArticleEvaluator(userId: string, isEvaluator: boolean): Observable<any> {
    return this.http.patch(`/api/certificates/users/${userId}/evaluator`, { isEvaluator })
  }

  // ==========================================
  // SALAS FÍSICAS E PORTARIA COM SCANNER
  // ==========================================

  getRooms(): Observable<EventRoom[]> {
    return this.http.get<EventRoom[]>('/api/certificates/rooms')
  }

  createRoom(data: CreateEventRoom): Observable<EventRoom> {
    return this.http.post<EventRoom>('/api/certificates/rooms', data)
  }

  deleteRoom(roomId: string): Observable<any> {
    return this.http.delete(`/api/certificates/rooms/${roomId}`)
  }

  scanAttendance(data: ScanAttendance): Observable<ScanAttendanceResult> {
    return this.http.post<ScanAttendanceResult>('/api/certificates/attendance/scan', data)
  }

  getEventAttendances(eventId: string): Observable<EventAttendanceItem[]> {
    return this.http.get<EventAttendanceItem[]>(`/api/certificates/custom-events/${eventId}/attendances`)
  }

  // ==========================================
  // FINANÇAS, DESPESAS E PATROCINADORES
  // ==========================================

  getFinancialSummary(eventId: string): Observable<FinancialSummary> {
    return this.http.get<FinancialSummary>(`/api/certificates/custom-events/${eventId}/finances`)
  }

  getFinancialGroups(eventId: string): Observable<EventFinancialGroup[]> {
    return this.http.get<EventFinancialGroup[]>(`/api/certificates/custom-events/${eventId}/expense-groups`)
  }

  createFinancialGroup(eventId: string, name: string): Observable<EventFinancialGroup> {
    return this.http.post<EventFinancialGroup>(`/api/certificates/custom-events/${eventId}/expense-groups`, { name })
  }

  addExpense(eventId: string, data: CreateEventExpense, file?: File): Observable<EventExpense> {
    const formData = new FormData()
    formData.append('description', data.description)
    formData.append('category', data.category)
    formData.append('amount', String(data.amount))
    formData.append('expenseDate', data.expenseDate)
    if (data.groupId) formData.append('groupId', data.groupId)
    if (file) formData.append('file', file)

    return this.http.post<EventExpense>(`/api/certificates/custom-events/${eventId}/expenses`, formData)
  }

  deleteExpense(expenseId: string): Observable<any> {
    return this.http.delete(`/api/certificates/expenses/${expenseId}`)
  }

  addSponsor(eventId: string, data: CreateEventSponsor): Observable<EventSponsor> {
    return this.http.post<EventSponsor>(`/api/certificates/custom-events/${eventId}/sponsors`, data)
  }

  addSponsorMovement(sponsorId: string, data: CreateSponsorMovement): Observable<any> {
    return this.http.post(`/api/certificates/sponsors/${sponsorId}/movements`, data)
  }

  // ==========================================
  // PESQUISA DE SATISFAÇÃO (FEEDBACK)
  // ==========================================

  submitFeedback(eventId: string, data: CreateEventFeedback): Observable<EventFeedback> {
    return this.http.post<EventFeedback>(`/api/certificates/custom-events/${eventId}/feedbacks`, data)
  }

  getEventFeedbacks(eventId: string): Observable<EventFeedback[]> {
    return this.http.get<EventFeedback[]>(`/api/certificates/custom-events/${eventId}/feedbacks`)
  }

  // ==========================================
  // RELATÓRIOS EXCEL
  // ==========================================

  exportEventReport(eventId: string, reportType: string): Observable<Blob> {
    return this.http.get(`/api/certificates/custom-events/${eventId}/export/${reportType}`, {
      responseType: 'blob',
    })
  }
}
