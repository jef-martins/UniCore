import { Component, OnInit } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { CommonModule } from '@angular/common'

interface DashboardStats {
  totalCreated: number
  totalResolved: number
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
        <div class="reports-grid">
          <!-- Tabela -->
          <div class="report-card">
            <h3>Relatório em Tabela</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Métrica</th>
                  <th>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Criados</td>
                  <td>{{ stats.totalCreated }}</td>
                </tr>
                <tr>
                  <td>Resolvidos</td>
                  <td>{{ stats.totalResolved }}</td>
                </tr>
                <tr>
                  <td>Pendentes</td>
                  <td>{{ Math.max(0, stats.totalCreated - stats.totalResolved) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Gráfico de Barras via CSS -->
          <div class="report-card">
            <h3>Gráfico de Barras</h3>
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
      color: #666;
    }
    .subheader {
      border-bottom: 2px solid #eaeaea;
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
    }
    .subheader h2 {
      font-size: 1.25rem;
      color: #333;
    }
    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }
    .report-card {
      background: #fff;
      border: 1px solid #eaeaea;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .report-card h3 {
      margin-top: 0;
      margin-bottom: 1rem;
      font-size: 1.1rem;
      color: #444;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
    }
    .data-table th, .data-table td {
      border: 1px solid #ddd;
      padding: 0.75rem;
      text-align: left;
    }
    .data-table th {
      background-color: #f9f9f9;
      font-weight: 600;
    }
    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1rem 0;
    }
    .bar-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .bar-label {
      font-weight: 500;
      font-size: 0.95rem;
    }
    .bar-track {
      background: #f0f0f0;
      border-radius: 4px;
      height: 24px;
      width: 100%;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      transition: width 0.5s ease-out;
    }
    .bar-fill.created {
      background: #3b82f6;
    }
    .bar-fill.resolved {
      background: #10b981;
    }
  `]
})
export class DashboardPageComponent implements OnInit {
  stats: DashboardStats | null = null;
  Math = Math;

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

  getPercentage(value: number, max: number): number {
    if (max === 0) return 0;
    return Math.min(100, Math.round((value / max) * 100));
  }
}
