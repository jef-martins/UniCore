/**
 * map-utils.ts
 *
 * Utilitários para mapa interativo (OpenStreetMap / Leaflet), integração
 * com Google Maps e regras de negócio para o Semáforo Hierárquico em Cascata:
 * - Nível 1 (Rua): leads >= 20 -> VERDE, 10..19 -> AMARELO, < 10 -> VERMELHO.
 * - Nível 2 (Bairro): maioria das ruas verde -> VERDE, na média -> AMARELO, senão -> VERMELHO.
 * - Nível 3 (Subterritório): maioria dos bairros verde -> VERDE, na média -> AMARELO, senão -> VERMELHO.
 * - Nível 4 (Território): maioria dos subterritórios verde -> VERDE, na média -> AMARELO, senão -> VERMELHO.
 */

export type TrafficLightStatus = 'VERDE' | 'AMARELO' | 'VERMELHO'

export interface TrafficLightInfo {
  status: TrafficLightStatus
  color: string
  background: string
  borderColor: string
  textColor: string
  label: string
  icon: string
  badgeClass: string
  description: string
}

export const TRAFFIC_LIGHT_META: Record<TrafficLightStatus, TrafficLightInfo> = {
  VERDE: {
    status: 'VERDE',
    color: '#22c55e',
    background: 'rgba(34, 197, 94, 0.15)',
    borderColor: '#22c55e',
    textColor: '#4ade80',
    label: 'Verde (Meta Batida / Alta Densidade)',
    icon: '🟢',
    badgeClass: 'badge-traffic-green',
    description: 'Excelente desempenho na captação territorial',
  },
  AMARELO: {
    status: 'AMARELO',
    color: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
    textColor: '#fbbf24',
    label: 'Amarelo (Na Média / Em Andamento)',
    icon: '🟡',
    badgeClass: 'badge-traffic-yellow',
    description: 'Desempenho intermediário, em desenvolvimento ativo',
  },
  VERMELHO: {
    status: 'VERMELHO',
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    textColor: '#f87171',
    label: 'Vermelho (Abaixo da Média / Prioritário)',
    icon: '🔴',
    badgeClass: 'badge-traffic-red',
    description: 'Baixa densidade de captação, requer ação prioritária',
  },
}

/**
 * 1. Classificação de Rua com base no volume direto de leads ou conclusão.
 * - Concluída (todas as residências visitadas): Verde
 * - >= 20 leads: Verde
 * - 10 a 19 leads: Amarelo
 * - < 10 leads: Vermelho
 */
export function classifyStreetTrafficLight(
  leadsCount: number,
  isCompleted?: boolean,
): TrafficLightStatus {
  if (isCompleted) {
    return 'VERDE'
  }
  const safeCount = Number.isFinite(leadsCount) ? Math.max(0, Math.floor(leadsCount)) : 0
  if (safeCount >= 20) {
    return 'VERDE'
  }
  if (safeCount >= 10) {
    return 'AMARELO'
  }
  return 'VERMELHO'
}

/**
 * 2. Classificação Composta (Cascata Hierárquica para Bairros, Subterritórios e Territórios):
 * - Maioria absoluta verde (verdes > total / 2) -> VERDE
 * - Na média ((verdes + amarelos) >= total / 2) -> AMARELO
 * - Abaixo da média (maioria vermelha ou lista vazia) -> VERMELHO
 */
export function classifyCompositeTrafficLight(
  childrenStatuses: readonly TrafficLightStatus[],
): TrafficLightStatus {
  if (!childrenStatuses || childrenStatuses.length === 0) {
    return 'VERMELHO'
  }

  const total = childrenStatuses.length
  let greens = 0
  let yellows = 0

  for (const status of childrenStatuses) {
    if (status === 'VERDE') greens++
    else if (status === 'AMARELO') yellows++
  }

  // Maioria absoluta de verdes
  if (greens > total / 2) {
    return 'VERDE'
  }

  // Na média: a soma de verdes e amarelos representa pelo menos metade dos itens
  if (greens + yellows >= total / 2) {
    return 'AMARELO'
  }

  // Abaixo da média (maioria dos itens é vermelha)
  return 'VERMELHO'
}

export interface StreetLike {
  leadsCount?: number
  leads?: unknown[]
  stats?: { visitedResidences?: number; [key: string]: any }
  residences?: Array<{ leads?: unknown[]; [key: string]: any }>
  [key: string]: any
}

export interface NeighborhoodLike {
  status?: TrafficLightStatus
  streets?: readonly StreetLike[] | StreetLike[]
  [key: string]: any
}

export interface SubterritoryLike {
  status?: TrafficLightStatus
  neighborhoods?: readonly NeighborhoodLike[] | NeighborhoodLike[]
  [key: string]: any
}

/**
 * Classifica um Bairro com base em suas ruas ou conclusão
 */
export function classifyNeighborhoodTrafficLight(
  streets: readonly StreetLike[] | StreetLike[],
  isCompleted?: boolean,
): TrafficLightStatus {
  if (isCompleted) {
    return 'VERDE'
  }
  if (!streets || streets.length === 0) return 'VERMELHO'
  const statuses = streets.map((s) => {
    let count = s.leadsCount ?? s.leads?.length
    if (count == null && s.residences) {
      count = s.residences.reduce((acc: number, r: any) => acc + (r.leads?.length || 0), 0)
    }
    if (count == null && s.stats?.visitedResidences != null) {
      count = s.stats.visitedResidences
    }
    const completed =
      s.stats?.isCompleted === true ||
      (s.stats?.totalResidences != null &&
        s.stats.totalResidences > 0 &&
        s.stats.visitedResidences === s.stats.totalResidences)
    return classifyStreetTrafficLight(count ?? 0, completed)
  })
  return classifyCompositeTrafficLight(statuses)
}

