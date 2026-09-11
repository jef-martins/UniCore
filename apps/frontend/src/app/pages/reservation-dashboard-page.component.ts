import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, OnInit } from '@angular/core'
import { ActivatedRoute, RouterModule } from '@angular/router'
import { AuthService } from '../services/auth.service'

export interface DashboardItem {
  id: string
  name: string
  code: string
  category: string
  condition: string
  status: string
  reservationCount: number
  totalHours: number
  percentage: number
}

export interface DashboardRequester {
  requesterName: string
  department: string
  email?: string | null
  reservationCount: number
  activeCount: number
  completedCount: number
  favoriteCategory: string
  percentage: number
}

export interface ConditionDetail {
  count: number
  percentage: number
}

export interface AttentionItem {
  id: string
  name: string
  code: string
  category: string
  location: string
  condition: string
  status: string
  description?: string | null
}

export interface ReservationDashboardData {
  overview: {
    totalReservations: number
    activeReservations: number
    completedReservations: number
    cancelledReservations: number
    totalItems: number
    availableItems: number
    reservedItems: number
    maintenanceItems: number
    totalHoursReserved: number
  }
  topItems: DashboardItem[]
  topRequesters: DashboardRequester[]
  conditionStats: {
    byCondition: {
      PERFEITO: ConditionDetail
      COM_AVARIAS: ConditionDetail
      DEFEITO_FUNCIONA: ConditionDetail
      DEFEITO_PARCIAL: ConditionDetail
      NAO_FUNCIONA: ConditionDetail
    }
    totalWithIssues: number
    totalCritical: number
    itemsRequiringAttention: AttentionItem[]
  }
  categoryStats: Array<{
    category: string
    itemCount: number
    reservationCount: number
    percentage: number
  }>
  departmentStats: Array<{
    department: string
    reservationCount: number
    percentage: number
  }>
  idleItems: Array<{
    id: string
    name: string
    code: string
    category: string
    location: string
    condition: string
    status: string
  }>
}

