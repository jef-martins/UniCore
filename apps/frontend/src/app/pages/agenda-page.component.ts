import { Component, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import {
  AgendaService,
  type AgendaTask,
  type AgendaTaskType,
} from '../services/agenda.service'
import { AuthService, type AuthUser } from '../services/auth.service'

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
  readonly taskTypes: readonly (AgendaTaskType | 'Todas')[] = ['Todas', 'Vestibular', 'Administração', 'Tesouraria', 'Coordenação', 'Registro Acadêmico', 'Alunos', 'Professores']
  tasks: AgendaTask[] = []
  displayedMonth: Date
  startDate = ''
  endDate = ''
  taskQuery = ''
  taskType: AgendaTaskType | 'Todas' = 'Todas'
  newTaskTitle = ''
  newTaskDescription = ''
  newTaskDate = ''
  newTaskType: AgendaTaskType = 'Vestibular'
  isLoading = false
  isSaving = false
  savingTaskId: string | null = null
  editingTaskId: string | null = null
  editingTaskTitle = ''
  editingTaskDescription = ''
  errorMessage = ''
  selectedDay: CalendarDay | null = null;
  users: AuthUser[] = []
  newTaskUserId = ''
  newTaskIsPriority = false
  filterUserId = ''
  currentSector: string | undefined = undefined;

  get canFilterUsers(): boolean {
    const role = this.authService.currentUser?.role;
    if (role === 'admin' || role === 'master') return true;
    if (this.currentSector === 'aluno' && role !== 'aluno') return true;
    if (this.currentSector === 'professor' && role === 'coordenacao') return true;
    return false;
  }

  get sectorUsers(): AuthUser[] {
    if (!this.currentSector) return [];
    return this.users.filter((u) => u.role === this.currentSector);
  }

  constructor(
    private readonly agendaService: AgendaService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    const today = new Date()
    this.displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    this.newTaskDate = this.toDateKey(today)
    
    // Default to the Day View of today
    this.selectedDay = {
      key: this.toDateKey(today),
      number: today.getDate(),
      date: today,
      isCurrentMonth: true
    }
  }

  ngOnInit(): void {
    this.loadTasks()
    this.authService.getUsers().subscribe({
      next: (users) => { this.users = users }
    })
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
      const matchesUser = !this.filterUserId || task.userId === this.filterUserId
      return matchesStart && matchesEnd && matchesQuery && matchesType && matchesUser
    })
  }

  tasksForDay(dayKey: string): readonly AgendaTask[] {
    return this.filteredTasks.filter((task) => task.date === dayKey)
  }

  changeMonth(offset: number): void {
    this.displayedMonth = new Date(this.displayedMonth.getFullYear(), this.displayedMonth.getMonth() + offset, 1)
    this.selectedDay = null;
  }

  goToToday(): void {
    const today = new Date()
    this.displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    this.selectedDay = null;
  }

  clearFilters(): void {
    this.startDate = ''
    this.endDate = ''
    this.taskQuery = ''
    this.taskType = 'Todas'
  }

  viewDay(day: CalendarDay): void {
    this.selectedDay = day;
  }

  closeDayView(): void {
    this.selectedDay = null;
  }

  openNewTaskForDay(dayKey: string): void {
    this.newTaskDate = dayKey;
    document.getElementById('agenda-new-task-title-input')?.focus();
    // Also clear the selected day to show the form if the form is in the main view
    this.selectedDay = null;
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
      isPriority: this.newTaskIsPriority,
      ...(this.newTaskUserId ? { userId: this.newTaskUserId } : {}),
    }).subscribe({
      next: (task) => {
        const isForMe = !this.newTaskUserId || this.newTaskUserId === this.authService.currentUser?.id;
        if (isForMe) {
          this.tasks = [...this.tasks, task];
        }
        this.newTaskTitle = '';
        this.newTaskDescription = '';
        this.newTaskUserId = '';
        this.newTaskIsPriority = false;
      },
      error: () => {
        this.errorMessage = 'Não foi possível salvar a tarefa. Tente novamente.'
        this.isSaving = false
      },
      complete: () => { this.isSaving = false },
    })
  }

  toggleTask(task: AgendaTask): void {
    this.updateTask(task.id, { completed: !task.completed });
  }

  toggleTaskPriority(task: AgendaTask): void {
    this.updateTask(task.id, { isPriority: !task.isPriority });
  }

  startEditTask(task: AgendaTask): void {
    this.editingTaskId = task.id;
    this.editingTaskTitle = task.title;
    this.editingTaskDescription = task.description || '';
  }

  cancelEditTask(): void {
    this.editingTaskId = null;
    this.editingTaskTitle = '';
    this.editingTaskDescription = '';
  }

  saveEditTask(task: AgendaTask): void {
    if (!this.editingTaskTitle.trim()) {
      this.errorMessage = 'O título não pode estar vazio.';
      return;
    }
    this.updateTask(task.id, { 
      title: this.editingTaskTitle, 
      description: this.editingTaskDescription 
    });
    this.editingTaskId = null;
  }

  private updateTask(id: string, payload: Partial<AgendaTask>): void {
    this.savingTaskId = id;
    this.errorMessage = '';
    this.agendaService.updateTask(id, payload).subscribe({
      next: (updatedTask) => {
        this.tasks = this.tasks.map((currentTask) => currentTask.id === updatedTask.id ? updatedTask : currentTask);
      },
      error: () => {
        this.errorMessage = 'Não foi possível atualizar a tarefa.';
        this.savingTaskId = null;
      },
      complete: () => { this.savingTaskId = null; },
    });
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
    
    const urlTree = this.router.parseUrl(this.router.url);
    const pathParts = urlTree.root.children['primary']?.segments.map(s => s.path) || [];
    
    if (pathParts.length > 1 && pathParts[pathParts.length - 1] === 'agenda') {
      const maybeSector = pathParts[pathParts.length - 2];
      if (maybeSector === 'registro-academico') {
        this.currentSector = 'registro_academico';
      } else if (maybeSector === 'administracao') {
        this.currentSector = 'admin'; // Backend uses ADMIN enum
      } else if (maybeSector === 'desenvolvedor') {
        this.currentSector = 'master'; // Backend uses MASTER enum
      } else {
        this.currentSector = maybeSector;
      }
    } else {
      // If no sector in URL (e.g. root /agenda), default to the user's own sector so they can still see the dropdown
      const role = this.authService.currentUser?.role;
      this.currentSector = role;
    }
    
    // Default to showing only their own tasks if they are in their own sector
    const role = this.authService.currentUser?.role;
    const isOwnSector = this.currentSector === role;
    this.filterUserId = isOwnSector ? (this.authService.currentUser?.id || '') : '';

    this.agendaService.getTasks(this.currentSector).subscribe({
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
