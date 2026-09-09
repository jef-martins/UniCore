import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { finalize } from 'rxjs'

interface ClassroomRoom {
  id: string
  academicCourseId: string
  subjectId: string
  classGroup: string
  semester: string
  subjectName: string
  teacherEmail: string
  googleCourseId: string | null
  alternateLink: string | null
  status: 'PENDING' | 'PROCESSING' | 'CREATED' | 'CREATED_WITH_WARNINGS' | 'FAILED'
  lastMessage: string | null
  updatedAt: string
}

interface GoogleStatus { configured: boolean; message: string | null }
interface ImportResponse { total: number; sucesso: number; ignorados: number; erros: number }

@Component({
  selector: 'app-classroom-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="classroom-page" aria-labelledby="classroom-title">
      <header class="classroom-heading">
        <div>
          <p class="hero-eyebrow">Administrador / Master</p>
          <h1 id="classroom-title">Google Classroom</h1>
          <p>Crie salas e sincronize docentes e alunos usando a integração institucional do Google Workspace.</p>
        </div>
        <button class="button button-secondary" type="button" (click)="testConnection()" [disabled]="isTesting">
          {{ isTesting ? 'Verificando…' : 'Verificar conexão Google' }}
        </button>
      </header>

      <p class="classroom-connection" [class.classroom-connection-ok]="googleStatus?.configured" [class.error-message]="googleStatus && !googleStatus.configured" role="status">
        @if (googleStatus?.configured) { Integração Google configurada. A verificação consulta os cursos ativos do Classroom. }
        @else { {{ googleStatus?.message || 'Verificando a configuração Google…' }} }
      </p>
      @if (connectionMessage) { <p class="classroom-connection" role="status">{{ connectionMessage }}</p> }
      @if (errorMessage) { <p class="error-message" role="alert">{{ errorMessage }}</p> }

      <section class="card card-outlined classroom-section" aria-labelledby="create-room-title">
        <div class="classroom-section-header">
          <h2 id="create-room-title">Criar sala acadêmica</h2>
          <p>A combinação período, curso, disciplina e turma é única, evitando uma segunda sala para a mesma turma.</p>
        </div>
        <form class="classroom-form" (ngSubmit)="createRoom()">
          <div class="field"><label class="field-label" for="semester">Período</label><input id="semester" class="field-control" required maxlength="16" [(ngModel)]="roomForm.semester" name="semester" placeholder="20262" /></div>
          <div class="field"><label class="field-label" for="academic-course">Código do curso</label><input id="academic-course" class="field-control" required maxlength="64" [(ngModel)]="roomForm.academicCourseId" name="academicCourseId" /></div>
          <div class="field"><label class="field-label" for="subject-id">Código da disciplina</label><input id="subject-id" class="field-control" required maxlength="64" [(ngModel)]="roomForm.subjectId" name="subjectId" /></div>
          <div class="field"><label class="field-label" for="class-group">Turma</label><input id="class-group" class="field-control" required maxlength="64" [(ngModel)]="roomForm.classGroup" name="classGroup" /></div>
          <div class="field classroom-form-wide"><label class="field-label" for="subject-name">Nome da disciplina</label><input id="subject-name" class="field-control" required maxlength="180" [(ngModel)]="roomForm.subjectName" name="subjectName" /></div>
          <div class="field classroom-form-wide"><label class="field-label" for="teacher-email">E-mail institucional do professor</label><input id="teacher-email" class="field-control" type="email" required maxlength="254" [(ngModel)]="roomForm.teacherEmail" name="teacherEmail" placeholder="professor@exemplo.edu.br" /></div>
          <button class="button button-primary classroom-submit" type="submit" [disabled]="isCreating || !googleStatus?.configured">{{ isCreating ? 'Criando…' : 'Criar sala e incluir professor' }}</button>
        </form>
      </section>

      <section class="card card-outlined classroom-section" aria-labelledby="rooms-title">
        <div class="classroom-section-header classroom-list-header">
          <div><h2 id="rooms-title">Salas sincronizadas</h2><p>Os dados são persistidos no UniCore e vinculados ao ID retornado pelo Google Classroom.</p></div>
          <button class="button button-text" type="button" (click)="loadRooms()" [disabled]="isLoadingRooms">Atualizar</button>
        </div>
        @if (isLoadingRooms) { <p class="classroom-empty">Carregando salas…</p> }
        <div class="classroom-room-grid">
          @for (room of rooms; track room.id) {
            <article class="classroom-room">
              <div class="classroom-room-title"><div><h3>{{ room.subjectName }}</h3><p>{{ room.semester }} · Curso {{ room.academicCourseId }} · Turma {{ room.classGroup }}</p></div><span class="classroom-status" [attr.data-status]="room.status">{{ statusLabel(room.status) }}</span></div>
              <p class="classroom-room-meta">Professor: <strong>{{ room.teacherEmail }}</strong></p>
              @if (room.alternateLink) { <a class="action-link classroom-link" [href]="room.alternateLink" target="_blank" rel="noopener">Abrir no Google Classroom ↗</a> }
              @if (room.lastMessage) { <p class="classroom-room-message">{{ room.lastMessage }}</p> }
              <div class="classroom-members">
                <label class="field-label" [for]="'students-' + room.id">Adicionar alunos</label>
                <textarea class="field-control" [id]="'students-' + room.id" rows="3" [name]="'students-' + room.id" placeholder="Um e-mail por linha ou separado por vírgula" [(ngModel)]="memberInputs[room.id]"></textarea>
                <button class="button button-secondary" type="button" (click)="syncMembers(room)" [disabled]="syncingRoomId === room.id || !googleStatus?.configured">{{ syncingRoomId === room.id ? 'Sincronizando…' : 'Sincronizar participantes' }}</button>
              </div>
            </article>
          } @empty { <p class="classroom-empty">Nenhuma sala foi criada nesta integração.</p> }
        </div>
      </section>

      <section class="card card-outlined classroom-section" aria-labelledby="import-title">
        <div class="classroom-section-header"><h2 id="import-title">Importar professores em lote</h2><p>Para salas existentes, envie uma planilha <code>.xlsx</code> com as colunas obrigatórias <strong>materia</strong> e <strong>professor</strong>; <strong>courseid</strong> é opcional.</p></div>
        <form class="classroom-import-form" (ngSubmit)="uploadFile()">
          <input #fileInput type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" (change)="selectFile($event)" [disabled]="isUploading" />
          <button class="button button-secondary" type="submit" [disabled]="!selectedFile || isUploading || !googleStatus?.configured">{{ isUploading ? 'Importando…' : 'Importar professores' }}</button>
          @if (selectedFile) { <span>{{ selectedFile.name }}</span> }
        </form>
        @if (importResult) { <p class="classroom-import-result" role="status">{{ importResult.sucesso }} sucesso(s), {{ importResult.ignorados }} já existente(s)/ignorado(s) e {{ importResult.erros }} erro(s) em {{ importResult.total }} linha(s).</p> }
      </section>
    </section>
  `,
  styles: [`
    .classroom-page { display: grid; gap: 24px; max-width: 1280px; margin: 0 auto; }
    .classroom-heading, .classroom-list-header, .classroom-room-title { display: flex; gap: 16px; justify-content: space-between; align-items: start; }
    .classroom-heading h1, .classroom-heading p, .classroom-section h2, .classroom-section p, .classroom-room h3 { margin: 0; }
    .classroom-heading h1 { margin: 8px 0; font-size: clamp(32px, 4vw, 40px); }
    .classroom-heading > div > p:last-child, .classroom-section-header p, .classroom-room-meta, .classroom-room-message, .classroom-empty, .classroom-import-result { color: var(--color-text-secondary); }
    .classroom-section { gap: 20px; }
    .classroom-section-header { display: grid; gap: 8px; }
    .classroom-form { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; align-items: end; }
    .classroom-form-wide { grid-column: span 2; }
    .classroom-submit { justify-self: start; }
    .classroom-connection { margin: 0; padding: 12px 16px; border: 1px solid var(--color-border); border-radius: 8px; }
    .classroom-connection-ok { border-color: var(--color-action-green); }
    .classroom-room-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .classroom-room { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--color-border); border-radius: 8px; }
    .classroom-room h3 { font-size: 18px; }.classroom-room-title p { color: var(--color-text-secondary); font-size: 14px; }
    .classroom-status { padding: 4px 8px; border: 1px solid var(--color-border); border-radius: 999px; font-size: 12px; white-space: nowrap; }
    .classroom-status[data-status="CREATED"] { border-color: var(--color-action-green); }.classroom-status[data-status="FAILED"] { border-color: var(--color-error); }.classroom-status[data-status="CREATED_WITH_WARNINGS"] { border-color: #d6a700; }
    .classroom-link { justify-self: start; color: var(--color-action-green); }.classroom-members { display: grid; gap: 8px; }.classroom-import-form { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }.classroom-import-result { margin: 0; }
    @media (max-width: 850px) { .classroom-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }.classroom-heading { flex-direction: column; }.classroom-form-wide { grid-column: span 1; } }
    @media (max-width: 520px) { .classroom-form { grid-template-columns: 1fr; }.classroom-list-header, .classroom-room-title { flex-direction: column; }.classroom-submit { width: 100%; } }
  `],
})
export class ClassroomPageComponent implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>
  readonly roomForm = {
    semester: this.currentSemester(), academicCourseId: '', subjectId: '', classGroup: '', subjectName: '', teacherEmail: '',
  }
  rooms: ClassroomRoom[] = []
  googleStatus: GoogleStatus | null = null
  memberInputs: Record<string, string> = {}
  selectedFile: File | null = null
  importResult: ImportResponse | null = null
  errorMessage = ''
  connectionMessage = ''
  isLoadingRooms = false
  isCreating = false
  isUploading = false
  isTesting = false
  syncingRoomId: string | null = null

  constructor(
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap
    this.roomForm.semester = params.get('semester') || this.roomForm.semester
    this.roomForm.academicCourseId = params.get('academicCourseId') || ''
    this.roomForm.subjectId = params.get('subjectId') || ''
    this.roomForm.classGroup = params.get('classGroup') || ''
    this.roomForm.subjectName = params.get('subjectName') || ''
    this.roomForm.teacherEmail = params.get('teacherEmail') || ''
    this.loadStatus()
    this.loadRooms()
  }

  loadStatus(): void {
    this.http.get<GoogleStatus>('/api/classroom/status').subscribe({
      next: (status) => { this.googleStatus = status },
      error: (error) => {
        const message = error.error?.message || 'Não foi possível verificar a configuração Google.'
        this.googleStatus = { configured: false, message }
        this.errorMessage = message
      },
    })
  }

  loadRooms(): void {
    this.isLoadingRooms = true
    this.http.get<ClassroomRoom[]>('/api/classroom/rooms').pipe(finalize(() => { this.isLoadingRooms = false })).subscribe({
      next: (rooms) => { this.rooms = rooms },
      error: () => { this.errorMessage = 'Não foi possível carregar as salas sincronizadas.' },
    })
  }

  testConnection(): void {
    this.isTesting = true
    this.errorMessage = ''
    this.connectionMessage = ''
    this.http.get<Array<{ id: string }>>('/api/classroom/courses').pipe(finalize(() => { this.isTesting = false })).subscribe({
      next: (courses) => { this.connectionMessage = `Conexão confirmada: ${courses.length} sala(s) ativa(s) encontrada(s) no Google Classroom.` },
      error: (error) => { this.errorMessage = error.error?.message || 'Não foi possível conectar ao Google Classroom.' },
    })
  }

  createRoom(): void {
    this.isCreating = true
    this.errorMessage = ''
    this.http.post<{ room: ClassroomRoom; created: boolean; warnings: string[] }>('/api/classroom/rooms', this.roomForm)
      .pipe(finalize(() => { this.isCreating = false }))
      .subscribe({
        next: (result) => {
          this.connectionMessage = result.created ? 'Sala criada e registrada no UniCore.' : 'Esta sala já estava registrada no UniCore.'
          if (result.warnings.length) this.connectionMessage += ` Avisos: ${result.warnings.join(' ')}`
          this.resetRoomForm()
          this.loadRooms()
        },
        error: (error) => { this.errorMessage = error.error?.message || 'Não foi possível criar a sala.' },
      })
  }

  syncMembers(room: ClassroomRoom): void {
    const studentEmails = (this.memberInputs[room.id] || '').split(/[\n,;]+/).map((email) => email.trim()).filter(Boolean)
    this.syncingRoomId = room.id
    this.errorMessage = ''
    this.http.post<{ room: ClassroomRoom; addedStudents: number; existingStudents: number; warnings: string[] }>(
      `/api/classroom/rooms/${room.id}/members`, { studentEmails },
    ).pipe(finalize(() => { this.syncingRoomId = null })).subscribe({
      next: (result) => {
        this.memberInputs[room.id] = ''
        this.connectionMessage = `${result.addedStudents} aluno(s) adicionado(s), ${result.existingStudents} já estava(m) na sala.`
        if (result.warnings.length) this.connectionMessage += ` Avisos: ${result.warnings.join(' ')}`
        this.loadRooms()
      },
      error: (error) => { this.errorMessage = error.error?.message || 'Não foi possível sincronizar os participantes.' },
    })
  }

  selectFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.errorMessage = 'Selecione uma planilha .xlsx válida.'
      this.selectedFile = null
      return
    }
    this.selectedFile = file
    this.importResult = null
  }

  uploadFile(): void {
    if (!this.selectedFile) return
    const data = new FormData()
    data.append('arquivo', this.selectedFile)
    this.isUploading = true
    this.errorMessage = ''
    this.http.post<ImportResponse>('/api/classroom/importar-professores', data)
      .pipe(finalize(() => { this.isUploading = false }))
      .subscribe({
        next: (result) => {
          this.importResult = result
          this.selectedFile = null
          if (this.fileInput) this.fileInput.nativeElement.value = ''
        },
        error: (error) => { this.errorMessage = error.error?.message || 'Não foi possível importar os professores.' },
      })
  }

  statusLabel(status: ClassroomRoom['status']): string {
    return {
      PENDING: 'Pendente', PROCESSING: 'Processando', CREATED: 'Criada',
      CREATED_WITH_WARNINGS: 'Criada com avisos', FAILED: 'Falhou',
    }[status]
  }

  private resetRoomForm(): void {
    this.roomForm.academicCourseId = ''
    this.roomForm.subjectId = ''
    this.roomForm.classGroup = ''
    this.roomForm.subjectName = ''
    this.roomForm.teacherEmail = ''
  }

  private currentSemester(): string {
    const now = new Date()
    return `${now.getFullYear()}${now.getMonth() < 6 ? '1' : '2'}`
  }
}