@Component({
  selector: 'app-reservation-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-page" aria-labelledby="page-title">
      <!-- Cabeçalho -->
      <header class="page-header-container">
        <div class="header-info">
          <p class="hero-eyebrow">{{ contextEyebrow }}</p>
          <h1 id="page-title" class="page-title">Relatório e Dashboard de Reservas</h1>
          <p class="page-subtitle">
            Análise estratégica de demanda, frequência de uso por docentes, conservação do acervo e indicadores de patrimônio.
          </p>
        </div>
        <div class="header-actions">
          <button class="button button-text" type="button" (click)="loadDashboard()" [disabled]="isLoading">
            ↻ {{ isLoading ? 'Atualizando...' : 'Atualizar Dados' }}
          </button>
          <a class="button button-secondary" [routerLink]="catalogRoute">
            <span aria-hidden="true">📦</span> Ver Acervo de Itens
          </a>
          <a class="button button-primary" [routerLink]="reservationRoute">
            <span aria-hidden="true">📅</span> Ir para Reservas
          </a>
        </div>
      </header>

      @if (errorMessage) {
        <div class="feedback-alert feedback-error" role="alert">
          <span>⚠ {{ errorMessage }}</span>
          <button class="btn-close" (click)="errorMessage = ''" aria-label="Fechar">✕</button>
        </div>
      }

      @if (isLoading && !data) {
        <div class="loading-state card card-outlined">
          <p>Carregando indicadores de reservas e patrimônio...</p>
        </div>
      } @else if (data) {
        <!-- Grid de KPIs Gerais -->
        <section class="kpi-grid">
          <!-- KPI 1: Total de Reservas -->
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Total de Reservas</span>
              <span class="kpi-icon">📅</span>
            </div>
            <div class="kpi-main-val">{{ data.overview.totalReservations }}</div>
            <div class="kpi-footer">
              <span class="badge badge-green">{{ data.overview.activeReservations }} ativas</span>
              <span class="badge badge-neutral">{{ data.overview.completedReservations }} concluídas</span>
              @if (data.overview.cancelledReservations > 0) {
                <span class="badge badge-red">{{ data.overview.cancelledReservations }} canceladas</span>
              }
            </div>
          </div>

          <!-- KPI 2: Horas de Utilização -->
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Horas Acumuladas</span>
              <span class="kpi-icon">⏱️</span>
            </div>
            <div class="kpi-main-val">{{ data.overview.totalHoursReserved }}<small class="kpi-unit">h</small></div>
            <div class="kpi-footer">
              <span class="kpi-hint">Tempo total de empréstimo concedido</span>
            </div>
          </div>

          <!-- KPI 3: Saúde do Acervo / Avarias -->
          <div class="kpi-card" [class.has-critical]="data.conditionStats.totalCritical > 0">
            <div class="kpi-header">
              <span class="kpi-title">Saúde do Acervo</span>
              <span class="kpi-icon">🛡️</span>
            </div>
            <div class="kpi-main-val" [class.text-green]="data.conditionStats.totalWithIssues === 0" [class.text-amber]="data.conditionStats.totalWithIssues > 0">
              {{ data.conditionStats.totalWithIssues === 0 ? '100%' : data.conditionStats.totalWithIssues }}
              @if (data.conditionStats.totalWithIssues > 0) {
                <small class="kpi-unit">avarias</small>
              }
            </div>
            <div class="kpi-footer">
              @if (data.conditionStats.totalWithIssues === 0) {
                <span class="badge badge-green">Todos os itens em perfeito estado</span>
              } @else {
                <span class="badge badge-orange">{{ data.conditionStats.totalWithIssues }} com avaria/defeito</span>
                @if (data.conditionStats.totalCritical > 0) {
                  <span class="badge badge-red">{{ data.conditionStats.totalCritical }} inoperante(s)</span>
                }
              }
            </div>
          </div>

          <!-- KPI 4: Professores e Solicitantes -->
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Docentes / Solicitantes</span>
              <span class="kpi-icon">👨‍🏫</span>
            </div>
            <div class="kpi-main-val">{{ data.topRequesters.length }}</div>
            <div class="kpi-footer">
              <span class="kpi-hint">Setores atendidos: {{ data.departmentStats.length }}</span>
            </div>
          </div>
        </section>

        <!-- Seção de Rankings Principais (2 Colunas) -->
        <div class="two-columns-grid">
          <!-- Ranking 1: Itens Mais Reservados -->
          <section class="card card-outlined panel-card">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">🏆 Itens Mais Reservados</h2>
                <p class="panel-subtitle">Recursos e equipamentos com maior volume de empréstimos</p>
              </div>
              <span class="badge badge-neutral">{{ data.topItems.length }} no acervo</span>
            </div>

            <div class="ranking-list">
              @for (item of data.topItems.slice(0, 7); track item.id; let i = $index) {
                <div class="ranking-item">
                  <div class="rank-badge" [class.rank-gold]="i === 0" [class.rank-silver]="i === 1" [class.rank-bronze]="i === 2">
                    {{ i + 1 }}º
                  </div>

                  <div class="rank-info">
                    <div class="rank-title-row">
                      <strong class="item-name">{{ item.name }}</strong>
                      <span class="patrimony-code">{{ item.code }}</span>
                    </div>

                    <div class="rank-bar-track">
                      <div class="rank-bar-fill fill-blue" [style.width.%]="item.percentage || (item.reservationCount > 0 ? 5 : 0)"></div>
                    </div>

                    <div class="rank-meta-row">
                      <span class="category-tag">{{ item.category }}</span>
                      <span class="condition-mini-badge" [ngClass]="getConditionClass(item.condition)">
                        {{ formatCondition(item.condition) }}
                      </span>
                      <span class="meta-right">
                        <strong>{{ item.reservationCount }}</strong> {{ item.reservationCount === 1 ? 'reserva' : 'reservas' }}
                        @if (item.totalHours > 0) {
                          <span class="hours-tag">({{ item.totalHours }}h)</span>
                        }
                      </span>
                    </div>
                  </div>
                </div>
              } @empty {
                <p class="empty-text">Nenhum item com reservas registradas ainda.</p>
              }
            </div>
          </section>

          <!-- Ranking 2: Professores que Mais Reservam -->
          <section class="card card-outlined panel-card">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">👨‍🏫 Professores que Mais Reservam</h2>
                <p class="panel-subtitle">Docentes e solicitantes com maior frequência de reservas</p>
              </div>
              <span class="badge badge-neutral">{{ data.topRequesters.length }} solicitantes</span>
            </div>

            <div class="ranking-list">
              @for (req of data.topRequesters.slice(0, 7); track req.requesterName; let i = $index) {
                <div class="ranking-item">
                  <div class="rank-badge" [class.rank-gold]="i === 0" [class.rank-silver]="i === 1" [class.rank-bronze]="i === 2">
                    {{ i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : (i + 1) + 'º')) }}
                  </div>

                  <div class="requester-avatar">
                    {{ getInitials(req.requesterName) }}
                  </div>

                  <div class="rank-info">
                    <div class="rank-title-row">
                      <strong class="requester-name">{{ req.requesterName }}</strong>
                      <span class="res-count-highlight">
                        {{ req.reservationCount }} {{ req.reservationCount === 1 ? 'reserva' : 'reservas' }}
                      </span>
                    </div>

                    <div class="rank-bar-track">
                      <div class="rank-bar-fill fill-green" [style.width.%]="req.percentage"></div>
                    </div>

                    <div class="rank-meta-row">
                      <span class="department-tag">🏢 {{ req.department }}</span>
                      @if (req.favoriteCategory && req.favoriteCategory !== '-') {
                        <span class="category-hint">Foco: <strong>{{ req.favoriteCategory }}</strong></span>
                      }
                      <span class="meta-right text-muted">
                        @if (req.activeCount > 0) {
                          <span class="active-dot">● {{ req.activeCount }} ativa</span>
                        }
                      </span>
                    </div>
                  </div>
                </div>
              } @empty {
                <p class="empty-text">Nenhum solicitante registrou reservas até o momento.</p>
              }
            </div>
          </section>
        </div>

        <!-- Seção 2: Diagnóstico de Avarias e Estado de Conservação -->
        <section class="card card-outlined panel-card full-width">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">🛠️ Diagnóstico de Conservação e Defeitos do Acervo</h2>
              <p class="panel-subtitle">Classificação física detalhada dos {{ data.overview.totalItems }} equipamentos cadastrados</p>
            </div>
            <div class="header-badges">
              <span class="badge badge-green">{{ data.conditionStats.byCondition.PERFEITO.count }} Perfeitos</span>
              @if (data.conditionStats.totalWithIssues > 0) {
                <span class="badge badge-orange">{{ data.conditionStats.totalWithIssues }} com Ressalvas</span>
              }
              @if (data.conditionStats.totalCritical > 0) {
                <span class="badge badge-red">{{ data.conditionStats.totalCritical }} Inoperantes</span>
              }
            </div>
          </div>

          <!-- Barras de Distribuição das 5 Condições -->
          <div class="conditions-grid">
            <!-- 1. Perfeito -->
            <div class="condition-card card-perfeito">
              <div class="condition-card-header">
                <span class="condition-dot dot-green"></span>
                <strong>Perfeito</strong>
                <span class="condition-count">{{ data.conditionStats.byCondition.PERFEITO.count }}</span>
              </div>
              <div class="condition-bar-track">
                <div class="condition-bar-fill fill-green" [style.width.%]="data.conditionStats.byCondition.PERFEITO.percentage"></div>
              </div>
              <span class="condition-percent">{{ data.conditionStats.byCondition.PERFEITO.percentage }}% do acervo</span>
            </div>

            <!-- 2. Com avarias -->
            <div class="condition-card card-avarias">
              <div class="condition-card-header">
                <span class="condition-dot dot-blue"></span>
                <strong>Com avarias</strong>
                <span class="condition-count">{{ data.conditionStats.byCondition.COM_AVARIAS.count }}</span>
              </div>
              <div class="condition-bar-track">
                <div class="condition-bar-fill fill-blue" [style.width.%]="data.conditionStats.byCondition.COM_AVARIAS.percentage"></div>
              </div>
              <span class="condition-percent">{{ data.conditionStats.byCondition.COM_AVARIAS.percentage }}% (estético/marcas)</span>
            </div>

            <!-- 3. Defeito mas funciona -->
            <div class="condition-card card-defeito-funciona">
              <div class="condition-card-header">
                <span class="condition-dot dot-amber"></span>
                <strong>Defeito (funciona)</strong>
                <span class="condition-count">{{ data.conditionStats.byCondition.DEFEITO_FUNCIONA.count }}</span>
              </div>
              <div class="condition-bar-track">
                <div class="condition-bar-fill fill-amber" [style.width.%]="data.conditionStats.byCondition.DEFEITO_FUNCIONA.percentage"></div>
              </div>
              <span class="condition-percent">{{ data.conditionStats.byCondition.DEFEITO_FUNCIONA.percentage }}% operacional</span>
            </div>

            <!-- 4. Defeito e não funciona direito -->
            <div class="condition-card card-defeito-parcial">
              <div class="condition-card-header">
                <span class="condition-dot dot-orange"></span>
                <strong>Defeito parcial</strong>
                <span class="condition-count">{{ data.conditionStats.byCondition.DEFEITO_PARCIAL.count }}</span>
              </div>
              <div class="condition-bar-track">
                <div class="condition-bar-fill fill-orange" [style.width.%]="data.conditionStats.byCondition.DEFEITO_PARCIAL.percentage"></div>
              </div>
              <span class="condition-percent">{{ data.conditionStats.byCondition.DEFEITO_PARCIAL.percentage }}% instável</span>
            </div>

            <!-- 5. Não funciona -->
            <div class="condition-card card-nao-funciona">
              <div class="condition-card-header">
                <span class="condition-dot dot-red"></span>
                <strong>Não funciona</strong>
                <span class="condition-count">{{ data.conditionStats.byCondition.NAO_FUNCIONA.count }}</span>
              </div>
              <div class="condition-bar-track">
                <div class="condition-bar-fill fill-red" [style.width.%]="data.conditionStats.byCondition.NAO_FUNCIONA.percentage"></div>
              </div>
              <span class="condition-percent">{{ data.conditionStats.byCondition.NAO_FUNCIONA.percentage }}% inoperante</span>
            </div>
          </div>

          <!-- Tabela de Atenção Imediata (Itens com problemas críticos ou manutenção) -->
          @if (data.conditionStats.itemsRequiringAttention.length > 0) {
            <div class="attention-box">
              <div class="attention-header">
                <h3>⚠️ Equipamentos que Requerem Atenção / Reparo ({{ data.conditionStats.itemsRequiringAttention.length }})</h3>
                <span class="text-muted text-sm">Itens inoperantes, com defeito parcial ou em manutenção preventiva</span>
              </div>
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Patrimônio</th>
                      <th>Equipamento</th>
                      <th>Localização</th>
                      <th>Estado Físico</th>
                      <th>Status</th>
                      <th>Descrição do Problema</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (att of data.conditionStats.itemsRequiringAttention; track att.id) {
                      <tr>
                        <td><span class="patrimony-code">{{ att.code }}</span></td>
                        <td><strong>{{ att.name }}</strong></td>
                        <td>📍 {{ att.location }}</td>
                        <td>
                          <span class="condition-mini-badge" [ngClass]="getConditionClass(att.condition)">
                            {{ formatCondition(att.condition) }}
                          </span>
                        </td>
                        <td>
                          <span class="status-badge" [class.badge-maintenance]="att.status === 'MAINTENANCE'" [class.badge-available]="att.status === 'AVAILABLE'">
                            {{ att.status === 'MAINTENANCE' ? 'Em Manutenção' : 'Disponível' }}
                          </span>
                        </td>
                        <td class="text-muted text-sm">{{ att.description || 'Sem observações cadastradas' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </section>

        <!-- Seção 3: Distribuição por Categorias e Setores (2 Colunas) -->
        <div class="two-columns-grid">
          <!-- Distribuição por Categoria -->
          <section class="card card-outlined panel-card">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">📦 Demanda por Categoria</h2>
                <p class="panel-subtitle">Proporção de reservas por tipo de recurso</p>
              </div>
            </div>

            <div class="category-breakdown">
              @for (cat of data.categoryStats; track cat.category) {
                <div class="breakdown-row">
                  <div class="breakdown-label">
                    <span>{{ cat.category }}</span>
                    <small class="text-muted">({{ cat.itemCount }} cadastrados · <strong>{{ cat.reservationCount }}</strong> reservas)</small>
                  </div>
                  <div class="breakdown-track">
                    <div class="breakdown-fill fill-blue" [style.width.%]="cat.percentage"></div>
                  </div>
                  <div class="breakdown-percent">{{ cat.percentage }}%</div>
                </div>
              } @empty {
                <p class="empty-text">Nenhuma categoria registrada.</p>
              }
            </div>
          </section>

          <!-- Distribuição por Setor / Departamento -->
          <section class="card card-outlined panel-card">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">🏢 Demanda por Departamento</h2>
                <p class="panel-subtitle">Origem das solicitações institucionais</p>
              </div>
            </div>

            <div class="category-breakdown">
              @for (dept of data.departmentStats; track dept.department) {
                <div class="breakdown-row">
                  <div class="breakdown-label">
                    <span>{{ dept.department }}</span>
                    <small class="text-muted">({{ dept.reservationCount }} reservas)</small>
                  </div>
                  <div class="breakdown-track">
                    <div class="breakdown-fill fill-green" [style.width.%]="dept.percentage"></div>
                  </div>
                  <div class="breakdown-percent">{{ dept.percentage }}%</div>
                </div>
              } @empty {
                <p class="empty-text">Nenhuma reserva departamental registrada.</p>
              }
            </div>
          </section>
        </div>

        <!-- Seção 4: Recursos Ociosos (Nunca Reservados) -->
        <section class="card card-outlined panel-card full-width">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">💤 Recursos Ociosos (Sem Reservas Registradas)</h2>
              <p class="panel-subtitle">Itens disponíveis no acervo que ainda não foram requisitados por nenhum setor ou professor</p>
            </div>
            <span class="badge badge-neutral">{{ data.idleItems.length }} itens ociosos</span>
          </div>

          @if (data.idleItems.length > 0) {
            <div class="idle-grid">
              @for (idle of data.idleItems; track idle.id) {
                <div class="idle-item-card">
                  <div class="idle-top">
                    <span class="patrimony-code">{{ idle.code }}</span>
                    <span class="category-tag">{{ idle.category }}</span>
                  </div>
                  <strong class="idle-name">{{ idle.name }}</strong>
                  <span class="idle-location">📍 {{ idle.location }}</span>
                  <div class="idle-bottom">
                    <span class="condition-mini-badge" [ngClass]="getConditionClass(idle.condition)">
                      {{ formatCondition(idle.condition) }}
                    </span>
                    <a class="button button-text btn-xs" [routerLink]="reservationRoute" [queryParams]="{ itemId: idle.id }">
                      Reservar Item →
                    </a>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="empty-text text-green">Excelente! Todos os itens do catálogo já possuem histórico de reservas.</p>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .dashboard-page {
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
      max-width: 760px;
    }

    .header-actions {
      display: flex;
      gap: var(--space-12, 12px);
      flex-wrap: wrap;
      align-items: center;
    }

    /* Feedback Alerts */
    .feedback-alert {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-12, 12px) var(--space-16, 16px);
      border-radius: var(--radius-8, 8px);
      font-size: var(--font-size-14, 14px);
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

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-16, 16px);
    }

    .kpi-card {
      background: var(--color-surface, #181D1A);
      border: 1px solid var(--color-border, #58675C);
      border-radius: var(--radius-12, 12px);
      padding: var(--space-16, 16px) var(--space-20, 20px);
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: transform 0.2s, border-color 0.2s;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      border-color: var(--color-action-green, #49D17D);
    }

    .kpi-card.has-critical {
      border-color: rgba(255, 122, 122, 0.4);
    }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .kpi-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary, #B9C3BC);
      font-weight: 600;
    }

    .kpi-icon {
      font-size: 16px;
    }

    .kpi-main-val {
      font-size: 36px;
      font-weight: 700;
      line-height: 1.1;
      color: var(--color-text-primary, #F5F7F4);
    }

    .kpi-unit {
      font-size: 18px;
      font-weight: 500;
      color: var(--color-text-secondary, #B9C3BC);
      margin-left: 2px;
    }

    .kpi-footer {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .kpi-hint {
      font-size: 12px;
      color: var(--color-text-secondary, #B9C3BC);
    }

    /* Badges */
    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-pill, 999px);
      white-space: nowrap;
    }

    .badge-green {
      background: rgba(73, 209, 125, 0.15);
      color: #49D17D;
      border: 1px solid rgba(73, 209, 125, 0.35);
    }

    .badge-blue {
      background: rgba(147, 197, 253, 0.15);
      color: #93C5FD;
      border: 1px solid rgba(147, 197, 253, 0.35);
    }

    .badge-orange {
      background: rgba(251, 146, 60, 0.15);
      color: #FB923C;
      border: 1px solid rgba(251, 146, 60, 0.35);
    }

    .badge-red {
      background: rgba(255, 122, 122, 0.15);
      color: #FF7A7A;
      border: 1px solid rgba(255, 122, 122, 0.35);
    }

    .badge-neutral {
      background: rgba(255, 255, 255, 0.08);
      color: var(--color-text-secondary, #B9C3BC);
      border: 1px solid var(--color-border, #58675C);
    }

    .text-green { color: #49D17D !important; }
    .text-amber { color: #F5A623 !important; }
    .text-muted { color: var(--color-text-secondary, #B9C3BC) !important; }
    .text-sm { font-size: 12px; }

    /* Panels & Grids */
    .two-columns-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-20, 20px);
    }

    @media (max-width: 900px) {
      .two-columns-grid {
        grid-template-columns: 1fr;
      }
    }

    .panel-card {
      padding: var(--space-20, 20px);
      background: var(--color-surface, #181D1A);
      border-radius: var(--radius-12, 12px);
    }

    .full-width {
      width: 100%;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--space-16, 16px);
      gap: 12px;
      border-bottom: 1px solid rgba(88, 103, 92, 0.3);
      padding-bottom: var(--space-12, 12px);
    }

    .panel-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      color: var(--color-text-primary, #F5F7F4);
    }

    .panel-subtitle {
      font-size: 12px;
      color: var(--color-text-secondary, #B9C3BC);
      margin: 2px 0 0 0;
    }

    .header-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    /* Ranking Lists */
    .ranking-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-12, 12px);
    }

    .ranking-item {
      display: flex;
      align-items: center;
      gap: var(--space-12, 12px);
      padding: var(--space-8, 8px) var(--space-12, 12px);
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(88, 103, 92, 0.25);
      border-radius: var(--radius-8, 8px);
      transition: background 0.15s;
    }

    .ranking-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(73, 209, 125, 0.3);
    }

    .rank-badge {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text-secondary, #B9C3BC);
      flex-shrink: 0;
    }

    .rank-gold {
      background: rgba(245, 166, 35, 0.2);
      color: #F5A623;
      border: 1px solid rgba(245, 166, 35, 0.5);
    }

    .rank-silver {
      background: rgba(200, 210, 220, 0.2);
      color: #E2E8F0;
      border: 1px solid rgba(200, 210, 220, 0.5);
    }

    .rank-bronze {
      background: rgba(217, 119, 6, 0.2);
      color: #F59E0B;
      border: 1px solid rgba(217, 119, 6, 0.5);
    }

    .requester-avatar {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: linear-gradient(135deg, #2563EB, #1D4ED8);
      color: #FFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      flex-shrink: 0;
    }

    .rank-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .rank-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .item-name, .requester-name {
      font-size: 14px;
      color: var(--color-text-primary, #F5F7F4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .patrimony-code {
      font-family: monospace;
      font-size: 11px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.08);
      padding: 1px 6px;
      border-radius: 4px;
      color: #CBD5E1;
    }

    .res-count-highlight {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-action-green, #49D17D);
    }

    .rank-bar-track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 99px;
      overflow: hidden;
    }

    .rank-bar-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 0.6s ease-out;
    }

    .fill-blue { background: linear-gradient(90deg, #3B82F6, #60A5FA); }
    .fill-green { background: linear-gradient(90deg, #10B981, #34D399); }
    .fill-amber { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
    .fill-orange { background: linear-gradient(90deg, #EA580C, #FB923C); }
    .fill-red { background: linear-gradient(90deg, #DC2626, #F87171); }

    .rank-meta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .category-tag, .department-tag {
      background: rgba(255, 255, 255, 0.05);
      padding: 1px 6px;
      border-radius: 4px;
    }

    .category-hint {
      font-size: 11px;
      color: #93C5FD;
    }

    .meta-right {
      margin-left: auto;
      white-space: nowrap;
    }

    .hours-tag {
      color: var(--color-text-secondary, #B9C3BC);
      font-size: 11px;
    }

    .active-dot {
      color: #49D17D;
      font-weight: 600;
    }

    /* Conditions Grid */
    .conditions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--space-12, 12px);
      margin-bottom: var(--space-16, 16px);
    }

    .condition-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(88, 103, 92, 0.3);
      border-radius: var(--radius-8, 8px);
      padding: var(--space-12, 12px);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .condition-card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--color-text-primary, #F5F7F4);
    }

    .condition-count {
      margin-left: auto;
      font-size: 16px;
      font-weight: 700;
    }

    .condition-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .dot-green { background: #49D17D; }
    .dot-blue { background: #93C5FD; }
    .dot-amber { background: #F5A623; }
    .dot-orange { background: #FB923C; }
    .dot-red { background: #FF7A7A; }

    .condition-bar-track {
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 99px;
      overflow: hidden;
    }

    .condition-bar-fill {
      height: 100%;
      border-radius: 99px;
    }

    .condition-percent {
      font-size: 11px;
      color: var(--color-text-secondary, #B9C3BC);
    }

    /* Mini condition badge */
    .condition-mini-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: var(--radius-pill, 999px);
      white-space: nowrap;
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

    /* Attention Box */
    .attention-box {
      margin-top: var(--space-16, 16px);
      background: rgba(255, 122, 122, 0.05);
      border: 1px solid rgba(255, 122, 122, 0.3);
      border-radius: var(--radius-8, 8px);
      padding: var(--space-16, 16px);
    }

    .attention-header {
      margin-bottom: var(--space-12, 12px);
    }

    .attention-header h3 {
      font-size: 14px;
      font-weight: 600;
      color: #FFB3B3;
      margin: 0;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    .data-table th, .data-table td {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(88, 103, 92, 0.3);
    }

    .data-table th {
      background: rgba(0, 0, 0, 0.2);
      color: var(--color-text-secondary, #B9C3BC);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 999px;
    }

    .badge-maintenance {
      background: rgba(255, 122, 122, 0.15);
      color: #FF7A7A;
      border: 1px solid rgba(255, 122, 122, 0.3);
    }

    .badge-available {
      background: rgba(73, 209, 125, 0.15);
      color: #49D17D;
      border: 1px solid rgba(73, 209, 125, 0.3);
    }

    /* Breakdown Rows */
    .category-breakdown {
      display: flex;
      flex-direction: column;
      gap: var(--space-12, 12px);
    }

    .breakdown-row {
      display: flex;
      align-items: center;
      gap: var(--space-12, 12px);
      font-size: 13px;
    }

    .breakdown-label {
      flex: 0 0 200px;
      display: flex;
      flex-direction: column;
    }

    .breakdown-track {
      flex: 1;
      height: 10px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 99px;
      overflow: hidden;
    }

    .breakdown-fill {
      height: 100%;
      border-radius: 99px;
    }

    .breakdown-percent {
      flex: 0 0 45px;
      text-align: right;
      font-weight: 600;
      font-size: 12px;
      color: var(--color-text-primary, #F5F7F4);
    }

    /* Idle Grid */
    .idle-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: var(--space-12, 12px);
    }

    .idle-item-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(88, 103, 92, 0.3);
      border-radius: var(--radius-8, 8px);
      padding: var(--space-12, 12px);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .idle-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .idle-name {
      font-size: 13px;
      color: var(--color-text-primary, #F5F7F4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .idle-location {
      font-size: 11px;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .idle-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
      padding-top: 6px;
      border-top: 1px solid rgba(88, 103, 92, 0.2);
    }

    .empty-text {
      font-size: 13px;
      color: var(--color-text-secondary, #B9C3BC);
      padding: 1rem 0;
      text-align: center;
    }

    .btn-xs {
      padding: 2px 6px;
      font-size: 11px;
    }
  `]
})
export class ReservationDashboardPageComponent implements OnInit {
  data: ReservationDashboardData | null = null
  isLoading = false
  errorMessage = ''

  contextEyebrow = 'Administração · Inteligência & Métricas'
  catalogRoute = '/administracao/cadastros/itens-reserva'
  reservationRoute = '/administracao/reservas'

  constructor(
    private readonly http: HttpClient,
    public readonly authService: AuthService,
    private readonly route: ActivatedRoute,
  ) {
    const path = this.route.snapshot.routeConfig?.path || ''
    if (path.includes('desenvolvedor')) {
      this.contextEyebrow = 'Desenvolvedor · Inteligência & Métricas'
      this.catalogRoute = '/desenvolvedor/cadastros/itens-reserva'
      this.reservationRoute = '/desenvolvedor/reservas'
    }
  }

  ngOnInit(): void {
    this.loadDashboard()
  }

  loadDashboard(): void {
    this.isLoading = true
    this.errorMessage = ''

    this.http.get<ReservationDashboardData>('/api/reservations/dashboard').subscribe({
      next: (res) => {
        this.data = res
        this.isLoading = false
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erro ao carregar dados analíticos de reservas.'
        this.isLoading = false
      },
    })
  }

  getInitials(name: string): string {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  formatCondition(condition: string): string {
    switch (condition) {
      case 'PERFEITO': return 'Perfeito'
      case 'COM_AVARIAS': return 'Com avarias'
      case 'DEFEITO_FUNCIONA': return 'Defeito (funciona)'
      case 'DEFEITO_PARCIAL': return 'Defeito parcial'
      case 'NAO_FUNCIONA': return 'Não funciona'
      default: return condition || 'Perfeito'
    }
  }

  getConditionClass(condition: string): string {
    switch (condition) {
      case 'PERFEITO': return 'condition-perfeito'
      case 'COM_AVARIAS': return 'condition-avarias'
      case 'DEFEITO_FUNCIONA': return 'condition-defeito-funciona'
      case 'DEFEITO_PARCIAL': return 'condition-defeito-parcial'
      case 'NAO_FUNCIONA': return 'condition-nao-funciona'
      default: return 'condition-perfeito'
    }
  }
}
