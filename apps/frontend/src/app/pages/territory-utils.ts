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
