import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { map, type Observable } from 'rxjs'

export type AgendaTaskType = 'Vestibular' | 'Administração' | 'Tesouraria' | 'Coordenação' | 'Registro Acadêmico' | 'Alunos' | 'Professores'
type ApiTaskType = 'VESTIBULAR' | 'ADMINISTRACAO' | 'TESOURARIA' | 'COORDENACAO' | 'REGISTRO_ACADEMICO' | 'ALUNOS' | 'PROFESSORES'
export type AgendaTaskStatus = 'Pendente' | 'Concluída'

export interface AgendaTask {
  id: string
  title: string
  description: string
  date: string
  type: AgendaTaskType
  status: AgendaTaskStatus
  completed: boolean
  createdAt: string
  completedAt: string | null
  userId: string | null
  sector?: string | null
  isPriority: boolean
  attachmentName?: string | null
  attachmentSize?: number | null
  completionNotes?: string | null
  completionAttachmentName?: string | null
  completionAttachmentSize?: number | null
  user?: { id: string; username: string; role: string } | null
  createdBy?: { id: string; username: string; role: string } | null
}

export interface CreateAgendaTask {
  title: string
  description: string
  date: string
  type: AgendaTaskType
  userId?: string | null
  sector?: string | null
  isPriority?: boolean
  file?: File | null
}

interface ApiTask {
  id: string
  title: string
  description: string | null
  date: string
  type: ApiTaskType
  completed: boolean
  createdAt: string
  completedAt: string | null
  userId: string | null
  sector?: string | null
  isPriority: boolean
  attachmentName?: string | null
  attachmentSize?: number | null
  completionNotes?: string | null
  completionAttachmentName?: string | null
  completionAttachmentSize?: number | null
  user?: { id: string; username: string; role: string } | null
  createdBy?: { id: string; username: string; role: string } | null
}

@Injectable({ providedIn: 'root' })
export class AgendaService {
  constructor(private readonly http: HttpClient) {}

  getTasks(sector?: string): Observable<AgendaTask[]> {
    const params: Record<string, string> = {}
    if (sector) {
      params['sector'] = sector
    }
    return this.http.get<ApiTask[]>('/api/tasks', { params }).pipe(
      map((tasks: ApiTask[]) => tasks.map((task: ApiTask) => this.toAgendaTask(task))),
    )
  }

  createTask(input: CreateAgendaTask): Observable<AgendaTask> {
    const formData = new FormData()
    formData.append('title', input.title)
    if (input.description) formData.append('description', input.description)
    formData.append('date', input.date)
    formData.append('type', this.toApiType(input.type))
    if (input.userId && input.userId !== 'none') {
      formData.append('userId', input.userId)
    }
    if (input.sector) {
      formData.append('sector', input.sector)
    }
    if (input.isPriority !== undefined) {
      formData.append('isPriority', String(input.isPriority))
    }
    if (input.file) {
      formData.append('attachment', input.file)
    }

    return this.http.post<ApiTask>('/api/tasks', formData).pipe(map((task) => this.toAgendaTask(task)))
  }

  completeTask(taskId: string, notes?: string, file?: File | null): Observable<AgendaTask> {
    const formData = new FormData()
    if (notes) formData.append('completionNotes', notes)
    if (file) formData.append('completionAttachment', file)

    return this.http.patch<ApiTask>(`/api/tasks/${taskId}/complete`, formData).pipe(
      map((task) => this.toAgendaTask(task)),
    )
  }

  updateTask(taskId: string, data: Partial<AgendaTask>): Observable<AgendaTask> {
    return this.http.patch<ApiTask>(`/api/tasks/${taskId}`, data).pipe(
      map((updatedTask) => this.toAgendaTask(updatedTask)),
    )
  }

  downloadAttachment(taskId: string, type: 'creation' | 'completion', fallbackFileName: string): void {
    const url = `/api/tasks/${taskId}/attachment/${type}`
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const blobUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = fallbackFileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(blobUrl)
      },
      error: (err) => {
        console.error('Erro ao baixar anexo:', err)
        alert('Não foi possível baixar o anexo.')
      },
    })
  }

  private toAgendaTask(task: ApiTask): AgendaTask {
    return {
      id: task.id,
      title: task.title,
      description: task.description ?? '',
      date: typeof task.date === 'string' ? task.date.slice(0, 10) : task.date,
      type: this.toAgendaType(task.type),
      status: task.completed ? 'Concluída' : 'Pendente',
      completed: task.completed,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      userId: task.userId,
      sector: task.sector,
      isPriority: task.isPriority,
      attachmentName: task.attachmentName,
      attachmentSize: task.attachmentSize,
      completionNotes: task.completionNotes,
      completionAttachmentName: task.completionAttachmentName,
      completionAttachmentSize: task.completionAttachmentSize,
      user: task.user,
      createdBy: task.createdBy,
    }
  }

  private toApiType(type: AgendaTaskType): ApiTaskType {
    const typeMap: Record<AgendaTaskType, ApiTaskType> = {
      'Vestibular': 'VESTIBULAR',
      'Administração': 'ADMINISTRACAO',
      'Tesouraria': 'TESOURARIA',
      'Coordenação': 'COORDENACAO',
      'Registro Acadêmico': 'REGISTRO_ACADEMICO',
      'Alunos': 'ALUNOS',
      'Professores': 'PROFESSORES',
    }
    return typeMap[type]
  }

  private toAgendaType(type: ApiTaskType): AgendaTaskType {
    const typeMap: Record<ApiTaskType, AgendaTaskType> = {
      VESTIBULAR: 'Vestibular',
      ADMINISTRACAO: 'Administração',
      TESOURARIA: 'Tesouraria',
      COORDENACAO: 'Coordenação',
      REGISTRO_ACADEMICO: 'Registro Acadêmico',
      ALUNOS: 'Alunos',
      PROFESSORES: 'Professores',
    }
    return typeMap[type]
  }
}
