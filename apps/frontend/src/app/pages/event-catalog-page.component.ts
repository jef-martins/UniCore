import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { finalize } from 'rxjs'
import { AuthService } from '../services/auth.service'
import {
  type CertificateDocument,
  type EventArticle,
  type EventCatalogItem,
  type EventFeedback,
  type EventTicket,
  type EventWorkshop,
  CertificatesService,
  type LookupCpfResult,
} from '../services/certificates.service'
import {
  executeCertificatePrint,
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
          <button class="button button-outline" type="button" (click)="openMyTicketsModal()">
            🎟️ Meus Ingressos
          </button>
          <button class="button button-outline" type="button" (click)="openMyArticlesModal()">
            📝 Meus Trabalhos
          </button>
          <a class="button button-secondary" routerLink="/eventos/portaria">
            🚪 Portaria & Scanner
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
                @if (ev.bannerUrl || ev.logoUrl) {
                  <img [src]="ev.bannerUrl || ev.logoUrl" alt="Banner do Evento" class="event-banner-img" />
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
                  <div class="tags-row">
                    @if (ev.courseName) {
                      <span class="event-course-tag">{{ ev.courseName }}</span>
                    }
                    @if (ev.ticketType === 'gratuito') {
                      <span class="badge-price-free">🏷️ Gratuito</span>
                    } @else if (ev.standardPrice) {
                      <span class="badge-price-paid">💳 R$ {{ ev.standardPrice | number: '1.2-2' }}</span>
                    }
                    @if (ev.promoPrice && isPromoActive(ev)) {
                      <span class="badge-price-promo">🔥 Promo: R$ {{ ev.promoPrice | number: '1.2-2' }}</span>
                    }
                  </div>
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
                  @if (ev.acceptsArticles) {
                    <div class="meta-item text-primary">
                      <span class="meta-icon">📑</span>
                      <span>Submissão de artigos aberta{{ ev.articlesDeadline ? ' até ' + formatDate(ev.articlesDeadline) : '' }}</span>
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
                    } @else if (ev.isReleaseLocked) {
                      <p class="cert-pending-hint release-locked-hint">
                        🔒 Certificado liberado a partir de {{ ev.certificateReleaseDate | date: 'dd/MM/yyyy' }}.
                      </p>
                    } @else {
                      <p class="cert-pending-hint">
                        Certificado liberado após quitação e presença na portaria.
                      </p>
                    }
                  </div>
                }
              </div>

              <!-- Rodapé do Card com Ações -->
              <div class="event-card-footer">
                <button
                  class="button button-secondary button-sm"
                  type="button"
                  (click)="openEventDetailsModal(ev)"
                >
                  ℹ️ Detalhes
                </button>

                @if (!ev.isRegistered) {
                  <button
                    class="button button-primary button-sm"
                    type="button"
                    (click)="openEnrollModal(ev)"
                  >
                    🎟️ Garantir Ingresso
                  </button>
                } @else {
                  <button
                    class="button button-outline button-sm"
                    type="button"
                    (click)="openFeedbackModal(ev)"
                    title="Avaliar este evento"
                  >
                    ⭐ Avaliar
                  </button>
                }

                @if (ev.acceptsArticles) {
                  <button
                    class="button button-outline button-sm"
                    type="button"
                    (click)="openArticleModal(ev)"
                  >
                    📄 Submeter Artigo
                  </button>
                }
              </div>
            </article>
          }
        }
      </section>

      <!-- ==========================================
           MODAL DE DETALHES DO EVENTO
           ========================================== -->
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
              @if (selectedEventForDetails.bannerUrl || selectedEventForDetails.logoUrl) {
                <div class="details-logo-wrap">
                  <img [src]="selectedEventForDetails.bannerUrl || selectedEventForDetails.logoUrl" alt="Banner" class="details-logo-img" />
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
              @if (!selectedEventForDetails.isRegistered) {
                <button class="button button-primary" type="button" (click)="openEnrollModal(selectedEventForDetails)">
                  🎟️ Inscrever-se Agora
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- ==========================================
           MODAL DE INSCRIÇÃO & COMPRA DE INGRESSO
           ========================================== -->
      @if (isEnrollModalOpen && eventToEnroll) {
        <div class="modal-backdrop" (click)="closeEnrollModal()">
          <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>Inscrição no Evento</h2>
                <span class="modal-subtitle">{{ eventToEnroll.title }}</span>
              </div>
              <button class="btn-close" type="button" (click)="closeEnrollModal()" aria-label="Fechar">✕</button>
            </div>

            <div class="modal-body">
              <!-- Identificação de CPF e Perfil Acadêmico -->
              <div class="cpf-lookup-box">
                <label for="enroll-cpf">Informe seu CPF para validação de perfil e taxa:</label>
                <div class="cpf-input-group">
                  <input
                    id="enroll-cpf"
                    type="text"
                    class="form-control"
                    placeholder="000.000.000-00"
                    [(ngModel)]="enrollCpf"
                    (input)="onCpfInputChanged()"
                    maxlength="14"
                  />
                  <button
                    type="button"
                    class="button button-secondary button-sm"
                    (click)="searchCpfProfile()"
                    [disabled]="isCheckingCpf"
                  >
                    {{ isCheckingCpf ? 'Buscando...' : 'Verificar CPF' }}
                  </button>
                </div>

                @if (cpfLookupResult) {
                  <div class="profile-detected-banner" [class.is-prof]="cpfLookupResult.perfil === 'professor'" [class.is-aluno]="cpfLookupResult.perfil === 'aluno'">
                    @if (cpfLookupResult.perfil === 'professor') {
                      <span class="badge-icon">👨‍🏫</span>
                      <div>
                        <strong>Docente FAIP Identificado:</strong> {{ cpfLookupResult.nome }}
                        <div class="text-xs">Tarifa diferenciada para professores aplicada com sucesso!</div>
                      </div>
                    } @else if (cpfLookupResult.perfil === 'aluno') {
                      <span class="badge-icon">🎓</span>
                      <div>
                        <strong>Aluno(a) FAIP:</strong> {{ cpfLookupResult.nome }}
                        @if (cpfLookupResult.curso) { <span class="text-xs"> • Curso: {{ cpfLookupResult.curso }}</span> }
                        @if (cpfLookupResult.ra) { <span class="text-xs"> • RA: {{ cpfLookupResult.ra }}</span> }
                      </div>
                    } @else {
                      <span class="badge-icon">👤</span>
                      <div>
                        <strong>Participante Externo / Visitante</strong>
                        <div class="text-xs">Inscrição aberta ao público geral.</div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Detalhamento de Valor -->
              <div class="pricing-summary-card">
                <span class="pricing-label">Valor da Inscrição:</span>
                @if (eventToEnroll.ticketType === 'gratuito') {
                  <span class="pricing-amount text-success">Gratuito</span>
                } @else {
                  <div class="pricing-val-wrap">
                    <span class="pricing-amount">R$ {{ calculateTicketPrice(eventToEnroll) | number: '1.2-2' }}</span>
                    @if (isPromoActive(eventToEnroll)) {
                      <span class="promo-countdown-tag">
                        🔥 Lote Promocional aplicado até {{ formatDate(eventToEnroll.promoDeadline) }}
                      </span>
                    }
                  </div>
                }
              </div>

              <!-- Seleção de Workshops Disponíveis -->
              @if (isLoadingWorkshops) {
                <div class="loading-state">
                  <div class="spinner"></div>
                  <p>Carregando oficinas e workshops disponíveis...</p>
                </div>
              } @else if (availableWorkshops.length > 0) {
                <div class="form-group">
                  <label>Escolha seu Workshop / Oficina (Opcional):</label>
                  <div class="workshop-options-list">
                    @for (wk of availableWorkshops; track wk.id) {
                      <label class="workshop-option-item" [class.option-disabled]="wk.remainingVacancies <= 0">
                        <input
                          type="checkbox"
                          [checked]="selectedWorkshopIds.includes(wk.id)"
                          [disabled]="wk.remainingVacancies <= 0"
                          (change)="toggleWorkshopSelection(wk.id)"
                        />
                        <div class="workshop-option-info">
                          <span class="workshop-option-title">{{ wk.title }}</span>
                          <span class="workshop-option-vacancies">
                            {{ wk.remainingVacancies > 0 ? (wk.remainingVacancies + ' vagas restantes') : 'ESGOTADO' }}
                          </span>
                        </div>
                      </label>
                    }
                  </div>
                </div>
              }

              <!-- Informações de Pagamento Pix / Comprovante -->
              @if (eventToEnroll.ticketType !== 'gratuito') {
                <div class="payment-pix-box">
                  <h4>Pagamento via Pix</h4>
                  <p>Transfira o valor acima e anexe o comprovante para liberação imediata da credencial.</p>
                  
                  @if (eventToEnroll.pixKey) {
                    <div class="pix-key-display">
                      <span>Chave Pix: <strong>{{ eventToEnroll.pixKey }}</strong></span>
                    </div>
                  }

                  <div class="form-group mt-2">
                    <label for="enroll-receipt">Comprovante de Pagamento (PDF ou Imagem):</label>
                    <input
                      id="enroll-receipt"
                      type="file"
                      class="form-control"
                      accept="image/*,application/pdf"
                      (change)="onReceiptFileSelected($event)"
                    />
                  </div>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="button button-secondary" type="button" (click)="closeEnrollModal()" [disabled]="isSubmittingEnroll">
                Cancelar
              </button>
              <button class="button button-primary" type="button" (click)="confirmEnrollment()" [disabled]="isSubmittingEnroll">
                {{ isSubmittingEnroll ? 'Processando Inscrição...' : 'Confirmar Inscrição' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ==========================================
           MODAL MEUS INGRESSOS DIGITAIS
           ========================================== -->
      @if (isMyTicketsModalOpen) {
        <div class="modal-backdrop" (click)="closeMyTicketsModal()">
          <div class="modal-dialog modal-lg card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>Meus Ingressos Digitais</h2>
                <span class="modal-subtitle">Credenciais de acesso e comprovantes de presença</span>
              </div>
              <button class="btn-close" type="button" (click)="closeMyTicketsModal()" aria-label="Fechar">✕</button>
            </div>

            <div class="modal-body">
              @if (isLoadingTickets) {
                <div class="loading-state">
                  <div class="spinner"></div>
                  <p>Carregando seus ingressos...</p>
                </div>
              } @else if (myTickets.length === 0) {
                <div class="empty-state">
                  <p>Você ainda não possui ingressos cadastrados.</p>
                </div>
              } @else {
                <div class="tickets-cards-grid">
                  @for (t of myTickets; track t.id) {
                    <div class="ticket-digital-card">
                      <div class="ticket-card-header">
                        <span class="ticket-event-name">{{ t.eventTitle }}</span>
                        <span
                          class="status-pill"
                          [class.pill-paid]="t.status === 'pago'"
                          [class.pill-pending]="t.status === 'aguardando_pagamento' || t.status === 'em_analise'"
                          [class.pill-rejected]="t.status === 'rejeitado'"
                        >
                          {{ formatTicketStatus(t.status) }}
                        </span>
                      </div>

                      <div class="ticket-credential-box">
                        <span class="credential-label">CÓDIGO DE ACESSO PORTARIA</span>
                        <span class="credential-code">{{ t.uniqueCode }}</span>
                      </div>

                      <div class="ticket-meta">
                        <span>Valor: R$ {{ t.amountPaid | number: '1.2-2' }}</span>
                        @if (t.workshops.length > 0) {
                          <span class="ticket-workshop-name">Oficina: {{ t.workshops[0].title }}</span>
                        }
                      </div>

                      <div class="ticket-actions-row flex-wrap gap-2 mt-2">
                        <button type="button" class="button button-outline button-xs" (click)="openQrCodeModal(t)">
                          📱 Ver QR Code
                        </button>
                        <button type="button" class="button button-outline button-xs" (click)="openRequirementModal(t)">
                          📄 Requerimento FAIP (2ª via)
                        </button>
                        <button type="button" class="button button-outline button-xs" (click)="openSwitchWorkshopModal(t)">
                          🔄 Trocar Oficina
                        </button>
                        @if (t.status === 'aguardando_pagamento') {
                          <label class="button button-primary button-xs upload-receipt-label">
                            📎 Anexar Comprovante
                            <input type="file" (change)="uploadReceiptForTicket(t.id, $event)" hidden />
                          </label>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="button button-secondary" type="button" (click)="closeMyTicketsModal()">
                Fechar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ==========================================
           MODAL QR CODE DE ACESSO
           ========================================== -->
      @if (isQrCodeModalOpen && ticketForQrCode) {
        <div class="modal-backdrop" (click)="closeQrCodeModal()">
          <div class="modal-dialog card card-elevated qr-modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>Credencial de Acesso</h2>
                <span class="modal-subtitle">{{ ticketForQrCode.eventTitle }}</span>
              </div>
              <button class="btn-close" type="button" (click)="closeQrCodeModal()" aria-label="Fechar">✕</button>
            </div>

            <div class="modal-body text-center qr-modal-body">
              <div class="qr-code-wrapper">
                <img
                  [src]="'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + ticketForQrCode.uniqueCode"
                  alt="QR Code de Acesso"
                  class="qr-code-image"
                />
              </div>

              <div class="qr-code-details mt-3">
                <span class="qr-unique-code">{{ ticketForQrCode.uniqueCode }}</span>
                <span class="status-pill mt-2" [class.pill-paid]="ticketForQrCode.status === 'pago'" [class.pill-pending]="ticketForQrCode.status !== 'pago'">
                  {{ formatTicketStatus(ticketForQrCode.status) }}
                </span>
                @if (ticketForQrCode.workshops.length > 0) {
                  <p class="text-sm text-muted mt-2">
                    Oficina: <strong>{{ ticketForQrCode.workshops[0].title }}</strong>
                  </p>
                }
                <p class="text-xs text-muted mt-2">
                  Apresente este código no leitor óptico / câmera da portaria no dia do evento.
                </p>
              </div>
            </div>

            <div class="modal-footer">
              <button class="button button-secondary" type="button" (click)="closeQrCodeModal()">
                Fechar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ==========================================
           MODAL REQUERIMENTO OFICIAL FAIP (2ª VIA)
           ========================================== -->
      @if (isRequirementModalOpen && ticketForRequirement) {
        <div class="modal-backdrop" (click)="closeRequirementModal()">
          <div class="modal-dialog modal-lg card card-elevated requirement-modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header no-print">
              <div>
                <h2>Requerimento de Inscrição Oficial</h2>
                <span class="modal-subtitle">2ª via para quitação na Tesouraria Acadêmica FAIP</span>
              </div>
              <div class="modal-header-actions">
                <button class="button button-primary" type="button" (click)="printRequirement()">
                  🖨️ Imprimir / Salvar PDF
                </button>
                <button class="btn-close" type="button" (click)="closeRequirementModal()" aria-label="Fechar">✕</button>
              </div>
            </div>

            <div class="modal-body requirement-modal-body">
              <div class="requirement-sheet" id="printable-requirement">
                <!-- Cabeçalho Oficial -->
                <div class="req-header">
                  <div class="req-institution">
                    <h3>FAIP - FACULDADE DE ENSINO SUPERIOR</h3>
                    <p>UniCore • Sistema Integrado de Gestão Acadêmica</p>
                  </div>
                  <div class="req-protocol-badge">
                    <span class="req-proto-label">PROTOCOLO</span>
                    <span class="req-proto-number">#{{ formatProtocol(ticketForRequirement.id) }}</span>
                  </div>
                </div>

                <div class="req-divider"></div>

                <!-- Dados do Evento e Inscrição -->
                <div class="req-section-title">DADOS DO EVENTO ACADÊMICO</div>
                <div class="req-grid-info">
                  <div><strong>Evento:</strong> {{ ticketForRequirement.eventTitle }}</div>
                  <div><strong>Código de Validação:</strong> {{ ticketForRequirement.uniqueCode }}</div>
                  <div><strong>Status Atual:</strong> {{ formatTicketStatus(ticketForRequirement.status) }}</div>
                  <div><strong>Vencimento da Inscrição:</strong> {{ formatDate(ticketForRequirement.dueDate) }}</div>
                </div>

                <!-- Detalhes de Workshop -->
                @if (ticketForRequirement.workshops.length > 0) {
                  <div class="req-section-title mt-3">OFICINA / WORKSHOP SELECIONADO</div>
                  <div class="req-workshop-box">
                    <strong>{{ ticketForRequirement.workshops[0].title }}</strong>
                  </div>
                }

                <!-- Valor e Instruções de Quitação -->
                <div class="req-section-title mt-3">VALOR E INSTRUÇÕES DE PAGAMENTO</div>
                <div class="req-payment-info">
                  <div class="req-amount-box">
                    <span>Taxa de Inscrição:</span>
                    <strong>R$ {{ ticketForRequirement.amountPaid | number: '1.2-2' }}</strong>
                  </div>
                  <p class="req-instructions">
                    Dirija-se ao guichê da <strong>Tesouraria Acadêmica FAIP</strong> munido deste requerimento para quitação da taxa e liberação do acesso. A apresentação deste protocolo garante a reserva até a data limite.
                  </p>
                </div>

                <!-- Linha Picotada de Destaque -->
                <div class="req-perforated-line">
                  <span>✂ - - - - - - - - - - - - - - - - CANHOTO DE AUTENTICAÇÃO DA TESOURARIA - - - - - - - - - - - - - - - - ✂</span>
                </div>

                <!-- Canhoto de Autenticação -->
                <div class="req-stub-box">
                  <div class="req-stub-data">
                    <div><strong>Protocolo:</strong> #{{ formatProtocol(ticketForRequirement.id) }} • <strong>Código:</strong> {{ ticketForRequirement.uniqueCode }}</div>
                    <div><strong>Evento:</strong> {{ ticketForRequirement.eventTitle }}</div>
                    <div><strong>Valor:</strong> R$ {{ ticketForRequirement.amountPaid | number: '1.2-2' }}</div>
                  </div>
                  <div class="req-stub-signature">
                    <div class="signature-line"></div>
                    <span class="text-xs">Data: ____/____/________ • Visto / Carimbo Tesouraria</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer no-print">
              <button class="button button-secondary" type="button" (click)="closeRequirementModal()">
                Fechar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ==========================================
           MODAL TROCAR OFICINA / WORKSHOP
           ========================================== -->
      @if (isSwitchWorkshopModalOpen && ticketToSwitchWorkshop) {
        <div class="modal-backdrop" (click)="closeSwitchWorkshopModal()">
          <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>Trocar de Workshop / Oficina</h2>
                <span class="modal-subtitle">{{ ticketToSwitchWorkshop.eventTitle }}</span>
              </div>
              <button class="btn-close" type="button" (click)="closeSwitchWorkshopModal()" aria-label="Fechar">✕</button>
            </div>

            <div class="modal-body">
              <p class="text-sm text-muted mb-3">
                A troca de oficina transfere sua vaga atomicamente para o novo minicurso selecionado.
              </p>

              @if (ticketToSwitchWorkshop.workshops.length > 0) {
                <div class="current-workshop-info mb-3">
                  <span class="text-xs text-muted">Oficina Atual:</span>
                  <strong>{{ ticketToSwitchWorkshop.workshops[0].title }}</strong>
                </div>
              }

              @if (isLoadingSwitchWorkshops) {
                <div class="loading-state">
                  <div class="spinner"></div>
                  <p>Carregando oficinas...</p>
                </div>
              } @else if (switchWorkshopsList.length === 0) {
                <div class="empty-state">
                  <p>Não há outras oficinas disponíveis para troca neste evento.</p>
                </div>
              } @else {
                <div class="form-group">
                  <label for="new-workshop-select">Selecione a Nova Oficina:</label>
                  <select id="new-workshop-select" class="form-control" [(ngModel)]="selectedNewWorkshopId">
                    <option value="" disabled selected>Escolha uma oficina com vagas abertas</option>
                    @for (w of switchWorkshopsList; track w.id) {
                      <option [value]="w.id" [disabled]="w.remainingVacancies <= 0">
                        {{ w.title }} ({{ w.remainingVacancies > 0 ? (w.remainingVacancies + ' vagas restantes') : 'ESGOTADO' }})
                      </option>
                    }
                  </select>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="button button-secondary" type="button" (click)="closeSwitchWorkshopModal()" [disabled]="isSwitchingWorkshop">
                Cancelar
              </button>
              <button
                class="button button-primary"
                type="button"
                (click)="confirmWorkshopSwitch()"
                [disabled]="isSwitchingWorkshop || !selectedNewWorkshopId"
              >
                {{ isSwitchingWorkshop ? 'Processando Troca...' : 'Confirmar Troca de Vaga' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ==========================================
           MODAL DE SUBMISSÃO DE ARTIGO CIENTÍFICO
           ========================================== -->
      @if (isArticleModalOpen && eventForArticle) {
        <div class="modal-backdrop" (click)="closeArticleModal()">
          <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>Submissão de Trabalho Científico</h2>
                <span class="modal-subtitle">{{ eventForArticle.title }}</span>
              </div>
              <button class="btn-close" type="button" (click)="closeArticleModal()" aria-label="Fechar">✕</button>
            </div>

            <form (ngSubmit)="submitArticleForm()">
              <div class="modal-body form-grid">
                <div class="form-group col-span-2">
                  <label for="art-title">Título do Artigo / Trabalho *</label>
                  <input
                    id="art-title"
                    type="text"
                    class="form-control"
                    placeholder="Ex: Impacto da Automação na Educação Superior"
                    [(ngModel)]="articleTitle"
                    name="artTitle"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="art-advisor">Nome do Orientador</label>
                  <input
                    id="art-advisor"
                    type="text"
                    class="form-control"
                    placeholder="Ex: Prof. Dr. Carlos Andrade"
                    [(ngModel)]="articleAdvisor"
                    name="artAdvisor"
                  />
                </div>

                <div class="form-group">
                  <label for="art-coadvisor">Nome do Coorientador</label>
                  <input
                    id="art-coadvisor"
                    type="text"
                    class="form-control"
                    placeholder="Ex: Profa. Ma. Fernanda Costa"
                    [(ngModel)]="articleCoAdvisor"
                    name="artCoAdvisor"
                  />
                </div>

                <div class="form-group col-span-2">
                  <label for="art-coauthors">Coautores (Inscritos no Evento)</label>
                  <input
                    id="art-coauthors"
                    type="text"
                    class="form-control"
                    placeholder="Nomes dos coautores separados por vírgula"
                    [(ngModel)]="articleCoauthors"
                    name="artCoauthors"
                  />
                  <small class="text-muted">Apenas participantes com inscrição quitada podem figurar como coautores.</small>

                  @if (eligibleCoauthorsList.length > 0) {
                    <div class="eligible-coauthors-box mt-2">
                      <span class="text-xs text-muted d-block mb-1">💡 Clique para adicionar colega com inscrição confirmada:</span>
                      <div class="coauthor-chips-row">
                        @for (co of eligibleCoauthorsList; track co.id) {
                          <button
                            type="button"
                            class="coauthor-chip"
                            (click)="addCoauthor(co.name)"
                          >
                            + {{ co.name }}
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>

                <div class="form-group">
                  <label for="art-doc">Arquivo DOC / DOCX (Obrigatório) *</label>
                  <input
                    id="art-doc"
                    type="file"
                    class="form-control"
                    accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    (change)="onDocFileSelected($event)"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="art-pdf">Arquivo PDF (Opcional)</label>
                  <input
                    id="art-pdf"
                    type="file"
                    class="form-control"
                    accept=".pdf,application/pdf"
                    (change)="onPdfFileSelected($event)"
                  />
                </div>
              </div>

              <div class="modal-footer">
                <button class="button button-secondary" type="button" (click)="closeArticleModal()" [disabled]="isSubmittingArticle">
                  Cancelar
                </button>
                <button class="button button-primary" type="submit" [disabled]="isSubmittingArticle || !articleTitle.trim() || !selectedDocFile">
                  {{ isSubmittingArticle ? 'Enviando Trabalho...' : 'Submeter Artigo' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ==========================================
           MODAL MEUS TRABALHOS CIENTÍFICOS
           ========================================== -->
      @if (isMyArticlesModalOpen) {
        <div class="modal-backdrop" (click)="closeMyArticlesModal()">
          <div class="modal-dialog modal-lg card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>Meus Trabalhos Científicos</h2>
                <span class="modal-subtitle">Acompanhamento e parecer da comissão avaliadora</span>
              </div>
              <button class="btn-close" type="button" (click)="closeMyArticlesModal()" aria-label="Fechar">✕</button>
            </div>

            <div class="modal-body">
              @if (isLoadingMyArticles) {
                <div class="loading-state">
                  <div class="spinner"></div>
                  <p>Carregando seus artigos submetidos...</p>
                </div>
              } @else if (myArticles.length === 0) {
                <div class="empty-state">
                  <p>Você ainda não submeteu nenhum artigo científico.</p>
                </div>
              } @else {
                <div class="articles-list">
                  @for (a of myArticles; track a.id) {
                    <div class="article-item-card">
                      <div class="article-item-header">
                        <h4>{{ a.title }}</h4>
                        <span
                          class="status-pill"
                          [class.pill-paid]="a.status === 'aprovado'"
                          [class.pill-pending]="a.status === 'pendente'"
                          [class.pill-rejected]="a.status === 'reprovado'"
                        >
                          {{ a.status | uppercase }}
                        </span>
                      </div>
                      <p class="article-meta-txt">
                        Submetido em {{ a.createdAt | date: 'dd/MM/yyyy HH:mm' }} • Orientador: {{ a.advisorName || 'N/A' }}
                      </p>
                      @if (a.evaluatorName) {
                        <p class="article-evaluator-txt">Avaliador: {{ a.evaluatorName }}</p>
                      }
                      <div class="article-downloads-row">
                        <a [href]="a.docFileUrl" class="button button-outline button-sm" target="_blank" download>
                          📥 Baixar DOC
                        </a>
                        @if (a.pdfFileUrl) {
                          <a [href]="a.pdfFileUrl" class="button button-outline button-sm" target="_blank" download>
                            📥 Baixar PDF
                          </a>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="button button-secondary" type="button" (click)="closeMyArticlesModal()">
                Fechar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ==========================================
           MODAL DE AVALIAÇÃO / FEEDBACK DO EVENTO
           ========================================== -->
      @if (isFeedbackModalOpen && eventForFeedback) {
        <div class="modal-backdrop" (click)="closeFeedbackModal()">
          <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>Avaliar Evento</h2>
                <span class="modal-subtitle">{{ eventForFeedback.title }}</span>
              </div>
              <button class="btn-close" type="button" (click)="closeFeedbackModal()" aria-label="Fechar">✕</button>
            </div>

            <div class="modal-body">
              <div class="form-group text-center">
                <label>Sua Nota de Satisfação (1 a 5 estrelas):</label>
                <div class="star-rating-row">
                  @for (s of [1, 2, 3, 4, 5]; track s) {
                    <button
                      type="button"
                      class="star-btn"
                      [class.star-active]="feedbackRating >= s"
                      (click)="feedbackRating = s"
                    >
                      ★
                    </button>
                  }
                </div>
              </div>

              <div class="form-group">
                <label for="fb-comment">Seu Comentário / Sugestão:</label>
                <textarea
                  id="fb-comment"
                  class="form-control"
                  rows="4"
                  placeholder="Conte o que achou da organização, conteúdo e infraestrutura..."
                  [(ngModel)]="feedbackComment"
                ></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button class="button button-secondary" type="button" (click)="closeFeedbackModal()" [disabled]="isSubmittingFeedback">
                Cancelar
              </button>
              <button class="button button-primary" type="button" (click)="submitFeedbackForm()" [disabled]="isSubmittingFeedback">
                {{ isSubmittingFeedback ? 'Enviando...' : 'Enviar Avaliação' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ==========================================
           MODAL DO CERTIFICADO
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
                  🖨️ Imprimir / Salvar PDF
                </button>
                <button class="btn-close" type="button" (click)="closeCertModal()" aria-label="Fechar modal">✕</button>
              </div>
            </div>

            <div class="modal-body cert-modal-body">
              <div class="certificate-sheet-container" id="printable-certificate">
                <!-- PÁGINA 1: FRENTE -->
                <div
                  class="certificate-sheet cert-page cert-page-front"
                  [class.screen-hidden]="certPageView === 'back'"
                >
                  <div class="cert-outer-border">
                    <div class="cert-inner-border">
                      <div class="cert-header">
                        <div class="cert-emblem">🎓</div>
                        <h1 class="cert-institution-name">{{ currentDoc.institutionName }}</h1>
                        <p class="cert-subheading">Secretaria Geral de Cursos de Extensão e Capacitação</p>
                      </div>

                      <div class="cert-body-text">
                        Certificamos que <strong class="highlight-name">{{ currentDoc.studentName }}</strong> participou do evento acadêmico <strong class="highlight-event">{{ currentDoc.eventTitle }}</strong>, perfazendo carga horária de <strong>{{ currentDoc.workloadHours }} horas</strong>.
                        @if (currentDoc.issnCode) {
                          <p class="cert-issn-mention">
                            Trabalhos apresentados e catalogados sob o código oficial <strong>ISSN {{ currentDoc.issnCode }}</strong>.
                          </p>
                        }
                      </div>

                      <div class="cert-footer">
                        <div class="cert-verification-bar">
                          <span>Autenticidade: <strong>{{ currentDoc.verificationCode }}</strong></span>
                          <span>Emitido em {{ formatCurrentDate(currentDoc.issuedAt) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- PÁGINA 2: VERSO COM QR CODE E VALIDAÇÃO -->
                <div
                  class="certificate-sheet cert-page cert-page-back"
                  [class.screen-hidden]="certPageView === 'front'"
                >
                  <div class="cert-outer-border">
                    <div class="cert-inner-border verso-inner">
                      <div class="verso-header">
                        <div class="cert-emblem">🛡️</div>
                        <h2 class="verso-title">VERIFICAÇÃO DE AUTENTICIDADE</h2>
                        <p class="cert-subheading">{{ currentDoc.institutionName }} &bull; Validação Digital</p>
                      </div>

                      <div class="verso-content">
                        <p class="verso-explanation">
                          Este documento é dotado de fé pública institucional e possui validade nacional (Lei Federal nº 9.394/1996 - LDB). A validação pode ser realizada através da leitura ótica do QR Code abaixo ou via link oficial.
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
                        <span>UniCore Certifications &bull; Registro e auditoria digital de extensão acadêmica</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer no-print">
              <button class="button button-secondary" type="button" (click)="closeCertModal()">
                Fechar
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .catalog-page {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem;
        max-width: 1200px;
        margin: 0 auto;
      }

      .catalog-heading {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .hero-eyebrow {
        font-size: 0.85rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #3b82f6;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
      }

      .catalog-heading h1 {
        font-size: 1.875rem;
        font-weight: 800;
        margin: 0;
        color: var(--text-color, #0f172a);
      }

      .catalog-heading p {
        margin: 0.25rem 0 0;
        color: var(--text-secondary, #64748b);
        font-size: 0.95rem;
      }

      .catalog-actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .filters-panel {
        padding: 1rem;
      }

      .filters-row {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .search-box {
        display: flex;
        align-items: center;
        background: var(--surface-variant, #f1f5f9);
        border-radius: 0.5rem;
        padding: 0 0.75rem;
      }

      .search-icon {
        margin-right: 0.5rem;
      }

      .filter-pills {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .filter-pill {
        padding: 0.4rem 0.85rem;
        border-radius: 9999px;
        border: 1px solid #cbd5e1;
        background: transparent;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .filter-pill.active {
        background: #0f172a;
        color: #ffffff;
        border-color: #0f172a;
      }

      .events-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.5rem;
      }

      .event-card {
        display: flex;
        flex-direction: column;
        border-radius: 1rem;
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .event-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
      }

      .event-card-banner {
        height: 140px;
        position: relative;
        background: #1e293b;
        overflow: hidden;
      }

      .event-banner-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .event-default-banner {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 3rem;
      }

      .event-workload-badge {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        background: rgba(15, 23, 42, 0.8);
        backdrop-filter: blur(4px);
        color: #ffffff;
        padding: 0.25rem 0.6rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .event-card-body {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        flex: 1;
      }

      .tags-row {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        margin-bottom: 0.4rem;
      }

      .event-course-tag {
        font-size: 0.75rem;
        background: #e0f2fe;
        color: #0369a1;
        padding: 0.15rem 0.5rem;
        border-radius: 0.375rem;
        font-weight: 600;
      }

      .badge-price-free {
        font-size: 0.75rem;
        background: #dcfce7;
        color: #15803d;
        padding: 0.15rem 0.5rem;
        border-radius: 0.375rem;
        font-weight: 700;
      }

      .badge-price-paid {
        font-size: 0.75rem;
        background: #f1f5f9;
        color: #0f172a;
        padding: 0.15rem 0.5rem;
        border-radius: 0.375rem;
        font-weight: 700;
      }

      .badge-price-promo {
        font-size: 0.75rem;
        background: #fee2e2;
        color: #b91c1c;
        padding: 0.15rem 0.5rem;
        border-radius: 0.375rem;
        font-weight: 700;
      }

      .event-card-title {
        font-size: 1.15rem;
        font-weight: 800;
        margin: 0;
        line-height: 1.3;
      }

      .event-card-desc {
        font-size: 0.875rem;
        color: #64748b;
        margin: 0;
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
        color: #475569;
      }

      .student-status-box {
        background: #f8fafc;
        border-radius: 0.5rem;
        padding: 0.75rem;
        border: 1px solid #e2e8f0;
      }

      .status-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }

      .status-badge-enrolled {
        font-weight: 700;
        color: #10b981;
        font-size: 0.8rem;
      }

      .event-card-footer {
        padding: 1rem 1.25rem;
        border-top: 1px solid #e2e8f0;
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        background: #f8fafc;
      }

      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
      }

      .modal-dialog {
        background: #ffffff;
        border-radius: 1rem;
        max-width: 580px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
      }

      .modal-lg {
        max-width: 800px;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid #e2e8f0;
      }

      .modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
      }

      .modal-subtitle {
        font-size: 0.85rem;
        color: #64748b;
      }

      .modal-body {
        padding: 1.5rem;
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        padding: 1rem 1.5rem;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
      }

      .pricing-summary-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: #f1f5f9;
        border-radius: 0.75rem;
        margin-bottom: 1rem;
      }

      .pricing-amount {
        font-size: 1.5rem;
        font-weight: 900;
      }

      .workshop-options-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }

      .workshop-option-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.5rem;
        cursor: pointer;
      }

      .payment-pix-box {
        margin-top: 1rem;
        padding: 1rem;
        background: #eff6ff;
        border: 1px dashed #3b82f6;
        border-radius: 0.75rem;
      }

      .star-rating-row {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        margin: 0.5rem 0;
      }

      .star-btn {
        background: none;
        border: none;
        font-size: 2.25rem;
        color: #cbd5e1;
        cursor: pointer;
      }

      .star-btn.star-active {
        color: #eab308;
      }

      .status-pill {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .pill-paid {
        background: #d1fae5;
        color: #065f46;
      }

      .pill-pending {
        background: #fef3c7;
        color: #92400e;
      }

      .pill-rejected {
        background: #fee2e2;
        color: #991b1b;
      }

      .ticket-digital-card {
        padding: 1.25rem;
        background: #ffffff;
        border: 2px solid #e2e8f0;
        border-radius: 1rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .ticket-credential-box {
        background: #0f172a;
        color: #38bdf8;
        padding: 0.75rem;
        border-radius: 0.5rem;
        text-align: center;
        font-family: monospace;
      }

      .credential-code {
        display: block;
        font-size: 1.5rem;
        font-weight: 900;
        letter-spacing: 0.1em;
      }

      .modal-cert-dialog {
        max-width: 900px;
        background: #0f172a;
      }

      .cert-modal-body {
        background: #334155;
        display: flex;
        justify-content: center;
        padding: 1.5rem;
      }

      .certificate-sheet-container {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        width: 100%;
        max-width: 900px;
      }

      .page-view-selector {
        display: flex;
        gap: 0.35rem;
        background: #1e293b;
        padding: 0.25rem;
        border-radius: 0.5rem;
      }

      .view-pill {
        background: transparent;
        border: none;
        color: #94a3b8;
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

      .release-locked-hint {
        color: #f59e0b !important;
        font-weight: 600 !important;
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
        background: #ffffff;
        color: #0f172a;
        padding: 2rem;
        width: 800px;
        border: 8px solid #1e3a8a;
      }

      /* ==========================================
         NOVA IDENTIFICAÇÃO DE CPF & LOTES DINÂMICOS
         ========================================== */
      .cpf-lookup-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem;
        margin-bottom: 1rem;
      }

      .cpf-lookup-box label {
        display: block;
        font-size: 0.85rem;
        font-weight: 600;
        color: #475569;
        margin-bottom: 0.4rem;
      }

      .cpf-input-group {
        display: flex;
        gap: 0.5rem;
      }

      .profile-detected-banner {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-top: 0.75rem;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        color: #1e3a8a;
        font-size: 0.9rem;
      }

      .profile-detected-banner.is-prof {
        background: #f5f3ff;
        border-color: #ddd6fe;
        color: #5b21b6;
      }

      .profile-detected-banner.is-aluno {
        background: #ecfdf5;
        border-color: #a7f3d0;
        color: #065f46;
      }

      .badge-icon {
        font-size: 1.5rem;
      }

      /* ==========================================
         MODAL QR CODE & CREDENCIAL
         ========================================== */
      .qr-modal-dialog {
        max-width: 440px;
      }

      .qr-modal-body {
        padding: 2rem 1.5rem;
      }

      .qr-code-wrapper {
        display: inline-block;
        padding: 1rem;
        background: #ffffff;
        border: 4px solid #0f172a;
        border-radius: 1rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      }

      .qr-code-image {
        width: 220px;
        height: 220px;
        display: block;
      }

      .qr-unique-code {
        display: block;
        font-family: monospace;
        font-size: 1.75rem;
        font-weight: 900;
        letter-spacing: 0.15em;
        color: #0f172a;
      }

      /* ==========================================
         REQUERIMENTO OFICIAL FAIP (FOLHA IMPRESSA)
         ========================================== */
      .requirement-modal-dialog {
        max-width: 820px;
      }

      .requirement-modal-body {
        background: #475569;
        padding: 2rem 1rem;
        display: flex;
        justify-content: center;
        overflow-x: auto;
      }

      .requirement-sheet {
        background: #ffffff;
        color: #0f172a;
        width: 720px;
        padding: 2.5rem;
        border: 2px solid #cbd5e1;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
        font-family: 'Inter', system-ui, sans-serif;
      }

      .req-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .req-institution h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 900;
        color: #1e3a8a;
      }

      .req-institution p {
        margin: 0.25rem 0 0;
        font-size: 0.85rem;
        color: #64748b;
      }

      .req-protocol-badge {
        text-align: right;
        background: #f1f5f9;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid #cbd5e1;
      }

      .req-proto-label {
        display: block;
        font-size: 0.7rem;
        font-weight: 700;
        color: #64748b;
        letter-spacing: 0.1em;
      }

      .req-proto-number {
        font-family: monospace;
        font-size: 1.25rem;
        font-weight: 900;
        color: #0f172a;
      }

      .req-divider {
        height: 2px;
        background: #e2e8f0;
        margin: 1.25rem 0;
      }

      .req-section-title {
        font-size: 0.8rem;
        font-weight: 800;
        color: #1e3a8a;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-bottom: 0.5rem;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 0.25rem;
      }

      .req-grid-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        font-size: 0.9rem;
      }

      .req-workshop-box {
        background: #f8fafc;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid #e2e8f0;
        font-size: 0.95rem;
        color: #334155;
      }

      .req-payment-info {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .req-amount-box {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        padding: 0.75rem 1.25rem;
        border-radius: 0.5rem;
      }

      .req-amount-box span {
        font-size: 0.95rem;
        font-weight: 600;
        color: #1e3a8a;
      }

      .req-amount-box strong {
        font-size: 1.35rem;
        font-weight: 900;
        color: #1e3a8a;
      }

      .req-instructions {
        font-size: 0.85rem;
        color: #475569;
        line-height: 1.5;
        margin: 0;
      }

      .req-perforated-line {
        margin: 2rem 0 1.5rem;
        text-align: center;
        font-size: 0.75rem;
        color: #94a3b8;
        letter-spacing: 0.1em;
      }

      .req-stub-box {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border: 1px solid #cbd5e1;
        padding: 1rem 1.5rem;
        background: #fafafa;
        border-radius: 0.5rem;
      }

      .req-stub-data {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.85rem;
      }

      .req-stub-signature {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 250px;
      }

      .signature-line {
        width: 100%;
        border-bottom: 1px solid #475569;
        margin-bottom: 0.25rem;
      }

      /* Coautores elegíveis chips */
      .eligible-coauthors-box {
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        border-radius: 0.5rem;
        padding: 0.75rem;
      }

      .coauthor-chips-row {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
      }

      .coauthor-chip {
        background: #eff6ff;
        color: #2563eb;
        border: 1px solid #bfdbfe;
        border-radius: 9999px;
        padding: 0.25rem 0.65rem;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .coauthor-chip:hover {
        background: #dbeafe;
        border-color: #93c5fd;
      }

      .current-workshop-info {
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        padding: 0.75rem;
        border-radius: 0.5rem;
        display: flex;
        flex-direction: column;
      }

      @media print {
        .catalog-page,
        .modal-backdrop,
        .modal-dialog {
          padding: 0 !important;
          margin: 0 !important;
          background: transparent !important;
        }

        .no-print {
          display: none !important;
        }

        .requirement-modal-body {
          background: transparent !important;
          padding: 0 !important;
        }

        .requirement-sheet {
          box-shadow: none !important;
          border: none !important;
          width: 100% !important;
          padding: 0 !important;
        }
      }
    `,
  ],
})
export class EventCatalogPageComponent implements OnInit {
  events: EventCatalogItem[] = []
  isLoading = false
  errorMessage = ''
  successMessage = ''
  searchQuery = ''
  activeFilter: 'all' | 'upcoming' | 'past' | 'mine' = 'all'

  // Detalhes do Evento
  selectedEventForDetails: EventCatalogItem | null = null

  // Inscrição / Compra de Ingresso
  isEnrollModalOpen = false
  eventToEnroll: EventCatalogItem | null = null
  enrollCpf = ''
  isCheckingCpf = false
  cpfLookupResult: LookupCpfResult | null = null
  availableWorkshops: EventWorkshop[] = []
  selectedWorkshopIds: string[] = []
  isLoadingWorkshops = false
  isSubmittingEnroll = false
  selectedReceiptFile: File | null = null

  // Meus Ingressos Digitais
  isMyTicketsModalOpen = false
  isLoadingTickets = false
  myTickets: EventTicket[] = []

  // Visual QR Code Modal
  isQrCodeModalOpen = false
  ticketForQrCode: EventTicket | null = null

  // Requerimento Oficial FAIP (2ª via)
  isRequirementModalOpen = false
  ticketForRequirement: EventTicket | null = null

  // Troca de Oficina / Workshop
  isSwitchWorkshopModalOpen = false
  ticketToSwitchWorkshop: EventTicket | null = null
  switchWorkshopsList: EventWorkshop[] = []
  selectedNewWorkshopId = ''
  isSwitchingWorkshop = false
  isLoadingSwitchWorkshops = false

  // Submissão de Artigo Científico
  isArticleModalOpen = false
  eventForArticle: EventCatalogItem | null = null
  eligibleCoauthorsList: { id: string; name: string; email: string }[] = []
  isLoadingCoauthors = false
  articleTitle = ''
  articleAdvisor = ''
  articleCoAdvisor = ''
  articleCoauthors = ''
  selectedDocFile: File | null = null
  selectedPdfFile: File | null = null
  isSubmittingArticle = false

  // Meus Artigos
  isMyArticlesModalOpen = false
  isLoadingMyArticles = false
  myArticles: EventArticle[] = []

  // Avaliação / Feedback
  isFeedbackModalOpen = false
  eventForFeedback: EventCatalogItem | null = null
  feedbackRating = 5
  feedbackComment = ''
  isSubmittingFeedback = false

  // Certificado
  isCertModalOpen = false
  currentDoc: CertificateDocument | null = null
  certPageView: 'front' | 'back' | 'both' = 'front'

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
    return role === 'admin' || role === 'master' || role === 'coordenacao'
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
      if (query) {
        const matchTitle = ev.title?.toLowerCase().includes(query)
        const matchSpeaker = ev.speaker?.toLowerCase().includes(query)
        const matchCourse = ev.courseName?.toLowerCase().includes(query)
        const matchLocation = ev.location?.toLowerCase().includes(query)
        if (!matchTitle && !matchSpeaker && !matchCourse && !matchLocation) return false
      }

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

  isPromoActive(ev: EventCatalogItem): boolean {
    if (!ev.promoPrice || !ev.promoDeadline) return false
    return new Date() <= new Date(ev.promoDeadline)
  }

  isTeacherPromoActive(ev: EventCatalogItem): boolean {
    if (!ev.teacherPromoPrice || !ev.teacherPromoDeadline) return false
    return new Date() <= new Date(ev.teacherPromoDeadline)
  }

  calculateTicketPrice(ev: EventCatalogItem): number {
    if (ev.ticketType === 'gratuito') return 0
    const isDocente = this.cpfLookupResult?.perfil === 'professor'
    if (isDocente) {
      if (this.isTeacherPromoActive(ev) && ev.teacherPromoPrice) {
        return Number(ev.teacherPromoPrice)
      }
      if (ev.teacherPrice) {
        return Number(ev.teacherPrice)
      }
    }
    if (this.isPromoActive(ev) && ev.promoPrice) {
      return Number(ev.promoPrice)
    }
    return Number(ev.standardPrice || 0)
  }

  searchCpfProfile(): void {
    const cleanCpf = this.enrollCpf.replace(/\D/g, '')
    if (cleanCpf.length !== 11) {
      this.errorMessage = 'Informe um CPF válido com 11 dígitos para validação.'
      return
    }
    this.isCheckingCpf = true
    this.errorMessage = ''
    this.certificatesService
      .lookupCpf(cleanCpf)
      .pipe(finalize(() => (this.isCheckingCpf = false)))
      .subscribe({
        next: (res) => {
          this.cpfLookupResult = res
        },
        error: () => {
          this.cpfLookupResult = { cpf: cleanCpf, encontrado: false, perfil: 'visitante' }
        },
      })
  }

  onCpfInputChanged(): void {
    const numbers = this.enrollCpf.replace(/\D/g, '').slice(0, 11)
    if (numbers.length > 9) {
      this.enrollCpf = `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
    } else if (numbers.length > 6) {
      this.enrollCpf = `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    } else if (numbers.length > 3) {
      this.enrollCpf = `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    } else {
      this.enrollCpf = numbers
    }

    if (numbers.length === 11) {
      this.searchCpfProfile()
    }
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

  // ==========================================
  // INSCRIÇÃO & BILHETERIA
  // ==========================================

  openEnrollModal(event: EventCatalogItem): void {
    this.eventToEnroll = event
    this.selectedWorkshopIds = []
    this.selectedReceiptFile = null
    this.enrollCpf = ''
    this.cpfLookupResult = null
    this.isEnrollModalOpen = true
    this.loadWorkshopsForEnroll(event.id)
  }

  closeEnrollModal(): void {
    this.isEnrollModalOpen = false
    this.eventToEnroll = null
    this.selectedWorkshopIds = []
    this.selectedReceiptFile = null
    this.enrollCpf = ''
    this.cpfLookupResult = null
  }

  loadWorkshopsForEnroll(eventId: string): void {
    this.isLoadingWorkshops = true
    this.certificatesService
      .getEventWorkshops(eventId)
      .pipe(finalize(() => (this.isLoadingWorkshops = false)))
      .subscribe({
        next: (wks) => {
          this.availableWorkshops = wks
        },
      })
  }

  toggleWorkshopSelection(workshopId: string): void {
    const idx = this.selectedWorkshopIds.indexOf(workshopId)
    if (idx >= 0) {
      this.selectedWorkshopIds.splice(idx, 1)
    } else {
      this.selectedWorkshopIds = [workshopId]
    }
  }

  onReceiptFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.selectedReceiptFile = input.files[0]
    }
  }

  confirmEnrollment(): void {
    if (!this.eventToEnroll) return
    this.isSubmittingEnroll = true
    this.errorMessage = ''

    this.certificatesService
      .createTicket(this.eventToEnroll.id, {
        workshopIds: this.selectedWorkshopIds,
      })
      .subscribe({
        next: (ticket) => {
          if (this.selectedReceiptFile) {
            this.certificatesService
              .uploadTicketReceipt(ticket.id, this.selectedReceiptFile)
              .subscribe({
                next: () => {
                  this.successMessage = 'Inscrição realizada e comprovante enviado para análise!'
                  this.finishEnrollment()
                },
                error: () => {
                  this.successMessage = 'Ingresso gerado! Envie o comprovante em "Meus Ingressos".'
                  this.finishEnrollment()
                },
              })
          } else {
            this.successMessage = 'Inscrição confirmada com sucesso!'
            this.finishEnrollment()
          }
        },
        error: (err) => {
          this.isSubmittingEnroll = false
          this.errorMessage = err.error?.message || 'Falha ao processar inscrição no evento.'
        },
      })
  }

  private finishEnrollment(): void {
    this.isSubmittingEnroll = false
    this.closeEnrollModal()
    this.loadCatalog()
    setTimeout(() => (this.successMessage = ''), 4000)
  }

  // ==========================================
  // MEUS INGRESSOS
  // ==========================================

  openMyTicketsModal(): void {
    this.isMyTicketsModalOpen = true
    this.isLoadingTickets = true
    this.certificatesService
      .getMyTickets()
      .pipe(finalize(() => (this.isLoadingTickets = false)))
      .subscribe({
        next: (tickets) => {
          this.myTickets = tickets
        },
      })
  }

  closeMyTicketsModal(): void {
    this.isMyTicketsModalOpen = false
  }

  formatTicketStatus(status: string): string {
    switch (status) {
      case 'pago':
        return '✓ Pago / Liberado'
      case 'em_analise':
        return '⏳ Em Análise'
      case 'rejeitado':
        return '✕ Rejeitado'
      default:
        return '⏳ Pagamento Pendente'
    }
  }

  uploadReceiptForTicket(ticketId: string, event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.certificatesService.uploadTicketReceipt(ticketId, input.files[0]).subscribe({
        next: () => {
          this.successMessage = 'Comprovante anexado com sucesso!'
          this.openMyTicketsModal()
          setTimeout(() => (this.successMessage = ''), 3000)
        },
      })
    }
  }

  // ==========================================
  // QR CODE & CREDENCIAL MODAL
  // ==========================================

  openQrCodeModal(ticket: EventTicket): void {
    this.ticketForQrCode = ticket
    this.isQrCodeModalOpen = true
  }

  closeQrCodeModal(): void {
    this.isQrCodeModalOpen = false
    this.ticketForQrCode = null
  }

  // ==========================================
  // REQUERIMENTO OFICIAL FAIP (2ª VIA)
  // ==========================================

  openRequirementModal(ticket: EventTicket): void {
    this.ticketForRequirement = ticket
    this.isRequirementModalOpen = true
  }

  closeRequirementModal(): void {
    this.isRequirementModalOpen = false
    this.ticketForRequirement = null
  }

  printRequirement(): void {
    window.print()
  }

  formatProtocol(id: string): string {
    if (!id) return '000001'
    const hex = id.replace(/[^0-9]/g, '')
    if (hex.length >= 6) return hex.slice(0, 6)
    return id.slice(0, 6).toUpperCase()
  }

  // ==========================================
  // TROCAR OFICINA / WORKSHOP
  // ==========================================

  openSwitchWorkshopModal(ticket: EventTicket): void {
    this.ticketToSwitchWorkshop = ticket
    this.selectedNewWorkshopId = ''
    this.isSwitchWorkshopModalOpen = true
    this.isLoadingSwitchWorkshops = true
    this.certificatesService
      .getEventWorkshops(ticket.eventId)
      .pipe(finalize(() => (this.isLoadingSwitchWorkshops = false)))
      .subscribe({
        next: (wks) => {
          const currentWkId = ticket.workshops?.[0]?.id
          this.switchWorkshopsList = wks.filter((w) => w.id !== currentWkId)
        },
        error: () => {
          this.switchWorkshopsList = []
        },
      })
  }

  closeSwitchWorkshopModal(): void {
    this.isSwitchWorkshopModalOpen = false
    this.ticketToSwitchWorkshop = null
    this.switchWorkshopsList = []
    this.selectedNewWorkshopId = ''
  }

  confirmWorkshopSwitch(): void {
    if (!this.ticketToSwitchWorkshop || !this.selectedNewWorkshopId) return
    this.isSwitchingWorkshop = true
    this.certificatesService
      .switchWorkshop(this.ticketToSwitchWorkshop.id, this.selectedNewWorkshopId)
      .pipe(finalize(() => (this.isSwitchingWorkshop = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Oficina alterada com sucesso! Vaga remanejada.'
          this.closeSwitchWorkshopModal()
          this.openMyTicketsModal()
          setTimeout(() => (this.successMessage = ''), 4000)
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Falha ao trocar de oficina.'
        },
      })
  }

  // ==========================================
  // ARTIGOS CIENTÍFICOS
  // ==========================================

  openArticleModal(event: EventCatalogItem): void {
    this.eventForArticle = event
    this.articleTitle = ''
    this.articleAdvisor = ''
    this.articleCoAdvisor = ''
    this.articleCoauthors = ''
    this.selectedDocFile = null
    this.selectedPdfFile = null
    this.isArticleModalOpen = true
    this.eligibleCoauthorsList = []
    this.isLoadingCoauthors = true

    this.certificatesService
      .getEligibleCoauthors(event.id)
      .pipe(finalize(() => (this.isLoadingCoauthors = false)))
      .subscribe({
        next: (coauthors) => {
          this.eligibleCoauthorsList = coauthors
        },
        error: () => {
          this.eligibleCoauthorsList = []
        },
      })
  }

  addCoauthor(name: string): void {
    if (!this.articleCoauthors) {
      this.articleCoauthors = name
    } else if (!this.articleCoauthors.includes(name)) {
      this.articleCoauthors = `${this.articleCoauthors}, ${name}`
    }
  }

  closeArticleModal(): void {
    this.isArticleModalOpen = false
    this.eventForArticle = null
  }

  onDocFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.selectedDocFile = input.files[0]
    }
  }

  onPdfFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.selectedPdfFile = input.files[0]
    }
  }

  submitArticleForm(): void {
    if (!this.eventForArticle || !this.selectedDocFile || !this.articleTitle.trim()) {
      return
    }

    this.isSubmittingArticle = true
    this.errorMessage = ''

    this.certificatesService
      .submitArticle(
        this.eventForArticle.id,
        {
          title: this.articleTitle.trim(),
          advisorName: this.articleAdvisor.trim() || undefined,
          coAdvisorName: this.articleCoAdvisor.trim() || undefined,
          coauthors: this.articleCoauthors.trim() || undefined,
        },
        this.selectedDocFile,
        this.selectedPdfFile || undefined,
      )
      .pipe(finalize(() => (this.isSubmittingArticle = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Trabalho científico submetido com sucesso para a comissão!'
          this.closeArticleModal()
          setTimeout(() => (this.successMessage = ''), 4000)
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erro ao submeter artigo científico.'
        },
      })
  }

  openMyArticlesModal(): void {
    this.isMyArticlesModalOpen = true
    this.isLoadingMyArticles = true
    this.certificatesService
      .getMyArticles()
      .pipe(finalize(() => (this.isLoadingMyArticles = false)))
      .subscribe({
        next: (arts) => {
          this.myArticles = arts
        },
      })
  }

  closeMyArticlesModal(): void {
    this.isMyArticlesModalOpen = false
  }

  // ==========================================
  // FEEDBACK / AVALIAÇÃO
  // ==========================================

  openFeedbackModal(event: EventCatalogItem): void {
    this.eventForFeedback = event
    this.feedbackRating = 5
    this.feedbackComment = ''
    this.isFeedbackModalOpen = true
  }

  closeFeedbackModal(): void {
    this.isFeedbackModalOpen = false
    this.eventForFeedback = null
  }

  submitFeedbackForm(): void {
    if (!this.eventForFeedback) return
    this.isSubmittingFeedback = true

    this.certificatesService
      .submitFeedback(this.eventForFeedback.id, {
        rating: this.feedbackRating,
        comment: this.feedbackComment.trim() || undefined,
      })
      .pipe(finalize(() => (this.isSubmittingFeedback = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Obrigado pelo seu feedback sobre o evento!'
          this.closeFeedbackModal()
          setTimeout(() => (this.successMessage = ''), 3000)
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Falha ao enviar avaliação.'
        },
      })
  }

  // ==========================================
  // CERTIFICADOS
  // ==========================================

  viewMyCertificate(participantId: string): void {
    this.errorMessage = ''
    this.certificatesService.getMyCertificate(participantId).subscribe({
      next: (doc) => {
        this.currentDoc = doc
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
    executeCertificatePrint('printable-certificate')
  }

  formatDate(dateStr: string | null | undefined): string {
    return formatDisplayDate(dateStr || null)
  }

  formatCurrentDate(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  }
}
