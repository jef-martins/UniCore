import { Component } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { AgendaService, type AgendaTask, type AgendaTaskType } from '../services/agenda.service'

interface CalendarDay {
  key: string
  number: number
  date: Date
  isCurrentMonth: boolean
}

@Component({
  selector: 'app-agenda-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './agenda-page.component.html',
})
export class AgendaPageComponent {
  readonly weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  readonly taskTypes: readonly (AgendaTaskType | 'Todas')[] = ['Todas', 'Reunião', 'Prazo', 'Estudo']
  readonly tasks: readonly AgendaTask[]
  displayedMonth: Date
  startDate = ''
  endDate = ''
  taskQuery = ''
  taskType: AgendaTaskType | 'Todas' = 'Todas'

  constructor(agendaService: AgendaService) {
    const today = new Date()
    this.displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    this.tasks = agendaService.getTasks()
  }

  get monthLabel(): string {
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.displayedMonth)
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  get calendarDays(): readonly CalendarDay[] {
    const firstDay = new Date(this.displayedMonth.getFullYear(), this.displayedMonth.getMonth(), 1)
    const lastDay = new Date(this.displayedMonth.getFullYear(), this.displayedMonth.getMonth() + 1, 0)
    const gridStart = new Date(this.displayedMonth.getFullYear(), this.displayedMonth.getMonth(), 1 - firstDay.getDay())
    const totalDays = Math.ceil((firstDay.getDay() + lastDay.getDate()) / 7) * 7

    return Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)
      return {
        key: this.toDateKey(date),
        number: date.getDate(),
        date,
        isCurrentMonth: date.getMonth() === this.displayedMonth.getMonth(),
      }
    })
  }

  get filteredTasks(): readonly AgendaTask[] {
    const query = this.taskQuery.trim().toLocaleLowerCase()
    return this.tasks.filter((task) => {
      const matchesStart = !this.startDate || task.date >= this.startDate
      const matchesEnd = !this.endDate || task.date <= this.endDate
      const matchesQuery = !query || `${task.title} ${task.description}`.toLocaleLowerCase().includes(query)
      const matchesType = this.taskType === 'Todas' || task.type === this.taskType
      return matchesStart && matchesEnd && matchesQuery && matchesType
    })
  }

  tasksForDay(dayKey: string): readonly AgendaTask[] {
    return this.filteredTasks.filter((task) => task.date === dayKey)
  }

  changeMonth(offset: number): void {
    this.displayedMonth = new Date(this.displayedMonth.getFullYear(), this.displayedMonth.getMonth() + offset, 1)
  }

  goToToday(): void {
    const today = new Date()
    this.displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  }

  clearFilters(): void {
    this.startDate = ''
    this.endDate = ''
    this.taskQuery = ''
    this.taskType = 'Todas'
  }

  isToday(day: CalendarDay): boolean {
    return day.key === this.toDateKey(new Date())
  }

  accessibleDayLabel(day: CalendarDay): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(day.date)
  }

  private toDateKey(date: Date): string {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
  }
}
