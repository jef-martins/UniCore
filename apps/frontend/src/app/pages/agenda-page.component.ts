import { Component, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
  AgendaService,
  type AgendaTask,
  type AgendaTaskType,
} from '../services/agenda.service'

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
export class AgendaPageComponent implements OnInit {
  readonly weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  readonly taskTypes: readonly (AgendaTaskType | 'Todas')[] = ['Todas', 'Reunião', 'Prazo', 'Estudo']
  tasks: AgendaTask[] = []
  displayedMonth: Date
  startDate = ''
  endDate = ''
  taskQuery = ''
  taskType: AgendaTaskType | 'Todas' = 'Todas'
  newTaskTitle = ''
  newTaskDescription = ''
  newTaskDate = ''
  newTaskType: AgendaTaskType = 'Prazo'
  isLoading = false
  isSaving = false
  savingTaskId: string | null = null
  errorMessage = ''

  constructor(private readonly agendaService: AgendaService) {
    const today = new Date()
    this.displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    this.newTaskDate = this.toDateKey(today)
  }

  ngOnInit(): void {
    this.loadTasks()
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

  createTask(): void {
    if (!this.newTaskTitle.trim() || !this.newTaskDate) {
      this.errorMessage = 'Informe o título e a data da tarefa.'
      return
    }

    this.isSaving = true
    this.errorMessage = ''
    this.agendaService.createTask({
      title: this.newTaskTitle,
      description: this.newTaskDescription,
      date: this.newTaskDate,
      type: this.newTaskType,
    }).subscribe({
      next: (task) => {
        this.tasks = [...this.tasks, task]
        this.newTaskTitle = ''
        this.newTaskDescription = ''
      },
      error: () => {
        this.errorMessage = 'Não foi possível salvar a tarefa. Tente novamente.'
        this.isSaving = false
      },
      complete: () => { this.isSaving = false },
    })
  }

  toggleTask(task: AgendaTask): void {
    this.savingTaskId = task.id
    this.errorMessage = ''
    this.agendaService.updateTaskStatus(task, !task.completed).subscribe({
      next: (updatedTask) => {
        this.tasks = this.tasks.map((currentTask) => currentTask.id === updatedTask.id ? updatedTask : currentTask)
      },
      error: () => {
        this.errorMessage = 'Não foi possível atualizar o status da tarefa.'
        this.savingTaskId = null
      },
      complete: () => { this.savingTaskId = null },
    })
  }

  formatDateTime(value: string | null): string {
    if (!value) return '—'
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  }

  isToday(day: CalendarDay): boolean {
    return day.key === this.toDateKey(new Date())
  }

  accessibleDayLabel(day: CalendarDay): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(day.date)
  }

  private loadTasks(): void {
    this.isLoading = true
    this.agendaService.getTasks().subscribe({
      next: (tasks) => { this.tasks = tasks },
      error: () => {
        this.errorMessage = 'Não foi possível carregar as tarefas.'
        this.isLoading = false
      },
      complete: () => { this.isLoading = false },
    })
  }

  private toDateKey(date: Date): string {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
  }
}
