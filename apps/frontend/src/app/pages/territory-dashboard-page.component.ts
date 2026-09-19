import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import {
  LeadStatus,
  TerritoryDashboardData,
  TerritoryItem,
  TerritoryService,
} from '../services/territory.service'

@Component({
  selector: 'app-territory-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="dashboard-page" aria-labelledby="page-title">
      <!-- Cabeçalho -->
      <header class="page-header-container">
        <div class="header-info">
          <p class="hero-eyebrow">Administração / Dashboards</p>
          <h1 id="page-title" class="page-title">Painel Analítico de Territórios & Leads</h1>
          <p class="page-subtitle">
            Quantificação consolidada de cobertura geográfica, progressão da regra de conclusão em cascata, funil de conversão e preferências dos leads.
          </p>
        </div>
        <div class="header-actions">
          <a class="button button-secondary" routerLink="/administracao/cadastros/territorios">
            <span aria-hidden="true">🗺</span> Gerenciar Territórios
          </a>
          <a class="button button-secondary" routerLink="/administracao/cadastros/leads">
            <span aria-hidden="true">📋</span> Base de Leads
          </a>
          <button class="button button-primary" (click)="loadDashboard()">
            <span aria-hidden="true">🔄</span> Atualizar
          </button>
        </div>
      </header>

      <!-- Barra de Filtros do Dashboard -->
      <div class="filters-card">
        <div class="filters-row">
          <div class="filter-group">
            <label for="filter-territory">Filtrar por Território</label>
            <select
              id="filter-territory"
              class="form-control"
              [(ngModel)]="filters.territoryId"
              (change)="loadDashboard()"
            >
              <option value="">Todos os Territórios</option>
              @for (t of territories; track t.id) {
                <option [value]="t.id">{{ t.name }}</option>
              }
            </select>
          </div>

          <div class="filter-group">
            <label for="filter-status">Status do Lead</label>
            <select
              id="filter-status"
              class="form-control"
              [(ngModel)]="filters.status"
              (change)="loadDashboard()"
            >
              <option value="">Todos os Status</option>
              <option value="FALHOU">Falhou</option>
              <option value="LEAD">Lead</option>
              <option value="INSCRICAO">Inscrição</option>
              <option value="MATRICULA">Matrícula</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="filter-origin">Origem</label>
            <select
              id="filter-origin"
              class="form-control"
              [(ngModel)]="filters.origin"
              (change)="loadDashboard()"
            >
              <option value="">Todas as Origens</option>
              <option value="VISITA_DOMICILIAR">Visita Domiciliar</option>
              <option value="INDICACAO">Indicação</option>
              <option value="EVENTO">Evento</option>
              <option value="REDES_SOCIAIS">Redes Sociais</option>
            </select>
          </div>

          <div class="filter-actions">
            <button class="button button-secondary btn-clear" (click)="clearFilters()">
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      @if (isLoading) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Calculando métricas e quantificações...</p>
        </div>
      } @else if (data) {
        <!-- KPI CARDS GLOBAIS -->
        <div class="kpi-grid">
          <!-- Cobertura de Residências -->
          <div class="kpi-card highlight-blue">
            <div class="kpi-icon">🏠</div>
            <div class="kpi-body">
              <span class="kpi-label">Cobertura de Residências</span>
              <div class="kpi-value-row">
                <span class="kpi-value">{{ data.overview.coveragePercentage }}%</span>
                <span class="kpi-fraction">{{ data.overview.visitedResidences }} / {{ data.overview.totalResidences }}</span>
              </div>
              <div class="progress-bar-bg small">
                <div class="progress-bar-fill small" [style.width.%]="data.overview.coveragePercentage"></div>
              </div>
              <span class="kpi-hint">Residências abordadas com lead</span>
            </div>
          </div>

          <!-- Conclusão de Ruas -->
          <div class="kpi-card highlight-green">
            <div class="kpi-icon">🛣️</div>
            <div class="kpi-body">
              <span class="kpi-label">Ruas Concluídas</span>
              <div class="kpi-value-row">
                <span class="kpi-value">{{ data.overview.streetsCompletionRate }}%</span>
                <span class="kpi-fraction">{{ data.overview.completedStreets }} / {{ data.overview.totalStreets }}</span>
              </div>
              <div class="progress-bar-bg small">
                <div class="progress-bar-fill small completed" [style.width.%]="data.overview.streetsCompletionRate"></div>
              </div>
              <span class="kpi-hint">100% de residências preenchidas</span>
            </div>
          </div>

          <!-- Total de Leads Coletados -->
          <div class="kpi-card">
            <div class="kpi-icon">👥</div>
            <div class="kpi-body">
              <span class="kpi-label">Leads Coletados</span>
              <div class="kpi-value-row">
                <span class="kpi-value">{{ data.overview.totalLeads }}</span>
              </div>
              <span class="kpi-sub">{{ data.overview.authorizedCount }} com consentimento LGPD ({{ data.overview.authorizationPercentage }}%)</span>
            </div>
          </div>

          <!-- Conversão em Matrículas -->
          <div class="kpi-card highlight-emerald">
            <div class="kpi-icon">🎓</div>
            <div class="kpi-body">
              <span class="kpi-label">Conversão em Matrículas</span>
              <div class="kpi-value-row">
                <span class="kpi-value">{{ data.overview.conversionRateToMatricula }}%</span>
                <span class="kpi-fraction">{{ data.statusBreakdown.counts.MATRICULA }} matriculados</span>
              </div>
              <span class="kpi-hint">Alunos efetivamente matriculados</span>
            </div>
          </div>
        </div>

        <!-- FUNIL DE CONVERSÃO & STATUS BREAKDOWN -->
        <div class="analytics-row">
          <!-- Funil Visual -->
          <div class="card card-funnel">
            <div class="card-header">
              <h3>Funil de Captação & Conversão</h3>
              <span class="card-sub">Do planejamento residencial à matrícula final</span>
            </div>
            <div class="funnel-container">
              @for (step of data.funnel; track step.stage; let idx = $index) {
                <div class="funnel-step">
                  <div class="funnel-header">
                    <span class="step-num">{{ idx + 1 }}</span>
                    <span class="step-title">{{ step.stage }}</span>
                    <span class="step-count">{{ step.count }}</span>
                  </div>
                  <div class="funnel-bar-bg">
                    <div
                      class="funnel-bar-fill"
                      [style.width.%]="step.percentage"
                      [ngClass]="'funnel-color-' + idx"
                    ></div>
                  </div>
                  <div class="funnel-footer">
                    <span class="step-hint">{{ step.hint }}</span>
                    <span class="step-pct">{{ step.percentage }}%</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Distribuição de Status -->
          <div class="card card-status">
            <div class="card-header">
              <h3>Distribuição de Status dos Leads</h3>
              <span class="card-sub">Resultado das abordagens domiciliares</span>
            </div>
            <div class="status-bars-container">
              <!-- Barra Composta -->
              <div class="composite-status-bar">
                <div
                  class="seg seg-falhou"
                  [style.width.%]="data.statusBreakdown.percentages.FALHOU"
                  title="Falhou: {{ data.statusBreakdown.counts.FALHOU }} ({{ data.statusBreakdown.percentages.FALHOU }}%)"
                ></div>
                <div
                  class="seg seg-lead"
                  [style.width.%]="data.statusBreakdown.percentages.LEAD"
                  title="Lead: {{ data.statusBreakdown.counts.LEAD }} ({{ data.statusBreakdown.percentages.LEAD }}%)"
                ></div>
                <div
                  class="seg seg-inscricao"
                  [style.width.%]="data.statusBreakdown.percentages.INSCRICAO"
                  title="Inscrição: {{ data.statusBreakdown.counts.INSCRICAO }} ({{ data.statusBreakdown.percentages.INSCRICAO }}%)"
                ></div>
                <div
                  class="seg seg-matricula"
                  [style.width.%]="data.statusBreakdown.percentages.MATRICULA"
                  title="Matrícula: {{ data.statusBreakdown.counts.MATRICULA }} ({{ data.statusBreakdown.percentages.MATRICULA }}%)"
                ></div>
              </div>

              <!-- Lista Detalhada de Status -->
              <div class="status-legend-grid">
                <div class="legend-card color-matricula">
                  <span class="legend-title">Matrícula</span>
                  <span class="legend-value">{{ data.statusBreakdown.counts.MATRICULA }}</span>
                  <span class="legend-pct">{{ data.statusBreakdown.percentages.MATRICULA }}% do total</span>
                </div>
                <div class="legend-card color-inscricao">
                  <span class="legend-title">Inscrição</span>
                  <span class="legend-value">{{ data.statusBreakdown.counts.INSCRICAO }}</span>
                  <span class="legend-pct">{{ data.statusBreakdown.percentages.INSCRICAO }}% do total</span>
                </div>
                <div class="legend-card color-lead">
                  <span class="legend-title">Lead Ativo</span>
                  <span class="legend-value">{{ data.statusBreakdown.counts.LEAD }}</span>
                  <span class="legend-pct">{{ data.statusBreakdown.percentages.LEAD }}% do total</span>
                </div>
                <div class="legend-card color-falhou">
                  <span class="legend-title">Falhou / Sem interesse</span>
                  <span class="legend-value">{{ data.statusBreakdown.counts.FALHOU }}</span>
                  <span class="legend-pct">{{ data.statusBreakdown.percentages.FALHOU }}% do total</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RANKING DE TERRITÓRIOS & TOP CURSOS -->
        <div class="analytics-row">
          <!-- Ranking Territorial -->
          <div class="card card-territories">
            <div class="card-header">
              <h3>Progresso por Território</h3>
              <span class="card-sub">Hierarquia e conclusão dos setores mapeados</span>
            </div>
            @if (data.territoryRanking.length === 0) {
              <div class="empty-box">Nenhum território cadastrado.</div>
            } @else {
              <div class="territory-ranking-list">
                @for (t of data.territoryRanking; track t.id) {
                  <div class="ranking-row">
                    <div class="ranking-info">
                      <div class="ranking-name-box">
                        <strong>{{ t.name }}</strong>
                        @if (t.code) {
                          <span class="code-chip">{{ t.code }}</span>
                        }
                      </div>
                      <span class="badge" [class.badge-success]="t.isCompleted" [class.badge-info]="!t.isCompleted && t.progressPercentage > 0">
                        {{ t.isCompleted ? '✓ 100% Concluído' : (t.progressPercentage > 0 ? t.progressPercentage + '% Concluído' : 'Pendente') }}
                      </span>
                    </div>

                    <div class="progress-bar-bg small">
                      <div
                        class="progress-bar-fill small"
                        [style.width.%]="t.progressPercentage"
                        [class.completed]="t.isCompleted"
                      ></div>
                    </div>

                    <div class="ranking-stats-line">
                      <span>🏠 {{ t.visitedResidences }}/{{ t.totalResidences }} residências</span>
                      <span>🛣️ {{ t.completedStreets }}/{{ t.totalStreets }} ruas</span>
                      <span>👥 {{ t.totalLeads }} leads</span>
                      <span>🎓 {{ t.statusCounts.MATRICULA }} matrículas</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Cursos Mais Demandados -->
          <div class="card card-courses">
            <div class="card-header">
              <h3>Cursos / Áreas Mais Demandadas</h3>
              <span class="card-sub">Interesses declarados nas visitas</span>
            </div>
            @if (data.topCourses.length === 0) {
              <div class="empty-box">Nenhum lead com curso registrado.</div>
            } @else {
              <div class="course-list">
                @for (c of data.topCourses; track c.name) {
                  <div class="course-item">
                    <div class="course-info">
                      <span class="course-name">🎓 {{ c.name }}</span>
                      <span class="course-count"><strong>{{ c.count }}</strong> leads ({{ c.percentage }}%)</span>
                    </div>
                    <div class="progress-bar-bg small">
                      <div class="progress-bar-fill small" [style.width.%]="c.percentage"></div>
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Origem dos Leads Sub-section -->
            <div class="origin-section">
              <h4>Origem dos Contatos</h4>
              <div class="origin-chips">
                @for (o of data.leadsByOrigin; track o.name) {
                  <div class="origin-chip">
                    <span class="orig-name">{{ formatOrigin(o.name) }}:</span>
                    <span class="orig-val"><strong>{{ o.count }}</strong> ({{ o.percentage }}%)</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- RECENTES ABORDAGENS -->
        <div class="card card-recents">
          <div class="card-header">
            <h3>Últimos Leads Registrados</h3>
            <span class="card-sub">Acompanhe as abordagens mais recentes no campo</span>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nome do Lead</th>
                  <th>Contato</th>
                  <th>Curso de Interesse</th>
                  <th>Território / Logradouro</th>
                  <th>Origem</th>
                  <th>Status</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                @for (l of data.recentLeads; track l.id) {
                  <tr>
                    <td><strong>{{ l.name }}</strong></td>
                    <td>{{ l.whatsapp }}</td>
                    <td>🎓 {{ l.courseOrArea }}</td>
                    <td>
                      {{ l.territoryName }} ❯ {{ l.streetName }}, nº {{ l.residenceNumber }}
                    </td>
                    <td>{{ formatOrigin(l.origin) }}</td>
                    <td>
                      <span class="badge" [ngClass]="getLeadStatusBadgeClass(l.status)">
                        {{ getLeadStatusLabel(l.status) }}
                      </span>
                    </td>
                    <td>👤 {{ l.createdByName }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .dashboard-page {
      padding: 1.5rem 2rem 3rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    .page-header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    .hero-eyebrow {
      font-size: 0.85rem;
      color: var(--primary-color, #60a5fa);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }
    .page-title {
      font-size: 2.25rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 0.5rem;
    }
    .page-subtitle {
      color: var(--text-color-secondary, #a1a1aa);
      max-width: 800px;
      font-size: 0.95rem;
      line-height: 1.5;
      margin: 0;
    }
    .header-actions { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }

    /* Filtros */
    .filters-card {
      background: var(--color-surface, #18181b);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 12px;
      padding: 1rem 1.5rem;
      margin-bottom: 2rem;
    }
    .filters-row {
      display: flex;
      gap: 1.5rem;
      align-items: flex-end;
      flex-wrap: wrap;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 200px;
      flex: 1;
    }
    .filter-group label { font-size: 0.8rem; font-weight: 600; color: #d4d4d8; }
    .form-control {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 8px;
      padding: 0.55rem 0.8rem;
      color: #fff;
      font-size: 0.9rem;
    }
    .filter-actions { align-self: flex-end; }
    .btn-clear { padding: 0.55rem 1rem; font-size: 0.85rem; }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .kpi-card {
      background: var(--color-surface, #18181b);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 12px;
      padding: 1.35rem;
      display: flex;
      gap: 1.25rem;
      align-items: flex-start;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    .kpi-card.highlight-blue {
      border-color: rgba(59, 130, 246, 0.4);
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(24, 24, 27, 0.95));
    }
    .kpi-card.highlight-green {
      border-color: rgba(34, 197, 94, 0.4);
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(24, 24, 27, 0.95));
    }
    .kpi-card.highlight-emerald {
      border-color: rgba(16, 185, 129, 0.4);
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(24, 24, 27, 0.95));
    }
    .kpi-icon { font-size: 2rem; }
    .kpi-body { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; }
    .kpi-label { font-size: 0.8rem; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-value-row { display: flex; align-items: baseline; gap: 0.6rem; }
    .kpi-value { font-size: 2rem; font-weight: 800; color: #fff; }
    .kpi-fraction { font-size: 0.85rem; color: #a1a1aa; }
    .kpi-hint { font-size: 0.775rem; color: #71717a; }
    .kpi-sub { font-size: 0.8rem; color: #93c5fd; }

    /* Progress bar */
    .progress-bar-bg {
      background: rgba(255, 255, 255, 0.1);
      height: 6px;
      border-radius: 99px;
      overflow: hidden;
      margin: 0.2rem 0;
    }
    .progress-bar-fill {
      background: var(--primary-color, #3b82f6);
      height: 100%;
      border-radius: 99px;
      transition: width 0.3s;
    }
    .progress-bar-fill.completed { background: #22c55e; }

    /* Layout Rows */
    .analytics-row {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--color-surface, #18181b);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .card-header h3 { font-size: 1.25rem; font-weight: 700; color: #fff; margin: 0 0 0.2rem; }
    .card-sub { font-size: 0.825rem; color: var(--text-color-secondary, #a1a1aa); }

    /* Funil */
    .funnel-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .funnel-step {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .funnel-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .step-num {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 800;
      width: 22px;
      height: 22px;
      border-radius: 99px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .step-title { font-weight: 600; color: #e4e4e7; font-size: 0.9rem; flex: 1; }
    .step-count { font-weight: 800; font-size: 1.15rem; color: #fff; }
    .funnel-bar-bg {
      background: rgba(255, 255, 255, 0.08);
      height: 10px;
      border-radius: 99px;
      overflow: hidden;
    }
    .funnel-bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s ease; }
    .funnel-color-0 { background: #60a5fa; }
    .funnel-color-1 { background: #38bdf8; }
    .funnel-color-2 { background: #fbbf24; }
    .funnel-color-3 { background: #34d399; }
    .funnel-footer {
      display: flex;
      justify-content: space-between;
      font-size: 0.775rem;
      color: #71717a;
    }
    .step-pct { font-weight: 700; color: #a1a1aa; }

    /* Status composite bar */
    .status-bars-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .composite-status-bar {
      display: flex;
      height: 20px;
      border-radius: 8px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.05);
    }
    .seg { height: 100%; transition: width 0.3s; }
    .seg-falhou { background: #f87171; }
    .seg-lead { background: #60a5fa; }
    .seg-inscricao { background: #fbbf24; }
    .seg-matricula { background: #34d399; }

    .status-legend-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    .legend-card {
      background: rgba(255, 255, 255, 0.03);
      border-left: 4px solid transparent;
      border-radius: 6px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .legend-card.color-matricula { border-color: #34d399; }
    .legend-card.color-inscricao { border-color: #fbbf24; }
    .legend-card.color-lead { border-color: #60a5fa; }
    .legend-card.color-falhou { border-color: #f87171; }
    .legend-title { font-size: 0.75rem; color: #a1a1aa; font-weight: 600; text-transform: uppercase; }
    .legend-value { font-size: 1.35rem; font-weight: 800; color: #fff; }
    .legend-pct { font-size: 0.75rem; color: #71717a; }

    /* Ranking List */
    .territory-ranking-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .ranking-row {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .ranking-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ranking-name-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #fff;
      font-size: 0.95rem;
    }
    .code-chip {
      background: rgba(255, 255, 255, 0.08);
      font-size: 0.725rem;
      padding: 1px 6px;
      border-radius: 4px;
      color: #a1a1aa;
    }
    .ranking-stats-line {
      display: flex;
      gap: 1rem;
      font-size: 0.8rem;
      color: #a1a1aa;
      flex-wrap: wrap;
    }

    /* Cursos */
    .course-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .course-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .course-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }
    .course-name { color: #e4e4e7; font-weight: 600; }
    .course-count { color: #a1a1aa; }
    .origin-section {
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color, #3f3f46);
    }
    .origin-section h4 {
      font-size: 0.85rem;
      color: #d4d4d8;
      margin: 0 0 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .origin-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .origin-chip {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 0.35rem 0.65rem;
      font-size: 0.8rem;
      display: flex;
      gap: 0.3rem;
    }
    .orig-name { color: #a1a1aa; }
    .orig-val strong { color: #fff; }

    /* Recents Table */
    .card-recents .table-container {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .data-table th {
      text-align: left;
      padding: 0.75rem 1rem;
      color: var(--text-color-secondary, #a1a1aa);
      border-bottom: 1px solid var(--border-color, #3f3f46);
      font-size: 0.775rem;
      text-transform: uppercase;
    }
    .data-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #d4d4d8;
    }

    /* Badges */
    .badge {
      font-size: 0.725rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-success { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    .badge-info { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .badge-falhou { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .badge-lead { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .badge-inscricao { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
    .badge-matricula { background: rgba(34, 197, 94, 0.2); color: #86efac; }

    /* Buttons */
    .button {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem 1.15rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s;
    }
    .button-primary { background: var(--primary-color, #3b82f6); border: 1px solid var(--primary-color, #3b82f6); color: #fff; }
    .button-primary:hover { background: #2563eb; }
    .button-secondary { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color, #3f3f46); color: #d4d4d8; }
    .button-secondary:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }

    /* Loading & Spinner */
    .loading-state {
      padding: 4rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      color: var(--text-color-secondary, #a1a1aa);
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: var(--primary-color, #3b82f6);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 950px) {
      .analytics-row { grid-template-columns: 1fr; }
    }
  `],
})
export class TerritoryDashboardPageComponent implements OnInit {
  data: TerritoryDashboardData | null = null
  territories: TerritoryItem[] = []
  isLoading = true

  filters = {
    territoryId: '',
    status: '' as '' | LeadStatus,
    origin: '',
  }

  constructor(private readonly territoryService: TerritoryService) {}

  ngOnInit(): void {
    this.loadTerritories()
    this.loadDashboard()
  }

  loadTerritories(): void {
    this.territoryService.getTerritories().subscribe({
      next: (data) => (this.territories = data),
    })
  }

  loadDashboard(): void {
    this.isLoading = true
    this.territoryService
      .getDashboardStats({
        territoryId: this.filters.territoryId || undefined,
        status: this.filters.status || undefined,
        origin: this.filters.origin || undefined,
      })
      .subscribe({
        next: (res) => {
          this.data = res
          this.isLoading = false
        },
        error: () => {
          this.isLoading = false
        },
      })
  }

  clearFilters(): void {
    this.filters = { territoryId: '', status: '', origin: '' }
    this.loadDashboard()
  }

  getLeadStatusLabel(status: string): string {
    switch (status) {
      case 'FALHOU':
        return 'Falhou'
      case 'LEAD':
        return 'Lead'
      case 'INSCRICAO':
        return 'Inscrição'
      case 'MATRICULA':
        return 'Matrícula'
      default:
        return status
    }
  }

  getLeadStatusBadgeClass(status: string): string {
    switch (status) {
      case 'FALHOU':
        return 'badge-falhou'
      case 'LEAD':
        return 'badge-lead'
      case 'INSCRICAO':
        return 'badge-inscricao'
      case 'MATRICULA':
        return 'badge-matricula'
      default:
        return 'badge-info'
    }
  }

  formatOrigin(origin?: string): string {
    switch (origin) {
      case 'VISITA_DOMICILIAR':
        return 'Visita Domiciliar'
      case 'INDICACAO':
        return 'Indicação'
      case 'EVENTO':
        return 'Evento'
      case 'REDES_SOCIAIS':
        return 'Redes Sociais'
      case 'BALCAO':
        return 'Balcão'
      case 'OUTRO':
        return 'Outro'
      default:
        return origin || 'Visita Domiciliar'
    }
  }
}
