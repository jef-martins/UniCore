import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, RouterModule } from '@angular/router'
import { AuthService } from '../services/auth.service'

export type ItemOperationalStatus =
  | 'FUNCIONANDO_PERFEITAMENTE'
  | 'FUNCIONANDO_COM_DEFEITOS'
  | 'COM_AVARIAS_FUNCIONANDO'
  | 'NAO_FUNCIONANDO'

export interface ItemEvaluation {
  id: string
  itemId: string
  studentName: string
  rating: number
  operationalStatus: ItemOperationalStatus
  description?: string | null
  createdAt: string
  user?: {
    id: string
    username: string
    role?: string
  } | null
}

export interface RoomItem {
  id: string
  name: string
  code: string
  category: string
  location: string
  description?: string | null
  status: 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE'
  condition: string
  consolidatedStatus: ItemOperationalStatus
  statusCounts: Record<ItemOperationalStatus, number>
  averageRating: number | null
  totalEvaluations: number
  evaluations?: ItemEvaluation[]
  latestMaintenance?: {
    id: string
    type: 'PREVENTIVA' | 'CORRETIVA'
    status: string
    title: string
  } | null
}

export interface RoomSummary {
  location: string
  itemCount: number
  totalEvaluations: number
  averageRating: number | null
  underMaintenanceCount: number
  categories: string[]
  items: RoomItem[]
}

