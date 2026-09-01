import { Injectable } from '@angular/core'

export type AgendaTaskType = 'Reunião' | 'Prazo' | 'Estudo'
export type AgendaTaskStatus = 'Pendente' | 'Concluída'

export interface AgendaTask {
  id: string
  title: string
  description: string
  date: string
  type: AgendaTaskType
  status: AgendaTaskStatus
}

@Injectable({ providedIn: 'root' })
export class AgendaService {
  getTasks(): readonly AgendaTask[] {
    const today = new Date()
    const date = (offset: number): string => this.toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset))

    return [
      { id: 'task-1', title: 'Revisar documentos', description: 'Conferir os arquivos recebidos.', date: date(0), type: 'Prazo', status: 'Pendente' },
      { id: 'task-2', title: 'Reunião de alinhamento', description: 'Alinhar as próximas etapas do portal.', date: date(2), type: 'Reunião', status: 'Pendente' },
      { id: 'task-3', title: 'Estudar conteúdo', description: 'Organizar o material da avaliação.', date: date(5), type: 'Estudo', status: 'Concluída' },
      { id: 'task-4', title: 'Enviar relatório', description: 'Compartilhar o relatório mensal.', date: date(10), type: 'Prazo', status: 'Pendente' },
      { id: 'task-5', title: 'Planejamento mensal', description: 'Definir as prioridades do próximo ciclo.', date: date(18), type: 'Reunião', status: 'Pendente' },
    ]
  }

  private toDateKey(date: Date): string {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
  }
}
