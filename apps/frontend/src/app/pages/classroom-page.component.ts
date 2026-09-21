import { CommonModule } from '@angular/common'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, effect, untracked } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { finalize } from 'rxjs'
import { AuthService, type AuthUser } from '../services/auth.service'
import { SectorContextService } from '../services/sector-context.service'
import { UnimestreService, type UnimestreCourse, type UnimestreClass } from '../services/unimestre.service'

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

interface GoogleTeacher {
  id: string
  name: string | null
  email: string | null
}

interface GoogleCourse {
  id: string
  name: string
  section: string | null
  descriptionHeading: string | null
  alternateLink: string | null
  courseState: string | null
  teachers: GoogleTeacher[]
  cached?: boolean
}

interface GoogleStatus {
  configured: boolean
  authType?: 'oauth2' | 'service_account' | null
  authUrl?: string | null
  cachedCoursesCount?: number
  message: string | null
}
interface ImportResponse { total: number; sucesso: number; ignorados: number; erros: number }

@Component({
  selector: 'app-classroom-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="classroom-page" aria-labelledby="classroom-title">
      <header class="classroom-heading">
        <div>
          <p class="hero-eyebrow">{{ isCoordinationRoute ? 'Coordenação Acadêmica' : 'Administrador / Master' }}</p>
          <h1 id="classroom-title">{{ isCoordinationRoute ? 'Google Classroom — Minhas Salas' : 'Google Classroom' }}</h1>
          <p>
            {{
              isCoordinationRoute
                ? 'Crie salas das suas turmas e sincronize co-professores (coordenador, e-mail do curso e docente) e alunos.'
                : 'Crie salas e sincronize docentes e alunos usando a integração institucional do Google Workspace.'
            }}
          </p>
        </div>
        <button class="button button-secondary" type="button" (click)="testConnection()" [disabled]="isTesting || !googleStatus?.configured">
          {{ isTesting ? 'Verificando…' : 'Verificar conexão Google' }}
        </button>
      </header>

      <div class="classroom-connection" [class.classroom-connection-ok]="googleStatus?.configured" [class.error-message]="googleStatus && !googleStatus.configured" role="status">
        <div class="classroom-connection-info">
          @if (googleStatus?.configured) {
            Integração Google configurada {{ googleStatus?.authType === 'oauth2' ? '(via OAuth 2.0)' : '(via Conta de Serviço)' }}. A verificação consulta os cursos ativos do Classroom.
          } @else {
            {{ googleStatus?.message || 'Verificando a configuração Google…' }}
          }
        </div>
        @if (!googleStatus?.configured && googleStatus?.authUrl) {
          <div class="classroom-oauth-actions">
            <button class="button button-primary" type="button" (click)="connectGoogle()">
              Conectar conta Google Workspace
            </button>
            <button class="button button-text" type="button" (click)="toggleCodeInput()">
              {{ showCodeInput ? 'Ocultar código manual' : 'Inserir código manualmente' }}
            </button>
          </div>
        }
      </div>

      @if (showCodeInput && !googleStatus?.configured) {
        <div class="card card-outlined classroom-code-box">
          <h3>Autorização manual do Google</h3>
          <p>Clique em "Conectar conta Google Workspace", faça login com a conta institucional e cole o código de autorização abaixo:</p>
          <div class="classroom-code-form">
            <input class="field-control" placeholder="Cole o código de autorização aqui (ex: 4/0A...)" [(ngModel)]="authCode" />
            <button class="button button-secondary" type="button" (click)="submitAuthCode()" [disabled]="isSubmittingCode || !authCode.trim()">
              {{ isSubmittingCode ? 'Validando…' : 'Vincular código' }}
            </button>
          </div>
        </div>
      }

      @if (connectionMessage) { <p class="classroom-connection classroom-connection-ok" role="status">{{ connectionMessage }}</p> }
      @if (errorMessage) { <p class="error-message" role="alert">{{ errorMessage }}</p> }

      <!-- Seção: Criar Sala Acadêmica -->
      <section class="card card-outlined classroom-section" aria-labelledby="create-room-title">
        <div class="classroom-section-header">
          <h2 id="create-room-title">Criar sala acadêmica</h2>
          <p>Selecione o curso e disciplina do Unimestre para preenchimento automático, ou informe manualmente.</p>
        </div>

        <!-- Seletor Rápido do Unimestre (Cursos, Disciplinas e Professores) -->
        <div class="unimestre-assistant-box card card-outlined">
          <div class="unimestre-assistant-header">
            <span class="unimestre-assistant-title">📚 Seleção Acadêmica do Unimestre (Disciplinas & Docentes)</span>
            @if (isLoadingUnimestreCourses || isLoadingUnimestreClasses) {
              <small class="unimestre-loading-tag">Carregando dados…</small>
            }
          </div>
          <div class="unimestre-assistant-grid">
            <div class="field" style="margin: 0;">
              <label class="field-label" for="unimestre-course-select">Curso</label>
              <select
                id="unimestre-course-select"
                class="field-control"
                [(ngModel)]="selectedCourseId"
                (change)="onCourseChange()"
                [disabled]="isLoadingUnimestreCourses || (isCoordinationRoute && unimestreCourses.length === 0)"
              >
                <option value="">
                  {{
                    isLoadingUnimestreCourses
                      ? 'Carregando cursos…'
                      : (isCoordinationRoute && unimestreCourses.length === 0)
                        ? 'Nenhum curso vinculado à sua coordenação'
                        : 'Selecione um curso'
                  }}
                </option>
                @for (c of unimestreCourses; track c.id) {
                  <option [value]="c.id">{{ c.name }} ({{ c.id }}){{ c.offered ? ' — Ofertado' : '' }}</option>
                }
              </select>
            </div>

            <div class="field" style="margin: 0;">
              <label class="field-label" for="unimestre-class-select">Disciplina / Turma / Professor</label>
              <select
                id="unimestre-class-select"
                class="field-control"
                [(ngModel)]="selectedClassKey"
                (change)="onClassChange()"
                [disabled]="!selectedCourseId || isLoadingUnimestreClasses"
              >
                <option value="">{{ !selectedCourseId ? 'Selecione um curso primeiro' : (isLoadingUnimestreClasses ? 'Carregando turmas e docentes…' : 'Selecione a disciplina/turma') }}</option>
                @for (item of unimestreClasses; track item.classGroup + '_' + item.subjectId) {
                  <option [value]="item.classGroup + '_' + item.subjectId">
                    {{ item.classGroup }} · {{ item.subjectName }} (Prof. {{ item.teacherName }})
                  </option>
                }
              </select>
            </div>
          </div>

          @if (isCoordinationRoute && !isLoadingUnimestreCourses && unimestreCourses.length === 0) {
            <div class="unimestre-no-courses-banner" role="alert">
              <span class="banner-icon">⚠️</span>
              <div class="banner-text">
                <strong>Nenhum curso vinculado à sua coordenação</strong>
                <p>
                  O seu e-mail institucional <strong>({{ currentUserEmail || currentUsername }})</strong> não possui nenhum curso acadêmico vinculado no momento.
                </p>
                <small>Solicite ao Administrador o vínculo do seu e-mail aos cursos que você coordena.</small>
              </div>
            </div>
          }

          @if (selectedCourse) {
            <div class="unimestre-assistant-meta">
              <span class="meta-tag">🎓 E-mail institucional do Curso: <strong>{{ selectedCourse.courseEmail || 'Não definido' }}</strong></span>
              <span class="meta-tag">👤 Coordenador: <strong>{{ selectedCourse.coordinatorEmail || 'Não vinculado' }}</strong></span>
              <small class="meta-help">O Docente, o Coordenador e o E-mail do Curso serão vinculados como professores da sala no Google Classroom automaticamente.</small>
            </div>
          }
        </div>

        <form class="classroom-form" (ngSubmit)="createRoom()">
          <div class="field">
            <label class="field-label" for="semester">Período</label>
            <input id="semester" class="field-control" required maxlength="16" [(ngModel)]="roomForm.semester" (change)="loadUnimestreCourses()" name="semester" placeholder="20262" />
          </div>
          <div class="field">
            <label class="field-label" for="academic-course">Código do curso</label>
            <input id="academic-course" class="field-control" required maxlength="64" [(ngModel)]="roomForm.academicCourseId" name="academicCourseId" />
          </div>
          <div class="field">
            <label class="field-label" for="subject-id">Código da disciplina</label>
            <input id="subject-id" class="field-control" required maxlength="64" [(ngModel)]="roomForm.subjectId" name="subjectId" />
          </div>
          <div class="field">
            <label class="field-label" for="class-group">Turma</label>
            <input id="class-group" class="field-control" required maxlength="64" [(ngModel)]="roomForm.classGroup" name="classGroup" />
          </div>
          <div class="field classroom-form-wide">
            <label class="field-label" for="subject-name">Nome da disciplina</label>
            <input id="subject-name" class="field-control" required maxlength="180" [(ngModel)]="roomForm.subjectName" name="subjectName" />
          </div>
          <div class="field classroom-form-wide">
            <label class="field-label" for="teacher-email">E-mail institucional do professor</label>
            <input id="teacher-email" class="field-control" type="email" required maxlength="254" [(ngModel)]="roomForm.teacherEmail" name="teacherEmail" placeholder="professor@exemplo.edu.br" />
          </div>
          <div class="field classroom-form-wide classroom-students-toggle">
            <label class="classroom-checkbox-label">
              <input type="checkbox" [(ngModel)]="includeStudentsOnCreate" name="includeStudentsOnCreate" />
              <span>
                Incluir alunos automaticamente ao criar a sala
                @if (isLoadingFormStudents) {
                  <em>(buscando alunos no Unimestre…)</em>
                } @else if (loadedStudentEmails.length > 0) {
                  <strong class="students-count-tag">({{ loadedStudentEmails.length }} aluno(s) encontrado(s) no Unimestre)</strong>
                } @else if (roomForm.subjectId && roomForm.classGroup) {
                  <small class="unimestre-muted">(nenhum aluno localizado para esta turma)</small>
                }
              </span>
            </label>
          </div>

          <div style="grid-column: 1 / -1; display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.85rem; border-radius: 8px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); font-size: 0.8rem; color: #bae6fd; margin-bottom: 0.5rem;">
            <span>⚡ <strong>Provisionamento Google Workspace ativo:</strong> Docentes e alunos terão suas contas institucionais verificadas/criadas automaticamente com senha padrão e troca obrigatória no primeiro acesso ao Classroom.</span>
          </div>

          <button class="button button-primary classroom-submit" type="submit" [disabled]="isCreating || !googleStatus?.configured">
            {{ isCreating ? 'Criando e sincronizando…' : (includeStudentsOnCreate && loadedStudentEmails.length > 0 ? 'Criar sala com professor e ' + loadedStudentEmails.length + ' alunos' : 'Criar sala e incluir professor') }}
          </button>
        </form>
      </section>

      <!-- Seção: Salas do Google Classroom e Sincronizadas -->
      <section class="card card-outlined classroom-section" aria-labelledby="rooms-title">
        <div class="classroom-section-header classroom-list-header">
          <div>
            <h2 id="rooms-title">Salas e Turmas</h2>
            <p>
              @if (selectedCourse) {
                Salas ativas no Google Classroom filtradas para o curso <strong>{{ selectedCourse.name }}</strong> ({{ activeTab === 'google' ? filteredGoogleCourses.length : filteredRooms.length }} sala(s)).
              } @else {
                Salas ativas no Google Classroom com disciplinas, turmas e professores vinculados.
              }
            </p>
          </div>
          <div class="classroom-header-actions">
            @if (selectedCourse) {
              <button
                class="button button-text"
                type="button"
                (click)="selectedCourseId = ''; onCourseChange()"
                title="Mostrar todas as disciplinas de todos os cursos"
              >
                ✕ Ver todas as disciplinas
              </button>
            }
            <input
              class="field-control classroom-search-input"
              type="search"
              placeholder="🔍 Filtrar sala, disciplina ou professor…"
              [(ngModel)]="googleSearch"
            />
            <button class="button button-secondary" type="button" (click)="loadGoogleCourses(); loadRooms()" [disabled]="isLoadingGoogleCourses || isLoadingRooms">
              {{ isLoadingGoogleCourses ? 'Consultando…' : 'Atualizar salas' }}
            </button>
          </div>
        </div>

        <!-- Abas de Navegação -->
        <div class="classroom-tabs">
          <button
            type="button"
            class="button"
            [class.button-primary]="activeTab === 'google'"
            [class.button-secondary]="activeTab !== 'google'"
            (click)="activeTab = 'google'"
          >
            Google Classroom ({{ filteredGoogleCourses.length }})
          </button>
          <button
            type="button"
            class="button"
            [class.button-primary]="activeTab === 'synced'"
            [class.button-secondary]="activeTab !== 'synced'"
            (click)="activeTab = 'synced'"
          >
            Sincronizadas no UniCore ({{ filteredRooms.length }})
          </button>
        </div>

        @if (activeTab === 'google') {
          @if (isLoadingGoogleCourses) {
            <p class="classroom-empty">Consultando salas no Google Classroom…</p>
          } @else if (filteredGoogleCourses.length === 0) {
            <div class="unimestre-no-courses-banner" role="alert">
              <span class="banner-icon">ℹ️</span>
              <div class="banner-text">
                <strong>
                  {{
                    googleSearch
                      ? 'Nenhuma sala corresponde à busca'
                      : selectedCourse
                        ? 'Nenhuma sala encontrada para o curso ' + selectedCourse.name
                        : (isCoordinationRoute ? 'Nenhuma sala vinculada à sua coordenação' : 'Nenhuma sala encontrada')
                  }}
                </strong>
                <p>
                  {{
                    googleSearch
                      ? 'Nenhuma sala ativa corresponde ao filtro "' + googleSearch + '".'
                      : selectedCourse
                        ? 'Não foram localizadas salas ativas no Google Classroom vinculadas ao curso ' + selectedCourse.name + '.'
                        : isCoordinationRoute
                          ? 'O seu e-mail institucional (' + (currentUserEmail || currentUsername) + ') não possui salas no Google Classroom vinculadas aos cursos sob sua coordenação.'
                          : 'Nenhuma sala ativa encontrada no Google Classroom para esta conta.'
                  }}
                </p>
                @if (selectedCourse) {
                  <small>Selecione "Selecione um curso" na caixa de seleção acima para visualizar todas as disciplinas.</small>
                } @else if (isCoordinationRoute) {
                  <small>Quando houver salas do Google Classroom vinculadas ao seu e-mail institucional ou aos cursos que você coordena, elas aparecerão listadas aqui.</small>
                }
              </div>
            </div>
          } @else {
            <div class="classroom-room-grid">
              @for (gc of filteredGoogleCourses; track gc.id) {
                <article class="classroom-room">
                  <div class="classroom-room-title">
                    <div>
                      <h3>{{ gc.name }}</h3>
                      @if (gc.section) {
                        <p class="classroom-section-tag">Turma / Termo: {{ gc.section }}</p>
                      }
                      <small class="classroom-id-sub">ID: {{ gc.id }}</small>
                    </div>
                    <span class="classroom-status" [attr.data-status]="gc.cached ? 'CACHED' : gc.courseState">
                      {{ gc.cached ? 'Salvo localmente' : (gc.courseState === 'ACTIVE' ? 'Ativa' : gc.courseState) }}
                    </span>
                  </div>

                  <div class="classroom-teachers-box">
                    <span class="teachers-label">Professores:</span>
                    @if (gc.teachers && gc.teachers.length > 0) {
                      <ul class="teachers-list">
                        @for (t of gc.teachers; track t.id) {
                          <li>
                            <strong>{{ t.name || 'Docente' }}</strong>
                            @if (t.email) {
                              <small>({{ t.email }})</small>
                            }
                          </li>
                        }
                      </ul>
                    } @else {
                      <span class="no-teachers">Nenhum professor registrado nesta sala</span>
                    }
                  </div>

                  <div class="classroom-students-box">
                    <div class="students-box-header">
                      <span class="teachers-label">Alunos matriculados:</span>
                      <button
                        type="button"
                        class="button button-text toggle-students-btn"
                        (click)="toggleCourseStudents(gc.id)"
                      >
                        {{ expandedCourseStudents[gc.id] ? '▲ Ocultar alunos' : '▼ Ver alunos' }}
                      </button>
                    </div>
                    @if (expandedCourseStudents[gc.id]) {
                      @if (loadingCourseStudents[gc.id]) {
                        <small class="unimestre-muted">Consultando alunos no Google Classroom…</small>
                      } @else if (courseStudents[gc.id] && courseStudents[gc.id].length > 0) {
                        <ul class="students-list">
                          @for (st of courseStudents[gc.id]; track st.id) {
                            <li>
                              <strong>{{ st.name || 'Aluno' }}</strong>
                              @if (st.email) {
                                <small>({{ st.email }})</small>
                              }
                            </li>
                          }
                        </ul>
                      } @else {
                        <span class="no-teachers">Nenhum aluno matriculado nesta sala do Classroom.</span>
                      }
                    }
                  </div>

                  <div class="classroom-card-footer">
                    @if (gc.alternateLink) {
                      <a class="action-link classroom-link" [href]="gc.alternateLink" target="_blank" rel="noopener">
                        Abrir no Google Classroom ↗
                      </a>
                    }
                    <button
                      type="button"
                      class="button button-text copy-btn"
                      (click)="useGoogleCourseInForm(gc)"
                      title="Copiar nome e turma para o formulário de criação"
                    >
                      Copiar dados
                    </button>
                  </div>
                </article>
              } @empty {
                <p class="classroom-empty">
                  @if (googleCourses.length === 0) {
                    Nenhuma sala ativa encontrada no Google Classroom para esta conta.
                  } @else {
                    Nenhuma sala corresponde ao filtro "{{ googleSearch }}".
                  }
                </p>
              }
            </div>
          }
        } @else {
          <!-- Salas Sincronizadas no UniCore -->
          @if (isLoadingRooms) {
            <p class="classroom-empty">Carregando salas…</p>
          } @else if (filteredRooms.length === 0) {
            <div class="unimestre-no-courses-banner" role="alert">
              <span class="banner-icon">ℹ️</span>
              <div class="banner-text">
                <strong>
                  {{
                    googleSearch
                      ? 'Nenhuma sala sincronizada corresponde à busca'
                      : selectedCourse
                        ? 'Nenhuma sala sincronizada para o curso ' + selectedCourse.name
                        : (isCoordinationRoute ? 'Nenhuma sala sincronizada vinculada à sua coordenação' : 'Nenhuma sala sincronizada encontrada')
                  }}
                </strong>
                <p>
                  {{
                    googleSearch
                      ? 'Nenhuma sala sincronizada corresponde ao filtro "' + googleSearch + '".'
                      : selectedCourse
                        ? 'Nenhuma sala do Google Classroom foi sincronizada ainda no UniCore para o curso ' + selectedCourse.name + '.'
                        : isCoordinationRoute
                          ? 'Nenhuma sala do Google Classroom foi sincronizada ainda para os cursos vinculados à sua coordenação (' + (currentUserEmail || currentUsername) + ').'
                          : 'Nenhuma sala sincronizada encontrada no UniCore.'
                  }}
                </p>
                @if (selectedCourse) {
                  <small>Selecione "Selecione um curso" na caixa de seleção acima para visualizar todas as salas sincronizadas.</small>
                }
              </div>
            </div>
          } @else {
            <div class="classroom-room-grid">
              @for (room of filteredRooms; track room.id) {
              <article class="classroom-room">
                <div class="classroom-room-title">
                  <div>
                    <h3>{{ room.subjectName }}</h3>
                    <p>{{ room.semester }} · Curso {{ room.academicCourseId }} · Turma {{ room.classGroup }}</p>
                  </div>
                  <span class="classroom-status" [attr.data-status]="room.status">{{ statusLabel(room.status) }}</span>
                </div>
                <p class="classroom-room-meta">Professor: <strong>{{ room.teacherEmail }}</strong></p>
                @if (room.alternateLink) { <a class="action-link classroom-link" [href]="room.alternateLink" target="_blank" rel="noopener">Abrir no Google Classroom ↗</a> }
                @if (room.lastMessage) { <p class="classroom-room-message">{{ room.lastMessage }}</p> }
                <div class="classroom-members">
                  <div class="classroom-members-header">
                    <label class="field-label" [for]="'students-' + room.id">Adicionar alunos</label>
                    <button
                      type="button"
                      class="button button-text pull-students-btn"
                      (click)="pullStudentsFromUnimestre(room)"
                      [disabled]="pullingStudentsRoomId === room.id"
                      title="Consultar alunos matriculados no Unimestre e preencher e-mails"
                    >
                      {{ pullingStudentsRoomId === room.id ? 'Puxando do Unimestre…' : '📥 Puxar alunos do Unimestre' }}
                    </button>
                  </div>
                  @if (pullFeedback[room.id]) {
                    <p class="pull-feedback" role="status">{{ pullFeedback[room.id] }}</p>
                  }
                  <textarea class="field-control" [id]="'students-' + room.id" rows="3" [name]="'students-' + room.id" placeholder="Um e-mail por linha ou separado por vírgula" [(ngModel)]="memberInputs[room.id]"></textarea>
                  <button class="button button-secondary" type="button" (click)="syncMembers(room)" [disabled]="syncingRoomId === room.id || !googleStatus?.configured">{{ syncingRoomId === room.id ? 'Sincronizando…' : 'Sincronizar participantes' }}</button>
                </div>
              </article>
            } @empty {
              <p class="classroom-empty">Nenhuma sala foi registrada no banco UniCore ainda.</p>
            }
          </div>
        }
      }
      </section>

      <!-- Importação em lote -->
      <section class="card card-outlined classroom-section" aria-labelledby="import-title">
        <div class="classroom-section-header">
          <h2 id="import-title">Importar professores em lote</h2>
          <p>Para salas existentes, envie uma planilha <code>.xlsx</code> com as colunas obrigatórias <strong>materia</strong> e <strong>professor</strong>; <strong>courseid</strong> é opcional.</p>
        </div>
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
    .classroom-header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .classroom-search-input { width: auto; min-width: 260px; padding: 6px 12px; font-size: 0.85rem; }
    .classroom-tabs { display: flex; gap: 10px; border-bottom: 1px solid var(--color-border); padding-bottom: 10px; }
    .classroom-form { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; align-items: end; }
    .classroom-form-wide { grid-column: span 2; }
    .classroom-submit { justify-self: start; }
    .classroom-connection { margin: 0; padding: 14px 16px; border: 1px solid var(--color-border); border-radius: 8px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
    .classroom-connection-info { flex: 1; min-width: 260px; }
    .classroom-connection-ok { border-color: var(--color-action-green); }
    .classroom-oauth-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .classroom-code-box { display: grid; gap: 12px; padding: 16px; margin-top: -12px; border-color: var(--color-border); }
    .classroom-code-box h3 { margin: 0; font-size: 16px; }
    .classroom-code-box p { margin: 0; font-size: 14px; color: var(--color-text-secondary); }
    .classroom-code-form { display: flex; gap: 10px; max-width: 650px; }
    .classroom-code-form input { flex: 1; }
    .classroom-room-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .classroom-room { display: flex; flex-direction: column; gap: 12px; padding: 16px; border: 1px solid var(--color-border); border-radius: 8px; background: rgba(255, 255, 255, 0.015); }
    .classroom-room h3 { font-size: 16px; line-height: 1.3; }
    .classroom-section-tag { color: var(--color-action-green); font-size: 13px; font-weight: 500; margin-top: 4px; }
    .classroom-id-sub { color: var(--color-text-secondary); font-size: 11px; }
    .classroom-status { padding: 3px 8px; border: 1px solid var(--color-border); border-radius: 999px; font-size: 11px; white-space: nowrap; height: fit-content; }
    .classroom-status[data-status="ACTIVE"], .classroom-status[data-status="CREATED"], .classroom-status[data-status="CACHED"] { border-color: var(--color-action-green); color: var(--color-action-green); }
    .classroom-status[data-status="FAILED"] { border-color: var(--color-error); }
    .classroom-status[data-status="CREATED_WITH_WARNINGS"] { border-color: #d6a700; }
    .classroom-teachers-box { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); padding: 8px 12px; border-radius: 6px; }
    .teachers-label { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); display: block; margin-bottom: 4px; }
    .teachers-list { margin: 0; padding-left: 1.2rem; font-size: 13px; display: flex; flex-direction: column; gap: 2px; }
    .teachers-list li small { color: var(--color-text-secondary); margin-left: 4px; }
    .no-teachers { font-size: 12px; color: var(--color-text-secondary); }
    .classroom-card-footer { display: flex; gap: 8px; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.05); }
    .classroom-link { font-size: 13px; color: var(--color-action-green); }
    .copy-btn { font-size: 12px; padding: 4px 8px; }
    .classroom-members { display: grid; gap: 8px; }
    .classroom-import-form { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    .classroom-import-result { margin: 0; }
    .unimestre-assistant-box { padding: 1rem; background: rgba(255, 255, 255, 0.02); margin-bottom: 1.25rem; border-color: rgba(73, 209, 125, 0.25); }
    .unimestre-assistant-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .unimestre-assistant-title { color: var(--color-action-green); font-size: 0.9rem; font-weight: 600; }
    .unimestre-loading-tag { color: var(--color-text-secondary); font-size: 0.8rem; }
    .unimestre-assistant-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
    .unimestre-assistant-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.06); }
    .unimestre-no-courses-banner { display: flex; align-items: flex-start; gap: 12px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 8px; padding: 12px 16px; margin-top: 12px; }
    .unimestre-no-courses-banner .banner-icon { font-size: 22px; line-height: 1; }
    .unimestre-no-courses-banner .banner-text strong { display: block; font-size: 14px; color: #fbbf24; margin-bottom: 2px; }
    .unimestre-no-courses-banner .banner-text p { margin: 0 0 4px 0; font-size: 13px; color: var(--color-text); }
    .unimestre-no-courses-banner .banner-text p strong { color: #38bdf8; }
    .unimestre-no-courses-banner .banner-text small { display: block; font-size: 11px; color: var(--color-text-secondary); }
    .meta-tag { font-size: 12px; color: var(--color-text-secondary); background: rgba(255, 255, 255, 0.03); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--color-border); }
    .meta-tag strong { color: #38bdf8; }
    .meta-help { font-size: 11px; color: var(--color-text-secondary); width: 100%; margin-top: 2px; }
    .classroom-students-toggle { display: flex; align-items: center; }
    .classroom-checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; user-select: none; }
    .classroom-checkbox-label input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--color-action-green); }
    .students-count-tag { color: var(--color-action-green); }
    .classroom-members-header { display: flex; justify-content: space-between; align-items: center; }
    .pull-students-btn { font-size: 12px; padding: 2px 6px; color: var(--color-action-green); }
    .pull-feedback { font-size: 12px; color: var(--color-action-green); margin: 0; }
    .classroom-students-box { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 8px 12px; border-radius: 6px; }
    .students-box-header { display: flex; justify-content: space-between; align-items: center; }
    .toggle-students-btn { font-size: 12px; padding: 0 4px; }
    .students-list { margin: 6px 0 0 0; padding-left: 1.2rem; font-size: 13px; display: flex; flex-direction: column; gap: 4px; max-height: 180px; overflow-y: auto; }
    .students-list li small { color: var(--color-text-secondary); margin-left: 4px; }
    @media (max-width: 850px) { .classroom-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }.classroom-heading { flex-direction: column; }.classroom-form-wide { grid-column: span 1; } }
    @media (max-width: 520px) { .classroom-form { grid-template-columns: 1fr; }.classroom-list-header, .classroom-room-title { flex-direction: column; }.classroom-submit { width: 100%; } }
  `],
})
export class ClassroomPageComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>
  readonly roomForm = {
    semester: this.currentSemester(),
    academicCourseId: '',
    subjectId: '',
    classGroup: '',
    subjectName: '',
    teacherEmail: '',
  }
  rooms: ClassroomRoom[] = []
  googleCourses: GoogleCourse[] = []
  isLoadingGoogleCourses = false
  googleSearch = ''
  activeTab: 'google' | 'synced' = 'google'

  // Seleção Acadêmica do Unimestre
  unimestreCourses: UnimestreCourse[] = []
  unimestreClasses: UnimestreClass[] = []
  selectedCourseId = ''
  selectedClassKey = ''
  isLoadingUnimestreCourses = false
  isLoadingUnimestreClasses = false

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
  showCodeInput = false
  authCode = ''
  isSubmittingCode = false

  // Alunos no Formulário de Criação
  loadedStudentEmails: string[] = []
  isLoadingFormStudents = false
  includeStudentsOnCreate = true

  // Puxar Alunos do Unimestre nas salas sincronizadas
  pullingStudentsRoomId: string | null = null
  pullFeedback: Record<string, string> = {}

  // Ver Alunos na aba Google Classroom
  expandedCourseStudents: Record<string, boolean> = {}
  loadingCourseStudents: Record<string, boolean> = {}
  courseStudents: Record<string, Array<{ id: string; name: string | null; email: string | null }>> = {}

  private messageListener?: (event: MessageEvent) => void

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

  get selectedCourse(): UnimestreCourse | undefined {
    return this.unimestreCourses.find((c) => String(c.id) === this.selectedCourseId)
  }

  private lastContextUserId: string | null = null

  constructor(
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly unimestreService: UnimestreService,
    private readonly authService: AuthService,
    private readonly sectorContextService: SectorContextService,
  ) {
    effect(() => {
      const activeUser = this.sectorContextService.activeContextUser()
      const currentId = activeUser?.id ?? null
      if (this.isCoordinationRoute && this.lastContextUserId !== null && this.lastContextUserId !== currentId) {
        this.lastContextUserId = currentId
        untracked(() => {
          this.loadUnimestreCourses()
          this.loadRooms()
        })
      } else {
        this.lastContextUserId = currentId
      }
    })
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap
    this.roomForm.semester = params.get('semester') || this.roomForm.semester
    this.roomForm.academicCourseId = params.get('academicCourseId') || ''
    this.roomForm.subjectId = params.get('subjectId') || ''
    this.roomForm.classGroup = params.get('classGroup') || ''
    this.roomForm.subjectName = params.get('subjectName') || ''
    this.roomForm.teacherEmail = params.get('teacherEmail') || ''

    if (params.get('googleConnected') === 'true') {
      this.connectionMessage = 'Conta Google vinculada com sucesso ao UniCore!'
    }

    if (this.roomForm.academicCourseId && this.roomForm.subjectId && this.roomForm.classGroup) {
      this.loadFormStudents()
    }

    this.messageListener = (event: MessageEvent) => {
      if (event.data?.type === 'google-auth-success') {
        this.connectionMessage = 'Conta Google vinculada com sucesso!'
        this.loadStatus()
        this.loadRooms()
        this.loadGoogleCourses()
      } else if (event.data?.type === 'google-auth-error') {
        this.errorMessage = `Erro ao autorizar Google: ${event.data.error}`
      }
    }
    window.addEventListener('message', this.messageListener)

    this.loadStatus()
    this.loadRooms()
    this.loadGoogleCourses()
    this.loadUnimestreCourses()
  }

  ngOnDestroy(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener)
    }
  }

  connectGoogle(): void {
    if (!this.googleStatus?.authUrl) return
    window.open(this.googleStatus.authUrl, 'googleAuth', 'width=600,height=700,status=yes,scrollbars=yes')
  }

  toggleCodeInput(): void {
    this.showCodeInput = !this.showCodeInput
  }

  submitAuthCode(): void {
    if (!this.authCode.trim()) return
    this.isSubmittingCode = true
    this.errorMessage = ''
    this.http.post<{ success: boolean; message: string }>('/api/classroom/google/exchange-code', { code: this.authCode.trim() })
      .pipe(finalize(() => { this.isSubmittingCode = false }))
      .subscribe({
        next: (res) => {
          this.connectionMessage = res.message || 'Conta Google autenticada com sucesso!'
          this.authCode = ''
          this.showCodeInput = false
          this.loadStatus()
          this.loadRooms()
          this.loadGoogleCourses()
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Código de autorização inválido ou expirado.'
        },
      })
  }

  loadStatus(): void {
    this.http.get<GoogleStatus>('/api/classroom/status').subscribe({
      next: (status) => {
        this.googleStatus = status
        if (status.configured) {
          this.loadGoogleCourses()
        }
      },
      error: (error) => {
        const message = error.error?.message || 'Não foi possível verificar a configuração Google.'
        this.googleStatus = { configured: false, message }
        this.errorMessage = message
      },
    })
  }

  loadRooms(): void {
    this.isLoadingRooms = true
    let params = new HttpParams()
    if (this.isCoordinationRoute) {
      params = params.set('coordinationOnly', 'true')
      if (this.currentUserEmail) {
        params = params.set('coordinatorEmail', this.currentUserEmail)
      }
      if (this.effectiveUser?.id) {
        params = params.set('coordinatorUserId', this.effectiveUser.id)
      }
    }
    this.http.get<ClassroomRoom[]>('/api/classroom/rooms', { params }).pipe(finalize(() => { this.isLoadingRooms = false })).subscribe({
      next: (rooms) => { this.rooms = rooms },
      error: () => { this.errorMessage = 'Não foi possível carregar as salas sincronizadas.' },
    })
  }

  filterGoogleCoursesForCurrentCoordinator(courses: GoogleCourse[]): GoogleCourse[] {
    const user = this.effectiveUser
    if (!user) return []
    const userEmail = (user.email || '').trim().toLowerCase()

    const myCoordinatedCourseIds = new Set(
      this.unimestreCourses.map((c) => String(c.id))
    )
    const myCoordinatedEmails = new Set<string>()
    if (userEmail) myCoordinatedEmails.add(userEmail)
    for (const c of this.unimestreCourses) {
      if (c.courseEmail?.trim()) myCoordinatedEmails.add(c.courseEmail.trim().toLowerCase())
      if (c.coordinatorEmail?.trim()) myCoordinatedEmails.add(c.coordinatorEmail.trim().toLowerCase())
    }

    return (courses || []).filter((c) => {
      // 1. O e-mail do usuário ou e-mail do curso está entre os professores da sala
      if ((c.teachers || []).some((t) => t.email && myCoordinatedEmails.has(t.email.trim().toLowerCase()))) {
        return true
      }
      // 2. Sala sincronizada vinculada a um dos cursos coordenados
      const syncedRoom = this.rooms.find((r) => r.googleCourseId === c.id)
      if (syncedRoom && myCoordinatedCourseIds.has(String(syncedRoom.academicCourseId))) {
        return true
      }
      // 3. Descrição / identificador contém o código do curso coordenado
      for (const cid of myCoordinatedCourseIds) {
        if ((c.descriptionHeading || '').includes(cid) || (c.name || '').includes(cid)) {
          return true
        }
      }
      return false
    })
  }

  loadGoogleCourses(): void {
    this.isLoadingGoogleCourses = true
    let params = new HttpParams()
    if (this.isCoordinationRoute) {
      params = params.set('coordinationOnly', 'true')
      if (this.currentUserEmail) {
        params = params.set('coordinatorEmail', this.currentUserEmail)
      }
      if (this.effectiveUser?.id) {
        params = params.set('coordinatorUserId', this.effectiveUser.id)
      }
    }
    this.http.get<GoogleCourse[]>('/api/classroom/courses', { params })
      .pipe(finalize(() => { this.isLoadingGoogleCourses = false }))
      .subscribe({
        next: (courses) => {
          if (this.isCoordinationRoute) {
            this.googleCourses = this.filterGoogleCoursesForCurrentCoordinator(courses)
          } else {
            this.googleCourses = courses
          }
          if (this.googleCourses.length > 0 && this.rooms.length === 0) {
            this.activeTab = 'google'
          }
        },
        error: () => {
          this.googleCourses = []
        },
      })
  }

  isGoogleCourseMatchingSelectedCourse(gc: GoogleCourse, course: UnimestreCourse): boolean {
    // 1. Sala sincronizada no UniCore vinculada a este curso
    const syncedRoom = this.rooms.find((r) => r.googleCourseId === gc.id)
    if (syncedRoom && String(syncedRoom.academicCourseId) === String(course.id)) {
      return true
    }

    // 2. E-mail do curso ou e-mail do coordenador nos professores da sala
    const emailsToMatch = new Set<string>()
    if (course.courseEmail?.trim()) emailsToMatch.add(course.courseEmail.trim().toLowerCase())
    if (course.coordinatorEmail?.trim()) emailsToMatch.add(course.coordinatorEmail.trim().toLowerCase())

    if (emailsToMatch.size > 0 && (gc.teachers || []).some((t) => t.email && emailsToMatch.has(t.email.trim().toLowerCase()))) {
      return true
    }

    // 3. Normalização de texto sem acentos
    const normalize = (val: string | null | undefined): string => {
      return (val || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
    }

    const normCourse = normalize(course.name)
    if (!normCourse) return false

    const text = [
      gc.name,
      gc.section,
      gc.descriptionHeading,
      ...(gc.teachers || []).map((t) => t.name || ''),
      ...(gc.teachers || []).map((t) => t.email || ''),
    ]
      .map(normalize)
      .join(' ')

    // Correspondência direta do nome completo do curso
    if (text.includes(normCourse)) {
      return true
    }

    const stopwords = new Set(['e', 'de', 'do', 'da', 'em', 'os', 'as', 'para', '-'])
    const words = normCourse.split(/[\s-]+/).filter((w) => w.length >= 3 && !stopwords.has(w))

    if (words.length > 1) {
      if (words.every((w) => text.includes(w))) {
        return true
      }
      if (words.length === 2 && words[0] === 'engenharia') {
        return text.includes('engenharia') && text.includes(words[1])
      }
      if (words[0] === 'arquitetura') {
        return text.includes('arquitetura')
      }
      if (words[0] === 'estetica') {
        return text.includes('estetica') || text.includes('cosmetica')
      }
    } else if (words.length === 1) {
      if (text.includes(words[0])) {
        return true
      }
    }

    if (normCourse.includes('administracao') && /\badm\b/.test(text)) {
      return true
    }

    return false
  }

  get filteredGoogleCourses(): GoogleCourse[] {
    let courses = this.googleCourses
    if (this.selectedCourse) {
      courses = courses.filter((gc) => this.isGoogleCourseMatchingSelectedCourse(gc, this.selectedCourse!))
    }
    const q = this.googleSearch.trim().toLowerCase()
    if (!q) return courses
    return courses.filter((c) => {
      const matchName = (c.name || '').toLowerCase().includes(q)
      const matchSection = (c.section || '').toLowerCase().includes(q)
      const matchTeacher = (c.teachers || []).some(
        (t) => (t.name || '').toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q)
      )
      return matchName || matchSection || matchTeacher
    })
  }

  get filteredRooms(): ClassroomRoom[] {
    let list = this.rooms
    if (this.selectedCourseId) {
      list = list.filter((r) => String(r.academicCourseId) === String(this.selectedCourseId))
    }
    const q = this.googleSearch.trim().toLowerCase()
    if (!q) return list
    return list.filter((r) => {
      const matchSubject = (r.subjectName || '').toLowerCase().includes(q)
      const matchGroup = (r.classGroup || '').toLowerCase().includes(q)
      const matchTeacher = (r.teacherEmail || '').toLowerCase().includes(q)
      const matchCourse = (r.academicCourseId || '').toLowerCase().includes(q)
      return matchSubject || matchGroup || matchTeacher || matchCourse
    })
  }

  useGoogleCourseInForm(course: GoogleCourse): void {
    this.roomForm.subjectName = course.name || ''
    this.roomForm.classGroup = course.section || ''
    if (course.teachers && course.teachers.length > 0 && course.teachers[0].email) {
      this.roomForm.teacherEmail = course.teachers[0].email
    }
    if (!this.selectedCourseId) {
      const matched = this.unimestreCourses.find((c) => this.isGoogleCourseMatchingSelectedCourse(course, c))
      if (matched) {
        this.selectedCourseId = String(matched.id)
        this.onCourseChange()
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  loadUnimestreCourses(): void {
    if (!this.roomForm.semester) return
    this.isLoadingUnimestreCourses = true
    this.unimestreService
      .courses(
        this.roomForm.semester,
        this.isCoordinationRoute,
        this.isCoordinationRoute ? this.currentUserEmail : undefined,
        this.isCoordinationRoute ? this.effectiveUser?.id : undefined,
      )
      .pipe(finalize(() => { this.isLoadingUnimestreCourses = false }))
      .subscribe({
        next: (courses) => {
          if (this.isCoordinationRoute) {
            this.unimestreCourses = this.filterCoursesForCurrentCoordinator(courses)
          } else {
            this.unimestreCourses = courses
          }
          this.loadGoogleCourses()
        },
        error: () => {
          this.unimestreCourses = []
          this.loadGoogleCourses()
        },
      })
  }

  onCourseChange(): void {
    this.roomForm.academicCourseId = this.selectedCourseId
    this.unimestreClasses = []
    this.selectedClassKey = ''
    if (!this.selectedCourseId || !this.roomForm.semester) return

    this.isLoadingUnimestreClasses = true
    this.unimestreService
      .classes(
        this.roomForm.semester,
        this.selectedCourseId,
        this.isCoordinationRoute,
        this.isCoordinationRoute ? this.currentUserEmail : undefined,
        this.isCoordinationRoute ? this.effectiveUser?.id : undefined,
      )
      .pipe(finalize(() => { this.isLoadingUnimestreClasses = false }))
      .subscribe({
        next: (classes) => {
          this.unimestreClasses = classes
        },
        error: () => {
          this.unimestreClasses = []
        },
      })
  }

  onClassChange(): void {
    const found = this.unimestreClasses.find((c) => `${c.classGroup}_${c.subjectId}` === this.selectedClassKey)
    if (found) {
      this.roomForm.subjectId = String(found.subjectId)
      this.roomForm.classGroup = found.classGroup
      this.roomForm.subjectName = found.subjectName
      this.roomForm.teacherEmail = found.teacherEmail || ''
      this.loadFormStudents()
    }
  }

  loadFormStudents(): void {
    if (!this.roomForm.semester || !this.roomForm.academicCourseId || !this.roomForm.subjectId || !this.roomForm.classGroup) {
      this.loadedStudentEmails = []
      return
    }
    this.isLoadingFormStudents = true
    this.unimestreService
      .students(
        this.roomForm.semester,
        this.roomForm.academicCourseId,
        this.roomForm.subjectId,
        this.roomForm.classGroup,
        this.isCoordinationRoute,
        this.isCoordinationRoute ? this.currentUserEmail : undefined,
        this.isCoordinationRoute ? this.effectiveUser?.id : undefined,
      )
      .pipe(finalize(() => { this.isLoadingFormStudents = false }))
      .subscribe({
        next: (students) => {
          this.loadedStudentEmails = students.map((s) => s.email?.trim()).filter((e): e is string => Boolean(e))
        },
        error: () => {
          this.loadedStudentEmails = []
        },
      })
  }

  testConnection(): void {
    this.isTesting = true
    this.errorMessage = ''
    this.connectionMessage = ''
    this.http.get<GoogleCourse[]>('/api/classroom/courses').pipe(finalize(() => { this.isTesting = false })).subscribe({
      next: (courses) => {
        this.googleCourses = courses
        this.connectionMessage = `Conexão confirmada: ${courses.length} sala(s) ativa(s) encontrada(s) no Google Classroom com disciplinas e docentes.`
      },
      error: (error) => { this.errorMessage = error.error?.message || 'Não foi possível conectar ao Google Classroom.' },
    })
  }

  createRoom(): void {
    this.isCreating = true
    this.errorMessage = ''
    const payload = {
      ...this.roomForm,
      studentEmails: this.includeStudentsOnCreate && this.loadedStudentEmails.length > 0
        ? this.loadedStudentEmails
        : undefined,
    }
    this.http.post<{ room: ClassroomRoom; created: boolean; warnings: string[] }>('/api/classroom/rooms', payload)
      .pipe(finalize(() => { this.isCreating = false }))
      .subscribe({
        next: (result) => {
          this.connectionMessage = result.created ? 'Sala criada e registrada no UniCore.' : 'Esta sala já estava registrada no UniCore.'
          if (result.warnings.length) this.connectionMessage += ` Avisos: ${result.warnings.join(' ')}`
          this.resetRoomForm()
          this.loadRooms()
          this.loadGoogleCourses()
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

  pullStudentsFromUnimestre(room: ClassroomRoom): void {
    this.pullingStudentsRoomId = room.id
    this.pullFeedback[room.id] = ''
    this.unimestreService.students(room.semester, room.academicCourseId, room.subjectId, room.classGroup)
      .pipe(finalize(() => { this.pullingStudentsRoomId = null }))
      .subscribe({
        next: (students) => {
          const emails = students.map((s) => s.email?.trim()).filter((e): e is string => Boolean(e))
          if (emails.length > 0) {
            this.memberInputs[room.id] = emails.join('\n')
            this.pullFeedback[room.id] = `✓ ${emails.length} aluno(s) puxado(s) do Unimestre.`
          } else {
            this.pullFeedback[room.id] = 'Nenhum aluno encontrado no Unimestre para esta turma.'
          }
        },
        error: (err) => {
          this.pullFeedback[room.id] = `Erro ao puxar alunos: ${err.error?.message || 'Falha na consulta'}`
        },
      })
  }

  toggleCourseStudents(courseId: string): void {
    this.expandedCourseStudents[courseId] = !this.expandedCourseStudents[courseId]
    if (this.expandedCourseStudents[courseId] && !this.courseStudents[courseId]) {
      this.loadingCourseStudents[courseId] = true
      this.http.get<Array<{ id: string; name: string | null; email: string | null }>>(`/api/classroom/courses/${courseId}/students`)
        .pipe(finalize(() => { this.loadingCourseStudents[courseId] = false }))
        .subscribe({
          next: (students) => {
            this.courseStudents[courseId] = students
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Não foi possível carregar os alunos da sala Google Classroom.'
          },
        })
    }
  }

  private resetRoomForm(): void {
    this.roomForm.academicCourseId = ''
    this.roomForm.subjectId = ''
    this.roomForm.classGroup = ''
    this.roomForm.subjectName = ''
    this.roomForm.teacherEmail = ''
    this.selectedClassKey = ''
    this.loadedStudentEmails = []
  }

  private currentSemester(): string {
    const now = new Date()
    return `${now.getFullYear()}${now.getMonth() < 6 ? '1' : '2'}`
  }
}
