import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'

export type LeadStatus = 'FALHOU' | 'LEAD' | 'INSCRICAO' | 'MATRICULA'

export interface LeadItem {
  id: string
  residenceNumberId: string
  name: string
  whatsapp: string
  courseOrArea: string
  date: string
  origin: string
  authorizedInfo: boolean
  effectiveContact?: boolean
  status: LeadStatus
  observations?: string | null
  createdById?: string | null
  createdBy?: { id: string; username: string; email: string } | null
  createdAt: string
  updatedAt: string
  residenceNumber?: {
    id: string
    number: string
    complement?: string | null
    street?: {
      id: string
      name: string
      neighborhood?: {
        id: string
        name: string
        subterritory?: {
          id: string
          name: string
          territory?: {
            id: string
            name: string
          }
        }
      }
    }
  }
}

export interface ResidenceNumberItem {
  id: string
  streetId: string
  number: string
  complement?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  leads: LeadItem[]
}

export interface StreetItem {
  id: string
  neighborhoodId: string
  name: string
  zipCode?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  residences?: ResidenceNumberItem[]
  stats?: {
    totalResidences: number
    visitedResidences: number
    progressPercentage: number
    isCompleted: boolean
  }
}

export interface NeighborhoodItem {
  id: string
  subterritoryId: string
  name: string
  city?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  streets: StreetItem[]
  stats?: {
    totalStreets: number
    completedStreets: number
    totalResidences: number
    visitedResidences: number
    progressPercentage: number
    isCompleted: boolean
  }
}

export interface SubterritoryItem {
  id: string
  territoryId: string
  name: string
  code?: string | null
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  neighborhoods: NeighborhoodItem[]
  stats?: {
    totalNeighborhoods: number
    completedNeighborhoods: number
    totalStreets: number
    completedStreets: number
    totalResidences: number
    visitedResidences: number
    progressPercentage: number
    isCompleted: boolean
  }
}

export interface TerritoryStats {
  totalSubterritories: number
  completedSubterritories: number
  totalNeighborhoods: number
  completedNeighborhoods: number
  totalStreets: number
  completedStreets: number
  totalResidences: number
  visitedResidences: number
  totalLeads: number
  progressPercentage: number
  isCompleted: boolean
  statusCounts: Record<LeadStatus, number>
}

export interface TerritoryItem {
  id: string
  name: string
  code?: string | null
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  stats: TerritoryStats
}

export interface TerritoryHierarchy extends TerritoryItem {
  subterritories: SubterritoryItem[]
}

export interface TerritoryDashboardData {
  overview: {
    totalTerritories: number
    completedTerritories: number
    totalSubterritories: number
    completedSubterritories: number
    totalNeighborhoods: number
    completedNeighborhoods: number
    totalStreets: number
    completedStreets: number
    streetsCompletionRate: number
    totalResidences: number
    visitedResidences: number
    coveragePercentage: number
    totalLeads: number
    authorizedCount: number
    authorizationPercentage: number
    conversionRateToInscricao: number
    conversionRateToMatricula: number
  }
  mainIndicators: {
    residencias: number
    contatos: number
    leads: number
    inscricoes: number
    matriculas: number
  }
  conversions: {
    contatoPorCasa: number
    leadPorContato: number
    leadPorCasa: number
    inscricaoPorLead: number
    matriculaPorLead: number
  }
  pilotGoals: Array<{
    indicator: string
    meta: number
    realizado: number
    pctMeta: number
  }>
  trafficLight: {
    summary: {
      verde: number
      amarelo: number
      vermelho: number
    }
    sectors: Array<{
      subterritoryId: string
      subterritoryName: string
      territoryName: string
      totalResidences: number
      visitedResidences: number
      leadsCount: number
      contatosCount: number
      inscricoesCount: number
      matriculasCount: number
      leadsPer100Houses: number
      classification: 'VERDE' | 'AMARELO' | 'VERMELHO'
    }>
    stages: {
      casas: number
      contatos: number
      leads: number
      inscricoes: number
      matriculas: number
    }
  }
  statusBreakdown: {
    counts: Record<LeadStatus, number>
    percentages: Record<LeadStatus, number>
  }
  funnel: Array<{
    stage: string
    count: number
    percentage: number
    hint: string
  }>
  territoryRanking: Array<{
    id: string
    name: string
    code?: string | null
    progressPercentage: number
    isCompleted: boolean
    totalResidences: number
    visitedResidences: number
    totalStreets: number
    completedStreets: number
    totalLeads: number
    statusCounts: Record<LeadStatus, number>
  }>
  topCourses: Array<{
    name: string
    count: number
    percentage: number
  }>
  leadsByOrigin: Array<{
    name: string
    count: number
    percentage: number
  }>
  timeline: Array<{
    date: string
    total: number
    inscricao: number
    matricula: number
  }>
  recentLeads: Array<{
    id: string
    name: string
    whatsapp: string
    courseOrArea: string
    date: string
    origin: string
    status: LeadStatus
    authorizedInfo: boolean
    residenceNumber: string
    streetName: string
    neighborhoodName: string
    subterritoryName: string
    territoryName: string
    createdByName: string
  }>
}

