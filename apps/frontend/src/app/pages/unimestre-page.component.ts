import { CommonModule } from '@angular/common'
import { Component, OnInit, effect, untracked } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { finalize } from 'rxjs'
import { AuthService, type AuthUser } from '../services/auth.service'
import { SectorContextService } from '../services/sector-context.service'
import {
  type AcademicCourseSetting,
  type CoordinatorUser,
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
        <div>
          <p class="hero-eyebrow">{{ isCoordinationRoute ? 'Coordenação Acadêmica' : 'Administrador / Master' }}</p>
          <h1 id="unimestre-title">{{ isCoordinationRoute ? 'Cursos e Turmas da Coordenação' : 'Integração Unimestre' }}</h1>
          <p>
            {{
              isCoordinationRoute
                ? 'Visualize os cursos sob sua coordenação, disciplinas, docentes e matrículas de alunos.'
                : 'Consulta aos dados acadêmicos, vinculação de e-mails de curso/coordenadores e integração Google Workspace.'
            }}
          </p>
        </div>
        <div class="unimestre-header-actions">
          @if (isAdminRoute) {
            <button
              class="button"
              [class.button-primary]="showCourseSettingsManager"
              [class.button-secondary]="!showCourseSettingsManager"
              type="button"
              (click)="toggleCourseSettingsManager()"
            >
              {{ showCourseSettingsManager ? '✕ Fechar Gerenciamento' : '⚙️ Gerenciar Vínculos de Cursos' }}
            </button>
          }
          <button class="button button-secondary" type="button" (click)="refresh()" [disabled]="isLoading">
            {{ isLoading ? 'Atualizando…' : 'Atualizar conexões' }}
          </button>
        </div>
      </header>

      @if (errorMessage) { <p class="error-message" role="alert">{{ errorMessage }}</p> }
      @if (saveSuccessMessage) { <p class="unimestre-success-alert" role="status">{{ saveSuccessMessage }}</p> }

      <!-- Cards de Status de Conexão -->
      <section class="unimestre-status-grid" aria-label="Status das conexões">
        <article class="card unimestre-status" [class.status-ok]="status?.unimestre?.reachable">
          <h2>Unimestre</h2>
          <p>{{ status?.unimestre?.message || 'Verificando conexão…' }}</p>
        </article>
        <article class="card unimestre-status" [class.status-ok]="status?.faip?.reachable">
          <h2>FAIP — contas Google</h2>
          <p>{{ status?.faip?.message || 'Verificando conexão…' }}</p>
        </article>
        <article class="card unimestre-status status-ok">
          <h2>Banco Local UniCore</h2>
          <p>{{ status?.local?.message || 'Armazenamento de resiliência ativo.' }}</p>
        </article>
      </section>

      @if (isOfflineMode) {
        <p class="unimestre-offline-alert" role="status">
          💾 <strong>Modo de resiliência ativo:</strong> Exibindo dados salvos no banco local UniCore. As consultas continuam funcionando mesmo com a base externa offline.
        </p>
      }

      <!-- Painel de Gerenciamento Geral de Cursos e Coordenadores (Apenas para Administrador) -->
      @if (isAdminRoute && showCourseSettingsManager) {
        <section class="card card-outlined unimestre-manager-panel" aria-labelledby="manager-title">
          <div class="manager-header">
            <div>
              <h2 id="manager-title">⚙️ Atribuição de Cursos, E-mails & Coordenadores</h2>
              <p>Defina o e-mail de cada curso (&#64;classroom.faip.edu.br) e vincule o coordenador responsável (&#64;faip.edu.br). O coordenador terá acesso exclusivo aos seus cursos no menu Coordenação.</p>
            </div>
            <div class="manager-filter">
              <input
                class="field-control manager-search-input"
                placeholder="Filtrar curso por nome ou código..."
                [(ngModel)]="courseManagerSearch"
              />
            </div>
          </div>

          <div class="unimestre-table-wrap">
            <table class="unimestre-table">
              <thead>
                <tr>
                  <th style="width: 28%;">Curso</th>
                  <th style="width: 32%;">E-mail institucional do Curso (&#64;classroom)</th>
                  <th style="width: 28%;">Coordenador Responsável (&#64;faip)</th>
                  <th style="width: 12%; text-align: right;">Ação</th>
                </tr>
              </thead>
              <tbody>
                @for (c of filteredCoursesForManager; track c.id) {
                  <tr>
                    <td>
                      <strong>{{ c.name }}</strong>
                      <small>Código Unimestre: {{ c.id }}</small>
                    </td>
                    <td>
                      <input
                        class="field-control input-sm"
                        placeholder="ex: direito@classroom.faip.edu.br"
                        [(ngModel)]="managerEdits[c.id].courseEmail"
                      />
                    </td>
                    <td>
                      <select class="field-control input-sm" [(ngModel)]="managerEdits[c.id].coordinatorUserId" (change)="onManagerCoordinatorChange(c.id)">
                        <option value="">Selecione um coordenador</option>
                        @for (coord of coordinators; track coord.id) {
                          <option [value]="coord.id">{{ coord.username }} ({{ coord.email }})</option>
                        }
                      </select>
                      @if (!managerEdits[c.id].coordinatorUserId) {
                        <input
                          class="field-control input-sm mt-1"
                          placeholder="Ou digite o e-mail: coord@faip.edu.br"
                          [(ngModel)]="managerEdits[c.id].coordinatorEmail"
                        />
                      }
                    </td>
                    <td style="text-align: right;">
                      <button
                        class="button button-primary button-sm"
                        type="button"
                        (click)="saveManagerCourseSetting(c)"
                        [disabled]="savingCourseId === c.id"
                      >
                        {{ savingCourseId === c.id ? 'Salvando…' : 'Salvar' }}
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="unimestre-empty">Nenhum curso encontrado no filtro informado.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <!-- Filtro de Seleção de Período e Curso -->
      <section class="card card-outlined unimestre-filter" aria-labelledby="academic-data-title">
        <div>
          <h2 id="academic-data-title">
            {{ isCoordinationRoute ? 'Seleção do Curso e Período' : 'Dados acadêmicos' }}
          </h2>
          <p>
            {{
              isCoordinationRoute
                ? 'Selecione um dos cursos atribuídos à sua coordenação para visualizar as turmas ofertadas.'
                : 'Todos os cursos ativos do Unimestre são exibidos. Cursos ofertados no período selecionado são identificados na lista.'
            }}
          </p>
        </div>

        <div class="unimestre-filter-controls">
          <div class="field">
            <label class="field-label" for="unimestre-semester">Período</label>
            <input
              id="unimestre-semester"
              class="field-control"
              maxlength="16"
              [(ngModel)]="semester"
              (change)="loadCourses()"
              name="semester"
            />
          </div>
          <div class="field unimestre-course-field">
            <label class="field-label" for="unimestre-course">Curso</label>
            <select
              id="unimestre-course"
              class="field-control"
              [(ngModel)]="courseId"
              (change)="onCourseChange()"
              name="course"
              [disabled]="isLoadingCourses || (isCoordinationRoute && courses.length === 0)"
            >
              <option value="">
                {{
                  isLoadingCourses
                    ? 'Atualizando cursos…'
                    : (isCoordinationRoute && courses.length === 0)
                      ? 'Nenhum curso vinculado à sua coordenação'
                      : 'Selecione um curso'
                }}
              </option>
              @for (course of courses; track course.id) {
                <option [value]="course.id">
                  {{ course.name }} ({{ course.id }}){{ course.offered ? ' — ofertado no período' : '' }}
                </option>
              }
            </select>
          </div>
          <button
            class="button button-primary"
            type="button"
            (click)="loadClasses()"
            [disabled]="!semester || !courseId || !selectedCourse?.offered || isLoadingClasses"
          >
            {{ isLoadingClasses ? 'Consultando…' : 'Consultar turmas' }}
          </button>
        </div>

        @if (isCoordinationRoute && !isLoadingCourses && courses.length === 0) {
          <div class="unimestre-no-courses-banner" role="alert">
            <span class="banner-icon">⚠️</span>
            <div class="banner-text">
              <strong>Nenhum curso vinculado à sua coordenação</strong>
              <p>
                O seu e-mail institucional <strong>({{ currentUserEmail || currentUsername }})</strong> não possui nenhum curso acadêmico vinculado no momento.
              </p>
              <small>Caso coordene algum curso, solicite ao Administrador a vinculação do seu e-mail institucional ou usuário aos cursos correspondentes.</small>
            </div>
          </div>
        }

        @if (courseId && !selectedCourse?.offered) {
          <p class="unimestre-muted">Este curso está ativo, mas não possui turma ofertada no período informado.</p>
        }

        <!-- Detalhes do Curso Selecionado -->
        @if (selectedCourse) {
          <div class="course-meta-card card">
            <div class="course-meta-header">
              <span class="course-meta-badge">Informações Institucionais do Curso</span>
              <strong>{{ selectedCourse.name }}</strong>
            </div>

            <div class="course-meta-grid">
              <div class="course-meta-item">
                <span class="course-meta-label">🎓 E-mail institucional do Curso:</span>
                <span class="course-meta-val" [class.val-highlight]="selectedCourse.courseEmail">
                  {{ selectedCourse.courseEmail || 'Não definido' }}
                </span>
              </div>
              <div class="course-meta-item">
                <span class="course-meta-label">👤 Coordenador Responsável:</span>
                <span class="course-meta-val" [class.val-highlight]="selectedCourse.coordinatorEmail">
                  {{ selectedCourse.coordinatorEmail || 'Não vinculado' }}
                  @if (selectedCourse.coordinatorName) {
                    ({{ selectedCourse.coordinatorName }})
                  }
                </span>
              </div>
            </div>

            <!-- Formulário rápido de vinculação de coordenador/email (Apenas Administrador) -->
            @if (isAdminRoute) {
              <div class="course-edit-strip">
                <div class="field field-compact">
                  <label class="field-label-sm">E-mail institucional do Curso (&#64;classroom):</label>
                  <input
                    class="field-control input-sm"
                    placeholder="ex: direito@classroom.faip.edu.br"
                    [(ngModel)]="selectedCourseEdit.courseEmail"
                  />
                </div>
                <div class="field field-compact">
                  <label class="field-label-sm">Coordenador (&#64;faip.edu.br):</label>
                  <select
                    class="field-control input-sm"
                    [(ngModel)]="selectedCourseEdit.coordinatorUserId"
                    (change)="onSelectedCourseCoordinatorChange()"
                  >
                    <option value="">Selecione da lista de coordenadores</option>
                    @for (coord of coordinators; track coord.id) {
                      <option [value]="coord.id">{{ coord.username }} ({{ coord.email }})</option>
                    }
                  </select>
                </div>
                @if (!selectedCourseEdit.coordinatorUserId) {
                  <div class="field field-compact">
                    <label class="field-label-sm">Ou digite o e-mail institucional:</label>
                    <input
                      class="field-control input-sm"
                      placeholder="ex: coordenador@faip.edu.br"
                      [(ngModel)]="selectedCourseEdit.coordinatorEmail"
                    />
                  </div>
                }
                <div class="course-edit-actions">
                  <button
                    class="button button-secondary button-sm"
                    type="button"
                    (click)="saveSelectedCourseSetting()"
                    [disabled]="isSavingSelectedSetting"
                  >
                    {{ isSavingSelectedSetting ? 'Salvando…' : 'Salvar Vínculo do Curso' }}
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </section>

      <!-- Seção: Turmas e Docentes -->
      <section class="card card-outlined unimestre-results" aria-labelledby="classes-title">
        <div>
          <h2 id="classes-title">Turmas e docentes</h2>
          <p>
            Os e-mails dos docentes priorizam o vínculo oficial; nas salas do Google Classroom, o Docente, o Coordenador e o Curso são vinculados como professores automaticamente.
          </p>
        </div>
        @if (isLoadingClasses) { <p class="unimestre-muted">Consultando a base acadêmica…</p> }
        <div class="unimestre-table-wrap">
          <table class="unimestre-table">
            <thead>
              <tr>
                <th>Turma</th>
                <th>Disciplina</th>
                <th>Docente</th>
                <th>Alunos</th>
                <th>Classroom</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (item of classes; track item.classGroup + item.subjectId) {
                <tr>
                  <td>{{ item.classGroup }}</td>
                  <td>
                    <strong>{{ item.subjectName }}</strong>
                    <small>{{ item.subjectId }}</small>
                  </td>
                  <td>
                    {{ item.teacherName }}
                    <small>{{ item.teacherEmail || 'E-mail institucional não vinculado' }}</small>
                  </td>
                  <td>{{ item.studentCount }}</td>
                  <td>
                    @if (item.classroom?.alternateLink) {
                      <a [href]="item.classroom?.alternateLink" target="_blank" rel="noopener">Abrir sala ↗</a>
                    } @else {
                      <span class="unimestre-muted">Não criada</span>
                    }
                  </td>
                  <td>
                    <div class="unimestre-actions">
                      <button
                        class="button button-text"
                        type="button"
                        (click)="loadStudents(item)"
                        [disabled]="loadingStudentsKey === item.classGroup + item.subjectId"
                      >
                        Alunos
                      </button>
                      <a class="button button-secondary" [routerLink]="classroomLink" [queryParams]="classroomParams(item)">
                        Usar no Classroom
                      </a>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="unimestre-empty">Selecione um curso e consulte as turmas para exibir os dados.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- Painel de Alunos Matriculados -->
      @if (selectedClass) {
        <section class="card card-outlined unimestre-results" aria-labelledby="students-title">
          <div class="unimestre-students-heading">
            <div>
              <h2 id="students-title">Alunos — {{ selectedClass.subjectName }} / {{ selectedClass.classGroup }}</h2>
              <p>Listagem acadêmica com o e-mail Google institucional oficial dos alunos (&#64;aluno.faip.edu.br).</p>
            </div>
            <div class="unimestre-students-header-actions">
              @if (students.length > 0) {
                <button class="button button-secondary" type="button" (click)="copyAllEmails()">
                  {{ copiedAll ? '✓ Todos copiados!' : '📋 Copiar todos os e-mails (' + students.length + ')' }}
                </button>
                <a
                  class="button button-primary"
                  [routerLink]="classroomLink"
                  [queryParams]="classroomParamsWithStudents(selectedClass)"
                >
                  Usar no Classroom com alunos ↗
                </a>
              }
              <button class="button button-text" type="button" (click)="closeStudents()">Fechar</button>
            </div>
          </div>
          @if (isLoadingStudents) { <p class="unimestre-muted">Consultando alunos matriculados…</p> }
          <ul class="unimestre-students">
            @for (student of students; track student.id) {
              <li>
                <strong>{{ student.name }}</strong>
                <div class="unimestre-student-email-row">
                  <span class="unimestre-student-email">{{ student.email || 'Sem e-mail Google vinculado' }}</span>
                  @if (student.email) {
                    <button
                      class="button button-text copy-single-btn"
                      type="button"
                      (click)="copyStudentEmail(student.email, student.id)"
                    >
                      {{ copiedStudentId === student.id ? '✓ Copiado' : 'Copiar' }}
                    </button>
                  }
                </div>
              </li>
            } @empty {
              <li class="unimestre-muted">Nenhum aluno encontrado para esta turma.</li>
            }
          </ul>
        </section>
      }
    </section>
  `,
  styles: [`
    .unimestre-page {
      display: grid;
      gap: 24px;
      max-width: 1280px;
      margin-inline: auto;
    }
    .unimestre-heading, .unimestre-students-heading, .manager-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
    }
    .unimestre-header-actions, .unimestre-students-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .unimestre-heading h1, .unimestre-heading p, .unimestre-filter h2, .unimestre-filter p,
    .unimestre-results h2, .unimestre-results p, .manager-header h2, .manager-header p {
      margin: 0;
    }
    .unimestre-heading h1 {
      margin-block: 8px;
      font-size: clamp(30px, 4vw, 38px);
    }
    .unimestre-heading > div > p:last-child, .unimestre-filter p, .unimestre-results > div > p,
    .unimestre-muted, .unimestre-students span, .manager-header p {
      color: var(--color-text-secondary);
    }
    .unimestre-status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .unimestre-status {
      gap: 8px;
    }
    .unimestre-status h2, .unimestre-status p {
      margin: 0;
    }
    .unimestre-status.status-ok {
      border-color: var(--color-action-green);
    }
    .unimestre-filter, .unimestre-results, .unimestre-manager-panel {
      gap: 20px;
    }
    .unimestre-filter-controls {
      display: grid;
      grid-template-columns: 150px minmax(280px, 1fr) auto;
      gap: 16px;
      align-items: end;
    }
    .unimestre-course-field {
      min-width: 0;
    }
    .unimestre-table-wrap {
      overflow-x: auto;
    }
    .unimestre-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 900px;
    }
    .unimestre-table th, .unimestre-table td {
      padding: 12px;
      border-bottom: 1px solid var(--color-border);
      text-align: left;
      vertical-align: middle;
    }
    .unimestre-table th {
      color: var(--color-text-secondary);
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .unimestre-table small, .unimestre-table td > a {
      display: block;
      margin-top: 4px;
      color: var(--color-text-secondary);
      font-size: 13px;
    }
    .unimestre-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .unimestre-empty {
      color: var(--color-text-secondary);
      text-align: center;
      padding: 24px !important;
    }
    .unimestre-students {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 8px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .unimestre-students li {
      display: grid;
      gap: 6px;
      padding: 12px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }
    .unimestre-students strong {
      overflow-wrap: anywhere;
    }
    .unimestre-student-email-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .unimestre-student-email {
      color: var(--color-action-green) !important;
      font-size: 13px;
      font-weight: 500;
      word-break: break-all;
    }
    .copy-single-btn {
      font-size: 12px;
      padding: 2px 6px;
    }
    .unimestre-offline-alert, .unimestre-success-alert {
      margin: 0;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
    }
    .unimestre-offline-alert {
      border: 1px solid var(--color-action-green);
      background: rgba(73, 209, 125, 0.08);
      color: var(--color-text-primary);
    }
    .unimestre-success-alert {
      border: 1px solid #10b981;
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
      font-weight: 500;
    }
    /* Estilos do Card de Metadados do Curso */
    .course-meta-card {
      margin-top: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .course-meta-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .course-meta-badge {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      color: #60a5fa;
      background: rgba(59, 130, 246, 0.15);
      padding: 2px 8px;
      border-radius: 4px;
    }
    .course-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
    }
    .course-meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .course-meta-label {
      color: var(--color-text-secondary);
      font-weight: 500;
    }
    .course-meta-val {
      font-weight: 600;
      color: var(--color-text-primary);
    }
    .val-highlight {
      color: #38bdf8 !important;
    }
    /* Faixa de edição de curso pelo Admin */
    .course-edit-strip {
      margin-top: 8px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-end;
    }
    .field-compact {
      margin: 0;
      flex: 1;
      min-width: 220px;
    }
    .field-label-sm {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-bottom: 4px;
      display: block;
    }
    .input-sm {
      height: 34px;
      font-size: 13px;
      padding: 4px 10px;
    }
    .button-sm {
      height: 34px;
      padding: 4px 12px;
      font-size: 13px;
    }
    .course-edit-actions {
      display: flex;
      align-items: flex-end;
    }
    /* Painel do Gerenciador Geral */
    .unimestre-manager-panel {
      border-color: #3b82f6 !important;
      background: rgba(59, 130, 246, 0.02);
    }
    .manager-search-input {
      width: 320px;
      max-width: 100%;
    }
    .mt-1 {
      margin-top: 4px;
    }
    @media (max-width: 720px) {
      .unimestre-heading, .unimestre-students-heading, .manager-header {
        flex-direction: column;
      }
    .unimestre-no-courses-banner { display: flex; align-items: flex-start; gap: 14px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 8px; padding: 14px 18px; margin-top: 14px; }
    .unimestre-no-courses-banner .banner-icon { font-size: 24px; line-height: 1; }
    .unimestre-no-courses-banner .banner-text strong { display: block; font-size: 15px; color: #fbbf24; margin-bottom: 4px; }
    .unimestre-no-courses-banner .banner-text p { margin: 0 0 6px 0; font-size: 13px; color: var(--color-text); }
    .unimestre-no-courses-banner .banner-text p strong { color: #38bdf8; }
    .unimestre-no-courses-banner .banner-text small { display: block; font-size: 12px; color: var(--color-text-secondary); }
      .unimestre-status-grid, .unimestre-filter-controls {
        grid-template-columns: 1fr;
      }
      .course-edit-strip {
        flex-direction: column;
        align-items: stretch;
      }
    }
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
  coordinators: CoordinatorUser[] = []

  errorMessage = ''
  saveSuccessMessage = ''
  isLoading = false
  isLoadingCourses = false
  isLoadingClasses = false
  isLoadingStudents = false
  loadingStudentsKey = ''
  copiedAll = false
  copiedStudentId: string | null = null

  // Gerenciador de atribuição de cursos (Admin)
  showCourseSettingsManager = false
  courseManagerSearch = ''
  savingCourseId: string | null = null
  managerEdits: Record<string, { courseEmail: string; coordinatorEmail: string; coordinatorUserId: string }> = {}

  // Edição rápida do curso selecionado no filtro (Admin)
  selectedCourseEdit = {
    courseEmail: '',
    coordinatorEmail: '',
    coordinatorUserId: '',
  }
  isSavingSelectedSetting = false

  private copyTimeout?: ReturnType<typeof setTimeout>
  private successTimeout?: ReturnType<typeof setTimeout>

  get isCoordinationRoute(): boolean {
    return this.router.url.startsWith('/coordenacao')
  }

  get effectiveUser(): AuthUser | null {
    return this.sectorContextService.getEffectiveUser(this.router.url, this.authService.currentUser)
  }

  get currentUserEmail(): string {
    return this.effectiveUser?.email || ''
  }

  get currentUsername(): string {
    return this.effectiveUser?.username || ''
  }

  get isAdminRoute(): boolean {
    return !this.isCoordinationRoute
  }

  get isOfflineMode(): boolean {
    return Boolean(this.status && !this.status.unimestre?.reachable)
  }

  get selectedCourse(): UnimestreCourse | undefined {
    return this.courses.find((c) => c.id === this.courseId)
  }

  get classroomLink(): string {
    if (this.isCoordinationRoute) return '/coordenacao/classroom'
    if (this.router.url.startsWith('/desenvolvedor')) return '/desenvolvedor/classroom'
    return '/administracao/classroom'
  }

  get filteredCoursesForManager(): UnimestreCourse[] {
    const q = this.courseManagerSearch.trim().toLowerCase()
    if (!q) return this.courses
    return this.courses.filter(
      (c) => c.name.toLowerCase().includes(q) || String(c.id).toLowerCase().includes(q)
    )
  }

  private lastContextUserId: string | null = null

  constructor(
    private readonly unimestreService: UnimestreService,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly sectorContextService: SectorContextService,
  ) {
    effect(() => {
      const activeUser = this.sectorContextService.activeContextUser()
      const currentId = activeUser?.id ?? null
      if (this.isCoordinationRoute && this.lastContextUserId !== null && this.lastContextUserId !== currentId) {
        this.lastContextUserId = currentId
        untracked(() => {
          this.loadCourses()
        })
      } else {
        this.lastContextUserId = currentId
      }
    })
  }

  ngOnInit(): void {
    this.refresh()
    if (this.isAdminRoute) {
      this.loadCoordinators()
    }
  }

  refresh(): void {
    this.isLoading = true
    this.errorMessage = ''
    this.unimestreService
      .status()
      .pipe(finalize(() => { this.isLoading = false }))
      .subscribe({
        next: (status) => { this.status = status },
        error: () => { this.errorMessage = 'Não foi possível verificar as conexões externas.' },
      })
    this.loadCourses()
  }

  loadCoordinators(): void {
    this.unimestreService.getCoordinators().subscribe({
      next: (coords) => {
        this.coordinators = (coords || []).filter(
          (c) => !c.role || c.role.toLowerCase() === 'coordenacao',
        )
      },
      error: () => { /* silencioso caso rota não permita */ },
    })
  }

  filterCoursesForCurrentCoordinator(courses: UnimestreCourse[]): UnimestreCourse[] {
    const user = this.effectiveUser
    if (!user) return []
    const userEmail = (user.email || '').trim().toLowerCase()
    const userId = user.id

    return (courses || []).filter((c) => {
      if (c.coordinatorUserId && userId && c.coordinatorUserId === userId) {
        return true
      }
      const coordEmail = (c.coordinatorEmail || '').trim().toLowerCase()
      if (userEmail && coordEmail && coordEmail === userEmail) {
        return true
      }
      return false
    })
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
    this.unimestreService
      .courses(
        semester,
        this.isCoordinationRoute,
        this.isCoordinationRoute ? this.currentUserEmail : undefined,
        this.isCoordinationRoute ? this.effectiveUser?.id : undefined,
      )
      .pipe(finalize(() => { this.isLoadingCourses = false }))
      .subscribe({
        next: (courses) => {
          if (this.isCoordinationRoute) {
            this.courses = this.filterCoursesForCurrentCoordinator(courses)
          } else {
            this.courses = courses
          }
          this.initManagerEdits(courses)
        },
        error: () => {
          this.courses = []
          this.errorMessage = 'Não foi possível carregar os cursos ativos do Unimestre.'
        },
      })
  }

  private initManagerEdits(courses: UnimestreCourse[]): void {
    this.managerEdits = {}
    for (const c of courses) {
      this.managerEdits[c.id] = {
        courseEmail: c.courseEmail || '',
        coordinatorEmail: c.coordinatorEmail || '',
        coordinatorUserId: c.coordinatorUserId || '',
      }
    }
  }

  onCourseChange(): void {
    const course = this.selectedCourse
    if (course) {
      this.selectedCourseEdit = {
        courseEmail: course.courseEmail || '',
        coordinatorEmail: course.coordinatorEmail || '',
        coordinatorUserId: course.coordinatorUserId || '',
      }
    }
  }

  onSelectedCourseCoordinatorChange(): void {
    const selected = this.coordinators.find((c) => c.id === this.selectedCourseEdit.coordinatorUserId)
    if (selected) {
      this.selectedCourseEdit.coordinatorEmail = selected.email
    }
  }

  onManagerCoordinatorChange(courseId: string): void {
    const edit = this.managerEdits[courseId]
    if (!edit) return
    const selected = this.coordinators.find((c) => c.id === edit.coordinatorUserId)
    if (selected) {
      edit.coordinatorEmail = selected.email
    }
  }

  saveSelectedCourseSetting(): void {
    const course = this.selectedCourse
    if (!course) return

    this.isSavingSelectedSetting = true
    this.errorMessage = ''
    this.unimestreService
      .updateCourseSetting(course.id, {
        courseName: course.name,
        courseEmail: this.selectedCourseEdit.courseEmail.trim() || null,
        coordinatorEmail: this.selectedCourseEdit.coordinatorEmail.trim() || null,
        coordinatorUserId: this.selectedCourseEdit.coordinatorUserId || null,
      })
      .pipe(finalize(() => { this.isSavingSelectedSetting = false }))
      .subscribe({
        next: (updated) => {
          course.courseEmail = updated.courseEmail
          course.coordinatorEmail = updated.coordinatorEmail
          course.coordinatorUserId = updated.coordinatorUserId
          course.coordinatorName = updated.coordinatorUser?.username || null
          this.managerEdits[course.id] = {
            courseEmail: updated.courseEmail || '',
            coordinatorEmail: updated.coordinatorEmail || '',
            coordinatorUserId: updated.coordinatorUserId || '',
          }
          this.showSuccess(`✓ Vínculo do curso "${course.name}" atualizado com sucesso!`)
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao salvar configuração do curso.'
        },
      })
  }

  saveManagerCourseSetting(course: UnimestreCourse): void {
    const edit = this.managerEdits[course.id]
    if (!edit) return

    this.savingCourseId = course.id
    this.errorMessage = ''
    this.unimestreService
      .updateCourseSetting(course.id, {
        courseName: course.name,
        courseEmail: edit.courseEmail.trim() || null,
        coordinatorEmail: edit.coordinatorEmail.trim() || null,
        coordinatorUserId: edit.coordinatorUserId || null,
      })
      .pipe(finalize(() => { this.savingCourseId = null }))
      .subscribe({
        next: (updated) => {
          course.courseEmail = updated.courseEmail
          course.coordinatorEmail = updated.coordinatorEmail
          course.coordinatorUserId = updated.coordinatorUserId
          course.coordinatorName = updated.coordinatorUser?.username || null
          if (this.courseId === course.id) {
            this.selectedCourseEdit = { ...edit }
          }
          this.showSuccess(`✓ Vínculo do curso "${course.name}" salvo com sucesso!`)
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao salvar vínculo do curso.'
        },
      })
  }

  toggleCourseSettingsManager(): void {
    this.showCourseSettingsManager = !this.showCourseSettingsManager
  }

  private showSuccess(msg: string): void {
    this.saveSuccessMessage = msg
    if (this.successTimeout) clearTimeout(this.successTimeout)
    this.successTimeout = setTimeout(() => {
      this.saveSuccessMessage = ''
    }, 4000)
  }

  loadClasses(): void {
    if (!this.semester || !this.courseId) return
    this.isLoadingClasses = true
    this.classes = []
    this.selectedClass = null
    this.students = []
    this.unimestreService
      .classes(
        this.semester,
        this.courseId,
        this.isCoordinationRoute,
        this.isCoordinationRoute ? this.currentUserEmail : undefined,
        this.isCoordinationRoute ? this.effectiveUser?.id : undefined,
      )
      .pipe(finalize(() => { this.isLoadingClasses = false }))
      .subscribe({
        next: (classes) => { this.classes = classes },
        error: (error) => { this.errorMessage = error.error?.message || 'Não foi possível consultar as turmas do Unimestre.' },
      })
  }

  loadStudents(item: UnimestreClass): void {
    if (!this.semester || !this.courseId || !item.subjectId || !item.classGroup) return
    this.loadingStudentsKey = `${item.classGroup}_${item.subjectId}`
    this.isLoadingStudents = true
    this.selectedClass = item
    this.students = []
    this.unimestreService
      .students(
        this.semester,
        this.courseId,
        item.subjectId,
        item.classGroup,
        this.isCoordinationRoute,
        this.isCoordinationRoute ? this.currentUserEmail : undefined,
        this.isCoordinationRoute ? this.effectiveUser?.id : undefined,
      )
      .pipe(finalize(() => { this.isLoadingStudents = false; this.loadingStudentsKey = '' }))
      .subscribe({
        next: (students) => { this.students = students },
        error: (error) => { this.errorMessage = error.error?.message || 'Não foi possível carregar a lista de alunos.' },
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

  classroomParamsWithStudents(item: UnimestreClass) {
    return {
      ...this.classroomParams(item),
      autoLoadStudents: 'true',
    }
  }

  async copyAllEmails(): Promise<void> {
    const emails = this.students.map((s) => s.email?.trim()).filter((e): e is string => Boolean(e))
    if (!emails.length) return
    try {
      await navigator.clipboard.writeText(emails.join(', '))
      this.copiedAll = true
      if (this.copyTimeout) clearTimeout(this.copyTimeout)
      this.copyTimeout = setTimeout(() => { this.copiedAll = false }, 3000)
    } catch {
      this.errorMessage = 'Não foi possível copiar os e-mails para a área de transferência.'
    }
  }

  async copyStudentEmail(email: string, studentId: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(email.trim())
      this.copiedStudentId = studentId
      setTimeout(() => {
        if (this.copiedStudentId === studentId) this.copiedStudentId = null
      }, 2000)
    } catch {
      this.errorMessage = 'Não foi possível copiar o e-mail.'
    }
  }

  private currentSemester(): string {
    const now = new Date()
    return `${now.getFullYear()}${now.getMonth() < 6 ? '1' : '2'}`
  }
}
