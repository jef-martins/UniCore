import { Component, OnInit, computed, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

export interface DetailedTask {
  id: string
  title: string
  description?: string | null
  date: string
  type: string
  typeLabel: string
  sector?: string | null
  completed: boolean
  isPriority: boolean
  isOverdue: boolean
  createdAt: string
  completedAt?: string | null
  hasBriefing: boolean
  attachmentName?: string | null
  hasEvidence: boolean
  completionAttachmentName?: string | null
  completionNotes?: string | null
  user?: { id?: string; username: string; role?: string } | null
  createdBy?: { id?: string; username: string; role?: string } | null
  isShared: boolean
}

export interface SectorStat {
  type: string
  label: string
  total: number
  completed: number
  pending: number
  overdue: number
  priority: number
  resolutionRate: number
}

export interface PriorityBreakdown {
  high: { total: number; completed: number; pending: number; rate: number }
  normal: { total: number; completed: number; pending: number; rate: number }
}

export interface UserRankStat {
  username: string
  role: string
  totalCreated?: number
  totalAssigned?: number
  completed: number
  rate?: number
}

export interface DashboardOverview {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
  priorityTasks: number
  priorityPendingTasks: number
  priorityResolvedTasks: number
  resolutionRate: number
  avgResolutionTimeHours: number
  tasksWithBriefing: number
  tasksWithEvidence: number
  sharedSectorTasks: number
}

export interface FullDashboardStats {
  totalCreated: number
  totalResolved: number
  byType: Record<string, { created: number; resolved: number }>
  overview: DashboardOverview
  bySector: SectorStat[]
  byPriority: PriorityBreakdown
  topCreators: UserRankStat[]
  topAssignees: UserRankStat[]
  tasks: DetailedTask[]
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-page">
      <!-- Top Header -->
      <header class="page-header">
        <div class="header-titles">
          <div class="header-eyebrow">
            <span class="eyebrow-icon">📊</span>
            <span>Inteligência Operacional & Gestão de Demandas</span>
          </div>
          <h1 class="page-title">Relatório de Agenda & Tarefas</h1>
          <p class="page-description">
            Quantificação consolidada, análise de produtividade, conformidade de SLA e tempos de resolução por setor.
          </p>
        </div>
        <div class="header-actions">
          <button
            class="button button-secondary refresh-btn"
            type="button"
            (click)="refresh()"
            [disabled]="isLoading"
          >
            {{ isLoading ? 'Atualizando...' : '🔄 Atualizar Dados' }}
          </button>
        </div>
      </header>

      @if (isLoading && !stats) {
        <div class="loading-container">
          <div class="spinner"></div>
          <p>Carregando quantificações e relatórios operacionais...</p>
        </div>
      } @else if (stats) {
        <div class="dashboard-content">
          
          <!-- 1. GRID PRINCIPAL DE KPIS EXECUTIVOS -->
          <section class="kpi-grid" aria-label="Indicadores principais">
            
            <!-- Total de Agendamentos -->
            <div class="kpi-card card card-elevated">
              <div class="kpi-header">
                <span class="kpi-label">Total de Demandas</span>
                <span class="kpi-icon icon-blue">📋</span>
              </div>
              <div class="kpi-value">{{ stats.overview.totalTasks }}</div>
              <div class="kpi-subtext">
                <span>{{ stats.overview.sharedSectorTasks }} coletivas do setor</span>
              </div>
            </div>

            <!-- Taxa Global de Resolução -->
            <div class="kpi-card card card-elevated">
              <div class="kpi-header">
                <span class="kpi-label">Taxa de Resolução</span>
                <span class="kpi-icon icon-green">🎯</span>
              </div>
              <div class="kpi-value value-green">{{ stats.overview.resolutionRate }}%</div>
              <div class="kpi-progress">
                <div class="progress-bar" [style.width.%]="stats.overview.resolutionRate"></div>
              </div>
              <div class="kpi-subtext">
                <span>{{ stats.overview.completedTasks }} de {{ stats.overview.totalTasks }} concluídas</span>
              </div>
            </div>

            <!-- Tarefas Pendentes -->
            <div class="kpi-card card card-elevated">
              <div class="kpi-header">
                <span class="kpi-label">Pendentes Ativas</span>
                <span class="kpi-icon icon-amber">⏳</span>
              </div>
              <div class="kpi-value value-amber">{{ stats.overview.pendingTasks }}</div>
              <div class="kpi-subtext">
                <span>Aguardando conclusão</span>
              </div>
            </div>

            <!-- Tarefas Atrasadas / SLA Estourado -->
            <div class="kpi-card card card-elevated" [class.kpi-alert]="stats.overview.overdueTasks > 0">
              <div class="kpi-header">
                <span class="kpi-label">Atrasadas (SLA Vencido)</span>
                <span class="kpi-icon icon-red">⚠️</span>
              </div>
              <div class="kpi-value value-red">{{ stats.overview.overdueTasks }}</div>
              <div class="kpi-subtext">
                @if (stats.overview.overdueTasks > 0) {
                  <span class="alert-text">Requer ação imediata</span>
                } @else {
                  <span class="ok-text">Nenhum prazo vencido</span>
                }
              </div>
            </div>

            <!-- Lead Time Médio -->
            <div class="kpi-card card card-elevated">
              <div class="kpi-header">
                <span class="kpi-label">Lead Time Médio</span>
                <span class="kpi-icon icon-purple">⚡</span>
              </div>
              <div class="kpi-value">{{ formatLeadTime(stats.overview.avgResolutionTimeHours) }}</div>
              <div class="kpi-subtext">
                <span>Tempo médio de entrega</span>
              </div>
            </div>

            <!-- Prioridades Críticas -->
            <div class="kpi-card card card-elevated">
              <div class="kpi-header">
                <span class="kpi-label">Alta Prioridade</span>
                <span class="kpi-icon icon-pink">🔥</span>
              </div>
              <div class="kpi-value value-pink">{{ stats.overview.priorityTasks }}</div>
              <div class="kpi-subtext">
                <span>{{ stats.overview.priorityPendingTasks }} pendentes · {{ stats.byPriority.high.rate }}% resolvidas</span>
              </div>
            </div>

          </section>

          <!-- 2. MINI-AUDITORIA DE CONFORMIDADE & ANEXOS -->
          <section class="card card-outlined audit-strip">
            <div class="audit-item">
              <span class="audit-icon">📎</span>
              <div class="audit-text">
                <strong>{{ stats.overview.tasksWithBriefing }} tarefas com briefing anexado</strong>
                <span class="audit-sub">({{ getPercentage(stats.overview.tasksWithBriefing, stats.overview.totalTasks) }}% do total)</span>
              </div>
            </div>
            <div class="audit-divider"></div>
            <div class="audit-item">
              <span class="audit-icon">✅</span>
              <div class="audit-text">
                <strong>{{ stats.overview.tasksWithEvidence }} tarefas com evidência de entrega</strong>
                <span class="audit-sub">({{ getPercentage(stats.overview.tasksWithEvidence, stats.overview.completedTasks) }}% das concluídas)</span>
              </div>
            </div>
            <div class="audit-divider"></div>
            <div class="audit-item">
              <span class="audit-icon">👥</span>
              <div class="audit-text">
                <strong>{{ stats.overview.sharedSectorTasks }} tarefas compartilhadas de setor</strong>
                <span class="audit-sub">Fila coletiva de departamento</span>
              </div>
            </div>
          </section>

          <!-- 3. PAINÉIS DE DESEMPENHO POR SETOR E RANKING DE USUÁRIOS -->
          <div class="analytics-row">
            
            <!-- Desempenho por Setor -->
            <section class="card card-outlined panel-section flex-2">
              <div class="panel-header">
                <div>
                  <h2 class="panel-title">Desempenho por Setor</h2>
                  <p class="panel-subtitle">Volume, índice de resolução e gargalos de cada departamento.</p>
                </div>
              </div>

              <div class="sector-bars-list">
                @for (sec of stats.bySector; track sec.type) {
                  <div class="sector-bar-item">
                    <div class="sector-bar-header">
                      <div class="sector-name-group">
                        <span class="sector-title">{{ sec.label }}</span>
                        @if (sec.overdue > 0) {
                          <span class="badge badge-danger-soft">{{ sec.overdue }} atrasadas</span>
                        }
                        @if (sec.priority > 0) {
                          <span class="badge badge-pink-soft">{{ sec.priority }} urgentes</span>
                        }
                      </div>
                      <div class="sector-meta">
                        <span class="sector-counts">{{ sec.completed }} / {{ sec.total }} concluintes</span>
                        <strong class="sector-rate">{{ sec.resolutionRate }}%</strong>
                      </div>
                    </div>

                    <div class="progress-track">
                      <div class="progress-fill" [style.width.%]="sec.resolutionRate"></div>
                    </div>
                  </div>
                }
              </div>
            </section>

            <!-- Produtividade & Prioridade -->
            <div class="panels-column flex-1">
              
              <!-- Top Responsáveis -->
              <section class="card card-outlined panel-section">
                <div class="panel-header">
                  <h3 class="panel-title-sm">Top Responsáveis (Entregas)</h3>
                </div>
                <div class="rank-list">
                  @for (usr of stats.topAssignees; track usr.username; let i = $index) {
                    <div class="rank-item">
                      <div class="rank-user">
                        <span class="rank-badge" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2">
                          {{ i + 1 }}º
                        </span>
                        <span class="rank-name">{{ usr.username }}</span>
                      </div>
                      <div class="rank-stat">
                        <span class="rank-count">{{ usr.completed }} / {{ usr.totalAssigned }}</span>
                        <span class="badge badge-success-soft">{{ usr.rate }}%</span>
                      </div>
                    </div>
                  } @empty {
                    <p class="empty-note">Nenhuma tarefa atribuída a usuários específicos.</p>
                  }
                </div>
              </section>

              <!-- Top Criadores -->
              <section class="card card-outlined panel-section">
                <div class="panel-header">
                  <h3 class="panel-title-sm">Top Demandantes (Criadores)</h3>
                </div>
                <div class="rank-list">
                  @for (usr of stats.topCreators; track usr.username; let i = $index) {
                    <div class="rank-item">
                      <div class="rank-user">
                        <span class="rank-badge plain">{{ i + 1 }}º</span>
                        <span class="rank-name">{{ usr.username }}</span>
                      </div>
                      <div class="rank-stat">
                        <span class="badge badge-blue-soft">{{ usr.totalCreated }} criadas</span>
                      </div>
                    </div>
                  }
                </div>
              </section>

            </div>

          </div>

          <!-- 4. TABELA INTELIGENTE COM FILTROS E BUSCA -->
          <section class="card card-outlined table-section">
            <div class="table-section-header">
              <div>
                <h2 class="panel-title">Detalhamento e Rastreabilidade de Tarefas</h2>
                <p class="panel-subtitle">Lista operacional com monitoramento de prazos, anexos e evidências.</p>
              </div>

              <div class="results-badge">
                {{ filteredTasks().length }} {{ filteredTasks().length === 1 ? 'tarefa listada' : 'tarefas listadas' }}
              </div>
            </div>

            <!-- Barra de Controles e Filtros -->
            <div class="filters-bar">
              
              <!-- Chips de Status -->
              <div class="filter-chips">
                <button
                  type="button"
                  class="chip-btn"
                  [class.active]="selectedStatus() === 'ALL'"
                  (click)="setStatusFilter('ALL')"
                >
                  Todas ({{ stats.overview.totalTasks }})
                </button>
                <button
                  type="button"
                  class="chip-btn chip-amber"
                  [class.active]="selectedStatus() === 'PENDING'"
                  (click)="setStatusFilter('PENDING')"
                >
                  Pendentes ({{ stats.overview.pendingTasks }})
                </button>
                <button
                  type="button"
                  class="chip-btn chip-red"
                  [class.active]="selectedStatus() === 'OVERDUE'"
                  (click)="setStatusFilter('OVERDUE')"
                >
                  ⚠️ Atrasadas ({{ stats.overview.overdueTasks }})
                </button>
                <button
                  type="button"
                  class="chip-btn chip-pink"
                  [class.active]="selectedStatus() === 'PRIORITY'"
                  (click)="setStatusFilter('PRIORITY')"
                >
                  🔥 Prioritárias ({{ stats.overview.priorityTasks }})
                </button>
                <button
                  type="button"
                  class="chip-btn chip-green"
                  [class.active]="selectedStatus() === 'COMPLETED'"
                  (click)="setStatusFilter('COMPLETED')"
                >
                  ✅ Concluídas ({{ stats.overview.completedTasks }})
                </button>
              </div>

              <!-- Filtro por Setor e Busca -->
              <div class="filter-inputs">
                <select
                  class="select-control"
                  [ngModel]="selectedSector()"
                  (ngModelChange)="onSectorChange($event)"
                  aria-label="Filtrar por setor"
                >
                  <option value="ALL">Todos os Setores</option>
                  @for (sec of stats.bySector; track sec.type) {
                    <option [value]="sec.type">{{ sec.label }}</option>
                  }
                </select>

                <div class="search-box">
                  <span class="search-icon" aria-hidden="true">🔍</span>
                  <input
                    type="text"
                    class="search-input"
                    placeholder="Buscar por título, criador ou responsável..."
                    [ngModel]="searchQuery()"
                    (ngModelChange)="onSearchInput($event)"
                  />
                  @if (searchQuery()) {
                    <button type="button" class="clear-search" (click)="clearSearch()">✕</button>
                  }
                </div>
              </div>

            </div>

            <!-- Tabela de Tarefas -->
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Prioridade & Demanda</th>
                    <th>Setor</th>
                    <th>Responsável</th>
                    <th>Criador</th>
                    <th>Data Agendada</th>
                    <th>Status & SLA</th>
                    <th>Evidências</th>
                  </tr>
                </thead>
                <tbody>
                  @for (task of filteredTasks(); track task.id) {
                    <tr [class.row-overdue]="task.isOverdue" [class.row-priority]="task.isPriority">
                      
                      <!-- Prioridade & Demanda -->
                      <td>
                        <div class="task-title-cell">
                          <div class="title-line">
                            @if (task.isPriority) {
                              <span class="priority-badge" title="Demanda de Alta Prioridade">🔥 Alta</span>
                            }
                            <strong>{{ task.title }}</strong>
                            @if (task.hasBriefing) {
                              <span class="attachment-pill" [title]="'Briefing anexado: ' + task.attachmentName">📎</span>
                            }
                          </div>
                          @if (task.description) {
                            <small class="task-desc">{{ task.description }}</small>
                          }
                        </div>
                      </td>

                      <!-- Setor -->
                      <td>
                        <span class="sector-tag">{{ task.typeLabel }}</span>
                      </td>

                      <!-- Responsável -->
                      <td>
                        @if (task.isShared) {
                          <span class="badge badge-blue-soft" title="Visível para todos do setor">👥 Fila do Setor</span>
                        } @else if (task.user) {
                          <span class="user-pill">{{ task.user.username }}</span>
                        } @else {
                          <span class="text-muted">-</span>
                        }
                      </td>

                      <!-- Criador -->
                      <td>
                        <span class="creator-name">{{ task.createdBy?.username || 'Sistema' }}</span>
                      </td>

                      <!-- Data Agendada -->
                      <td>
                        <span class="date-text">{{ task.date | date:'dd/MM/yyyy' }}</span>
                      </td>

                      <!-- Status & SLA -->
                      <td>
                        @if (task.completed) {
                          <div class="status-stack">
                            <span class="badge badge-success">Concluída</span>
                            <small class="completion-date">{{ task.completedAt | date:'dd/MM HH:mm' }}</small>
                          </div>
                        } @else if (task.isOverdue) {
                          <div class="status-stack">
                            <span class="badge badge-danger">⚠️ Atrasada</span>
                            <small class="overdue-warn">Prazo expirado</small>
                          </div>
                        } @else {
                          <span class="badge badge-warning">Pendente</span>
                        }
                      </td>

                      <!-- Evidências -->
                      <td>
                        @if (task.hasEvidence) {
                          <span class="evidence-pill" [title]="'Evidência: ' + task.completionAttachmentName">
                            📄 Anexada
                          </span>
                        } @else if (task.completionNotes) {
                          <span class="notes-pill" [title]="task.completionNotes">
                            📝 Nota
                          </span>
                        } @else {
                          <span class="text-muted">-</span>
                        }
                      </td>

                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="empty-row">
                        <div class="empty-state">
                          <span class="empty-icon">🔎</span>
                          <h4>Nenhuma tarefa corresponde aos filtros aplicados</h4>
                          <p>Tente alterar o status, limpar a busca ou selecionar outro setor.</p>
                          <button class="button button-secondary btn-sm" type="button" (click)="resetFilters()">
                            Redefinir Filtros
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

          </section>

        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-page {
      padding: 1.5rem 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.75rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .header-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-action-green, #49D17D);
      background: rgba(73, 209, 125, 0.1);
      border: 1px solid rgba(73, 209, 125, 0.25);
      padding: 2px 8px;
      border-radius: 999px;
      width: fit-content;
    }

    .page-title {
      font-size: 1.85rem;
      font-weight: 700;
      color: var(--color-text-primary, #F5F7F4);
      margin: 4px 0 2px;
    }

    .page-description {
      color: var(--color-text-secondary, #B9C3BC);
      font-size: 0.9rem;
      margin: 0;
      max-width: 720px;
    }

    .refresh-btn {
      font-size: 0.85rem;
      padding: 0.5rem 1rem;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .kpi-card {
      background: var(--color-surface, #181D1A);
      border: 1px solid var(--color-border, #2e3831);
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: all 0.2s ease;
    }

    .kpi-card:hover {
      border-color: rgba(73, 209, 125, 0.35);
      transform: translateY(-2px);
    }

    .kpi-card.kpi-alert {
      border-color: rgba(255, 122, 122, 0.45);
      background: linear-gradient(180deg, rgba(255, 122, 122, 0.05), var(--color-surface, #181D1A));
    }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .kpi-label {
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .kpi-icon {
      font-size: 1.15rem;
      padding: 4px 6px;
      border-radius: 6px;
    }

    .icon-blue { background: rgba(59, 130, 246, 0.15); }
    .icon-green { background: rgba(73, 209, 125, 0.15); }
    .icon-amber { background: rgba(245, 166, 35, 0.15); }
    .icon-red { background: rgba(255, 122, 122, 0.15); }
    .icon-purple { background: rgba(168, 85, 247, 0.15); }
    .icon-pink { background: rgba(236, 72, 153, 0.15); }

    .kpi-value {
      font-size: clamp(1.6rem, 2.5vw, 2.1rem);
      font-weight: 800;
      color: #fff;
      line-height: 1.1;
    }

    .value-green { color: #49D17D; }
    .value-amber { color: #F5A623; }
    .value-red { color: #FF7A7A; }
    .value-pink { color: #F472B6; }

    .kpi-progress {
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      overflow: hidden;
      margin: 4px 0;
    }

    .progress-bar {
      height: 100%;
      background: #49D17D;
      border-radius: 999px;
      transition: width 0.5s ease-out;
    }

    .kpi-subtext {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #8fa093);
    }

    .alert-text { color: #FF7A7A; font-weight: 600; }
    .ok-text { color: #49D17D; }

    /* Audit Strip */
    .audit-strip {
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0.85rem 1.5rem;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--color-border, #2e3831);
      border-radius: 10px;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .audit-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .audit-icon {
      font-size: 1.25rem;
    }

    .audit-text {
      display: flex;
      flex-direction: column;
      font-size: 0.82rem;
      color: var(--color-text-primary, #F5F7F4);
    }

    .audit-sub {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #8fa093);
    }

    .audit-divider {
      width: 1px;
      height: 28px;
      background: var(--color-border, #2e3831);
    }

    /* Analytics Row */
    .analytics-row {
      display: flex;
      gap: 1.25rem;
      margin-bottom: 1.75rem;
      flex-wrap: wrap;
    }

    .flex-2 { flex: 2 1 500px; }
    .flex-1 { flex: 1 1 340px; }

    .panels-column {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .panel-section {
      background: var(--color-surface, #181D1A);
      border: 1px solid var(--color-border, #2e3831);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
    }

    .panel-header {
      margin-bottom: 1rem;
    }

    .panel-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--color-text-primary, #F5F7F4);
      margin: 0 0 4px;
    }

    .panel-title-sm {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--color-text-primary, #F5F7F4);
      margin: 0;
    }

    .panel-subtitle {
      font-size: 0.8rem;
      color: var(--color-text-secondary, #B9C3BC);
      margin: 0;
    }

    /* Sector Bars */
    .sector-bars-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .sector-bar-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .sector-bar-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .sector-bar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    .sector-name-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sector-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--color-text-primary, #F5F7F4);
    }

    .sector-meta {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sector-counts {
      font-size: 0.78rem;
      color: var(--color-text-secondary, #8fa093);
    }

    .sector-rate {
      font-size: 0.85rem;
      color: #49D17D;
      min-width: 38px;
      text-align: right;
    }

    .progress-track {
      height: 6px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 999px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3B82F6, #49D17D);
      border-radius: 999px;
      transition: width 0.4s ease-out;
    }

    /* Rank List */
    .rank-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rank-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }

    .rank-user {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rank-badge {
      font-size: 0.75rem;
      font-weight: 700;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .rank-badge.gold { background: rgba(245, 166, 35, 0.25); color: #F5A623; border: 1px solid rgba(245, 166, 35, 0.5); }
    .rank-badge.silver { background: rgba(200, 200, 210, 0.2); color: #E2E8F0; border: 1px solid rgba(200, 200, 210, 0.4); }
    .rank-badge.bronze { background: rgba(180, 115, 60, 0.25); color: #D97706; border: 1px solid rgba(180, 115, 60, 0.4); }
    .rank-badge.plain { background: rgba(255, 255, 255, 0.08); color: #A1A1AA; }

    .rank-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-text-primary, #F5F7F4);
    }

    .rank-stat {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rank-count {
      font-size: 0.78rem;
      color: var(--color-text-secondary, #8fa093);
    }

    /* Table Section */
    .table-section {
      background: var(--color-surface, #181D1A);
      border: 1px solid var(--color-border, #2e3831);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
    }

    .table-section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 8px;
    }

    .results-badge {
      font-size: 0.78rem;
      color: var(--color-action-green, #49D17D);
      background: rgba(73, 209, 125, 0.1);
      border: 1px solid rgba(73, 209, 125, 0.3);
      padding: 3px 10px;
      border-radius: 999px;
      font-weight: 600;
    }

    /* Filters Bar */
    .filters-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }

    .filter-chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .chip-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--color-border, #2e3831);
      color: var(--color-text-secondary, #B9C3BC);
      padding: 5px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .chip-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    .chip-btn.active {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.4);
      color: #fff;
    }

    .chip-btn.chip-amber.active { background: rgba(245, 166, 35, 0.2); border-color: #F5A623; color: #F5A623; }
    .chip-btn.chip-red.active { background: rgba(255, 122, 122, 0.2); border-color: #FF7A7A; color: #FF7A7A; }
    .chip-btn.chip-pink.active { background: rgba(236, 72, 153, 0.2); border-color: #EC4899; color: #F472B6; }
    .chip-btn.chip-green.active { background: rgba(73, 209, 125, 0.2); border-color: #49D17D; color: #49D17D; }

    .filter-inputs {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }

    .select-control {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--color-border, #3f4a42);
      color: var(--color-text-primary, #F5F7F4);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.85rem;
    }

    .select-control:focus {
      outline: none;
      border-color: var(--color-action-green, #49D17D);
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      font-size: 0.85rem;
      color: var(--color-text-secondary, #B9C3BC);
      pointer-events: none;
    }

    .search-input {
      padding: 6px 26px 6px 28px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--color-border, #3f4a42);
      border-radius: 8px;
      color: var(--color-text-primary, #F5F7F4);
      font-size: 0.85rem;
      min-width: 220px;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--color-action-green, #49D17D);
      box-shadow: 0 0 0 2px rgba(73, 209, 125, 0.15);
    }

    .clear-search {
      position: absolute;
      right: 8px;
      background: transparent;
      border: none;
      color: var(--color-text-secondary, #B9C3BC);
      cursor: pointer;
      font-size: 0.8rem;
    }

    /* Table Styles */
    .table-responsive {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }

    .data-table th {
      padding: 10px 14px;
      background: rgba(0, 0, 0, 0.25);
      color: var(--color-text-secondary, #B9C3BC);
      font-weight: 600;
      border-bottom: 1px solid var(--color-border, #2e3831);
      white-space: nowrap;
    }

    .data-table td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      vertical-align: middle;
    }

    .data-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .row-overdue td {
      background: rgba(255, 122, 122, 0.02);
    }

    .task-title-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .title-line {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .task-desc {
      color: var(--color-text-secondary, #8fa093);
      font-size: 0.78rem;
      max-width: 360px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .priority-badge {
      font-size: 0.7rem;
      font-weight: 700;
      background: rgba(236, 72, 153, 0.15);
      color: #F472B6;
      border: 1px solid rgba(236, 72, 153, 0.35);
      padding: 1px 6px;
      border-radius: 4px;
    }

    .attachment-pill {
      font-size: 0.8rem;
      cursor: help;
    }

    .sector-tag {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-secondary, #B9C3BC);
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }

    .user-pill {
      font-size: 0.82rem;
      font-weight: 600;
      color: #60A5FA;
    }

    .creator-name {
      font-size: 0.82rem;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .date-text {
      font-size: 0.82rem;
      color: var(--color-text-secondary, #B9C3BC);
      white-space: nowrap;
    }

    .status-stack {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .completion-date, .overdue-warn {
      font-size: 0.72rem;
      color: var(--color-text-secondary, #8fa093);
    }

    .overdue-warn { color: #FF7A7A; font-weight: 600; }

    .evidence-pill {
      font-size: 0.75rem;
      font-weight: 600;
      color: #49D17D;
      background: rgba(73, 209, 125, 0.12);
      border: 1px solid rgba(73, 209, 125, 0.3);
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap;
      display: inline-block;
    }

    .notes-pill {
      font-size: 0.75rem;
      font-weight: 600;
      color: #60A5FA;
      background: rgba(96, 165, 250, 0.12);
      border: 1px solid rgba(96, 165, 250, 0.3);
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap;
      display: inline-block;
    }

    /* Badges */
    .badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap;
      display: inline-block;
    }

    .badge-success { background: rgba(73, 209, 125, 0.15); color: #49D17D; border: 1px solid rgba(73, 209, 125, 0.35); }
    .badge-warning { background: rgba(245, 166, 35, 0.15); color: #F5A623; border: 1px solid rgba(245, 166, 35, 0.35); }
    .badge-danger { background: rgba(255, 122, 122, 0.15); color: #FF7A7A; border: 1px solid rgba(255, 122, 122, 0.35); }

    .badge-success-soft { background: rgba(73, 209, 125, 0.1); color: #49D17D; }
    .badge-danger-soft { background: rgba(255, 122, 122, 0.12); color: #FF7A7A; font-size: 0.7rem; }
    .badge-pink-soft { background: rgba(236, 72, 153, 0.12); color: #F472B6; font-size: 0.7rem; }
    .badge-blue-soft { background: rgba(59, 130, 246, 0.12); color: #60A5FA; font-size: 0.72rem; }

    .text-muted { color: #58675C; font-size: 0.8rem; }

    /* Empty State */
    .empty-row {
      padding: 3rem 1rem !important;
      text-align: center;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .empty-icon { font-size: 2rem; opacity: 0.8; }
    .empty-state h4 { font-size: 1rem; color: #fff; margin: 0; }
    .empty-state p { font-size: 0.85rem; margin: 0 0 8px; }
    .empty-note { font-size: 0.82rem; color: #8fa093; text-align: center; padding: 1rem; }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 1rem;
      gap: 12px;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(73, 209, 125, 0.2);
      border-top-color: var(--color-action-green, #49D17D);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .button {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
    }

    .button-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--color-border, #3f4a42);
      color: var(--color-text-primary, #F5F7F4);
    }

    .button-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .btn-sm { padding: 4px 10px; font-size: 0.75rem; }

    @media (max-width: 768px) {
      .dashboard-page { padding: 1rem; }
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .audit-strip { flex-direction: column; align-items: flex-start; }
      .audit-divider { display: none; }
      .filters-bar { flex-direction: column; align-items: stretch; }
      .filter-inputs { flex-direction: column; align-items: stretch; }
      .search-input { min-width: unset; width: 100%; }
    }
  `]
})
export class DashboardPageComponent implements OnInit {
  stats: FullDashboardStats | null = null
  isLoading = false

  readonly selectedStatus = signal<'ALL' | 'PENDING' | 'OVERDUE' | 'PRIORITY' | 'COMPLETED'>('ALL')
  readonly selectedSector = signal<string>('ALL')
  readonly searchQuery = signal<string>('')

  readonly filteredTasks = computed(() => {
    if (!this.stats) return []
    let list = this.stats.tasks

    // Filtro por Status
    const status = this.selectedStatus()
    if (status === 'PENDING') {
      list = list.filter((t) => !t.completed)
    } else if (status === 'OVERDUE') {
      list = list.filter((t) => t.isOverdue)
    } else if (status === 'PRIORITY') {
      list = list.filter((t) => t.isPriority)
    } else if (status === 'COMPLETED') {
      list = list.filter((t) => t.completed)
    }

    // Filtro por Setor
    const sector = this.selectedSector()
    if (sector !== 'ALL') {
      list = list.filter((t) => t.type === sector)
    }

    // Busca textual (título, descrição, criador, responsável)
    const q = this.searchQuery().trim().toLowerCase()
    if (q) {
      list = list.filter((t) => {
        const matchTitle = t.title.toLowerCase().includes(q)
        const matchDesc = (t.description || '').toLowerCase().includes(q)
        const matchCreator = (t.createdBy?.username || '').toLowerCase().includes(q)
        const matchAssignee = (t.user?.username || '').toLowerCase().includes(q)
        return matchTitle || matchDesc || matchCreator || matchAssignee
      })
    }

    return list
  })

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.refresh()
  }

  refresh(): void {
    this.isLoading = true
    this.http.get<FullDashboardStats>('/api/tasks/dashboard').subscribe({
      next: (data) => {
        this.stats = data
        this.isLoading = false
      },
      error: (err) => {
        console.error('Falha ao carregar métricas da agenda', err)
        this.isLoading = false
      },
    })
  }

  setStatusFilter(status: 'ALL' | 'PENDING' | 'OVERDUE' | 'PRIORITY' | 'COMPLETED'): void {
    this.selectedStatus.set(status)
  }

  onSectorChange(sector: string): void {
    this.selectedSector.set(sector)
  }

  onSearchInput(query: string): void {
    this.searchQuery.set(query)
  }

  clearSearch(): void {
    this.searchQuery.set('')
  }

  resetFilters(): void {
    this.selectedStatus.set('ALL')
    this.selectedSector.set('ALL')
    this.searchQuery.set('')
  }

  formatLeadTime(hours: number): string {
    if (!hours || hours <= 0) return '-'
    if (hours < 24) return `${hours}h`
    const days = (hours / 24).toFixed(1)
    return `${days}d`
  }

  getPercentage(value: number, total: number): number {
    if (!total || total <= 0) return 0
    return Math.min(100, Math.round((value / total) * 100))
  }
}
