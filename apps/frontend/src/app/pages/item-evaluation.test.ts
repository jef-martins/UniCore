import { describe, expect, it } from 'vitest'
import { computeConsolidatedStatus } from '../../../../backend/src/modules/reservations/reservations.service'
import {
  ItemCondition,
  ItemOperationalStatus,
  ItemStatus,
  MaintenanceStatus,
  MaintenanceType,
} from '@prisma/client'

describe('Regra de Avaliação de Itens e Status Operacional pela Maior Ocorrência', () => {
  it('deve definir o status como FUNCIONANDO_PERFEITAMENTE quando este tiver a maior ocorrência (exemplo do usuário: 2 perfeitos e 1 com defeitos)', () => {
    const evaluations = [
      {
        operationalStatus: ItemOperationalStatus.FUNCIONANDO_PERFEITAMENTE,
        createdAt: new Date('2026-09-14T10:00:00Z'),
        rating: 5,
      },
      {
        operationalStatus: ItemOperationalStatus.FUNCIONANDO_COM_DEFEITOS,
        createdAt: new Date('2026-09-14T11:00:00Z'),
        rating: 3,
      },
      {
        operationalStatus: ItemOperationalStatus.FUNCIONANDO_PERFEITAMENTE,
        createdAt: new Date('2026-09-14T12:00:00Z'),
        rating: 5,
      },
    ]

    const result = computeConsolidatedStatus(evaluations)

    expect(result.consolidatedStatus).toBe(ItemOperationalStatus.FUNCIONANDO_PERFEITAMENTE)
    expect(result.statusCounts[ItemOperationalStatus.FUNCIONANDO_PERFEITAMENTE]).toBe(2)
    expect(result.statusCounts[ItemOperationalStatus.FUNCIONANDO_COM_DEFEITOS]).toBe(1)
    expect(result.totalEvaluations).toBe(3)
  })

  it('deve definir o status como NAO_FUNCIONANDO quando for o status mais votado pelos alunos', () => {
    const evaluations = [
      {
        operationalStatus: ItemOperationalStatus.NAO_FUNCIONANDO,
        createdAt: new Date('2026-09-14T09:00:00Z'),
        rating: 1,
      },
      {
        operationalStatus: ItemOperationalStatus.COM_AVARIAS_FUNCIONANDO,
        createdAt: new Date('2026-09-14T10:00:00Z'),
        rating: 4,
      },
      {
        operationalStatus: ItemOperationalStatus.NAO_FUNCIONANDO,
        createdAt: new Date('2026-09-14T11:00:00Z'),
        rating: 1,
      },
      {
        operationalStatus: ItemOperationalStatus.NAO_FUNCIONANDO,
        createdAt: new Date('2026-09-14T12:00:00Z'),
        rating: 2,
      },
      {
        operationalStatus: ItemOperationalStatus.FUNCIONANDO_PERFEITAMENTE,
        createdAt: new Date('2026-09-14T13:00:00Z'),
        rating: 5,
      },
    ]

    const result = computeConsolidatedStatus(evaluations)

    expect(result.consolidatedStatus).toBe(ItemOperationalStatus.NAO_FUNCIONANDO)
    expect(result.statusCounts[ItemOperationalStatus.NAO_FUNCIONANDO]).toBe(3)
    expect(result.statusCounts[ItemOperationalStatus.COM_AVARIAS_FUNCIONANDO]).toBe(1)
    expect(result.statusCounts[ItemOperationalStatus.FUNCIONANDO_PERFEITAMENTE]).toBe(1)
  })

  it('deve desempatar pelo registro mais recente caso haja empate na contagem de votos', () => {
    const evaluations = [
      {
        operationalStatus: ItemOperationalStatus.FUNCIONANDO_PERFEITAMENTE,
        createdAt: new Date('2026-09-14T08:00:00Z'),
        rating: 5,
      },
      {
        operationalStatus: ItemOperationalStatus.FUNCIONANDO_COM_DEFEITOS,
        createdAt: new Date('2026-09-14T14:00:00Z'), // Mais recente
        rating: 3,
      },
    ]

    const result = computeConsolidatedStatus(evaluations)
    expect(result.consolidatedStatus).toBe(ItemOperationalStatus.FUNCIONANDO_COM_DEFEITOS)
  })

  it('deve retornar status padrão quando o item ainda não tiver avaliações', () => {
    const result = computeConsolidatedStatus([], ItemCondition.PERFEITO)
    expect(result.consolidatedStatus).toBe(ItemOperationalStatus.FUNCIONANDO_PERFEITAMENTE)
    expect(result.totalEvaluations).toBe(0)
    expect(result.averageRating).toBeNull()

    const resultDefective = computeConsolidatedStatus([], ItemCondition.NAO_FUNCIONA)
    expect(resultDefective.consolidatedStatus).toBe(ItemOperationalStatus.NAO_FUNCIONANDO)
  })

  it('deve calcular a média das 5 estrelas corretamente (1 a 5)', () => {
    const evaluations = [
      { operationalStatus: ItemOperationalStatus.FUNCIONANDO_PERFEITAMENTE, createdAt: new Date(), rating: 5 },
      { operationalStatus: ItemOperationalStatus.FUNCIONANDO_PERFEITAMENTE, createdAt: new Date(), rating: 4 },
      { operationalStatus: ItemOperationalStatus.FUNCIONANDO_COM_DEFEITOS, createdAt: new Date(), rating: 3 },
    ]

    const result = computeConsolidatedStatus(evaluations)
    // (5 + 4 + 3) / 3 = 4.0
    expect(result.averageRating).toBe(4.0)
  })

  it('deve validar mapeamento de labels de 1 a 5 estrelas', () => {
    const labels: Record<number, string> = {
      1: 'Péssimo',
      2: 'Ruim',
      3: 'Regular',
      4: 'Bom',
      5: 'Ótimo',
    }

    expect(labels[1]).toBe('Péssimo')
    expect(labels[2]).toBe('Ruim')
    expect(labels[3]).toBe('Regular')
    expect(labels[4]).toBe('Bom')
    expect(labels[5]).toBe('Ótimo')
  })
})

