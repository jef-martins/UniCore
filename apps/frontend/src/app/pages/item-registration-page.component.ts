import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import { AuthService } from '../services/auth.service'

export type ItemStatus = 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE'

export type ItemCondition =
  | 'PERFEITO'
  | 'COM_AVARIAS'
  | 'DEFEITO_FUNCIONA'
  | 'DEFEITO_PARCIAL'
  | 'NAO_FUNCIONA'

export type MaintenanceType = 'PREVENTIVA' | 'CORRETIVA'
export type MaintenanceStatus = 'AGENDADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'

export interface ItemMaintenance {
  id: string
  itemId: string
  type: MaintenanceType
  status: MaintenanceStatus
  title: string
  description?: string | null
  technician?: string | null
  scheduledDate: string
  completedDate?: string | null
  cost?: number | null
  notes?: string | null
  createdAt: string
  item?: {
    id: string
    name: string
    code: string
    location: string
    status: ItemStatus
  }
}

export interface ReservableItem {
  id: string
  name: string
  category: string
  code: string
  location: string
  description?: string | null
  status: ItemStatus
  condition: ItemCondition
  createdAt: string
  updatedAt: string
  currentReservation?: {
    id: string
    requesterName: string
    endDate: string
  } | null
  latestMaintenance?: ItemMaintenance | null
  consolidatedStatus?: string
  statusCounts?: Record<string, number>
  averageRating?: number | null
  totalEvaluations?: number
}

export interface ReservationStats {
  totalItems: number
  availableItems: number
  reservedItems: number
  maintenanceItems: number
  activeReservations: number
}

