import { describe, expect, it } from 'vitest'
import {
  cleanCep,
  computeNeighborhoodProgress,
  computeStreetProgress,
  computeSubterritoryProgress,
  computeTerritoryProgress,
  formatCep,
  formatWhatsappUrl,
  generateResidenceNumbers,
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

  it('limpeza e formatação de CEP brasileiro', () => {
    expect(cleanCep('17500-010')).toBe('17500010')
    expect(cleanCep('01.001-000')).toBe('01001000')
    expect(cleanCep('abc 17500 010 xyz')).toBe('17500010')
    expect(cleanCep('')).toBe('')

    expect(formatCep('17500010')).toBe('17500-010')
    expect(formatCep('17500')).toBe('17500')
    expect(formatCep('17500-010')).toBe('17500-010')
    expect(formatCep('')).toBe('')
  })

  it('geração em lote de numeração predial por tamanho do terreno (metragem) e paridade de rua', () => {
    // Terreno de 10m no lado par (pula de 10 em 10)
    const pares10m = generateResidenceNumbers({
      fromNumber: 10,
      toNumber: 50,
      step: 10,
      parity: 'EVEN',
    })
    expect(pares10m).toEqual(['10', '20', '30', '40', '50'])

    // Terreno de 10m no lado ímpar (pula de 10 em 10)
    const impares10m = generateResidenceNumbers({
      fromNumber: 11,
      toNumber: 51,
      step: 10,
      parity: 'ODD',
    })
    expect(impares10m).toEqual(['11', '21', '31', '41', '51'])

    // Terreno de 8m no lado par
    const pares8m = generateResidenceNumbers({
      fromNumber: 10,
      toNumber: 50,
      step: 8,
      parity: 'EVEN',
    })
    expect(pares8m).toEqual(['10', '18', '26', '34', '42', '50'])

    // Terreno de 8m no lado ímpar
    const impares8m = generateResidenceNumbers({
      fromNumber: 11,
      toNumber: 51,
      step: 8,
      parity: 'ODD',
    })
    expect(impares8m).toEqual(['11', '19', '27', '35', '43', '51'])

    // Terreno de 6m no lado par
    const pares6m = generateResidenceNumbers({
      fromNumber: 10,
      toNumber: 46,
      step: 6,
      parity: 'EVEN',
    })
    expect(pares6m).toEqual(['10', '16', '22', '28', '34', '40', '46'])

    // Terreno de 4m no lado par
    const pares4m = generateResidenceNumbers({
      fromNumber: 10,
      toNumber: 30,
      step: 4,
      parity: 'EVEN',
    })
    expect(pares4m).toEqual(['10', '14', '18', '22', '26', '30'])

    // Terreno de 5m (meio lote) com paridade par (pula para próximos pares)
    const pares5m = generateResidenceNumbers({
      fromNumber: 10,
      toNumber: 30,
      step: 5,
      parity: 'EVEN',
    })
    expect(pares5m).toEqual(['10', '20', '30'])

    // Terreno de 5m com paridade ímpar
    const impares5m = generateResidenceNumbers({
      fromNumber: 5,
      toNumber: 35,
      step: 5,
      parity: 'ODD',
    })
    expect(impares5m).toEqual(['5', '15', '25', '35'])

    // Ajuste automático caso o usuário digite número inicial ímpar querendo lado par
    const ajustePar = generateResidenceNumbers({
      fromNumber: 1,
      toNumber: 40,
      step: 10,
      parity: 'EVEN',
    })
    expect(ajustePar).toEqual(['2', '12', '22', '32'])

    // Ajuste automático caso o usuário digite número inicial par querendo lado ímpar
    const ajusteImpar = generateResidenceNumbers({
      fromNumber: 10,
      toNumber: 50,
      step: 10,
      parity: 'ODD',
    })
    expect(ajusteImpar).toEqual(['11', '21', '31', '41'])

    // Ambos os lados consecutivo
    const ambos = generateResidenceNumbers({
      fromNumber: 1,
      toNumber: 5,
      step: 1,
      parity: 'ALL',
    })
    expect(ambos).toEqual(['1', '2', '3', '4', '5'])
  })
})


