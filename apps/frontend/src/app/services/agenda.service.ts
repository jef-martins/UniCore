import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { map, type Observable } from 'rxjs'

export type AgendaTaskType = 'Reunião' | 'Prazo' | 'Estudo'
type ApiTaskType = 'REUNIAO' | 'PRAZO' | 'ESTUDO'
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
}

export interface CreateAgendaTask {
  title: string
  description: string
  date: string
  type: AgendaTaskType
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
}

@Injectable({ providedIn: 'root' })
export class AgendaService {
  constructor(private readonly http: HttpClient) {}

  getTasks(): Observable<AgendaTask[]> {
    return this.http.get<ApiTask[]>('/api/tasks').pipe(
      map((tasks) => tasks.map((task) => this.toAgendaTask(task))),
    )
  }

  createTask(input: CreateAgendaTask): Observable<AgendaTask> {
    return this.http.post<ApiTask>('/api/tasks', {
      ...input,
      type: this.toApiType(input.type),
    }).pipe(map((task) => this.toAgendaTask(task)))
  }

  updateTaskStatus(task: AgendaTask, completed: boolean): Observable<AgendaTask> {
    return this.http.patch<ApiTask>(`/api/tasks/${task.id}/status`, { completed }).pipe(
      map((updatedTask) => this.toAgendaTask(updatedTask)),
    )
  }

  private toAgendaTask(task: ApiTask): AgendaTask {
    return {
      id: task.id,
      title: task.title,
      description: task.description ?? '',
      date: task.date.slice(0, 10),
      type: this.toAgendaType(task.type),
      status: task.completed ? 'Concluída' : 'Pendente',
      completed: task.completed,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    }
  }

  private toApiType(type: AgendaTaskType): ApiTaskType {
    const typeMap: Record<AgendaTaskType, ApiTaskType> = { 'Reunião': 'REUNIAO', 'Prazo': 'PRAZO', 'Estudo': 'ESTUDO' }
    return typeMap[type]
  }

  private toAgendaType(type: ApiTaskType): AgendaTaskType {
    const typeMap: Record<ApiTaskType, AgendaTaskType> = { REUNIAO: 'Reunião', PRAZO: 'Prazo', ESTUDO: 'Estudo' }
    return typeMap[type]
  }
}
