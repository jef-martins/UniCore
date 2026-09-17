import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { finalize } from 'rxjs'
import {
  type CertificateDocument,
  type CreateCustomEvent,
  type CreateCustomParticipant,
  type CustomEventDetails,
  type CustomEventSummary,
  type CustomParticipantItem,
  type UpdateCustomEvent,
  CertificatesService,
} from '../services/certificates.service'
import {
  formatDisplayDate,
  formatStudentCpf,
  getStudentInitials,
} from './certificates-utils'

@Component({
  selector: 'app-event-registration-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="event-reg-page" aria-labelledby="event-reg-title">
      <header class="event-reg-heading no-print">
        <div>
          <p class="hero-eyebrow">Cadastros & Eventos</p>
          <h1 id="event-reg-title">Cadastro de Eventos e Certificados</h1>
          <p>
            Cadastre eventos acadêmicos, vincule participantes, gerencie a quitação da taxa e emita certificados oficiais.
          </p>
        </div>
        <div class="event-reg-actions">
          <a class="button button-secondary" routerLink="/administracao/certificados">
            🎓 Painel Unimestre
          </a>
          <button class="button button-primary" type="button" (click)="openNewEventModal()">
            ➕ Novo Evento
          </button>
        </div>
      </header>

      @if (errorMessage) {
        <p class="error-message no-print" role="alert">{{ errorMessage }}</p>
      }
      @if (successMessage) {
        <p class="success-message no-print" role="status">{{ successMessage }}</p>
      }

      <!-- Barra de Busca de Eventos -->
      <section class="card card-outlined search-panel no-print">
        <div class="search-bar">
          <div class="search-input-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="form-control search-input"
              placeholder="Pesquisar por título do evento, ministrante ou curso…"
              [(ngModel)]="searchQuery"
              (keyup.enter)="loadEvents()"
            />
          </div>
          <button class="button button-primary" type="button" (click)="loadEvents()" [disabled]="isLoadingEvents">
            {{ isLoadingEvents ? 'Buscando…' : 'Filtrar' }}
          </button>
        </div>
      </section>

      <!-- Lista de Eventos Cadastrados -->
      <section class="events-grid no-print">
        @if (isLoadingEvents && events.length === 0) {
          <div class="loading-state col-span-full">
            <div class="spinner"></div>
            <p>Carregando eventos cadastrados…</p>
          </div>
        } @else if (events.length === 0) {
          <div class="empty-state col-span-full card card-outlined">
            <span class="empty-icon">📅</span>
            <h3>Nenhum evento cadastrado</h3>
            <p>Clique em <strong>"Novo Evento"</strong> para cadastrar seu primeiro curso ou workshop acadêmico.</p>
            <button class="button button-primary mt-2" type="button" (click)="openNewEventModal()">
              ➕ Cadastrar Primeiro Evento
            </button>
          </div>
        } @else {
          @for (ev of events; track ev.id) {
            <article class="card card-elevated event-card">
              @if (ev.logoUrl) {
                <div class="event-card-banner-logo">
                  <img [src]="ev.logoUrl" alt="Logo do Evento" class="card-banner-logo-img" />
                </div>
              }
              <div class="event-card-top">
                <div class="event-workload-badge">
                  <span>{{ ev.workloadHours }}h</span>
                </div>
                <div class="event-header-titles">
                  @if (ev.courseName) {
                    <span class="event-course-tag">{{ ev.courseName }}</span>
                  }
                  <h3 class="event-card-title">{{ ev.title }}</h3>
                </div>
              </div>

              @if (ev.description) {
                <p class="event-card-desc">{{ ev.description }}</p>
              }

              <div class="event-meta-list">
                @if (ev.speaker) {
                  <div class="meta-item">
                    <span class="meta-icon">🎤</span>
                    <span>{{ ev.speaker }}</span>
                  </div>
                }
                <div class="meta-item">
                  <span class="meta-icon">🗓️</span>
                  <span>{{ formatDate(ev.startDate) }}{{ ev.endDate ? ' a ' + formatDate(ev.endDate) : '' }}</span>
                </div>
                @if (ev.location) {
                  <div class="meta-item">
                    <span class="meta-icon">📍</span>
                    <span>{{ ev.location }}</span>
                  </div>
                }
              </div>

              <!-- Indicadores de Participantes -->
              <div class="event-counters">
                <div class="counter-box">
                  <span class="counter-val">{{ ev.totalParticipants }}</span>
                  <span class="counter-lbl">Alunos</span>
                </div>
                <div class="counter-box counter-paid">
                  <span class="counter-val">{{ ev.paidParticipants }}</span>
                  <span class="counter-lbl">Pagos</span>
                </div>
                <div class="counter-box counter-eligible">
                  <span class="counter-val">{{ ev.eligibleParticipants }}</span>
                  <span class="counter-lbl">Aptos</span>
                </div>
              </div>

              <div class="event-card-actions">
                <button
                  class="button button-primary button-sm manage-btn"
                  type="button"
                  (click)="openParticipantsDrawer(ev.id)"
                >
                  👥 Gerenciar Alunos ({{ ev.totalParticipants }})
                </button>
                <div class="event-btn-group">
                  <button class="btn-icon" type="button" (click)="openEditEventModal(ev)" title="Editar Evento">
                    ✏️
                  </button>
                  <button class="btn-icon text-danger" type="button" (click)="deleteEvent(ev)" title="Excluir Evento">
                    🗑️
                  </button>
                </div>
              </div>
            </article>
          }
        }
      </section>

      <!-- ==========================================
           MODAL DE CADASTRO / EDIÇÃO DE EVENTO
           ========================================== -->
      @if (isEventModalOpen) {
        <div class="modal-backdrop" (click)="closeEventModal()">
          <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ isEditingEvent ? 'Editar Evento' : 'Novo Evento Acadêmico' }}</h2>
              <button class="btn-close" type="button" (click)="closeEventModal()" aria-label="Fechar">✕</button>
            </div>

            <form (ngSubmit)="saveEvent()">
              <div class="modal-body form-grid">
                <div class="form-group col-span-2">
                  <label for="event-title">Título do Evento *</label>
                  <input
                    id="event-title"
                    type="text"
                    class="form-control"
                    placeholder="Ex: Workshop de Inteligência Artificial Aplicada"
                    [(ngModel)]="eventForm.title"
                    name="title"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="event-workload">Carga Horária (Horas) *</label>
                  <input
                    id="event-workload"
                    type="number"
                    min="1"
                    class="form-control"
                    [(ngModel)]="eventForm.workloadHours"
                    name="workloadHours"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="event-course">Curso Vinculado</label>
                  <input
                    id="event-course"
                    type="text"
                    class="form-control"
                    placeholder="Ex: Ciência da Computação, Geral..."
                    [(ngModel)]="eventForm.courseName"
                    name="courseName"
                  />
                </div>

                <div class="form-group">
                  <label for="event-speaker">Ministrante / Palestrante</label>
                  <input
                    id="event-speaker"
                    type="text"
                    class="form-control"
                    placeholder="Ex: Prof. Dr. Carlos Silva"
                    [(ngModel)]="eventForm.speaker"
                    name="speaker"
                  />
                </div>

                <div class="form-group">
                  <label for="event-location">Local / Sala / Modalidade</label>
                  <input
                    id="event-location"
                    type="text"
                    class="form-control"
                    placeholder="Ex: Auditório Central / Online"
                    [(ngModel)]="eventForm.location"
                    name="location"
                  />
                </div>

                <div class="form-group">
                  <label for="event-start">Data de Início *</label>
                  <input
                    id="event-start"
                    type="date"
                    class="form-control"
                    [(ngModel)]="eventForm.startDate"
                    name="startDate"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="event-end">Data de Término</label>
                  <input
                    id="event-end"
                    type="date"
                    class="form-control"
                    [(ngModel)]="eventForm.endDate"
                    name="endDate"
                  />
                </div>

                <div class="form-group col-span-2">
                  <label for="event-desc">Descrição / Detalhes</label>
                  <textarea
                    id="event-desc"
                    rows="3"
                    class="form-control text-area"
                    placeholder="Resumo do programa do curso, objetivos ou público-alvo…"
                    [(ngModel)]="eventForm.description"
                    name="description"
                  ></textarea>
                </div>

                <!-- Upload do Logotipo do Evento -->
                <div class="form-group col-span-2 upload-section">
                  <label>Logotipo do Evento (Opcional)</label>
                  <p class="upload-hint">Suba uma imagem para representar o evento nos cards e no cabeçalho do certificado institucional.</p>
                  @if (eventForm.logoUrl) {
                    <div class="media-preview-card">
                      <img [src]="eventForm.logoUrl" alt="Preview Logo" class="preview-logo-img" />
                      <div class="preview-actions">
                        <span class="preview-filename">Logotipo carregado com sucesso</span>
                        <button type="button" class="button button-danger button-sm" (click)="removeLogo()">✕ Remover Logo</button>
                      </div>
                    </div>
                  } @else {
                    <div class="upload-dropzone">
                      <span class="upload-icon">🖼️</span>
                      <label class="button button-secondary button-sm btn-file-picker">
                        Selecionar Imagem do Logotipo
                        <input type="file" accept="image/*" (change)="onLogoFileSelected($event)" class="file-hidden-input" />
                      </label>
                      <span class="dropzone-sub">PNG, JPG, SVG ou WebP</span>
                    </div>
                  }
                </div>

                <!-- Upload do Modelo de Certificado (Background / Layout Personalizado) -->
                <div class="form-group col-span-2 upload-section">
                  <label>Modelo Gráfico do Certificado (Opcional - Fundo Personalizado)</label>
                  <p class="upload-hint">
                    Suba a arte gráfica do certificado (em formato A4 Paisagem). O nome do aluno será posicionado e impresso diretamente sobre este fundo!
                  </p>
                  @if (eventForm.certificateTemplateUrl) {
                    <div class="media-preview-card template-preview-card">
                      <div class="template-thumb-wrap">
                        <img [src]="eventForm.certificateTemplateUrl" alt="Preview Modelo" class="preview-template-img" />
                      </div>
                      <div class="preview-actions">
                        <span class="preview-filename">Modelo gráfico de fundo ativo</span>
                        <button type="button" class="button button-danger button-sm" (click)="removeTemplate()">✕ Remover Modelo</button>
                      </div>
                    </div>

                    <!-- Ajustes de Posicionamento e Tipografia do Nome do Aluno -->
                    <div class="template-style-config-box">
                      <h5>📐 Posicionamento do Nome do Aluno no Certificado</h5>
                      <div class="style-config-grid">
                        <div class="form-group">
                          <label for="pos-name-y">Altura do Nome (Vertical): {{ eventForm.templateStyle.studentNameTop }}%</label>
                          <input
                            id="pos-name-y"
                            type="range"
                            min="25"
                            max="75"
                            step="1"
                            class="range-slider"
                            [(ngModel)]="eventForm.templateStyle.studentNameTop"
                            name="studentNameTop"
                          />
                        </div>
                        <div class="form-group">
                          <label for="font-size-name">Tamanho da Fonte: {{ eventForm.templateStyle.studentNameFontSize }}px</label>
                          <input
                            id="font-size-name"
                            type="range"
                            min="22"
                            max="54"
                            step="2"
                            class="range-slider"
                            [(ngModel)]="eventForm.templateStyle.studentNameFontSize"
                            name="studentNameFontSize"
                          />
                        </div>
                        <div class="form-group">
                          <label for="color-name">Cor da Fonte do Nome</label>
                          <div class="color-picker-row">
                            <input
                              id="color-name"
                              type="color"
                              class="color-input"
                              [(ngModel)]="eventForm.templateStyle.studentNameColor"
                              name="studentNameColor"
                            />
                            <span class="color-code">{{ eventForm.templateStyle.studentNameColor }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  } @else {
                    <div class="upload-dropzone">
                      <span class="upload-icon">📜</span>
                      <label class="button button-secondary button-sm btn-file-picker">
                        Selecionar Imagem do Modelo (A4 Paisagem)
                        <input type="file" accept="image/*" (change)="onTemplateFileSelected($event)" class="file-hidden-input" />
                      </label>
                      <span class="dropzone-sub">Formato A4 Paisagem (ex: 1920x1080px ou superior em alta resolução)</span>
                    </div>
                  }
                </div>
              </div>

              <div class="modal-footer">
                <button class="button button-secondary" type="button" (click)="closeEventModal()">
                  Cancelar
                </button>
                <button class="button button-primary" type="submit" [disabled]="isSubmittingEvent">
                  {{ isSubmittingEvent ? 'Salvando…' : isEditingEvent ? 'Salvar Alterações' : 'Criar Evento' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ==========================================
           DRAWER / MODAL DE GERENCIAMENTO DE PARTICIPANTES
           ========================================== -->
      @if (isParticipantsDrawerOpen && activeEventDetails) {
        <div class="modal-backdrop" (click)="closeParticipantsDrawer()">
          <div class="modal-dialog modal-dialog-xl card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>Participantes do Evento</h2>
                <span class="modal-subtitle">
                  <strong>{{ activeEventDetails.title }}</strong> &bull;
                  Carga Horária: {{ activeEventDetails.workloadHours }}h
                </span>
              </div>
              <button class="btn-close" type="button" (click)="closeParticipantsDrawer()" aria-label="Fechar">✕</button>
            </div>

            <div class="modal-body p-0">
              <!-- Barra de Resumo e Ação de Adicionar -->
              <div class="participants-topbar">
                <div class="participants-stats">
                  <span class="stat-pill">👥 Total: <strong>{{ activeEventDetails.participants.length }}</strong></span>
                  <span class="stat-pill stat-paid">💳 Pagos: <strong>{{ countPaidParticipants() }}</strong></span>
                  <span class="stat-pill stat-eligible">📜 Aptos: <strong>{{ countEligibleParticipants() }}</strong></span>
                </div>
                <button
                  class="button button-primary button-sm"
                  type="button"
                  (click)="toggleAddParticipantForm()"
                >
                  {{ showAddParticipantForm ? '✕ Fechar Formulário' : '➕ Adicionar Aluno ao Evento' }}
                </button>
              </div>

              <!-- Formulário Rápido de Adição de Participante -->
              @if (showAddParticipantForm) {
                <div class="add-participant-panel">
                  <h4>Vincular Novo Aluno ao Evento</h4>
                  <form (ngSubmit)="saveParticipant()" class="participant-form-grid">
                    <div class="form-group">
                      <label for="part-ra">RA do Aluno *</label>
                      <input
                        id="part-ra"
                        type="text"
                        class="form-control"
                        placeholder="Ex: 245080"
                        [(ngModel)]="participantForm.studentRa"
                        name="studentRa"
                        required
                      />
                    </div>

                    <div class="form-group col-span-2">
                      <label for="part-name">Nome Completo do Aluno *</label>
                      <input
                        id="part-name"
                        type="text"
                        class="form-control"
                        placeholder="Ex: Lucas Henrique Santos"
                        [(ngModel)]="participantForm.studentName"
                        name="studentName"
                        required
                      />
                    </div>

                    <div class="form-group">
                      <label for="part-cpf">CPF (Opcional)</label>
                      <input
                        id="part-cpf"
                        type="text"
                        class="form-control"
                        placeholder="000.000.000-00"
                        [(ngModel)]="participantForm.studentCpf"
                        name="studentCpf"
                      />
                    </div>

                    <div class="form-group col-span-2">
                      <label for="part-email">E-mail (Opcional)</label>
                      <input
                        id="part-email"
                        type="email"
                        class="form-control"
                        placeholder="aluno@aluno.faip.edu.br"
                        [(ngModel)]="participantForm.studentEmail"
                        name="studentEmail"
                      />
                    </div>

                    <div class="form-group col-span-2 checkbox-row">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [(ngModel)]="participantForm.isPaid"
                          name="isPaid"
                        />
                        <span>Taxa de Inscrição já quitada (Pago)</span>
                      </label>
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [(ngModel)]="participantForm.hasAttendance"
                          name="hasAttendance"
                        />
                        <span>Presença confirmada nas atividades</span>
                      </label>
                    </div>

                    <div class="form-actions col-span-full">
                      <button class="button button-secondary button-sm" type="button" (click)="toggleAddParticipantForm()">
                        Cancelar
                      </button>
                      <button class="button button-primary button-sm" type="submit" [disabled]="isSubmittingParticipant">
                        {{ isSubmittingParticipant ? 'Adicionando…' : 'Salvar Aluno' }}
                      </button>
                    </div>
                  </form>
                </div>
              }

              <!-- Tabela de Participantes Vinculados -->
              @if (activeEventDetails.participants.length === 0) {
                <div class="empty-state p-6">
                  <p>Nenhum aluno vinculado a este evento até o momento.</p>
                  <button class="button button-secondary button-sm mt-2" type="button" (click)="toggleAddParticipantForm()">
                    ➕ Adicionar Primeiro Aluno
                  </button>
                </div>
              } @else {
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th class="text-center">Status Pagamento (Clique p/ Alternar)</th>
                        <th class="text-center">Presença (Clique p/ Alternar)</th>
                        <th class="text-center">Situação Final</th>
                        <th class="text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (p of activeEventDetails.participants; track p.id) {
                        <tr>
                          <td>
                            <div class="student-cell">
                              <div class="student-avatar">{{ getInitials(p.studentName) }}</div>
                              <div class="student-info">
                                <strong class="student-name">{{ p.studentName }}</strong>
                                <span class="student-ra">RA: {{ p.studentRa }}{{ p.studentCpf ? ' • CPF: ' + formatCpf(p.studentCpf) : '' }}</span>
                              </div>
                            </div>
                          </td>

                          <!-- Toggle de Pagamento Interativo com 1 Clique -->
                          <td class="text-center">
                            @if (p.isPaid) {
                              <button
                                class="badge badge-paid clickable-badge"
                                type="button"
                                (click)="togglePaymentStatus(p)"
                                title="Clique para alterar para Pendente"
                              >
                                ✓ Taxa Paga
                              </button>
                            } @else {
                              <button
                                class="badge badge-pending clickable-badge"
                                type="button"
                                (click)="togglePaymentStatus(p)"
                                title="Clique para confirmar pagamento da taxa"
                              >
                                ⏳ Pendente
                              </button>
                            }
                          </td>

                          <!-- Toggle de Presença Interativo com 1 Clique -->
                          <td class="text-center">
                            @if (p.hasAttendance) {
                              <button
                                class="badge badge-attendance-ok clickable-badge"
                                type="button"
                                (click)="toggleAttendanceStatus(p)"
                                title="Clique para marcar como ausente"
                              >
                                ✓ Presente
                              </button>
                            } @else {
                              <button
                                class="badge badge-attendance-missing clickable-badge"
                                type="button"
                                (click)="toggleAttendanceStatus(p)"
                                title="Clique para confirmar presença"
                              >
                                ✕ Ausente
                              </button>
                            }
                          </td>

                          <!-- Situação Final -->
                          <td class="text-center">
                            @if (p.isEligible) {
                              <span class="badge badge-success">✓ Apto</span>
                            } @else {
                              <span class="badge badge-danger" [title]="p.blockedReason || 'Requisitos pendentes'">
                                🔒 Bloqueado
                              </span>
                            }
                          </td>

                          <!-- Emissão ou Exclusão -->
                          <td class="text-right">
                            <div class="participant-row-actions">
                              @if (p.isEligible) {
                                <button
                                  class="button button-sm button-primary emit-btn"
                                  type="button"
                                  (click)="openCertificateForParticipant(p)"
                                >
                                  📜 Emitir Certificado
                                </button>
                              } @else {
                                <span class="locked-text" [title]="p.blockedReason">
                                  Inapto
                                </span>
                              }
                              <button
                                class="btn-icon text-danger"
                                type="button"
                                (click)="removeParticipant(p)"
                                title="Desvincular Aluno"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>

            <div class="modal-footer">
              <span class="footer-hint">
                💡 Dica: Você pode clicar diretamente sobre os botões de <strong>"Taxa Paga / Pendente"</strong> ou <strong>"Presente / Ausente"</strong> para alternar o status instantaneamente.
              </span>
              <button class="button button-secondary" type="button" (click)="closeParticipantsDrawer()">
                Fechar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ==========================================
           MODAL DE VISUALIZAÇÃO E IMPRESSÃO DO CERTIFICADO
           ========================================== -->
      @if (isCertModalOpen && currentDoc) {
        <div class="modal-backdrop" (click)="closeCertModal()">
          <div class="modal-dialog modal-cert-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header no-print">
              <div class="cert-modal-header-titles">
                <h2>Certificado de Extensão Universitária</h2>
                <div class="student-name-edit-bar">
                  <label for="edit-student-name">Nome do Aluno no Certificado:</label>
                  <input
                    id="edit-student-name"
                    type="text"
                    class="form-control student-name-input"
                    [(ngModel)]="currentDoc.studentName"
                    title="Altere ou confirme o nome do aluno antes de emitir/imprimir"
                  />
                </div>
              </div>
              <div class="modal-header-actions">
                @if (currentDoc.certificateTemplateUrl) {
                  <button
                    class="button button-secondary button-sm"
                    type="button"
                    (click)="useOfficialLayoutOnly = !useOfficialLayoutOnly"
                  >
                    {{ useOfficialLayoutOnly ? '🖼️ Ver Modelo de Fundo' : '🏛️ Ver Modelo Oficial FAIP' }}
                  </button>
                }
                <button class="button button-primary print-action-btn" type="button" (click)="printCertificate()">
                  🖨️ Imprimir / Salvar em PDF
                </button>
                <button class="btn-close" type="button" (click)="closeCertModal()" aria-label="Fechar modal">✕</button>
              </div>
            </div>

            <div class="modal-body cert-modal-body">
              <!-- FOLHA DE IMPRESSÃO A4 PAISAGEM -->
              <div class="certificate-sheet" id="printable-certificate">
                <!-- CASO 1: MODELO PERSONALIZADO COM IMAGEM DE FUNDO -->
                @if (currentDoc.certificateTemplateUrl && !useOfficialLayoutOnly) {
                  <div
                    class="custom-cert-wrapper"
                    [style.background-image]="'url(' + currentDoc.certificateTemplateUrl + ')'"
                  >
                    <!-- Nome do Aluno posicionado com precisão sobre o modelo -->
                    <div
                      class="custom-cert-name"
                      [style.top]="(currentDoc.templateStyle?.studentNameTop || 48) + '%'"
                      [style.color]="currentDoc.templateStyle?.studentNameColor || '#0f172a'"
                      [style.font-size]="(currentDoc.templateStyle?.studentNameFontSize || 34) + 'px'"
                    >
                      {{ currentDoc.studentName }}
                    </div>

                    <!-- Rodapé com Autenticidade Digital -->
                    <div class="custom-cert-auth">
                      <span>Autenticidade: <strong>{{ currentDoc.verificationCode }}</strong></span>
                      <span>Marília - SP, {{ formatCurrentDate(currentDoc.issuedAt) }}</span>
                    </div>
                  </div>
                } @else {
                  <!-- CASO 2: MODELO INSTITUCIONAL OFICIAL FAIP -->
                  <div class="cert-outer-border">
                    <div class="cert-inner-border">
                      <div class="cert-header">
                        @if (currentDoc.logoUrl) {
                          <img [src]="currentDoc.logoUrl" alt="Logo do Evento" class="cert-custom-logo" />
                        } @else {
                          <div class="cert-emblem">🎓</div>
                        }
                        <h1 class="cert-institution-name">{{ currentDoc.institutionName }}</h1>
                        <p class="cert-subheading">Secretaria Geral de Cursos de Extensão e Capacitação</p>
                        <div class="cert-divider">
                          <span class="cert-divider-line"></span>
                          <span class="cert-divider-diamond">◆</span>
                          <span class="cert-divider-line"></span>
                        </div>
                      </div>

                      <div class="cert-title-area">
                        <h2 class="cert-title">CERTIFICADO</h2>
                      </div>

                      <div class="cert-body-text">
                        <p>
                          Certificamos para os devidos fins que o(a) acadêmico(a)
                          <strong class="highlight-name">{{ currentDoc.studentName }}</strong>,
                          portador(a) do Registro Acadêmico (RA) <strong>{{ currentDoc.studentRa }}</strong>
                          @if (currentDoc.studentCpf) {
                            e do CPF <strong>{{ formatCpf(currentDoc.studentCpf) }}</strong>
                          },
                          concluiu com aproveitamento e frequência regular as atividades do evento
                        </p>
                        <p class="highlight-event">
                          "{{ currentDoc.eventTitle }}"
                        </p>
                        @if (currentDoc.courseName) {
                          <p class="cert-course-mention">
                            vinculado ao curso de <strong>{{ currentDoc.courseName }}</strong>,
                          </p>
                        }
                        <p class="cert-workload-text">
                          com carga horária total comprovada de <strong>{{ currentDoc.workloadHours }} horas</strong>
                          @if (currentDoc.startDate && currentDoc.endDate) {
                            , realizado no período de <strong>{{ formatDate(currentDoc.startDate) }}</strong> a
                            <strong>{{ formatDate(currentDoc.endDate) }}</strong>
                          }.
                        </p>
                      </div>

                      <div class="cert-footer">
                        <div class="cert-signatures">
                          <div class="signature-block">
                            <div class="signature-line"></div>
                            <span class="signature-role">Coordenação de Extensão</span>
                            <span class="signature-dept">UniCore / FAIP</span>
                          </div>
                          <div class="signature-block">
                            <div class="signature-line"></div>
                            <span class="signature-role">Secretaria Acadêmica Geral</span>
                            <span class="signature-dept">Diretoria de Registros</span>
                          </div>
                        </div>

                        <div class="cert-verification-bar">
                          <div class="cert-date-location">
                            Marília - SP, {{ formatCurrentDate(currentDoc.issuedAt) }}
                          </div>
                          <div class="cert-auth-code">
                            <span>Código de Autenticidade Digital:</span>
                            <strong>{{ currentDoc.verificationCode }}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="modal-footer no-print">
              <span class="cert-modal-hint">
                💡 Dica: Para melhor resultado na impressão, selecione a orientação <strong>Paisagem (Landscape)</strong> nas configurações da impressora.
              </span>
              <div class="modal-footer-buttons">
                <button class="button button-secondary" type="button" (click)="closeCertModal()">
                  Fechar
                </button>
                <button class="button button-primary" type="button" (click)="printCertificate()">
                  🖨️ Imprimir Certificado
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .event-reg-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .event-reg-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .event-reg-heading h1 {
      margin: 0.25rem 0 0.5rem 0;
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--color-text, #ffffff);
      letter-spacing: -0.02em;
    }

    .event-reg-heading p {
      margin: 0;
      font-size: 0.95rem;
      color: var(--color-text-secondary, #a1a1aa);
      max-width: 680px;
    }

    .hero-eyebrow {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-primary, #38bdf8);
      margin-bottom: 0.25rem;
    }

    .event-reg-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .error-message {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      margin: 0;
    }

    .success-message {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      margin: 0;
    }

    /* Painel de Busca */
    .search-panel {
      padding: 1rem 1.25rem;
      background: var(--color-surface, #1e1e24);
      border-radius: 12px;
    }

    .search-bar {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .search-input-box {
      display: flex;
      align-items: center;
      flex: 1;
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      font-size: 0.9rem;
      opacity: 0.5;
    }

    .search-input {
      padding-left: 2.25rem !important;
      width: 100%;
    }

    /* Grid de Eventos */
    .events-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.25rem;
    }

    .event-card {
      padding: 1.5rem;
      background: var(--color-surface, #1e1e24);
      border-radius: 14px;
      border: 1px solid var(--border-color, #3f3f46);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }

    .event-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
      border-color: rgba(56, 189, 248, 0.4);
    }

    .event-card-top {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
    }

    .event-workload-badge {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #fff;
      font-weight: 800;
      font-size: 0.8rem;
      padding: 0.4rem 0.6rem;
      border-radius: 8px;
      flex-shrink: 0;
    }

    .event-header-titles {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .event-course-tag {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #38bdf8;
    }

    .event-card-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
      line-height: 1.3;
    }

    .event-card-desc {
      margin: 0;
      font-size: 0.85rem;
      color: #a1a1aa;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .event-meta-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .meta-icon {
      font-size: 0.9rem;
    }

    /* Contadores Rápidos */
    .event-counters {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.25);
      padding: 0.6rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      text-align: center;
    }

    .counter-box {
      display: flex;
      flex-direction: column;
    }

    .counter-val {
      font-size: 1.15rem;
      font-weight: 800;
      color: #fff;
    }

    .counter-lbl {
      font-size: 0.65rem;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #a1a1aa;
    }

    .counter-paid .counter-val { color: #34d399; }
    .counter-eligible .counter-val { color: #38bdf8; }

    .event-card-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      margin-top: auto;
      padding-top: 0.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .manage-btn {
      flex: 1;
      font-weight: 700;
    }

    .event-btn-group {
      display: flex;
      gap: 0.25rem;
    }

    .btn-icon {
      background: transparent;
      border: 1px solid transparent;
      color: #a1a1aa;
      font-size: 1rem;
      cursor: pointer;
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      transition: background 0.2s, color 0.2s;
    }

    .btn-icon:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    .btn-icon.text-danger:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
    }

    /* Drawer / Modal de Participantes */
    .participants-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: rgba(0, 0, 0, 0.25);
      border-bottom: 1px solid var(--border-color, #3f3f46);
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .participants-stats {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .stat-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color, #3f3f46);
      padding: 0.3rem 0.65rem;
      border-radius: 99px;
      font-size: 0.8rem;
      color: #e2e8f0;
    }

    .stat-paid {
      border-color: rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .stat-eligible {
      border-color: rgba(56, 189, 248, 0.3);
      color: #38bdf8;
    }

    .add-participant-panel {
      padding: 1.25rem 1.5rem;
      background: rgba(56, 189, 248, 0.04);
      border-bottom: 1px solid rgba(56, 189, 248, 0.2);
    }

    .add-participant-panel h4 {
      margin: 0 0 1rem 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #38bdf8;
    }

    .participant-form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.85rem;
    }

    .checkbox-row {
      display: flex;
      gap: 1.5rem;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 0.5rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #e2e8f0;
      cursor: pointer;
    }

    .checkbox-label input {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    /* Badges Clicáveis */
    .clickable-badge {
      cursor: pointer;
      border: 1px solid transparent;
      transition: transform 0.15s, opacity 0.15s, filter 0.15s;
    }

    .clickable-badge:hover {
      transform: scale(1.05);
      filter: brightness(1.2);
    }

    .clickable-badge:active {
      transform: scale(0.95);
    }

    .participant-row-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.5rem;
    }

    .footer-hint {
      font-size: 0.8rem;
      color: #fbbf24;
    }

    /* Formulários e Modais Comuns */
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .col-span-2 { grid-column: span 2; }
    .col-span-full { grid-column: 1 / -1; }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-group label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary, #a1a1aa);
    }

    .form-control {
      height: 42px;
      padding: 0 0.75rem;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 8px;
      color: var(--color-text, #ffffff);
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-control:focus {
      border-color: var(--color-primary, #38bdf8);
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }

    .text-area {
      height: auto;
      padding: 0.75rem;
      resize: vertical;
    }

    .modal-dialog-xl {
      max-width: 1050px;
      width: 95vw;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      overflow-y: auto;
    }

    .modal-dialog {
      background: var(--color-surface, #1e1e24);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 16px;
      width: 100%;
      max-width: 640px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #3f3f46);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
    }

    .modal-subtitle {
      font-size: 0.8rem;
      color: #a1a1aa;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #a1a1aa;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .btn-close:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
    }

    .modal-body {
      padding: 1.5rem;
      max-height: calc(85vh - 140px);
      overflow-y: auto;
    }

    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color, #3f3f46);
      background: rgba(0, 0, 0, 0.2);
    }

    .table-responsive {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      text-align: left;
    }

    .data-table th {
      padding: 0.85rem 1.25rem;
      background: rgba(0, 0, 0, 0.2);
      color: var(--color-text-secondary, #a1a1aa);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-color, #3f3f46);
    }

    .data-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: middle;
    }

    .data-table tr:hover {
      background: rgba(255, 255, 255, 0.025);
    }

    .student-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .student-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1e293b, #334155);
      border: 1px solid #475569;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .student-info {
      display: flex;
      flex-direction: column;
    }

    .student-name {
      color: var(--color-text, #ffffff);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .student-ra {
      color: var(--color-text-secondary, #a1a1aa);
      font-size: 0.75rem;
      font-family: monospace;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .badge-paid {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-pending {
      background: rgba(245, 158, 11, 0.12);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.25);
    }

    .badge-attendance-ok {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .badge-attendance-missing {
      background: rgba(239, 68, 68, 0.12);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }

    .badge-success {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      border: 1px solid #10b981;
    }

    .badge-danger {
      background: rgba(100, 116, 139, 0.15);
      color: #94a3b8;
      border: 1px solid #475569;
    }

    .emit-btn {
      box-shadow: 0 2px 8px rgba(56, 189, 248, 0.3);
      font-weight: 700;
    }

    .locked-text {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
      cursor: not-allowed;
      padding: 0.4rem 0.6rem;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1.5rem;
      gap: 0.75rem;
      color: var(--color-text-secondary, #a1a1aa);
    }

    .empty-icon { font-size: 2.5rem; }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: var(--color-primary, #38bdf8);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Logo Banner nos Cards */
    .event-card-banner-logo {
      width: 100%;
      height: 90px;
      background: linear-gradient(135deg, rgba(30, 58, 138, 0.4), rgba(88, 28, 135, 0.4));
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .card-banner-logo-img {
      max-height: 70px;
      max-width: 80%;
      object-fit: contain;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    }

    /* Upload e Mídia */
    .upload-section {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .upload-hint {
      margin: 0;
      font-size: 0.8rem;
      color: var(--color-text-secondary, #a1a1aa);
    }

    .upload-dropzone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1.25rem;
      border: 1.5px dashed rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.2);
      text-align: center;
    }

    .upload-icon { font-size: 1.75rem; }
    .btn-file-picker {
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    .file-hidden-input {
      position: absolute;
      left: 0;
      top: 0;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }
    .dropzone-sub {
      font-size: 0.75rem;
      color: #71717a;
    }

    .media-preview-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(73, 209, 125, 0.3);
      border-radius: 8px;
      padding: 0.75rem 1rem;
    }

    .preview-logo-img {
      max-height: 60px;
      max-width: 100px;
      object-fit: contain;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      padding: 4px;
    }

    .template-thumb-wrap {
      width: 120px;
      height: 75px;
      border-radius: 4px;
      overflow: hidden;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-template-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .preview-actions {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1;
    }

    .preview-filename {
      font-size: 0.85rem;
      color: #49d17d;
      font-weight: 600;
    }

    /* Configuração de Estilo do Modelo Personalizado */
    .template-style-config-box {
      margin-top: 0.75rem;
      padding: 0.85rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .template-style-config-box h5 {
      margin: 0;
      font-size: 0.85rem;
      color: #38bdf8;
      font-weight: 700;
    }

    .style-config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
    }

    .range-slider {
      width: 100%;
      cursor: pointer;
    }

    .color-picker-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .color-input {
      border: none;
      width: 36px;
      height: 32px;
      border-radius: 4px;
      cursor: pointer;
      background: transparent;
    }

    .color-code {
      font-size: 0.85rem;
      font-family: monospace;
      color: #d4d4d8;
    }

    /* Barra de Edição do Nome no Certificado */
    .cert-modal-header-titles {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .student-name-edit-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .student-name-edit-bar label {
      font-size: 0.8rem;
      color: #a1a1aa;
      font-weight: 600;
    }

    .student-name-input {
      padding: 0.3rem 0.6rem;
      font-size: 0.9rem;
      font-weight: 700;
      color: #38bdf8;
      border-color: rgba(56, 189, 248, 0.4);
      background: rgba(0, 0, 0, 0.4);
      max-width: 320px;
    }

    /* Certificado Personalizado */
    .custom-cert-wrapper {
      width: 100%;
      height: 100%;
      background-size: 100% 100%;
      background-repeat: no-repeat;
      position: relative;
    }

    .custom-cert-name {
      position: absolute;
      left: 6%;
      right: 6%;
      text-align: center;
      font-family: 'Times New Roman', Georgia, serif;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
      transform: translateY(-50%);
    }

    .custom-cert-auth {
      position: absolute;
      bottom: 18px;
      right: 25px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      font-size: 0.72rem;
      color: #475569;
      font-family: monospace;
      background: rgba(255, 255, 255, 0.88);
      padding: 4px 10px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .cert-custom-logo {
      max-height: 55px;
      margin-bottom: 0.25rem;
      object-fit: contain;
    }

    /* ========================================================
       DIAGRAMAÇÃO DO CERTIFICADO OFICIAL A4 PAISAGEM
       ======================================================== */
    .modal-cert-dialog {
      max-width: 1100px;
      width: 95vw;
      background: #18181b;
    }

    .cert-modal-body {
      display: flex;
      justify-content: center;
      padding: 2rem 1rem;
      background: #09090b;
    }

    .certificate-sheet {
      width: 100%;
      max-width: 980px;
      aspect-ratio: 1.414 / 1;
      background: #ffffff;
      color: #1e293b;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      box-sizing: border-box;
      position: relative;
    }

    .cert-outer-border {
      width: 100%;
      height: 100%;
      border: 4px double #0f172a;
      padding: 14px;
      box-sizing: border-box;
      position: relative;
      background: #fff;
    }

    .cert-inner-border {
      width: 100%;
      height: 100%;
      border: 1.5px solid #d97706;
      padding: 30px 45px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      position: relative;
      background: radial-gradient(circle at center, #ffffff 60%, #fffbeb 100%);
    }

    .cert-header {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .cert-emblem {
      font-size: 2.2rem;
      margin-bottom: 0.25rem;
      line-height: 1;
    }

    .cert-institution-name {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #0f172a;
      font-family: 'Times New Roman', serif, Georgia;
    }

    .cert-subheading {
      margin: 0.2rem 0 0.5rem 0;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #d97706;
    }

    .cert-divider {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      width: 100%;
      max-width: 400px;
      margin: 0.25rem 0;
    }

    .cert-divider-line {
      flex: 1;
      height: 1px;
      background: #cbd5e1;
    }

    .cert-divider-diamond {
      color: #d97706;
      font-size: 0.7rem;
    }

    .cert-title-area { margin: 0.5rem 0; }

    .cert-title {
      margin: 0;
      font-size: 2.6rem;
      font-weight: 900;
      letter-spacing: 0.25em;
      color: #0f172a;
      font-family: 'Times New Roman', serif, Georgia;
      text-shadow: 1px 1px 0px rgba(217, 119, 6, 0.2);
    }

    .cert-body-text {
      font-size: 1.05rem;
      line-height: 1.7;
      color: #334155;
      max-width: 820px;
      margin: 0 auto;
      font-family: Georgia, 'Times New Roman', serif;
    }

    .cert-body-text p { margin: 0.35rem 0; }

    .highlight-name {
      font-size: 1.3rem;
      color: #0f172a;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .highlight-event {
      font-size: 1.35rem;
      color: #1e3a8a;
      font-weight: 800;
      font-style: italic;
      margin: 0.4rem 0 !important;
    }

    .cert-course-mention { font-size: 0.95rem; color: #475569; }
    .cert-workload-text { font-size: 1rem; color: #334155; }

    .cert-footer {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      margin-top: 1rem;
    }

    .cert-signatures {
      display: flex;
      justify-content: space-around;
      align-items: flex-end;
      padding: 0 2rem;
    }

    .signature-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 220px;
    }

    .signature-line {
      width: 100%;
      height: 1.5px;
      background: #64748b;
      margin-bottom: 0.4rem;
    }

    .signature-role {
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.05em;
    }

    .signature-dept { font-size: 0.7rem; color: #64748b; }

    .cert-verification-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px dashed #cbd5e1;
      padding-top: 0.6rem;
      font-size: 0.75rem;
      color: #64748b;
    }

    .cert-date-location { font-weight: 600; font-style: italic; }

    .cert-auth-code {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .cert-auth-code strong {
      color: #0f172a;
      font-family: monospace;
      letter-spacing: 0.05em;
    }

    .cert-modal-hint { font-size: 0.8rem; color: #fbbf24; }

    /* Impressão */
    @media print {
      body * { visibility: hidden; }

      .no-print,
      .layout-shell header,
      .sidebar,
      .top-bar,
      .event-reg-heading,
      .search-panel,
      .events-grid,
      .modal-header,
      .modal-footer,
      .modal-backdrop::before {
        display: none !important;
      }

      .modal-backdrop {
        position: static !important;
        background: transparent !important;
        padding: 0 !important;
        display: block !important;
        inset: auto !important;
      }

      .modal-dialog,
      .modal-cert-dialog {
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .cert-modal-body {
        background: transparent !important;
        padding: 0 !important;
      }

      #printable-certificate,
      #printable-certificate * {
        visibility: visible;
      }

      #printable-certificate {
        position: fixed;
        left: 0;
        top: 0;
        width: 100vw;
        height: 100vh;
        max-width: none !important;
        margin: 0 !important;
        padding: 1.5cm !important;
        box-shadow: none !important;
        border: none !important;
        page-break-inside: avoid;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      @page {
        size: A4 landscape;
        margin: 0;
      }
    }
  `],
})
export class EventRegistrationPageComponent implements OnInit {
  events: CustomEventSummary[] = []
  searchQuery = ''
  isLoadingEvents = false

  errorMessage = ''
  successMessage = ''

  // Modal de Criação / Edição de Evento
  isEventModalOpen = false
  isEditingEvent = false
  editingEventId: string | null = null
  isSubmittingEvent = false
  eventForm: {
    title: string
    description: string
    workloadHours: number
    speaker: string
    courseName: string
    startDate: string
    endDate: string
    location: string
    logoUrl?: string | null
    certificateTemplateUrl?: string | null
    templateStyle: {
      studentNameTop: number
      studentNameFontSize: number
      studentNameColor: string
    }
  } = this.getEmptyEventForm()

  // Drawer de Participantes
  isParticipantsDrawerOpen = false
  activeEventDetails: CustomEventDetails | null = null
  showAddParticipantForm = false
  isSubmittingParticipant = false
  participantForm: {
    studentRa: string
    studentName: string
    studentCpf: string
    studentEmail: string
    isPaid: boolean
    hasAttendance: boolean
  } = this.getEmptyParticipantForm()

  // Modal de Certificado
  isCertModalOpen = false
  currentDoc: CertificateDocument | null = null
  useOfficialLayoutOnly = false

  // Arquivos selecionados para upload
  selectedLogoFile: File | null = null
  selectedTemplateFile: File | null = null

  constructor(private readonly certificatesService: CertificatesService) {}

  ngOnInit(): void {
    this.loadEvents()
  }

  getEmptyEventForm() {
    const today = new Date().toISOString().split('T')[0]
    return {
      title: '',
      description: '',
      workloadHours: 20,
      speaker: '',
      courseName: '',
      startDate: today,
      endDate: today,
      location: '',
      logoUrl: null as string | null,
      certificateTemplateUrl: null as string | null,
      templateStyle: {
        studentNameTop: 48,
        studentNameFontSize: 34,
        studentNameColor: '#0f172a',
      },
    }
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      const file = input.files[0]
      this.selectedLogoFile = file
      const reader = new FileReader()
      reader.onload = (e) => {
        this.eventForm.logoUrl = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  removeLogo(): void {
    this.selectedLogoFile = null
    this.eventForm.logoUrl = null
  }

  onTemplateFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      const file = input.files[0]
      this.selectedTemplateFile = file
      const reader = new FileReader()
      reader.onload = (e) => {
        this.eventForm.certificateTemplateUrl = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  removeTemplate(): void {
    this.selectedTemplateFile = null
    this.eventForm.certificateTemplateUrl = null
  }

  getEmptyParticipantForm() {
    return {
      studentRa: '',
      studentName: '',
      studentCpf: '',
      studentEmail: '',
      isPaid: false,
      hasAttendance: true,
    }
  }

  loadEvents(): void {
    this.isLoadingEvents = true
    this.errorMessage = ''

    this.certificatesService
      .listCustomEvents(this.searchQuery)
      .pipe(finalize(() => (this.isLoadingEvents = false)))
      .subscribe({
        next: (events) => {
          this.events = events
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao carregar eventos acadêmicos.'
        },
      })
  }

  openNewEventModal(): void {
    this.isEditingEvent = false
    this.editingEventId = null
    this.selectedLogoFile = null
    this.selectedTemplateFile = null
    this.eventForm = this.getEmptyEventForm()
    this.isEventModalOpen = true
  }

  openEditEventModal(event: CustomEventSummary): void {
    this.isEditingEvent = true
    this.editingEventId = event.id
    this.selectedLogoFile = null
    this.selectedTemplateFile = null
    this.eventForm = {
      title: event.title,
      description: event.description || '',
      workloadHours: event.workloadHours,
      speaker: event.speaker || '',
      courseName: event.courseName || '',
      startDate: event.startDate ? event.startDate.split('T')[0] : '',
      endDate: event.endDate ? event.endDate.split('T')[0] : '',
      location: event.location || '',
      logoUrl: event.logoUrl || null,
      certificateTemplateUrl: event.certificateTemplateUrl || null,
      templateStyle: event.templateStyle || {
        studentNameTop: 48,
        studentNameFontSize: 34,
        studentNameColor: '#0f172a',
      },
    }
    this.isEventModalOpen = true
  }

  closeEventModal(): void {
    this.isEventModalOpen = false
    this.isEditingEvent = false
    this.editingEventId = null
    this.selectedLogoFile = null
    this.selectedTemplateFile = null
  }

  saveEvent(): void {
    if (!this.eventForm.title.trim()) {
      this.errorMessage = 'Informe o título do evento.'
      return
    }

    this.isSubmittingEvent = true
    this.errorMessage = ''

    const payload: CreateCustomEvent = {
      title: this.eventForm.title.trim(),
      description: this.eventForm.description.trim() || undefined,
      workloadHours: Number(this.eventForm.workloadHours) || 20,
      speaker: this.eventForm.speaker.trim() || undefined,
      courseName: this.eventForm.courseName.trim() || undefined,
      startDate: new Date(this.eventForm.startDate + 'T10:00:00Z').toISOString(),
      endDate: this.eventForm.endDate ? new Date(this.eventForm.endDate + 'T18:00:00Z').toISOString() : undefined,
      location: this.eventForm.location.trim() || undefined,
      logoUrl: this.eventForm.logoUrl || null,
      certificateTemplateUrl: this.eventForm.certificateTemplateUrl || null,
      templateStyle: this.eventForm.templateStyle,
    }

    const request$ = this.isEditingEvent && this.editingEventId
      ? this.certificatesService.updateCustomEvent(this.editingEventId, payload)
      : this.certificatesService.createCustomEvent(payload)

    request$
      .pipe(finalize(() => (this.isSubmittingEvent = false)))
      .subscribe({
        next: () => {
          this.successMessage = this.isEditingEvent ? 'Evento atualizado com sucesso!' : 'Evento criado com sucesso!'
          this.closeEventModal()
          this.loadEvents()
          setTimeout(() => (this.successMessage = ''), 4000)
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao salvar evento acadêmico.'
        },
      })
  }

  deleteEvent(event: CustomEventSummary): void {
    if (!confirm(`Deseja realmente remover o evento "${event.title}"? Todos os vínculos de participantes serão removidos.`)) {
      return
    }

    this.certificatesService.deleteCustomEvent(event.id).subscribe({
      next: () => {
        this.successMessage = 'Evento excluído com sucesso.'
        this.loadEvents()
        setTimeout(() => (this.successMessage = ''), 3000)
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erro ao excluir evento.'
      },
    })
  }

  // Gerenciamento de Participantes
  openParticipantsDrawer(eventId: string): void {
    this.errorMessage = ''
    this.certificatesService.getCustomEventById(eventId).subscribe({
      next: (details) => {
        this.activeEventDetails = details
        this.showAddParticipantForm = false
        this.participantForm = this.getEmptyParticipantForm()
        this.isParticipantsDrawerOpen = true
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erro ao carregar detalhes e participantes do evento.'
      },
    })
  }

  closeParticipantsDrawer(): void {
    this.isParticipantsDrawerOpen = false
    this.activeEventDetails = null
    this.showAddParticipantForm = false
    this.loadEvents()
  }

  toggleAddParticipantForm(): void {
    this.showAddParticipantForm = !this.showAddParticipantForm
  }

  saveParticipant(): void {
    if (!this.activeEventDetails) return

    if (!this.participantForm.studentRa.trim() || !this.participantForm.studentName.trim()) {
      this.errorMessage = 'Informe o RA e o Nome completo do aluno.'
      return
    }

    this.isSubmittingParticipant = true
    this.errorMessage = ''

    const payload: CreateCustomParticipant = {
      studentRa: this.participantForm.studentRa.trim(),
      studentName: this.participantForm.studentName.trim(),
      studentCpf: this.participantForm.studentCpf.trim() || undefined,
      studentEmail: this.participantForm.studentEmail.trim() || undefined,
      isPaid: this.participantForm.isPaid,
      hasAttendance: this.participantForm.hasAttendance,
    }

    this.certificatesService
      .addParticipant(this.activeEventDetails.id, payload)
      .pipe(finalize(() => (this.isSubmittingParticipant = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Aluno adicionado ao evento com sucesso!'
          this.participantForm = this.getEmptyParticipantForm()
          this.showAddParticipantForm = false
          this.openParticipantsDrawer(this.activeEventDetails!.id)
          setTimeout(() => (this.successMessage = ''), 3000)
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao adicionar aluno ao evento.'
        },
      })
  }

  togglePaymentStatus(participant: CustomParticipantItem): void {
    const newStatus = !participant.isPaid
    this.certificatesService
      .updateParticipantStatus(participant.id, { isPaid: newStatus })
      .subscribe({
        next: () => {
          participant.isPaid = newStatus
          participant.paymentDate = newStatus ? new Date().toISOString() : null
          participant.isEligible = participant.isPaid && participant.hasAttendance
          if (!participant.isEligible) {
            participant.blockedReason = !participant.isPaid
              ? 'Taxa de inscrição pendente de pagamento'
              : 'Presença não confirmada no evento'
          } else {
            participant.blockedReason = undefined
          }
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao alterar status de pagamento.'
        },
      })
  }

  toggleAttendanceStatus(participant: CustomParticipantItem): void {
    const newStatus = !participant.hasAttendance
    this.certificatesService
      .updateParticipantStatus(participant.id, { hasAttendance: newStatus })
      .subscribe({
        next: () => {
          participant.hasAttendance = newStatus
          participant.isEligible = participant.isPaid && participant.hasAttendance
          if (!participant.isEligible) {
            participant.blockedReason = !participant.hasAttendance
              ? 'Presença não confirmada no evento'
              : 'Taxa de inscrição pendente de pagamento'
          } else {
            participant.blockedReason = undefined
          }
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao alterar status de presença.'
        },
      })
  }

  removeParticipant(participant: CustomParticipantItem): void {
    if (!confirm(`Remover participante "${participant.studentName}" deste evento?`)) {
      return
    }

    this.certificatesService.removeParticipant(participant.id).subscribe({
      next: () => {
        if (this.activeEventDetails) {
          this.activeEventDetails.participants = this.activeEventDetails.participants.filter(
            (p) => p.id !== participant.id,
          )
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erro ao remover aluno do evento.'
      },
    })
  }

  // Emissão de Certificado do Participante
  openCertificateForParticipant(participant: CustomParticipantItem): void {
    if (!participant.isEligible) {
      this.errorMessage = `Participante inapto: ${participant.blockedReason || 'requisitos pendentes'}.`
      return
    }

    this.errorMessage = ''
    this.certificatesService.getParticipantDocument(participant.id).subscribe({
      next: (doc) => {
        this.currentDoc = doc
        this.isCertModalOpen = true
        participant.emittedCount = (participant.emittedCount || 0) + 1
        participant.lastEmittedAt = doc.issuedAt
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erro ao gerar certificado oficial.'
      },
    })
  }

  closeCertModal(): void {
    this.isCertModalOpen = false
    this.currentDoc = null
  }

  printCertificate(): void {
    window.print()
  }

  countPaidParticipants(): number {
    return this.activeEventDetails?.participants.filter((p) => p.isPaid).length || 0
  }

  countEligibleParticipants(): number {
    return this.activeEventDetails?.participants.filter((p) => p.isEligible).length || 0
  }

  getInitials(name: string): string {
    return getStudentInitials(name)
  }

  formatDate(dateStr: string | null): string {
    return formatDisplayDate(dateStr)
  }

  formatCurrentDate(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  formatCpf(cpf: string | null): string {
    return formatStudentCpf(cpf)
  }
}