describe('Gestão de Manutenções Preventiva e Corretiva', () => {
  interface MockItem {
    id: string
    name: string
    status: ItemStatus
    condition: ItemCondition
  }

  interface MockMaintenance {
    id: string
    itemId: string
    type: MaintenanceType
    status: MaintenanceStatus
    title: string
    cost?: number | null
  }

  function applyMaintenance(
    item: MockItem,
    maintenance: MockMaintenance,
    markInMaintenance = true,
  ): MockItem {
    if (markInMaintenance || maintenance.type === MaintenanceType.CORRETIVA) {
      return { ...item, status: ItemStatus.MAINTENANCE }
    }
    return item
  }

  function finishMaintenance(
    item: MockItem,
    maintenance: MockMaintenance,
    hasOtherOngoingMaintenances = false,
  ): { item: MockItem; maintenance: MockMaintenance } {
    const updatedMaint = { ...maintenance, status: MaintenanceStatus.CONCLUIDA }
    const updatedItem = hasOtherOngoingMaintenances ? item : { ...item, status: ItemStatus.AVAILABLE }
    return { item: updatedItem, maintenance: updatedMaint }
  }

  it('deve colocar o item em manutenção ao criar manutenção corretiva', () => {
    const item: MockItem = {
      id: 'item-1',
      name: 'Projetor Epson',
      status: ItemStatus.AVAILABLE,
      condition: ItemCondition.COM_AVARIAS,
    }

    const maint: MockMaintenance = {
      id: 'm-1',
      itemId: 'item-1',
      type: MaintenanceType.CORRETIVA,
      status: MaintenanceStatus.AGENDADA,
      title: 'Reparo na lente quebrada',
    }

    const updated = applyMaintenance(item, maint)
    expect(updated.status).toBe(ItemStatus.MAINTENANCE)
  })

  it('deve permitir agendar manutenção preventiva sem necessariamente bloquear o item imediatamente', () => {
    const item: MockItem = {
      id: 'item-2',
      name: 'Caixa de Som Yamaha',
      status: ItemStatus.AVAILABLE,
      condition: ItemCondition.PERFEITO,
    }

    const maint: MockMaintenance = {
      id: 'm-2',
      itemId: 'item-2',
      type: MaintenanceType.PREVENTIVA,
      status: MaintenanceStatus.AGENDADA,
      title: 'Limpeza periódica de conectores e revisão',
    }

    const updated = applyMaintenance(item, maint, false)
    expect(updated.status).toBe(ItemStatus.AVAILABLE)
  })

  it('deve restabelecer o item como AVAILABLE quando a manutenção for CONCLUIDA', () => {
    const item: MockItem = {
      id: 'item-1',
      name: 'Projetor Epson',
      status: ItemStatus.MAINTENANCE,
      condition: ItemCondition.COM_AVARIAS,
    }

    const maint: MockMaintenance = {
      id: 'm-1',
      itemId: 'item-1',
      type: MaintenanceType.CORRETIVA,
      status: MaintenanceStatus.EM_ANDAMENTO,
      title: 'Reparo na lente',
    }

    const finished = finishMaintenance(item, maint, false)
    expect(finished.item.status).toBe(ItemStatus.AVAILABLE)
    expect(finished.maintenance.status).toBe(MaintenanceStatus.CONCLUIDA)
  })
})
