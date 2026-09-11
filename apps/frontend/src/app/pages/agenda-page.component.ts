import { CommonModule } from '@angular/common'
import { Component, OnInit, HostListener } from '@angular/core'
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
  imports: [CommonModule, FormsModule],
  templateUrl: './agenda-page.component.html',
  styles: [`
    .attachment-input-wrapper {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }
    .attachment-upload-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.85rem;
      border: 1px dashed var(--color-border, #58675C);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.03);
      color: var(--color-text-primary, #F5F7F4);
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.15s ease;
    }
    .attachment-upload-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--color-action-green, #49D17D);
      color: #A3F5C3;
    }
    .selected-file-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.65rem;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 6px;
      font-size: 0.8rem;
      color: #93C5FD;
    }
    .selected-file-badge.evidence-badge {
      background: rgba(73, 209, 125, 0.15);
      border-color: rgba(73, 209, 125, 0.4);
      color: #A3F5C3;
    }
    .btn-remove-file {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0 0.2rem;
      opacity: 0.7;
    }
    .btn-remove-file:hover { opacity: 1; }
    .field-hint {
      display: block;
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: var(--color-text-secondary, #B9C3BC);
    }
    .agenda-task-header-row {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      width: 100%;
    }
    .agenda-task-toggle {
      display: flex;
      align-items: flex-start;
      gap: 0.4rem;
      cursor: pointer;
      width: 100%;
    }
    .task-card-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-text-primary, #F5F7F4);
      word-break: break-word;
      line-height: 1.25;
    }
    .task-badges-wrap {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
      margin-top: 0.15rem;
    }
    .task-urgent-badge {
      color: #ffb86c;
      font-size: 0.7rem;
      border: 1px solid #ffb86c;
      padding: 0.05rem 0.3rem;
      border-radius: 4px;
      line-height: 1.2;
    }
    .star-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #ffb86c;
      font-size: 1.1rem;
      padding: 0;
      line-height: 1;
    }
    .sector-shared-tag {
      display: inline-flex;
      align-items: center;
      padding: 0.1rem 0.45rem;
      border-radius: 4px;
      background: rgba(168, 85, 247, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.4);
      color: #D8B4FE;
      font-size: 0.72rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .attachment-download-btn, .evidence-download-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--color-border, #58675C);
      color: var(--color-text-primary, #F5F7F4);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      margin-top: 0.25rem;
      margin-right: 0.4rem;
      transition: all 0.15s ease;
    }
    .attachment-download-btn:hover {
      background: rgba(59, 130, 246, 0.15);
      border-color: #60A5FA;
      color: #93C5FD;
    }
    .evidence-download-btn {
      background: rgba(73, 209, 125, 0.1);
      border-color: rgba(73, 209, 125, 0.3);
      color: #A3F5C3;
    }
    .evidence-download-btn:hover {
      background: rgba(73, 209, 125, 0.2);
      border-color: #49D17D;
    }
    .completion-notes-box {
      margin-top: 0.3rem;
      padding: 0.3rem 0.5rem;
      background: rgba(255, 255, 255, 0.03);
      border-left: 2px solid var(--color-action-green, #49D17D);
      border-radius: 0 4px 4px 0;
      font-size: 0.75rem;
      color: var(--color-text-secondary, #B9C3BC);
      font-style: italic;
    }
    /* Modal Backdrop and Card */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
      animation: modalFadeIn 0.2s ease-out;
    }
    .modal-card {
      background: var(--color-surface, #181D1A);
      border: 1px solid var(--color-border, #58675C);
      border-radius: 12px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-border, #58675C);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .modal-header h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--color-text-primary, #F5F7F4);
    }
    .modal-close-btn {
      background: none;
      border: none;
      color: var(--color-text-secondary, #B9C3BC);
      font-size: 1.2rem;
      cursor: pointer;
      line-height: 1;
      padding: 0.2rem;
    }
    .modal-close-btn:hover { color: #fff; }
    .modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
    }
    .task-summary-preview {
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
      border: 1px solid rgba(88, 103, 92, 0.3);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .task-summary-preview strong {
      color: var(--color-text-primary, #F5F7F4);
      font-size: 0.95rem;
    }
    .task-summary-preview span {
      font-size: 0.8rem;
      color: var(--color-text-secondary, #B9C3BC);
    }
    .modal-actions {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--color-border, #58675C);
      background: rgba(0, 0, 0, 0.15);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
    .new-task-modal-card {
      max-width: 620px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
    }
    .new-task-modal-card form {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .new-task-modal-card .modal-body {
      overflow-y: auto;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
      padding: 1.5rem;
    }
    .new-task-modal-card .field {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .modal-header-titles {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .modal-eyebrow {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-action-green, #49D17D);
    }
    .new-task-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      white-space: nowrap;
      padding: 0.45rem 1rem;
      box-shadow: 0 2px 8px rgba(73, 209, 125, 0.2);
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class AgendaPageComponent implements OnInit {
  readonly weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  readonly taskTypes: readonly (AgendaTaskType | 'Todas')[] = [
    'Todas',
    'Vestibular',
    'Administração',
    'Tesouraria',
    'Coordenação',
    'Registro Acadêmico',
    'Alunos',
    'Professores',
  ]
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
  selectedDay: CalendarDay | null = null
  users: AuthUser[] = []
  newTaskUserId = 'none'
  newTaskIsPriority = false
  selectedCreationFile: File | null = null
  filterUserId = ''
  currentSector: string | undefined = undefined
  isNewTaskModalOpen = false

  // Conclusão com Evidência
  completingTask: AgendaTask | null = null
  completionNotes = ''
  selectedCompletionFile: File | null = null
  isCompleting = false

  get canFilterUsers(): boolean {
    const role = this.authService.currentUser?.role
    if (role === 'admin' || role === 'master') return true
    if (this.currentSector === 'aluno' && role !== 'aluno') return true
    if (this.currentSector === 'professor' && role === 'coordenacao') return true
    return true
  }

  get sectorUsers(): AuthUser[] {
    if (!this.currentSector) return []
    return this.users.filter((u) => u.role === this.currentSector)
  }

  constructor(
    private readonly agendaService: AgendaService,
    public readonly authService: AuthService,
    private readonly router: Router,
  ) {
    const today = new Date()
    this.displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    this.newTaskDate = this.toDateKey(today)

    // Default to the Day View of today
    this.selectedDay = {
      key: this.toDateKey(today),
      number: today.getDate(),
      date: today,
      isCurrentMonth: true,
    }
  }

  ngOnInit(): void {
    this.loadTasks()
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.users = users
      },
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
      const matchesQuery =
        !query ||
        `${task.title} ${task.description} ${task.attachmentName || ''} ${task.completionNotes || ''}`
          .toLocaleLowerCase()
          .includes(query)
      const matchesType = this.taskType === 'Todas' || task.type === this.taskType
      const matchesUser =
        !this.filterUserId
          ? true
          : this.filterUserId === 'sector_shared'
          ? !task.userId
          : task.userId === this.filterUserId
      return matchesStart && matchesEnd && matchesQuery && matchesType && matchesUser
    })
  }

  tasksForDay(dayKey: string): readonly AgendaTask[] {
    return this.filteredTasks.filter((task) => task.date === dayKey)
  }

  changeMonth(offset: number): void {
    this.displayedMonth = new Date(this.displayedMonth.getFullYear(), this.displayedMonth.getMonth() + offset, 1)
    this.selectedDay = null
  }

  goToToday(): void {
    const today = new Date()
    this.displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    this.selectedDay = null
  }

  clearFilters(): void {
    this.startDate = ''
    this.endDate = ''
    this.taskQuery = ''
    this.taskType = 'Todas'
    this.filterUserId = ''
  }

  viewDay(day: CalendarDay): void {
    this.selectedDay = day
  }

  closeDayView(): void {
    this.selectedDay = null
  }

  openNewTaskModal(defaultDate?: string): void {
    if (defaultDate) {
      this.newTaskDate = defaultDate
    } else if (!this.newTaskDate) {
      this.newTaskDate = this.toDateKey(new Date())
    }
    this.errorMessage = ''
    this.isNewTaskModalOpen = true
  }

  closeNewTaskModal(): void {
    this.isNewTaskModalOpen = false
    this.errorMessage = ''
  }

  openNewTaskForDay(dayKey: string): void {
    this.openNewTaskModal(dayKey)
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isNewTaskModalOpen) {
      this.closeNewTaskModal()
    } else if (this.completingTask) {
      this.closeCompletionModal()
    }
  }

  onCreationFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.selectedCreationFile = input.files[0]
    }
  }

  removeCreationFile(): void {
    this.selectedCreationFile = null
    const input = document.getElementById('agenda-new-task-file') as HTMLInputElement
    if (input) input.value = ''
  }

  createTask(): void {
    if (!this.newTaskTitle.trim() || !this.newTaskDate) {
      this.errorMessage = 'Informe o título e a data da tarefa.'
      return
    }

    this.isSaving = true
    this.errorMessage = ''

    const isSharedSector = !this.newTaskUserId || this.newTaskUserId === 'none'
    const targetUserId = isSharedSector ? null : this.newTaskUserId

    this.agendaService
      .createTask({
        title: this.newTaskTitle,
        description: this.newTaskDescription,
        date: this.newTaskDate,
        type: this.newTaskType,
        isPriority: this.newTaskIsPriority,
        userId: targetUserId,
        sector: this.currentSector || this.authService.currentUser?.role,
        file: this.selectedCreationFile,
      })
      .subscribe({
        next: (task) => {
          const myId = this.authService.currentUser?.id
          const isForMeOrMySector =
            !task.userId ||
            task.userId === myId ||
            this.authService.currentUser?.role === 'admin' ||
            this.authService.currentUser?.role === 'master'

          if (isForMeOrMySector) {
            this.tasks = [...this.tasks, task]
          }
          this.newTaskTitle = ''
          this.newTaskDescription = ''
          this.newTaskUserId = 'none'
          this.newTaskIsPriority = false
          this.removeCreationFile()
          this.closeNewTaskModal()
        },
        error: () => {
          this.errorMessage = 'Não foi possível salvar a tarefa. Tente novamente.'
          this.isSaving = false
        },
        complete: () => {
          this.isSaving = false
        },
      })
  }

  toggleTask(task: AgendaTask): void {
    if (!task.completed) {
      this.openCompletionModal(task)
    } else {
      this.updateTask(task.id, { completed: false })
    }
  }

  openCompletionModal(task: AgendaTask): void {
    this.completingTask = task
    this.completionNotes = ''
    this.selectedCompletionFile = null
  }

  closeCompletionModal(): void {
    this.completingTask = null
    this.completionNotes = ''
    this.selectedCompletionFile = null
  }

  onCompletionFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.selectedCompletionFile = input.files[0]
    }
  }

  removeCompletionFile(): void {
    this.selectedCompletionFile = null
    const input = document.getElementById('completion-file-input') as HTMLInputElement
    if (input) input.value = ''
  }

  confirmCompletion(): void {
    if (!this.completingTask) return
    this.isCompleting = true
    this.errorMessage = ''
    this.agendaService
      .completeTask(this.completingTask.id, this.completionNotes, this.selectedCompletionFile)
      .subscribe({
        next: (updatedTask) => {
          this.tasks = this.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t))
          this.closeCompletionModal()
          this.isCompleting = false
        },
        error: () => {
          this.errorMessage = 'Não foi possível concluir a tarefa.'
          this.isCompleting = false
        },
      })
  }

  toggleTaskPriority(task: AgendaTask): void {
    this.updateTask(task.id, { isPriority: !task.isPriority })
  }

  startEditTask(task: AgendaTask): void {
    this.editingTaskId = task.id
    this.editingTaskTitle = task.title
    this.editingTaskDescription = task.description || ''
  }

  cancelEditTask(): void {
    this.editingTaskId = null
    this.editingTaskTitle = ''
    this.editingTaskDescription = ''
  }

  saveEditTask(task: AgendaTask): void {
    if (!this.editingTaskTitle.trim()) {
      this.errorMessage = 'O título não pode estar vazio.'
      return
    }
    this.updateTask(task.id, {
      title: this.editingTaskTitle,
      description: this.editingTaskDescription,
    })
    this.editingTaskId = null
  }

  downloadCreationAttachment(task: AgendaTask): void {
    if (!task.attachmentName) return
    this.agendaService.downloadAttachment(task.id, 'creation', task.attachmentName)
  }

  downloadCompletionAttachment(task: AgendaTask): void {
    if (!task.completionAttachmentName) return
    this.agendaService.downloadAttachment(task.id, 'completion', task.completionAttachmentName)
  }

  formatFileSize(bytes?: number | null): string {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  private updateTask(id: string, payload: Partial<AgendaTask>): void {
    this.savingTaskId = id
    this.errorMessage = ''
    this.agendaService.updateTask(id, payload).subscribe({
      next: (updatedTask) => {
        this.tasks = this.tasks.map((currentTask) => (currentTask.id === updatedTask.id ? updatedTask : currentTask))
      },
      error: () => {
        this.errorMessage = 'Não foi possível atualizar a tarefa.'
        this.savingTaskId = null
      },
      complete: () => {
        this.savingTaskId = null
      },
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

  formatTaskDate(dateStr?: string | null): string {
    if (!dateStr) return ''
    const parts = dateStr.split('-').map(Number)
    if (parts.length < 3) return dateStr
    const [year, month, day] = parts
    const d = new Date(year, month - 1, day)
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(d)
  }

  private loadTasks(): void {
    this.isLoading = true

    const urlTree = this.router.parseUrl(this.router.url)
    const pathParts = urlTree.root.children['primary']?.segments.map((s) => s.path) || []

    if (pathParts.length > 1 && pathParts[pathParts.length - 1] === 'agenda') {
      const maybeSector = pathParts[pathParts.length - 2]
      if (maybeSector === 'registro-academico') {
        this.currentSector = 'registro_academico'
      } else if (maybeSector === 'administracao') {
        this.currentSector = 'admin'
      } else if (maybeSector === 'desenvolvedor') {
        this.currentSector = 'master'
      } else {
        this.currentSector = maybeSector
      }
    } else {
      const role = this.authService.currentUser?.role
      this.currentSector = role
    }

    this.agendaService.getTasks(this.currentSector).subscribe({
      next: (tasks) => {
        this.tasks = tasks
      },
      error: () => {
        this.errorMessage = 'Não foi possível carregar as tarefas.'
        this.isLoading = false
      },
      complete: () => {
        this.isLoading = false
      },
    })
  }

  private toDateKey(date: Date): string {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
  }
}
