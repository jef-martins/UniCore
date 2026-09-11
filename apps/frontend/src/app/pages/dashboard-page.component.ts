import { Component, OnInit, computed, signal, HostListener } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { DomSanitizer, SafeUrl, SafeResourceUrl } from '@angular/platform-browser'

export interface EvidenceModalState {
  isOpen: boolean
  taskId: string
  taskTitle: string
  sectorLabel: string
  responsible: string
  type: 'completion' | 'creation'
  attachmentName: string | null
  notes: string | null
  date: string | null
  isLoadingFile: boolean
  blobUrl: string | null
  safeBlobUrl: SafeUrl | null
  safeResourceUrl: SafeResourceUrl | null
  textContent: string | null
  isImage: boolean
  isText: boolean
  isPdf: boolean
  errorMessage: string | null
}

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
  resolutionTimeMinutes?: number | null
  resolutionTimeHours?: number | null
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
  avgResolutionTimeHours?: number
  avgResolutionTimeMinutes?: number
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
  avgResolutionTimeHours?: number
  avgResolutionTimeMinutes?: number
}

export interface UserItem {
  id: string
  username: string
  role: string
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
  avgResolutionTimeMinutes?: number
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
  users: UserItem[]
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
            Quantificação consolidada, análise de produtividade, conformidade de SLA e médias de resolução por setor e pessoa.
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

            <!-- Lead Time Médio Geral -->
            <div class="kpi-card card card-elevated">
              <div class="kpi-header">
                <span class="kpi-label">Lead Time Geral</span>
                <span class="kpi-icon icon-purple">⚡</span>
              </div>
              <div class="kpi-value">{{ formatDuration(stats.overview.avgResolutionTimeHours) }}</div>
              <div class="kpi-subtext">
                <span>Tempo médio global de entrega</span>
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

          <!-- 3. SEÇÃO INTERATIVA: MÉDIA DE RESOLUÇÃO POR PESSOA E POR SETOR (COM SELECTBOXES) -->
          <section class="card card-outlined resolution-analyzer-card">
            <div class="resolution-card-header">
              <div class="resolution-title-group">
                <div class="section-tag">
                  <span>⏱️ Análise de Lead Time</span>
                </div>
                <h2 class="panel-title">Média de Resolução de Tarefas por Setor e Pessoa</h2>
                <p class="panel-subtitle">
                  Selecione o setor e/ou uma pessoa específica para calcular o tempo médio de atendimento e auditar a resolução de cada demanda.
                </p>
              </div>

              <!-- SELECTBOXES EXIGIDOS -->
              <div class="resolution-controls">
                
                <!-- Selectbox 1: Setor -->
                <div class="control-group">
                  <label class="control-label" for="res-sector-select">Setor:</label>
                  <select
                    id="res-sector-select"
                    class="select-control highlight-select"
                    [ngModel]="resolutionSector()"
                    (ngModelChange)="onResolutionSectorChange($event)"
                  >
                    <option value="ALL">🌐 Todos os Setores</option>
                    @for (sec of stats.bySector; track sec.type) {
                      <option [value]="sec.type">{{ sec.label }}</option>
                    }
                  </select>
                </div>

                <!-- Selectbox 2: Pessoa / Usuário -->
                <div class="control-group">
                  <label class="control-label" for="res-user-select">Pessoa / Responsável:</label>
                  <select
                    id="res-user-select"
                    class="select-control highlight-select"
                    [ngModel]="resolutionUser()"
                    (ngModelChange)="onResolutionUserChange($event)"
                  >
                    <option value="ALL">👤 Todas as Pessoas</option>
                    <option value="__SHARED__">👥 Fila Coletiva (Sem Atribuição)</option>
                    @for (u of stats.users; track u.id) {
                      <option [value]="u.username">{{ u.username }} ({{ u.role }})</option>
                    }
                  </select>
                </div>

                @if (resolutionSector() !== 'ALL' || resolutionUser() !== 'ALL') {
                  <button
                    type="button"
                    class="button button-secondary btn-sm reset-res-btn"
                    (click)="resetResolutionFilter()"
                    title="Restaurar visão geral"
                  >
                    ✕ Limpar Seleção
                  </button>
                }
              </div>
            </div>

            <!-- Mini Cards com os Resultados do Filtro de Resolução -->
            <div class="resolution-kpi-grid">
              
              <!-- Média de Resolução do Filtro -->
              <div class="res-stat-card highlight">
                <div class="res-stat-header">
                  <span class="res-stat-label">Tempo Médio de Resolução</span>
                  <span class="res-icon">⚡</span>
                </div>
                <div class="res-stat-value main-lead-value">{{ resolutionAnalysis().formattedAvg }}</div>
                <div class="res-stat-sub">
                  @if (resolutionAnalysis().diffVsGlobal; as diff) {
                    @if (diff.isFaster) {
                      <span class="badge badge-success-soft">⚡ {{ diff.percent }}% mais rápido que a média geral</span>
                    } @else {
                      <span class="badge badge-amber-soft">🐢 {{ diff.percent }}% acima da média geral</span>
                    }
                  } @else if (resolutionAnalysis().totalCompleted > 0) {
                    <span class="text-muted">Média baseada nas tarefas concluídas</span>
                  } @else {
                    <span class="text-muted">Nenhuma tarefa resolvida no filtro</span>
                  }
                </div>
              </div>

              <!-- Concluídas / Avaliadas -->
              <div class="res-stat-card">
                <div class="res-stat-header">
                  <span class="res-stat-label">Concluídas no Filtro</span>
                  <span class="res-icon">🎯</span>
                </div>
                <div class="res-stat-value">{{ resolutionAnalysis().totalCompleted }}</div>
                <div class="res-stat-sub">
                  <span>de {{ resolutionAnalysis().totalScope }} demandas ({{ resolutionAnalysis().completionRate }}% taxa)</span>
                </div>
              </div>

              <!-- Resolução Mais Rápida -->
              <div class="res-stat-card">
                <div class="res-stat-header">
                  <span class="res-stat-label">Mais Rápida (Menor Tempo)</span>
                  <span class="res-icon">🚀</span>
                </div>
                @if (resolutionAnalysis().fastestTask; as fast) {
                  <div class="res-stat-value text-green">{{ formatDuration(fast.resolutionTimeHours) }}</div>
                  <div class="res-stat-sub text-truncate" [title]="fast.title">
                    <span>{{ fast.title }}</span>
                  </div>
                } @else {
                  <div class="res-stat-value text-muted">-</div>
                  <div class="res-stat-sub"><span>Sem registros</span></div>
                }
              </div>

