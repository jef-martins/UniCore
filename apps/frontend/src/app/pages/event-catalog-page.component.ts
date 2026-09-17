import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { finalize } from 'rxjs'
import { AuthService } from '../services/auth.service'
import {
  type CertificateDocument,
  type EventCatalogItem,
  CertificatesService,
} from '../services/certificates.service'
import {
  formatDisplayDate,
  formatStudentCpf,
} from './certificates-utils'

@Component({
  selector: 'app-event-catalog-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="catalog-page" aria-labelledby="catalog-title">
      <!-- Cabeçalho Principal -->
      <header class="catalog-heading no-print">
        <div>
          <p class="hero-eyebrow">Programação Acadêmica</p>
          <h1 id="catalog-title">Eventos e Certificados</h1>
          <p>
            Confira a programação completa de congressos, semanas acadêmicas, workshops e palestras da FAIP / UniCore.
          </p>
        </div>
        <div class="catalog-actions">
          <a class="button button-secondary" routerLink="/agenda">
            🗓️ Ver na Minha Agenda
          </a>
          @if (isStaffOrAdmin) {
            <a class="button button-primary" routerLink="/desenvolvedor/cadastros/eventos">
              ⚙️ Gerenciar Eventos
            </a>
          }
        </div>
      </header>

      @if (errorMessage) {
        <p class="error-message no-print" role="alert">{{ errorMessage }}</p>
      }
      @if (successMessage) {
        <p class="success-message no-print" role="status">{{ successMessage }}</p>
      }

      <!-- Barra de Filtros e Busca -->
      <section class="card card-outlined filters-panel no-print">
        <div class="filters-row">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="form-control"
              placeholder="Pesquisar por título, palestrante, curso ou local…"
              [(ngModel)]="searchQuery"
            />
          </div>

          <div class="filter-pills">
            <button
              class="filter-pill"
              [class.active]="activeFilter === 'all'"
              type="button"
              (click)="activeFilter = 'all'"
            >
              Todos ({{ events.length }})
            </button>
            <button
              class="filter-pill"
              [class.active]="activeFilter === 'upcoming'"
              type="button"
              (click)="activeFilter = 'upcoming'"
            >
              🗓️ Próximos & Em Breve
            </button>
            <button
              class="filter-pill"
              [class.active]="activeFilter === 'past'"
              type="button"
              (click)="activeFilter = 'past'"
            >
              🏁 Concluídos
            </button>
            @if (isStudent) {
              <button
                class="filter-pill highlight-pill"
                [class.active]="activeFilter === 'mine'"
                type="button"
                (click)="activeFilter = 'mine'"
              >
                🎓 Minhas Inscrições ({{ countMyEnrollments() }})
              </button>
            }
          </div>
        </div>
      </section>

      <!-- Grid de Eventos -->
      <section class="events-grid no-print">
        @if (isLoading) {
          <div class="loading-state col-span-full">
            <div class="spinner"></div>
            <p>Carregando catálogo de eventos acadêmicos…</p>
          </div>
        } @else if (filteredEvents.length === 0) {
          <div class="empty-state col-span-full card card-outlined">
            <span class="empty-icon">📅</span>
            <h3>Nenhum evento encontrado</h3>
            <p>Não há eventos correspondentes aos filtros selecionados no momento.</p>
            @if (searchQuery || activeFilter !== 'all') {
              <button class="button button-secondary mt-2" type="button" (click)="resetFilters()">
                Limpar Filtros
              </button>
            }
          </div>
        } @else {
          @for (ev of filteredEvents; track ev.id) {
            <article class="card card-elevated event-card" [class.event-enrolled]="ev.isRegistered">
              <!-- Banner / Topo do Card -->
              <div class="event-card-banner">
                @if (ev.logoUrl) {
                  <img [src]="ev.logoUrl" alt="Logo do Evento" class="event-logo-img" />
                } @else {
                  <div class="event-default-banner">
                    <span class="banner-icon">🎓</span>
                  </div>
                }
                <div class="event-workload-badge">
                  <span>{{ ev.workloadHours }}h</span>
                </div>
              </div>

              <!-- Conteúdo do Card -->
              <div class="event-card-body">
                <div class="event-header-info">
                  @if (ev.courseName) {
                    <span class="event-course-tag">{{ ev.courseName }}</span>
                  }
                  <h3 class="event-card-title">{{ ev.title }}</h3>
                </div>

                @if (ev.description) {
                  <p class="event-card-desc">{{ ev.description }}</p>
                }

                <div class="event-meta-list">
                  @if (ev.speaker) {
                    <div class="meta-item">
                      <span class="meta-icon">🎤</span>
                      <span><strong>Palestrante:</strong> {{ ev.speaker }}</span>
                    </div>
                  }
                  <div class="meta-item">
                    <span class="meta-icon">🗓️</span>
                    <span><strong>Período:</strong> {{ formatDate(ev.startDate) }}{{ ev.endDate ? ' a ' + formatDate(ev.endDate) : '' }}</span>
                  </div>
                  @if (ev.location) {
                    <div class="meta-item">
                      <span class="meta-icon">📍</span>
                      <span><strong>Local:</strong> {{ ev.location }}</span>
                    </div>
                  }
                </div>

                <!-- Painel de Inscrição e Certificado do Aluno -->
                @if (ev.isRegistered) {
                  <div class="student-status-box">
                    <div class="status-header">
                      <span class="status-badge-enrolled">✓ Inscrito</span>
                      <div class="status-indicators">
                        @if (ev.isPaid) {
                          <span class="badge-mini badge-paid">💳 Quitado</span>
                        } @else {
                          <span class="badge-mini badge-pending">⏳ Taxa Pendente</span>
                        }
                        @if (ev.hasAttendance) {
                          <span class="badge-mini badge-present">✓ Presente</span>
                        } @else {
                          <span class="badge-mini badge-absent">✕ Ausente</span>
                        }
                      </div>
                    </div>

                    @if (ev.isEligible && ev.participantId) {
                      <button
                        class="button button-primary button-sm btn-certificate-claim"
                        type="button"
                        (click)="viewMyCertificate(ev.participantId)"
                      >
                        📜 Ver Meu Certificado
                      </button>
                    } @else {
                      <p class="cert-pending-hint">
                        Certificado liberado após quitação da inscrição e confirmação de presença.
                      </p>
                    }
                  </div>
                }
              </div>

              <!-- Rodapé do Card -->
              <div class="event-card-footer">
                <button
                  class="button button-secondary button-sm"
                  type="button"
                  (click)="openEventDetailsModal(ev)"
                >
                  ℹ️ Ver Detalhes
                </button>
                @if (ev.isRegistered && ev.isEligible && ev.participantId) {
                  <button
                    class="button button-primary button-sm"
                    type="button"
                    (click)="viewMyCertificate(ev.participantId)"
                  >
                    🎓 Certificado
                  </button>
                }
              </div>
            </article>
          }
        }
      </section>

      <!-- Modal de Detalhes do Evento -->
      @if (selectedEventForDetails) {
        <div class="modal-backdrop" (click)="closeDetailsModal()">
          <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>{{ selectedEventForDetails.title }}</h2>
                <span class="modal-subtitle">
                  {{ selectedEventForDetails.courseName || 'Evento Institucional' }} &bull; Carga Horária: {{ selectedEventForDetails.workloadHours }}h
                </span>
              </div>
              <button class="btn-close" type="button" (click)="closeDetailsModal()" aria-label="Fechar">✕</button>
            </div>

            <div class="modal-body">
              @if (selectedEventForDetails.logoUrl) {
                <div class="details-logo-wrap">
                  <img [src]="selectedEventForDetails.logoUrl" alt="Logo" class="details-logo-img" />
                </div>
              }

              <div class="details-info-grid">
                @if (selectedEventForDetails.speaker) {
                  <div class="info-block">
                    <span class="info-label">Ministrante / Palestrante</span>
                    <span class="info-val">🎤 {{ selectedEventForDetails.speaker }}</span>
                  </div>
                }
                <div class="info-block">
                  <span class="info-label">Período</span>
                  <span class="info-val">🗓️ {{ formatDate(selectedEventForDetails.startDate) }}{{ selectedEventForDetails.endDate ? ' a ' + formatDate(selectedEventForDetails.endDate) : '' }}</span>
                </div>
                @if (selectedEventForDetails.location) {
                  <div class="info-block">
                    <span class="info-label">Local de Realização</span>
                    <span class="info-val">📍 {{ selectedEventForDetails.location }}</span>
                  </div>
                }
                <div class="info-block">
                  <span class="info-label">Carga Horária Válida</span>
                  <span class="info-val">⏱️ {{ selectedEventForDetails.workloadHours }} horas complementares</span>
                </div>
              </div>

              @if (selectedEventForDetails.description) {
                <div class="details-description">
                  <h4>Sobre o Evento</h4>
                  <p>{{ selectedEventForDetails.description }}</p>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="button button-secondary" type="button" (click)="closeDetailsModal()">
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
              <div>
                <h2>Certificado de Extensão Universitária</h2>
                <span class="modal-subtitle">Documento oficial de certificação acadêmica</span>
              </div>
              <div class="modal-header-actions">
                <button class="button button-primary print-action-btn" type="button" (click)="printCertificate()">
                  🖨️ Imprimir / Salvar PDF
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
                    <!-- Nome do Aluno posicionado sobre o certificado -->
                    <div
                      class="custom-cert-name"
                      [style.top]="(currentDoc.templateStyle?.studentNameTop || 48) + '%'"
                      [style.color]="currentDoc.templateStyle?.studentNameColor || '#0f172a'"
                      [style.font-size]="(currentDoc.templateStyle?.studentNameFontSize || 34) + 'px'"
                    >
                      {{ currentDoc.studentName }}
                    </div>

                    <!-- Código de Autenticidade Digital -->
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
                          totalizando a carga horária de <strong>{{ currentDoc.workloadHours }} horas</strong>
                          de atividades acadêmicas complementares.
                        </p>
                      </div>

                      <div class="cert-footer">
                        <div class="cert-signatures">
                          <div class="signature-block">
                            <div class="signature-line"></div>
                            <span class="signature-role">Coordenação de Extensão</span>
                            <span class="signature-dept">Comissão Científica</span>
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
              @if (currentDoc.certificateTemplateUrl) {
                <button
                  class="button button-secondary button-sm"
                  type="button"
                  (click)="useOfficialLayoutOnly = !useOfficialLayoutOnly"
                >
                  {{ useOfficialLayoutOnly ? '🖼️ Ver com Modelo de Fundo' : '🏛️ Ver no Modelo Oficial FAIP' }}
                </button>
              }
              <button class="button button-secondary" type="button" (click)="closeCertModal()">
                Fechar
              </button>
              <button class="button button-primary" type="button" (click)="printCertificate()">
                🖨️ Imprimir Certificado
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .catalog-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .catalog-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .catalog-heading h1 {
      margin: 0.25rem 0 0.5rem 0;
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--color-text, #ffffff);
      letter-spacing: -0.02em;
    }

    .catalog-heading p {
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

    .catalog-actions {
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

    /* Filtros */
    .filters-panel {
      padding: 1rem 1.25rem;
      background: var(--color-surface, #1e1e24);
      border-radius: 12px;
    }

    .filters-row {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .search-box {
      display: flex;
      align-items: center;
      position: relative;
      width: 100%;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      font-size: 1rem;
      pointer-events: none;
      opacity: 0.6;
    }

    .search-box input {
      padding-left: 2.75rem;
    }

    .filter-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--color-text-secondary, #a1a1aa);
      padding: 0.4rem 0.9rem;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .filter-pill:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .filter-pill.active {
      background: var(--color-primary, #38bdf8);
      border-color: var(--color-primary, #38bdf8);
      color: #0f172a;
    }

    .filter-pill.highlight-pill {
      border-color: rgba(73, 209, 125, 0.4);
      color: #49d17d;
    }

    .filter-pill.highlight-pill.active {
      background: #49d17d;
      color: #064e3b;
    }

    /* Grid */
    .events-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }

    .event-card {
      display: flex;
      flex-direction: column;
      border-radius: 12px;
      overflow: hidden;
      background: var(--color-surface, #1e1e24);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .event-card:hover {
      transform: translateY(-2px);
      border-color: rgba(56, 189, 248, 0.35);
    }

    .event-card.event-enrolled {
      border-color: rgba(73, 209, 125, 0.4);
    }

    .event-card-banner {
      height: 120px;
      background: linear-gradient(135deg, rgba(30, 58, 138, 0.6), rgba(88, 28, 135, 0.6));
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .event-logo-img {
      max-height: 90px;
      max-width: 80%;
      object-fit: contain;
      filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4));
    }

    .event-default-banner {
      font-size: 3rem;
      opacity: 0.8;
    }

    .event-workload-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(245, 158, 11, 0.5);
      color: #fbbf24;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
    }

    .event-card-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex: 1;
    }

    .event-course-tag {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-primary, #38bdf8);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }

    .event-card-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--color-text, #ffffff);
      line-height: 1.3;
    }

    .event-card-desc {
      margin: 0;
      font-size: 0.85rem;
      color: var(--color-text-secondary, #a1a1aa);
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
      color: #d4d4d8;
      background: rgba(255, 255, 255, 0.02);
      padding: 0.65rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .student-status-box {
      margin-top: auto;
      padding: 0.75rem;
      background: rgba(73, 209, 125, 0.06);
      border: 1px solid rgba(73, 209, 125, 0.25);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .status-badge-enrolled {
      font-size: 0.75rem;
      font-weight: 800;
      color: #49d17d;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-indicators {
      display: flex;
      gap: 0.35rem;
    }

    .badge-mini {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    .badge-paid { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .badge-pending { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .badge-present { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .badge-absent { background: rgba(239, 68, 68, 0.2); color: #f87171; }

    .cert-pending-hint {
      margin: 0;
      font-size: 0.72rem;
      color: #94a3b8;
      line-height: 1.25;
    }

    .btn-certificate-claim {
      width: 100%;
      background: linear-gradient(135deg, #10b981, #059669);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    .event-card-footer {
      padding: 0.85rem 1.25rem;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1.5rem;
      overflow-y: auto;
    }

    .modal-dialog {
      background: #181d1a;
      border: 1px solid #3f3f46;
      border-radius: 12px;
      width: 100%;
      max-width: 650px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      color: #fff;
    }

    .modal-subtitle {
      font-size: 0.85rem;
      color: #a1a1aa;
    }

    .btn-close {
      background: none;
      border: none;
      color: #a1a1aa;
      font-size: 1.25rem;
      cursor: pointer;
    }

    .btn-close:hover { color: #fff; }

    .modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .details-logo-wrap {
      text-align: center;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
    }

    .details-logo-img {
      max-height: 120px;
      max-width: 100%;
      object-fit: contain;
    }

    .details-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .info-block {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .info-label {
      font-size: 0.75rem;
      color: #a1a1aa;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .info-val {
      font-size: 0.9rem;
      color: #f4f4f5;
      font-weight: 600;
    }

    .details-description h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.95rem;
      color: #fff;
    }

    .details-description p {
      margin: 0;
      font-size: 0.9rem;
      color: #d4d4d8;
      line-height: 1.5;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    /* Modal do Certificado */
    .modal-cert-dialog {
      max-width: 1080px;
      width: 100%;
      background: #0f172a;
    }

    .cert-modal-body {
      padding: 1.5rem;
      background: #334155;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow-x: auto;
    }

    .certificate-sheet {
      width: 960px;
      height: 678px;
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }

    /* Certificado com Modelo Personalizado de Fundo */
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
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      transform: translateY(-50%);
    }

    .custom-cert-auth {
      position: absolute;
      bottom: 20px;
      right: 30px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      font-size: 0.75rem;
      color: #475569;
      font-family: monospace;
      background: rgba(255, 255, 255, 0.85);
      padding: 4px 10px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    /* Certificado Oficial FAIP */
    .cert-outer-border {
      padding: 16px;
      height: 100%;
      box-sizing: border-box;
      border: 8px solid #1e3a8a;
    }

    .cert-inner-border {
      border: 2px solid #b45309;
      height: 100%;
      box-sizing: border-box;
      padding: 24px 36px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      position: relative;
    }

    .cert-header {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .cert-emblem { font-size: 2.5rem; margin-bottom: 0.25rem; }
    .cert-custom-logo { max-height: 55px; margin-bottom: 0.25rem; object-fit: contain; }

    .cert-institution-name {
      margin: 0;
      font-size: 1.4rem;
      font-family: 'Georgia', serif;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: 0.02em;
    }

    .cert-subheading {
      margin: 0.2rem 0 0.5rem 0;
      font-size: 0.85rem;
      color: #475569;
      font-style: italic;
    }

    .cert-divider {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 60%;
      margin: 0.25rem auto;
    }

    .cert-divider-line { flex: 1; height: 1px; background: #b45309; }
    .cert-divider-diamond { color: #b45309; font-size: 0.75rem; }

    .cert-title-area { margin: 0.5rem 0; }
    .cert-title {
      margin: 0;
      font-size: 2.2rem;
      font-family: 'Times New Roman', Georgia, serif;
      font-weight: 800;
      letter-spacing: 0.25em;
      color: #1e3a8a;
    }

    .cert-body-text {
      font-family: 'Georgia', serif;
      font-size: 1.1rem;
      line-height: 1.6;
      color: #1e293b;
      margin: 0.5rem 0;
      padding: 0 1.5rem;
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
      color: #1e3a8a;
      font-weight: 800;
      font-style: italic;
      margin: 0.35rem 0;
    }

    .cert-course-mention { font-size: 0.95rem; color: #475569; margin: 0.2rem 0; }
    .cert-workload-text { font-size: 1rem; color: #334155; margin: 0.2rem 0; }

    .cert-footer {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
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

    /* Impressão */
    @media print {
      body * { visibility: hidden; }

      .no-print,
      .layout-shell header,
      .sidebar,
      .top-bar,
      .catalog-heading,
      .filters-panel,
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
export class EventCatalogPageComponent implements OnInit {
  events: EventCatalogItem[] = []
  isLoading = false
  errorMessage = ''
  successMessage = ''

  searchQuery = ''
  activeFilter: 'all' | 'upcoming' | 'past' | 'mine' = 'all'

  selectedEventForDetails: EventCatalogItem | null = null

  // Certificado
  isCertModalOpen = false
  currentDoc: CertificateDocument | null = null
  useOfficialLayoutOnly = false

  constructor(
    private readonly certificatesService: CertificatesService,
    public readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadCatalog()
  }

  get isStudent(): boolean {
    return this.authService.currentUser?.role === 'aluno'
  }

  get isStaffOrAdmin(): boolean {
    const role = this.authService.currentUser?.role
    return role === 'admin' || role === 'master'
  }

  loadCatalog(): void {
    this.isLoading = true
    this.errorMessage = ''

    this.certificatesService
      .getEventsCatalog()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (events) => {
          this.events = events
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao carregar catálogo de eventos.'
        },
      })
  }

  get filteredEvents(): EventCatalogItem[] {
    const query = this.searchQuery.trim().toLowerCase()
    const now = new Date().toISOString().split('T')[0]

    return this.events.filter((ev) => {
      // Filtro de texto
      if (query) {
        const matchTitle = ev.title?.toLowerCase().includes(query)
        const matchSpeaker = ev.speaker?.toLowerCase().includes(query)
        const matchCourse = ev.courseName?.toLowerCase().includes(query)
        const matchLocation = ev.location?.toLowerCase().includes(query)
        if (!matchTitle && !matchSpeaker && !matchCourse && !matchLocation) return false
      }

      // Filtro de aba
      if (this.activeFilter === 'mine') {
        return ev.isRegistered
      }
      if (this.activeFilter === 'upcoming') {
        const eventEnd = ev.endDate ? ev.endDate.split('T')[0] : ev.startDate.split('T')[0]
        return eventEnd >= now
      }
      if (this.activeFilter === 'past') {
        const eventEnd = ev.endDate ? ev.endDate.split('T')[0] : ev.startDate.split('T')[0]
        return eventEnd < now
      }

      return true
    })
  }

  countMyEnrollments(): number {
    return this.events.filter((e) => e.isRegistered).length
  }

  resetFilters(): void {
    this.searchQuery = ''
    this.activeFilter = 'all'
  }

  openEventDetailsModal(event: EventCatalogItem): void {
    this.selectedEventForDetails = event
  }

  closeDetailsModal(): void {
    this.selectedEventForDetails = null
  }

  viewMyCertificate(participantId: string): void {
    this.errorMessage = ''
    this.certificatesService.getMyCertificate(participantId).subscribe({
      next: (doc) => {
        this.currentDoc = doc
        this.useOfficialLayoutOnly = false
        this.isCertModalOpen = true
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erro ao carregar certificado.'
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
