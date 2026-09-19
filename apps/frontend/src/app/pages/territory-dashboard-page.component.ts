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
        <!-- ========================================================= -->
        <!-- PAINEL EXECUTIVO: INDICADORES PRINCIPAIS                  -->
        <!-- ========================================================= -->
        <section class="dashboard-section" aria-labelledby="sec-indicadores">
          <div class="section-title-row">
            <div>
              <span class="section-badge">Piloto Operacional</span>
              <h2 id="sec-indicadores" class="section-title">Indicadores Principais</h2>
            </div>
            <span class="section-desc">Métricas operacionais consolidadas do trabalho em campo</span>
          </div>

          <div class="executive-indicators-grid">
            <div class="exec-card">
              <div class="exec-card-header">
                <span class="exec-label">Residências</span>
                <span class="exec-icon">🏠</span>
              </div>
              <div class="exec-value">{{ data.mainIndicators.residencias }}</div>
              <span class="exec-sub">Mapeadas nas ruas</span>
            </div>

            <div class="exec-card">
              <div class="exec-card-header">
                <span class="exec-label">Contatos</span>
                <span class="exec-icon">🤝</span>
              </div>
              <div class="exec-value">{{ data.mainIndicators.contatos }}</div>
              <span class="exec-sub">Moradores atendidos</span>
            </div>

            <div class="exec-card highlight-lead">
              <div class="exec-card-header">
                <span class="exec-label">Leads</span>
                <span class="exec-icon">🎯</span>
              </div>
              <div class="exec-value">{{ data.mainIndicators.leads }}</div>
              <span class="exec-sub">Qualificados / Interesse</span>
            </div>

            <div class="exec-card highlight-inscricao">
              <div class="exec-card-header">
                <span class="exec-label">Inscrições</span>
                <span class="exec-icon">📝</span>
              </div>
              <div class="exec-value">{{ data.mainIndicators.inscricoes }}</div>
              <span class="exec-sub">Inscritos em cursos</span>
            </div>

            <div class="exec-card highlight-matricula">
              <div class="exec-card-header">
                <span class="exec-label">Matrículas</span>
                <span class="exec-icon">🎓</span>
              </div>
              <div class="exec-value">{{ data.mainIndicators.matriculas }}</div>
              <span class="exec-sub">Matrículas efetivadas</span>
            </div>
          </div>
        </section>

        <!-- ========================================================= -->
        <!-- CONVERSÕES (RENDIMENTO)                                   -->
        <!-- ========================================================= -->
        <section class="dashboard-section" aria-labelledby="sec-conversoes">
          <div class="section-title-row">
            <div>
              <span class="section-badge">Eficiência de Conversão</span>
              <h2 id="sec-conversoes" class="section-title">Conversões</h2>
            </div>
            <span class="section-desc">Rendimento operacional entre cada etapa da abordagem</span>
          </div>

          <div class="conversions-grid">
            <div class="conversion-card">
              <div class="conv-header">
                <span class="conv-title">Contato / Casa</span>
                <span class="conv-tag">Efetividade</span>
              </div>
              <div class="conv-value">{{ data.conversions.contatoPorCasa }}%</div>
              <span class="conv-formula">Contatos ÷ Total de Casas</span>
            </div>

            <div class="conversion-card">
              <div class="conv-header">
                <span class="conv-title">Lead / Contato</span>
                <span class="conv-tag">Receptividade</span>
              </div>
              <div class="conv-value">{{ data.conversions.leadPorContato }}%</div>
              <span class="conv-formula">Leads ÷ Contatos Efetivos</span>
            </div>

            <div class="conversion-card">
              <div class="conv-header">
                <span class="conv-title">Lead / Casa</span>
                <span class="conv-tag">Captação</span>
              </div>
              <div class="conv-value">{{ data.conversions.leadPorCasa }}%</div>
              <span class="conv-formula">Leads ÷ Total de Casas</span>
            </div>

            <div class="conversion-card highlight-conv-amber">
              <div class="conv-header">
                <span class="conv-title">Inscrição / Lead</span>
                <span class="conv-tag">Interesse Real</span>
              </div>
              <div class="conv-value">{{ data.conversions.inscricaoPorLead }}%</div>
              <span class="conv-formula">Inscrições ÷ Total Leads</span>
            </div>

            <div class="conversion-card highlight-conv-green">
              <div class="conv-header">
                <span class="conv-title">Matrícula / Lead</span>
                <span class="conv-tag">Fechamento</span>
              </div>
              <div class="conv-value">{{ data.conversions.matriculaPorLead }}%</div>
              <span class="conv-formula">Matrículas ÷ Total Leads</span>
            </div>
          </div>
        </section>

        <!-- ========================================================= -->
        <!-- GRID: META DO PILOTO & SEMÁFORO DOS SETORES               -->
        <!-- ========================================================= -->
        <div class="pilot-analytics-grid">
          <!-- Card: Meta do Piloto — 10 Dias -->
          <div class="card card-pilot-goals">
            <div class="card-header">
              <div class="header-with-badge">
                <h3>Meta do Piloto — 10 Dias</h3>
                <span class="period-badge">10 Dias</span>
              </div>
              <span class="card-sub">Comparativo de metas planejadas vs. indicadores realizados</span>
            </div>

            <div class="goals-table-container">
              <table class="goals-table">
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th class="text-right">Meta</th>
                    <th class="text-right">Realizado</th>
                    <th class="text-right">% Meta</th>
                  </tr>
                </thead>
                <tbody>
                  @for (g of data.pilotGoals; track g.indicator) {
                    <tr>
                      <td class="goal-indicator-col">
                        <span class="goal-bullet"></span>
                        <strong>{{ g.indicator }}</strong>
                      </td>
                      <td class="text-right font-mono">{{ g.meta }}</td>
                      <td class="text-right font-mono font-bold">{{ g.realizado }}</td>
                      <td class="text-right">
                        <div class="goal-pct-wrapper">
                          <span class="goal-pct-badge" [ngClass]="getGoalStatusClass(g.pctMeta)">
                            {{ g.pctMeta }}%
                          </span>
                          <div class="goal-progress-bg">
                            <div
                              class="goal-progress-fill"
                              [ngClass]="getGoalStatusClass(g.pctMeta)"
                              [style.width.%]="getClampedPercent(g.pctMeta)"
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Card: Semáforo dos Setores -->
          <div class="card card-traffic-light">
            <div class="card-header">
              <div class="header-with-badge">
                <h3>Semáforo dos Setores</h3>
                <span class="rules-badge">Regra de Leads/100 Casas</span>
              </div>
              <span class="card-sub">Classificação e rendimento por subterritório</span>
            </div>

            <!-- Legenda das Faixas do Semáforo -->
            <div class="traffic-legend-bar">
              <div class="traffic-pill pill-verde">
                <span class="dot dot-verde"></span>
                <span class="pill-title">VERDE:</span>
                <span class="pill-rule">≥ 20 leads/100 casas</span>
                <span class="pill-count">({{ data.trafficLight.summary.verde }})</span>
              </div>
              <div class="traffic-pill pill-amarelo">
                <span class="dot dot-amarelo"></span>
                <span class="pill-title">AMARELO:</span>
                <span class="pill-rule">10 a 19 leads/100</span>
                <span class="pill-count">({{ data.trafficLight.summary.amarelo }})</span>
              </div>
              <div class="traffic-pill pill-vermelho">
                <span class="dot dot-vermelho"></span>
                <span class="pill-title">VERMELHO:</span>
                <span class="pill-rule">&lt; 10 leads/100</span>
                <span class="pill-count">({{ data.trafficLight.summary.vermelho }})</span>
              </div>
            </div>

            <!-- Resumo de Etapa / Realizado -->
            <div class="stages-strip">
              <div class="stage-cell">
                <span class="stage-lbl">Casas</span>
                <span class="stage-val">{{ data.trafficLight.stages.casas }}</span>
              </div>
              <div class="stage-cell">
                <span class="stage-lbl">Contatos</span>
                <span class="stage-val">{{ data.trafficLight.stages.contatos }}</span>
              </div>
              <div class="stage-cell">
                <span class="stage-lbl">Leads</span>
                <span class="stage-val font-lead">{{ data.trafficLight.stages.leads }}</span>
              </div>
              <div class="stage-cell">
                <span class="stage-lbl">Inscrições</span>
                <span class="stage-val font-insc">{{ data.trafficLight.stages.inscricoes }}</span>
              </div>
              <div class="stage-cell">
                <span class="stage-lbl">Matrículas</span>
                <span class="stage-val font-matr">{{ data.trafficLight.stages.matriculas }}</span>
              </div>
            </div>

            <!-- Tabela dos Setores -->
            <div class="sectors-table-container">
              @if (data.trafficLight.sectors.length === 0) {
                <div class="empty-box">Nenhum subterritório registrado.</div>
              } @else {
                <table class="sectors-table">
                  <thead>
                    <tr>
                      <th>Setor / Subterritório</th>
                      <th class="text-right">Casas</th>
                      <th class="text-right">Contatos</th>
                      <th class="text-right">Leads</th>
                      <th class="text-right">Leads / 100</th>
                      <th class="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of data.trafficLight.sectors; track s.subterritoryId) {
                      <tr>
                        <td>
                          <strong>{{ s.subterritoryName }}</strong>
                          <span class="subsector-terr">{{ s.territoryName }}</span>
                        </td>
                        <td class="text-right font-mono">{{ s.totalResidences }}</td>
                        <td class="text-right font-mono">{{ s.contatosCount }}</td>
                        <td class="text-right font-mono font-bold">{{ s.leadsCount }}</td>
                        <td class="text-right font-mono font-bold">{{ s.leadsPer100Houses }}</td>
                        <td class="text-center">
                          <span class="traffic-badge" [ngClass]="getTrafficClass(s.classification)">
                            {{ s.classification }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- SEÇÃO: COBERTURA GEOGRÁFICA & REGRA DE CONCLUSÃO EM CASCATA -->
        <!-- ========================================================= -->
        <div class="section-divider">
          <span class="divider-label">Cobertura Geográfica & Progresso Estrutural</span>
        </div>

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

    /* ========================================================= */
    /* ESTILOS DO PAINEL EXECUTIVO DO PILOTO                     */
    /* ========================================================= */
    .dashboard-section {
      margin-bottom: 2.25rem;
    }
    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 1.1rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .section-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #60a5fa;
      background: rgba(96, 165, 250, 0.12);
      border: 1px solid rgba(96, 165, 250, 0.25);
      padding: 2px 8px;
      border-radius: 4px;
      margin-bottom: 0.35rem;
    }
    .section-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #fff;
      margin: 0;
    }
    .section-desc {
      font-size: 0.85rem;
      color: #a1a1aa;
    }

    /* Indicadores Principais */
    .executive-indicators-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1rem;
    }
    .exec-card {
      background: var(--color-surface, #18181b);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 12px;
      padding: 1.25rem 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .exec-card:hover {
      transform: translateY(-2px);
      border-color: #52525b;
    }
    .exec-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .exec-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #a1a1aa;
    }
    .exec-icon { font-size: 1.25rem; }
    .exec-value {
      font-size: 2.15rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.1;
      margin: 0.25rem 0;
    }
    .exec-sub { font-size: 0.75rem; color: #71717a; }
    .exec-card.highlight-lead {
      border-color: rgba(96, 165, 250, 0.4);
      background: linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(24, 24, 27, 0.95));
    }
    .exec-card.highlight-lead .exec-value { color: #93c5fd; }
    .exec-card.highlight-inscricao {
      border-color: rgba(251, 191, 36, 0.4);
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(24, 24, 27, 0.95));
    }
    .exec-card.highlight-inscricao .exec-value { color: #fcd34d; }
    .exec-card.highlight-matricula {
      border-color: rgba(52, 211, 153, 0.4);
      background: linear-gradient(135deg, rgba(52, 211, 153, 0.1), rgba(24, 24, 27, 0.95));
    }
    .exec-card.highlight-matricula .exec-value { color: #86efac; }

    /* Conversões */
    .conversions-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1rem;
    }
    .conversion-card {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(24, 24, 27, 0.95) 100%);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 12px;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .conversion-card:hover {
      transform: translateY(-2px);
      border-color: #52525b;
    }
    .conv-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }
    .conv-title { font-size: 0.85rem; font-weight: 700; color: #e4e4e7; }
    .conv-tag {
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #a1a1aa;
      background: rgba(255, 255, 255, 0.06);
      padding: 1px 6px;
      border-radius: 4px;
    }
    .conv-value {
      font-size: 1.9rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.1;
      margin: 0.25rem 0 0.15rem;
    }
    .conv-formula { font-size: 0.72rem; color: #71717a; }
    .highlight-conv-amber { border-color: rgba(251, 191, 36, 0.3); }
    .highlight-conv-amber .conv-value { color: #fcd34d; }
    .highlight-conv-green { border-color: rgba(52, 211, 153, 0.3); }
    .highlight-conv-green .conv-value { color: #86efac; }

    /* Grid Metas e Semáforo */
    .pilot-analytics-grid {
      display: grid;
      grid-template-columns: 1fr 1.35fr;
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }
    .header-with-badge {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .period-badge {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(96, 165, 250, 0.15);
      color: #93c5fd;
      border: 1px solid rgba(96, 165, 250, 0.3);
      padding: 2px 8px;
      border-radius: 99px;
    }
    .rules-badge {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(251, 191, 36, 0.15);
      color: #fcd34d;
      border: 1px solid rgba(251, 191, 36, 0.3);
      padding: 2px 8px;
      border-radius: 99px;
    }

    /* Goals Table */
    .goals-table-container { overflow-x: auto; }
    .goals-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .goals-table th {
      text-align: left;
      padding: 0.65rem 0.6rem;
      color: #a1a1aa;
      border-bottom: 1px solid var(--border-color, #3f3f46);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .goals-table td {
      padding: 0.85rem 0.6rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #d4d4d8;
    }
    .goal-indicator-col {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.875rem;
    }
    .goal-bullet {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #60a5fa;
      flex-shrink: 0;
    }
    .goal-pct-wrapper {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.25rem;
    }
    .goal-pct-badge {
      font-weight: 800;
      font-size: 0.85rem;
    }
    .goal-progress-bg {
      width: 90px;
      height: 5px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 99px;
      overflow: hidden;
    }
    .goal-progress-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 0.3s;
    }
    .goal-achieved { color: #4ade80; background: #22c55e; }
    .goal-good { color: #facc15; background: #eab308; }
    .goal-pending { color: #60a5fa; background: #3b82f6; }
    span.goal-achieved, span.goal-good, span.goal-pending { background: transparent; }

    /* Semáforo dos Setores */
    .traffic-legend-bar {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
    }
    .traffic-pill {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
    }
    .pill-verde {
      background: rgba(34, 197, 94, 0.1);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.25);
    }
    .pill-amarelo {
      background: rgba(234, 179, 8, 0.1);
      color: #fde047;
      border: 1px solid rgba(234, 179, 8, 0.25);
    }
    .pill-vermelho {
      background: rgba(239, 68, 68, 0.1);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot-verde { background: #22c55e; box-shadow: 0 0 6px rgba(34, 197, 94, 0.8); }
    .dot-amarelo { background: #eab308; box-shadow: 0 0 6px rgba(234, 179, 8, 0.8); }
    .dot-vermelho { background: #ef4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.8); }
    .pill-title { font-weight: 700; }
    .pill-rule { opacity: 0.9; }
    .pill-count { font-weight: 800; margin-left: 2px; }

    /* Stages Strip */
    .stages-strip {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.4rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 0.65rem 0.5rem;
      text-align: center;
    }
    .stage-cell { display: flex; flex-direction: column; gap: 0.15rem; }
    .stage-lbl {
      font-size: 0.68rem;
      text-transform: uppercase;
      color: #71717a;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .stage-val { font-size: 1.15rem; font-weight: 800; color: #fff; }
    .font-lead { color: #93c5fd; }
    .font-insc { color: #fcd34d; }
    .font-matr { color: #86efac; }

    /* Sectors Table */
    .sectors-table-container {
      overflow-x: auto;
      max-height: 280px;
      overflow-y: auto;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }
    .sectors-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.825rem;
    }
    .sectors-table th {
      position: sticky;
      top: 0;
      background: #1f1f23;
      padding: 0.55rem 0.6rem;
      color: #a1a1aa;
      border-bottom: 1px solid #3f3f46;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      z-index: 2;
    }
    .sectors-table td {
      padding: 0.65rem 0.6rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #d4d4d8;
    }
    .subsector-terr {
      display: block;
      font-size: 0.7rem;
      color: #71717a;
      font-weight: normal;
    }
    .traffic-badge {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 0.2rem 0.55rem;
      border-radius: 99px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .traffic-badge-verde {
      background: rgba(34, 197, 94, 0.15);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.35);
    }
    .traffic-badge-amarelo {
      background: rgba(234, 179, 8, 0.15);
      color: #fde047;
      border: 1px solid rgba(234, 179, 8, 0.35);
    }
    .traffic-badge-vermelho {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.35);
    }

    /* Section divider */
    .section-divider {
      display: flex;
      align-items: center;
      margin: 2.5rem 0 1.75rem;
      position: relative;
      text-align: center;
    }
    .section-divider::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      z-index: 1;
    }
    .divider-label {
      position: relative;
      z-index: 2;
      background: var(--color-surface, #18181b);
      padding: 0.3rem 1.1rem;
      font-size: 0.775rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #a1a1aa;
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 99px;
      margin: 0 auto;
    }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }

    @media (max-width: 1100px) {
      .executive-indicators-grid { grid-template-columns: repeat(3, 1fr); }
      .conversions-grid { grid-template-columns: repeat(3, 1fr); }
      .pilot-analytics-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 950px) {
      .analytics-row { grid-template-columns: 1fr; }
    }
    @media (max-width: 700px) {
      .executive-indicators-grid { grid-template-columns: repeat(2, 1fr); }
      .conversions-grid { grid-template-columns: repeat(2, 1fr); }
      .traffic-legend-bar { flex-direction: column; }
      .stages-strip { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 480px) {
      .executive-indicators-grid { grid-template-columns: 1fr; }
      .conversions-grid { grid-template-columns: 1fr; }
      .stages-strip { grid-template-columns: repeat(2, 1fr); }
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

  getTrafficClass(classification: string): string {
    switch (classification) {
      case 'VERDE':
        return 'traffic-badge-verde'
      case 'AMARELO':
        return 'traffic-badge-amarelo'
      case 'VERMELHO':
        return 'traffic-badge-vermelho'
      default:
        return ''
    }
  }

  getGoalStatusClass(pct: number): string {
    if (pct >= 100) return 'goal-achieved'
    if (pct >= 70) return 'goal-good'
    return 'goal-pending'
  }

  getClampedPercent(pct: number): number {
    return Math.min(Math.max(pct, 0), 100)
  }
}

