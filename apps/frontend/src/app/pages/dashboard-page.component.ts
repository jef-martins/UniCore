import { Component, OnInit } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { CommonModule } from '@angular/common'

interface DashboardStats {
  totalCreated: number
  totalResolved: number
  byType: Record<string, { created: number, resolved: number }>
  tasks: Array<{
    id: string
    title: string
    type: string
    completed: boolean
    createdAt: string
    completedAt: string | null
    user: { username: string }
  }>
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-page">
      <header class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-description">Relatórios e estatísticas gerais do sistema.</p>
      </header>

      <div class="subheader">
        <h2>Agendamentos</h2>
      </div>

      <div class="dashboard-content" *ngIf="stats; else loading">
        <div class="reports-container">
          
          <!-- Tabela de Tarefas Completa (Em cima) -->
          <div class="card card-outlined report-card">
            <h3>Relatório Detalhado de Tarefas</h3>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Tipo</th>
                    <th>Criador</th>
                    <th>Status</th>
                    <th>Data de Criação</th>
                    <th>Data de Conclusão</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let task of stats.tasks">
                    <td><strong>{{ task.title }}</strong></td>
                    <td>{{ formatType(task.type) }}</td>
                    <td><span class="user-badge">{{ task.user.username }}</span></td>
                    <td>
                      <span class="status-badge" [class.success]="task.completed">{{ task.completed ? 'Concluída' : 'Pendente' }}</span>
                    </td>
                    <td>{{ task.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td>{{ task.completedAt ? (task.completedAt | date:'dd/MM/yyyy HH:mm') : '-' }}</td>
                  </tr>
                  <tr *ngIf="stats.tasks.length === 0">
                    <td colspan="6" class="text-center">Nenhuma tarefa encontrada.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Gráficos (Embaixo) -->
          <div class="card card-outlined report-card">
            <h3>Gráficos de Barras - Agendamentos</h3>
            <div class="charts-grid">
              
              <!-- Gráfico Total -->
              <div class="chart-section highlight-chart">
                <h4>Total Geral</h4>
                <div class="bar-chart">
                  <div class="bar-group">
                    <div class="bar-label">Criados ({{ stats.totalCreated }})</div>
                    <div class="bar-track">
                      <div class="bar-fill created" [style.width.%]="getPercentage(stats.totalCreated, maxStat)"></div>
                    </div>
                  </div>
                  <div class="bar-group">
                    <div class="bar-label">Resolvidos ({{ stats.totalResolved }})</div>
                    <div class="bar-track">
                      <div class="bar-fill resolved" [style.width.%]="getPercentage(stats.totalResolved, maxStat)"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Gráficos Por Tipo -->
              <div class="chart-section" *ngFor="let type of objectKeys(stats.byType)">
                <h4>{{ formatType(type) }}</h4>
                <div class="bar-chart">
                  <div class="bar-group">
                    <div class="bar-label">Criados ({{ stats.byType[type].created }})</div>
                    <div class="bar-track">
                      <div class="bar-fill created" [style.width.%]="getPercentage(stats.byType[type].created, getMaxForType(type))"></div>
                    </div>
                  </div>
                  <div class="bar-group">
                    <div class="bar-label">Resolvidos ({{ stats.byType[type].resolved }})</div>
                    <div class="bar-track">
                      <div class="bar-fill resolved" [style.width.%]="getPercentage(stats.byType[type].resolved, getMaxForType(type))"></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      <ng-template #loading>
        <p>Carregando estatísticas...</p>
      </ng-template>
    </div>
  `,
  styles: [`
    .dashboard-page {
      padding: 2rem;
    }
    .page-header {
      margin-bottom: 2rem;
    }
    .page-title {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    .page-description {
      color: var(--text-color-secondary, #a1a1aa);
    }
    .subheader {
      border-bottom: 2px solid var(--border-color, #3f3f46);
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
    }
    .subheader h2 {
      font-size: 1.25rem;
    }
    .reports-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .report-card {
      padding: 1.5rem;
    }
    .report-card h3 {
      margin-top: 0;
      margin-bottom: 1.5rem;
      font-size: 1.2rem;
      font-weight: 600;
    }
    .table-responsive {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }
    .data-table th, .data-table td {
      border: 1px solid var(--border-color, #3f3f46);
      padding: 0.75rem 1rem;
      text-align: left;
    }
    .data-table th {
      background-color: rgba(255, 255, 255, 0.05);
      font-weight: 600;
      white-space: nowrap;
    }
    .data-table td {
      vertical-align: middle;
    }
    .text-center {
      text-align: center !important;
    }
    .user-badge {
      background: rgba(255,255,255,0.1);
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-size: 0.85rem;
    }
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 99px;
      font-size: 0.85rem;
      font-weight: 600;
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
    }
    .status-badge.success {
      background: rgba(16, 185, 129, 0.15);
      color: #6ee7b7;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2rem;
    }
    .chart-section {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 8px;
      padding: 1.25rem;
    }
    .highlight-chart {
      grid-column: 1 / -1;
      background: rgba(59, 130, 246, 0.05);
      border-color: rgba(59, 130, 246, 0.2);
    }
    .chart-section h4 {
      margin-top: 0;
      margin-bottom: 1.25rem;
      font-size: 1.05rem;
      color: var(--text-color, #fff);
      border-bottom: 1px solid var(--border-color, #3f3f46);
      padding-bottom: 0.5rem;
    }
    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .bar-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .bar-label {
      font-weight: 500;
      font-size: 0.9rem;
      color: #d4d4d8;
    }
    .bar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      height: 20px;
      width: 100%;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      transition: width 0.8s ease-out;
      border-radius: 6px;
    }
    .bar-fill.created {
      background: linear-gradient(90deg, #2563eb, #3b82f6);
    }
    .bar-fill.resolved {
      background: linear-gradient(90deg, #059669, #10b981);
    }
  `]
})
export class DashboardPageComponent implements OnInit {
  stats: DashboardStats | null = null;
  objectKeys = Object.keys;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<DashboardStats>('/api/tasks/dashboard').subscribe({
      next: (data) => this.stats = data,
      error: (err) => console.error('Failed to load dashboard stats', err)
    });
  }

  get maxStat(): number {
    if (!this.stats) return 1;
    return Math.max(this.stats.totalCreated, this.stats.totalResolved, 1);
  }

  getMaxForType(type: string): number {
    if (!this.stats || !this.stats.byType[type]) return 1;
    const statsForType = this.stats.byType[type];
    return Math.max(statsForType.created, statsForType.resolved, 1);
  }

  getPercentage(value: number, max: number): number {
    if (max === 0) return 0;
    return Math.min(100, Math.round((value / max) * 100));
  }

  formatType(type: string): string {
    const map: Record<string, string> = {
      VESTIBULAR: 'Vestibular',
      ADMINISTRACAO: 'Administração',
      TESOURARIA: 'Tesouraria',
      COORDENACAO: 'Coordenação',
      REGISTRO_ACADEMICO: 'Registro Acadêmico',
      ALUNOS: 'Alunos',
      PROFESSORES: 'Professores',
    };
    return map[type] || type;
  }
}
