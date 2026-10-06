import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { finalize } from 'rxjs'
import {
  type CertificateCourse,
  type CertificateDocument,
  type CertificateEmissionLog,
  type CertificateEvent,
  type CertificateInscription,
  type CertificateYear,
  CertificatesService,
} from '../services/certificates.service'
import {
  evaluateCertificateEligibility,
  executeCertificatePrint,
  formatDisplayDate,
  formatStudentCpf,
  getStudentInitials,
} from './certificates-utils'

@Component({
  selector: 'app-certificates-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="certificates-page" aria-labelledby="certificates-title">
      <header class="certificates-heading no-print">
        <div>
          <p class="hero-eyebrow">Administração e Registros</p>
          <h1 id="certificates-title">Gestão e Emissão de Certificados</h1>
          <p>
            Consulte a aptidão acadêmica e financeira dos inscritos em eventos e cursos de extensão para emissão oficial de certificados.
          </p>
        </div>
        <div class="certificates-header-actions">
          <button class="button button-secondary" type="button" (click)="openLogsModal()">
            📋 Histórico de Emissões
          </button>
          <button class="button button-primary" type="button" (click)="applyFilters()" [disabled]="isLoading">
            {{ isLoading ? 'Buscando…' : '🔄 Atualizar Lista' }}
          </button>
        </div>
      </header>

      @if (errorMessage) {
        <p class="error-message no-print" role="alert">{{ errorMessage }}</p>
      }
      @if (successMessage) {
        <p class="success-message no-print" role="status">{{ successMessage }}</p>
      }

      <!-- Painel de Filtros Inteligentes -->
      <section class="card card-outlined filters-panel no-print" aria-label="Filtros de pesquisa">
        <div class="filters-grid">
          <div class="filter-group filter-year">
            <label for="filter-ano">Ano do Evento</label>
            <select
              id="filter-ano"
              class="form-control"
              [(ngModel)]="selectedYear"
              (change)="onYearOrCourseChange()"
            >
              @for (y of years; track y.year) {
                <option [value]="y.year">{{ y.year }}</option>
              }
            </select>
          </div>

          <div class="filter-group filter-course">
            <label for="filter-curso">Curso Vinculado</label>
            <select
              id="filter-curso"
              class="form-control"
              [(ngModel)]="selectedCourse"
              (change)="onYearOrCourseChange()"
            >
              <option value="">Todos os Cursos</option>
              @for (c of courses; track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </div>

          <div class="filter-group filter-event">
            <label for="filter-evento">Oferta / Evento</label>
            <select
              id="filter-evento"
              class="form-control"
              [(ngModel)]="selectedEvent"
              (change)="applyFilters()"
              [disabled]="isLoadingEvents"
            >
              <option value="">{{ isLoadingEvents ? 'Carregando eventos…' : 'Todas as ofertas do período' }}</option>
              @for (e of events; track e.id) {
                <option [value]="e.id">{{ e.title }} {{ e.workload ? '(' + e.workload + 'h)' : '' }}</option>
              }
            </select>
          </div>

          <div class="filter-group filter-search">
            <label for="filter-busca">Aluno ou RA</label>
            <div class="search-input-wrapper">
              <input
                id="filter-busca"
                type="text"
                class="form-control"
                placeholder="Filtrar por nome ou RA…"
                [(ngModel)]="searchQuery"
                (keyup.enter)="applyFilters()"
              />
              <button class="button button-primary search-btn" type="button" (click)="applyFilters()">
                Filtrar
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Tabela de Inscrições e Aptidão -->
      <section class="card card-outlined inscriptions-card no-print">
        <div class="card-header">
          <div class="card-header-titles">
            <h2>Alunos e Situação de Certificação</h2>
            <p>Critérios obrigatórios: quitação financeira da inscrição e validação de presença no diário.</p>
          </div>
          <span class="badge badge-info">{{ inscriptions.length }} participante(s) encontrado(s)</span>
        </div>

        @if (isLoading) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Consultando base acadêmica e financeira do Unimestre…</p>
          </div>
        } @else if (inscriptions.length === 0) {
          <div class="empty-state">
            <span class="empty-icon">🎓</span>
            <h3>Nenhum participante encontrado</h3>
            <p>Ajuste os filtros de ano, curso ou evento para localizar os registros de extensão.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Evento / Carga Horária</th>
                  <th class="text-center">Status Financeiro</th>
                  <th class="text-center">Frequência</th>
                  <th class="text-center">Situação Final</th>
                  <th class="text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                @for (item of inscriptions; track item.id) {
                  <tr [class.row-eligible]="item.isEligible" [class.row-blocked]="!item.isEligible">
                    <td>
                      <div class="student-cell">
                        <div class="student-avatar" [attr.aria-hidden]="true">
                          {{ getInitials(item.studentName) }}
                        </div>
                        <div class="student-info">
                          <strong class="student-name">{{ item.studentName }}</strong>
                          <span class="student-ra">RA: {{ item.studentRa }}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="event-cell">
                        <span class="event-title" [title]="item.eventTitle">{{ item.eventTitle }}</span>
                        <span class="event-workload">
                          {{ item.workloadHours ? item.workloadHours + ' horas de atividade' : 'Carga horária padrão' }}
                        </span>
                      </div>
                    </td>
                    <td class="text-center">
                      @if (item.isPaid) {
                        <span class="badge badge-paid" [title]="'Data de pagamento: ' + formatDate(item.paymentDate)">
                          ✓ Taxa Paga
                        </span>
                      } @else {
                        <span class="badge badge-pending" title="Pendente de confirmação financeira">
                          ⏳ Pendente
                        </span>
                      }
                    </td>
                    <td class="text-center">
                      @if (item.hasAttendance) {
                        <span class="badge badge-attendance-ok">
                          ✓ Presença ({{ item.attendanceCount }})
                        </span>
                      } @else {
                        <span class="badge badge-attendance-missing">
                          ✕ Sem Registro
                        </span>
                      }
                    </td>
                    <td class="text-center">
                      @if (item.isEligible) {
                        <span class="badge badge-success">
                          ✓ Liberado
                        </span>
                      } @else {
                        <span class="badge badge-danger" [title]="item.blockedReason || 'Requisitos pendentes'">
                          🔒 Bloqueado
                        </span>
                      }
                    </td>
                    <td class="text-right">
                      @if (item.isEligible) {
                        <button
                          class="button button-sm button-primary emit-btn"
                          type="button"
                          (click)="openCertificate(item)"
                          [disabled]="isLoadingDoc"
                        >
                          📜 Emitir Certificado
                        </button>
                      } @else {
                        <span class="locked-text" [title]="item.blockedReason || 'Critérios não cumpridos'">
                          Inapto
                        </span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <!-- MODAL DE VISUALIZAÇÃO E IMPRESSÃO DO CERTIFICADO -->
      @if (isCertModalOpen && currentDoc) {
        <div class="modal-backdrop" (click)="closeCertModal()">
          <div class="modal-dialog modal-cert-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header no-print">
              <div>
                <h2>Certificado de Extensão Universitária</h2>
                <span class="modal-subtitle">Visualização e impressão do documento oficial</span>
              </div>
              <div class="modal-header-actions">
                <div class="page-view-selector no-print">
                  <button
                    type="button"
                    class="view-pill"
                    [class.active]="certPageView === 'front'"
                    (click)="certPageView = 'front'"
                  >
                    📄 Frente
                  </button>
                  <button
                    type="button"
                    class="view-pill"
                    [class.active]="certPageView === 'back'"
                    (click)="certPageView = 'back'"
                  >
                    🛡️ Verso (QR Code)
                  </button>
                  <button
                    type="button"
                    class="view-pill"
                    [class.active]="certPageView === 'both'"
                    (click)="certPageView = 'both'"
                  >
                    📑 Ambas as Páginas
                  </button>
                </div>
                <button class="button button-primary print-action-btn" type="button" (click)="printCertificate()">
                  🖨️ Imprimir / Salvar em PDF
                </button>
                <button class="btn-close" type="button" (click)="closeCertModal()" aria-label="Fechar modal">✕</button>
              </div>
            </div>

            <div class="modal-body cert-modal-body">
              <div class="certificate-sheet-container" id="printable-certificate">
                <!-- PÁGINA 1: FRENTE DO CERTIFICADO -->
                <div
                  class="certificate-sheet cert-page cert-page-front"
                  [class.screen-hidden]="certPageView === 'back'"
                >
                  <div class="cert-outer-border">
                    <div class="cert-inner-border">
                      <!-- Brasão / Cabeçalho -->
                      <div class="cert-header">
                        <div class="cert-emblem">🎓</div>
                        <h1 class="cert-institution-name">{{ currentDoc.institutionName }}</h1>
                        <p class="cert-subheading">Secretaria Geral de Cursos de Extensão e Capacitação</p>
                        <div class="cert-divider">
                          <span class="cert-divider-line"></span>
                          <span class="cert-divider-diamond">◆</span>
                          <span class="cert-divider-line"></span>
                        </div>
                      </div>

                      <!-- Título do Certificado -->
                      <div class="cert-title-area">
                        <h2 class="cert-title">CERTIFICADO</h2>
                      </div>

                      <!-- Corpo do Texto Oficial -->
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
                        @if (currentDoc.issnCode) {
                          <p class="cert-issn-mention">
                            Trabalhos e anais catalogados sob o registro oficial <strong>ISSN {{ currentDoc.issnCode }}</strong>.
                          </p>
                        }
                      </div>

                      <!-- Rodapé do Certificado: Data, Assinaturas e Autenticidade -->
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
                </div>

                <!-- PÁGINA 2: VERSO OFICIAL DE AUTENTICIDADE COM QR CODE -->
                <div
                  class="certificate-sheet cert-page cert-page-back"
                  [class.screen-hidden]="certPageView === 'front'"
                >
                  <div class="cert-outer-border">
                    <div class="cert-inner-border verso-inner">
                      <div class="verso-header">
                        <div class="cert-emblem">🛡️</div>
                        <h2 class="verso-title">VERIFICAÇÃO DE AUTENTICIDADE E REGISTRO ACADÊMICO</h2>
                        <p class="cert-subheading">{{ currentDoc.institutionName }} &bull; Diretoria de Registros</p>
                        <div class="cert-divider">
                          <span class="cert-divider-line"></span>
                          <span class="cert-divider-diamond">◆</span>
                          <span class="cert-divider-line"></span>
                        </div>
                      </div>

                      <div class="verso-content">
                        <p class="verso-explanation">
                          Este certificado foi expedido em conformidade com as diretrizes do Ministério da Educação (MEC)
                          e com a Lei de Diretrizes e Bases da Educação Nacional (Lei nº 9.394/1996), possuindo validade em todo o território nacional.
                        </p>

                        <div class="verso-qr-block">
                          <img
                            [src]="'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + (currentDoc.verificationUrl || currentDoc.verificationCode)"
                            alt="QR Code Oficial"
                            class="verso-qr-image"
                          />
                          <span class="verso-qr-hint">QR Code oficial (50x50 mm) para validação via leitor/câmera</span>
                        </div>

                        <div class="verso-data-grid">
                          <div class="verso-data-item">
                            <span class="verso-data-label">Código de Autenticidade:</span>
                            <span class="verso-data-value code-highlight">{{ currentDoc.verificationCode }}</span>
                          </div>
                          @if (currentDoc.hash) {
                            <div class="verso-data-item">
                              <span class="verso-data-label">Hash Criptográfico de Segurança:</span>
                              <span class="verso-data-value code-highlight hash-text">{{ currentDoc.hash }}</span>
                            </div>
                          }
                          @if (currentDoc.issnCode) {
                            <div class="verso-data-item">
                              <span class="verso-data-label">Registro ISSN Oficial:</span>
                              <span class="verso-data-value">{{ currentDoc.issnCode }}</span>
                            </div>
                          }
                          <div class="verso-data-item">
                            <span class="verso-data-label">Data e Hora de Registro:</span>
                            <span class="verso-data-value">{{ formatCurrentDate(currentDoc.issuedAt) }}</span>
                          </div>
                          <div class="verso-data-item">
                            <span class="verso-data-label">Portal Público de Validação:</span>
                            <span class="verso-data-value link-text">{{ currentDoc.verificationUrl || 'https://unicore.faip.edu.br/certificados/validar' }}</span>
                          </div>
                        </div>
                      </div>

                      <div class="verso-footer">
                        <span>UniCore Academic Certification Engine &bull; Documento digital oficial com fé pública</span>
                      </div>
                    </div>
                  </div>
                </div>
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

      <!-- MODAL DE HISTÓRICO DE LOGS DE EMISSÃO -->
      @if (isLogsModalOpen) {
        <div class="modal-backdrop" (click)="closeLogsModal()">
          <div class="modal-dialog modal-dialog-lg card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>Histórico de Certificados Emitidos</h2>
                <span class="modal-subtitle">Auditoria de emissões e códigos de validação digital</span>
              </div>
              <button class="btn-close" type="button" (click)="closeLogsModal()" aria-label="Fechar">✕</button>
            </div>
            <div class="modal-body">
              @if (isLoadingLogs) {
                <div class="loading-state">
                  <div class="spinner"></div>
                  <p>Carregando histórico…</p>
                </div>
              } @else if (emissionLogs.length === 0) {
                <div class="empty-state">
                  <p>Nenhuma emissão registrada no sistema até o momento.</p>
                </div>
              } @else {
                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Data/Hora</th>
                        <th>Aluno / RA</th>
                        <th>Evento</th>
                        <th>Código Autenticidade</th>
                        <th>Emitido Por</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (log of emissionLogs; track log.id) {
                        <tr>
                          <td>{{ formatDateTime(log.issuedAt) }}</td>
                          <td>
                            <strong>{{ log.studentName }}</strong>
                            <br /><small class="text-secondary">RA: {{ log.studentRa }}</small>
                          </td>
                          <td>{{ log.eventTitle }} ({{ log.workloadHours }}h)</td>
                          <td><code class="auth-code-badge">{{ log.verificationCode }}</code></td>
                          <td>{{ log.issuedByUser?.username || 'Secretaria Geral' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
            <div class="modal-footer">
              <button class="button button-secondary" type="button" (click)="closeLogsModal()">
                Fechar
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .certificates-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .certificates-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .certificates-heading h1 {
      margin: 0.25rem 0 0.5rem 0;
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--color-text, #ffffff);
      letter-spacing: -0.02em;
    }

    .certificates-heading p {
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

    .certificates-header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    /* Mensagens de Alerta */
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

    /* Painel de Filtros */
    .filters-panel {
      padding: 1.25rem;
      background: var(--color-surface, #1e1e24);
      border-radius: 12px;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: 140px 1.2fr 1.5fr 1.8fr;
      gap: 1rem;
      align-items: flex-end;
    }

    @media (max-width: 1024px) {
      .filters-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 640px) {
      .filters-grid {
        grid-template-columns: 1fr;
      }
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .filter-group label {
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

    .search-input-wrapper {
      display: flex;
      gap: 0.5rem;
    }

    .search-input-wrapper input {
      flex: 1;
    }

    .search-btn {
      white-space: nowrap;
      height: 42px;
    }

    /* Cards e Tabelas */
    .inscriptions-card {
      padding: 0;
      background: var(--color-surface, #1e1e24);
      border-radius: 12px;
      overflow: hidden;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #3f3f46);
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .card-header-titles h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--color-text, #ffffff);
    }

    .card-header-titles p {
      margin: 0.25rem 0 0 0;
      font-size: 0.8rem;
      color: var(--color-text-secondary, #a1a1aa);
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
      width: 38px;
      height: 38px;
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

    .event-cell {
      display: flex;
      flex-direction: column;
      max-width: 320px;
    }

    .event-title {
      font-weight: 600;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .event-workload {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    /* Badges */
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

    .badge-info {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
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
    .text-secondary { color: #a1a1aa; }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1.5rem;
      gap: 0.75rem;
      color: var(--color-text-secondary, #a1a1aa);
    }

    .empty-icon {
      font-size: 2.5rem;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: var(--color-primary, #38bdf8);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* MODAIS */
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
      max-width: 600px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }

    .modal-dialog-lg {
      max-width: 900px;
    }

    .modal-cert-dialog {
      max-width: 1100px;
      width: 95vw;
      background: #18181b;
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

    .modal-header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
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

    .modal-footer-buttons {
      display: flex;
      gap: 0.75rem;
    }

    .cert-modal-hint {
      font-size: 0.8rem;
      color: #fbbf24;
    }

    .auth-code-badge {
      background: rgba(0, 0, 0, 0.3);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: monospace;
      color: #38bdf8;
    }

    /* ========================================================
       DIAGRAMAÇÃO DO CERTIFICADO OFICIAL A4 PAISAGEM
       ======================================================== */
    .cert-modal-body {
      display: flex;
      justify-content: center;
      padding: 2rem 1rem;
      background: #09090b;
    }

    .certificate-sheet-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      width: 100%;
      max-width: 980px;
    }

    .page-view-selector {
      display: flex;
      gap: 0.35rem;
      background: #27272a;
      padding: 0.25rem;
      border-radius: 0.5rem;
    }

    .view-pill {
      background: transparent;
      border: none;
      color: #a1a1aa;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .view-pill:hover {
      color: #ffffff;
    }

    .view-pill.active {
      background: #3b82f6;
      color: #ffffff;
    }

    .screen-hidden {
      display: none !important;
    }

    .verso-inner {
      background: radial-gradient(circle at center, #ffffff 70%, #f8fafc 100%) !important;
      border-color: #3b82f6 !important;
      padding: 24px 36px !important;
    }

    .verso-header {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .verso-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 900;
      letter-spacing: 0.1em;
      color: #1e3a8a;
      text-transform: uppercase;
      font-family: 'Times New Roman', serif, Georgia;
    }

    .verso-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      margin: 0.5rem 0;
    }

    .verso-explanation {
      font-size: 0.78rem;
      color: #475569;
      max-width: 720px;
      line-height: 1.4;
      margin: 0;
    }

    .verso-qr-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      padding: 0.5rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    }

    .verso-qr-image {
      width: 140px;
      height: 140px;
      display: block;
    }

    .verso-qr-hint {
      font-size: 0.7rem;
      color: #64748b;
      font-weight: 500;
    }

    .verso-data-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem 1.5rem;
      width: 100%;
      max-width: 750px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 0.75rem 1.25rem;
      border-radius: 0.5rem;
      text-align: left;
    }

    .verso-data-item {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .verso-data-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      letter-spacing: 0.03em;
    }

    .verso-data-value {
      font-size: 0.82rem;
      color: #1e293b;
      font-weight: 600;
    }

    .code-highlight {
      font-family: monospace;
      color: #1d4ed8;
      font-weight: 700;
    }

    .hash-text {
      word-break: break-all;
      font-size: 0.75rem;
    }

    .link-text {
      color: #2563eb;
      text-decoration: underline;
      font-size: 0.78rem;
    }

    .verso-footer {
      font-size: 0.7rem;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 0.5rem;
    }

    .cert-issn-mention {
      margin: 0.35rem 0 0 0;
      font-size: 0.85rem;
      color: #3b82f6;
      font-weight: 500;
    }

    .certificate-sheet {
      width: 100%;
      max-width: 980px;
      aspect-ratio: 1.414 / 1; /* Proporção A4 Paisagem */
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
      border: 1.5px solid #d97706; /* Dourado */
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

    .cert-title-area {
      margin: 0.5rem 0;
    }

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

    .cert-body-text p {
      margin: 0.35rem 0;
    }

    .highlight-name {
      font-size: 1.3rem;
      color: #0f172a;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .highlight-event {
      font-size: 1.35rem;
      color: #1e3a8a; /* Azul institucional */
      font-weight: 800;
      font-style: italic;
      margin: 0.4rem 0 !important;
    }

    .cert-course-mention {
      font-size: 0.95rem;
      color: #475569;
    }

    .cert-workload-text {
      font-size: 1rem;
      color: #334155;
    }

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

    .signature-dept {
      font-size: 0.7rem;
      color: #64748b;
    }

    .cert-verification-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px dashed #cbd5e1;
      padding-top: 0.6rem;
      font-size: 0.75rem;
      color: #64748b;
    }

    .cert-date-location {
      font-weight: 600;
      font-style: italic;
    }

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

    /* ========================================================
       REGRAS DE IMPRESSÃO (Delegadas com portal em index.css)
       ======================================================== */
    @media print {
      .no-print {
        display: none !important;
      }
    }
  `],
})
export class CertificatesPageComponent implements OnInit {
  years: CertificateYear[] = []
  courses: CertificateCourse[] = []
  events: CertificateEvent[] = []
  inscriptions: CertificateInscription[] = []

  selectedYear = ''
  selectedCourse = ''
  selectedEvent = ''
  searchQuery = ''

  isLoading = false
  isLoadingEvents = false
  isLoadingDoc = false
  isLoadingLogs = false

  errorMessage = ''
  successMessage = ''

  isCertModalOpen = false
  currentDoc: CertificateDocument | null = null
  certPageView: 'front' | 'back' | 'both' = 'front'

  isLogsModalOpen = false
  emissionLogs: CertificateEmissionLog[] = []

  constructor(private readonly certificatesService: CertificatesService) {}

  ngOnInit(): void {
    this.loadInitialData()
  }

  loadInitialData(): void {
    this.isLoading = true
    this.errorMessage = ''

    this.certificatesService.getYears().subscribe({
      next: (years) => {
        this.years = years
        if (years.length) {
          this.selectedYear = String(years[0].year)
        } else {
          this.selectedYear = String(new Date().getFullYear())
        }

        this.certificatesService.getCourses().subscribe({
          next: (courses) => {
            this.courses = courses
            this.loadEvents()
            this.applyFilters()
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Erro ao carregar cursos.'
            this.isLoading = false
          },
        })
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erro ao carregar anos disponíveis.'
        this.isLoading = false
      },
    })
  }

  loadEvents(): void {
    this.isLoadingEvents = true
    const yearNum = this.selectedYear ? Number.parseInt(this.selectedYear, 10) : undefined
    this.certificatesService
      .getEvents(yearNum, this.selectedCourse || undefined)
      .pipe(finalize(() => (this.isLoadingEvents = false)))
      .subscribe({
        next: (events) => {
          this.events = events
          if (this.selectedEvent && !events.some((e) => e.id === this.selectedEvent)) {
            this.selectedEvent = ''
          }
        },
        error: () => {
          this.events = []
        },
      })
  }

  onYearOrCourseChange(): void {
    this.loadEvents()
    this.applyFilters()
  }

  applyFilters(): void {
    this.isLoading = true
    this.errorMessage = ''

    this.certificatesService
      .searchInscriptions({
        ano: this.selectedYear,
        curso: this.selectedCourse,
        evento: this.selectedEvent,
        busca: this.searchQuery,
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data) => {
          this.inscriptions = data
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao carregar inscrições de participantes.'
        },
      })
  }

  openCertificate(item: CertificateInscription): void {
    if (!item.isEligible) {
      this.errorMessage = `Participante inapto para emissão: ${item.blockedReason || 'requisitos pendentes'}.`
      return
    }

    this.isLoadingDoc = true
    this.errorMessage = ''

    this.certificatesService
      .getDocument(item.id)
      .pipe(finalize(() => (this.isLoadingDoc = false)))
      .subscribe({
        next: (doc) => {
          this.currentDoc = doc
          this.isCertModalOpen = true
          item.emittedCount = (item.emittedCount || 0) + 1
          item.lastEmittedAt = doc.issuedAt
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
    executeCertificatePrint('printable-certificate')
  }

  openLogsModal(): void {
    this.isLogsModalOpen = true
    this.isLoadingLogs = true
    this.certificatesService
      .getLogs()
      .pipe(finalize(() => (this.isLoadingLogs = false)))
      .subscribe({
        next: (logs) => {
          this.emissionLogs = logs
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao carregar histórico de emissões.'
        },
      })
  }

  closeLogsModal(): void {
    this.isLogsModalOpen = false
    this.emissionLogs = []
  }

  getInitials(name: string): string {
    if (!name) return 'EX'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR')
  }

  formatDateTime(dateStr: string): string {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  formatCurrentDate(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  formatCpf(cpf: string | null): string {
    if (!cpf) return ''
    const clean = cpf.replace(/\D/g, '')
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    return cpf
  }
}
