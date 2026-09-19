import { CommonModule, isPlatformBrowser } from '@angular/common'
import {
  AfterViewInit,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router, RouterModule } from '@angular/router'
import {
  NeighborhoodItem,
  StreetItem,
  SubterritoryItem,
  TerritoryHierarchy,
  TerritoryItem,
  TerritoryService,
} from '../services/territory.service'
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  TRAFFIC_LIGHT_META,
  TrafficLightInfo,
  TrafficLightStatus,
  buildFullAddress,
  classifyCompositeTrafficLight,
  classifyNeighborhoodTrafficLight,
  classifyStreetTrafficLight,
  classifySubterritoryTrafficLight,
  classifyTerritoryTrafficLight,
  createMapPinSvg,
  formatGoogleMapsRouteUrl,
  formatGoogleMapsUrl,
  getDeterministicCoordinates,
  getTrafficLightInfo,
} from './map-utils'

interface MapMarkerItem {
  id: string
  name: string
  level: 'TERRITORIO' | 'SUBTERRITORIO' | 'BAIRRO' | 'RUA' | 'LEAD'
  levelLabel: string
  trafficStatus: TrafficLightStatus
  leadsCount: number
  targetLeads: number
  address: string
  googleMapsUrl: string
  routeUrl: string
  whatsappUrl?: string
  lat: number
  lng: number
  parentName?: string
}

