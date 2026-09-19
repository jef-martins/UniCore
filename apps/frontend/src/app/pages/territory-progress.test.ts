import { describe, expect, it } from 'vitest'
import {
  computeNeighborhoodProgress,
  computeStreetProgress,
  computeSubterritoryProgress,
  computeTerritoryProgress,
  formatWhatsappUrl,
  ResidenceWithLeads,
  StreetWithResidences,
} from './territory-utils'

describe('Módulo de Gestão de Territórios & Regra de Conclusão em Cascata', () => {
  it('uma rua vazia não deve ser considerada concluída', () => {
    const result = computeStreetProgress([])
    expect(result.totalResidences).toBe(0)
    expect(result.visitedResidences).toBe(0)
    expect(result.progressPercentage).toBe(0)
    expect(result.isCompleted).toBe(false)
  })

  it('uma rua com residências pendentes não está concluída', () => {
    const residences: ResidenceWithLeads[] = [
      { id: '1', number: '10', leads: [{ id: 'l1', status: 'LEAD' }] },
      { id: '2', number: '20', leads: [] },
    ]
    const result = computeStreetProgress(residences)
    expect(result.totalResidences).toBe(2)
    expect(result.visitedResidences).toBe(1)
    expect(result.progressPercentage).toBe(50)
    expect(result.isCompleted).toBe(false)
  })

  it('uma rua onde todas as residências possuem lead cadastrado é marcada como CONCLUÍDA', () => {
    const residences: ResidenceWithLeads[] = [
      { id: '1', number: '10', leads: [{ id: 'l1', status: 'FALHOU' }] },
      { id: '2', number: '20', leads: [{ id: 'l2', status: 'MATRICULA' }] },
      { id: '3', number: '30', leads: [{ id: 'l3', status: 'INSCRICAO' }] },
    ]
    const result = computeStreetProgress(residences)
    expect(result.totalResidences).toBe(3)
    expect(result.visitedResidences).toBe(3)
    expect(result.progressPercentage).toBe(100)
    expect(result.isCompleted).toBe(true)
  })

  it('o bairro só é concluído quando TODAS as suas ruas estiverem concluídas', () => {
    const street1: StreetWithResidences = {
      id: 's1',
      name: 'Rua A',
      residences: [
        { id: 'r1', number: '10', leads: [{ id: 'l1', status: 'LEAD' }] },
      ],
    }
    const street2: StreetWithResidences = {
      id: 's2',
      name: 'Rua B',
      residences: [
        { id: 'r2', number: '20', leads: [] },
      ],
    }

    // Com street2 pendente
    const partialResult = computeNeighborhoodProgress([street1, street2])
    expect(partialResult.completedStreets).toBe(1)
    expect(partialResult.totalStreets).toBe(2)
    expect(partialResult.progressPercentage).toBe(50)
    expect(partialResult.isCompleted).toBe(false)

    // Ao preencher o lead da street2
    street2.residences[0].leads.push({ id: 'l2', status: 'INSCRICAO' })
    const fullResult = computeNeighborhoodProgress([street1, street2])
    expect(fullResult.completedStreets).toBe(2)
    expect(fullResult.totalStreets).toBe(2)
    expect(fullResult.progressPercentage).toBe(100)
    expect(fullResult.isCompleted).toBe(true)
  })

  it('o subterritório e o território concluem em cascata', () => {
    const tree = [
      {
        id: 'sub1',
        name: 'Subterritório 1',
        neighborhoods: [
          {
            id: 'n1',
            name: 'Bairro 1',
            streets: [
              {
                id: 's1',
                name: 'Rua 1',
                residences: [
                  { id: 'r1', number: '100', leads: [{ id: 'l1', status: 'MATRICULA' }] },
                ],
              },
            ],
          },
        ],
      },
    ]

    const subResult = computeSubterritoryProgress(tree[0].neighborhoods)
    expect(subResult.isCompleted).toBe(true)
    expect(subResult.progressPercentage).toBe(100)

    const territoryResult = computeTerritoryProgress(tree)
    expect(territoryResult.isCompleted).toBe(true)
    expect(territoryResult.completedSubterritories).toBe(1)
    expect(territoryResult.totalSubterritories).toBe(1)
  })

  it('adicionar nova residência reabre a conclusão em cascata retroativamente', () => {
    const tree = [
      {
        id: 'sub1',
        name: 'Subterritório 1',
        neighborhoods: [
          {
            id: 'n1',
            name: 'Bairro 1',
            streets: [
              {
                id: 's1',
                name: 'Rua 1',
                residences: [
                  { id: 'r1', number: '100', leads: [{ id: 'l1', status: 'MATRICULA' }] },
                ],
              },
            ],
          },
        ],
      },
    ]

    // Antes: concluído
    expect(computeTerritoryProgress(tree).isCompleted).toBe(true)

    // Adiciona número 101 na Rua 1 sem lead
    tree[0].neighborhoods[0].streets[0].residences.push({
      id: 'r2',
      number: '101',
      leads: [],
    })

    // Depois: volta a estar Em Andamento (50%)
    const updatedStreet = computeStreetProgress(tree[0].neighborhoods[0].streets[0].residences)
    expect(updatedStreet.isCompleted).toBe(false)
    expect(updatedStreet.progressPercentage).toBe(50)

    const updatedTerritory = computeTerritoryProgress(tree)
    expect(updatedTerritory.isCompleted).toBe(false)
    expect(updatedTerritory.completedStreets).toBe(0)
    expect(updatedTerritory.progressPercentage).toBe(50)
  })

  it('formatação de link de WhatsApp Web com DDI 55', () => {
    expect(formatWhatsappUrl('14999998888')).toBe('https://wa.me/5514999998888')
    expect(formatWhatsappUrl('(14) 99999-8888')).toBe('https://wa.me/5514999998888')
    expect(formatWhatsappUrl('+55 14 99999-8888')).toBe('https://wa.me/5514999998888')
    expect(formatWhatsappUrl('')).toBe('')
  })
})
