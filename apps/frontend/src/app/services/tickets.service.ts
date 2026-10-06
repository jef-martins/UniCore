import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable, Subject, tap } from 'rxjs'

export type TicketStatus = 'ABERTO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'FINALIZADO' | 'CANCELADO'
export type TicketPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'

export interface UnattendedTicketItem {
  id: string
  code: number
  title: string
  priority: TicketPriority
  sector: string
  sectorLabel: string
  createdAt: string
  user: TicketUser
}

export interface UnattendedTicketsSummary {
  count: number
  tickets: UnattendedTicketItem[]
}

export interface TicketAttachment {
  id: string
  ticketId: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  createdAt: string
}

export interface TicketUser {
  id: string
  username: string
  role: string
  email?: string
}

export interface TicketMessage {
  id: string
  ticketId: string
  userId: string
  user: TicketUser
  message: string
  statusChange?: TicketStatus | null
  attachmentName?: string | null
  attachmentPath?: string | null
  attachmentSize?: number | null
  attachmentMimeType?: string | null
  createdAt: string
}

export interface TicketListItem {
  id: string
  code: number
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  sector: string
  sectorLabel: string
  userId: string
  user: TicketUser
  assignedToId?: string | null
  assignedTo?: TicketUser | null
  resolutionNotes?: string | null
  closedAt?: string | null
  createdAt: string
  updatedAt: string
  attachments?: { id: string; fileName: string; fileSize: number; mimeType: string; createdAt: string }[]
  _count?: { messages: number; attachments: number }
}

export interface TicketDetail extends TicketListItem {
  attachments: TicketAttachment[]
  messages: TicketMessage[]
}

export interface TicketSectorStat {
  sector: string
  label: string
  total: number
  abertos: number
  emAndamento: number
  concluidos: number
  finalizados: number
  taxaResolucao: number
}

export interface TicketPriorityStats {
  BAIXA: { total: number; resolvidos: number; pendentes: number }
  MEDIA: { total: number; resolvidos: number; pendentes: number }
  ALTA: { total: number; resolvidos: number; pendentes: number }
  URGENTE: { total: number; resolvidos: number; pendentes: number }
}

export interface TicketDashboardOverview {
  total: number
  abertos: number
  emAndamento: number
  concluidos: number
  finalizados: number
  cancelados: number
  resolvidos: number
  taxaResolucao: number
  tempoMedioHoras: number
}

export interface TicketDashboardData {
  overview: TicketDashboardOverview
  porSetor: TicketSectorStat[]
  porPrioridade: TicketPriorityStats
  recentes: TicketListItem[]
}

@Injectable({ providedIn: 'root' })
export class TicketsService {
  constructor(private readonly http: HttpClient) {}

  getTickets(filters?: { sector?: string; status?: string; priority?: string; search?: string; userId?: string; code?: string }): Observable<TicketListItem[]> {
    let params = new HttpParams()
    if (filters?.sector) params = params.set('sector', filters.sector)
    if (filters?.status) params = params.set('status', filters.status)
    if (filters?.priority) params = params.set('priority', filters.priority)
    if (filters?.search) params = params.set('search', filters.search)
    if (filters?.userId) params = params.set('userId', filters.userId)
    if (filters?.code) params = params.set('code', filters.code)

    return this.http.get<TicketListItem[]>('/api/tickets', { params })
  }

  getUsers(): Observable<TicketUser[]> {
    return this.http.get<TicketUser[]>('/api/tickets/users')
  }

  getTicket(id: string): Observable<TicketDetail> {
    return this.http.get<TicketDetail>(`/api/tickets/${id}`)
  }

  private readonly ticketUpdatedSubject = new Subject<void>()
  readonly ticketUpdated$ = this.ticketUpdatedSubject.asObservable()

  notifyTicketUpdated(): void {
    this.ticketUpdatedSubject.next()
  }

  getUnattendedSummary(): Observable<UnattendedTicketsSummary> {
    return this.http.get<UnattendedTicketsSummary>('/api/tickets/unattended')
  }

  createTicket(formData: FormData): Observable<TicketDetail> {
    return this.http.post<TicketDetail>('/api/tickets', formData).pipe(
      tap(() => this.notifyTicketUpdated()),
    )
  }

  addMessage(ticketId: string, formData: FormData): Observable<{ message: TicketMessage; ticket: TicketDetail }> {
    return this.http.post<{ message: TicketMessage; ticket: TicketDetail }>(`/api/tickets/${ticketId}/messages`, formData).pipe(
      tap(() => this.notifyTicketUpdated()),
    )
  }

  updateStatus(
    ticketId: string,
    body: { status: TicketStatus; resolutionNotes?: string; assignedToId?: string; priority?: TicketPriority },
  ): Observable<TicketDetail> {
    return this.http.patch<TicketDetail>(`/api/tickets/${ticketId}/status`, body).pipe(
      tap(() => this.notifyTicketUpdated()),
    )
  }

  getDashboardMetrics(filters?: { sector?: string; days?: number; userId?: string }): Observable<TicketDashboardData> {
    let params = new HttpParams()
    if (filters?.sector) params = params.set('sector', filters.sector)
    if (filters?.days) params = params.set('days', String(filters.days))
    if (filters?.userId) params = params.set('userId', filters.userId)

    return this.http.get<TicketDashboardData>('/api/tickets/dashboard', { params })
  }

  downloadAttachment(ticketId: string, attachmentId: string, fileName: string): void {
    const url = `/api/tickets/${ticketId}/attachments/${attachmentId}`
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const blobUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(blobUrl)
      },
      error: (err) => {
        console.error('Erro ao baixar anexo do chamado:', err)
        alert('Não foi possível baixar o anexo.')
      },
    })
  }

  downloadMessageAttachment(messageId: string, fileName: string): void {
    const url = `/api/tickets/messages/${messageId}/attachment`
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const blobUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(blobUrl)
      },
      error: (err) => {
        console.error('Erro ao baixar anexo da mensagem:', err)
        alert('Não foi possível baixar o anexo da mensagem.')
      },
    })
  }
}