@Component({
  selector: 'app-territory-map-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="territory-map-view" aria-labelledby="map-page-title">
      <!-- Cabeçalho -->
      <header class="map-page-header">
        <div class="header-left">
          <p class="hero-eyebrow">{{ eyebrow }}</p>
          <h1 id="map-page-title" class="page-title">
            🗺️ Mapa Territorial Interativo & Semáforo de Captação
          </h1>
          <p class="page-subtitle">
            Visualização cartográfica via <strong>OpenStreetMap</strong> com semáforo em cascata
            (Ruas ≥ 20 leads, Bairros, Subterritórios e Territórios) e integração direta com <strong>Google Maps</strong>.
          </p>
        </div>
        <div class="header-actions">
          <a class="button button-secondary" [routerLink]="territoriesRoute">
            🏢 Gestão Territorial
          </a>
          <a class="button button-secondary" [routerLink]="leadsRoute">
            📋 Todos os Leads
          </a>
        </div>
      </header>

      <!-- Painel de Indicadores Semafóricos -->
      <div class="traffic-summary-bar">
        <div class="summary-chip chip-all" [class.active]="selectedTrafficFilter === 'TODOS'" (click)="setTrafficFilter('TODOS')">
          <span class="chip-dot">🌐</span>
          <span class="chip-label">Todos</span>
          <span class="chip-count">{{ markers.length }}</span>
        </div>
        <div class="summary-chip chip-green" [class.active]="selectedTrafficFilter === 'VERDE'" (click)="setTrafficFilter('VERDE')">
          <span class="chip-dot">🟢</span>
          <span class="chip-label">Verdes (Meta Batida)</span>
          <span class="chip-count">{{ countVerde }}</span>
        </div>
        <div class="summary-chip chip-yellow" [class.active]="selectedTrafficFilter === 'AMARELO'" (click)="setTrafficFilter('AMARELO')">
          <span class="chip-dot">🟡</span>
          <span class="chip-label">Amarelos (Na Média)</span>
          <span class="chip-count">{{ countAmarelo }}</span>
        </div>
        <div class="summary-chip chip-red" [class.active]="selectedTrafficFilter === 'VERMELHO'" (click)="setTrafficFilter('VERMELHO')">
          <span class="chip-dot">🔴</span>
          <span class="chip-label">Vermelhos (Prioritários)</span>
          <span class="chip-count">{{ countVermelho }}</span>
        </div>
        <div class="summary-chip chip-info">
          <span class="chip-dot">👥</span>
          <span class="chip-label">Total de Leads</span>
          <span class="chip-count">{{ totalLeadsCount }}</span>
        </div>
      </div>

      <!-- Container Principal: Mapa + Barra Lateral -->
      <div class="map-layout-container">
        <!-- Sidebar de Controles e Itens -->
        <aside class="map-sidebar">
          <div class="sidebar-header">
            <h3>Filtros & Navegação</h3>
            <span class="badge badge-info">{{ filteredMarkers.length }} locais exibidos</span>
          </div>

          <!-- Campo de Busca -->
          <div class="search-box">
            <input
              type="text"
              class="form-control"
              placeholder="🔍 Buscar rua, bairro ou território..."
              [(ngModel)]="searchTerm"
              (input)="applyFilters()"
            />
          </div>

          <!-- Nível de Visualização -->
          <div class="filter-group">
            <label class="filter-label">Nível de Exibição:</label>
            <div class="btn-group-toggle">
              <button
                type="button"
                class="toggle-btn"
                [class.active]="selectedLevel === 'ALL'"
                (click)="setLevelFilter('ALL')"
              >
                Todos
              </button>
              <button
                type="button"
                class="toggle-btn"
                [class.active]="selectedLevel === 'RUA'"
                (click)="setLevelFilter('RUA')"
              >
                Ruas
              </button>
              <button
                type="button"
                class="toggle-btn"
                [class.active]="selectedLevel === 'BAIRRO'"
                (click)="setLevelFilter('BAIRRO')"
              >
                Bairros
              </button>
              <button
                type="button"
                class="toggle-btn"
                [class.active]="selectedLevel === 'TERRITORIO'"
                (click)="setLevelFilter('TERRITORIO')"
              >
                Territórios
              </button>
            </div>
          </div>

          <!-- Lista de Locais -->
          <div class="locations-scroll-list">
            @if (filteredMarkers.length === 0) {
              <div class="empty-list-state">
                <p>Nenhum local corresponde aos filtros aplicados.</p>
              </div>
            } @else {
              @for (item of filteredMarkers; track item.id) {
                <div
                  class="location-list-card"
                  [class.active]="selectedMarker?.id === item.id"
                  (click)="focusOnMarker(item)"
                >
                  <div class="location-card-top">
                    <span class="location-name">{{ item.name }}</span>
                    <span
                      class="badge-traffic"
                      [ngClass]="getBadgeClass(item.trafficStatus)"
                      style="font-size: 0.72rem; padding: 2px 6px;"
                    >
                      {{ getStatusIcon(item.trafficStatus) }} {{ item.trafficStatus }}
                    </span>
                  </div>
                  <div class="location-card-meta">
                    <span class="location-level">{{ item.levelLabel }}</span>
                    <span class="location-leads">
                      {{ item.leadsCount }} lead{{ item.leadsCount === 1 ? '' : 's' }}
                      @if (item.level === 'RUA') {
                        / meta 20
                      }
                    </span>
                  </div>
                  <div class="location-card-actions">
                    <button type="button" class="btn-focus" (click)="focusOnMarker(item); $event.stopPropagation()">
                      🎯 Centralizar
                    </button>
                    <a
                      [href]="item.googleMapsUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="btn-gmaps"
                      (click)="$event.stopPropagation()"
                      title="Abrir no Google Maps"
                    >
                      📍 Google Maps
                    </a>
                  </div>
                </div>
              }
            }
          </div>
        </aside>

        <!-- Canvas do Mapa Leaflet -->
        <main class="map-canvas-wrapper">
          <div id="territory-map-canvas" class="map-canvas"></div>

          <!-- Legenda Flutuante no Mapa -->
          <div class="map-floating-legend">
            <div class="legend-header">Regra do Semáforo</div>
            <div class="legend-item">
              <span class="legend-dot green"></span>
              <span><strong>Verde:</strong> Rua ≥ 20 leads (ou maioria dos bairros/sub)</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot yellow"></span>
              <span><strong>Amarelo:</strong> Rua 10-19 leads (ou média do setor)</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot red"></span>
              <span><strong>Vermelho:</strong> Rua &lt; 10 leads (abaixo da média)</span>
            </div>
          </div>
        </main>
      </div>
    </section>
  `,
  styles: [
    `
      .territory-map-view {
        display: flex;
        flex-direction: column;
        gap: var(--space-20, 20px);
        min-height: calc(100vh - 120px);
      }

      .map-page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
      }

      .hero-eyebrow {
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-primary-400, #60a5fa);
        margin: 0 0 4px 0;
      }

      .page-title {
        font-size: 1.75rem;
        font-weight: 800;
        color: var(--color-text-primary, #ffffff);
        margin: 0 0 8px 0;
      }

      .page-subtitle {
        font-size: 0.95rem;
        color: var(--color-text-secondary, #94a3b8);
        max-width: 820px;
        margin: 0;
        line-height: 1.5;
      }

      .header-actions {
        display: flex;
        gap: 10px;
      }

      /* Barra de Semáforo */
      .traffic-summary-bar {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .summary-chip {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 9999px;
        background: var(--color-surface, #1e293b);
        border: 1px solid var(--color-border, #334155);
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
      }

      .summary-chip:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.3);
      }

      .summary-chip.active {
        box-shadow: 0 0 0 2px var(--color-primary, #3b82f6);
        background: rgba(59, 130, 246, 0.15);
      }

      .chip-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #e2e8f0;
      }

      .chip-count {
        font-size: 0.88rem;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }

      .chip-green.active {
        border-color: #22c55e;
        background: rgba(34, 197, 94, 0.2);
      }

      .chip-yellow.active {
        border-color: #f59e0b;
        background: rgba(245, 158, 11, 0.2);
      }

      .chip-red.active {
        border-color: #ef4444;
        background: rgba(239, 68, 68, 0.2);
      }

      /* Layout Mapa + Sidebar */
      .map-layout-container {
        display: grid;
        grid-template-columns: 360px 1fr;
        gap: 16px;
        min-height: 680px;
        height: calc(100vh - 280px);
      }

      @media (max-width: 980px) {
        .map-layout-container {
          grid-template-columns: 1fr;
          height: auto;
        }
      }

      .map-sidebar {
        background: var(--color-surface, #1e293b);
        border: 1px solid var(--color-border, #334155);
        border-radius: 14px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .sidebar-header {
        padding: 14px 16px;
        border-bottom: 1px solid var(--color-border, #334155);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .sidebar-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        color: #ffffff;
      }

      .search-box {
        padding: 12px 16px;
        border-bottom: 1px solid var(--color-border, #334155);
      }

      .form-control {
        width: 100%;
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 8px;
        color: #ffffff;
        padding: 8px 12px;
        font-size: 0.88rem;
        outline: none;
      }

      .form-control:focus {
        border-color: #3b82f6;
      }

      .filter-group {
        padding: 10px 16px;
        border-bottom: 1px solid var(--color-border, #334155);
      }

      .filter-label {
        font-size: 0.78rem;
        font-weight: 600;
        color: #94a3b8;
        display: block;
        margin-bottom: 6px;
      }

      .btn-group-toggle {
        display: flex;
        gap: 4px;
        background: #0f172a;
        padding: 4px;
        border-radius: 8px;
      }

      .toggle-btn {
        flex: 1;
        padding: 6px 8px;
        font-size: 0.78rem;
        font-weight: 600;
        background: transparent;
        border: none;
        color: #94a3b8;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
      }

      .toggle-btn.active {
        background: #3b82f6;
        color: #ffffff;
      }

      .locations-scroll-list {
        flex: 1;
        overflow-y: auto;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .location-list-card {
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.15s;
      }

      .location-list-card:hover {
        border-color: #60a5fa;
        transform: translateY(-1px);
      }

      .location-list-card.active {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
      }

      .location-card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .location-name {
        font-weight: 700;
        font-size: 0.92rem;
        color: #ffffff;
      }

      .location-card-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        color: #94a3b8;
        margin-bottom: 8px;
      }

      .location-card-actions {
        display: flex;
        gap: 8px;
      }

      .btn-focus {
        background: #334155;
        border: none;
        border-radius: 6px;
        color: #f8fafc;
        font-size: 0.78rem;
        font-weight: 600;
        padding: 4px 8px;
        cursor: pointer;
      }

      .btn-focus:hover {
        background: #475569;
      }

      .btn-gmaps {
        background: rgba(59, 130, 246, 0.2);
        color: #93c5fd;
        border: 1px solid rgba(59, 130, 246, 0.4);
        border-radius: 6px;
        font-size: 0.78rem;
        font-weight: 600;
        padding: 4px 8px;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .btn-gmaps:hover {
        background: rgba(59, 130, 246, 0.4);
      }

      /* Canvas do Mapa */
      .map-canvas-wrapper {
        position: relative;
        background: #0f172a;
        border: 1px solid var(--color-border, #334155);
        border-radius: 14px;
        overflow: hidden;
      }

      .map-canvas {
        width: 100%;
        height: 100%;
        min-height: 550px;
      }

      .map-floating-legend {
        position: absolute;
        bottom: 20px;
        right: 20px;
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 10px;
        padding: 12px 14px;
        z-index: 1000;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        font-size: 0.8rem;
        color: #cbd5e1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .legend-header {
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 2px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }

      .legend-dot.green {
        background: #22c55e;
      }

      .legend-dot.yellow {
        background: #f59e0b;
      }

      .legend-dot.red {
        background: #ef4444;
      }
    `,
  ],
})
export class TerritoryMapPageComponent implements OnInit, AfterViewInit, OnDestroy {
  territories: TerritoryItem[] = []
  markers: MapMarkerItem[] = []
  filteredMarkers: MapMarkerItem[] = []
  selectedMarker: MapMarkerItem | null = null

  searchTerm = ''
  selectedTrafficFilter: 'TODOS' | 'VERDE' | 'AMARELO' | 'VERMELHO' = 'TODOS'
  selectedLevel: 'ALL' | 'TERRITORIO' | 'BAIRRO' | 'RUA' = 'ALL'

  countVerde = 0
  countAmarelo = 0
  countVermelho = 0
  totalLeadsCount = 0

  private map: any = null
  private leaflet: any = null
  private markerInstances: any[] = []

  territoriesRoute = '/administracao/cadastros/territorios'
  leadsRoute = '/administracao/cadastros/leads'
  eyebrow = 'Administração / Cadastros'

  constructor(
    private readonly territoryService: TerritoryService,
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly router: Router,
  ) {
    const url = this.router.url
    if (url.includes('/vestibular/')) {
      this.territoriesRoute = '/vestibular/cadastros/territorios'
      this.leadsRoute = '/vestibular/cadastros/leads'
      this.eyebrow = 'Vestibular / Cadastros'
    } else if (url.includes('/desenvolvedor/')) {
      this.territoriesRoute = '/desenvolvedor/cadastros/territorios'
      this.leadsRoute = '/desenvolvedor/cadastros/leads'
      this.eyebrow = 'Desenvolvedor / Cadastros'
    }
  }

  ngOnInit(): void {
    this.loadTerritoryHierarchy()
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      await this.initLeafletMap()
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
  }

  loadTerritoryHierarchy(): void {
    this.territoryService.getTerritories().subscribe({
      next: (data) => {
        this.territories = data || []
        this.processHierarchyAndMarkers()
      },
      error: (err) => {
        console.error('Erro ao carregar territórios para o mapa:', err)
      },
    })
  }

  private processHierarchyAndMarkers(): void {
    const list: MapMarkerItem[] = []
    let totalLeads = 0

    // Para cada território cadastrado
    this.territories.forEach((t, tIndex) => {
      totalLeads += t.stats.totalLeads || 0

      // Carrega hierarquia completa para mapear subterritórios, bairros e ruas
      this.territoryService.getTerritoryHierarchy(t.id).subscribe({
        next: (fullHierarchy: TerritoryHierarchy) => {
          this.buildMarkersFromHierarchy(fullHierarchy, tIndex)
        },
      })
    })

    this.totalLeadsCount = totalLeads
  }

  private buildMarkersFromHierarchy(hierarchy: TerritoryHierarchy, territoryIndex: number): void {
    const subStatuses: TrafficLightStatus[] = []

    if (hierarchy.subterritories) {
      hierarchy.subterritories.forEach((sub, subIdx) => {
        const neighborhoodStatuses: TrafficLightStatus[] = []

        if (sub.neighborhoods) {
          sub.neighborhoods.forEach((n, nIdx) => {
            const streetStatuses: TrafficLightStatus[] = []

            if (n.streets) {
              n.streets.forEach((s, sIdx) => {
                // Cálculo de leads da rua
                const streetLeads = s.residences
                  ? s.residences.reduce((acc, r) => acc + (r.leads?.length || 0), 0)
                  : s.stats?.visitedResidences || 0

                const isStreetCompleted =
                  s.stats?.isCompleted === true ||
                  (s.stats?.totalResidences != null &&
                    s.stats.totalResidences > 0 &&
                    s.stats.visitedResidences === s.stats.totalResidences)
                const streetStatus = classifyStreetTrafficLight(streetLeads, isStreetCompleted)
                streetStatuses.push(streetStatus)

                const seed = `${hierarchy.name}_${sub.name}_${n.name}_${s.name}`
                const coords = getDeterministicCoordinates(seed, sIdx)
                const fullAddress = buildFullAddress({
                  streetName: s.name,
                  neighborhoodName: n.name,
                  cityName: n.city || 'Marília',
                  cep: s.zipCode || undefined,
                })

                this.markers.push({
                  id: `street-${s.id}`,
                  name: s.name,
                  level: 'RUA',
                  levelLabel: 'Rua',
                  trafficStatus: streetStatus,
                  leadsCount: streetLeads,
                  targetLeads: 20,
                  address: fullAddress,
                  googleMapsUrl: formatGoogleMapsUrl(fullAddress),
                  routeUrl: formatGoogleMapsRouteUrl(fullAddress),
                  lat: coords[0],
                  lng: coords[1],
                  parentName: `${n.name} (${hierarchy.name})`,
                })
              })
            }

            // Semáforo do Bairro baseado em suas ruas ou status de conclusão
            const isNeighborhoodCompleted =
              n.stats?.isCompleted === true ||
              (n.stats?.totalStreets != null &&
                n.stats.totalStreets > 0 &&
                n.stats.completedStreets === n.stats.totalStreets)
            const neighborhoodStatus = classifyNeighborhoodTrafficLight(
              n.streets || [],
              isNeighborhoodCompleted,
            )
            neighborhoodStatuses.push(neighborhoodStatus)

            const nSeed = `${hierarchy.name}_${sub.name}_${n.name}`
            const nCoords = getDeterministicCoordinates(nSeed, nIdx + 10)
            const nAddress = buildFullAddress({
              neighborhoodName: n.name,
              cityName: n.city || 'Marília',
            })

            const neighborhoodLeads = n.streets
              ? n.streets.reduce((acc, s) => acc + (s.stats?.visitedResidences || 0), 0)
              : n.stats?.visitedResidences || 0

            this.markers.push({
              id: `neighborhood-${n.id}`,
              name: n.name,
              level: 'BAIRRO',
              levelLabel: 'Bairro',
              trafficStatus: neighborhoodStatus,
              leadsCount: neighborhoodLeads,
              targetLeads: (n.streets?.length || 1) * 20,
              address: nAddress,
              googleMapsUrl: formatGoogleMapsUrl(nAddress),
              routeUrl: formatGoogleMapsRouteUrl(nAddress),
              lat: nCoords[0],
              lng: nCoords[1],
              parentName: `${sub.name} (${hierarchy.name})`,
            })
          })
        }

        // Semáforo do Subterritório baseado em seus bairros ou status de conclusão
        const isSubCompleted =
          sub.stats?.isCompleted === true ||
          (sub.stats?.totalNeighborhoods != null &&
            sub.stats.totalNeighborhoods > 0 &&
            sub.stats.completedNeighborhoods === sub.stats.totalNeighborhoods)
        const subStatus = classifySubterritoryTrafficLight(
          sub.neighborhoods || [],
          isSubCompleted,
        )
        subStatuses.push(subStatus)
      })
    }

    // Semáforo do Território baseado em seus subterritórios ou conclusão
    const isTerritoryCompleted = hierarchy.stats.isCompleted === true
    const territoryStatus = classifyTerritoryTrafficLight(
      hierarchy.subterritories || [],
      isTerritoryCompleted,
    )
    const tCoords = getDeterministicCoordinates(hierarchy.name, territoryIndex + 50)
    const tAddress = buildFullAddress({ cityName: 'Marília' })

    this.markers.push({
      id: `territory-${hierarchy.id}`,
      name: hierarchy.name,
      level: 'TERRITORIO',
      levelLabel: 'Território',
      trafficStatus: territoryStatus,
      leadsCount: hierarchy.stats.totalLeads,
      targetLeads: hierarchy.stats.totalStreets * 20,
      address: tAddress,
      googleMapsUrl: formatGoogleMapsUrl(`${hierarchy.name}, Marília - SP`),
      routeUrl: formatGoogleMapsRouteUrl(`${hierarchy.name}, Marília - SP`),
      lat: tCoords[0],
      lng: tCoords[1],
    })

    this.updateCounters()
    this.applyFilters()
    this.renderMarkersOnMap()
  }

  private updateCounters(): void {
    this.countVerde = this.markers.filter((m) => m.trafficStatus === 'VERDE').length
    this.countAmarelo = this.markers.filter((m) => m.trafficStatus === 'AMARELO').length
    this.countVermelho = this.markers.filter((m) => m.trafficStatus === 'VERMELHO').length
  }

  setTrafficFilter(filter: 'TODOS' | 'VERDE' | 'AMARELO' | 'VERMELHO'): void {
    this.selectedTrafficFilter = filter
    this.applyFilters()
  }

  setLevelFilter(level: 'ALL' | 'TERRITORIO' | 'BAIRRO' | 'RUA'): void {
    this.selectedLevel = level
    this.applyFilters()
  }

  applyFilters(): void {
    let filtered = [...this.markers]

    if (this.selectedTrafficFilter !== 'TODOS') {
      filtered = filtered.filter((m) => m.trafficStatus === this.selectedTrafficFilter)
    }

    if (this.selectedLevel !== 'ALL') {
      filtered = filtered.filter((m) => m.level === this.selectedLevel)
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase()
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          m.address.toLowerCase().includes(term) ||
          (m.parentName && m.parentName.toLowerCase().includes(term)),
      )
    }

    this.filteredMarkers = filtered
    this.renderMarkersOnMap()
  }

  private async initLeafletMap(): Promise<void> {
    const L = await import('leaflet')
    this.leaflet = L

    // Configura o mapa com o centro em Marília / SP
    this.map = L.map('territory-map-canvas', {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      zoomControl: true,
    })

    // Adiciona camada do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map)

    this.renderMarkersOnMap()
  }

  private renderMarkersOnMap(): void {
    if (!this.map || !this.leaflet) return

    // Limpa marcadores anteriores
    this.markerInstances.forEach((m) => this.map.removeLayer(m))
    this.markerInstances = []

    const L = this.leaflet

    this.filteredMarkers.forEach((item) => {
      const meta = getTrafficLightInfo(item.trafficStatus)
      const iconChar = item.level === 'TERRITORIO' ? '🌐' : item.level === 'BAIRRO' ? '🏘️' : '📍'

      const customIcon = L.divIcon({
        className: 'custom-leaflet-pin',
        html: createMapPinSvg({
          fillColor: meta.color,
          borderColor: '#ffffff',
          iconChar,
          size: item.level === 'TERRITORIO' ? 40 : item.level === 'BAIRRO' ? 36 : 30,
        }),
        iconSize: [36, 46],
        iconAnchor: [18, 46],
        popupAnchor: [0, -42],
      })

      const popupHtml = `
        <div class="map-popup-container" style="min-width: 240px;">
          <div class="map-popup-header">
            <h4 class="map-popup-title">${item.name}</h4>
            <span class="badge-traffic ${meta.badgeClass}" style="font-size: 0.72rem; padding: 2px 8px;">
              ${meta.icon} ${item.trafficStatus}
            </span>
          </div>
          <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 6px;">
            ${item.levelLabel} ${item.parentName ? '— ' + item.parentName : ''}
          </div>
          <p class="map-popup-address">📍 ${item.address}</p>
          <div style="display: flex; gap: 8px; margin-bottom: 10px; font-size: 0.82rem;">
            <span>👥 <strong>${item.leadsCount}</strong> leads cadastrados</span>
            ${item.level === 'RUA' ? `<span style="color: #94a3b8;">(Meta: 20)</span>` : ''}
          </div>
          <div class="map-popup-actions">
            <a href="${item.googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="map-action-btn map-action-btn-primary">
              📍 Abrir no Google Maps
            </a>
            <a href="${item.routeUrl}" target="_blank" rel="noopener noreferrer" class="map-action-btn map-action-btn-secondary">
              🧭 Traçar Rota
            </a>
          </div>
        </div>
      `

      const marker = L.marker([item.lat, item.lng], { icon: customIcon })
        .bindPopup(popupHtml)
        .addTo(this.map)

      marker.on('click', () => {
        this.selectedMarker = item
      })

      this.markerInstances.push(marker)
    })
  }

  focusOnMarker(item: MapMarkerItem): void {
    this.selectedMarker = item
    if (this.map) {
      const zoom = item.level === 'RUA' ? 17 : item.level === 'BAIRRO' ? 15 : 13
      this.map.setView([item.lat, item.lng], zoom, { animate: true })

      // Abre o popup do marcador correspondente
      const targetMarker = this.markerInstances.find(
        (m: any) =>
          Math.abs(m.getLatLng().lat - item.lat) < 0.0001 &&
          Math.abs(m.getLatLng().lng - item.lng) < 0.0001,
      )
      if (targetMarker) {
        targetMarker.openPopup()
      }
    }
  }

  getBadgeClass(status: TrafficLightStatus): string {
    return getTrafficLightInfo(status).badgeClass
  }

  getStatusIcon(status: TrafficLightStatus): string {
    return getTrafficLightInfo(status).icon
  }
}