@Component({
  selector: 'app-student-rooms-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="rooms-page" aria-labelledby="page-title">
      <!-- Cabeçalho Principal -->
      <header class="page-header">
        <div class="header-info">
          <p class="hero-eyebrow">{{ contextEyebrow }}</p>
          <h1 id="page-title" class="page-title">
            {{ selectedRoom ? selectedRoom.location : 'Salas e Laboratórios' }}
          </h1>
          <p class="page-subtitle">
            @if (selectedRoom) {
              Consulte os equipamentos e recursos disponíveis nesta sala, verifique o status de funcionamento apurado pelos alunos e registre sua avaliação.
            } @else {
              Consulte as salas e laboratórios da instituição, veja as condições dos equipamentos em tempo real e colabore avaliando os recursos.
            }
          </p>
        </div>

        <div class="header-actions">
          @if (selectedRoom) {
            <button class="button button-secondary" type="button" (click)="clearSelectedRoom()">
              <span aria-hidden="true">←</span> Todas as Salas
            </button>
          }
          <button class="button button-secondary" type="button" (click)="loadRooms()">
            <span aria-hidden="true">↻</span> Atualizar
          </button>
        </div>
      </header>

      <!-- Feedback Alerts -->
      @if (globalSuccess) {
        <div class="feedback-alert feedback-success" role="status">
          <span>✓ {{ globalSuccess }}</span>
          <button class="btn-close" (click)="globalSuccess = ''" aria-label="Fechar">✕</button>
        </div>
      }
      @if (globalError) {
        <div class="feedback-alert feedback-error" role="alert">
          <span>⚠ {{ globalError }}</span>
          <button class="btn-close" (click)="globalError = ''" aria-label="Fechar">✕</button>
        </div>
      }

      <!-- VISTA 1: LISTAGEM DE SALAS E LABORATÓRIOS -->
      @if (!selectedRoom) {
        <!-- Painel de Busca e Filtro de Salas -->
        <div class="filter-panel card card-outlined">
          <div class="search-box">
            <span class="search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              class="field-control search-input"
              placeholder="Buscar sala, laboratório ou bloco..."
              [(ngModel)]="searchRoomQuery"
              (ngModelChange)="filterRooms()"
            />
          </div>
          <div class="filter-stats">
            <span class="text-muted text-sm">{{ filteredRooms.length }} local(is) encontrado(s)</span>
          </div>
        </div>

        @if (isLoading) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Carregando salas e laboratórios...</p>
          </div>
        } @else {
          <div class="rooms-grid">
            @for (room of filteredRooms; track room.location) {
              <div class="room-card card card-elevated" (click)="selectRoom(room)">
                <div class="room-card-header">
                  <div class="room-icon-badge" [class.lab-icon]="isLab(room.location)">
                    {{ isLab(room.location) ? '🔬' : '🏛️' }}
                  </div>
                  <div class="room-title-area">
                    <h2 class="room-title">{{ room.location }}</h2>
                    <span class="room-type-badge">{{ isLab(room.location) ? 'Laboratório' : 'Sala / Espaço' }}</span>
                  </div>
                </div>

                <div class="room-metrics">
                  <div class="metric-pill">
                    <span class="metric-label">Equipamentos</span>
                    <span class="metric-val">{{ room.itemCount }}</span>
                  </div>
                  <div class="metric-pill">
                    <span class="metric-label">Avaliação Geral</span>
                    <span class="metric-val star-val">
                      @if (room.averageRating) {
                        ★ {{ room.averageRating }}
                      } @else {
                        <span class="text-muted">Sem aval.</span>
                      }
                    </span>
                  </div>
                  <div class="metric-pill">
                    <span class="metric-label">Avaliações</span>
                    <span class="metric-val">{{ room.totalEvaluations }}</span>
                  </div>
                </div>

                @if (room.categories.length > 0) {
                  <div class="room-categories">
                    @for (cat of room.categories; track cat) {
                      <span class="category-chip">{{ cat }}</span>
                    }
                  </div>
                }

                <div class="room-card-footer">
                  @if (room.underMaintenanceCount > 0) {
                    <span class="badge-warning-soft">
                      🛠️ {{ room.underMaintenanceCount }} em manutenção
                    </span>
                  } @else {
                    <span class="badge-success-soft">
                      ✓ Equipamentos operacionais
                    </span>
                  }
                  <button class="button button-text btn-sm" type="button" (click)="selectRoom(room); $event.stopPropagation()">
                    Ver itens →
                  </button>
                </div>
              </div>
            } @empty {
              <div class="empty-state card card-outlined">
                <p>Nenhuma sala ou laboratório encontrado com o termo "{{ searchRoomQuery }}".</p>
                <button class="button button-secondary btn-sm" (click)="searchRoomQuery = ''; filterRooms()">
                  Limpar busca
                </button>
              </div>
            }
          </div>
        }
      }

      <!-- VISTA 2: EQUIPAMENTOS DA SALA SELECIONADA -->
      @if (selectedRoom) {
        <div class="room-detail-container">
          <!-- Barra de Navegação e Resumo da Sala -->
          <div class="room-banner card card-outlined">
            <div class="banner-left">
              <span class="banner-icon">{{ isLab(selectedRoom.location) ? '🔬' : '🏛️' }}</span>
              <div>
                <h2 class="banner-title">{{ selectedRoom.location }}</h2>
                <div class="banner-badges">
                  <span class="badge-info-soft">{{ selectedRoom.itemCount }} equipamentos cadastrados</span>
                  <span class="badge-rating">
                    ★ {{ selectedRoom.averageRating ? selectedRoom.averageRating + ' / 5.0' : 'Ainda não avaliado' }}
                    ({{ selectedRoom.totalEvaluations }} avaliações de alunos)
                  </span>
                </div>
              </div>
            </div>

            <div class="banner-filter">
              <input
                type="text"
                class="field-control search-input"
                placeholder="Filtrar equipamentos desta sala..."
                [(ngModel)]="searchItemQuery"
                (ngModelChange)="filterRoomItems()"
              />
            </div>
          </div>

          <!-- Legenda de Status Operacional por Maior Ocorrência -->
          <div class="status-legend card">
            <span class="legend-title">Regra de Status Operacional:</span>
            <span class="legend-text">
              O status exibido reflete a <strong>maior ocorrência (moda)</strong> das avaliações reportadas pelos alunos.
            </span>
            <div class="legend-badges">
              <span class="status-tag status-green">🟢 Funcionando perfeitamente</span>
              <span class="status-tag status-yellow">🟡 Funcionando com alguns defeitos</span>
              <span class="status-tag status-blue">🔵 Com avarias mas funcionando</span>
              <span class="status-tag status-red">🔴 Não funcionando</span>
            </div>
          </div>

          <!-- Lista / Grade de Itens da Sala -->
          @if (isLoadingRoomItems) {
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Carregando itens da sala...</p>
            </div>
          } @else {
            <div class="items-grid">
              @for (item of filteredRoomItems; track item.id) {
                <div class="item-card card card-elevated" [class.border-alert]="item.consolidatedStatus === 'NAO_FUNCIONANDO'">
                  <div class="item-card-top">
                    <span class="patrimony-tag">{{ item.code }}</span>
                    <span class="category-tag">{{ item.category }}</span>
                  </div>

                  <div class="item-card-title-group">
                    <h3 class="item-name">{{ item.name }}</h3>
                    @if (item.description) {
                      <p class="item-description">{{ item.description }}</p>
                    }
                  </div>

                  <!-- Status Operacional Consolidado (Maior Ocorrência) -->
                  <div class="status-block">
                    <div class="status-label-row">
                      <span class="sub-label">Status Operacional (Maior Ocorrência):</span>
                      <span class="occurrence-count">
                        {{ getOccurrenceText(item) }}
                      </span>
                    </div>

                    <div class="operational-status-badge" [ngClass]="getOperationalStatusClass(item.consolidatedStatus)">
                      <span class="status-icon-dot"></span>
                      <span class="status-text-val">{{ formatOperationalStatus(item.consolidatedStatus) }}</span>
                    </div>

                    <!-- Breakdown de votos (Maior Ocorrência) -->
                    @if (item.totalEvaluations > 0) {
                      <div class="breakdown-bar-container" title="Distribuição de avaliações dos alunos">
                        <div class="breakdown-text">
                          Votos:
                          @if (item.statusCounts['FUNCIONANDO_PERFEITAMENTE'] > 0) {
                            <span class="count-pill green-pill">{{ item.statusCounts['FUNCIONANDO_PERFEITAMENTE'] }} perfeitos</span>
                          }
                          @if (item.statusCounts['FUNCIONANDO_COM_DEFEITOS'] > 0) {
                            <span class="count-pill yellow-pill">{{ item.statusCounts['FUNCIONANDO_COM_DEFEITOS'] }} c/ defeitos</span>
                          }
                          @if (item.statusCounts['COM_AVARIAS_FUNCIONANDO'] > 0) {
                            <span class="count-pill blue-pill">{{ item.statusCounts['COM_AVARIAS_FUNCIONANDO'] }} c/ avarias</span>
                          }
                          @if (item.statusCounts['NAO_FUNCIONANDO'] > 0) {
                            <span class="count-pill red-pill">{{ item.statusCounts['NAO_FUNCIONANDO'] }} não funciona</span>
                          }
                        </div>
                      </div>
                    } @else {
                      <p class="no-eval-hint">Nenhuma avaliação enviada ainda. Seja o primeiro a avaliar!</p>
                    }
                  </div>

                  <!-- Média de Estrelas -->
                  <div class="rating-display-row">
                    <div class="stars-visual">
                      @for (star of [1,2,3,4,5]; track star) {
                        <span class="star-icon" [class.star-filled]="item.averageRating && star <= Math.round(item.averageRating)">
                          ★
                        </span>
                      }
                      <span class="rating-score">
                        {{ item.averageRating ? item.averageRating : '0' }} / 5
                      </span>
                    </div>
                    <span class="eval-count-tag">
                      {{ item.totalEvaluations }} {{ item.totalEvaluations === 1 ? 'avaliação' : 'avaliações' }}
                    </span>
                  </div>

                  <!-- Botões de Ação -->
                  <div class="item-card-actions">
                    <button
                      class="button button-primary btn-sm btn-eval"
                      type="button"
                      (click)="openEvaluationModal(item)"
                    >
                      ⭐ Avaliar / Reportar Problema
                    </button>

                    @if (item.evaluations && item.evaluations.length > 0) {
                      <button
                        class="button button-secondary btn-sm"
                        type="button"
                        (click)="toggleEvaluationsView(item.id)"
                      >
                        {{ isShowingEvaluations(item.id) ? 'Ocultar Avaliações ▲' : 'Ver Avaliações (' + item.evaluations.length + ') ▼' }}
                      </button>
                    }
                  </div>

                  <!-- Histórico de Avaliações / Relatos dos Alunos -->
                  @if (isShowingEvaluations(item.id)) {
                    <div class="evaluations-tray card">
                      <h4 class="tray-title">Relatos e Avaliações de Alunos:</h4>
                      <div class="tray-list">
                        @for (ev of item.evaluations; track ev.id) {
                          <div class="tray-item">
                            <div class="tray-item-top">
                              <span class="student-name">👤 {{ ev.studentName || 'Aluno' }}</span>
                              <span class="ev-stars">
                                @for (s of [1,2,3,4,5]; track s) {
                                  <span [class.text-amber]="s <= ev.rating">★</span>
                                }
                                <strong class="rating-num">({{ ev.rating }}/5 - {{ formatRatingLabel(ev.rating) }})</strong>
                              </span>
                              <span class="ev-date">{{ formatDate(ev.createdAt) }}</span>
                            </div>

                            <div class="tray-status-line">
                              <span class="sub-status-tag" [ngClass]="getOperationalStatusClass(ev.operationalStatus)">
                                {{ formatOperationalStatus(ev.operationalStatus) }}
                              </span>
                            </div>

                            @if (ev.description) {
                              <p class="tray-desc">"{{ ev.description }}"</p>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @empty {
                <div class="empty-state card card-outlined">
                  <p>Nenhum equipamento encontrado nesta sala com o filtro "{{ searchItemQuery }}".</p>
                  <button class="button button-secondary btn-sm" (click)="searchItemQuery = ''; filterRoomItems()">
                    Limpar filtro
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- MODAL DE AVALIAÇÃO DO ALUNO -->
      @if (isEvalModalOpen && evaluatingItem) {
        <div class="modal-backdrop" (click)="closeEvaluationModal()">
          <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2 class="modal-title">Avaliar Equipamento</h2>
                <span class="modal-subtitle">{{ evaluatingItem.name }} ({{ evaluatingItem.code }})</span>
              </div>
              <button class="btn-close" type="button" (click)="closeEvaluationModal()" aria-label="Fechar">✕</button>
            </div>

            @if (modalError) {
              <div class="feedback-alert feedback-error" role="alert">
                <span>⚠ {{ modalError }}</span>
              </div>
            }

            <form (ngSubmit)="submitEvaluation()">
              <div class="modal-body">
                <!-- Seletor de 5 Estrelas -->
                <div class="field">
                  <label class="field-label">Avaliação Geral do Equipamento *</label>
                  <div class="stars-selector-container">
                    <div class="stars-selector" role="radiogroup" aria-label="Classificação por estrelas">
                      @for (star of [1, 2, 3, 4, 5]; track star) {
                        <button
                          type="button"
                          class="star-btn"
                          [class.active]="star <= (hoveredRating || evalRating)"
                          (mouseenter)="hoveredRating = star"
                          (mouseleave)="hoveredRating = 0"
                          (click)="evalRating = star"
                          [title]="formatRatingLabel(star)"
                          [attr.aria-checked]="evalRating === star"
                          role="radio"
                        >
                          ★
                        </button>
                      }
                    </div>
                    <span class="selected-star-label">
                      {{ evalRating }} - {{ formatRatingLabel(evalRating) }}
                    </span>
                  </div>
                  <div class="stars-legend-hints">
                    <span>1 - Péssimo</span>
                    <span>2 - Ruim</span>
                    <span>3 - Regular</span>
                    <span>4 - Bom</span>
                    <span>5 - Ótimo</span>
                  </div>
                </div>

                <!-- Seletor de Status Operacional -->
                <div class="field">
                  <label class="field-label">Como o equipamento está funcionando? *</label>
                  <div class="status-options-grid">
                    <label
                      class="status-option-card"
                      [class.selected]="evalOperationalStatus === 'FUNCIONANDO_PERFEITAMENTE'"
                    >
                      <input
                        type="radio"
                        name="operationalStatus"
                        value="FUNCIONANDO_PERFEITAMENTE"
                        [(ngModel)]="evalOperationalStatus"
                        required
                      />
                      <span class="opt-icon">🟢</span>
                      <div class="opt-content">
                        <strong>Funcionando perfeitamente</strong>
                        <small>Sem nenhum defeito visual ou operacional</small>
                      </div>
                    </label>

                    <label
                      class="status-option-card"
                      [class.selected]="evalOperationalStatus === 'FUNCIONANDO_COM_DEFEITOS'"
                    >
                      <input
                        type="radio"
                        name="operationalStatus"
                        value="FUNCIONANDO_COM_DEFEITOS"
                        [(ngModel)]="evalOperationalStatus"
                        required
                      />
                      <span class="opt-icon">🟡</span>
                      <div class="opt-content">
                        <strong>Funcionando com alguns defeitos</strong>
                        <small>Liga e funciona, mas apresenta falhas ou instabilidade</small>
                      </div>
                    </label>

                    <label
                      class="status-option-card"
                      [class.selected]="evalOperationalStatus === 'COM_AVARIAS_FUNCIONANDO'"
                    >
                      <input
                        type="radio"
                        name="operationalStatus"
                        value="COM_AVARIAS_FUNCIONANDO"
                        [(ngModel)]="evalOperationalStatus"
                        required
                      />
                      <span class="opt-icon">🔵</span>
                      <div class="opt-content">
                        <strong>Com avarias mas funcionando perfeitamente</strong>
                        <small>Possui marcas, trincas ou desgaste físico, mas opera bem</small>
                      </div>
                    </label>

                    <label
                      class="status-option-card"
                      [class.selected]="evalOperationalStatus === 'NAO_FUNCIONANDO'"
                    >
                      <input
                        type="radio"
                        name="operationalStatus"
                        value="NAO_FUNCIONANDO"
                        [(ngModel)]="evalOperationalStatus"
                        required
                      />
                      <span class="opt-icon">🔴</span>
                      <div class="opt-content">
                        <strong>Não funcionando</strong>
                        <small>Não liga, quebrado ou inoperante</small>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Campo Descrição do Problema -->
                <div class="field">
                  <label class="field-label" for="eval-desc">
                    Descrição do Problema / Observações
                  </label>
                  <textarea
                    id="eval-desc"
                    class="field-control"
                    rows="3"
                    [(ngModel)]="evalDescription"
                    name="description"
                    placeholder="Descreva detalhadamente o problema encontrado, botões que não respondem, cabos danificados, etc..."
                  ></textarea>
                </div>
              </div>

              <div class="modal-footer">
                <button class="button button-text" type="button" (click)="closeEvaluationModal()">
                  Cancelar
                </button>
                <button
                  class="button button-primary"
                  type="submit"
                  [disabled]="isSubmittingEval"
                >
                  {{ isSubmittingEval ? 'Enviando...' : 'Registrar Avaliação' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .rooms-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-24, 24px);
      padding-bottom: var(--space-48, 48px);
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: var(--space-16, 16px);
    }

    .header-info {
      max-width: 760px;
    }

    .header-actions {
      display: flex;
      gap: var(--space-12, 12px);
      flex-wrap: wrap;
    }

    /* Alerts */
    .feedback-alert {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-12, 12px) var(--space-16, 16px);
      border-radius: var(--radius-8, 8px);
      font-size: var(--font-size-14, 14px);
    }
    .feedback-success {
      background: rgba(73, 209, 125, 0.15);
      border: 1px solid var(--color-action-green, #49D17D);
      color: #A3F5C3;
    }
    .feedback-error {
      background: rgba(255, 122, 122, 0.15);
      border: 1px solid var(--color-error, #FF7A7A);
      color: #FFB3B3;
    }
    .btn-close {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 16px;
      opacity: 0.7;
    }
    .btn-close:hover { opacity: 1; }

    /* Filter Panel */
    .filter-panel {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-12, 12px) var(--space-16, 16px);
      background: var(--color-surface, #181D1A);
      border-radius: var(--radius-12, 12px);
      flex-wrap: wrap;
      gap: var(--space-12, 12px);
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: var(--space-8, 8px);
      flex: 1 1 300px;
    }

    .search-icon {
      font-size: 16px;
      opacity: 0.7;
    }

    .search-input {
      width: 100%;
    }

    /* Grid of Rooms */
    .rooms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--space-20, 20px);
    }

    .room-card {
      background: var(--color-surface, #181D1A);
      border: 1px solid var(--color-border, #58675C);
      border-radius: var(--radius-16, 16px);
      padding: var(--space-20, 20px);
      display: flex;
      flex-direction: column;
      gap: var(--space-16, 16px);
      cursor: pointer;
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .room-card:hover {
      transform: translateY(-3px);
      border-color: var(--color-action-green, #49D17D);
      box-shadow: 0 8px 24px rgba(73, 209, 125, 0.12);
    }

    .room-card-header {
      display: flex;
      align-items: center;
      gap: var(--space-12, 12px);
    }

    .room-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-12, 12px);
      background: rgba(73, 209, 125, 0.12);
      border: 1px solid rgba(73, 209, 125, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }

    .room-icon-badge.lab-icon {
      background: rgba(77, 163, 255, 0.12);
      border-color: rgba(77, 163, 255, 0.3);
    }

    .room-title-area {
      overflow: hidden;
    }

    .room-title {
      font-size: var(--font-size-18, 18px);
      font-weight: 600;
      color: var(--color-text-primary, #F5F7F4);
      margin: 0 0 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .room-type-badge {
      font-size: var(--font-size-12, 12px);
      color: var(--color-text-secondary, #B9C3BC);
    }

    .room-metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-8, 8px);
      background: rgba(0, 0, 0, 0.2);
      padding: var(--space-12, 12px);
      border-radius: var(--radius-8, 8px);
    }

    .metric-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .metric-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .metric-val {
      font-size: var(--font-size-16, 16px);
      font-weight: 700;
      color: var(--color-text-primary, #F5F7F4);
    }

    .star-val {
      color: #F5A623 !important;
    }

    .room-categories {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .category-chip {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--color-border, #58675C);
      color: var(--color-text-secondary, #B9C3BC);
    }

    .room-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: var(--space-12, 12px);
      margin-top: auto;
    }

    .badge-warning-soft {
      font-size: 12px;
      color: #F5A623;
      font-weight: 500;
    }

    .badge-success-soft {
      font-size: 12px;
      color: var(--color-action-green, #49D17D);
      font-weight: 500;
    }

    /* Room Banner */
    .room-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-20, 20px);
      background: var(--color-surface, #181D1A);
      border-radius: var(--radius-16, 16px);
      flex-wrap: wrap;
      gap: var(--space-16, 16px);
    }

    .banner-left {
      display: flex;
      align-items: center;
      gap: var(--space-16, 16px);
    }

    .banner-icon {
      font-size: 36px;
    }

    .banner-title {
      font-size: var(--font-size-24, 24px);
      font-weight: 700;
      color: var(--color-text-primary, #F5F7F4);
      margin: 0 0 6px;
    }

    .banner-badges {
      display: flex;
      gap: var(--space-8, 8px);
      flex-wrap: wrap;
    }

    .badge-info-soft {
      font-size: 12px;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(77, 163, 255, 0.15);
      border: 1px solid rgba(77, 163, 255, 0.3);
      color: #99CCFF;
    }

    .badge-rating {
      font-size: 12px;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(245, 166, 35, 0.15);
      border: 1px solid rgba(245, 166, 35, 0.3);
      color: #FFD580;
      font-weight: 600;
    }

    .banner-filter {
      min-width: 260px;
    }

    /* Status Legend */
    .status-legend {
      background: rgba(24, 29, 26, 0.7);
      border: 1px solid var(--color-border, #58675C);
      border-radius: var(--radius-12, 12px);
      padding: var(--space-12, 12px) var(--space-16, 16px);
      display: flex;
      flex-direction: column;
      gap: var(--space-8, 8px);
    }

    .legend-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--color-action-green, #49D17D);
      letter-spacing: 0.05em;
    }

    .legend-text {
      font-size: 13px;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .legend-badges {
      display: flex;
      gap: var(--space-8, 8px);
      flex-wrap: wrap;
    }

    .status-tag {
      font-size: 12px;
      padding: 2px 10px;
      border-radius: 999px;
      border: 1px solid transparent;
    }
    .status-green { background: rgba(73, 209, 125, 0.15); color: #A3F5C3; border-color: rgba(73, 209, 125, 0.3); }
    .status-yellow { background: rgba(245, 166, 35, 0.15); color: #FFD580; border-color: rgba(245, 166, 35, 0.3); }
    .status-blue { background: rgba(77, 163, 255, 0.15); color: #99CCFF; border-color: rgba(77, 163, 255, 0.3); }
    .status-red { background: rgba(255, 122, 122, 0.15); color: #FFB3B3; border-color: rgba(255, 122, 122, 0.3); }

    /* Items Grid */
    .items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: var(--space-20, 20px);
      margin-top: var(--space-16, 16px);
    }

    .item-card {
      background: var(--color-surface, #181D1A);
      border: 1px solid var(--color-border, #58675C);
      border-radius: var(--radius-16, 16px);
      padding: var(--space-20, 20px);
      display: flex;
      flex-direction: column;
      gap: var(--space-16, 16px);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .item-card.border-alert {
      border-color: rgba(255, 122, 122, 0.6);
      background: linear-gradient(180deg, rgba(255, 122, 122, 0.04), var(--color-surface, #181D1A));
    }

    .item-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .patrimony-tag {
      font-family: monospace;
      font-size: 12px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--color-border, #58675C);
      padding: 2px 8px;
      border-radius: 6px;
      color: var(--color-text-primary, #F5F7F4);
    }

    .category-tag {
      font-size: 11px;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .item-card-title-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .item-name {
      font-size: var(--font-size-18, 18px);
      font-weight: 600;
      color: var(--color-text-primary, #F5F7F4);
      margin: 0;
    }

    .item-description {
      font-size: 13px;
      color: var(--color-text-secondary, #B9C3BC);
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Status Block */
    .status-block {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-12, 12px);
      padding: var(--space-12, 12px);
      display: flex;
      flex-direction: column;
      gap: var(--space-8, 8px);
    }

    .status-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sub-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .occurrence-count {
      font-size: 11px;
      color: var(--color-action-green, #49D17D);
      font-weight: 600;
    }

    .operational-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
    }

    .status-icon-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .breakdown-bar-container {
      font-size: 11px;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .breakdown-text {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
    }

    .count-pill {
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }
    .green-pill { background: rgba(73, 209, 125, 0.2); color: #A3F5C3; }
    .yellow-pill { background: rgba(245, 166, 35, 0.2); color: #FFD580; }
    .blue-pill { background: rgba(77, 163, 255, 0.2); color: #99CCFF; }
    .red-pill { background: rgba(255, 122, 122, 0.2); color: #FFB3B3; }

    .no-eval-hint {
      font-size: 12px;
      color: var(--color-text-secondary, #B9C3BC);
      font-style: italic;
      margin: 0;
    }

    /* Rating row */
    .rating-display-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 4px;
    }

    .stars-visual {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .star-icon {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.2);
    }

    .star-icon.star-filled {
      color: #F5A623;
    }

    .rating-score {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text-primary, #F5F7F4);
      margin-left: 6px;
    }

    .eval-count-tag {
      font-size: 12px;
      color: var(--color-text-secondary, #B9C3BC);
    }

    /* Actions */
    .item-card-actions {
      display: flex;
      gap: var(--space-8, 8px);
      margin-top: auto;
      flex-direction: column;
    }

    .btn-eval {
      width: 100%;
      justify-content: center;
      font-weight: 600;
    }

    /* Tray of previous evaluations */
    .evaluations-tray {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--color-border, #58675C);
      border-radius: var(--radius-12, 12px);
      padding: var(--space-12, 12px);
      margin-top: var(--space-8, 8px);
    }

    .tray-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-secondary, #B9C3BC);
      margin: 0 0 var(--space-8, 8px);
    }

    .tray-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-12, 12px);
      max-height: 220px;
      overflow-y: auto;
    }

    .tray-item {
      padding: var(--space-8, 8px);
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .tray-item-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      font-size: 12px;
    }

    .student-name {
      font-weight: 600;
      color: var(--color-text-primary, #F5F7F4);
    }

    .ev-stars {
      color: rgba(255, 255, 255, 0.2);
    }

    .rating-num {
      color: #FFD580;
      margin-left: 4px;
      font-size: 11px;
    }

    .ev-date {
      color: var(--color-text-secondary, #B9C3BC);
      font-size: 11px;
    }

    .tray-status-line {
      display: flex;
      align-items: center;
    }

    .sub-status-tag {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 500;
    }

    .tray-desc {
      font-size: 12px;
      color: var(--color-text-secondary, #B9C3BC);
      font-style: italic;
      margin: 2px 0 0;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--space-16, 16px);
      animation: fadeIn 0.15s ease-in-out;
    }

    .modal-dialog {
      background: var(--color-surface, #181D1A);
      border: 1px solid var(--color-border, #58675C);
      border-radius: var(--radius-16, 16px);
      width: 100%;
      max-width: 560px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: var(--space-20, 20px);
      border-bottom: 1px solid var(--color-border, #58675C);
    }

    .modal-title {
      font-size: var(--font-size-20, 20px);
      font-weight: 700;
      color: var(--color-text-primary, #F5F7F4);
      margin: 0;
    }

    .modal-subtitle {
      font-size: 13px;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .modal-body {
      padding: var(--space-20, 20px);
      display: flex;
      flex-direction: column;
      gap: var(--space-20, 20px);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-12, 12px);
      padding: var(--space-16, 16px) var(--space-20, 20px);
      border-top: 1px solid var(--color-border, #58675C);
      background: rgba(0, 0, 0, 0.2);
    }

    /* Stars selector in modal */
    .stars-selector-container {
      display: flex;
      align-items: center;
      gap: var(--space-16, 16px);
      margin-top: 4px;
    }

    .stars-selector {
      display: flex;
      gap: 4px;
    }

    .star-btn {
      background: none;
      border: none;
      font-size: 28px;
      color: rgba(255, 255, 255, 0.2);
      cursor: pointer;
      padding: 2px 4px;
      transition: transform 0.15s ease, color 0.15s ease;
      line-height: 1;
    }

    .star-btn:hover,
    .star-btn.active {
      color: #F5A623;
      transform: scale(1.15);
    }

    .selected-star-label {
      font-size: 14px;
      font-weight: 700;
      color: #FFD580;
    }

    .stars-legend-hints {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--color-text-secondary, #B9C3BC);
      margin-top: 4px;
      padding: 0 4px;
    }

    /* Status options cards */
    .status-options-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-8, 8px);
      margin-top: 4px;
    }

    .status-option-card {
      display: flex;
      align-items: center;
      gap: var(--space-12, 12px);
      padding: var(--space-12, 12px);
      border-radius: var(--radius-8, 8px);
      border: 1px solid var(--color-border, #58675C);
      background: rgba(255, 255, 255, 0.02);
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .status-option-card:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.4);
    }

    .status-option-card.selected {
      border-color: var(--color-action-green, #49D17D);
      background: rgba(73, 209, 125, 0.08);
    }

    .opt-icon {
      font-size: 20px;
    }

    .opt-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .opt-content strong {
      font-size: 13px;
      color: var(--color-text-primary, #F5F7F4);
    }

    .opt-content small {
      font-size: 11px;
      color: var(--color-text-secondary, #B9C3BC);
    }

    /* Loading and Empty States */
    .loading-state {
      padding: var(--space-48, 48px);
      text-align: center;
      color: var(--color-text-secondary, #B9C3BC);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-16, 16px);
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(73, 209, 125, 0.2);
      border-top-color: var(--color-action-green, #49D17D);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .empty-state {
      padding: var(--space-32, 32px);
      text-align: center;
      color: var(--color-text-secondary, #B9C3BC);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-12, 12px);
      grid-column: 1 / -1;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class StudentRoomsPageComponent implements OnInit {
  Math = Math

  rooms: RoomSummary[] = []
  filteredRooms: RoomSummary[] = []
  selectedRoom: RoomSummary | null = null
  filteredRoomItems: RoomItem[] = []

  searchRoomQuery = ''
  searchItemQuery = ''

  isLoading = false
  isLoadingRoomItems = false
  globalSuccess = ''
  globalError = ''

  // Avaliação do Aluno
  isEvalModalOpen = false
  isSubmittingEval = false
  evaluatingItem: RoomItem | null = null
  modalError = ''

  evalRating = 5
  hoveredRating = 0
  evalOperationalStatus: ItemOperationalStatus = 'FUNCIONANDO_PERFEITAMENTE'
  evalDescription = ''

  // Visualização de avaliações expandidas por item
  expandedItemIds = new Set<string>()

  contextEyebrow = 'Portal do Aluno · Ambientes de Ensino'

  constructor(
    private readonly http: HttpClient,
    public readonly authService: AuthService,
    private readonly route: ActivatedRoute,
  ) {
    const path = this.route.snapshot.routeConfig?.path || ''
    if (path.includes('administracao')) {
      this.contextEyebrow = 'Administração · Consulta de Salas e Laboratórios'
    } else if (path.includes('desenvolvedor')) {
      this.contextEyebrow = 'Desenvolvedor · Ambientes e Equipamentos'
    } else if (path.includes('professor')) {
      this.contextEyebrow = 'Professor · Salas e Laboratórios'
    } else {
      this.contextEyebrow = 'Portal do Aluno · Salas & Laboratórios'
    }
  }

  ngOnInit(): void {
    this.loadRooms()
  }

  loadRooms(): void {
    this.isLoading = true
    this.globalError = ''

    this.http.get<RoomSummary[]>('/api/reservations/rooms').subscribe({
      next: (data) => {
        this.rooms = data
        this.filterRooms()
        this.isLoading = false

        // Se uma sala já estava selecionada, recarrega os itens dela
        if (this.selectedRoom) {
          const updated = this.rooms.find((r) => r.location === this.selectedRoom?.location)
          if (updated) {
            this.selectedRoom = updated
            this.loadRoomItems(updated.location)
          }
        }
      },
      error: (err) => {
        this.globalError = err.error?.message || 'Erro ao carregar salas e laboratórios.'
        this.isLoading = false
      },
    })
  }

  filterRooms(): void {
    const q = this.searchRoomQuery.trim().toLowerCase()
    if (!q) {
      this.filteredRooms = [...this.rooms]
      return
    }
    this.filteredRooms = this.rooms.filter(
      (r) =>
        r.location.toLowerCase().includes(q) ||
        r.categories.some((c) => c.toLowerCase().includes(q)),
    )
  }

  selectRoom(room: RoomSummary): void {
    this.selectedRoom = room
    this.searchItemQuery = ''
    this.loadRoomItems(room.location)
  }

  clearSelectedRoom(): void {
    this.selectedRoom = null
    this.filteredRoomItems = []
  }

  loadRoomItems(location: string): void {
    this.isLoadingRoomItems = true
    const encoded = encodeURIComponent(location)

    this.http.get<RoomItem[]>(`/api/reservations/rooms/${encoded}/items`).subscribe({
      next: (items) => {
        if (this.selectedRoom) {
          this.selectedRoom.items = items
        }
        this.filterRoomItems()
        this.isLoadingRoomItems = false
      },
      error: (err) => {
        this.globalError = err.error?.message || 'Erro ao carregar itens da sala.'
        this.isLoadingRoomItems = false
      },
    })
  }

  filterRoomItems(): void {
    if (!this.selectedRoom || !this.selectedRoom.items) {
      this.filteredRoomItems = []
      return
    }

    const q = this.searchItemQuery.trim().toLowerCase()
    if (!q) {
      this.filteredRoomItems = [...this.selectedRoom.items]
      return
    }

    this.filteredRoomItems = this.selectedRoom.items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)),
    )
  }

  isLab(location: string): boolean {
    const l = location.toLowerCase()
    return l.includes('lab') || l.includes('laboratório') || l.includes('laboratorio')
  }

  toggleEvaluationsView(itemId: string): void {
    if (this.expandedItemIds.has(itemId)) {
      this.expandedItemIds.delete(itemId)
    } else {
      this.expandedItemIds.add(itemId)
    }
  }

  isShowingEvaluations(itemId: string): boolean {
    return this.expandedItemIds.has(itemId)
  }

  // --- MODAL DE AVALIAÇÃO ---

  openEvaluationModal(item: RoomItem): void {
    this.evaluatingItem = item
    this.evalRating = 5
    this.hoveredRating = 0
    this.evalOperationalStatus = 'FUNCIONANDO_PERFEITAMENTE'
    this.evalDescription = ''
    this.modalError = ''
    this.isEvalModalOpen = true
  }

  closeEvaluationModal(): void {
    this.isEvalModalOpen = false
    this.evaluatingItem = null
    this.modalError = ''
  }

  submitEvaluation(): void {
    if (!this.evaluatingItem) return

    if (!this.evalRating || this.evalRating < 1 || this.evalRating > 5) {
      this.modalError = 'Por favor, selecione de 1 a 5 estrelas.'
      return
    }

    if (!this.evalOperationalStatus) {
      this.modalError = 'Selecione o status de funcionamento do equipamento.'
      return
    }

    this.isSubmittingEval = true
    this.modalError = ''

    const payload = {
      rating: this.evalRating,
      operationalStatus: this.evalOperationalStatus,
      description: this.evalDescription.trim() || undefined,
      studentName: this.authService.currentUser?.username || 'Aluno',
    }

    this.http
      .post<{
        evaluation: ItemEvaluation
        consolidatedStatus: ItemOperationalStatus
        statusCounts: Record<ItemOperationalStatus, number>
        averageRating: number | null
        totalEvaluations: number
      }>(`/api/reservations/items/${this.evaluatingItem.id}/evaluations`, payload)
      .subscribe({
        next: (res) => {
          this.isSubmittingEval = false
          this.closeEvaluationModal()
          this.globalSuccess = `Avaliação do equipamento registrada com sucesso! Status atualizado pela maior ocorrência.`

          // Recarrega os dados da sala atual
          if (this.selectedRoom) {
            this.loadRoomItems(this.selectedRoom.location)
          }
          this.loadRooms()
        },
        error: (err) => {
          this.isSubmittingEval = false
          this.modalError = err.error?.message || 'Erro ao submeter avaliação.'
        },
      })
  }

  // --- HELPERS DE FORMATAÇÃO ---

  formatOperationalStatus(status: ItemOperationalStatus): string {
    switch (status) {
      case 'FUNCIONANDO_PERFEITAMENTE':
        return 'Funcionando perfeitamente'
      case 'FUNCIONANDO_COM_DEFEITOS':
        return 'Funcionando com alguns defeitos'
      case 'COM_AVARIAS_FUNCIONANDO':
        return 'Com avarias mas funcionando perfeitamente'
      case 'NAO_FUNCIONANDO':
        return 'Não funcionando'
      default:
        return status
    }
  }

  getOperationalStatusClass(status: ItemOperationalStatus): string {
    switch (status) {
      case 'FUNCIONANDO_PERFEITAMENTE':
        return 'status-green'
      case 'FUNCIONANDO_COM_DEFEITOS':
        return 'status-yellow'
      case 'COM_AVARIAS_FUNCIONANDO':
        return 'status-blue'
      case 'NAO_FUNCIONANDO':
        return 'status-red'
      default:
        return ''
    }
  }

  formatRatingLabel(rating: number): string {
    switch (rating) {
      case 1:
        return 'Péssimo'
      case 2:
        return 'Ruim'
      case 3:
        return 'Regular'
      case 4:
        return 'Bom'
      case 5:
        return 'Ótimo'
      default:
        return ''
    }
  }

  getOccurrenceText(item: RoomItem): string {
    if (!item.totalEvaluations) return 'Padrão (sem avaliações)'
    const count = item.statusCounts?.[item.consolidatedStatus] || 0
    return `${count} de ${item.totalEvaluations} ocorrência(s)`
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}