              <!-- Resolução Mais Longa -->
              <div class="res-stat-card">
                <div class="res-stat-header">
                  <span class="res-stat-label">Mais Demorada (Maior Tempo)</span>
                  <span class="res-icon">⏳</span>
                </div>
                @if (resolutionAnalysis().slowestTask; as slow) {
                  <div class="res-stat-value text-amber">{{ formatDuration(slow.resolutionTimeHours) }}</div>
                  <div class="res-stat-sub text-truncate" [title]="slow.title">
                    <span>{{ slow.title }}</span>
                  </div>
                } @else {
                  <div class="res-stat-value text-muted">-</div>
                  <div class="res-stat-sub"><span>Sem registros</span></div>
                }
              </div>

            </div>

            <!-- Tabela com Tempo de Resolução de Cada Tarefa do Recorte -->
            @if (resolutionAnalysis().tasks.length > 0) {
              <div class="tasks-resolution-table-wrapper">
                <div class="table-subheading">
                  <h3 class="panel-title-sm">
                    Tempo de Resolução de Cada Tarefa no Recorte ({{ resolutionAnalysis().tasks.length }} concluídas)
                  </h3>
                  <span class="table-sub-note">Ordenado da mais rápida para a mais longa</span>
                </div>

                <div class="table-responsive">
                  <table class="data-table mini-table">
                    <thead>
                      <tr>
                        <th>Demanda</th>
                        <th>Setor</th>
                        <th>Responsável</th>
                        <th>Criação</th>
                        <th>Conclusão</th>
                        <th>Tempo de Resolução</th>
                        <th>Conformidade SLA</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of resolutionAnalysis().tasks; track item.id) {
                        <tr>
                          <td>
                            <div class="task-mini-info">
                              <strong>{{ item.title }}</strong>
                              @if (item.isPriority) {
                                <span class="badge badge-pink-soft">🔥 Alta</span>
                              }
                            </div>
                          </td>
                          <td><span class="sector-tag">{{ item.typeLabel }}</span></td>
                          <td>
                            @if (item.isShared) {
                              <span class="badge badge-blue-soft">👥 Fila Setorial</span>
                            } @else if (item.user) {
                              <span class="user-pill">{{ item.user.username }}</span>
                            } @else {
                              <span class="text-muted">-</span>
                            }
                          </td>
                          <td><span class="date-text">{{ item.createdAt | date:'dd/MM/yyyy HH:mm' }}</span></td>
                          <td><span class="date-text text-green">{{ item.completedAt | date:'dd/MM/yyyy HH:mm' }}</span></td>
                          <td>
                            <span class="badge badge-res-time" title="Tempo decorrido entre criação e entrega">
                              ⏱️ {{ formatDuration(item.resolutionTimeHours) }}
                            </span>
                          </td>
                          <td>
                            @if (item.isOverdue) {
                              <span class="badge badge-danger">Entregue com atraso</span>
                            } @else {
                              <span class="badge badge-success">No prazo</span>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            } @else {
              <div class="no-res-data">
                <p>Nenhuma tarefa concluída encontrada para a combinação de setor e pessoa selecionada.</p>
              </div>
            }
          </section>

          <!-- 4. PAINÉIS DE DESEMPENHO POR SETOR E RANKING DE USUÁRIOS -->
          <div class="analytics-row">
            
            <!-- Desempenho por Setor -->
            <section class="card card-outlined panel-section flex-2">
              <div class="panel-header">
                <div>
                  <h2 class="panel-title">Desempenho por Setor</h2>
                  <p class="panel-subtitle">Volume, taxa de resolução e lead time médio por departamento.</p>
                </div>
              </div>

              <div class="sector-bars-list">
                @for (sec of stats.bySector; track sec.type) {
                  <div class="sector-bar-item">
                    <div class="sector-bar-header">
                      <div class="sector-name-group">
                        <span class="sector-title">{{ sec.label }}</span>
                        @if (sec.avgResolutionTimeHours && sec.avgResolutionTimeHours > 0) {
                          <span class="badge badge-purple-soft" title="Tempo médio de resolução deste setor">
                            ⏱️ Média: {{ formatDuration(sec.avgResolutionTimeHours) }}
                          </span>
                        }
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
                  <h3 class="panel-title-sm">Top Responsáveis (Entregas & Média)</h3>
                </div>
                <div class="rank-list">
                  @for (usr of stats.topAssignees; track usr.username; let i = $index) {
                    <div class="rank-item">
                      <div class="rank-user">
                        <span class="rank-badge" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2">
                          {{ i + 1 }}º
                        </span>
                        <div>
                          <span class="rank-name">{{ usr.username }}</span>
                          @if (usr.avgResolutionTimeHours && usr.avgResolutionTimeHours > 0) {
                            <small class="user-lead-time">⏱️ Média: {{ formatDuration(usr.avgResolutionTimeHours) }}</small>
                          }
                        </div>
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

          <!-- 5. TABELA INTELIGENTE COM FILTROS E BUSCA -->
          <section class="card card-outlined table-section">
            <div class="table-section-header">
              <div>
                <h2 class="panel-title">Detalhamento e Rastreabilidade de Tarefas</h2>
                <p class="panel-subtitle">Lista operacional com monitoramento de prazos, tempo de resolução e evidências.</p>
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

              <!-- Filtro por Setor, Pessoa e Busca -->
              <div class="filter-inputs">
                
                <!-- Filtro Setor na Tabela -->
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

                <!-- Filtro Pessoa na Tabela -->
                <select
                  class="select-control"
                  [ngModel]="selectedUser()"
                  (ngModelChange)="onUserChange($event)"
                  aria-label="Filtrar por responsável"
                >
                  <option value="ALL">Todos os Responsáveis</option>
                  <option value="__SHARED__">👥 Fila Coletiva</option>
                  @for (u of stats.users; track u.id) {
                    <option [value]="u.username">{{ u.username }}</option>
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
                    <th>Tempo de Resolução</th>
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
                              <button
                                type="button"
                                class="attachment-pill clickable"
                                (click)="openBriefing(task)"
                                [title]="'Clique para ver o briefing: ' + task.attachmentName"
                              >
                                📎
                              </button>
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

                      <!-- Tempo de Resolução -->
                      <td>
                        @if (task.completed && task.resolutionTimeHours != null && task.resolutionTimeHours > 0) {
                          <span class="badge badge-res-time" title="Tempo total gasto até a conclusão">
                            ⏱️ {{ formatDuration(task.resolutionTimeHours) }}
                          </span>
                        } @else if (task.completed) {
                          <span class="badge badge-success-soft">Concluída</span>
                        } @else {
                          <span class="text-muted">Em andamento</span>
                        }
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
                          <button
                            type="button"
                            class="evidence-pill clickable"
                            (click)="openEvidence(task)"
                            [title]="'Clique para abrir e ver a evidência: ' + task.completionAttachmentName"
                          >
                            📄 Anexada
                          </button>
                        } @else if (task.completionNotes) {
                          <button
                            type="button"
                            class="notes-pill clickable"
                            (click)="openEvidence(task)"
                            title="Clique para abrir e ler a nota de conclusão"
                          >
                            📝 Nota
                          </button>
                        } @else {
                          <span class="text-muted">-</span>
                        }
                      </td>

                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" class="empty-row">
                        <div class="empty-state">
                          <span class="empty-icon">🔎</span>
                          <h4>Nenhuma tarefa corresponde aos filtros aplicados</h4>
                          <p>Tente alterar o status, limpar a busca ou selecionar outro setor/responsável.</p>
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

            <!-- Rodapé da Tabela -->
            <div class="table-footer-bar">
              <div class="table-footer-info">
                <span>
                  Mostrando <strong>{{ filteredTasks().length }}</strong> de <strong>{{ stats.overview.totalTasks }}</strong> demandas registradas
                </span>
                @if (filteredTasks().length < stats.overview.totalTasks) {
                  <span class="filter-applied-badge">Filtros ativos</span>
                }
              </div>
              <div class="table-footer-meta">
                <span class="meta-dot"></span>
                <span>Fim da listagem de tarefas</span>
              </div>
            </div>

          </section>

          <!-- Rodapé da Página do Dashboard -->
          <footer class="dashboard-page-footer">
            <div class="footer-brand">
              <span class="footer-icon">📊</span>
              <span class="footer-logo">UniCore</span>
              <span class="footer-sep">•</span>
              <span>Relatório de Agenda & Gestão Operacional</span>
            </div>
            <div class="footer-actions">
              <button type="button" class="back-to-top-btn" (click)="scrollToTop()">
                ▲ Voltar ao topo
              </button>
            </div>
          </footer>

        </div>
      }

      <!-- Modal de Visualização de Evidência / Anexo -->
      @if (modalEvidence().isOpen) {
        <div
          class="evidence-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="evidence-modal-title"
          (click)="closeEvidenceModal()"
        >
          <div class="evidence-modal-card" (click)="$event.stopPropagation()">
            
            <!-- Cabeçalho do Modal -->
            <div class="evidence-modal-header">
              <div class="header-badge-title">
                <span class="evidence-type-tag">
                  {{ modalEvidence().type === 'completion' ? '✅ Evidência de Conclusão' : '📎 Anexo de Criação / Briefing' }}
                </span>
                <h3 id="evidence-modal-title">{{ modalEvidence().taskTitle }}</h3>
                <div class="evidence-meta">
                  <span><strong>Setor:</strong> {{ modalEvidence().sectorLabel }}</span>
                  <span>•</span>
                  <span><strong>Responsável:</strong> {{ modalEvidence().responsible }}</span>
                  @if (modalEvidence().date) {
                    <span>•</span>
                    <span><strong>Data:</strong> {{ modalEvidence().date | date:'dd/MM/yyyy HH:mm' }}</span>
                  }
                </div>
              </div>
              <button
                type="button"
                class="close-modal-btn"
                (click)="closeEvidenceModal()"
                aria-label="Fechar modal"
              >
                ✕
              </button>
            </div>

            <!-- Corpo do Modal -->
            <div class="evidence-modal-body">
              
              <!-- Observações / Notas (se houver) -->
              @if (modalEvidence().notes) {
                <div class="evidence-notes-section">
                  <h4 class="section-heading">
                    {{ modalEvidence().type === 'completion' ? '📝 Observações / Justificativa de Entrega:' : '📋 Descrição / Briefing:' }}
                  </h4>
                  <div class="notes-content-box">
                    {{ modalEvidence().notes }}
                  </div>
                </div>
              }

              <!-- Arquivo Anexado (se houver) -->
              @if (modalEvidence().attachmentName) {
                <div class="evidence-file-section">
                  <div class="file-header-bar">
                    <div class="file-name-group">
                      <span class="file-icon">
                        {{ modalEvidence().isImage ? '🖼️' : modalEvidence().isPdf ? '📕' : '📄' }}
                      </span>
                      <div>
                        <strong class="file-title">{{ modalEvidence().attachmentName }}</strong>
                        <span class="file-type-label">Arquivo de evidência anexado</span>
                      </div>
                    </div>
                    <div class="file-quick-actions">
                      @if (modalEvidence().blobUrl) {
                        <button
                          type="button"
                          class="button button-secondary btn-sm"
                          (click)="openInNewTab()"
                          title="Abrir arquivo em nova aba"
                        >
                          🔗 Nova Aba
                        </button>
                      }
                      <button
                        type="button"
                        class="button button-primary btn-sm"
                        (click)="downloadCurrentAttachment()"
                        [disabled]="modalEvidence().isLoadingFile"
                      >
                        📥 Baixar Arquivo
                      </button>
                    </div>
                  </div>

                  <!-- Preview Container -->
                  <div class="preview-container">
                    @if (modalEvidence().isLoadingFile) {
                      <div class="preview-loading">
                        <div class="spinner"></div>
                        <p>Carregando conteúdo do arquivo para visualização...</p>
                      </div>
                    } @else if (modalEvidence().errorMessage) {
                      <div class="preview-error">
                        <span class="error-icon">⚠️</span>
                        <p>{{ modalEvidence().errorMessage }}</p>
                      </div>
                    } @else if (modalEvidence().isImage && modalEvidence().safeBlobUrl) {
                      <div class="image-preview-wrapper">
                        <img
                          [src]="modalEvidence().safeBlobUrl"
                          [alt]="modalEvidence().attachmentName || 'Evidência anexada'"
                          class="evidence-image"
                        />
                      </div>
                    } @else if (modalEvidence().isText && modalEvidence().textContent != null) {
                      <div class="text-preview-wrapper">
                        <pre class="evidence-text">{{ modalEvidence().textContent }}</pre>
                      </div>
                    } @else if (modalEvidence().isPdf && modalEvidence().safeResourceUrl) {
                      <div class="pdf-preview-wrapper">
                        <iframe
                          [src]="modalEvidence().safeResourceUrl"
                          class="pdf-iframe"
                          title="Visualização de PDF"
                        ></iframe>
                      </div>
                    } @else {
                      <div class="generic-file-preview">
                        <span class="generic-icon">📦</span>
                        <p>Pré-visualização direta não disponível para este formato de arquivo.</p>
                        <button
                          type="button"
                          class="button button-primary"
                          (click)="downloadCurrentAttachment()"
                        >
                          📥 Clique aqui para baixar e visualizar
                        </button>
                      </div>
                    }
                  </div>
                </div>
              } @else if (!modalEvidence().notes) {
                <div class="no-evidence-notice">
                  <p>Nenhum anexo ou nota associada a esta demanda.</p>
                </div>
              }

            </div>

            <!-- Rodapé do Modal -->
            <div class="evidence-modal-footer">
              <button
                type="button"
                class="button button-secondary"
                (click)="closeEvidenceModal()"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-page {
      padding: 1.5rem 2rem 6rem;
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
      border-radius: 2px;
      overflow: hidden;
      margin-top: 2px;
    }

    .kpi-progress .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #49D17D);
      border-radius: 2px;
      transition: width 0.6s ease;
    }

    .kpi-subtext {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #B9C3BC);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .alert-text { color: #FF7A7A; font-weight: 600; }
    .ok-text { color: #49D17D; font-weight: 500; }

    /* Mini Auditoria */
    .audit-strip {
      background: rgba(24, 29, 26, 0.7);
      border: 1px solid var(--color-border, #2e3831);
      border-radius: 10px;
      padding: 0.85rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .audit-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .audit-icon { font-size: 1.3rem; }
    .audit-text { display: flex; flex-direction: column; }
    .audit-text strong { font-size: 0.85rem; color: #fff; }
    .audit-sub { font-size: 0.75rem; color: var(--color-text-secondary, #B9C3BC); }
    .audit-divider { width: 1px; height: 32px; background: rgba(255, 255, 255, 0.1); }

    /* NOVO: SEÇÃO DE RESOLUÇÃO POR SETOR E PESSOA */
    .resolution-analyzer-card {
      background: linear-gradient(180deg, rgba(30, 41, 35, 0.85), var(--color-surface, #181D1A));
      border: 1px solid rgba(73, 209, 125, 0.3);
      border-radius: 14px;
      padding: 1.5rem;
      margin-bottom: 1.75rem;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }

    .resolution-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 1.25rem;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 1.25rem;
    }

    .resolution-title-group {
      max-width: 620px;
    }

    .section-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #38EF7D;
      background: rgba(56, 239, 125, 0.12);
      border: 1px solid rgba(56, 239, 125, 0.3);
      padding: 2px 8px;
      border-radius: 6px;
      margin-bottom: 6px;
    }

    .resolution-controls {
      display: flex;
      align-items: flex-end;
      gap: 0.85rem;
      flex-wrap: wrap;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .control-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .highlight-select {
      border-color: rgba(73, 209, 125, 0.4) !important;
      background: rgba(20, 26, 22, 0.95) !important;
      min-width: 210px;
      font-weight: 600;
      color: #fff !important;
    }

    .highlight-select:focus {
      border-color: #49D17D !important;
      box-shadow: 0 0 0 2px rgba(73, 209, 125, 0.25);
    }

    .reset-res-btn {
      margin-bottom: 2px;
      height: 38px;
      color: #FF7A7A !important;
      border-color: rgba(255, 122, 122, 0.3) !important;
    }

    .reset-res-btn:hover {
      background: rgba(255, 122, 122, 0.1) !important;
    }

    /* Grid de KPIs da Resolução */
    .resolution-kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .res-stat-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 1rem 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .res-stat-card.highlight {
      background: linear-gradient(135deg, rgba(73, 209, 125, 0.12), rgba(20, 30, 24, 0.6));
      border-color: rgba(73, 209, 125, 0.35);
    }

    .res-stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .res-stat-label {
      font-size: 0.74rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .res-icon { font-size: 1rem; }

    .res-stat-value {
      font-size: 1.7rem;
      font-weight: 800;
      color: #fff;
    }

    .main-lead-value {
      color: #38EF7D !important;
      font-size: 2rem;
    }

    .res-stat-sub {
      font-size: 0.76rem;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .text-green { color: #49D17D !important; }
    .text-amber { color: #F5A623 !important; }

    .text-truncate {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 220px;
    }

    .tasks-resolution-table-wrapper {
      margin-top: 1.25rem;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 1rem;
    }

    .table-subheading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.85rem;
      flex-wrap: wrap;
      gap: 6px;
    }

    .table-subheading h3 {
      margin: 0;
      color: #fff;
      font-size: 0.95rem;
      font-weight: 600;
    }

    .table-sub-note {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .mini-table th {
      font-size: 0.72rem;
      padding: 8px 12px;
    }

    .mini-table td {
      font-size: 0.82rem;
      padding: 8px 12px;
    }

    .badge-res-time {
      background: rgba(168, 85, 247, 0.15);
      color: #C084FC;
      border: 1px solid rgba(168, 85, 247, 0.35);
      font-weight: 700;
      font-size: 0.78rem;
    }

    .badge-purple-soft {
      background: rgba(168, 85, 247, 0.12);
      color: #D8B4FE;
      font-size: 0.7rem;
    }

    .user-lead-time {
      display: block;
      font-size: 0.72rem;
      color: #C084FC;
      font-weight: 500;
      margin-top: 2px;
    }

    .no-res-data {
      padding: 1.5rem;
      text-align: center;
      color: var(--color-text-secondary, #B9C3BC);
      font-size: 0.85rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
    }

    /* Analytics Row */
    .analytics-row {
      display: flex;
      gap: 1.25rem;
      margin-bottom: 1.75rem;
      flex-wrap: wrap;
    }

    .flex-2 { flex: 2; min-width: 320px; }
    .flex-1 { flex: 1; min-width: 280px; }

    .panels-column {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .panel-section {
      background: var(--color-surface, #181D1A);
      border: 1px solid var(--color-border, #2e3831);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }

    .panel-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
      margin: 0 0 4px;
    }

    .panel-title-sm {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
      margin: 0;
    }

    .panel-subtitle {
      font-size: 0.82rem;
      color: var(--color-text-secondary, #B9C3BC);
      margin: 0;
    }

    /* Setores em Barra */
    .sector-bars-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .sector-bar-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
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
      flex-wrap: wrap;
    }

    .sector-title {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--color-text-primary, #F5F7F4);
    }

    .sector-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.82rem;
    }

    .sector-counts {
      color: var(--color-text-secondary, #B9C3BC);
    }

    .sector-rate {
      color: #49D17D;
      font-weight: 700;
    }

    .progress-track {
      height: 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #49D17D);
      border-radius: 4px;
      transition: width 0.7s ease;
    }

    /* Rankings de Produtividade */
    .rank-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rank-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.02);
      transition: background 0.15s ease;
    }

    .rank-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .rank-user {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .rank-badge {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .rank-badge.gold { background: linear-gradient(135deg, #F59E0B, #D97706); color: #fff; }
    .rank-badge.silver { background: linear-gradient(135deg, #9CA3AF, #6B7280); color: #fff; }
    .rank-badge.bronze { background: linear-gradient(135deg, #B45309, #92400E); color: #fff; }
    .rank-badge.plain { background: transparent; color: var(--color-text-secondary, #B9C3BC); }

    .rank-name {
      font-size: 0.88rem;
      font-weight: 500;
      color: #fff;
    }

    .rank-stat {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rank-count {
      font-size: 0.8rem;
      color: var(--color-text-secondary, #B9C3BC);
    }

    /* Table Section */
    .table-section {
      background: var(--color-surface, #181D1A);
      border: 1px solid var(--color-border, #2e3831);
      border-radius: 12px;
      padding: 1.5rem 1.5rem 0;
      margin-bottom: 2.5rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .table-footer-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      margin: 0.75rem -1.5rem 0;
      background: rgba(0, 0, 0, 0.25);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.82rem;
      color: var(--color-text-secondary, #B9C3BC);
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .table-footer-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .table-footer-info strong {
      color: #fff;
    }

    .filter-applied-badge {
      font-size: 0.72rem;
      background: rgba(73, 209, 125, 0.12);
      color: #49D17D;
      border: 1px solid rgba(73, 209, 125, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .table-footer-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
    }

    .meta-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #49D17D;
      display: inline-block;
    }

    /* Page Footer */
    .dashboard-page-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1.5rem;
      margin-top: 2rem;
      margin-bottom: 2rem;
      border-top: 1px solid var(--color-border, #2e3831);
      color: var(--color-text-secondary, #B9C3BC);
      font-size: 0.85rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .footer-icon { font-size: 1.1rem; }
    .footer-logo { font-weight: 700; color: #fff; }
    .footer-sep { color: var(--color-border, #3f4a42); }

    .back-to-top-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--color-border, #2e3831);
      color: var(--color-text-primary, #F5F7F4);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .back-to-top-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
      color: #fff;
    }

    .table-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .results-badge {
      background: rgba(73, 209, 125, 0.12);
      border: 1px solid rgba(73, 209, 125, 0.25);
      color: #49D17D;
      font-size: 0.78rem;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 999px;
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
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--color-border, #2e3831);
      color: var(--color-text-secondary, #B9C3BC);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .chip-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .chip-btn.active {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.4);
      color: #fff;
      font-weight: 600;
    }

    .chip-btn.chip-amber.active {
      background: rgba(245, 166, 35, 0.2);
      border-color: #F5A623;
      color: #F5A623;
    }

    .chip-btn.chip-red.active {
      background: rgba(255, 122, 122, 0.2);
      border-color: #FF7A7A;
      color: #FF7A7A;
    }

    .chip-btn.chip-pink.active {
      background: rgba(236, 72, 153, 0.2);
      border-color: #F472B6;
      color: #F472B6;
    }

    .chip-btn.chip-green.active {
      background: rgba(73, 209, 125, 0.2);
      border-color: #49D17D;
      color: #49D17D;
    }

    .filter-inputs {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .select-control {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--color-border, #2e3831);
      color: var(--color-text-primary, #F5F7F4);
      padding: 7px 12px;
      border-radius: 8px;
      font-size: 0.82rem;
      outline: none;
      cursor: pointer;
      transition: border-color 0.15s ease;
    }

    .select-control:focus {
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
      opacity: 0.6;
      pointer-events: none;
    }

    .search-input {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--color-border, #2e3831);
      color: var(--color-text-primary, #F5F7F4);
      padding: 7px 28px 7px 30px;
      border-radius: 8px;
      font-size: 0.82rem;
      min-width: 240px;
      outline: none;
      transition: all 0.15s ease;
    }

    .search-input:focus {
      border-color: var(--color-action-green, #49D17D);
      background: rgba(0, 0, 0, 0.4);
    }

    .clear-search {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      color: var(--color-text-secondary, #B9C3BC);
      font-size: 0.85rem;
      cursor: pointer;
      padding: 0;
    }

    /* Table */
    .table-responsive {
      overflow-x: auto;
      border-radius: 8px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .data-table th {
      text-align: left;
      padding: 10px 14px;
      color: var(--color-text-secondary, #B9C3BC);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--color-border, #2e3831);
      background: rgba(0, 0, 0, 0.15);
      white-space: nowrap;
    }

    .data-table td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: middle;
    }

    .data-table tbody tr {
      transition: background 0.15s ease;
    }

    .data-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .row-overdue {
      background: rgba(255, 122, 122, 0.03);
    }

    .row-overdue:hover {
      background: rgba(255, 122, 122, 0.06) !important;
    }

    .row-priority {
      border-left: 3px solid #F472B6;
    }

    /* Cell Components */
    .task-title-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-width: 280px;
    }

    .title-line {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #fff;
    }

    .task-desc {
      color: var(--color-text-secondary, #B9C3BC);
      font-size: 0.78rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-mini-info {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #fff;
    }

    .priority-badge {
      font-size: 0.7rem;
      font-weight: 700;
      color: #F472B6;
      background: rgba(236, 72, 153, 0.15);
      border: 1px solid rgba(236, 72, 153, 0.35);
      padding: 1px 5px;
      border-radius: 4px;
    }

    .attachment-pill {
      font-size: 0.8rem;
      opacity: 0.85;
      cursor: default;
    }

    .sector-tag {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      color: #D4D4D8;
      white-space: nowrap;
    }

    .user-pill {
      font-size: 0.82rem;
      color: #E4E4E7;
      font-weight: 500;
    }

    .creator-name {
      font-size: 0.8rem;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .date-text {
      font-size: 0.8rem;
      color: #D4D4D8;
      white-space: nowrap;
    }

    .status-stack {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .completion-date {
      font-size: 0.7rem;
      color: #49D17D;
    }

    .overdue-warn {
      font-size: 0.7rem;
      color: #FF7A7A;
      font-weight: 600;
    }

    .evidence-pill {
      font-size: 0.75rem;
      background: rgba(73, 209, 125, 0.12);
      color: #49D17D;
      border: 1px solid rgba(73, 209, 125, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }

    .notes-pill {
      font-size: 0.75rem;
      background: rgba(255, 255, 255, 0.08);
      color: #B9C3BC;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
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
    .badge-amber-soft { background: rgba(245, 166, 35, 0.12); color: #F5A623; }
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

    /* Estilos Interativos para Pílulas de Evidência e Anexo */
    .clickable {
      cursor: pointer;
      transition: all 0.18s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      outline: none;
    }

    .evidence-pill.clickable {
      border: 1px solid rgba(73, 209, 125, 0.4);
    }

    .evidence-pill.clickable:hover {
      background: rgba(73, 209, 125, 0.25);
      border-color: #49D17D;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(73, 209, 125, 0.25);
    }

    .notes-pill.clickable {
      border: 1px solid rgba(255, 255, 255, 0.18);
    }

    .notes-pill.clickable:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(255, 255, 255, 0.4);
      color: #fff;
      transform: translateY(-1px);
    }

    .attachment-pill.clickable {
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.35);
      color: #38bdf8;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .attachment-pill.clickable:hover {
      background: rgba(56, 189, 248, 0.25);
      border-color: #38bdf8;
      transform: translateY(-1px);
    }

    /* Modal de Evidências e Anexos */
    .evidence-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1.5rem;
      animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .evidence-modal-card {
      background: #181D1A;
      border: 1px solid #3f4a42;
      border-radius: 14px;
      width: 100%;
      max-width: 840px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(73, 209, 125, 0.2);
      overflow: hidden;
      animation: modalSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalSlideUp {
      from { transform: translateY(16px) scale(0.98); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    .evidence-modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #2e3831;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #141816;
      gap: 1rem;
    }

    .header-badge-title {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .evidence-type-tag {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #49D17D;
      background: rgba(73, 209, 125, 0.12);
      border: 1px solid rgba(73, 209, 125, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
      align-self: flex-start;
    }

    .evidence-modal-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #F5F7F4;
    }

    .evidence-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      color: #9ea8a2;
      flex-wrap: wrap;
    }

    .close-modal-btn {
      background: transparent;
      border: 1px solid transparent;
      color: #9ea8a2;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.15s ease;
      line-height: 1;
    }

    .close-modal-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .evidence-modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      flex: 1;
    }

    .evidence-notes-section {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid #2e3831;
      border-radius: 8px;
      padding: 1rem 1.25rem;
    }

    .section-heading {
      margin: 0 0 0.5rem;
      font-size: 0.82rem;
      font-weight: 600;
      color: #B9C3BC;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .notes-content-box {
      font-size: 0.95rem;
      line-height: 1.55;
      color: #F5F7F4;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .evidence-file-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .file-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #141816;
      border: 1px solid #2e3831;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .file-name-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .file-icon {
      font-size: 1.5rem;
      line-height: 1;
    }

    .file-title {
      font-size: 0.9rem;
      color: #F5F7F4;
      display: block;
      word-break: break-all;
    }

    .file-type-label {
      font-size: 0.72rem;
      color: #9ea8a2;
      display: block;
    }

    .file-quick-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .preview-container {
      background: #0d110f;
      border: 1px solid #2e3831;
      border-radius: 8px;
      min-height: 260px;
      max-height: 520px;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .preview-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 2rem;
      color: #9ea8a2;
      font-size: 0.9rem;
    }

    .preview-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 2rem;
      color: #FF7A7A;
      text-align: center;
    }

    .error-icon {
      font-size: 2rem;
    }

    .image-preview-wrapper {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .evidence-image {
      max-width: 100%;
      max-height: 480px;
      object-fit: contain;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    }

    .text-preview-wrapper {
      width: 100%;
      height: 100%;
      padding: 1.25rem;
      overflow: auto;
    }

    .evidence-text {
      margin: 0;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.85rem;
      line-height: 1.6;
      color: #d1d9d4;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .pdf-preview-wrapper {
      width: 100%;
      height: 480px;
    }

    .pdf-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    .generic-file-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 2.5rem 1.5rem;
      text-align: center;
      color: #9ea8a2;
    }

    .generic-icon {
      font-size: 3rem;
    }

    .no-evidence-notice {
      padding: 2rem;
      text-align: center;
      color: #9ea8a2;
      font-style: italic;
    }

    .evidence-modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #2e3831;
      display: flex;
      justify-content: flex-end;
      background: #141816;
    }

    @media (max-width: 768px) {
      .dashboard-page { padding: 1rem; }
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .audit-strip { flex-direction: column; align-items: flex-start; }
      .audit-divider { display: none; }
      .resolution-card-header { flex-direction: column; }
      .resolution-controls { width: 100%; flex-direction: column; align-items: stretch; }
      .highlight-select { width: 100%; min-width: unset; }
      .resolution-kpi-grid { grid-template-columns: 1fr; }
      .filters-bar { flex-direction: column; align-items: stretch; }
      .filter-inputs { flex-direction: column; align-items: stretch; }
      .search-input { min-width: unset; width: 100%; }
    }
  `]
})
export class DashboardPageComponent implements OnInit {
  stats: FullDashboardStats | null = null
  isLoading = false

  // Filtros da Seção de Resolução (Lead Time)
  readonly resolutionSector = signal<string>('ALL')
  readonly resolutionUser = signal<string>('ALL')

  // Filtros da Tabela Geral de Tarefas
  readonly selectedStatus = signal<'ALL' | 'PENDING' | 'OVERDUE' | 'PRIORITY' | 'COMPLETED'>('ALL')
  readonly selectedSector = signal<string>('ALL')
  readonly selectedUser = signal<string>('ALL')
  readonly searchQuery = signal<string>('')

  // Estado do Modal de Evidência / Anexo
  readonly modalEvidence = signal<EvidenceModalState>({
    isOpen: false,
    taskId: '',
    taskTitle: '',
    sectorLabel: '',
    responsible: '',
    type: 'completion',
    attachmentName: null,
    notes: null,
    date: null,
    isLoadingFile: false,
    blobUrl: null,
    safeBlobUrl: null,
    safeResourceUrl: null,
    textContent: null,
    isImage: false,
    isText: false,
    isPdf: false,
    errorMessage: null,
  })

  // Análise calculada de tempo de resolução por setor e pessoa selecionados
  readonly resolutionAnalysis = computed(() => {
    if (!this.stats) {
      return {
        totalCompleted: 0,
        totalScope: 0,
        completionRate: 0,
        avgHours: 0,
        formattedAvg: '-',
        fastestTask: null as DetailedTask | null,
        slowestTask: null as DetailedTask | null,
        diffVsGlobal: null as { percent: number; isFaster: boolean } | null,
        tasks: [] as DetailedTask[],
      }
    }

    const sector = this.resolutionSector()
    const user = this.resolutionUser()

    // Filtra tarefas no escopo do selecionador
    let scopeTasks = this.stats.tasks
    if (sector !== 'ALL') {
      scopeTasks = scopeTasks.filter((t) => t.type === sector)
    }
    if (user === '__SHARED__') {
      scopeTasks = scopeTasks.filter((t) => t.isShared)
    } else if (user !== 'ALL') {
      scopeTasks = scopeTasks.filter((t) => t.user?.username === user)
    }

    const totalScope = scopeTasks.length

    // Tarefas concluídas válidas com data de término
    const completedTasks = scopeTasks.filter(
      (t) =>
        t.completed &&
        t.completedAt &&
        ((t.resolutionTimeMinutes != null && t.resolutionTimeMinutes > 0) ||
          (t.resolutionTimeHours != null && t.resolutionTimeHours > 0)),
    )

    const totalCompleted = completedTasks.length
    const completionRate = totalScope > 0 ? Math.round((totalCompleted / totalScope) * 100) : 0

    if (totalCompleted === 0) {
      return {
        totalCompleted: 0,
        totalScope,
        completionRate,
        avgMinutes: 0,
        avgHours: 0,
        formattedAvg: '-',
        fastestTask: null,
        slowestTask: null,
        diffVsGlobal: null,
        tasks: [],
      }
    }

    const totalMinutes = completedTasks.reduce((acc, t) => {
      if (t.resolutionTimeMinutes != null && t.resolutionTimeMinutes > 0) {
        return acc + t.resolutionTimeMinutes
      }
      if (t.resolutionTimeHours != null && t.resolutionTimeHours > 0) {
        return acc + Math.round(t.resolutionTimeHours * 60)
      }
      return acc + 1
    }, 0)

    const avgMinutes = Math.max(1, Math.round(totalMinutes / totalCompleted))
    const avgHours = Number((avgMinutes / 60).toFixed(2))

    // Ordena da mais rápida para a mais lenta
    const sortedByTime = [...completedTasks].sort((a, b) => {
      const timeA = a.resolutionTimeMinutes ?? (a.resolutionTimeHours ? a.resolutionTimeHours * 60 : 0)
      const timeB = b.resolutionTimeMinutes ?? (b.resolutionTimeHours ? b.resolutionTimeHours * 60 : 0)
      return timeA - timeB
    })
    const fastestTask = sortedByTime[0]
    const slowestTask = sortedByTime[sortedByTime.length - 1]

    // Compara com média global do sistema
    const globalAvg = this.stats.overview.avgResolutionTimeMinutes ?? Math.round(this.stats.overview.avgResolutionTimeHours * 60)
    let diffVsGlobal: { percent: number; isFaster: boolean } | null = null
    if (globalAvg > 0 && avgMinutes > 0) {
      const diff = Math.round(((avgMinutes - globalAvg) / globalAvg) * 100)
      if (diff !== 0) {
        diffVsGlobal = {
          percent: Math.abs(diff),
          isFaster: diff < 0,
        }
      }
    }

    return {
      totalCompleted,
      totalScope,
      completionRate,
      avgMinutes,
      avgHours,
      formattedAvg: this.formatDuration(null, avgMinutes),
      fastestTask,
      slowestTask,
      diffVsGlobal,
      tasks: sortedByTime,
    }
  })

  // Lista de tarefas filtradas para a tabela geral
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

    // Filtro por Usuário / Responsável
    const user = this.selectedUser()
    if (user === '__SHARED__') {
      list = list.filter((t) => t.isShared)
    } else if (user !== 'ALL') {
      list = list.filter((t) => t.user?.username === user)
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

  constructor(
    private readonly http: HttpClient,
    private readonly sanitizer: DomSanitizer,
  ) {}

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

  // Handlers do Modal de Evidência e Anexo
  openEvidence(task: DetailedTask): void {
    const fileName = task.completionAttachmentName || null
    const notes = task.completionNotes || null
    const responsible = task.isShared ? 'Fila do Setor' : (task.user?.username || '-')

    this.modalEvidence.set({
      isOpen: true,
      taskId: task.id,
      taskTitle: task.title,
      sectorLabel: task.typeLabel,
      responsible,
      type: 'completion',
      attachmentName: fileName,
      notes,
      date: task.completedAt || null,
      isLoadingFile: !!fileName,
      blobUrl: null,
      safeBlobUrl: null,
      safeResourceUrl: null,
      textContent: null,
      isImage: false,
      isText: false,
      isPdf: false,
      errorMessage: null,
    })

    if (fileName) {
      this.loadAttachmentContent(task.id, 'completion', fileName)
    }
  }

  openBriefing(task: DetailedTask): void {
    const fileName = task.attachmentName || null
    const notes = task.description || null
    const responsible = task.isShared ? 'Fila do Setor' : (task.user?.username || '-')

    this.modalEvidence.set({
      isOpen: true,
      taskId: task.id,
      taskTitle: task.title,
      sectorLabel: task.typeLabel,
      responsible,
      type: 'creation',
      attachmentName: fileName,
      notes,
      date: task.createdAt || null,
      isLoadingFile: !!fileName,
      blobUrl: null,
      safeBlobUrl: null,
      safeResourceUrl: null,
      textContent: null,
      isImage: false,
      isText: false,
      isPdf: false,
      errorMessage: null,
    })

    if (fileName) {
      this.loadAttachmentContent(task.id, 'creation', fileName)
    }
  }

  loadAttachmentContent(taskId: string, type: 'completion' | 'creation', fileName: string): void {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
    const isText = ['txt', 'csv', 'log', 'json', 'md', 'ts', 'js', 'html', 'css'].includes(ext)
    const isPdf = ext === 'pdf'

    const endpoint = `/api/tasks/${taskId}/attachment/${type}`

    this.http.get(endpoint, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        // Revoga blob anterior se existir
        const prevBlobUrl = this.modalEvidence().blobUrl
        if (prevBlobUrl) {
          URL.revokeObjectURL(prevBlobUrl)
        }

        const blobUrl = URL.createObjectURL(blob)
        let safeBlobUrl: SafeUrl | null = null
        let safeResourceUrl: SafeResourceUrl | null = null

        if (isImage) {
          safeBlobUrl = this.sanitizer.bypassSecurityTrustUrl(blobUrl)
        } else if (isPdf) {
          safeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl)
        }

        if (isText) {
          blob
            .text()
            .then((text) => {
              this.modalEvidence.update((prev) => ({
                ...prev,
                isLoadingFile: false,
                blobUrl,
                safeBlobUrl,
                safeResourceUrl,
                textContent: text,
                isImage,
                isText,
                isPdf,
                errorMessage: null,
              }))
            })
            .catch(() => {
              this.modalEvidence.update((prev) => ({
                ...prev,
                isLoadingFile: false,
                blobUrl,
                safeBlobUrl,
                safeResourceUrl,
                textContent: '(Não foi possível ler o arquivo como texto)',
                isImage,
                isText,
                isPdf,
                errorMessage: null,
              }))
            })
        } else {
          this.modalEvidence.update((prev) => ({
            ...prev,
            isLoadingFile: false,
            blobUrl,
            safeBlobUrl,
            safeResourceUrl,
            textContent: null,
            isImage,
            isText,
            isPdf,
            errorMessage: null,
          }))
        }
      },
      error: (err) => {
        console.error('Falha ao carregar arquivo de evidência/anexo:', err)
        this.modalEvidence.update((prev) => ({
          ...prev,
          isLoadingFile: false,
          errorMessage:
            'Não foi possível carregar o arquivo. Verifique se o arquivo ainda existe no servidor ou tente baixá-lo diretamente.',
        }))
      },
    })
  }

  closeEvidenceModal(): void {
    const blobUrl = this.modalEvidence().blobUrl
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
    }

    this.modalEvidence.set({
      isOpen: false,
      taskId: '',
      taskTitle: '',
      sectorLabel: '',
      responsible: '',
      type: 'completion',
      attachmentName: null,
      notes: null,
      date: null,
      isLoadingFile: false,
      blobUrl: null,
      safeBlobUrl: null,
      safeResourceUrl: null,
      textContent: null,
      isImage: false,
      isText: false,
      isPdf: false,
      errorMessage: null,
    })
  }

  downloadCurrentAttachment(): void {
    const current = this.modalEvidence()
    if (!current.taskId || !current.attachmentName) return

    if (current.blobUrl) {
      const a = document.createElement('a')
      a.href = current.blobUrl
      a.download = current.attachmentName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else {
      const endpoint = `/api/tasks/${current.taskId}/attachment/${current.type}`
      this.http.get(endpoint, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = current.attachmentName || 'anexo'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        },
        error: (err) => console.error('Erro ao baixar anexo:', err),
      })
    }
  }

  openInNewTab(): void {
    const blobUrl = this.modalEvidence().blobUrl
    if (blobUrl) {
      window.open(blobUrl, '_blank')
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.modalEvidence().isOpen) {
      this.closeEvidenceModal()
    }
  }

  // Handlers dos Selectboxes da Seção de Resolução
  onResolutionSectorChange(sector: string): void {
    this.resolutionSector.set(sector)
  }

  onResolutionUserChange(user: string): void {
    this.resolutionUser.set(user)
  }

  resetResolutionFilter(): void {
    this.resolutionSector.set('ALL')
    this.resolutionUser.set('ALL')
  }

  // Handlers dos Filtros da Tabela
  setStatusFilter(status: 'ALL' | 'PENDING' | 'OVERDUE' | 'PRIORITY' | 'COMPLETED'): void {
    this.selectedStatus.set(status)
  }

  onSectorChange(sector: string): void {
    this.selectedSector.set(sector)
  }

  onUserChange(user: string): void {
    this.selectedUser.set(user)
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
    this.selectedUser.set('ALL')
    this.searchQuery.set('')
  }

  // Formatação amigável de durações (minutos, horas, dias)
  formatDuration(hours?: number | null, minutes?: number | null): string {
    let totalMinutes = 0
    if (minutes != null && minutes > 0) {
      totalMinutes = Math.round(minutes)
    } else if (hours != null && hours > 0) {
      totalMinutes = Math.round(hours * 60)
    } else {
      return '-'
    }

    if (totalMinutes < 60) {
      return `${totalMinutes} min`
    }
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    if (h < 24) {
      return m > 0 ? `${h}h ${m}m` : `${h}h`
    }
    const days = Math.floor(h / 24)
    const remH = h % 24
    return remH > 0 ? `${days}d ${remH}h` : `${days}d`
  }

  scrollToTop(): void {
    const wrapper = document.querySelector('.main-wrapper')
    if (wrapper) {
      wrapper.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  getPercentage(value: number, total: number): number {
    if (!total || total <= 0) return 0
    return Math.min(100, Math.round((value / total) * 100))
  }
}
