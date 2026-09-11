import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { finalize } from 'rxjs'
import {
  type UnimestreClass,
  type UnimestreCourse,
  type UnimestreStatus,
  type UnimestreStudent,
  UnimestreService,
} from '../services/unimestre.service'

@Component({
  selector: 'app-unimestre-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="unimestre-page" aria-labelledby="unimestre-title">
      <header class="unimestre-heading">
        <div><p class="hero-eyebrow">Administrador / Master</p><h1 id="unimestre-title">Integração Unimestre</h1><p>Consulta somente leitura aos dados acadêmicos e aos vínculos institucionais do banco FAIP.</p></div>
        <button class="button button-secondary" type="button" (click)="refresh()" [disabled]="isLoading">{{ isLoading ? 'Atualizando…' : 'Atualizar conexões' }}</button>
      </header>

      @if (errorMessage) { <p class="error-message" role="alert">{{ errorMessage }}</p> }
      <section class="unimestre-status-grid" aria-label="Status das conexões">
        <article class="card unimestre-status" [class.status-ok]="status?.unimestre?.reachable"><h2>Unimestre</h2><p>{{ status?.unimestre?.message || 'Verificando conexão…' }}</p></article>
        <article class="card unimestre-status" [class.status-ok]="status?.faip?.reachable"><h2>FAIP — contas Google</h2><p>{{ status?.faip?.message || 'Verificando conexão…' }}</p></article>
      </section>

      <section class="card card-outlined unimestre-filter" aria-labelledby="academic-data-title">
        <div><h2 id="academic-data-title">Dados acadêmicos</h2><p>Todos os cursos ativos do Unimestre são exibidos. Cursos ofertados no período selecionado são identificados na lista.</p></div>
        <div class="unimestre-filter-controls">
          <div class="field"><label class="field-label" for="unimestre-semester">Período</label><input id="unimestre-semester" class="field-control" maxlength="16" [(ngModel)]="semester" (change)="loadCourses()" name="semester" /></div>
          <div class="field unimestre-course-field"><label class="field-label" for="unimestre-course">Curso</label><select id="unimestre-course" class="field-control" [(ngModel)]="courseId" name="course" [disabled]="isLoadingCourses"><option value="">{{ isLoadingCourses ? 'Atualizando cursos…' : 'Selecione um curso' }}</option>@for (course of courses; track course.id) { <option [value]="course.id">{{ course.name }} ({{ course.id }}){{ course.offered ? ' — ofertado no período' : '' }}</option> }</select></div>
          <button class="button button-primary" type="button" (click)="loadClasses()" [disabled]="!semester || !courseId || !selectedCourse?.offered || isLoadingClasses">{{ isLoadingClasses ? 'Consultando…' : 'Consultar turmas' }}</button>
        </div>
        @if (courseId && !selectedCourse?.offered) { <p class="unimestre-muted">Este curso está ativo, mas não possui turma ofertada no período informado.</p> }
      </section>

      <section class="card card-outlined unimestre-results" aria-labelledby="classes-title">
        <div><h2 id="classes-title">Turmas e docentes</h2><p>Os e-mails priorizam o vínculo oficial de <code>faip_contas_google</code>; quando inexistente, mostram o contato institucional do Unimestre.</p></div>
        @if (isLoadingClasses) { <p class="unimestre-muted">Consultando a base acadêmica…</p> }
        <div class="unimestre-table-wrap">
          <table class="unimestre-table">
            <thead><tr><th>Turma</th><th>Disciplina</th><th>Docente</th><th>Alunos</th><th>Classroom</th><th>Ações</th></tr></thead>
            <tbody>
              @for (item of classes; track item.classGroup + item.subjectId) {
                <tr>
                  <td>{{ item.classGroup }}</td>
                  <td><strong>{{ item.subjectName }}</strong><small>{{ item.subjectId }}</small></td>
                  <td>{{ item.teacherName }}<small>{{ item.teacherEmail || 'E-mail institucional não vinculado' }}</small></td>
                  <td>{{ item.studentCount }}</td>
                  <td>@if (item.classroom?.alternateLink) { <a [href]="item.classroom?.alternateLink" target="_blank" rel="noopener">Abrir sala ↗</a> } @else { <span class="unimestre-muted">Não criada</span> }</td>
                  <td><div class="unimestre-actions"><button class="button button-text" type="button" (click)="loadStudents(item)" [disabled]="loadingStudentsKey === item.classGroup + item.subjectId">Alunos</button><a class="button button-secondary" [routerLink]="classroomLink" [queryParams]="classroomParams(item)">Usar no Classroom</a></div></td>
                </tr>
              } @empty { <tr><td colspan="6" class="unimestre-empty">Selecione um curso e consulte as turmas para exibir os dados.</td></tr> }
            </tbody>
          </table>
        </div>
      </section>

      @if (selectedClass) {
        <section class="card card-outlined unimestre-results" aria-labelledby="students-title">
          <div class="unimestre-students-heading"><div><h2 id="students-title">Alunos — {{ selectedClass.subjectName }} / {{ selectedClass.classGroup }}</h2><p>Listagem acadêmica somente leitura, com e-mail institucional vinculado quando disponível.</p></div><button class="button button-text" type="button" (click)="closeStudents()">Fechar</button></div>
          @if (isLoadingStudents) { <p class="unimestre-muted">Consultando alunos matriculados…</p> }
          <ul class="unimestre-students">@for (student of students; track student.id) { <li><strong>{{ student.name }}</strong><span>{{ student.email || 'Sem e-mail Google vinculado' }}</span></li> } @empty { <li class="unimestre-muted">Nenhum aluno encontrado para esta turma.</li> }</ul>
        </section>
      }
    </section>
  `,
  styles: [`
    .unimestre-page { display: grid; gap: 24px; max-width: 1280px; margin-inline: auto; }.unimestre-heading, .unimestre-students-heading { display:flex; justify-content:space-between; gap:16px; align-items:start; }.unimestre-heading h1,.unimestre-heading p,.unimestre-filter h2,.unimestre-filter p,.unimestre-results h2,.unimestre-results p { margin:0; }.unimestre-heading h1 { margin-block:8px; font-size:clamp(32px,4vw,40px); }.unimestre-heading>div>p:last-child,.unimestre-filter p,.unimestre-results>div>p,.unimestre-muted,.unimestre-students span { color:var(--color-text-secondary); }.unimestre-status-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }.unimestre-status { gap:8px; }.unimestre-status h2,.unimestre-status p { margin:0; }.unimestre-status.status-ok { border-color:var(--color-action-green); }.unimestre-filter,.unimestre-results { gap:20px; }.unimestre-filter-controls { display:grid; grid-template-columns:150px minmax(280px,1fr) auto; gap:16px; align-items:end; }.unimestre-course-field { min-width:0; }.unimestre-table-wrap { overflow-x:auto; }.unimestre-table { width:100%; border-collapse:collapse; min-width:900px; }.unimestre-table th,.unimestre-table td { padding:12px; border-bottom:1px solid var(--color-border); text-align:left; vertical-align:top; }.unimestre-table th { color:var(--color-text-secondary); font-size:14px; }.unimestre-table small,.unimestre-table td>a { display:block; margin-top:4px; color:var(--color-text-secondary); font-size:13px; }.unimestre-actions { display:flex; gap:8px; align-items:center; }.unimestre-empty { color:var(--color-text-secondary); text-align:center; }.unimestre-students { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:8px; list-style:none; margin:0; padding:0; }.unimestre-students li { display:grid; gap:4px; padding:12px; border:1px solid var(--color-border); border-radius:8px; }.unimestre-students strong,.unimestre-students span { overflow-wrap:anywhere; }
    @media (max-width:720px) { .unimestre-heading,.unimestre-students-heading { flex-direction:column; }.unimestre-status-grid,.unimestre-filter-controls { grid-template-columns:1fr; } }
  `],
})
export class UnimestrePageComponent implements OnInit {
  semester = this.currentSemester()
  courseId = ''
  courses: UnimestreCourse[] = []
  classes: UnimestreClass[] = []
  students: UnimestreStudent[] = []
  selectedClass: UnimestreClass | null = null
  status: UnimestreStatus | null = null
  errorMessage = ''
  isLoading = false
  isLoadingCourses = false
  isLoadingClasses = false
  isLoadingStudents = false
  loadingStudentsKey = ''

  get selectedCourse(): UnimestreCourse | undefined {
    return this.courses.find((course) => String(course.id) === this.courseId)
  }

  get classroomLink(): string {
    return this.router.url.startsWith('/desenvolvedor')
      ? '/desenvolvedor/classroom'
      : '/administracao/classroom'
  }

  constructor(
    private readonly unimestreService: UnimestreService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.refresh()
  }

  refresh(): void {
    this.isLoading = true
    this.errorMessage = ''
    this.unimestreService.status().pipe(finalize(() => { this.isLoading = false })).subscribe({
      next: (status) => { this.status = status },
      error: () => { this.errorMessage = 'Não foi possível verificar as conexões externas.' },
    })
    this.loadCourses()
  }

  loadCourses(): void {
    const semester = this.semester.trim()
    this.courseId = ''
    this.classes = []
    this.closeStudents()
    if (!semester) {
      this.courses = []
      return
    }

    this.isLoadingCourses = true
    this.errorMessage = ''
    this.unimestreService.courses(semester).pipe(finalize(() => { this.isLoadingCourses = false })).subscribe({
      next: (courses) => { this.courses = courses },
      error: () => { this.courses = []; this.errorMessage = 'Não foi possível carregar os cursos ativos do Unimestre.' },
    })
  }

  loadClasses(): void {
    if (!this.selectedCourse?.offered) {
      this.errorMessage = 'Este curso não possui turmas ofertadas no período selecionado.'
      return
    }
    this.isLoadingClasses = true
    this.errorMessage = ''
    this.classes = []
    this.selectedClass = null
    this.students = []
    this.unimestreService.classes(this.semester, this.courseId).pipe(finalize(() => { this.isLoadingClasses = false })).subscribe({
      next: (classes) => { this.classes = classes },
      error: (error) => { this.errorMessage = error.error?.message || 'Não foi possível consultar as turmas do Unimestre.' },
    })
  }

  loadStudents(item: UnimestreClass): void {
    const key = item.classGroup + item.subjectId
    this.loadingStudentsKey = key
    this.isLoadingStudents = true
    this.selectedClass = item
    this.students = []
    this.unimestreService.students(this.semester, this.courseId, item.subjectId, item.classGroup)
      .pipe(finalize(() => { this.isLoadingStudents = false; this.loadingStudentsKey = '' }))
      .subscribe({
        next: (students) => { this.students = students },
        error: (error) => { this.errorMessage = error.error?.message || 'Não foi possível consultar os alunos desta turma.' },
      })
  }

  closeStudents(): void {
    this.selectedClass = null
    this.students = []
  }

  classroomParams(item: UnimestreClass) {
    return {
      semester: this.semester,
      academicCourseId: this.courseId,
      subjectId: item.subjectId,
      classGroup: item.classGroup,
      subjectName: item.subjectName,
      teacherEmail: item.teacherEmail || '',
    }
  }

  private currentSemester(): string {
    const now = new Date()
    return `${now.getFullYear()}${now.getMonth() < 6 ? '1' : '2'}`
  }
}
