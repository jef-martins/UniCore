import { CommonModule, isPlatformBrowser } from '@angular/common'
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router, RouterModule } from '@angular/router'
import {
  LeadItem,
  LeadStatus,
  TerritoryItem,
  TerritoryService,
} from '../services/territory.service'
import { LeadModalComponent, ResidenceContextInfo } from './lead-modal.component'
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  buildFullAddress,
  createMapPinSvg,
  formatGoogleMapsRouteUrl,
  formatGoogleMapsUrl,
  getDeterministicCoordinates,
} from './map-utils'

@Component({
  selector: 'app-leads-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LeadModalComponent],
  template: `
    <section class="leads-page" aria-labelledby="page-title">
      <!-- Cabeçalho -->
      <header class="page-header-container">
        <div class="header-info">
          <p class="hero-eyebrow">{{ eyebrow }}</p>
          <h1 id="page-title" class="page-title">Gestão e Acompanhamento de Leads</h1>
          <p class="page-subtitle">
            Consulte, filtre e acompanhe todas as abordagens e visitas domiciliares realizadas no território com status de conversão e contato via WhatsApp.
          </p>
        </div>
        <div class="header-actions">
          <button class="button button-primary" type="button" (click)="openCreateLeadModal()">
            <span aria-hidden="true">＋</span> Cadastrar Lead
          </button>
          <a class="button button-secondary" [routerLink]="mapRoute">
            <span aria-hidden="true">🗺️</span> Mapa de Territórios
          </a>
          <a class="button button-secondary" [routerLink]="territoriesRoute">
            <span aria-hidden="true">🏢</span> Gestão Territorial
          </a>
          <a class="button button-secondary" [routerLink]="dashboardRoute">
            <span aria-hidden="true">📊</span> Dashboards & Funil
          </a>
        </div>
      </header>

      <!-- Mensagens Globais -->
      @if (globalSuccess) {
        <div class="alert alert-success">
          <span>✓ {{ globalSuccess }}</span>
          <button class="btn-close" (click)="globalSuccess = ''">✕</button>
        </div>
      }
      @if (globalError) {
        <div class="alert alert-error">
          <span>⚠ {{ globalError }}</span>
          <button class="btn-close" (click)="globalError = ''">✕</button>
        </div>
      }

      <!-- Cards de Métricas de Leads -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Total de Leads</span>
          <span class="stat-value">{{ leads.length }}</span>
          <span class="stat-hint">Cadastrados em residências</span>
        </div>
        <div class="stat-card stat-matricula">
          <span class="stat-label">Matrículas Efetivadas</span>
          <span class="stat-value">{{ matriculasCount }}</span>
          <span class="stat-hint">{{ matriculaConversionRate }}% de conversão</span>
        </div>
        <div class="stat-card stat-inscricao">
          <span class="stat-label">Inscrições Realizadas</span>
          <span class="stat-value">{{ inscricoesCount }}</span>
          <span class="stat-hint">{{ inscricaoConversionRate }}% do total</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Autorizam Informações (LGPD)</span>
          <span class="stat-value">{{ authorizedCount }}</span>
          <span class="stat-hint">{{ authorizedRate }}% dos contatos</span>
        </div>
      </div>

      <!-- Barra de Filtros Avançados -->
      <div class="filters-card">
        <div class="filters-grid">
          <!-- Busca por texto -->
          <div class="filter-field search-field">
            <label for="filter-search">Buscar Lead</label>
            <input
              id="filter-search"
              type="text"
              class="form-control"
              placeholder="Nome, celular ou curso..."
              [(ngModel)]="filters.search"
              (input)="applyFilters()"
            />
          </div>

          <!-- Território -->
          <div class="filter-field">
            <label for="filter-territory">Território</label>
            <select
              id="filter-territory"
              class="form-control"
              [(ngModel)]="filters.territoryId"
              (change)="applyFilters()"
            >
              <option value="">Todos os Territórios</option>
              @for (t of territories; track t.id) {
                <option [value]="t.id">{{ t.name }}</option>
              }
            </select>
          </div>

          <!-- Status -->
          <div class="filter-field">
            <label for="filter-status">Status</label>
            <select
              id="filter-status"
              class="form-control"
              [(ngModel)]="filters.status"
              (change)="applyFilters()"
            >
              <option value="">Todos os Status</option>
              <option value="FALHOU">Falhou</option>
              <option value="LEAD">Lead</option>
              <option value="INSCRICAO">Inscrição</option>
              <option value="MATRICULA">Matrícula</option>
            </select>
          </div>

          <!-- Origem -->
          <div class="filter-field">
            <label for="filter-origin">Origem</label>
            <select
              id="filter-origin"
              class="form-control"
              [(ngModel)]="filters.origin"
              (change)="applyFilters()"
            >
              <option value="">Todas as Origens</option>
              <option value="VISITA_DOMICILIAR">Visita Domiciliar</option>
              <option value="INDICACAO">Indicação</option>
              <option value="EVENTO">Evento</option>
              <option value="REDES_SOCIAIS">Redes Sociais</option>
              <option value="BALCAO">Balcão</option>
              <option value="OUTRO">Outra</option>
            </select>
          </div>

          <!-- Botão Limpar -->
          <div class="filter-field btn-clear-box">
            <button class="button button-secondary btn-clear" (click)="clearFilters()">
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      <!-- Barra de Alternância de Visão -->
      <div style="display: flex; gap: 8px; margin-bottom: 16px;">
        <button
          type="button"
          class="button"
          [ngClass]="activeView === 'tabela' ? 'button-primary' : 'button-secondary'"
          (click)="setView('tabela')"
        >
          📋 Modo Tabela ({{ leads.length }})
        </button>
        <button
          type="button"
          class="button"
          [ngClass]="activeView === 'mapa' ? 'button-primary' : 'button-secondary'"
          (click)="setView('mapa')"
        >
          🗺️ Visualização no Mapa
        </button>
      </div>

      <!-- VISÃO: MAPA INTERATIVO -->
      @if (activeView === 'mapa') {
        <div style="margin-bottom: 24px;">
          <div id="leads-map-canvas" style="height: 600px; width: 100%; border-radius: 14px; border: 1px solid var(--border-color, #3f3f46);"></div>
        </div>
      }

      <!-- Tabela de Leads -->
      @if (activeView === 'tabela') {
      <div class="table-container">
        @if (isLoading) {
          <div class="loading-state">Carregando leads...</div>
        } @else if (leads.length === 0) {
          <div class="empty-state">
            <p>Nenhum lead encontrado com os filtros selecionados.</p>
            <button class="button button-primary" type="button" (click)="openCreateLeadModal()" style="margin-top: 12px;">
              <span aria-hidden="true">＋</span> Cadastrar Primeiro Lead
            </button>
          </div>
        } @else {
          <table class="leads-table">
            <thead>
              <tr>
                <th>Nome do Lead</th>
                <th>Contato / WhatsApp</th>
                <th>Curso / Área de Interesse</th>
                <th>Localização Residencial</th>
                <th>Origem</th>
                <th>Data</th>
                <th>Status</th>
                <th>Autorizou?</th>
                <th class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (lead of leads; track lead.id) {
                <tr>
                  <td>
                    <strong>{{ lead.name }}</strong>
                    <div class="obs-snippet" *ngIf="lead.observations" title="{{ lead.observations }}">
                      📝 {{ lead.observations }}
                    </div>
                  </td>
                  <td>
                    <div class="whatsapp-cell">
                      <span>{{ lead.whatsapp }}</span>
                      <a
                        [href]="getWhatsappLink(lead.whatsapp)"
                        target="_blank"
                        class="btn-wa"
                        title="Conversar no WhatsApp"
                      >
                        💬
                      </a>
                    </div>
                  </td>
                  <td>
                    <span class="course-badge">🎓 {{ lead.courseOrArea }}</span>
                  </td>
                  <td>
                    <div class="location-stack">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="street-name">
                          {{ lead.residenceNumber?.street?.name }}, nº {{ lead.residenceNumber?.number }}
                        </span>
                        <a
                          [href]="getLeadGoogleMapsUrl(lead)"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="btn-icon-map"
                          title="Abrir no Google Maps"
                          style="text-decoration: none; font-size: 1rem; line-height: 1;"
                        >
                          📍
                        </a>
                      </div>
                      <span class="area-sub">
                        {{ lead.residenceNumber?.street?.neighborhood?.name }} — 
                        {{ lead.residenceNumber?.street?.neighborhood?.subterritory?.territory?.name }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span class="origin-tag">{{ formatOrigin(lead.origin) }}</span>
                  </td>
                  <td>{{ lead.date | date: 'dd/MM/yyyy' }}</td>
                  <td>
                    <span class="badge" [ngClass]="getLeadStatusBadgeClass(lead.status)">
                      {{ getLeadStatusLabel(lead.status) }}
                    </span>
                  </td>
                  <td>
                    <span class="consent-tag" [class.yes]="lead.authorizedInfo" [class.no]="!lead.authorizedInfo">
                      {{ lead.authorizedInfo ? 'Sim ✓' : 'Não ✕' }}
                    </span>
                  </td>
                  <td class="text-right actions-cell">
                    <button class="button button-secondary btn-xs" (click)="editLead(lead)">
                      Editar
                    </button>
                    <button class="btn-icon-danger" (click)="confirmDeleteLead(lead)" title="Excluir">
                      🗑
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
      }

      <!-- Modal de Edição de Lead -->
      <app-lead-modal
        [isOpen]="showLeadModal"
        [residenceContext]="selectedResidenceContext"
        [leadToEdit]="selectedLeadToEdit"
        (close)="showLeadModal = false"
        (saved)="onLeadSaved($event)"
      ></app-lead-modal>
    </section>
  `,
  styles: [`
    .leads-page {
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
    .header-actions { display: flex; gap: 0.75rem; align-items: center; }

    /* Alertas */
    .alert {
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.95rem;
    }
    .alert-success { background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); color: #86efac; }
    .alert-error { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; }
    .btn-close { background: transparent; border: none; color: inherit; cursor: pointer; }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--color-surface, #18181b);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
    }
    .stat-matricula {
      border-color: rgba(34, 197, 94, 0.4);
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(24, 24, 27, 0.8));
    }
    .stat-inscricao {
      border-color: rgba(245, 158, 11, 0.4);
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(24, 24, 27, 0.8));
    }
    .stat-label {
      font-size: 0.825rem;
      color: var(--text-color-secondary, #a1a1aa);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }
    .stat-value { font-size: 1.85rem; font-weight: 800; color: #fff; }
    .stat-hint { font-size: 0.8rem; color: var(--text-color-secondary, #a1a1aa); margin-top: 0.25rem; }

    /* Filtros */
    .filters-card {
      background: var(--color-surface, #18181b);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
    }
    .filters-grid {
      display: grid;
      grid-template-columns: 2fr 1.2fr 1fr 1fr auto;
      gap: 1rem;
      align-items: flex-end;
    }
    .filter-field { display: flex; flex-direction: column; gap: 0.4rem; }
    .filter-field label { font-size: 0.8rem; font-weight: 600; color: #d4d4d8; }
    .form-control {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 8px;
      padding: 0.55rem 0.75rem;
      color: #fff;
      font-size: 0.9rem;
    }
    .form-control:focus { outline: none; border-color: var(--primary-color, #3b82f6); }
    .btn-clear-box { align-self: flex-end; }
    .btn-clear { padding: 0.55rem 0.85rem; font-size: 0.85rem; }

    /* Tabela de Leads */
    .table-container {
      background: var(--color-surface, #18181b);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 12px;
      overflow-x: auto;
    }
    .leads-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .leads-table th {
      text-align: left;
      padding: 0.85rem 1rem;
      color: var(--text-color-secondary, #a1a1aa);
      border-bottom: 1px solid var(--border-color, #3f3f46);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .leads-table td {
      padding: 0.9rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #d4d4d8;
    }
    .leads-table tr:hover td { background: rgba(255, 255, 255, 0.02); }
    .obs-snippet {
      font-size: 0.75rem;
      color: #a1a1aa;
      max-width: 260px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
    .whatsapp-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-wa {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.35);
      color: #4ade80;
      text-decoration: none;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 0.85rem;
    }
    .btn-wa:hover { background: rgba(34, 197, 94, 0.3); }
    .course-badge {
      background: rgba(255, 255, 255, 0.05);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.825rem;
      color: #f4f4f5;
    }
    .location-stack {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .street-name { font-weight: 600; color: #fff; }
    .area-sub { font-size: 0.75rem; color: #a1a1aa; }
    .origin-tag {
      font-size: 0.8rem;
      color: #d4d4d8;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .consent-tag {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .consent-tag.yes { background: rgba(34, 197, 94, 0.15); color: #86efac; }
    .consent-tag.no { background: rgba(239, 68, 68, 0.15); color: #fca5a5; }

    /* Badges de Status */
    .badge {
      font-size: 0.725rem;
      font-weight: 700;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .badge-falhou { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .badge-lead { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .badge-inscricao { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
    .badge-matricula { background: rgba(34, 197, 94, 0.2); color: #86efac; }

    .text-right { text-align: right; }
    .actions-cell { display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; }
    .btn-xs { padding: 0.3rem 0.65rem; font-size: 0.775rem; }
    .btn-icon-danger {
      background: transparent;
      border: none;
      color: #ef4444;
      cursor: pointer;
      font-size: 0.95rem;
      padding: 0.3rem;
      border-radius: 4px;
    }
    .btn-icon-danger:hover { background: rgba(239, 68, 68, 0.15); }

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
    .button-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color, #3f3f46);
      color: #d4d4d8;
    }
    .button-secondary:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }

    /* Loading & Empty */
    .loading-state, .empty-state {
      padding: 3rem;
      text-align: center;
      color: var(--text-color-secondary, #a1a1aa);
    }

    @media (max-width: 900px) {
      .filters-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class LeadsPageComponent implements OnInit, OnDestroy {
  leads: LeadItem[] = []
  territories: TerritoryItem[] = []
  isLoading = false
  globalSuccess = ''
  globalError = ''

  activeView: 'tabela' | 'mapa' = 'tabela'
  private map: any = null
  private leaflet: any = null
  private markerInstances: any[] = []

  filters = {
    search: '',
    territoryId: '',
    status: '' as '' | LeadStatus,
    origin: '',
  }

  showLeadModal = false
  selectedResidenceContext?: ResidenceContextInfo
  selectedLeadToEdit?: LeadItem | null

  mapRoute = '/administracao/cadastros/mapa'
  territoriesRoute = '/administracao/cadastros/territorios'
  dashboardRoute = '/administracao/dashboards/territorios'
  eyebrow = 'Administração / Cadastros'

  constructor(
    private readonly territoryService: TerritoryService,
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly router: Router,
  ) {
    const url = this.router.url
    if (url.includes('/vestibular/')) {
      this.mapRoute = '/vestibular/cadastros/mapa'
      this.territoriesRoute = '/vestibular/cadastros/territorios'
      this.dashboardRoute = '/vestibular/dashboards/territorios'
      this.eyebrow = 'Vestibular / Cadastros'
    } else if (url.includes('/desenvolvedor/')) {
      this.mapRoute = '/desenvolvedor/cadastros/mapa'
      this.territoriesRoute = '/desenvolvedor/cadastros/territorios'
      this.dashboardRoute = '/desenvolvedor/dashboards/territorios'
      this.eyebrow = 'Desenvolvedor / Cadastros'
    }
  }

  ngOnInit(): void {
    this.loadTerritories()
    this.loadLeads()
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
  }

  loadTerritories(): void {
    this.territoryService.getTerritories().subscribe({
      next: (data) => (this.territories = data),
    })
  }

  loadLeads(): void {
    this.isLoading = true
    this.territoryService
      .getLeads({
        search: this.filters.search || undefined,
        territoryId: this.filters.territoryId || undefined,
        status: this.filters.status || undefined,
        origin: this.filters.origin || undefined,
      })
      .subscribe({
        next: (data) => {
          this.leads = data
          this.isLoading = false
          if (this.activeView === 'mapa') {
            this.renderLeadsOnMap()
          }
        },
        error: () => {
          this.globalError = 'Erro ao carregar lista de leads.'
          this.isLoading = false
        },
      })
  }

  applyFilters(): void {
    this.loadLeads()
  }

  clearFilters(): void {
    this.filters = { search: '', territoryId: '', status: '', origin: '' }
    this.loadLeads()
  }

  // Estatísticas
  get matriculasCount(): number {
    return this.leads.filter((l) => l.status === 'MATRICULA').length
  }

  get inscricoesCount(): number {
    return this.leads.filter((l) => l.status === 'INSCRICAO' || l.status === 'MATRICULA').length
  }

  get matriculaConversionRate(): number {
    return this.leads.length > 0
      ? Math.round((this.matriculasCount / this.leads.length) * 100)
      : 0
  }

  get inscricaoConversionRate(): number {
    return this.leads.length > 0
      ? Math.round((this.inscricoesCount / this.leads.length) * 100)
      : 0
  }

  get authorizedCount(): number {
    return this.leads.filter((l) => l.authorizedInfo).length
  }

  get authorizedRate(): number {
    return this.leads.length > 0
      ? Math.round((this.authorizedCount / this.leads.length) * 100)
      : 0
  }

  // Ações
  editLead(lead: LeadItem): void {
    this.selectedLeadToEdit = lead
    this.selectedResidenceContext = {
      residenceId: lead.residenceNumberId,
      residenceNumber: lead.residenceNumber?.number || '',
      streetName: lead.residenceNumber?.street?.name || '',
      neighborhoodName: lead.residenceNumber?.street?.neighborhood?.name || '',
      subterritoryName:
        lead.residenceNumber?.street?.neighborhood?.subterritory?.name || '',
      territoryName:
        lead.residenceNumber?.street?.neighborhood?.subterritory?.territory
          ?.name || '',
    }
    this.showLeadModal = true
  }

  openCreateLeadModal(): void {
    this.selectedLeadToEdit = null
    this.selectedResidenceContext = undefined
    this.showLeadModal = true
  }

  onLeadSaved(savedLead: LeadItem): void {
    this.globalSuccess = `Lead de ${savedLead.name} salvo com sucesso!`
    this.loadLeads()
  }

  confirmDeleteLead(lead: LeadItem): void {
    if (confirm(`Deseja excluir o lead de "${lead.name}"?`)) {
      this.territoryService.deleteLead(lead.id).subscribe({
        next: () => {
          this.globalSuccess = 'Lead excluído com sucesso.'
          this.loadLeads()
        },
        error: () => {
          this.globalError = 'Erro ao excluir o lead.'
        },
      })
    }
  }

  // Helpers
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

  getWhatsappLink(phone: string): string {
    const raw = phone.replace(/\D/g, '')
    const full = raw.startsWith('55') ? raw : `55${raw}`
    return `https://wa.me/${full}`
  }

  // --- Visualização em Mapa e Integração com Google Maps ---

  setView(view: 'tabela' | 'mapa'): void {
    this.activeView = view
    if (view === 'mapa') {
      setTimeout(() => {
        this.initLeadsMap()
      }, 50)
    }
  }

  getLeadFullAddress(lead: LeadItem): string {
    return buildFullAddress({
      streetName: lead.residenceNumber?.street?.name,
      number: lead.residenceNumber?.number,
      neighborhoodName: lead.residenceNumber?.street?.neighborhood?.name,
      cityName: 'Marília',
    })
  }

  getLeadGoogleMapsUrl(lead: LeadItem): string {
    return formatGoogleMapsUrl(this.getLeadFullAddress(lead))
  }

  private async initLeadsMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return

    const container = document.getElementById('leads-map-canvas')
    if (!container) return

    if (!this.leaflet) {
      this.leaflet = await import('leaflet')
    }

    if (this.map) {
      this.map.remove()
      this.map = null
    }

    const L = this.leaflet
    this.map = L.map('leads-map-canvas', {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map)

    this.renderLeadsOnMap()
  }

  private renderLeadsOnMap(): void {
    if (!this.map || !this.leaflet) return

    this.markerInstances.forEach(m => this.map.removeLayer(m))
    this.markerInstances = []

    const L = this.leaflet

    this.leads.forEach((lead, idx) => {
      const fullAddress = this.getLeadFullAddress(lead)
      const seed = `${lead.name}_${lead.residenceNumber?.street?.name}_${lead.residenceNumber?.number}`
      const coords = getDeterministicCoordinates(seed, idx)

      let fillColor = '#3b82f6'
      if (lead.status === 'MATRICULA') fillColor = '#22c55e'
      else if (lead.status === 'INSCRICAO') fillColor = '#f59e0b'
      else if (lead.status === 'FALHOU') fillColor = '#ef4444'

      const customIcon = L.divIcon({
        className: 'custom-leaflet-lead-pin',
        html: createMapPinSvg({
          fillColor,
          borderColor: '#ffffff',
          iconChar: '👤',
          size: 32,
        }),
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -38],
      })

      const popupHtml = `
        <div style="min-width: 220px;">
          <div class="map-popup-header">
            <h4 class="map-popup-title">${lead.name}</h4>
            <span class="badge ${this.getLeadStatusBadgeClass(lead.status)}" style="font-size: 0.72rem; padding: 2px 6px;">
              ${this.getLeadStatusLabel(lead.status)}
            </span>
          </div>
          <div style="font-size: 0.8rem; color: #93c5fd; margin-bottom: 4px;">
            🎓 ${lead.courseOrArea}
          </div>
          <p class="map-popup-address">📍 ${fullAddress}</p>
          <div class="map-popup-actions">
            <a href="${this.getWhatsappLink(lead.whatsapp)}" target="_blank" rel="noopener noreferrer" class="map-action-btn map-action-btn-primary">
              💬 WhatsApp
            </a>
            <a href="${this.getLeadGoogleMapsUrl(lead)}" target="_blank" rel="noopener noreferrer" class="map-action-btn map-action-btn-secondary">
              📍 Google Maps
            </a>
          </div>
        </div>
      `

      const marker = L.marker([coords[0], coords[1]], { icon: customIcon })
        .bindPopup(popupHtml)
        .addTo(this.map)

      this.markerInstances.push(marker)
    })
  }
}
