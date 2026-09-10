import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, RouterModule } from '@angular/router'
import { AuthService } from '../services/auth.service'

export type ItemStatus = 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE'
export type ReservationStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

export interface ReservableItem {
  id: string
  name: string
  category: string
  code: string
  location: string
  description?: string | null
  status: ItemStatus
  createdAt: string
  updatedAt: string
  currentReservation?: ItemReservation | null
}

export interface ItemReservation {
  id: string
  itemId: string
  item?: ReservableItem
  userId?: string | null
  user?: { username: string; email: string; role: string } | null
  requesterName: string
  department: string
  startDate: string
  endDate: string
  purpose: string
  notes?: string | null
  status: ReservationStatus
  createdAt: string
}

export interface ReservationStats {
  totalItems: number
  availableItems: number
  reservedItems: number
  maintenanceItems: number
  activeReservations: number
}

@Component({
  selector: 'app-item-reservation-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="reservation-page" aria-labelledby="page-title">
      <!-- Header -->
      <header class="reservation-header">
        <div class="header-info">
          <p class="hero-eyebrow">{{ contextEyebrow }}</p>
          <h1 id="page-title" class="page-title">Reserva de Itens e Equipamentos</h1>
          <p class="page-subtitle">
            Gerencie o catálogo institucional, consulte a disponibilidade de recursos e efetue reservas de forma centralizada.
          </p>
        </div>
        <div class="header-actions">
          <button class="button button-primary" type="button" (click)="openReserveModal()">
            <span aria-hidden="true">＋</span> Nova Reserva
          </button>
          @if (canManageCatalog) {
            <button class="button button-secondary" type="button" (click)="openNewItemModal()">
              <span aria-hidden="true">📦</span> Cadastrar Item
            </button>
          }
        </div>
      </header>

      <!-- Mensagens de Alerta Globais -->
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

      <!-- Indicadores / KPI Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Total de Itens</span>
          <span class="stat-value">{{ stats.totalItems }}</span>
          <span class="stat-hint">Recursos cadastrados</span>
        </div>
        <div class="stat-card stat-available">
          <span class="stat-label">Disponíveis</span>
          <span class="stat-value text-green">{{ stats.availableItems }}</span>
          <span class="stat-hint">Prontos para reserva</span>
        </div>
        <div class="stat-card stat-reserved">
          <span class="stat-label">Reservas Ativas</span>
          <span class="stat-value text-amber">{{ stats.activeReservations }}</span>
          <span class="stat-hint">Em uso ou agendados</span>
        </div>
        <div class="stat-card stat-maintenance">
          <span class="stat-label">Em Manutenção</span>
          <span class="stat-value text-muted">{{ stats.maintenanceItems }}</span>
          <span class="stat-hint">Indisponíveis temporariamente</span>
        </div>
      </div>

      <!-- Abas de Navegação -->
      <div class="tabs-container">
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab === 'catalog'"
          (click)="switchTab('catalog')"
        >
          Catálogo de Itens ({{ filteredItems.length }})
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab === 'reservations'"
          (click)="switchTab('reservations')"
        >
          Histórico e Reservas Ativas ({{ reservations.length }})
        </button>
      </div>

      <!-- ABA 1: CATÁLOGO DE ITENS -->
      @if (activeTab === 'catalog') {
        <div class="catalog-view">
          <!-- Filtros -->
          <div class="filter-bar card card-outlined">
            <div class="filter-input-group">
              <label for="search-item" class="visually-hidden">Buscar item</label>
              <input
                id="search-item"
                type="text"
                class="field-control search-input"
                placeholder="Buscar por nome, código de patrimônio ou local..."
                [(ngModel)]="searchTerm"
                (ngModelChange)="applyFilter()"
              />
            </div>

            <div class="filter-select-group">
              <label for="filter-category" class="filter-label">Categoria:</label>
              <select
                id="filter-category"
                class="field-control filter-select"
                [(ngModel)]="selectedCategory"
                (ngModelChange)="applyFilter()"
              >
                <option value="ALL">Todas as Categorias</option>
                @for (cat of categories; track cat) {
                  <option [value]="cat">{{ cat }}</option>
                }
              </select>
            </div>

            <div class="filter-select-group">
              <label for="filter-status" class="filter-label">Status:</label>
              <select
                id="filter-status"
                class="field-control filter-select"
                [(ngModel)]="selectedStatus"
                (ngModelChange)="applyFilter()"
              >
                <option value="ALL">Todos os Status</option>
                <option value="AVAILABLE">Disponível</option>
                <option value="RESERVED">Reservado</option>
                <option value="MAINTENANCE">Em Manutenção</option>
              </select>
            </div>

            <button class="button button-text" type="button" (click)="loadAllData()">
              ↻ Atualizar
            </button>
          </div>

          <!-- Grade de Itens -->
          @if (isLoading) {
            <div class="loading-state">
              <p>Carregando itens do catálogo...</p>
            </div>
          } @else {
            <div class="items-grid">
              @for (item of filteredItems; track item.id) {
                <article class="item-card card card-outlined" [attr.data-status]="item.status">
                  <div class="item-card-header">
                    <span class="category-badge">{{ item.category }}</span>
                    <span class="status-badge" [class.badge-available]="item.status === 'AVAILABLE'"
                                               [class.badge-reserved]="item.status === 'RESERVED'"
                                               [class.badge-maintenance]="item.status === 'MAINTENANCE'">
                      {{ formatStatus(item.status) }}
                    </span>
                  </div>

                  <h3 class="item-title">{{ item.name }}</h3>

                  <div class="item-meta">
                    <span class="meta-tag">Patrimônio: <strong>{{ item.code }}</strong></span>
                    <span class="meta-tag">📍 {{ item.location }}</span>
                  </div>

                  @if (item.description) {
                    <p class="item-description">{{ item.description }}</p>
                  }

                  @if (item.currentReservation) {
                    <div class="reservation-pill">
                      <span>Reservado para: <strong>{{ item.currentReservation.requesterName }}</strong></span>
                      <small>Até {{ formatDate(item.currentReservation.endDate) }}</small>
                    </div>
                  }

                  <div class="item-card-actions">
                    <button
                      class="button button-primary btn-sm"
                      type="button"
                      [disabled]="item.status !== 'AVAILABLE'"
                      (click)="openReserveModal(item)"
                    >
                      {{ item.status === 'AVAILABLE' ? 'Reservar Este Item' : 'Indisponível' }}
                    </button>

                    @if (canManageCatalog) {
                      <button
                        class="button button-secondary btn-sm"
                        type="button"
                        [title]="item.status === 'MAINTENANCE' ? 'Liberar da manutenção' : 'Colocar em manutenção'"
                        (click)="toggleMaintenance(item)"
                      >
                        {{ item.status === 'MAINTENANCE' ? 'Reativar' : 'Manutenção' }}
                      </button>
                    }
                  </div>
                </article>
              } @empty {
                <div class="empty-state card card-outlined">
                  <p>Nenhum item encontrado com os filtros aplicados.</p>
                  <button class="button button-secondary" type="button" (click)="clearFilters()">
                    Limpar Filtros
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- ABA 2: RESERVAS REGISTRADAS -->
      @if (activeTab === 'reservations') {
        <div class="reservations-view">
          <div class="view-header">
            <h2>Todas as Reservas Registradas</h2>
            <button class="button button-text" type="button" (click)="loadReservations()">
              ↻ Atualizar Lista
            </button>
          </div>

          <div class="table-wrapper card card-outlined">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Item Reservado</th>
                  <th>Solicitante / Responsável</th>
                  <th>Setor</th>
                  <th>Período</th>
                  <th>Finalidade</th>
                  <th>Status</th>
                  <th class="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (res of reservations; track res.id) {
                  <tr>
                    <td>
                      <div class="table-item-name">{{ res.item?.name || 'Item não especificado' }}</div>
                      <small class="text-muted">{{ res.item?.code }} · {{ res.item?.location }}</small>
                    </td>
                    <td>
                      <strong>{{ res.requesterName }}</strong>
                      @if (res.user?.email) {
                        <div class="text-muted text-xs">{{ res.user?.email }}</div>
                      }
                    </td>
                    <td>{{ res.department }}</td>
                    <td>
                      <div><strong>De:</strong> {{ formatDate(res.startDate) }}</div>
                      <div><strong>Até:</strong> {{ formatDate(res.endDate) }}</div>
                    </td>
                    <td>
                      <span [title]="res.purpose">{{ res.purpose }}</span>
                      @if (res.notes) {
                        <div class="text-xs text-muted">Obs: {{ res.notes }}</div>
                      }
                    </td>
                    <td>
                      <span class="status-badge" [class.badge-available]="res.status === 'COMPLETED'"
                                                 [class.badge-reserved]="res.status === 'ACTIVE'"
                                                 [class.badge-maintenance]="res.status === 'CANCELLED'">
                        {{ formatReservationStatus(res.status) }}
                      </span>
                    </td>
                    <td class="text-right">
                      @if (res.status === 'ACTIVE') {
                        <div class="action-buttons-cell">
                          <button
                            class="button button-primary btn-xs"
                            type="button"
                            title="Concluir reserva e liberar item"
                            (click)="completeReservation(res)"
                          >
                            Devolver / Concluir
                          </button>
                          <button
                            class="button button-secondary btn-xs"
                            type="button"
                            title="Cancelar reserva"
                            (click)="cancelReservation(res)"
                          >
                            Cancelar
                          </button>
                        </div>
                      } @else {
                        <span class="text-muted text-xs">Finalizado</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="text-center py-4">Nenhuma reserva registrada até o momento.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- MODAL DE NOVA RESERVA -->
      @if (isReserveModalOpen) {
        <div class="modal-backdrop" (click)="closeReserveModal()">
          <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Efetuar Reserva de Item</h2>
              <button class="btn-close" type="button" (click)="closeReserveModal()" aria-label="Fechar">✕</button>
            </div>

            @if (modalError) {
              <div class="feedback-alert feedback-error" role="alert">
                <span>⚠ {{ modalError }}</span>
              </div>
            }

            <form (ngSubmit)="submitReservation()">
              <div class="modal-body">
                <div class="field">
                  <label class="field-label" for="res-item">Item a ser reservado *</label>
                  <select
                    id="res-item"
                    class="field-control"
                    [(ngModel)]="reservationForm.itemId"
                    name="itemId"
                    required
                  >
                    <option value="" disabled>Selecione um item disponível</option>
                    @for (item of availableItemsForSelect; track item.id) {
                      <option [value]="item.id">
                        {{ item.name }} ({{ item.code }}) - {{ item.location }}
                      </option>
                    }
                  </select>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label class="field-label" for="res-requester">Nome do Solicitante *</label>
                    <input
                      id="res-requester"
                      class="field-control"
                      type="text"
                      [(ngModel)]="reservationForm.requesterName"
                      name="requesterName"
                      required
                      placeholder="Ex: João da Silva"
                    />
                  </div>

                  <div class="field">
                    <label class="field-label" for="res-department">Setor / Departamento *</label>
                    <input
                      id="res-department"
                      class="field-control"
                      type="text"
                      [(ngModel)]="reservationForm.department"
                      name="department"
                      required
                      placeholder="Ex: Administração, TI, Coordenação..."
                    />
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label class="field-label" for="res-start">Início da Reserva *</label>
                    <input
                      id="res-start"
                      class="field-control"
                      type="datetime-local"
                      [(ngModel)]="reservationForm.startDate"
                      name="startDate"
                      required
                    />
                  </div>

                  <div class="field">
                    <label class="field-label" for="res-end">Término da Reserva *</label>
                    <input
                      id="res-end"
                      class="field-control"
                      type="datetime-local"
                      [(ngModel)]="reservationForm.endDate"
                      name="endDate"
                      required
                    />
                  </div>
                </div>

                <div class="field">
                  <label class="field-label" for="res-purpose">Finalidade / Motivo da Reserva *</label>
                  <input
                    id="res-purpose"
                    class="field-control"
                    type="text"
                    [(ngModel)]="reservationForm.purpose"
                    name="purpose"
                    required
                    placeholder="Ex: Reunião do Conselho, Palestra Semestral, Aula Prática..."
                  />
                </div>

                <div class="field">
                  <label class="field-label" for="res-notes">Observações Adicionais</label>
                  <textarea
                    id="res-notes"
                    class="field-control"
                    rows="2"
                    [(ngModel)]="reservationForm.notes"
                    name="notes"
                    placeholder="Ex: Necessita adaptador VGA, retorno até as 18h..."
                  ></textarea>
                </div>
              </div>

              <div class="modal-footer">
                <button class="button button-text" type="button" (click)="closeReserveModal()">
                  Cancelar
                </button>
                <button class="button button-primary" type="submit" [disabled]="isSubmitting">
                  {{ isSubmitting ? 'Salvando...' : 'Confirmar Reserva' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL DE CADASTRO DE NOVO ITEM -->
      @if (isNewItemModalOpen) {
        <div class="modal-backdrop" (click)="closeNewItemModal()">
          <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Cadastrar Novo Item no Acervo</h2>
              <button class="btn-close" type="button" (click)="closeNewItemModal()" aria-label="Fechar">✕</button>
            </div>

            @if (newItemModalError) {
              <div class="feedback-alert feedback-error" role="alert">
                <span>⚠ {{ newItemModalError }}</span>
              </div>
            }

            <form (ngSubmit)="submitNewItem()">
              <div class="modal-body">
                <div class="field">
                  <label class="field-label" for="item-name">Nome do Equipamento / Recurso *</label>
                  <input
                    id="item-name"
                    class="field-control"
                    type="text"
                    [(ngModel)]="newItemForm.name"
                    name="name"
                    required
                    placeholder="Ex: Projetor Epson EB-FH06"
                  />
                </div>

                <div class="field-row">
                  <div class="field">
                    <label class="field-label" for="item-category">Categoria *</label>
                    <input
                      id="item-category"
                      class="field-control"
                      type="text"
                      list="categories-list"
                      [(ngModel)]="newItemForm.category"
                      name="category"
                      required
                      placeholder="Ex: Audiovisual, Informática..."
                    />
                    <datalist id="categories-list">
                      <option value="Audiovisual"></option>
                      <option value="Informática"></option>
                      <option value="Salas e Espaços"></option>
                      <option value="Acessórios e Cabos"></option>
                    </datalist>
                  </div>

                  <div class="field">
                    <label class="field-label" for="item-code">Código de Patrimônio / Tombo *</label>
                    <input
                      id="item-code"
                      class="field-control"
                      type="text"
                      [(ngModel)]="newItemForm.code"
                      name="code"
                      required
                      placeholder="Ex: PAT-00599"
                    />
                  </div>
                </div>

                <div class="field">
                  <label class="field-label" for="item-location">Localização Física Padrão *</label>
                  <input
                    id="item-location"
                    class="field-control"
                    type="text"
                    [(ngModel)]="newItemForm.location"
                    name="location"
                    required
                    placeholder="Ex: Almoxarifado Bloco B, Sala de TI 102..."
                  />
                </div>

                <div class="field">
                  <label class="field-label" for="item-desc">Descrição / Itens Inclusos</label>
                  <textarea
                    id="item-desc"
                    class="field-control"
                    rows="2"
                    [(ngModel)]="newItemForm.description"
                    name="description"
                    placeholder="Ex: Acompanha fonte original, cabo HDMI e maleta para transporte."
                  ></textarea>
                </div>
              </div>

              <div class="modal-footer">
                <button class="button button-text" type="button" (click)="closeNewItemModal()">
                  Cancelar
                </button>
                <button class="button button-primary" type="submit" [disabled]="isSubmittingItem">
                  {{ isSubmittingItem ? 'Salvando...' : 'Salvar Item' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .reservation-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-24, 24px);
      padding-bottom: var(--space-48, 48px);
    }

    .reservation-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-16, 16px);
    }

    .header-info {
      max-width: 720px;
    }

    .header-actions {
      display: flex;
      gap: var(--space-12, 12px);
      flex-wrap: wrap;
    }

    /* Feedback Alerts */
    .feedback-alert {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-12, 12px) var(--space-16, 16px);
      border-radius: var(--radius-8, 8px);
      font-size: var(--font-size-14, 14px);
      animation: fadeIn 0.2s ease-in-out;
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
      line-height: 1;
      padding: 0 4px;
      opacity: 0.7;
    }
    .btn-close:hover { opacity: 1; }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-16, 16px);
    }

    .stat-card {
      background: var(--color-surface, #181D1A);
      border: 1px solid var(--color-border, #58675C);
      border-radius: var(--radius-12, 12px);
      padding: var(--space-16, 16px) var(--space-20, 20px);
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      border-color: var(--color-action-green, #49D17D);
    }

    .stat-label {
      font-size: var(--font-size-12, 12px);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .stat-value {
      font-size: var(--font-size-32, 32px);
      font-weight: var(--font-weight-bold, 700);
      line-height: 1.1;
      color: var(--color-text-primary, #F5F7F4);
    }

    .stat-hint {
      font-size: var(--font-size-12, 12px);
      color: var(--color-text-secondary, #B9C3BC);
    }

    .text-green { color: var(--color-action-green, #49D17D) !important; }
    .text-amber { color: #F5A623 !important; }
    .text-muted { color: var(--color-text-secondary, #B9C3BC) !important; }

    /* Tabs */
    .tabs-container {
      display: flex;
      gap: var(--space-8, 8px);
      border-bottom: 1px solid var(--color-border, #58675C);
      padding-bottom: 2px;
    }

    .tab-btn {
      background: none;
      border: none;
      color: var(--color-text-secondary, #B9C3BC);
      padding: var(--space-12, 12px) var(--space-16, 16px);
      font-size: var(--font-size-14, 14px);
      font-weight: var(--font-weight-medium, 500);
      cursor: pointer;
      border-bottom: 3px solid transparent;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: var(--color-text-primary, #F5F7F4);
    }

    .tab-btn.active {
      color: var(--color-action-green, #49D17D);
      border-bottom-color: var(--color-action-green, #49D17D);
    }

    /* Filter Bar */
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-12, 12px);
      padding: var(--space-12, 12px) var(--space-16, 16px);
      margin-bottom: var(--space-20, 20px);
    }

    .filter-input-group {
      flex: 1 1 280px;
    }

    .search-input {
      width: 100%;
    }

    .filter-select-group {
      display: flex;
      align-items: center;
      gap: var(--space-8, 8px);
    }

    .filter-label {
      font-size: var(--font-size-12, 12px);
      color: var(--color-text-secondary, #B9C3BC);
      white-space: nowrap;
    }

    .filter-select {
      min-width: 170px;
    }

    /* Items Grid */
    .items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-20, 20px);
    }

    .item-card {
      display: flex;
      flex-direction: column;
      padding: var(--space-20, 20px);
      border-radius: var(--radius-12, 12px);
      background: var(--color-surface, #181D1A);
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .item-card:hover {
      border-color: rgba(73, 209, 125, 0.4);
      box-shadow: var(--shadow-raised, 0 8px 24px rgba(0,0,0,0.28));
    }

    .item-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-12, 12px);
      gap: 8px;
    }

    .category-badge {
      font-size: var(--font-size-12, 12px);
      font-weight: 600;
      color: var(--color-action-green, #49D17D);
      background: rgba(73, 209, 125, 0.1);
      padding: 2px 8px;
      border-radius: var(--radius-4, 4px);
    }

    .status-badge {
      font-size: var(--font-size-12, 12px);
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-pill, 999px);
      white-space: nowrap;
    }

    .badge-available {
      background: rgba(73, 209, 125, 0.15);
      color: #49D17D;
      border: 1px solid rgba(73, 209, 125, 0.3);
    }

    .badge-reserved {
      background: rgba(245, 166, 35, 0.15);
      color: #F5A623;
      border: 1px solid rgba(245, 166, 35, 0.3);
    }

    .badge-maintenance {
      background: rgba(255, 122, 122, 0.15);
      color: #FF7A7A;
      border: 1px solid rgba(255, 122, 122, 0.3);
    }

    .item-title {
      font-size: var(--font-size-18, 18px);
      font-weight: var(--font-weight-semibold, 600);
      margin-bottom: var(--space-8, 8px);
      color: var(--color-text-primary, #F5F7F4);
    }

    .item-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: var(--font-size-12, 12px);
      color: var(--color-text-secondary, #B9C3BC);
      margin-bottom: var(--space-12, 12px);
    }

    .item-description {
      font-size: var(--font-size-14, 14px);
      color: var(--color-text-secondary, #B9C3BC);
      line-height: 1.4;
      margin-bottom: var(--space-16, 16px);
      flex: 1;
    }

    .reservation-pill {
      background: rgba(245, 166, 35, 0.08);
      border: 1px solid rgba(245, 166, 35, 0.25);
      border-radius: var(--radius-8, 8px);
      padding: var(--space-8, 8px) var(--space-12, 12px);
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: var(--font-size-12, 12px);
      color: #F5A623;
      margin-bottom: var(--space-16, 16px);
    }

    .item-card-actions {
      display: flex;
      gap: var(--space-8, 8px);
      margin-top: auto;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: var(--font-size-12, 12px);
      min-height: 36px;
      flex: 1;
    }

    .btn-xs {
      padding: 4px 8px;
      font-size: 11px;
      min-height: 28px;
    }

    /* Table View */
    .table-wrapper {
      overflow-x: auto;
      border-radius: var(--radius-12, 12px);
      background: var(--color-surface, #181D1A);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: var(--font-size-14, 14px);
    }

    .data-table th {
      padding: var(--space-12, 12px) var(--space-16, 16px);
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--color-border, #58675C);
      color: var(--color-text-secondary, #B9C3BC);
      font-weight: var(--font-weight-medium, 500);
      font-size: var(--font-size-12, 12px);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .data-table td {
      padding: var(--space-12, 12px) var(--space-16, 16px);
      border-bottom: 1px solid rgba(88, 103, 92, 0.4);
      color: var(--color-text-primary, #F5F7F4);
      vertical-align: middle;
    }

    .data-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .action-buttons-cell {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }

    .table-item-name {
      font-weight: 600;
      color: var(--color-text-primary, #F5F7F4);
    }

    .text-xs { font-size: 11px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .py-4 { padding-top: 2rem !important; padding-bottom: 2rem !important; }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-16, 16px);
      z-index: 1000;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.15s ease-out;
    }

    .modal-dialog {
      background: var(--color-surface, #181D1A);
      border: 1px solid var(--color-border, #58675C);
      border-radius: var(--radius-16, 16px);
      width: 100%;
      max-width: 580px;
      box-shadow: var(--shadow-overlay, 0 16px 40px rgba(0,0,0,0.40));
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-20, 20px);
      border-bottom: 1px solid var(--color-border, #58675C);
    }

    .modal-header h2 {
      font-size: var(--font-size-20, 20px);
      font-weight: 600;
      margin: 0;
    }

    .modal-body {
      padding: var(--space-20, 20px);
      display: flex;
      flex-direction: column;
      gap: var(--space-16, 16px);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-12, 12px);
      padding: var(--space-16, 16px) var(--space-20, 20px);
      border-top: 1px solid var(--color-border, #58675C);
      background: rgba(0, 0, 0, 0.2);
      border-radius: 0 0 var(--radius-16, 16px) var(--radius-16, 16px);
    }

    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-16, 16px);
    }

    @media (max-width: 600px) {
      .field-row {
        grid-template-columns: 1fr;
      }
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ItemReservationPageComponent implements OnInit {
  activeTab: 'catalog' | 'reservations' = 'catalog'
  items: ReservableItem[] = []
  filteredItems: ReservableItem[] = []
  reservations: ItemReservation[] = []
  stats: ReservationStats = {
    totalItems: 0,
    availableItems: 0,
    reservedItems: 0,
    maintenanceItems: 0,
    activeReservations: 0,
  }

  searchTerm = ''
  selectedCategory = 'ALL'
  selectedStatus = 'ALL'
  categories: string[] = []

  isLoading = false
  globalSuccess = ''
  globalError = ''

  // Modal Reserva
  isReserveModalOpen = false
  isSubmitting = false
  modalError = ''
  reservationForm = {
    itemId: '',
    requesterName: '',
    department: '',
    startDate: '',
    endDate: '',
    purpose: '',
    notes: '',
  }

  // Modal Novo Item
  isNewItemModalOpen = false
  isSubmittingItem = false
  newItemModalError = ''
  newItemForm = {
    name: '',
    category: '',
    code: '',
    location: '',
    description: '',
  }

  contextEyebrow = 'Gestão Centralizada'

  get canManageCatalog(): boolean {
    return this.authService.hasAnyRole(['admin', 'master'])
  }

  constructor(
    private readonly http: HttpClient,
    public readonly authService: AuthService,
    private readonly route: ActivatedRoute,
  ) {
    const path = this.route.snapshot.routeConfig?.path || ''
    if (path.includes('desenvolvedor')) {
      this.contextEyebrow = 'Desenvolvedor · Master'
    } else if (path.includes('professor')) {
      this.contextEyebrow = 'Portal do Professor · Reserva de Recursos'
    } else {
      this.contextEyebrow = 'Administração · Gestão de Recursos'
    }
  }

  ngOnInit(): void {
    this.loadAllData()
  }

  loadAllData(): void {
    this.isLoading = true
    this.globalError = ''
    this.loadStats()
    this.loadItems()
    this.loadReservations()
  }

  loadStats(): void {
    this.http.get<ReservationStats>('/api/reservations/stats').subscribe({
      next: (res) => { this.stats = res },
      error: () => {},
    })
  }

  loadItems(): void {
    this.http.get<ReservableItem[]>('/api/reservations/items').subscribe({
      next: (items) => {
        this.items = items
        this.extractCategories()
        this.applyFilter()
        this.isLoading = false
      },
      error: (err) => {
        this.globalError = err.error?.message || 'Erro ao carregar itens para reserva.'
        this.isLoading = false
      },
    })
  }

  loadReservations(): void {
    this.http.get<ItemReservation[]>('/api/reservations').subscribe({
      next: (res) => { this.reservations = res },
      error: () => {},
    })
  }

  extractCategories(): void {
    const cats = new Set(this.items.map((i) => i.category))
    this.categories = Array.from(cats).sort()
  }

  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase()
    this.filteredItems = this.items.filter((item) => {
      const matchSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.code.toLowerCase().includes(term) ||
        item.location.toLowerCase().includes(term)

      const matchCat = this.selectedCategory === 'ALL' || item.category === this.selectedCategory
      const matchStatus = this.selectedStatus === 'ALL' || item.status === this.selectedStatus

      return matchSearch && matchCat && matchStatus
    })
  }

  clearFilters(): void {
    this.searchTerm = ''
    this.selectedCategory = 'ALL'
    this.selectedStatus = 'ALL'
    this.applyFilter()
  }

  switchTab(tab: 'catalog' | 'reservations'): void {
    this.activeTab = tab
    if (tab === 'reservations') {
      this.loadReservations()
    }
  }

  get availableItemsForSelect(): ReservableItem[] {
    return this.items.filter((i) => i.status === 'AVAILABLE' || i.id === this.reservationForm.itemId)
  }

  openReserveModal(preselectedItem?: ReservableItem): void {
    const now = new Date()
    const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    const user = this.authService.currentUser
    let defaultDept = 'Administração'
    if (user?.role === 'professor') {
      defaultDept = 'Corpo Docente / Professores'
    } else if (user) {
      defaultDept = this.authService.roleLabel()
    }

    this.reservationForm = {
      itemId: preselectedItem?.id || (this.items.find((i) => i.status === 'AVAILABLE')?.id || ''),
      requesterName: user?.username || '',
      department: defaultDept,
      startDate: this.formatToDateTimeLocal(now),
      endDate: this.formatToDateTimeLocal(inTwoHours),
      purpose: '',
      notes: '',
    }

    this.modalError = ''
    this.isReserveModalOpen = true
  }

  closeReserveModal(): void {
    this.isReserveModalOpen = false
    this.modalError = ''
  }

  submitReservation(): void {
    if (!this.reservationForm.itemId) {
      this.modalError = 'Por favor, selecione um item para reservar.'
      return
    }

    if (!this.reservationForm.requesterName.trim() || !this.reservationForm.department.trim()) {
      this.modalError = 'Preencha o solicitante e o setor.'
      return
    }

    if (!this.reservationForm.startDate || !this.reservationForm.endDate) {
      this.modalError = 'Informe as datas de início e término.'
      return
    }

    if (new Date(this.reservationForm.startDate) >= new Date(this.reservationForm.endDate)) {
      this.modalError = 'A data de término deve ser posterior à data de início.'
      return
    }

    if (!this.reservationForm.purpose.trim()) {
      this.modalError = 'Informe a finalidade da reserva.'
      return
    }

    this.isSubmitting = true
    this.modalError = ''

    this.http.post<ItemReservation>('/api/reservations', this.reservationForm).subscribe({
      next: () => {
        this.isSubmitting = false
        this.closeReserveModal()
        this.globalSuccess = 'Reserva realizada com sucesso!'
        this.loadAllData()
      },
      error: (err) => {
        this.isSubmitting = false
        this.modalError = err.error?.message || 'Erro ao realizar reserva.'
      },
    })
  }

  completeReservation(res: ItemReservation): void {
    if (!confirm(`Deseja confirmar a devolução e conclusão da reserva do item "${res.item?.name}"?`)) {
      return
    }

    this.http.patch(`/api/reservations/${res.id}/complete`, {}).subscribe({
      next: () => {
        this.globalSuccess = 'Item devolvido e reserva concluída com sucesso!'
        this.loadAllData()
      },
      error: (err) => {
        this.globalError = err.error?.message || 'Erro ao concluir reserva.'
      },
    })
  }

  cancelReservation(res: ItemReservation): void {
    if (!confirm(`Deseja realmente cancelar a reserva do item "${res.item?.name}"?`)) {
      return
    }

    this.http.patch(`/api/reservations/${res.id}/cancel`, {}).subscribe({
      next: () => {
        this.globalSuccess = 'Reserva cancelada com sucesso.'
        this.loadAllData()
      },
      error: (err) => {
        this.globalError = err.error?.message || 'Erro ao cancelar reserva.'
      },
    })
  }

  toggleMaintenance(item: ReservableItem): void {
    const newStatus: ItemStatus = item.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE'
    const confirmMsg =
      newStatus === 'MAINTENANCE'
        ? `Colocar "${item.name}" em manutenção? Ele ficará indisponível para reservas.`
        : `Liberar "${item.name}" da manutenção? Ele voltará a ficar disponível.`

    if (!confirm(confirmMsg)) return

    this.http.patch(`/api/reservations/items/${item.id}/status`, { status: newStatus }).subscribe({
      next: () => {
        this.globalSuccess = `Status do item "${item.name}" atualizado para ${this.formatStatus(newStatus)}.`
        this.loadAllData()
      },
      error: (err) => {
        this.globalError = err.error?.message || 'Erro ao atualizar status do item.'
      },
    })
  }

  openNewItemModal(): void {
    this.newItemForm = {
      name: '',
      category: 'Audiovisual',
      code: '',
      location: '',
      description: '',
    }
    this.newItemModalError = ''
    this.isNewItemModalOpen = true
  }

  closeNewItemModal(): void {
    this.isNewItemModalOpen = false
    this.newItemModalError = ''
  }

  submitNewItem(): void {
    if (
      !this.newItemForm.name.trim() ||
      !this.newItemForm.category.trim() ||
      !this.newItemForm.code.trim() ||
      !this.newItemForm.location.trim()
    ) {
      this.newItemModalError = 'Preencha todos os campos obrigatórios.'
      return
    }

    this.isSubmittingItem = true
    this.newItemModalError = ''

    this.http.post('/api/reservations/items', this.newItemForm).subscribe({
      next: () => {
        this.isSubmittingItem = false
        this.closeNewItemModal()
        this.globalSuccess = `Item "${this.newItemForm.name}" cadastrado com sucesso no acervo!`
        this.loadAllData()
      },
      error: (err) => {
        this.isSubmittingItem = false
        this.newItemModalError = err.error?.message || 'Erro ao cadastrar novo item.'
      },
    })
  }

  formatStatus(status: ItemStatus): string {
    switch (status) {
      case 'AVAILABLE': return 'Disponível'
      case 'RESERVED': return 'Reservado'
      case 'MAINTENANCE': return 'Em Manutenção'
      default: return status
    }
  }

  formatReservationStatus(status: ReservationStatus): string {
    switch (status) {
      case 'ACTIVE': return 'Ativa'
      case 'COMPLETED': return 'Concluída'
      case 'CANCELLED': return 'Cancelada'
      default: return status
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  private formatToDateTimeLocal(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0')
    const yyyy = date.getFullYear()
    const mm = pad(date.getMonth() + 1)
    const dd = pad(date.getDate())
    const hh = pad(date.getHours())
    const min = pad(date.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  }
}