/**
 * Classifica um Subterritório com base em seus bairros ou conclusão
 */
export function classifySubterritoryTrafficLight(
  neighborhoods: readonly NeighborhoodLike[] | NeighborhoodLike[],
  isCompleted?: boolean,
): TrafficLightStatus {
  if (isCompleted) {
    return 'VERDE'
  }
  if (!neighborhoods || neighborhoods.length === 0) return 'VERMELHO'
  const statuses = neighborhoods.map((n) => {
    const completed =
      n.stats?.isCompleted === true ||
      (n.stats?.totalStreets != null &&
        n.stats.totalStreets > 0 &&
        n.stats.completedStreets === n.stats.totalStreets)
    return n.status ? n.status : classifyNeighborhoodTrafficLight(n.streets || [], completed)
  })
  return classifyCompositeTrafficLight(statuses)
}

/**
 * Classifica um Território com base em seus subterritórios ou conclusão
 */
export function classifyTerritoryTrafficLight(
  subterritories: readonly SubterritoryLike[] | SubterritoryLike[],
  isCompleted?: boolean,
): TrafficLightStatus {
  if (isCompleted) {
    return 'VERDE'
  }
  if (!subterritories || subterritories.length === 0) return 'VERMELHO'
  const statuses = subterritories.map((sub) => {
    const completed =
      sub.stats?.isCompleted === true ||
      (sub.stats?.totalNeighborhoods != null &&
        sub.stats.totalNeighborhoods > 0 &&
        sub.stats.completedNeighborhoods === sub.stats.totalNeighborhoods)
    return sub.status
      ? sub.status
      : classifySubterritoryTrafficLight(sub.neighborhoods || [], completed)
  })
  return classifyCompositeTrafficLight(statuses)
}

/**
 * Retorna as informações visuais completas do semáforo
 */
export function getTrafficLightInfo(status: TrafficLightStatus): TrafficLightInfo {
  return TRAFFIC_LIGHT_META[status] || TRAFFIC_LIGHT_META.VERMELHO
}

/**
 * Monta o endereço completo estruturado para exibição, geocodificação e rotas
 */
export function buildFullAddress(components: {
  streetName?: string
  number?: string | number
  neighborhoodName?: string
  cityName?: string
  state?: string
  cep?: string
}): string {
  const parts: string[] = []

  const streetPart = components.streetName?.trim()
  const numberPart = components.number != null && String(components.number).trim() !== '' ? String(components.number).trim() : ''

  if (streetPart && numberPart) {
    parts.push(`${streetPart}, ${numberPart}`)
  } else if (streetPart) {
    parts.push(streetPart)
  }

  if (components.neighborhoodName?.trim()) {
    parts.push(components.neighborhoodName.trim())
  }

  const city = components.cityName?.trim() || 'Marília'
  const state = components.state?.trim() || 'SP'
  parts.push(`${city} - ${state}`)

  if (components.cep?.trim()) {
    parts.push(`CEP ${components.cep.trim()}`)
  }

  return parts.join(', ')
}

/**
 * Gera URL direta para o Google Maps / GPS
 */
export function formatGoogleMapsUrl(addressOrQuery: string): string {
  if (!addressOrQuery || !addressOrQuery.trim()) {
    return 'https://www.google.com/maps'
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressOrQuery.trim())}`
}

/**
 * Gera URL direta para traçar rota no Google Maps
 */
export function formatGoogleMapsRouteUrl(destinationAddress: string): string {
  if (!destinationAddress || !destinationAddress.trim()) {
    return 'https://www.google.com/maps'
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationAddress.trim())}`
}

/**
 * Coordenadas de referência padrão (Marília / SP)
 */
export const DEFAULT_MAP_CENTER: [number, number] = [-22.2139, -49.9458]
export const DEFAULT_MAP_ZOOM = 13

/**
 * Gera coordenadas determinísticas na região da cidade para visualização fluida
 * de ruas e bairros que ainda não possuem coordenadas geocodificadas no banco.
 */
export function getDeterministicCoordinates(seedString: string, indexOffset = 0): [number, number] {
  let hash = 0
  const combined = seedString + '_' + indexOffset
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i)
    hash |= 0
  }

  // Variação de aproximadamente ~4km em torno do centro da cidade
  const latOffset = ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.06
  const lngOffset = ((Math.abs(hash >> 3) % 1000) / 1000 - 0.5) * 0.06

  return [DEFAULT_MAP_CENTER[0] + latOffset, DEFAULT_MAP_CENTER[1] + lngOffset]
}

/**
 * Cria HTML para ícones SVG de alta qualidade do Leaflet, sem depender de imagens externas.
 */
export function createMapPinSvg(options: {
  fillColor: string
  borderColor?: string
  iconChar?: string
  size?: number
  isHighlighted?: boolean
}): string {
  const size = options.size || 34
  const fillColor = options.fillColor
  const borderColor = options.borderColor || '#ffffff'
  const iconChar = options.iconChar || '📍'

  return `
    <div style="
      width: ${size}px;
      height: ${size + 10}px;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45));
      cursor: pointer;
      transition: transform 0.15s ease;
    ">
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: ${fillColor};
        border: 2px solid ${borderColor};
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: ${Math.round(size * 0.44)}px;
          line-height: 1;
          display: block;
        ">${iconChar}</span>
      </div>
      <div style="
        width: 8px;
        height: 4px;
        background: rgba(0,0,0,0.3);
        border-radius: 50%;
        margin-top: 2px;
      "></div>
    </div>
  `
}
