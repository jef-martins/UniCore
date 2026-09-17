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
  templateStyle?: any
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

// Custom Events (UniCore)
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
  templateStyle?: any
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
  templateStyle?: any
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
  templateStyle?: any
  totalParticipants: number
  paidParticipants: number
  eligibleParticipants: number
  createdAt: string
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
  templateStyle?: any
  isRegistered?: boolean
  participantId?: string | null
  isPaid?: boolean
  hasAttendance?: boolean
  isEligible?: boolean
  issuedAt?: string | null
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
  templateStyle?: any
  createdAt: string
  participants: CustomParticipantItem[]
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

  uploadEventAsset(eventId: string, type: 'logo' | 'template', file: File): Observable<{ assetUrl: string; fileName: string }> {
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
}