@Component({
  selector: 'app-item-registration-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="registration-page" aria-labelledby="page-title">
      <!-- Cabeçalho Principal -->
      <header class="page-header-container">
        <div class="header-info">
          <p class="hero-eyebrow">{{ contextEyebrow }}</p>
          <h1 id="page-title" class="page-title">Cadastro de Itens de Reserva</h1>
          <p class="page-subtitle">
            Cadastre, edite e acompanhe as condições de conservação e localização do acervo institucional de recursos e espaços.
          </p>
        </div>
        <div class="header-actions">
          <button class="button button-primary" type="button" (click)="openCreateModal()">
            <span aria-hidden="true">＋</span> Novo Item
          </button>
          <a class="button button-secondary" [routerLink]="reservationRoute">
            <span aria-hidden="true">📅</span> Ir para Reservas
          </a>
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

      <!-- Cards de Métricas / Indicadores -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Total Cadastrado</span>
          <span class="stat-value">{{ items.length }}</span>
          <span class="stat-hint">Itens no patrimônio</span>
        </div>
        <div class="stat-card stat-available">
          <span class="stat-label">Disponíveis</span>
          <span class="stat-value text-green">{{ countAvailable }}</span>
          <span class="stat-hint">Prontos para empréstimo</span>
        </div>
        <div class="stat-card stat-maintenance">
          <span class="stat-label">Em Manutenção</span>
          <span class="stat-value text-amber">{{ countMaintenance }}</span>
          <span class="stat-hint">Bloqueados temporariamente</span>
        </div>
        <div class="stat-card stat-attention">
          <span class="stat-label">Atenção / Defeito</span>
          <span class="stat-value text-orange">{{ countWithIssues }}</span>
          <span class="stat-hint">Com avaria ou defeito</span>
        </div>
      </div>

      <!-- Barra de Filtros e Busca -->
      <div class="filter-panel card card-outlined">
        <div class="filter-row">
          <div class="filter-group search-group">
            <label for="search-input" class="filter-label">Buscar Recurso:</label>
            <input
              id="search-input"
              type="text"
              class="field-control search-input"
              placeholder="Buscar por nome, código de patrimônio ou localização..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="applyFilters()"
            />
          </div>

          <div class="filter-group">
            <label for="filter-category" class="filter-label">Categoria:</label>
            <select
              id="filter-category"
              class="field-control filter-select"
              [(ngModel)]="selectedCategory"
              (ngModelChange)="applyFilters()"
            >
              <option value="ALL">Todas as Categorias</option>
              @for (cat of categories; track cat) {
                <option [value]="cat">{{ cat }}</option>
              }
            </select>
          </div>

          <div class="filter-group">
            <label for="filter-condition" class="filter-label">Estado / Condição:</label>
            <select
              id="filter-condition"
              class="field-control filter-select"
              [(ngModel)]="selectedCondition"
              (ngModelChange)="applyFilters()"
            >
              <option value="ALL">Todas as Condições</option>
              <option value="PERFEITO">Perfeito</option>
              <option value="COM_AVARIAS">Com avarias</option>
              <option value="DEFEITO_FUNCIONA">Com defeito mas funciona</option>
              <option value="DEFEITO_PARCIAL">Com defeito e não funciona direito</option>
              <option value="NAO_FUNCIONA">Não funciona</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="filter-status" class="filter-label">Status Operacional:</label>
            <select
              id="filter-status"
              class="field-control filter-select"
              [(ngModel)]="selectedStatus"
              (ngModelChange)="applyFilters()"
            >
              <option value="ALL">Todos os Status</option>
              <option value="AVAILABLE">Disponível</option>
              <option value="RESERVED">Reservado</option>
              <option value="MAINTENANCE">Em Manutenção</option>
            </select>
          </div>

          <div class="filter-actions">
            <button class="button button-text btn-sm" type="button" (click)="clearFilters()">
              Limpar Filtros
            </button>
            <button class="button button-secondary btn-sm" type="button" (click)="loadItems()">
              ↻ Atualizar
            </button>
          </div>
        </div>
      </div>

      <!-- Tabela Gerencial de Itens -->
      <div class="table-container card card-outlined">
        <div class="table-header-info">
          <h2 class="table-title">Acervo de Recursos ({{ filteredItems.length }})</h2>
          <span class="text-muted text-sm">Exibindo itens correspondentes aos critérios de busca</span>
        </div>

        @if (isLoading) {
          <div class="loading-state">
            <p>Carregando itens do acervo...</p>
          </div>
        } @else {
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Patrimônio</th>
                  <th>Equipamento / Recurso</th>
                  <th>Categoria</th>
                  <th>Localização Padrão</th>
                  <th>Estado do Item</th>
                  <th>Status</th>
                  <th class="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredItems; track item.id) {
                  <tr>
                    <!-- Código de Patrimônio -->
                    <td>
                      <span class="patrimony-badge">{{ item.code }}</span>
                    </td>

                    <!-- Nome e Descrição -->
                    <td>
                      <div class="item-main-name">{{ item.name }}</div>
                      @if (item.description) {
                        <div class="item-sub-desc text-muted" [title]="item.description">
                          {{ item.description }}
                        </div>
                      }
                      @if (item.currentReservation) {
                        <div class="item-reservation-hint">
                          <small>Em uso por: <strong>{{ item.currentReservation.requesterName }}</strong></small>
                        </div>
                      }
                    </td>

                    <!-- Categoria -->
                    <td>
                      <span class="category-chip">{{ item.category }}</span>
                    </td>

                    <!-- Localização -->
                    <td>
                      <span class="location-text">📍 {{ item.location }}</span>
                    </td>

                    <!-- Estado do Item / Condição Física -->
                    <td>
                      <span class="condition-badge" [ngClass]="getConditionClass(item.condition)">
                        {{ formatCondition(item.condition) }}
                      </span>
                    </td>

                    <!-- Status Operacional -->
                    <td>
                      <div class="status-cell-wrapper">
                        <span class="status-badge" [class.badge-available]="item.status === 'AVAILABLE'"
                                                   [class.badge-reserved]="item.status === 'RESERVED'"
                                                   [class.badge-maintenance]="item.status === 'MAINTENANCE'">
                          {{ formatStatus(item.status) }}
                        </span>
                        @if (item.latestMaintenance && (item.latestMaintenance.status === 'AGENDADA' || item.latestMaintenance.status === 'EM_ANDAMENTO')) {
                          <span class="maint-tag-pill" [class.tag-corretiva]="item.latestMaintenance.type === 'CORRETIVA'" [title]="item.latestMaintenance.title">
                            {{ item.latestMaintenance.type === 'CORRETIVA' ? '🔧 Corretiva' : '🛡️ Preventiva' }}
                          </span>
                        }
                        @if (item.totalEvaluations && item.totalEvaluations > 0) {
                          <span class="rating-mini-tag" title="Avaliação consolidada dos alunos">
                            ★ {{ item.averageRating || '0' }} ({{ item.totalEvaluations }})
                          </span>
                        }
                      </div>
                    </td>

                    <!-- Ações -->
                    <td class="text-right">
                      <div class="action-buttons-cell">
                        <!-- Botão Reservar -->
                        <button
                          class="button button-primary btn-xs"
                          type="button"
                          [title]="item.status === 'AVAILABLE' ? 'Efetuar reserva deste item' : 'Item indisponível para reserva'"
                          [disabled]="item.status !== 'AVAILABLE'"
                          (click)="goToReserveItem(item)"
                        >
                          Reservar
                        </button>

                        <!-- Botão Editar -->
                        <button
                          class="button button-secondary btn-xs"
                          type="button"
                          title="Editar dados do item"
                          (click)="openEditModal(item)"
                        >
                          Editar
                        </button>

                        <!-- Botão Manutenção (Preventiva e Corretiva) -->
                        <button
                          class="button button-secondary btn-xs btn-maint-trigger"
                          type="button"
                          title="Cadastrar e gerenciar manutenções preventivas e corretivas"
                          (click)="openMaintenanceModal(item)"
                        >
                          🛠️ Manutenção
                        </button>

                        <!-- Botão Excluir -->
                        <button
                          class="button button-danger btn-xs"
                          type="button"
                          title="Excluir item do catálogo"
                          (click)="deleteItem(item)"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="empty-cell text-center">
                      <p>Nenhum item encontrado com os filtros aplicados.</p>
                      <button class="button button-secondary btn-sm" type="button" (click)="clearFilters()">
                        Limpar Filtros
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- MODAL DE CADASTRO / EDIÇÃO DE ITEM -->
      @if (isFormModalOpen) {
        <div class="modal-backdrop" (click)="closeFormModal()">
          <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ isEditing ? 'Editar Item de Reserva' : 'Cadastrar Novo Item de Reserva' }}</h2>
              <button class="btn-close" type="button" (click)="closeFormModal()" aria-label="Fechar">✕</button>
            </div>

            @if (modalError) {
              <div class="feedback-alert feedback-error" role="alert">
                <span>⚠ {{ modalError }}</span>
              </div>
            }

            <form (ngSubmit)="saveItem()">
              <div class="modal-body">
                <!-- Nome do Equipamento -->
                <div class="field">
                  <label class="field-label" for="form-name">Nome do Equipamento / Recurso *</label>
                  <input
                    id="form-name"
                    class="field-control"
                    type="text"
                    [(ngModel)]="formData.name"
                    name="name"
                    required
                    placeholder="Ex: Projetor Epson PowerLite X49, Notebook Dell i7..."
                  />
                </div>

                <div class="field-row">
                  <!-- Categoria -->
                  <div class="field">
                    <label class="field-label" for="form-category">Categoria *</label>
                    <input
                      id="form-category"
                      class="field-control"
                      type="text"
                      list="categories-datalist"
                      [(ngModel)]="formData.category"
                      name="category"
                      required
                      placeholder="Selecione ou digite..."
                    />
                    <datalist id="categories-datalist">
                      <option value="Audiovisual"></option>
                      <option value="Informática"></option>
                      <option value="Salas e Espaços"></option>
                      <option value="Acessórios e Cabos"></option>
                      <option value="Laboratório"></option>
                    </datalist>

                    <!-- Atalhos rápidos de categoria -->
                    <div class="quick-chips">
                      <button type="button" class="chip" (click)="formData.category = 'Audiovisual'">Audiovisual</button>
                      <button type="button" class="chip" (click)="formData.category = 'Informática'">Informática</button>
                      <button type="button" class="chip" (click)="formData.category = 'Salas e Espaços'">Salas</button>
                      <button type="button" class="chip" (click)="formData.category = 'Acessórios e Cabos'">Cabos</button>
                    </div>
                  </div>

                  <!-- Código de Patrimônio -->
                  <div class="field">
                    <label class="field-label" for="form-code">Código de Patrimônio / Tombo *</label>
                    <input
                      id="form-code"
                      class="field-control uppercase-input"
                      type="text"
                      [(ngModel)]="formData.code"
                      name="code"
                      required
                      placeholder="Ex: PAT-00501"
                      (input)="onCodeInput($event)"
                    />
                  </div>
                </div>

                <div class="field-row">
                  <!-- Localização Padrão -->
                  <div class="field">
                    <label class="field-label" for="form-location">Localização Física Padrão *</label>
                    <input
                      id="form-location"
                      class="field-control"
                      type="text"
                      [(ngModel)]="formData.location"
                      name="location"
                      required
                      placeholder="Ex: Almoxarifado Bloco A, Sala 102 TI..."
                    />
                  </div>

                  <!-- Estado do Item / Condição Física -->
                  <div class="field">
                    <label class="field-label" for="form-condition">Estado do Item (Conservação) *</label>
                    <select
                      id="form-condition"
                      class="field-control"
                      [(ngModel)]="formData.condition"
                      name="condition"
                      required
                    >
                      <option value="PERFEITO">Perfeito</option>
                      <option value="COM_AVARIAS">Com avarias</option>
                      <option value="DEFEITO_FUNCIONA">Com defeito mas funciona</option>
                      <option value="DEFEITO_PARCIAL">Com defeito e não funciona direito</option>
                      <option value="NAO_FUNCIONA">Não funciona</option>
                    </select>
                  </div>
                </div>

                @if (isEditing) {
                  <div class="field">
                    <label class="field-label" for="form-status">Status Operacional</label>
                    <select
                      id="form-status"
                      class="field-control"
                      [(ngModel)]="formData.status"
                      name="status"
                    >
                      <option value="AVAILABLE">Disponível</option>
                      <option value="MAINTENANCE">Em Manutenção</option>
                      @if (formData.status === 'RESERVED') {
                        <option value="RESERVED" disabled>Reservado (atualmente em empréstimo)</option>
                      }
                    </select>
                  </div>
                }

                <!-- Descrição e Itens Inclusos -->
                <div class="field">
                  <label class="field-label" for="form-description">Descrição e Acessórios Inclusos</label>
                  <textarea
                    id="form-description"
                    class="field-control"
                    rows="3"
                    [(ngModel)]="formData.description"
                    name="description"
                    placeholder="Ex: Acompanha fonte original, cabo HDMI 5m, controle e maleta de transporte."
                  ></textarea>
                </div>
              </div>

              <div class="modal-footer">
                <button class="button button-text" type="button" (click)="closeFormModal()">
                  Cancelar
                </button>
                <button class="button button-primary" type="submit" [disabled]="isSubmitting">
                  {{ isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar Item' : 'Cadastrar Item') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL DE GESTÃO DE MANUTENÇÃO (PREVENTIVA E CORRETIVA) -->
      @if (isMaintenanceModalOpen && selectedItemForMaintenance) {
        <div class="modal-backdrop" (click)="closeMaintenanceModal()">
          <div class="modal-dialog modal-dialog-lg card card-elevated" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2 class="modal-title">Gestão de Manutenção</h2>
                <span class="modal-subtitle">
                  {{ selectedItemForMaintenance.name }} &bull; Código: <strong>{{ selectedItemForMaintenance.code }}</strong>
                  &bull; Local: {{ selectedItemForMaintenance.location }}
                </span>
              </div>
              <button class="btn-close" type="button" (click)="closeMaintenanceModal()" aria-label="Fechar">✕</button>
            </div>

            @if (maintenanceError) {
              <div class="feedback-alert feedback-error" role="alert">
                <span>⚠ {{ maintenanceError }}</span>
              </div>
            }

            <div class="modal-body modal-scrollable">
              <!-- Formulário de Nova Manutenção -->
              <div class="card card-outlined maintenance-form-box">
                <h3 class="box-title">Registrar Nova Manutenção</h3>

                <form (ngSubmit)="saveMaintenance()">
                  <!-- Tipo de Manutenção: Preventiva ou Corretiva -->
                  <div class="field">
                    <label class="field-label">Tipo de Manutenção *</label>
                    <div class="type-segmented-control">
                      <button
                        type="button"
                        class="segmented-btn"
                        [class.active]="maintenanceForm.type === 'CORRETIVA'"
                        (click)="maintenanceForm.type = 'CORRETIVA'; maintenanceForm.markItemInMaintenance = true"
                      >
                        <span>🔧 Manutenção Corretiva</span>
                        <small>Para reparo de defeitos, avarias ou quebras identificadas</small>
                      </button>

                      <button
                        type="button"
                        class="segmented-btn"
                        [class.active]="maintenanceForm.type === 'PREVENTIVA'"
                        (click)="maintenanceForm.type = 'PREVENTIVA'"
                      >
                        <span>🛡️ Manutenção Preventiva</span>
                        <small>Revisão periódica, calibração, troca preventiva de peças</small>
                      </button>
                    </div>
                  </div>

                  <!-- Título / Motivo -->
                  <div class="field">
                    <label class="field-label" for="maint-title">Título / Motivo da Manutenção *</label>
                    <input
                      id="maint-title"
                      class="field-control"
                      type="text"
                      [(ngModel)]="maintenanceForm.title"
                      name="maintTitle"
                      required
                      placeholder="Ex: Troca de lâmpada e limpeza do filtro, Reparo no conector..."
                    />
                  </div>

                  <div class="field-row">
                    <!-- Técnico / Responsável -->
                    <div class="field">
                      <label class="field-label" for="maint-tech">Técnico / Responsável</label>
                      <input
                        id="maint-tech"
                        class="field-control"
                        type="text"
                        [(ngModel)]="maintenanceForm.technician"
                        name="maintTech"
                        placeholder="Ex: Suporte de TI Interno, Assistência Autorizada..."
                      />
                    </div>

                    <!-- Data Prevista -->
                    <div class="field">
                      <label class="field-label" for="maint-date">Data Prevista / Agendada *</label>
                      <input
                        id="maint-date"
                        class="field-control"
                        type="date"
                        [(ngModel)]="maintenanceForm.scheduledDate"
                        name="maintDate"
                        required
                      />
                    </div>
                  </div>

                  <div class="field-row">
                    <!-- Custo Estimado -->
                    <div class="field">
                      <label class="field-label" for="maint-cost">Custo Estimado (R$)</label>
                      <input
                        id="maint-cost"
                        class="field-control"
                        type="number"
                        step="0.01"
                        min="0"
                        [(ngModel)]="maintenanceForm.cost"
                        name="maintCost"
                        placeholder="0,00"
                      />
                    </div>

                    <!-- Colocar em manutenção agora -->
                    <div class="field field-checkbox-container">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [(ngModel)]="maintenanceForm.markItemInMaintenance"
                          name="markMaint"
                        />
                        <span>Colocar item em manutenção agora (bloqueia reservas)</span>
                      </label>
                    </div>
                  </div>

                  <!-- Descrição do Defeito / Serviço -->
                  <div class="field">
                    <label class="field-label" for="maint-desc">Descrição dos Serviços / Diagnóstico</label>
                    <textarea
                      id="maint-desc"
                      class="field-control"
                      rows="2"
                      [(ngModel)]="maintenanceForm.description"
                      name="maintDesc"
                      placeholder="Descreva o problema observado ou o plano preventivo..."
                    ></textarea>
                  </div>

                  <div class="form-actions-right">
                    <button
                      class="button button-primary btn-sm"
                      type="submit"
                      [disabled]="isSubmittingMaintenance"
                    >
                      {{ isSubmittingMaintenance ? 'Registrando...' : '＋ Registrar Manutenção' }}
                    </button>
                  </div>
                </form>
              </div>

              <!-- Histórico de Manutenções do Item -->
              <div class="maintenances-history-section">
                <h3 class="box-title">Histórico de Manutenções ({{ itemMaintenances.length }})</h3>

                @if (isLoadingMaintenances) {
                  <p class="text-muted text-sm">Carregando histórico...</p>
                } @else if (itemMaintenances.length === 0) {
                  <p class="text-muted text-sm">Nenhuma manutenção registrada para este item até o momento.</p>
                } @else {
                  <div class="maintenance-cards-list">
                    @for (m of itemMaintenances; track m.id) {
                      <div class="maint-card card card-outlined" [class.maint-corretiva]="m.type === 'CORRETIVA'">
                        <div class="maint-card-header">
                          <span class="maint-type-badge" [class.type-corretiva]="m.type === 'CORRETIVA'">
                            {{ m.type === 'CORRETIVA' ? '🔧 Corretiva' : '🛡️ Preventiva' }}
                          </span>
                          <span class="maint-status-badge" [ngClass]="getMaintenanceStatusClass(m.status)">
                            {{ formatMaintenanceStatus(m.status) }}
                          </span>
                          <span class="maint-date">
                            📅 Agendada: {{ formatDateOnly(m.scheduledDate) }}
                          </span>
                        </div>

                        <div class="maint-body">
                          <h4 class="maint-title">{{ m.title }}</h4>
                          @if (m.description) {
                            <p class="maint-desc">{{ m.description }}</p>
                          }
                          <div class="maint-meta">
                            @if (m.technician) {
                              <span>👤 Responsável: <strong>{{ m.technician }}</strong></span>
                            }
                            @if (m.cost !== null && m.cost !== undefined) {
                              <span>💰 Custo: <strong>R$ {{ m.cost }}</strong></span>
                            }
                            @if (m.completedDate) {
                              <span>✓ Concluída em: {{ formatDateOnly(m.completedDate) }}</span>
                            }
                          </div>
                        </div>

                        <!-- Ações rápidas de alteração de status -->
                        <div class="maint-actions">
                          @if (m.status === 'AGENDADA') {
                            <button
                              class="button button-secondary btn-xs"
                              type="button"
                              (click)="updateMaintenanceStatus(m, 'EM_ANDAMENTO')"
                            >
                              ▶ Iniciar Manutenção
                            </button>
                            <button
                              class="button button-danger btn-xs"
                              type="button"
                              (click)="updateMaintenanceStatus(m, 'CANCELADA')"
                            >
                              ✕ Cancelar
                            </button>
                          }
                          @if (m.status === 'EM_ANDAMENTO') {
                            <button
                              class="button button-primary btn-xs"
                              type="button"
                              (click)="updateMaintenanceStatus(m, 'CONCLUIDA')"
                            >
                              ✓ Concluir e Reativar Item
                            </button>
                            <button
                              class="button button-secondary btn-xs"
                              type="button"
                              (click)="updateMaintenanceStatus(m, 'CANCELADA')"
                            >
                              ✕ Cancelar
                            </button>
                          }
                          @if (m.status === 'CONCLUIDA') {
                            <span class="maint-done-pill">✓ Manutenção Finalizada</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <div class="modal-footer">
              <button class="button button-secondary" type="button" (click)="closeMaintenanceModal()">
                Fechar
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .registration-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-24, 24px);
      padding-bottom: var(--space-48, 48px);
    }

    .page-header-container {
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
    .text-orange { color: #FF9800 !important; }
    .text-muted { color: var(--color-text-secondary, #B9C3BC) !important; }
    .text-sm { font-size: var(--font-size-12, 12px); }

    /* Filter Panel */
    .filter-panel {
      padding: var(--space-16, 16px) var(--space-20, 20px);
      background: var(--color-surface, #181D1A);
      border-radius: var(--radius-12, 12px);
    }

    .filter-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--space-12, 12px);
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .search-group {
      flex: 1 1 260px;
    }

    .filter-label {
      font-size: var(--font-size-12, 12px);
      color: var(--color-text-secondary, #B9C3BC);
      font-weight: 500;
    }

    .filter-select {
      min-width: 170px;
    }

    .filter-actions {
      display: flex;
      gap: var(--space-8, 8px);
      align-items: center;
      margin-left: auto;
    }

    /* Table Container */
    .table-container {
      background: var(--color-surface, #181D1A);
      border-radius: var(--radius-12, 12px);
      overflow: hidden;
    }

    .table-header-info {
      padding: var(--space-16, 16px) var(--space-20, 20px);
      border-bottom: 1px solid var(--color-border, #58675C);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .table-title {
      font-size: var(--font-size-18, 18px);
      font-weight: 600;
      margin: 0;
      color: var(--color-text-primary, #F5F7F4);
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: var(--font-size-14, 14px);
    }

    .data-table th {
      padding: var(--space-12, 12px) var(--space-16, 16px);
      background: rgba(0, 0, 0, 0.25);
      border-bottom: 1px solid var(--color-border, #58675C);
      color: var(--color-text-secondary, #B9C3BC);
      font-weight: var(--font-weight-medium, 500);
      font-size: var(--font-size-12, 12px);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }

    .data-table td {
      padding: var(--space-12, 12px) var(--space-16, 16px);
      border-bottom: 1px solid rgba(88, 103, 92, 0.35);
      color: var(--color-text-primary, #F5F7F4);
      vertical-align: middle;
    }

    .data-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .patrimony-badge {
      font-family: monospace;
      font-size: 12px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--color-border, #58675C);
      padding: 3px 8px;
      border-radius: var(--radius-4, 4px);
      color: #E2E8F0;
      white-space: nowrap;
    }

    .item-main-name {
      font-weight: 600;
      color: var(--color-text-primary, #F5F7F4);
    }

    .item-sub-desc {
      font-size: 12px;
      margin-top: 2px;
      max-width: 320px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-reservation-hint {
      margin-top: 4px;
      color: #F5A623;
      font-size: 11px;
    }

    .category-chip {
      font-size: 12px;
      font-weight: 500;
      color: var(--color-action-green, #49D17D);
      background: rgba(73, 209, 125, 0.1);
      padding: 2px 8px;
      border-radius: var(--radius-4, 4px);
      white-space: nowrap;
    }

    .location-text {
      font-size: 12px;
      color: var(--color-text-secondary, #B9C3BC);
      white-space: nowrap;
    }

    /* Badges de Condição / Estado do Item */
    .condition-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: var(--radius-pill, 999px);
      white-space: nowrap;
      display: inline-block;
    }

    .condition-perfeito {
      background: rgba(73, 209, 125, 0.15);
      color: #49D17D;
      border: 1px solid rgba(73, 209, 125, 0.35);
    }

    .condition-avarias {
      background: rgba(147, 197, 253, 0.15);
      color: #93C5FD;
      border: 1px solid rgba(147, 197, 253, 0.35);
    }

    .condition-defeito-funciona {
      background: rgba(245, 166, 35, 0.15);
      color: #F5A623;
      border: 1px solid rgba(245, 166, 35, 0.35);
    }

    .condition-defeito-parcial {
      background: rgba(251, 146, 60, 0.15);
      color: #FB923C;
      border: 1px solid rgba(251, 146, 60, 0.35);
    }

    .condition-nao-funciona {
      background: rgba(255, 122, 122, 0.15);
      color: #FF7A7A;
      border: 1px solid rgba(255, 122, 122, 0.35);
    }

    /* Badges de Status Operacional */
    .status-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-pill, 999px);
      white-space: nowrap;
    }

    .badge-available {
      background: rgba(73, 209, 125, 0.12);
      color: #49D17D;
      border: 1px solid rgba(73, 209, 125, 0.25);
    }

    .badge-reserved {
      background: rgba(245, 166, 35, 0.12);
      color: #F5A623;
      border: 1px solid rgba(245, 166, 35, 0.25);
    }

    .badge-maintenance {
      background: rgba(255, 122, 122, 0.12);
      color: #FF7A7A;
      border: 1px solid rgba(255, 122, 122, 0.25);
    }

    .action-buttons-cell {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
      align-items: center;
    }

    .button-danger {
      background: transparent;
      border: 1px solid rgba(255, 122, 122, 0.4);
      color: #FF7A7A;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .button-danger:hover {
      background: rgba(255, 122, 122, 0.15);
      border-color: #FF7A7A;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      min-height: 36px;
    }

    .btn-xs {
      padding: 4px 8px;
      font-size: 11px;
      min-height: 28px;
      white-space: nowrap;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .empty-cell { padding: 3rem 1rem !important; }

    /* Quick Chips for Categories */
    .quick-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }

    .chip {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--color-border, #58675C);
      color: var(--color-text-secondary, #B9C3BC);
      border-radius: var(--radius-pill, 999px);
      padding: 2px 8px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .chip:hover {
      background: rgba(73, 209, 125, 0.15);
      border-color: var(--color-action-green, #49D17D);
      color: var(--color-action-green, #49D17D);
    }

    .uppercase-input {
      text-transform: uppercase;
      font-family: monospace;
      letter-spacing: 0.05em;
    }

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
      max-width: 600px;
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
      color: var(--color-text-primary, #F5F7F4);
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

    @media (max-width: 640px) {
      .field-row {
        grid-template-columns: 1fr;
      }
      .filter-row {
        flex-direction: column;
        align-items: stretch;
      }
      .filter-select {
        width: 100%;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Maintenance Modal & Badges Styles */
    .modal-dialog-lg {
      max-width: 760px;
    }
    .modal-scrollable {
      max-height: 75vh;
      overflow-y: auto;
    }
    .maintenance-form-box {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--color-border, #58675C);
      border-radius: var(--radius-12, 12px);
      padding: var(--space-16, 16px);
      margin-bottom: var(--space-20, 20px);
    }
    .box-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-text-primary, #F5F7F4);
      margin: 0 0 14px;
    }
    .type-segmented-control {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 4px;
    }
    .segmented-btn {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 14px;
      border: 1px solid var(--color-border, #58675C);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.03);
      color: var(--color-text-primary, #F5F7F4);
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
    }
    .segmented-btn small {
      font-size: 11px;
      font-weight: 400;
      color: var(--color-text-secondary, #B9C3BC);
    }
    .segmented-btn.active {
      border-color: var(--color-action-green, #49D17D);
      background: rgba(73, 209, 125, 0.12);
    }
    .field-checkbox-container {
      display: flex;
      align-items: flex-end;
      padding-bottom: 8px;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--color-text-primary, #F5F7F4);
      cursor: pointer;
    }
    .form-actions-right {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }
    .maintenance-cards-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .maint-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--color-border, #58675C);
      border-radius: 8px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .maint-card.maint-corretiva {
      border-left: 3px solid #F5A623;
    }
    .maint-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 12px;
    }
    .maint-type-badge {
      font-weight: 700;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(77, 163, 255, 0.15);
      color: #99CCFF;
    }
    .maint-type-badge.type-corretiva {
      background: rgba(245, 166, 35, 0.15);
      color: #FFD580;
    }
    .maint-status-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
    }
    .status-badge-scheduled { background: rgba(255, 255, 255, 0.1); color: #DDD; }
    .status-badge-ongoing { background: rgba(77, 163, 255, 0.2); color: #99CCFF; }
    .status-badge-done { background: rgba(73, 209, 125, 0.2); color: #A3F5C3; }
    .status-badge-cancelled { background: rgba(255, 122, 122, 0.2); color: #FFB3B3; }
    .maint-date {
      margin-left: auto;
      color: var(--color-text-secondary, #B9C3BC);
    }
    .maint-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-primary, #F5F7F4);
      margin: 0;
    }
    .maint-desc {
      font-size: 12px;
      color: var(--color-text-secondary, #B9C3BC);
      margin: 2px 0 0;
    }
    .maint-meta {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      font-size: 11px;
      color: var(--color-text-secondary, #B9C3BC);
      margin-top: 4px;
    }
    .maint-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 4px;
    }
    .maint-done-pill {
      font-size: 11px;
      color: var(--color-action-green, #49D17D);
      font-weight: 600;
    }
    .status-cell-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .maint-tag-pill {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(77, 163, 255, 0.15);
      color: #99CCFF;
      width: fit-content;
    }
    .maint-tag-pill.tag-corretiva {
      background: rgba(245, 166, 35, 0.15);
      color: #FFD580;
    }
    .rating-mini-tag {
      font-size: 11px;
      color: #F5A623;
      font-weight: 600;
    }
  `]
})
export class ItemRegistrationPageComponent implements OnInit {
  items: ReservableItem[] = []
  filteredItems: ReservableItem[] = []
  categories: string[] = []

  searchTerm = ''
  selectedCategory = 'ALL'
  selectedCondition = 'ALL'
  selectedStatus = 'ALL'

  isLoading = false
  globalSuccess = ''
  globalError = ''

  // Modal State
  isFormModalOpen = false
  isEditing = false
  isSubmitting = false
  modalError = ''
  editingItemId: string | null = null

  formData = {
    name: '',
    category: '',
    code: '',
    location: '',
    description: '',
    condition: 'PERFEITO' as ItemCondition,
    status: 'AVAILABLE' as ItemStatus,
  }

  contextEyebrow = 'Administração · Cadastros'
  reservationRoute = '/administracao/reservas'

  constructor(
    private readonly http: HttpClient,
    public readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    const path = this.route.snapshot.routeConfig?.path || ''
    if (path.includes('desenvolvedor')) {
      this.contextEyebrow = 'Desenvolvedor · Cadastros Técnicos'
      this.reservationRoute = '/desenvolvedor/reservas'
    } else {
      this.contextEyebrow = 'Administração · Cadastros Institucionais'
      this.reservationRoute = '/administracao/reservas'
    }
  }

  ngOnInit(): void {
    this.loadItems()
  }

  loadItems(): void {
    this.isLoading = true
    this.globalError = ''

    this.http.get<ReservableItem[]>('/api/reservations/items').subscribe({
      next: (data) => {
        this.items = data
        this.extractCategories()
        this.applyFilters()
        this.isLoading = false
      },
      error: (err) => {
        this.globalError = err.error?.message || 'Erro ao carregar acervo de itens.'
        this.isLoading = false
      },
    })
  }

  extractCategories(): void {
    const set = new Set(this.items.map((i) => i.category))
    this.categories = Array.from(set).sort()
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase()

    this.filteredItems = this.items.filter((item) => {
      const matchSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.code.toLowerCase().includes(term) ||
        item.location.toLowerCase().includes(term) ||
        (item.description && item.description.toLowerCase().includes(term))

      const matchCategory =
        this.selectedCategory === 'ALL' || item.category === this.selectedCategory

      const matchCondition =
        this.selectedCondition === 'ALL' || item.condition === this.selectedCondition

      const matchStatus =
        this.selectedStatus === 'ALL' || item.status === this.selectedStatus

      return matchSearch && matchCategory && matchCondition && matchStatus
    })
  }

  clearFilters(): void {
    this.searchTerm = ''
    this.selectedCategory = 'ALL'
    this.selectedCondition = 'ALL'
    this.selectedStatus = 'ALL'
    this.applyFilters()
  }

  get countAvailable(): number {
    return this.items.filter((i) => i.status === 'AVAILABLE').length
  }

  get countMaintenance(): number {
    return this.items.filter((i) => i.status === 'MAINTENANCE').length
  }

  get countWithIssues(): number {
    return this.items.filter((i) =>
      i.condition === 'COM_AVARIAS' ||
      i.condition === 'DEFEITO_FUNCIONA' ||
      i.condition === 'DEFEITO_PARCIAL' ||
      i.condition === 'NAO_FUNCIONA'
    ).length
  }

  openCreateModal(): void {
    this.isEditing = false
    this.editingItemId = null
    this.modalError = ''
    this.formData = {
      name: '',
      category: 'Audiovisual',
      code: '',
      location: '',
      description: '',
      condition: 'PERFEITO',
      status: 'AVAILABLE',
    }
    this.isFormModalOpen = true
  }

  openEditModal(item: ReservableItem): void {
    this.isEditing = true
    this.editingItemId = item.id
    this.modalError = ''
    this.formData = {
      name: item.name,
      category: item.category,
      code: item.code,
      location: item.location,
      description: item.description || '',
      condition: item.condition || 'PERFEITO',
      status: item.status,
    }
    this.isFormModalOpen = true
  }

  closeFormModal(): void {
    this.isFormModalOpen = false
    this.modalError = ''
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input) {
      this.formData.code = input.value.toUpperCase()
    }
  }

  saveItem(): void {
    if (
      !this.formData.name.trim() ||
      !this.formData.category.trim() ||
      !this.formData.code.trim() ||
      !this.formData.location.trim()
    ) {
      this.modalError = 'Preencha todos os campos obrigatórios (*).'
      return
    }

    this.isSubmitting = true
    this.modalError = ''

    if (this.isEditing && this.editingItemId) {
      // Atualização
      this.http.patch(`/api/reservations/items/${this.editingItemId}`, this.formData).subscribe({
        next: () => {
          this.isSubmitting = false
          this.closeFormModal()
          this.globalSuccess = `Item "${this.formData.name}" atualizado com sucesso!`
          this.loadItems()
        },
        error: (err) => {
          this.isSubmitting = false
          this.modalError = err.error?.message || 'Erro ao atualizar item.'
        },
      })
    } else {
      // Criação
      this.http.post('/api/reservations/items', this.formData).subscribe({
        next: () => {
          this.isSubmitting = false
          this.closeFormModal()
          this.globalSuccess = `Item "${this.formData.name}" cadastrado com sucesso!`
          this.loadItems()
        },
        error: (err) => {
          this.isSubmitting = false
          this.modalError = err.error?.message || 'Erro ao cadastrar novo item.'
        },
      })
    }
  }

  // Maintenance Modal State
  isMaintenanceModalOpen = false
  selectedItemForMaintenance: ReservableItem | null = null
  itemMaintenances: ItemMaintenance[] = []
  isLoadingMaintenances = false
  isSubmittingMaintenance = false
  maintenanceError = ''

  maintenanceForm: {
    type: MaintenanceType
    title: string
    description: string
    technician: string
    scheduledDate: string
    cost: number | null
    markItemInMaintenance: boolean
  } = {
    type: 'CORRETIVA',
    title: '',
    description: '',
    technician: '',
    scheduledDate: '',
    cost: null,
    markItemInMaintenance: true,
  }

  openMaintenanceModal(item: ReservableItem): void {
    this.selectedItemForMaintenance = item
    this.maintenanceError = ''
    const today = new Date().toISOString().split('T')[0]
    this.maintenanceForm = {
      type: item.condition === 'NAO_FUNCIONA' || item.condition === 'DEFEITO_PARCIAL' ? 'CORRETIVA' : 'PREVENTIVA',
      title: '',
      description: '',
      technician: '',
      scheduledDate: today,
      cost: null,
      markItemInMaintenance: true,
    }
    this.isMaintenanceModalOpen = true
    this.loadItemMaintenances(item.id)
  }

  closeMaintenanceModal(): void {
    this.isMaintenanceModalOpen = false
    this.selectedItemForMaintenance = null
    this.itemMaintenances = []
    this.maintenanceError = ''
  }

  loadItemMaintenances(itemId: string): void {
    this.isLoadingMaintenances = true
    this.http.get<ItemMaintenance[]>(`/api/reservations/items/${itemId}/maintenances`).subscribe({
      next: (data) => {
        this.itemMaintenances = data
        this.isLoadingMaintenances = false
      },
      error: (err) => {
        this.maintenanceError = err.error?.message || 'Erro ao carregar manutenções.'
        this.isLoadingMaintenances = false
      },
    })
  }

  saveMaintenance(): void {
    if (!this.selectedItemForMaintenance) return

    if (!this.maintenanceForm.title.trim()) {
      this.maintenanceError = 'Informe o título / motivo da manutenção.'
      return
    }

    if (!this.maintenanceForm.scheduledDate) {
      this.maintenanceError = 'Informe a data prevista da manutenção.'
      return
    }

    this.isSubmittingMaintenance = true
    this.maintenanceError = ''

    const payload = {
      type: this.maintenanceForm.type,
      title: this.maintenanceForm.title.trim(),
      description: this.maintenanceForm.description.trim() || undefined,
      technician: this.maintenanceForm.technician.trim() || undefined,
      scheduledDate: new Date(this.maintenanceForm.scheduledDate + 'T10:00:00Z').toISOString(),
      cost: this.maintenanceForm.cost !== null && this.maintenanceForm.cost !== undefined ? Number(this.maintenanceForm.cost) : undefined,
      markItemInMaintenance: this.maintenanceForm.markItemInMaintenance,
    }

    this.http.post<ItemMaintenance>(`/api/reservations/items/${this.selectedItemForMaintenance.id}/maintenances`, payload).subscribe({
      next: (created) => {
        this.isSubmittingMaintenance = false
        this.globalSuccess = `Manutenção ${created.type === 'CORRETIVA' ? 'corretiva' : 'preventiva'} registrada com sucesso!`
        this.loadItemMaintenances(this.selectedItemForMaintenance!.id)
        this.loadItems()
        this.maintenanceForm.title = ''
        this.maintenanceForm.description = ''
        this.maintenanceForm.cost = null
      },
      error: (err) => {
        this.isSubmittingMaintenance = false
        this.maintenanceError = err.error?.message || 'Erro ao salvar manutenção.'
      },
    })
  }

  updateMaintenanceStatus(m: ItemMaintenance, newStatus: MaintenanceStatus): void {
    if (!this.selectedItemForMaintenance) return

    const payload = {
      status: newStatus,
      completedDate: newStatus === 'CONCLUIDA' ? new Date().toISOString() : undefined,
      restoreItemToAvailable: newStatus === 'CONCLUIDA',
    }

    this.http.patch<ItemMaintenance>(`/api/reservations/maintenances/${m.id}`, payload).subscribe({
      next: () => {
        this.globalSuccess = `Status da manutenção atualizado para ${this.formatMaintenanceStatus(newStatus)}.`
        this.loadItemMaintenances(this.selectedItemForMaintenance!.id)
        this.loadItems()
      },
      error: (err) => {
        this.maintenanceError = err.error?.message || 'Erro ao atualizar manutenção.'
      },
    })
  }

  formatMaintenanceStatus(status: MaintenanceStatus): string {
    switch (status) {
      case 'AGENDADA': return 'Agendada'
      case 'EM_ANDAMENTO': return 'Em Andamento'
      case 'CONCLUIDA': return 'Concluída'
      case 'CANCELADA': return 'Cancelada'
      default: return status
    }
  }

  getMaintenanceStatusClass(status: MaintenanceStatus): string {
    switch (status) {
      case 'AGENDADA': return 'status-badge-scheduled'
      case 'EM_ANDAMENTO': return 'status-badge-ongoing'
      case 'CONCLUIDA': return 'status-badge-done'
      case 'CANCELADA': return 'status-badge-cancelled'
      default: return ''
    }
  }

  formatDateOnly(dateStr: string): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR')
  }

  toggleMaintenance(item: ReservableItem): void {
    const newStatus: ItemStatus = item.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE'
    const actionText = newStatus === 'MAINTENANCE' ? 'colocar em manutenção' : 'liberar da manutenção'

    if (!confirm(`Deseja realmente ${actionText} o item "${item.name}"?`)) return

    this.http.patch(`/api/reservations/items/${item.id}/status`, { status: newStatus }).subscribe({
      next: () => {
        this.globalSuccess = `Status do item "${item.name}" atualizado para ${this.formatStatus(newStatus)}.`
        this.loadItems()
      },
      error: (err) => {
        this.globalError = err.error?.message || 'Erro ao alterar status do item.'
      },
    })
  }

  deleteItem(item: ReservableItem): void {
    if (!confirm(`Tem certeza que deseja excluir o item "${item.name}" (${item.code}) do acervo? Esta ação não pode ser desfeita.`)) {
      return
    }

    this.http.delete(`/api/reservations/items/${item.id}`).subscribe({
      next: () => {
        this.globalSuccess = `Item "${item.name}" excluído com sucesso.`
        this.loadItems()
      },
      error: (err) => {
        this.globalError = err.error?.message || 'Não foi possível excluir o item.'
      },
    })
  }

  goToReserveItem(item: ReservableItem): void {
    void this.router.navigate([this.reservationRoute], {
      queryParams: { itemId: item.id },
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

  formatCondition(condition: ItemCondition): string {
    switch (condition) {
      case 'PERFEITO': return 'Perfeito'
      case 'COM_AVARIAS': return 'Com avarias'
      case 'DEFEITO_FUNCIONA': return 'Com defeito mas funciona'
      case 'DEFEITO_PARCIAL': return 'Com defeito e não funciona direito'
      case 'NAO_FUNCIONA': return 'Não funciona'
      default: return condition
    }
  }

  getConditionClass(condition: ItemCondition): string {
    switch (condition) {
      case 'PERFEITO': return 'condition-perfeito'
      case 'COM_AVARIAS': return 'condition-avarias'
      case 'DEFEITO_FUNCIONA': return 'condition-defeito-funciona'
      case 'DEFEITO_PARCIAL': return 'condition-defeito-parcial'
      case 'NAO_FUNCIONA': return 'condition-nao-funciona'
      default: return ''
    }
  }
}
