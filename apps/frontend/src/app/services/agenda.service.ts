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
  userId: string
  isPriority: boolean
}

export interface CreateAgendaTask {
  title: string
  description: string
  date: string
  type: AgendaTaskType
  userId?: string
  isPriority?: boolean
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
  userId: string
  isPriority: boolean
}

@Injectable({ providedIn: 'root' })
export class AgendaService {
  constructor(private readonly http: HttpClient) {}

  getTasks(sector?: string): Observable<AgendaTask[]> {
    const params: Record<string, string> = {}
    if (sector) {
      params['sector'] = sector;
    }
    return this.http.get<ApiTask[]>('/api/tasks', { params }).pipe(
      map((tasks: ApiTask[]) => tasks.map((task: ApiTask) => this.toAgendaTask(task))),
    )
  }

  createTask(input: CreateAgendaTask): Observable<AgendaTask> {
    return this.http.post<ApiTask>('/api/tasks', {
      ...input,
      type: this.toApiType(input.type),
    }).pipe(map((task) => this.toAgendaTask(task)))
  }

  updateTask(taskId: string, data: Partial<AgendaTask>): Observable<AgendaTask> {
    return this.http.patch<ApiTask>(`/api/tasks/${taskId}`, data).pipe(
      map((updatedTask) => this.toAgendaTask(updatedTask)),
    )
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
      isPriority: task.isPriority,
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
