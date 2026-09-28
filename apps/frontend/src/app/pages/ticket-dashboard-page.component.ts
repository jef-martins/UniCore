import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import {
  TicketsService,
  type TicketDashboardData,
  type TicketDetail,
  type TicketListItem,
  type TicketPriority,
  type TicketSectorStat,
  type TicketStatus,
} from '../services/tickets.service'

@Component({
  selector: 'app-ticket-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="dashboard-container">
      <!-- Cabeçalho -->
      <header class="dashboard-header">
        <div>
          <div class="dashboard-eyebrow">Administração & Inteligência Operacional</div>
          <h1 class="dashboard-title">Relatório de Chamados & Métricas</h1>
          <p class="dashboard-subtitle">
            Acompanhe o volume de solicitações, tempo médio de atendimento, taxa de resolução e visualize o relatório analítico dos chamados.
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="printReport()" title="Imprimir este relatório">
            <span>🖨️ Imprimir Relatório</span>
          </button>
          <a [routerLink]="isDeveloperRoute ? '/desenvolvedor/chamados' : '/chamados'" class="btn btn-primary">
            <span>🎫 Ir para Gestão de Chamados</span>
          </a>
        </div>
      </header>

      <!-- Barra de Filtros do Dashboard -->
      <section class="dashboard-filters">
        <div class="filter-group">
          <span class="filter-label">Período:</span>
          <div class="period-pills">
            <button
              class="pill-btn"
              [class.active]="selectedDays === 7"
              (click)="changePeriod(7)"
            >
              7 dias
            </button>
            <button
              class="pill-btn"
              [class.active]="selectedDays === 30"
              (click)="changePeriod(30)"
            >
              30 dias
            </button>
            <button
              class="pill-btn"
              [class.active]="selectedDays === 90"
              (click)="changePeriod(90)"
            >
              90 dias
            </button>
            <button
              class="pill-btn"
              [class.active]="selectedDays === 0"
              (click)="changePeriod(0)"
            >
              Todos
            </button>
          </div>
        </div>

        <div class="filter-group">
          <span class="filter-label">Filtrar por Setor:</span>
          <select [(ngModel)]="selectedSector" (change)="loadDashboard()" class="sector-dropdown">
            <option value="">Todos os Setores</option>
            <option *ngFor="let s of sectorOptions" [value]="s.value">{{ s.label }}</option>
          </select>
          <button class="btn btn-icon-only" (click)="loadDashboard()" title="Atualizar dados">
            🔄
          </button>
        </div>
      </section>

      <!-- Carregando -->
      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Calculando métricas operacionais e gerando relatório...</p>
      </div>

      <div *ngIf="!isLoading && data" class="dashboard-content">
        <!-- Linha 1: Cards Principais de Indicadores (KPIs) - Filtro direto no relatório (Sem redirecionar) -->
        <section class="kpi-grid" role="region" aria-label="Indicadores principais">
          <button
            type="button"
            class="kpi-card total-card kpi-clickable"
            [class.active-kpi]="selectedReportStatus === ''"
            (click)="filterReportByStatus('')"
            title="Clique para filtrar o relatório abaixo por todos os chamados"
          >
            <div class="kpi-header">
              <span class="kpi-title">Total de Chamados</span>
              <span class="kpi-icon">📋</span>
            </div>
            <div class="kpi-value">{{ data.overview.total }}</div>
            <div class="kpi-sub">
              <span>{{ selectedDays === 0 ? 'Todo o histórico' : 'Últimos ' + selectedDays + ' dias' }}</span>
              <span class="kpi-active-badge" *ngIf="selectedReportStatus === ''">● Filtrando Todos</span>
              <span class="kpi-click-hint" *ngIf="selectedReportStatus !== ''">Clique para filtrar</span>
            </div>
          </button>

          <button
            type="button"
            class="kpi-card abertos-card kpi-clickable"
            [class.active-kpi]="selectedReportStatus === 'ABERTO'"
            (click)="filterReportByStatus('ABERTO')"
            title="Clique para filtrar o relatório abaixo por chamados abertos"
          >
            <div class="kpi-header">
              <span class="kpi-title">Chamados Abertos</span>
              <span class="kpi-icon">⏳</span>
            </div>
            <div class="kpi-value text-blue">{{ data.overview.abertos }}</div>
            <div class="kpi-sub">
              <span class="kpi-pct">{{ getPercentage(data.overview.abertos, data.overview.total) }}%</span> do total
              <span class="kpi-active-badge" *ngIf="selectedReportStatus === 'ABERTO'">● Filtrando Abertos</span>
              <span class="kpi-click-hint" *ngIf="selectedReportStatus !== 'ABERTO'">Clique para filtrar</span>
            </div>
          </button>

          <button
            type="button"
            class="kpi-card andamento-card kpi-clickable"
            [class.active-kpi]="selectedReportStatus === 'EM_ANDAMENTO'"
            (click)="filterReportByStatus('EM_ANDAMENTO')"
            title="Clique para filtrar o relatório abaixo por chamados em atendimento"
          >
            <div class="kpi-header">
              <span class="kpi-title">Em Atendimento</span>
              <span class="kpi-icon">⚙️</span>
            </div>
            <div class="kpi-value text-amber">{{ data.overview.emAndamento }}</div>
            <div class="kpi-sub">
              <span class="kpi-pct">{{ getPercentage(data.overview.emAndamento, data.overview.total) }}%</span> em progresso
              <span class="kpi-active-badge" *ngIf="selectedReportStatus === 'EM_ANDAMENTO'">● Filtrando Atendimento</span>
              <span class="kpi-click-hint" *ngIf="selectedReportStatus !== 'EM_ANDAMENTO'">Clique para filtrar</span>
            </div>
          </button>

          <button
            type="button"
            class="kpi-card concluidos-card kpi-clickable"
            [class.active-kpi]="selectedReportStatus === 'CONCLUIDOS_FINALIZADOS'"
            (click)="filterReportByStatus('CONCLUIDOS_FINALIZADOS')"
            title="Clique para filtrar o relatório abaixo por chamados concluídos e finalizados"
          >
            <div class="kpi-header">
              <span class="kpi-title">Concluídos / Finalizados</span>
              <span class="kpi-icon">✅</span>
            </div>
            <div class="kpi-value text-green">{{ data.overview.concluidos + data.overview.finalizados }}</div>
            <div class="kpi-sub">
              <span>{{ data.overview.concluidos }} concluídos • {{ data.overview.finalizados }} finalizados</span>
              <span class="kpi-active-badge" *ngIf="selectedReportStatus === 'CONCLUIDOS_FINALIZADOS'">● Filtrando Concluídos</span>
              <span class="kpi-click-hint" *ngIf="selectedReportStatus !== 'CONCLUIDOS_FINALIZADOS'">Clique para filtrar</span>
            </div>
          </button>

          <div class="kpi-card taxa-card">
            <div class="kpi-header">
              <span class="kpi-title">Taxa de Resolução</span>
              <span class="kpi-icon">🎯</span>
            </div>
            <div class="kpi-value text-purple">{{ data.overview.taxaResolucao }}%</div>
            <div class="progress-bar-wrap">
              <div class="progress-bar-fill" [style.width.%]="data.overview.taxaResolucao"></div>
            </div>
          </div>

          <div class="kpi-card tempo-card">
            <div class="kpi-header">
              <span class="kpi-title">Tempo Médio de Resolução</span>
              <span class="kpi-icon">⏱️</span>
            </div>
            <div class="kpi-value text-cyan">
              {{ formatTempoMedio(data.overview.tempoMedioHoras) }}
            </div>
            <div class="kpi-sub">
              <span>Entre abertura e conclusão</span>
            </div>
          </div>
        </section>

        <!-- ================= SEÇÃO PRINCIPAL: RELATÓRIO ANALÍTICO DE CHAMADOS ================= -->
        <section class="chart-card full-width report-container-card" id="relatorio-analitico">
          <div class="report-section-header">
            <div>
              <div class="report-badge">Visão Analítica de Relatório</div>
              <h2 class="chart-card-title">Relatório Detalhado de Chamados</h2>
              <p class="chart-card-sub">
                Registros operacionais em formato de relatório. Filtre por status através dos cards acima ou faça buscas detalhadas.
              </p>
            </div>
            <div class="header-right report-actions-bar">
              <button type="button" class="btn btn-outline btn-sm" (click)="exportReportCsv()" title="Exportar dados em formato CSV">
                <span>📥 Exportar CSV</span>
              </button>
              <button type="button" class="btn btn-outline btn-sm" (click)="printReport()" title="Imprimir visualização do relatório">
                <span>🖨️ Imprimir Relatório</span>
              </button>
            </div>
          </div>

          <!-- Barra de Filtros Internos do Relatório -->
          <div class="report-filter-bar">
            <!-- Filtrozinho de número de chamado -->
            <div class="code-filter-box" title="Filtrar por número do chamado (ex: 10 ou #10)">
              <span class="code-filter-prefix">#</span>
              <input
                type="text"
                class="code-filter-input"
                placeholder="Nº Chamado"
                [(ngModel)]="reportFilterCode"
                (input)="applyReportFilters()"
              />
              <button *ngIf="reportFilterCode" class="clear-search-btn" (click)="reportFilterCode = ''; applyReportFilters()">✕</button>
            </div>

            <div class="report-search-box">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                class="report-search-input"
                placeholder="Buscar por assunto, descrição ou solicitante..."
                [(ngModel)]="reportSearchTerm"
                (input)="applyReportFilters()"
              />
              <button *ngIf="reportSearchTerm" class="clear-search-btn" (click)="reportSearchTerm = ''; applyReportFilters()">✕</button>
            </div>

            <div class="report-filter-controls">
              <select [(ngModel)]="reportSectorFilter" (change)="applyReportFilters()" class="report-filter-select">
                <option value="">Todos os Setores</option>
                <option *ngFor="let s of sectorOptions" [value]="s.value">{{ s.label }}</option>
              </select>

              <select [(ngModel)]="reportPriorityFilter" (change)="applyReportFilters()" class="report-filter-select">
                <option value="">Todas as Prioridades</option>
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>

              <select [(ngModel)]="selectedReportStatus" (change)="applyReportFilters()" class="report-filter-select">
                <option value="">Todos os Status</option>
                <option value="ABERTO">Abertos</option>
                <option value="EM_ANDAMENTO">Em Atendimento</option>
                <option value="CONCLUIDO">Concluídos</option>
                <option value="FINALIZADO">Finalizados</option>
                <option value="CONCLUIDOS_FINALIZADOS">Concluídos + Finalizados</option>
                <option value="CANCELADO">Cancelados</option>
              </select>

              <button type="button" class="btn btn-outline btn-sm" (click)="resetReportFilters()" title="Limpar todos os filtros do relatório">
                🔄 Limpar Filtros
              </button>
            </div>
          </div>

          <!-- Indicador de Filtro Ativo no Relatório -->
          <div class="report-active-status-bar">
            <div class="status-indicator-left">
              <span class="indicator-icon">🎯</span>
              <span>
                Filtro Ativo: <strong>{{ getReportStatusFilterLabel() }}</strong>
                <span class="report-count-tag">({{ filteredReportTickets.length }} chamado(s) listado(s))</span>
              </span>
            </div>
            <button
              type="button"
              class="btn-clear-filter"
              *ngIf="selectedReportStatus || reportSearchTerm || reportSectorFilter || reportPriorityFilter"
              (click)="resetReportFilters()"
            >
              ✕ Mostrar Todos
            </button>
          </div>

          <!-- Tabela do Relatório -->
          <div class="table-responsive" *ngIf="filteredReportTickets.length > 0">
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 80px;">Código</th>
                  <th>Assunto & Detalhes</th>
                  <th style="width: 140px;">Setor</th>
                  <th style="width: 160px;">Solicitante</th>
                  <th style="width: 150px;">Responsável</th>
                  <th style="width: 110px;">Prioridade</th>
                  <th style="width: 140px;">Status</th>
                  <th style="width: 120px;">Abertura</th>
                  <th style="width: 120px;">Conclusão</th>
                  <th style="width: 110px; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let t of filteredReportTickets"
                  class="report-row"
                  (click)="openReportTicketModal(t.id)"
                  title="Clique para visualizar o relatório completo deste chamado"
                >
                  <td>
                    <span class="code-pill">#{{ t.code }}</span>
                  </td>
                  <td>
                    <div class="report-title-cell">
                      <div class="report-title-text">{{ t.title }}</div>
                      <div class="report-desc-snippet">{{ t.description }}</div>
                    </div>
                  </td>
                  <td>
                    <span class="sector-tag">{{ t.sectorLabel }}</span>
                  </td>
                  <td>
                    <div class="user-inline">
                      <span class="user-avatar-tiny">{{ t.user.username.slice(0, 2).toUpperCase() }}</span>
                      <div class="user-details-mini">
                        <span class="user-name">{{ t.user.username }}</span>
                        <span class="user-role-mini">{{ formatRole(t.user.role) }}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="assigned-tag" *ngIf="t.status !== 'ABERTO' && t.assignedTo">
                      ⭐ {{ t.assignedTo.username }}
                    </span>
                    <span class="text-muted" *ngIf="t.status === 'ABERTO' || !t.assignedTo">Aguardando atendimento</span>
                  </td>
                  <td>
                    <span class="priority-pill" [ngClass]="'p-' + t.priority.toLowerCase()">
                      {{ getPriorityLabel(t.priority) }}
                    </span>
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="'st-' + t.status.toLowerCase()">
                      <span class="status-dot"></span>
                      {{ formatStatus(t.status) }}
                    </span>
                  </td>
                  <td style="color: #A1A1AA; font-size: 0.8rem;">
                    {{ t.createdAt | date:'dd/MM/yyyy HH:mm' }}
                  </td>
                  <td style="color: #A1A1AA; font-size: 0.8rem;">
                    <span *ngIf="t.closedAt">{{ t.closedAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    <span class="text-muted" *ngIf="!t.closedAt">-</span>
                  </td>
                  <td style="text-align: right;" (click)="$event.stopPropagation()">
                    <button class="btn btn-sm btn-action" (click)="openReportTicketModal(t.id)">
                      Visualizar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Estado Vazio do Relatório -->
          <div class="report-empty" *ngIf="filteredReportTickets.length === 0">
            <span class="empty-icon">📂</span>
            <h4>Nenhum chamado corresponde aos filtros do relatório</h4>
            <p>Tente alterar o status selecionado nos cards ou limpar os filtros de busca.</p>
            <button class="btn btn-sm btn-outline" (click)="resetReportFilters()">Limpar Filtros</button>
          </div>
        </section>

        <!-- Linha 2: Distribuição por Status & Distribuição por Prioridade -->
        <section class="charts-row">
          <!-- Gráfico de Status -->
          <div class="chart-card">
            <div class="chart-card-header">
              <div>
                <h3 class="chart-card-title">Distribuição por Status</h3>
                <p class="chart-card-sub">Visão consolidada do ciclo de vida dos chamados</p>
              </div>
            </div>

            <div class="status-bars-container">
              <div class="status-bar-item" (click)="filterReportByStatus('ABERTO')" style="cursor: pointer;" title="Filtrar abertos no relatório">
                <div class="bar-info">
                  <span class="bar-label">
                    <span class="color-dot bg-blue"></span> Aberto (Aguardando)
                  </span>
                  <span class="bar-counts">{{ data.overview.abertos }} ({{ getPercentage(data.overview.abertos, data.overview.total) }}%)</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill bg-blue" [style.width.%]="getPercentage(data.overview.abertos, data.overview.total)"></div>
                </div>
              </div>

              <div class="status-bar-item" (click)="filterReportByStatus('EM_ANDAMENTO')" style="cursor: pointer;" title="Filtrar em atendimento no relatório">
                <div class="bar-info">
                  <span class="bar-label">
                    <span class="color-dot bg-amber"></span> Em Atendimento (Desenvolvedor)
                  </span>
                  <span class="bar-counts">{{ data.overview.emAndamento }} ({{ getPercentage(data.overview.emAndamento, data.overview.total) }}%)</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill bg-amber" [style.width.%]="getPercentage(data.overview.emAndamento, data.overview.total)"></div>
                </div>
              </div>

              <div class="status-bar-item" (click)="filterReportByStatus('CONCLUIDO')" style="cursor: pointer;" title="Filtrar concluídos no relatório">
                <div class="bar-info">
                  <span class="bar-label">
                    <span class="color-dot bg-green"></span> Concluído
                  </span>
                  <span class="bar-counts">{{ data.overview.concluidos }} ({{ getPercentage(data.overview.concluidos, data.overview.total) }}%)</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill bg-green" [style.width.%]="getPercentage(data.overview.concluidos, data.overview.total)"></div>
                </div>
              </div>

              <div class="status-bar-item" (click)="filterReportByStatus('FINALIZADO')" style="cursor: pointer;" title="Filtrar finalizados no relatório">
                <div class="bar-info">
                  <span class="bar-label">
                    <span class="color-dot bg-purple"></span> Finalizado
                  </span>
                  <span class="bar-counts">{{ data.overview.finalizados }} ({{ getPercentage(data.overview.finalizados, data.overview.total) }}%)</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill bg-purple" [style.width.%]="getPercentage(data.overview.finalizados, data.overview.total)"></div>
                </div>
              </div>

              <div class="status-bar-item" *ngIf="data.overview.cancelados > 0" (click)="filterReportByStatus('CANCELADO')" style="cursor: pointer;" title="Filtrar cancelados no relatório">
                <div class="bar-info">
                  <span class="bar-label">
                    <span class="color-dot bg-red"></span> Cancelado
                  </span>
                  <span class="bar-counts">{{ data.overview.cancelados }} ({{ getPercentage(data.overview.cancelados, data.overview.total) }}%)</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill bg-red" [style.width.%]="getPercentage(data.overview.cancelados, data.overview.total)"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Gráfico por Prioridade -->
          <div class="chart-card">
            <div class="chart-card-header">
              <div>
                <h3 class="chart-card-title">Chamados por Prioridade</h3>
                <p class="chart-card-sub">Nível de criticidade e resoluções</p>
              </div>
            </div>

            <div class="priority-cards-grid">
              <div class="priority-card p-urgente-card" (click)="reportPriorityFilter = 'URGENTE'; applyReportFilters()" style="cursor: pointer;" title="Filtrar urgentes no relatório">
                <div class="p-card-top">
                  <span class="p-card-badge">Urgente</span>
                  <span class="p-card-total">{{ data.porPrioridade.URGENTE.total }}</span>
                </div>
                <div class="p-card-stats">
                  <span>{{ data.porPrioridade.URGENTE.resolvidos }} resolvidos</span>
                  <span>{{ data.porPrioridade.URGENTE.pendentes }} pendentes</span>
                </div>
                <div class="bar-track">
                  <div
                    class="bar-fill bg-red"
                    [style.width.%]="getPercentage(data.porPrioridade.URGENTE.resolvidos, data.porPrioridade.URGENTE.total)"
                  ></div>
                </div>
              </div>

              <div class="priority-card p-alta-card" (click)="reportPriorityFilter = 'ALTA'; applyReportFilters()" style="cursor: pointer;" title="Filtrar alta no relatório">
                <div class="p-card-top">
                  <span class="p-card-badge">Alta</span>
                  <span class="p-card-total">{{ data.porPrioridade.ALTA.total }}</span>
                </div>
                <div class="p-card-stats">
                  <span>{{ data.porPrioridade.ALTA.resolvidos }} resolvidos</span>
                  <span>{{ data.porPrioridade.ALTA.pendentes }} pendentes</span>
                </div>
                <div class="bar-track">
                  <div
                    class="bar-fill bg-orange"
                    [style.width.%]="getPercentage(data.porPrioridade.ALTA.resolvidos, data.porPrioridade.ALTA.total)"
                  ></div>
                </div>
              </div>

              <div class="priority-card p-media-card" (click)="reportPriorityFilter = 'MEDIA'; applyReportFilters()" style="cursor: pointer;" title="Filtrar média no relatório">
                <div class="p-card-top">
                  <span class="p-card-badge">Média</span>
                  <span class="p-card-total">{{ data.porPrioridade.MEDIA.total }}</span>
                </div>
                <div class="p-card-stats">
                  <span>{{ data.porPrioridade.MEDIA.resolvidos }} resolvidos</span>
                  <span>{{ data.porPrioridade.MEDIA.pendentes }} pendentes</span>
                </div>
                <div class="bar-track">
                  <div
                    class="bar-fill bg-sky"
                    [style.width.%]="getPercentage(data.porPrioridade.MEDIA.resolvidos, data.porPrioridade.MEDIA.total)"
                  ></div>
                </div>
              </div>

              <div class="priority-card p-baixa-card" (click)="reportPriorityFilter = 'BAIXA'; applyReportFilters()" style="cursor: pointer;" title="Filtrar baixa no relatório">
                <div class="p-card-top">
                  <span class="p-card-badge">Baixa</span>
                  <span class="p-card-total">{{ data.porPrioridade.BAIXA.total }}</span>
                </div>
                <div class="p-card-stats">
                  <span>{{ data.porPrioridade.BAIXA.resolvidos }} resolvidos</span>
                  <span>{{ data.porPrioridade.BAIXA.pendentes }} pendentes</span>
                </div>
                <div class="bar-track">
                  <div
                    class="bar-fill bg-slate"
                    [style.width.%]="getPercentage(data.porPrioridade.BAIXA.resolvidos, data.porPrioridade.BAIXA.total)"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Linha 3: Tabela de Desempenho e Volumetria por Setor -->
        <section class="chart-card full-width">
          <div class="chart-card-header">
            <div>
              <h3 class="chart-card-title">Métricas de Chamados por Setor</h3>
              <p class="chart-card-sub">Volumetria de solicitações abertas por setor da instituição</p>
            </div>
          </div>

          <div class="table-responsive">
            <table class="metrics-table">
              <thead>
                <tr>
                  <th>Setor</th>
                  <th style="text-align: center;">Total</th>
                  <th style="text-align: center;">Abertos</th>
                  <th style="text-align: center;">Em Atendimento</th>
                  <th style="text-align: center;">Concluídos / Finalizados</th>
                  <th style="width: 200px;">Progresso de Resolução</th>
                  <th style="text-align: right;">Taxa</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of data.porSetor">
                  <td>
                    <span class="sector-tag">{{ s.label }}</span>
                  </td>
                  <td style="text-align: center; font-weight: 700;">{{ s.total }}</td>
                  <td style="text-align: center;">
                    <span class="badge-num text-blue" *ngIf="s.abertos > 0">{{ s.abertos }}</span>
                    <span class="text-muted" *ngIf="s.abertos === 0">-</span>
                  </td>
                  <td style="text-align: center;">
                    <span class="badge-num text-amber" *ngIf="s.emAndamento > 0">{{ s.emAndamento }}</span>
                    <span class="text-muted" *ngIf="s.emAndamento === 0">-</span>
                  </td>
                  <td style="text-align: center;">
                    <span class="badge-num text-green" *ngIf="(s.concluidos + s.finalizados) > 0">
                      {{ s.concluidos + s.finalizados }}
                    </span>
                    <span class="text-muted" *ngIf="(s.concluidos + s.finalizados) === 0">-</span>
                  </td>
                  <td>
                    <div class="bar-track">
                      <div class="bar-fill bg-green" [style.width.%]="s.taxaResolucao"></div>
                    </div>
                  </td>
                  <td style="text-align: right; font-weight: 700;">
                    <span [class.text-green]="s.taxaResolucao >= 70" [class.text-amber]="s.taxaResolucao < 70 && s.taxaResolucao > 0">
                      {{ s.taxaResolucao }}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Linha 4: Chamados Recentes com Ação de Visualização sem Redirecionar -->
        <section class="chart-card full-width" *ngIf="data.recentes && data.recentes.length > 0">
          <div class="chart-card-header">
            <div>
              <h3 class="chart-card-title">Chamados Recentes</h3>
              <p class="chart-card-sub">Últimos chamados registrados no sistema</p>
            </div>
            <button type="button" class="btn btn-sm btn-outline" (click)="resetReportFilters()">
              Ver Todos no Relatório ↓
            </button>
          </div>

          <div class="table-responsive">
            <table class="metrics-table">
              <thead>
                <tr>
                  <th style="width: 80px;">Código</th>
                  <th>Assunto</th>
                  <th>Setor</th>
                  <th>Solicitante</th>
                  <th>Prioridade</th>
                  <th>Status</th>
                  <th>Abertura</th>
                  <th style="text-align: right;">Ação</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of data.recentes" (click)="openReportTicketModal(t.id)" style="cursor: pointer;">
                  <td>
                    <span class="code-pill">#{{ t.code }}</span>
                  </td>
                  <td style="font-weight: 600; color: #fff;">{{ t.title }}</td>
                  <td>
                    <span class="sector-tag">{{ t.sectorLabel }}</span>
                  </td>
                  <td>{{ t.user.username }}</td>
                  <td>
                    <span class="priority-pill" [ngClass]="'p-' + t.priority.toLowerCase()">
                      {{ getPriorityLabel(t.priority) }}
                    </span>
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="'st-' + t.status.toLowerCase()">
                      {{ formatStatus(t.status) }}
                    </span>
                  </td>
                  <td style="color: #A1A1AA; font-size: 0.8rem;">
                    {{ t.createdAt | date:'dd/MM/yyyy HH:mm' }}
                  </td>
                  <td style="text-align: right;" (click)="$event.stopPropagation()">
                    <button class="btn btn-sm btn-action" (click)="openReportTicketModal(t.id)">
                      Visualizar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- ================= MODAL DETALHES DO RELATÓRIO ================= -->
      <div class="modal-overlay" *ngIf="isReportModalOpen" (click)="closeReportTicketModal()">
        <div class="modal-box modal-detail" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div class="detail-header-info">
              <div class="code-and-status">
                <span class="code-badge-large">#{{ selectedReportTicket?.code }}</span>
                <span class="status-badge" [ngClass]="'st-' + (selectedReportTicket?.status?.toLowerCase() || '')">
                  <span class="status-dot"></span>
                  {{ formatStatus(selectedReportTicket?.status || '') }}
                </span>
                <span class="priority-badge" [ngClass]="'p-' + (selectedReportTicket?.priority?.toLowerCase() || '')">
                  {{ getPriorityLabel(selectedReportTicket?.priority || '') }}
                </span>
              </div>
              <h2 class="modal-title">{{ selectedReportTicket?.title }}</h2>
            </div>
            <button class="modal-close-btn" (click)="closeReportTicketModal()">✕</button>
          </header>

          <div class="modal-body detail-body" *ngIf="selectedReportTicket">
            <!-- Metadados -->
            <div class="detail-meta-grid">
              <div class="meta-item">
                <span class="meta-label">Setor</span>
                <span class="meta-value">{{ selectedReportTicket.sectorLabel }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Solicitante</span>
                <span class="meta-value font-medium">{{ selectedReportTicket.user.username }}</span>
                <span class="meta-sub">({{ formatRole(selectedReportTicket.user.role) }})</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Desenvolvedor Responsável</span>
                <span class="meta-value font-medium" *ngIf="selectedReportTicket.status !== 'ABERTO' && selectedReportTicket.assignedTo">
                  ⭐ {{ selectedReportTicket.assignedTo.username }}
                </span>
                <span class="meta-value text-muted" *ngIf="selectedReportTicket.status === 'ABERTO' || !selectedReportTicket.assignedTo">
                  Aguardando início do atendimento
                </span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Aberto em</span>
                <span class="meta-value">{{ selectedReportTicket.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <div class="meta-item" *ngIf="selectedReportTicket.closedAt">
                <span class="meta-label">Concluído em</span>
                <span class="meta-value">{{ selectedReportTicket.closedAt | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
            </div>

            <!-- Avisos de Status e Inatividade no Relatório -->
            <div class="ticket-status-info-box awaiting-box" *ngIf="selectedReportTicket.status === 'ABERTO'">
              <span class="info-icon">⏳</span>
              <div class="info-content">
                <strong>Aguardando início do atendimento:</strong>
                <span>Chamado em fila de triagem. O desenvolvedor responsável será exibido assim que o atendimento for iniciado.</span>
              </div>
            </div>
            <div class="ticket-status-info-box" *ngIf="selectedReportTicket.status === 'EM_ANDAMENTO'">
              <span class="info-icon">⏱️</span>
              <div class="info-content">
                <strong>Atendimento em andamento:</strong>
                <span>Chamado em atendimento pelo desenvolvedor. Chamados aguardando interação do usuário final por 5 dias serão fechados automaticamente.</span>
              </div>
            </div>

            <!-- Descrição -->
            <div class="detail-section">
              <h3 class="section-title">Descrição da Solicitação</h3>
              <div class="detail-description-box">
                {{ selectedReportTicket.description }}
              </div>
            </div>

            <!-- Anexos -->
            <div class="detail-section" *ngIf="selectedReportTicket.attachments && selectedReportTicket.attachments.length > 0">
              <h3 class="section-title">Anexos do Chamado ({{ selectedReportTicket.attachments.length }})</h3>
              <div class="attachments-grid">
                <div class="attachment-card" *ngFor="let att of selectedReportTicket.attachments">
                  <span class="att-icon">📎</span>
                  <div class="att-info">
                    <span class="att-name" [title]="att.fileName">{{ att.fileName }}</span>
                    <span class="att-size">{{ formatBytes(att.fileSize) }}</span>
                  </div>
                  <button class="btn btn-sm btn-outline" (click)="downloadAttachment(att.id, att.fileName)">
                    Baixar
                  </button>
                </div>
              </div>
            </div>

            <!-- Resolução -->
            <div class="detail-section" *ngIf="selectedReportTicket.resolutionNotes">
              <h3 class="section-title">Notas de Resolução</h3>
              <div class="resolution-box">
                {{ selectedReportTicket.resolutionNotes }}
              </div>
            </div>

            <!-- Gestão de Status pelo Relatório -->
            <div class="detail-section status-flow-section">
              <h3 class="section-title master-title">
                <span>⚡ Atualização de Status</span>
                <span class="master-badge">Interação Direta</span>
              </h3>
              <p class="master-desc">
                Status atual: <strong>{{ formatStatus(selectedReportTicket.status) }}</strong>. Alterar status diretamente no relatório:
              </p>
              <div class="status-action-grid">
                <button
                  type="button"
                  class="btn-status-pill status-pill-aberto"
                  [class.is-current]="selectedReportTicket.status === 'ABERTO'"
                  [disabled]="isUpdatingReportStatus || (isTicketClosed(selectedReportTicket) && !canReopenTicket(selectedReportTicket))"
                  (click)="updateReportStatus('ABERTO')"
                  [title]="isTicketClosed(selectedReportTicket) && !canReopenTicket(selectedReportTicket) ? 'Prazo de reabertura expirado (limite de 5 dias após encerramento)' : 'Definir como Pendente / Aberto'"
                >
                  <span class="status-btn-icon">⏳</span>
                  <div class="status-btn-text">
                    <span class="status-btn-name">Pendente / Aberto</span>
                    <span class="status-btn-sub" *ngIf="isTicketClosed(selectedReportTicket) && !canReopenTicket(selectedReportTicket)">
                      Reabertura expirada (>5d)
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  class="btn-status-pill status-pill-andamento"
                  [class.is-current]="selectedReportTicket.status === 'EM_ANDAMENTO'"
                  [disabled]="isUpdatingReportStatus"
                  (click)="updateReportStatus('EM_ANDAMENTO')"
                >
                  <span class="status-btn-icon">⚙️</span>
                  <div class="status-btn-text">
                    <span class="status-btn-name">Em Atendimento</span>
                  </div>
                </button>

                <button
                  type="button"
                  class="btn-status-pill status-pill-concluido"
                  [class.is-current]="selectedReportTicket.status === 'CONCLUIDO'"
                  [disabled]="isUpdatingReportStatus"
                  (click)="promptConcludeReportTicket('CONCLUIDO')"
                >
                  <span class="status-btn-icon">✅</span>
                  <div class="status-btn-text">
                    <span class="status-btn-name">Concluído</span>
                  </div>
                </button>

                <button
                  type="button"
                  class="btn-status-pill status-pill-finalizado"
                  [class.is-current]="selectedReportTicket.status === 'FINALIZADO'"
                  [disabled]="isUpdatingReportStatus"
                  (click)="promptConcludeReportTicket('FINALIZADO')"
                >
                  <span class="status-btn-icon">🏁</span>
                  <div class="status-btn-text">
                    <span class="status-btn-name">Finalizado</span>
                  </div>
                </button>

                <button
                  type="button"
                  class="btn-status-pill status-pill-cancelado"
                  [class.is-current]="selectedReportTicket.status === 'CANCELADO'"
                  [disabled]="isUpdatingReportStatus"
                  (click)="updateReportStatus('CANCELADO')"
                >
                  <span class="status-btn-icon">❌</span>
                  <div class="status-btn-text">
                    <span class="status-btn-name">Cancelado</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Timeline de Mensagens -->
            <div class="detail-section">
              <h3 class="section-title">
                Histórico de Mensagens & Interações ({{ selectedReportTicket.messages ? selectedReportTicket.messages.length : 0 }})
              </h3>
              <div class="messages-timeline">
                <div *ngIf="!selectedReportTicket.messages || selectedReportTicket.messages.length === 0" class="no-messages">
                  Nenhuma mensagem registrada até o momento neste chamado.
                </div>
                <div *ngFor="let msg of selectedReportTicket.messages" class="message-bubble-wrapper">
                  <div class="msg-header">
                    <span class="msg-author">{{ msg.user ? msg.user.username : 'Usuário' }}</span>
                    <span class="msg-time">{{ msg.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                  <div class="msg-content">{{ msg.message }}</div>
                  <div class="msg-status-change" *ngIf="msg.statusChange">
                    Status alterado para: <strong>{{ formatStatus(msg.statusChange) }}</strong>
                  </div>
                </div>
              </div>

              <!-- Envio de Mensagem no Modal do Relatório -->
              <form (submit)="sendReportMessage($event)" class="message-input-form" *ngIf="selectedReportTicket.status !== 'CANCELADO'">
                <div class="msg-input-wrap">
                  <textarea
                    class="msg-textarea"
                    rows="2"
                    placeholder="Adicionar resposta ou nota técnica no chamado..."
                    [(ngModel)]="reportReplyText"
                    name="reportReplyText"
                    required
                  ></textarea>
                  <div class="msg-form-bottom">
                    <div class="msg-status-change-opt">
                      <select [(ngModel)]="reportStatusChange" name="reportStatusChange" class="st-opt-select">
                        <option value="">Manter status atual</option>
                        <option value="ABERTO" *ngIf="!isTicketClosed(selectedReportTicket) || canReopenTicket(selectedReportTicket)">Pendente / Aberto</option>
                        <option value="EM_ANDAMENTO">Em Atendimento</option>
                        <option value="CONCLUIDO">Concluído</option>
                        <option value="FINALIZADO">Finalizado</option>
                        <option value="CANCELADO">Cancelado</option>
                      </select>
                    </div>
                    <button type="submit" class="btn btn-primary btn-sm" [disabled]="isSendingReportMessage || !reportReplyText.trim()">
                      <span>{{ isSendingReportMessage ? 'Enviando...' : 'Responder' }}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <footer class="modal-footer">
            <button class="btn btn-outline" (click)="closeReportTicketModal()">Fechar Relatório</button>
          </footer>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 1.5rem 2rem 3rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Cabeçalho */
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.75rem;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .dashboard-eyebrow {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #93C5FD;
      margin-bottom: 0.4rem;
    }
    .dashboard-title {
      font-size: 2rem;
      font-weight: 700;
      color: #fff;
      margin: 0 0 0.35rem 0;
    }
    .dashboard-subtitle {
      color: #A1A1AA;
      font-size: 0.95rem;
      margin: 0;
      max-width: 700px;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    /* Filtros do Dashboard */
    .dashboard-filters {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      background: var(--color-surface, #18181B);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 10px;
      padding: 0.75rem 1.25rem;
      margin-bottom: 1.75rem;
      flex-wrap: wrap;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .filter-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #A1A1AA;
    }
    .period-pills {
      display: flex;
      background: rgba(255, 255, 255, 0.04);
      padding: 0.2rem;
      border-radius: 8px;
      gap: 0.2rem;
    }
    .pill-btn {
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      background: none;
      border: none;
      color: #A1A1AA;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .pill-btn:hover { color: #fff; }
    .pill-btn.active {
      background: #3B82F6;
      color: #fff;
    }
    .sector-dropdown {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color, #3F3F46);
      color: #fff;
      padding: 0.45rem 0.85rem;
      border-radius: 8px;
      font-size: 0.85rem;
      outline: none;
      cursor: pointer;
    }
    .sector-dropdown option { background: #18181B; }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.75rem;
    }
    .kpi-card {
      background: var(--color-surface, #18181B);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 12px;
      padding: 1.15rem 1.25rem;
      display: flex;
      flex-direction: column;
      text-align: left;
      width: 100%;
      font-family: inherit;
      gap: 0.4rem;
      outline: none;
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      border-color: #3F3F46;
    }
    .kpi-clickable {
      cursor: pointer;
    }
    .kpi-clickable:hover {
      border-color: #3B82F6;
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.15);
    }
    .kpi-card.active-kpi {
      border-color: #3B82F6;
      background: rgba(59, 130, 246, 0.08);
      box-shadow: 0 0 16px rgba(59, 130, 246, 0.25);
    }
    .kpi-active-badge {
      display: inline-block;
      margin-left: 0.5rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: #60A5FA;
    }
    .kpi-click-hint {
      display: inline-block;
      margin-left: 0.5rem;
      font-size: 0.7rem;
      color: #A1A1AA;
      opacity: 0.75;
    }
    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
    .kpi-title {
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #A1A1AA;
    }
    .kpi-icon { font-size: 1.1rem; }
    .kpi-value {
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.1;
    }
    .kpi-sub {
      font-size: 0.78rem;
      color: #71717A;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
    .kpi-pct {
      font-weight: 700;
      color: #E4E4E7;
    }
    .progress-bar-wrap {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      overflow: hidden;
      margin-top: 0.4rem;
    }
    .progress-bar-fill {
      height: 100%;
      background: #8B5CF6;
      border-radius: 999px;
      transition: width 0.4s ease;
    }

    .text-blue { color: #60A5FA; }
    .text-amber { color: #FBBF24; }
    .text-green { color: #34D399; }
    .text-purple { color: #C084FC; }
    .text-cyan { color: #38BDF8; }

    /* ================= SEÇÃO DO RELATÓRIO ================= */
    .report-container-card {
      background: var(--color-surface, #18181B);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .report-section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .report-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #38BDF8;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      margin-bottom: 0.4rem;
    }
    .report-actions-bar {
      display: flex;
      gap: 0.6rem;
    }

    /* Barra de Filtros Interna */
    .report-filter-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .code-filter-box {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      width: 140px;
      position: relative;
    }
    .code-filter-prefix {
      color: #93C5FD;
      font-weight: 700;
      font-size: 0.95rem;
    }
    .code-filter-input {
      background: transparent;
      border: none;
      color: #fff;
      outline: none;
      width: 100%;
      font-size: 0.88rem;
      font-weight: 600;
    }
    .ticket-status-info-box {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.85rem 1.1rem;
      border-radius: 8px;
      background: rgba(234, 179, 8, 0.08);
      border: 1px solid rgba(234, 179, 8, 0.25);
      color: #FEF08A;
      font-size: 0.85rem;
      line-height: 1.45;
      margin-bottom: 1.25rem;
    }
    .ticket-status-info-box.awaiting-box {
      background: rgba(59, 130, 246, 0.08);
      border-color: rgba(59, 130, 246, 0.25);
      color: #BFDBFE;
    }
    .status-btn-sub {
      font-size: 0.65rem;
      color: #F87171;
      margin-top: 0.15rem;
      display: block;
    }
    .report-search-box {
      flex: 1;
      min-width: 260px;
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 0.85rem;
      color: #71717A;
      pointer-events: none;
    }
    .report-search-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #3F3F46);
      border-radius: 8px;
      padding: 0.55rem 2rem 0.55rem 2.4rem;
      color: #fff;
      font-size: 0.88rem;
      outline: none;
      box-sizing: border-box;
    }
    .report-search-input:focus {
      border-color: #3B82F6;
      background: rgba(255, 255, 255, 0.05);
    }
    .clear-search-btn {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      color: #A1A1AA;
      cursor: pointer;
    }
    .report-filter-controls {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .report-filter-select {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color, #3F3F46);
      border-radius: 8px;
      color: #E4E4E7;
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
      outline: none;
      cursor: pointer;
    }
    .report-filter-select option { background: #18181B; }

    /* Indicador de Status Ativo no Relatório */
    .report-active-status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 8px;
      padding: 0.6rem 1rem;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
      color: #93C5FD;
    }
    .status-indicator-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .filter-pill-label {
      background: rgba(59, 130, 246, 0.2);
      color: #fff;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-weight: 700;
      margin-left: 0.3rem;
    }
    .report-count-tag {
      color: #E4E4E7;
      font-weight: 600;
    }
    .btn-clear-filter {
      background: none;
      border: none;
      color: #93C5FD;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .btn-clear-filter:hover { text-decoration: underline; color: #fff; }

    /* Tabela do Relatório */
    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    .report-table th {
      text-align: left;
      padding: 0.75rem 1rem;
      color: #A1A1AA;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid var(--border-color, #27272A);
      background: rgba(255, 255, 255, 0.02);
    }
    .report-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      vertical-align: middle;
    }
    .report-row {
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .report-row:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    .report-title-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      max-width: 380px;
    }
    .report-title-text {
      font-weight: 600;
      color: #fff;
      font-size: 0.9rem;
    }
    .report-desc-snippet {
      color: #A1A1AA;
      font-size: 0.78rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .code-pill {
      background: rgba(255, 255, 255, 0.08);
      color: #E4E4E7;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-family: monospace;
      font-weight: 700;
      font-size: 0.82rem;
    }
    .sector-tag {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.78rem;
      color: #D4D4D8;
    }
    .user-inline {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .user-avatar-tiny {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #3B82F6;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.68rem;
      font-weight: 700;
    }
    .user-details-mini {
      display: flex;
      flex-direction: column;
    }
    .user-name { font-weight: 600; color: #fff; font-size: 0.82rem; }
    .user-role-mini { font-size: 0.7rem; color: #71717A; }
    .assigned-tag {
      font-size: 0.8rem;
      color: #FCD34D;
      font-weight: 500;
    }

    .priority-pill {
      display: inline-block;
      padding: 0.18rem 0.5rem;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .p-baixa { background: rgba(113, 113, 122, 0.2); color: #A1A1AA; border: 1px solid #3F3F46; }
    .p-media { background: rgba(56, 189, 248, 0.15); color: #7DD3FC; border: 1px solid rgba(56, 189, 248, 0.35); }
    .p-alta { background: rgba(249, 115, 22, 0.15); color: #FDBA74; border: 1px solid rgba(249, 115, 22, 0.4); }
    .p-urgente { background: rgba(239, 68, 68, 0.2); color: #FCA5A5; border: 1px solid rgba(239, 68, 68, 0.5); }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      white-space: nowrap;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .st-aberto { background: rgba(59, 130, 246, 0.15); color: #93C5FD; border: 1px solid rgba(59, 130, 246, 0.4); }
    .st-aberto .status-dot { background: #3B82F6; box-shadow: 0 0 6px #3B82F6; }
    .st-em_andamento { background: rgba(245, 158, 11, 0.15); color: #FCD34D; border: 1px solid rgba(245, 158, 11, 0.4); }
    .st-em_andamento .status-dot { background: #F59E0B; }
    .st-concluido { background: rgba(16, 185, 129, 0.15); color: #6EE7B7; border: 1px solid rgba(16, 185, 129, 0.4); }
    .st-concluido .status-dot { background: #10B981; }
    .st-finalizado { background: rgba(168, 85, 247, 0.15); color: #D8B4FE; border: 1px solid rgba(168, 85, 247, 0.4); }
    .st-finalizado .status-dot { background: #A855F7; }
    .st-cancelado { background: rgba(239, 68, 68, 0.15); color: #FCA5A5; border: 1px solid rgba(239, 68, 68, 0.4); }
    .st-cancelado .status-dot { background: #EF4444; }

    .report-empty {
      padding: 3rem 2rem;
      text-align: center;
      color: #A1A1AA;
    }
    .report-empty h4 { color: #fff; margin: 0.5rem 0 0.25rem 0; font-size: 1.1rem; }
    .report-empty p { margin-bottom: 1rem; font-size: 0.9rem; }

    /* Gráficos e Seções */
    .charts-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.75rem;
    }
    .chart-card {
      background: var(--color-surface, #18181B);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
    }
    .chart-card.full-width {
      margin-bottom: 1.75rem;
    }
    .chart-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .chart-card-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
      margin: 0 0 0.2rem 0;
    }
    .chart-card-sub {
      font-size: 0.8rem;
      color: #A1A1AA;
      margin: 0;
    }

    .status-bars-container {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .status-bar-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 0.4rem;
      border-radius: 6px;
      transition: background 0.15s ease;
    }
    .status-bar-item:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    .bar-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
    }
    .bar-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #E4E4E7;
    }
    .color-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .bar-counts {
      font-weight: 600;
      color: #A1A1AA;
    }
    .bar-track {
      width: 100%;
      height: 8px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 999px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.4s ease;
    }

    .bg-blue { background: #3B82F6; }
    .bg-amber { background: #F59E0B; }
    .bg-green { background: #10B981; }
    .bg-purple { background: #A855F7; }
    .bg-red { background: #EF4444; }
    .bg-orange { background: #F97316; }
    .bg-sky { background: #0EA5E9; }
    .bg-slate { background: #64748B; }

    .priority-cards-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    .priority-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 8px;
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      transition: transform 0.15s ease;
    }
    .priority-card:hover { transform: translateY(-1px); }
    .p-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .p-card-badge {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #A1A1AA;
    }
    .p-card-total {
      font-size: 1.25rem;
      font-weight: 800;
      color: #fff;
    }
    .p-card-stats {
      display: flex;
      justify-content: space-between;
      font-size: 0.72rem;
      color: #71717A;
    }

    .metrics-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    .metrics-table th {
      text-align: left;
      padding: 0.75rem 1rem;
      color: #A1A1AA;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid var(--border-color, #27272A);
    }
    .metrics-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      vertical-align: middle;
    }
    .badge-num {
      font-weight: 700;
      font-size: 0.9rem;
    }

    /* Modal de Detalhes no Relatório */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .modal-box {
      background: #18181B;
      border: 1px solid var(--border-color, #3F3F46);
      border-radius: 12px;
      width: 100%;
      max-width: 820px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      animation: modalFadeIn 0.2s ease-out;
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #27272A);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .code-and-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
      flex-wrap: wrap;
    }
    .code-badge-large {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      font-family: monospace;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.15rem 0.55rem;
      border-radius: 4px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .priority-badge {
      display: inline-block;
      padding: 0.18rem 0.5rem;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .modal-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #fff;
      margin: 0;
    }
    .modal-close-btn {
      background: none;
      border: none;
      color: #A1A1AA;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0.2rem;
    }
    .modal-close-btn:hover { color: #fff; }
    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }
    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color, #27272A);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .detail-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.85rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color, #27272A);
      padding: 0.85rem 1.15rem;
      border-radius: 8px;
      margin-bottom: 1.25rem;
    }
    .meta-item { display: flex; flex-direction: column; gap: 0.15rem; }
    .meta-label { font-size: 0.72rem; color: #A1A1AA; text-transform: uppercase; font-weight: 600; }
    .meta-value { font-size: 0.88rem; color: #fff; }
    .meta-sub { font-size: 0.72rem; color: #71717A; }
    .font-medium { font-weight: 600; }
    .text-muted { color: #A1A1AA; font-style: italic; }

    .detail-section { margin-bottom: 1.25rem; }
    .section-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #E4E4E7;
      margin: 0 0 0.5rem 0;
    }
    .detail-description-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 8px;
      padding: 0.85rem 1.1rem;
      color: #F4F4F5;
      font-size: 0.88rem;
      line-height: 1.55;
      white-space: pre-wrap;
    }

    .attachments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.6rem;
    }
    .attachment-card {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 6px;
    }
    .att-icon { font-size: 1.2rem; }
    .att-info { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
    .att-name { font-size: 0.82rem; color: #fff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .att-size { font-size: 0.72rem; color: #A1A1AA; }

    .resolution-box {
      background: rgba(16, 185, 129, 0.05);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 8px;
      padding: 0.85rem 1.1rem;
      color: #A7F3D0;
      font-size: 0.88rem;
    }

    /* Fluxo de Status no Modal do Relatório */
    .status-flow-section {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(168, 85, 247, 0.08));
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 10px;
      padding: 1rem 1.2rem;
    }
    .master-title { color: #93C5FD; display: flex; align-items: center; justify-content: space-between; }
    .master-badge {
      font-size: 0.68rem;
      background: #3B82F6;
      color: #fff;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      font-weight: 700;
    }
    .master-desc { font-size: 0.82rem; color: #A1A1AA; margin: 0 0 0.75rem 0; }
    .master-desc strong { color: #fff; }
    .status-action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 0.5rem;
    }
    .btn-status-pill {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 8px;
      padding: 0.5rem 0.65rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      font-family: inherit;
      color: #fff;
      transition: all 0.15s ease;
    }
    .btn-status-pill:hover:not(:disabled) {
      transform: translateY(-1px);
    }
    .btn-status-pill:disabled { opacity: 0.6; cursor: not-allowed; }
    .status-btn-name { font-size: 0.75rem; font-weight: 600; }
    .status-pill-aberto:hover { border-color: #3B82F6; }
    .status-pill-aberto.is-current { border-color: #3B82F6; background: rgba(59, 130, 246, 0.18); }
    .status-pill-andamento:hover { border-color: #F59E0B; }
    .status-pill-andamento.is-current { border-color: #F59E0B; background: rgba(245, 158, 11, 0.18); }
    .status-pill-concluido:hover { border-color: #10B981; }
    .status-pill-concluido.is-current { border-color: #10B981; background: rgba(16, 185, 129, 0.18); }
    .status-pill-finalizado:hover { border-color: #A855F7; }
    .status-pill-finalizado.is-current { border-color: #A855F7; background: rgba(168, 85, 247, 0.18); }
    .status-pill-cancelado:hover { border-color: #EF4444; }
    .status-pill-cancelado.is-current { border-color: #EF4444; background: rgba(239, 68, 68, 0.18); }

    .messages-timeline {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
      max-height: 250px;
      overflow-y: auto;
    }
    .no-messages {
      padding: 1rem;
      text-align: center;
      color: #71717A;
      font-size: 0.82rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 6px;
    }
    .message-bubble-wrapper {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 6px;
      padding: 0.65rem 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .msg-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
    }
    .msg-author { font-weight: 700; color: #fff; }
    .msg-time { color: #71717A; }
    .msg-content { color: #E4E4E7; font-size: 0.85rem; white-space: pre-wrap; }
    .msg-status-change {
      font-size: 0.72rem;
      color: #FBBF24;
      background: rgba(245, 158, 11, 0.1);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      width: fit-content;
    }

    .msg-input-wrap {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color, #3F3F46);
      border-radius: 8px;
      overflow: hidden;
    }
    .msg-textarea {
      width: 100%;
      background: transparent;
      border: none;
      color: #fff;
      padding: 0.65rem 0.85rem;
      font-size: 0.85rem;
      outline: none;
      box-sizing: border-box;
      resize: vertical;
    }
    .msg-form-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border-top: 1px solid var(--border-color, #27272A);
    }
    .st-opt-select {
      background: #18181B;
      border: 1px solid var(--border-color, #3F3F46);
      border-radius: 6px;
      color: #fff;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      outline: none;
    }

    /* Botões */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 1.15rem;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      border: none;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .btn-primary { background: #3B82F6; color: #fff; }
    .btn-primary:hover { background: #2563EB; }
    .btn-outline {
      background: transparent;
      border: 1px solid var(--border-color, #3F3F46);
      color: #E4E4E7;
    }
    .btn-outline:hover { background: rgba(255, 255, 255, 0.05); color: #fff; }
    .btn-sm { padding: 0.32rem 0.7rem; font-size: 0.8rem; }
    .btn-action {
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #93C5FD;
    }
    .btn-action:hover {
      background: rgba(59, 130, 246, 0.25);
      color: #fff;
    }
    .btn-icon-only {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color, #3F3F46);
      color: #fff;
      padding: 0.45rem 0.65rem;
      border-radius: 8px;
      cursor: pointer;
    }

    .loading-state {
      padding: 5rem 2rem;
      text-align: center;
      background: var(--color-surface, #18181B);
      border: 1px solid var(--border-color, #27272A);
      border-radius: 10px;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #3B82F6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class TicketDashboardPageComponent implements OnInit {
  data: TicketDashboardData | null = null
  isLoading = true
  selectedDays = 30
  selectedSector = ''

  // Relatório Analítico de Chamados
  allReportTickets: TicketListItem[] = []
  filteredReportTickets: TicketListItem[] = []
  selectedReportStatus = ''
  reportFilterCode = ''
  reportSearchTerm = ''
  reportSectorFilter = ''
  reportPriorityFilter = ''

  // Modal do Relatório
  isReportModalOpen = false
  selectedReportTicket: TicketDetail | null = null
  reportReplyText = ''
  reportStatusChange: TicketStatus | '' = ''
  isSendingReportMessage = false
  isUpdatingReportStatus = false

  readonly sectorOptions = [
    { value: 'VESTIBULAR', label: 'Vestibular' },
    { value: 'TESOURARIA', label: 'Tesouraria' },
    { value: 'SECRETARIA', label: 'Secretaria' },
    { value: 'COORDENACAO', label: 'Coordenação' },
    { value: 'REGISTRO_ACADEMICO', label: 'Registro Acadêmico' },
    { value: 'PROFESSOR', label: 'Professor' },
    { value: 'ALUNO', label: 'Aluno' },
    { value: 'ADMIN', label: 'Administração' },
    { value: 'MASTER', label: 'Desenvolvedor' },
  ]

  constructor(
    private readonly ticketsService: TicketsService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadDashboard()
  }

  get isDeveloperRoute(): boolean {
    return this.router.url.includes('/desenvolvedor')
  }

  loadDashboard(): void {
    this.isLoading = true
    this.ticketsService
      .getDashboardMetrics({
        sector: this.selectedSector || undefined,
        days: this.selectedDays > 0 ? this.selectedDays : undefined,
      })
      .subscribe({
        next: (res) => {
          this.data = res
          this.loadReportTickets()
        },
        error: (err) => {
          console.error('Erro ao carregar dashboard de chamados:', err)
          this.isLoading = false
        },
      })
  }

  loadReportTickets(): void {
    this.ticketsService
      .getTickets({
        sector: this.selectedSector || undefined,
      })
      .subscribe({
        next: (tickets) => {
          this.allReportTickets = tickets
          this.applyReportFilters()
          this.isLoading = false
        },
        error: (err) => {
          console.error('Erro ao listar chamados para relatório:', err)
          this.isLoading = false
        },
      })
  }

  changePeriod(days: number): void {
    this.selectedDays = days
    this.loadDashboard()
  }

  filterReportByStatus(status: string): void {
    if (this.selectedReportStatus === status) {
      this.selectedReportStatus = ''
    } else {
      this.selectedReportStatus = status
    }
    this.applyReportFilters()

    // Rola suavemente até a seção de relatório
    try {
      const el = document.getElementById('relatorio-analitico')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } catch {
      // Ignora erro em ambientes sem DOM
    }
  }

  applyReportFilters(): void {
    let list = [...this.allReportTickets]

    if (this.selectedReportStatus === 'CONCLUIDOS_FINALIZADOS') {
      list = list.filter((t) => t.status === 'CONCLUIDO' || t.status === 'FINALIZADO')
    } else if (this.selectedReportStatus) {
      list = list.filter((t) => t.status === this.selectedReportStatus)
    }

    if (this.reportFilterCode.trim()) {
      const clean = this.reportFilterCode.replace('#', '').trim()
      list = list.filter((t) => String(t.code) === clean || String(t.code).startsWith(clean) || `#${t.code}` === this.reportFilterCode.trim())
    }

    if (this.reportSectorFilter) {
      list = list.filter((t) => t.sector === this.reportSectorFilter)
    }

    if (this.reportPriorityFilter) {
      list = list.filter((t) => t.priority === this.reportPriorityFilter)
    }

    if (this.reportSearchTerm.trim()) {
      const term = this.reportSearchTerm.toLowerCase().trim()
      list = list.filter((t) => {
        const matchCode = `#${t.code}`.includes(term) || String(t.code) === term
        const matchTitle = t.title.toLowerCase().includes(term)
        const matchDesc = t.description.toLowerCase().includes(term)
        const matchUser = t.user.username.toLowerCase().includes(term)
        const matchSector = t.sectorLabel.toLowerCase().includes(term)
        return matchCode || matchTitle || matchDesc || matchUser || matchSector
      })
    }

    this.filteredReportTickets = list
  }

  resetReportFilters(): void {
    this.selectedReportStatus = ''
    this.reportFilterCode = ''
    this.reportSearchTerm = ''
    this.reportSectorFilter = ''
    this.reportPriorityFilter = ''
    this.applyReportFilters()
  }

  isTicketClosed(ticket: TicketListItem | TicketDetail | null): boolean {
    if (!ticket) return false
    return ticket.status === 'CONCLUIDO' || ticket.status === 'FINALIZADO' || ticket.status === 'CANCELADO'
  }

  canReopenTicket(ticket: TicketListItem | TicketDetail | null): boolean {
    if (!ticket || !this.isTicketClosed(ticket)) return false
    const closedRef = ticket.closedAt || ticket.updatedAt
    if (!closedRef) return true
    const elapsed = Date.now() - new Date(closedRef).getTime()
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000
    return elapsed <= fiveDaysMs
  }

  getRemainingReopenDays(ticket: TicketListItem | TicketDetail | null): number {
    if (!ticket) return 0
    const closedRef = ticket.closedAt || ticket.updatedAt
    if (!closedRef) return 5
    const elapsed = Date.now() - new Date(closedRef).getTime()
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000
    const remainingMs = fiveDaysMs - elapsed
    if (remainingMs <= 0) return 0
    return Math.ceil(remainingMs / (24 * 60 * 60 * 1000))
  }

  getReportStatusFilterLabel(): string {
    switch (this.selectedReportStatus) {
      case 'ABERTO': return 'Abertos (Aguardando atendimento)'
      case 'EM_ANDAMENTO': return 'Em Atendimento'
      case 'CONCLUIDO': return 'Concluídos'
      case 'FINALIZADO': return 'Finalizados'
      case 'CONCLUIDOS_FINALIZADOS': return 'Concluídos e Finalizados'
      case 'CANCELADO': return 'Cancelados'
      default: return 'Todos os Chamados'
    }
  }

  // ================= MODAL DO RELATÓRIO =================
  openReportTicketModal(ticketId: string): void {
    this.reportReplyText = ''
    this.reportStatusChange = ''
    this.ticketsService.getTicket(ticketId).subscribe({
      next: (detail) => {
        this.selectedReportTicket = detail
        this.isReportModalOpen = true
      },
      error: (err) => {
        console.error('Erro ao carregar detalhes no relatório:', err)
        alert('Não foi possível carregar os detalhes do chamado.')
      },
    })
  }

  closeReportTicketModal(): void {
    this.isReportModalOpen = false
    this.selectedReportTicket = null
    this.reportReplyText = ''
    this.reportStatusChange = ''
  }

  updateReportStatus(newStatus: TicketStatus, notes?: string): void {
    if (!this.selectedReportTicket) return

    // Regra: Todo chamado só pode ser reaberto até 5 dias após encerramento
    if (newStatus === 'ABERTO' && this.isTicketClosed(this.selectedReportTicket)) {
      if (!this.canReopenTicket(this.selectedReportTicket)) {
        alert('Este chamado foi encerrado há mais de 5 dias e não pode mais ser reaberto. Caso necessite de novo suporte, por favor abra um novo chamado.')
        return
      }
    }

    this.isUpdatingReportStatus = true

    this.ticketsService
      .updateStatus(this.selectedReportTicket.id, {
        status: newStatus,
        resolutionNotes: notes,
      })
      .subscribe({
        next: (updated) => {
          this.isUpdatingReportStatus = false
          if (this.selectedReportTicket) {
            this.selectedReportTicket.status = updated.status
            this.selectedReportTicket.closedAt = updated.closedAt
            this.selectedReportTicket.resolutionNotes = updated.resolutionNotes
            this.selectedReportTicket.assignedTo = updated.assignedTo
          }
          this.loadDashboard()
        },
        error: (err) => {
          console.error('Erro ao atualizar status pelo relatório:', err)
          alert(err.error?.message || 'Erro ao atualizar o status do chamado.')
          this.isUpdatingReportStatus = false
        },
      })
  }

  promptConcludeReportTicket(status: 'CONCLUIDO' | 'FINALIZADO'): void {
    const label = status === 'CONCLUIDO' ? 'Concluir Chamado' : 'Finalizar Chamado'
    const notes = prompt(`Insira notas de resolução para ${label.toLowerCase()} (opcional):`, '')
    if (notes !== null) {
      this.updateReportStatus(status, notes.trim() || undefined)
    }
  }

  sendReportMessage(event: Event): void {
    event.preventDefault()
    if (!this.selectedReportTicket || !this.reportReplyText.trim()) return

    this.isSendingReportMessage = true
    const formData = new FormData()
    formData.append('message', this.reportReplyText.trim())
    if (this.reportStatusChange) {
      formData.append('statusChange', this.reportStatusChange)
    }

    this.ticketsService.addMessage(this.selectedReportTicket.id, formData).subscribe({
      next: (res) => {
        this.isSendingReportMessage = false
        this.reportReplyText = ''
        this.reportStatusChange = ''
        if (this.selectedReportTicket) {
          if (!this.selectedReportTicket.messages) this.selectedReportTicket.messages = []
          this.selectedReportTicket.messages.push(res.message)
          this.selectedReportTicket.status = res.ticket.status
        }
        this.loadDashboard()
      },
      error: (err) => {
        console.error('Erro ao responder pelo relatório:', err)
        alert('Erro ao enviar mensagem. Tente novamente.')
        this.isSendingReportMessage = false
      },
    })
  }

  downloadAttachment(attachmentId: string, fileName: string): void {
    if (!this.selectedReportTicket) return
    this.ticketsService.downloadAttachment(this.selectedReportTicket.id, attachmentId, fileName)
  }

  printReport(): void {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  exportReportCsv(): void {
    if (this.filteredReportTickets.length === 0) {
      alert('Não há chamados para exportar com os filtros atuais.')
      return
    }

    const headers = ['Código', 'Título', 'Setor', 'Solicitante', 'Responsável', 'Prioridade', 'Status', 'Data Abertura', 'Data Fechamento']
    const rows = this.filteredReportTickets.map((t) => [
      `#${t.code}`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.sectorLabel}"`,
      `"${t.user.username}"`,
      `"${t.assignedTo ? t.assignedTo.username : 'Não atribuído'}"`,
      `"${t.priority}"`,
      `"${this.formatStatus(t.status)}"`,
      `"${t.createdAt}"`,
      `"${t.closedAt || ''}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio-chamados-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  getPercentage(val: number, total: number): number {
    if (!total || total === 0) return 0
    return Math.round((val / total) * 100)
  }

  formatTempoMedio(hours: number): string {
    if (!hours || hours <= 0) return '0 h'
    if (hours < 1) {
      const minutes = Math.round(hours * 60)
      return `${minutes} min`
    }
    if (hours > 24) {
      const days = Math.round((hours / 24) * 10) / 10
      return `${days} dia(s)`
    }
    return `${hours}h`
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'ABERTO': return 'Aberto'
      case 'EM_ANDAMENTO': return 'Em Atendimento'
      case 'CONCLUIDO': return 'Concluído'
      case 'FINALIZADO': return 'Finalizado'
      case 'CANCELADO': return 'Cancelado'
      default: return status
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'BAIXA': return 'Baixa'
      case 'MEDIA': return 'Média'
      case 'ALTA': return 'Alta'
      case 'URGENTE': return 'Urgente'
      default: return priority
    }
  }

  formatRole(role: string): string {
    if (!role) return ''
    const r = role.toLowerCase()
    switch (r) {
      case 'master': return 'Desenvolvedor Master'
      case 'admin': return 'Administrador'
      case 'vestibular': return 'Vestibular'
      case 'tesouraria': return 'Tesouraria'
      case 'secretaria': return 'Secretaria'
      case 'coordenacao': return 'Coordenação'
      case 'registro_academico': return 'Registro Acadêmico'
      case 'professor': return 'Professor'
      case 'aluno': return 'Aluno'
      default: return role
    }
  }

  formatBytes(bytes: number | null | undefined): string {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }
}
