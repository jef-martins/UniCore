export interface ResidenceWithLeads {
  id: string
  number: string
  leads: Array<{ id: string; status: string }>
}

export interface StreetWithResidences {
  id: string
  name: string
  residences: ResidenceWithLeads[]
}

export interface NeighborhoodWithStreets {
  id: string
  name: string
  streets: StreetWithResidences[]
}

export interface SubterritoryWithNeighborhoods {
  id: string
  name: string
  neighborhoods: NeighborhoodWithStreets[]
}

export interface TerritoryWithSubterritories {
  id: string
  name: string
  subterritories: SubterritoryWithNeighborhoods[]
}

export function computeStreetProgress(residences: ResidenceWithLeads[]): {
  totalResidences: number
  visitedResidences: number
  progressPercentage: number
  isCompleted: boolean
} {
  const total = residences.length
  const visited = residences.filter((r) => r.leads && r.leads.length > 0).length
  const isCompleted = total > 0 && visited === total
  const progressPercentage = total > 0 ? Math.round((visited / total) * 100) : 0

  return {
    totalResidences: total,
    visitedResidences: visited,
    progressPercentage,
    isCompleted,
  }
}

export function computeNeighborhoodProgress(streets: StreetWithResidences[]): {
  totalStreets: number
  completedStreets: number
  totalResidences: number
  visitedResidences: number
  progressPercentage: number
  isCompleted: boolean
} {
  let totalRes = 0
  let visitedRes = 0
  let completedStreets = 0

  streets.forEach((s) => {
    const stProgress = computeStreetProgress(s.residences)
    totalRes += stProgress.totalResidences
    visitedRes += stProgress.visitedResidences
    if (stProgress.isCompleted) completedStreets += 1
  })

  const isCompleted = streets.length > 0 && completedStreets === streets.length
  const progressPercentage = totalRes > 0 ? Math.round((visitedRes / totalRes) * 100) : 0

  return {
    totalStreets: streets.length,
    completedStreets,
    totalResidences: totalRes,
    visitedResidences: visitedRes,
    progressPercentage,
    isCompleted,
  }
}

export function computeSubterritoryProgress(neighborhoods: NeighborhoodWithStreets[]): {
  totalNeighborhoods: number
  completedNeighborhoods: number
  totalStreets: number
  completedStreets: number
  totalResidences: number
  visitedResidences: number
  progressPercentage: number
  isCompleted: boolean
} {
  let totalStreets = 0
  let completedStreets = 0
  let totalRes = 0
  let visitedRes = 0
  let completedNeighs = 0

  neighborhoods.forEach((n) => {
    const nProgress = computeNeighborhoodProgress(n.streets)
    totalStreets += nProgress.totalStreets
    completedStreets += nProgress.completedStreets
    totalRes += nProgress.totalResidences
    visitedRes += nProgress.visitedResidences
    if (nProgress.isCompleted) completedNeighs += 1
  })

  const isCompleted = neighborhoods.length > 0 && completedNeighs === neighborhoods.length
  const progressPercentage = totalRes > 0 ? Math.round((visitedRes / totalRes) * 100) : 0

  return {
    totalNeighborhoods: neighborhoods.length,
    completedNeighborhoods: completedNeighs,
    totalStreets,
    completedStreets,
    totalResidences: totalRes,
    visitedResidences: visitedRes,
    progressPercentage,
    isCompleted,
  }
}

export function computeTerritoryProgress(subterritories: SubterritoryWithNeighborhoods[]): {
  totalSubterritories: number
  completedSubterritories: number
  totalNeighborhoods: number
  completedNeighborhoods: number
  totalStreets: number
  completedStreets: number
  totalResidences: number
  visitedResidences: number
  progressPercentage: number
  isCompleted: boolean
} {
  let totalSub = subterritories.length
  let completedSub = 0
  let totalNeigh = 0
  let completedNeigh = 0
  let totalStreets = 0
  let completedStreets = 0
  let totalRes = 0
  let visitedRes = 0

  subterritories.forEach((st) => {
    const stProgress = computeSubterritoryProgress(st.neighborhoods)
    totalNeigh += stProgress.totalNeighborhoods
    completedNeigh += stProgress.completedNeighborhoods
    totalStreets += stProgress.totalStreets
    completedStreets += stProgress.completedStreets
    totalRes += stProgress.totalResidences
    visitedRes += stProgress.visitedResidences
    if (stProgress.isCompleted) completedSub += 1
  })

  const isCompleted = totalSub > 0 && completedSub === totalSub
  const progressPercentage = totalRes > 0 ? Math.round((visitedRes / totalRes) * 100) : 0

  return {
    totalSubterritories: totalSub,
    completedSubterritories: completedSub,
    totalNeighborhoods: totalNeigh,
    completedNeighborhoods: completedNeigh,
    totalStreets,
    completedStreets,
    totalResidences: totalRes,
    visitedResidences: visitedRes,
    progressPercentage,
    isCompleted,
  }
}

export function formatWhatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  const full = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${full}`
}

export interface PilotConversions {
  contatoPorCasa: number
  leadPorContato: number
  leadPorCasa: number
  inscricaoPorLead: number
  matriculaPorLead: number
}

export function computeConversions(
  casas: number,
  contatos: number,
  leads: number,
  inscricoes: number,
  matriculas: number,
): PilotConversions {
  return {
    contatoPorCasa: casas > 0 ? Number(((contatos / casas) * 100).toFixed(1)) : 0,
    leadPorContato: contatos > 0 ? Number(((leads / contatos) * 100).toFixed(1)) : 0,
    leadPorCasa: casas > 0 ? Number(((leads / casas) * 100).toFixed(1)) : 0,
    inscricaoPorLead: leads > 0 ? Number(((inscricoes / leads) * 100).toFixed(1)) : 0,
    matriculaPorLead: leads > 0 ? Number(((matriculas / leads) * 100).toFixed(1)) : 0,
  }
}

export function classifySectorTrafficLight(leads: number, casas: number): {
  leadsPer100Houses: number
  classification: 'VERDE' | 'AMARELO' | 'VERMELHO'
} {
  const leadsPer100Houses = casas > 0 ? Number(((leads / casas) * 100).toFixed(1)) : 0
  if (leadsPer100Houses >= 20) {
    return { leadsPer100Houses, classification: 'VERDE' }
  }
  if (leadsPer100Houses >= 10) {
    return { leadsPer100Houses, classification: 'AMARELO' }
  }
  return { leadsPer100Houses, classification: 'VERMELHO' }
}

export function cleanCep(cep: string): string {
  return (cep || '').replace(/\D/g, '')
}

export function formatCep(value: string): string {
  if (!value) return ''
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export interface GenerateResidenceNumbersOptions {
  fromNumber: number
  toNumber: number
  step?: number
  parity?: 'ALL' | 'EVEN' | 'ODD'
}

export function generateResidenceNumbers(options: GenerateResidenceNumbersOptions): string[] {
  const { fromNumber, toNumber, step = 1, parity = 'ALL' } = options
  const start = Math.min(fromNumber, toNumber)
  const end = Math.max(fromNumber, toNumber)
  const effectiveStep = step > 0 ? step : 1

  let initial = start
  if (parity === 'EVEN' && initial % 2 !== 0) {
    initial += 1
  } else if (parity === 'ODD' && initial % 2 === 0) {
    initial += 1
  }

  const results: string[] = []
  for (let i = initial; i <= end; i += effectiveStep) {
    if (parity === 'EVEN' && i % 2 !== 0) continue
    if (parity === 'ODD' && i % 2 === 0) continue
    results.push(String(i))
  }

  return results
}