export interface ViaCepResponse {
  cep?: string
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
  ibge?: string
  gia?: string
  ddd?: string
  siafi?: string
  erro?: boolean | string
}

@Injectable({ providedIn: 'root' })
export class TerritoryService {
  private readonly baseUrl = '/api/territories'

  constructor(private readonly http: HttpClient) {}

  // Consulta pública de CEP (ViaCEP)
  lookupCep(rawCep: string): Observable<ViaCepResponse> {
    const clean = rawCep.replace(/\D/g, '')
    return this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${clean}/json/`)
  }

  // Territórios
  getTerritories(): Observable<TerritoryItem[]> {
    return this.http.get<TerritoryItem[]>(this.baseUrl)
  }

  getTerritoryHierarchy(id: string): Observable<TerritoryHierarchy> {
    return this.http.get<TerritoryHierarchy>(`${this.baseUrl}/${id}/hierarchy`)
  }

  createTerritory(data: {
    name: string
    code?: string
    description?: string
    isActive?: boolean
  }): Observable<TerritoryItem> {
    return this.http.post<TerritoryItem>(this.baseUrl, data)
  }

  updateTerritory(
    id: string,
    data: {
      name?: string
      code?: string
      description?: string
      isActive?: boolean
    },
  ): Observable<TerritoryItem> {
    return this.http.patch<TerritoryItem>(`${this.baseUrl}/${id}`, data)
  }

  deleteTerritory(id: string): Observable<{ id: string }> {
    return this.http.delete<{ id: string }>(`${this.baseUrl}/${id}`)
  }

  // Subterritórios
  createSubterritory(data: {
    territoryId: string
    name: string
    code?: string
    description?: string
    isActive?: boolean
  }): Observable<SubterritoryItem> {
    return this.http.post<SubterritoryItem>(`${this.baseUrl}/subterritories`, data)
  }

  updateSubterritory(
    id: string,
    data: {
      name?: string
      code?: string
      description?: string
      isActive?: boolean
    },
  ): Observable<SubterritoryItem> {
    return this.http.patch<SubterritoryItem>(
      `${this.baseUrl}/subterritories/${id}`,
      data,
    )
  }

  deleteSubterritory(id: string): Observable<{ id: string }> {
    return this.http.delete<{ id: string }>(
      `${this.baseUrl}/subterritories/${id}`,
    )
  }

  // Bairros
  createNeighborhood(data: {
    subterritoryId: string
    name: string
    city?: string
    isActive?: boolean
  }): Observable<NeighborhoodItem> {
    return this.http.post<NeighborhoodItem>(
      `${this.baseUrl}/neighborhoods`,
      data,
    )
  }

  updateNeighborhood(
    id: string,
    data: { name?: string; city?: string; isActive?: boolean },
  ): Observable<NeighborhoodItem> {
    return this.http.patch<NeighborhoodItem>(
      `${this.baseUrl}/neighborhoods/${id}`,
      data,
    )
  }

  deleteNeighborhood(id: string): Observable<{ id: string }> {
    return this.http.delete<{ id: string }>(
      `${this.baseUrl}/neighborhoods/${id}`,
    )
  }

  // Ruas
  createStreet(data: {
    neighborhoodId: string
    name: string
    zipCode?: string
    isActive?: boolean
  }): Observable<StreetItem> {
    return this.http.post<StreetItem>(`${this.baseUrl}/streets`, data)
  }

  updateStreet(
    id: string,
    data: { name?: string; zipCode?: string; isActive?: boolean },
  ): Observable<StreetItem> {
    return this.http.patch<StreetItem>(`${this.baseUrl}/streets/${id}`, data)
  }

  deleteStreet(id: string): Observable<{ id: string }> {
    return this.http.delete<{ id: string }>(`${this.baseUrl}/streets/${id}`)
  }

  // Residências
  createResidenceNumber(data: {
    streetId: string
    number: string
    complement?: string
    notes?: string
  }): Observable<ResidenceNumberItem> {
    return this.http.post<ResidenceNumberItem>(
      `${this.baseUrl}/residences`,
      data,
    )
  }

  batchCreateResidenceNumbers(data: {
    streetId: string
    fromNumber?: number
    toNumber?: number
    step?: number
    parity?: 'ALL' | 'EVEN' | 'ODD'
    customNumbers?: string[]
  }): Observable<{ count: number; message: string }> {
    return this.http.post<{ count: number; message: string }>(
      `${this.baseUrl}/residences/batch`,
      data,
    )
  }

  updateResidenceNumber(
    id: string,
    data: { number?: string; complement?: string; notes?: string },
  ): Observable<ResidenceNumberItem> {
    return this.http.patch<ResidenceNumberItem>(
      `${this.baseUrl}/residences/${id}`,
      data,
    )
  }

  deleteResidenceNumber(id: string): Observable<{ id: string }> {
    return this.http.delete<{ id: string }>(`${this.baseUrl}/residences/${id}`)
  }

  // Leads
  getLeads(filters?: {
    territoryId?: string
    subterritoryId?: string
    neighborhoodId?: string
    streetId?: string
    status?: LeadStatus
    origin?: string
    search?: string
    startDate?: string
    endDate?: string
  }): Observable<LeadItem[]> {
    let params = new HttpParams()
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          params = params.set(key, String(val))
        }
      })
    }
    return this.http.get<LeadItem[]>(`${this.baseUrl}/leads`, { params })
  }

  createLead(data: {
    residenceNumberId: string
    name: string
    whatsapp: string
    courseOrArea: string
    date: string
    origin?: string
    authorizedInfo?: boolean
    effectiveContact?: boolean
    status?: LeadStatus
    observations?: string
  }): Observable<LeadItem> {
    return this.http.post<LeadItem>(`${this.baseUrl}/leads`, data)
  }

  updateLead(
    id: string,
    data: {
      name?: string
      whatsapp?: string
      courseOrArea?: string
      date?: string
      origin?: string
      authorizedInfo?: boolean
      effectiveContact?: boolean
      status?: LeadStatus
      observations?: string
    },
  ): Observable<LeadItem> {
    return this.http.patch<LeadItem>(`${this.baseUrl}/leads/${id}`, data)
  }

  deleteLead(id: string): Observable<{ id: string }> {
    return this.http.delete<{ id: string }>(`${this.baseUrl}/leads/${id}`)
  }

  // Dashboard
  getDashboardStats(filters?: {
    territoryId?: string
    subterritoryId?: string
    neighborhoodId?: string
    streetId?: string
    status?: LeadStatus
    origin?: string
    search?: string
    startDate?: string
    endDate?: string
  }): Observable<TerritoryDashboardData> {
    let params = new HttpParams()
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          params = params.set(key, String(val))
        }
      })
    }
    return this.http.get<TerritoryDashboardData>(`${this.baseUrl}/dashboard`, {
      params,
    })
  }
}
