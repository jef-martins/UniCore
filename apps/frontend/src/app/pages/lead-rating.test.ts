import { describe, expect, it } from 'vitest'

export interface LeadRatingLevel {
  value: number
  shortLabel: string
  description: string
  badgeClass: string
}

export const LEAD_RATING_LEVELS: LeadRatingLevel[] = [
  {
    value: 1,
    shortLabel: 'Pouco provável',
    description: 'Pouco provável de realizar a matrícula',
    badgeClass: 'rating-pill-1',
  },
  {
    value: 2,
    shortLabel: 'Baixa prob.',
    description: 'Baixa probabilidade de realizar a matrícula',
    badgeClass: 'rating-pill-2',
  },
  {
    value: 3,
    shortLabel: 'Média prob.',
    description: 'Média probabilidade de realizar a matrícula',
    badgeClass: 'rating-pill-3',
  },
  {
    value: 4,
    shortLabel: 'Provável / Alta',
    description: 'Alta probabilidade de realizar a matrícula',
    badgeClass: 'rating-pill-4',
  },
  {
    value: 5,
    shortLabel: 'Muito provável',
    description: 'Muito provável de realizar a matrícula',
    badgeClass: 'rating-pill-5',
  },
]

export function getLeadRatingBadgeText(rating: number): string {
  switch (rating) {
    case 1:
      return '1★ • Pouco provável'
    case 2:
      return '2★ • Baixa probabilidade'
    case 3:
      return '3★ • Média probabilidade'
    case 4:
      return '4★ • Alta probabilidade'
    case 5:
      return '5★ • Muito provável de matricular'
    default:
      return `${rating}★`
  }
}

export function getLeadRatingDescription(rating: number): string {
  const item = LEAD_RATING_LEVELS.find((l) => l.value === rating)
  return item ? item.description : `${rating} estrelas`
}

export function getLeadRatingShortLabel(rating?: number | null): string {
  switch (rating) {
    case 1:
      return '1★ Pouco provável'
    case 2:
      return '2★ Baixa prob.'
    case 3:
      return '3★ Média prob.'
    case 4:
      return '4★ Alta prob.'
    case 5:
      return '5★ Muito provável'
    default:
      return '3★ Média prob.'
  }
}

export function getLeadRatingBadgeClass(rating: number): string {
  switch (rating) {
    case 1:
      return 'rating-pill-1'
    case 2:
      return 'rating-pill-2'
    case 3:
      return 'rating-pill-3'
    case 4:
      return 'rating-pill-4'
    case 5:
      return 'rating-pill-5'
    default:
      return 'rating-pill-3'
  }
}

describe('Classificação em 5 Estrelas do Lead (Probabilidade de Matrícula)', () => {
  it('deve possuir exatamente 5 níveis de classificação ordenados de 1 a 5', () => {
    expect(LEAD_RATING_LEVELS).toHaveLength(5)
    expect(LEAD_RATING_LEVELS.map((l) => l.value)).toEqual([1, 2, 3, 4, 5])
  })

  it('deve definir o nível 1 como pouco provável de realizar a matrícula', () => {
    const level1 = LEAD_RATING_LEVELS.find((l) => l.value === 1)!
    expect(level1.shortLabel).toBe('Pouco provável')
    expect(level1.description).toContain('Pouco provável de realizar a matrícula')
    expect(getLeadRatingBadgeText(1)).toBe('1★ • Pouco provável')
    expect(getLeadRatingBadgeClass(1)).toBe('rating-pill-1')
  })

  it('deve definir o nível 5 como muito provável de realizar a matrícula', () => {
    const level5 = LEAD_RATING_LEVELS.find((l) => l.value === 5)!
    expect(level5.shortLabel).toBe('Muito provável')
    expect(level5.description).toContain('Muito provável de realizar a matrícula')
    expect(getLeadRatingBadgeText(5)).toBe('5★ • Muito provável de matricular')
    expect(getLeadRatingBadgeClass(5)).toBe('rating-pill-5')
  })

  it('deve fornecer rótulos resumidos para tabela e mapa', () => {
    expect(getLeadRatingShortLabel(1)).toBe('1★ Pouco provável')
    expect(getLeadRatingShortLabel(2)).toBe('2★ Baixa prob.')
    expect(getLeadRatingShortLabel(3)).toBe('3★ Média prob.')
    expect(getLeadRatingShortLabel(4)).toBe('4★ Alta prob.')
    expect(getLeadRatingShortLabel(5)).toBe('5★ Muito provável')
    expect(getLeadRatingShortLabel(null)).toBe('3★ Média prob.')
    expect(getLeadRatingShortLabel(undefined)).toBe('3★ Média prob.')
  })

  it('deve mapear classes de badge distintas para cada estrela', () => {
    const classes = [1, 2, 3, 4, 5].map((s) => getLeadRatingBadgeClass(s))
    const uniqueClasses = new Set(classes)
    expect(uniqueClasses.size).toBe(5)
  })
})
