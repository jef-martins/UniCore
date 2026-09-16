import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import {
  ItemCondition,
  ItemOperationalStatus,
  ItemStatus,
  MaintenanceStatus,
  MaintenanceType,
  Prisma,
  ReservationStatus,
} from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import {
  CreateItemDto,
  CreateItemEvaluationDto,
  CreateMaintenanceDto,
  CreateReservationDto,
  UpdateItemDto,
  UpdateMaintenanceDto,
} from './dto/reservations.dto'

export interface ConsolidatedStatusResult {
  consolidatedStatus: ItemOperationalStatus
  statusCounts: Record<ItemOperationalStatus, number>
  totalEvaluations: number
  averageRating: number | null
}

export function computeConsolidatedStatus(
  evaluations: { operationalStatus: ItemOperationalStatus; createdAt: Date; rating?: number }[],
  fallbackCondition?: ItemCondition,
): ConsolidatedStatusResult {
  const statusCounts: Record<ItemOperationalStatus, number> = {
    FUNCIONANDO_PERFEITAMENTE: 0,
    FUNCIONANDO_COM_DEFEITOS: 0,
    COM_AVARIAS_FUNCIONANDO: 0,
    NAO_FUNCIONANDO: 0,
  }

  if (!evaluations || evaluations.length === 0) {
    let fallback: ItemOperationalStatus = ItemOperationalStatus.FUNCIONANDO_PERFEITAMENTE
    if (fallbackCondition === ItemCondition.NAO_FUNCIONA) {
      fallback = ItemOperationalStatus.NAO_FUNCIONANDO
    } else if (
      fallbackCondition === ItemCondition.DEFEITO_PARCIAL ||
      fallbackCondition === ItemCondition.DEFEITO_FUNCIONA
    ) {
      fallback = ItemOperationalStatus.FUNCIONANDO_COM_DEFEITOS
    } else if (fallbackCondition === ItemCondition.COM_AVARIAS) {
      fallback = ItemOperationalStatus.COM_AVARIAS_FUNCIONANDO
    }
    return {
      consolidatedStatus: fallback,
      statusCounts,
      totalEvaluations: 0,
      averageRating: null,
    }
  }

  for (const ev of evaluations) {
    if (statusCounts[ev.operationalStatus] !== undefined) {
      statusCounts[ev.operationalStatus]++
    }
  }

  // Maior ocorrência (Moda estatística)
  let maxCount = -1
  const candidates: ItemOperationalStatus[] = []
  for (const statusKey of Object.keys(statusCounts) as ItemOperationalStatus[]) {
    const count = statusCounts[statusKey]
    if (count > maxCount) {
      maxCount = count
      candidates.length = 0
      candidates.push(statusKey)
    } else if (count === maxCount && count > 0) {
      candidates.push(statusKey)
    }
  }

  let winner: ItemOperationalStatus = ItemOperationalStatus.FUNCIONANDO_PERFEITAMENTE
  if (candidates.length === 1) {
    winner = candidates[0]
  } else if (candidates.length > 1) {
    // Em caso de empate: o que tiver a avaliação mais recente vence
    const latestPerCandidate = new Map<ItemOperationalStatus, number>()
    for (const ev of evaluations) {
      if (candidates.includes(ev.operationalStatus)) {
        const time = new Date(ev.createdAt).getTime()
        const cur = latestPerCandidate.get(ev.operationalStatus) || 0
        if (time > cur) {
          latestPerCandidate.set(ev.operationalStatus, time)
        }
      }
    }
    let latestTime = -1
    for (const cand of candidates) {
      const t = latestPerCandidate.get(cand) || 0
      if (t > latestTime) {
        latestTime = t
        winner = cand
      }
    }
  }

  const ratings = evaluations.filter((e) => typeof e.rating === 'number' && e.rating >= 1 && e.rating <= 5)
  const averageRating =
    ratings.length > 0
      ? Number((ratings.reduce((acc, e) => acc + (e.rating || 0), 0) / ratings.length).toFixed(1))
      : null

  return {
    consolidatedStatus: winner,
    statusCounts,
    totalEvaluations: evaluations.length,
    averageRating,
  }
}

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getItems(search?: string, category?: string, status?: ItemStatus, condition?: ItemCondition) {
    const totalCount = await this.prisma.reservableItem.count()
    if (totalCount === 0) {
      await this.seedDefaultItems()
    }

    const where: Prisma.ReservableItemWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (category && category !== 'ALL') {
      where.category = category
    }

    if (status) {
      where.status = status
    }

    if (condition) {
      where.condition = condition
    }

    const items = await this.prisma.reservableItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        reservations: {
          where: { status: ReservationStatus.ACTIVE },
          orderBy: { startDate: 'asc' },
          take: 1,
        },
        maintenances: {
          orderBy: { scheduledDate: 'desc' },
          take: 1,
        },
        evaluations: {
          select: {
            id: true,
            rating: true,
            operationalStatus: true,
            createdAt: true,
          },
        },
      },
    })

    return items.map((item) => {
      const stats = computeConsolidatedStatus(item.evaluations, item.condition)
      return {
        ...item,
        currentReservation: item.reservations[0] ?? null,
        latestMaintenance: item.maintenances[0] ?? null,
        consolidatedStatus: stats.consolidatedStatus,
        statusCounts: stats.statusCounts,
        averageRating: stats.averageRating,
        totalEvaluations: stats.totalEvaluations,
      }
    })
  }

  async createItem(dto: CreateItemDto) {
    const existing = await this.prisma.reservableItem.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    })

    if (existing) {
      throw new ConflictException('Já existe um item cadastrado com este código de patrimônio.')
    }

    return this.prisma.reservableItem.create({
      data: {
        name: dto.name.trim(),
        category: dto.category.trim(),
        code: dto.code.trim().toUpperCase(),
        location: dto.location.trim(),
        description: dto.description?.trim(),
        status: ItemStatus.AVAILABLE,
        condition: dto.condition ?? ItemCondition.PERFEITO,
      },
    })
  }

  async updateItem(id: string, dto: UpdateItemDto) {
    const item = await this.prisma.reservableItem.findUnique({ where: { id } })
    if (!item) {
      throw new NotFoundException('Item não encontrado.')
    }

    if (dto.code && dto.code.trim().toUpperCase() !== item.code) {
      const existing = await this.prisma.reservableItem.findUnique({
        where: { code: dto.code.trim().toUpperCase() },
      })
      if (existing && existing.id !== id) {
        throw new ConflictException('Já existe outro item cadastrado com este código de patrimônio.')
      }
    }

    return this.prisma.reservableItem.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.category ? { category: dto.category.trim() } : {}),
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.location ? { location: dto.location.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.condition ? { condition: dto.condition } : {}),
      },
    })
  }

  async updateItemStatus(id: string, status: ItemStatus) {
    const item = await this.prisma.reservableItem.findUnique({ where: { id } })
    if (!item) {
      throw new NotFoundException('Item não encontrado.')
    }

    return this.prisma.reservableItem.update({
      where: { id },
      data: { status },
    })
  }

  async deleteItem(id: string) {
    const item = await this.prisma.reservableItem.findUnique({
      where: { id },
      include: {
        reservations: {
          where: { status: ReservationStatus.ACTIVE },
        },
      },
    })

    if (!item) {
      throw new NotFoundException('Item não encontrado.')
    }

    if (item.reservations.length > 0) {
      throw new BadRequestException('Não é possível excluir um item com reservas ativas.')
    }

    return this.prisma.reservableItem.delete({ where: { id } })
  }

  // --- MANUTENÇÕES PREVENTIVA E CORRETIVA ---

  async createMaintenance(itemId: string, dto: CreateMaintenanceDto) {
    const item = await this.prisma.reservableItem.findUnique({ where: { id: itemId } })
    if (!item) {
      throw new NotFoundException('Item não encontrado.')
    }

    const scheduled = new Date(dto.scheduledDate)
    if (isNaN(scheduled.getTime())) {
      throw new BadRequestException('Data agendada inválida.')
    }

    const maintenance = await this.prisma.itemMaintenance.create({
      data: {
        itemId,
        type: dto.type,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        technician: dto.technician?.trim() || null,
        scheduledDate: scheduled,
        cost: dto.cost !== undefined && dto.cost !== null ? dto.cost : null,
        status: MaintenanceStatus.AGENDADA,
      },
      include: {
        item: true,
      },
    })

    if (dto.markItemInMaintenance || dto.type === MaintenanceType.CORRETIVA) {
      await this.prisma.reservableItem.update({
        where: { id: itemId },
        data: { status: ItemStatus.MAINTENANCE },
      })
    }

    return maintenance
  }

  async getMaintenances(itemId?: string) {
    const where: Prisma.ItemMaintenanceWhereInput = {}
    if (itemId) {
      where.itemId = itemId
    }

    return this.prisma.itemMaintenance.findMany({
      where,
      orderBy: { scheduledDate: 'desc' },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            code: true,
            location: true,
            status: true,
            category: true,
          },
        },
      },
    })
  }

  async updateMaintenance(id: string, dto: UpdateMaintenanceDto) {
    const maintenance = await this.prisma.itemMaintenance.findUnique({
      where: { id },
    })
    if (!maintenance) {
      throw new NotFoundException('Registro de manutenção não encontrado.')
    }

    const completed = dto.completedDate ? new Date(dto.completedDate) : undefined
    if (completed && isNaN(completed.getTime())) {
      throw new BadRequestException('Data de conclusão inválida.')
    }

    const updated = await this.prisma.itemMaintenance.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(completed !== undefined ? { completedDate: completed } : {}),
        ...(dto.cost !== undefined ? { cost: dto.cost } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() } : {}),
      },
      include: { item: true },
    })

    if (dto.restoreItemToAvailable || dto.status === MaintenanceStatus.CONCLUIDA) {
      const pending = await this.prisma.itemMaintenance.count({
        where: {
          itemId: maintenance.itemId,
          id: { not: id },
          status: { in: [MaintenanceStatus.AGENDADA, MaintenanceStatus.EM_ANDAMENTO] },
        },
      })
      if (pending === 0) {
        await this.syncItemStatus(maintenance.itemId)
      }
    }

    return updated
  }

  // --- CONSULTA DE SALAS / LABS E AVALIAÇÃO DE ITENS POR ALUNOS ---

  async getRoomsWithStats() {
    const totalCount = await this.prisma.reservableItem.count()
    if (totalCount === 0) {
      await this.seedDefaultItems()
    }

    const items = await this.prisma.reservableItem.findMany({
      include: {
        evaluations: {
          select: {
            id: true,
            rating: true,
            operationalStatus: true,
            createdAt: true,
          },
        },
        maintenances: {
          where: {
            status: { in: [MaintenanceStatus.AGENDADA, MaintenanceStatus.EM_ANDAMENTO] },
          },
          select: { id: true, type: true, status: true },
        },
      },
      orderBy: { location: 'asc' },
    })

    const roomsMap = new Map<
      string,
      {
        location: string
        itemCount: number
        totalEvaluations: number
        ratingsSum: number
        ratedCount: number
        underMaintenanceCount: number
        categories: Set<string>
        items: {
          id: string
          name: string
          code: string
          category: string
          status: ItemStatus
          condition: ItemCondition
          consolidatedStatus: ItemOperationalStatus
          averageRating: number | null
          totalEvaluations: number
        }[]
      }
    >()

    for (const item of items) {
      const stats = computeConsolidatedStatus(item.evaluations, item.condition)
      const locKey = item.location.trim()

      if (!roomsMap.has(locKey)) {
        roomsMap.set(locKey, {
          location: locKey,
          itemCount: 0,
          totalEvaluations: 0,
          ratingsSum: 0,
          ratedCount: 0,
          underMaintenanceCount: 0,
          categories: new Set<string>(),
          items: [],
        })
      }

      const room = roomsMap.get(locKey)!
      room.itemCount++
      room.totalEvaluations += stats.totalEvaluations
      if (stats.averageRating !== null) {
        room.ratingsSum += stats.averageRating
        room.ratedCount++
      }
      if (item.status === ItemStatus.MAINTENANCE || item.maintenances.length > 0) {
        room.underMaintenanceCount++
      }
      room.categories.add(item.category)
      room.items.push({
        id: item.id,
        name: item.name,
        code: item.code,
        category: item.category,
        status: item.status,
        condition: item.condition,
        consolidatedStatus: stats.consolidatedStatus,
        averageRating: stats.averageRating,
        totalEvaluations: stats.totalEvaluations,
      })
    }

    return Array.from(roomsMap.values()).map((room) => ({
      location: room.location,
      itemCount: room.itemCount,
      totalEvaluations: room.totalEvaluations,
      averageRating:
        room.ratedCount > 0 ? Number((room.ratingsSum / room.ratedCount).toFixed(1)) : null,
      underMaintenanceCount: room.underMaintenanceCount,
      categories: Array.from(room.categories),
      items: room.items,
    }))
  }

  async getItemsByRoom(location: string) {
    const items = await this.prisma.reservableItem.findMany({
      where: {
        location: { equals: location.trim(), mode: 'insensitive' },
      },
      include: {
        evaluations: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, username: true, role: true },
            },
          },
        },
        maintenances: {
          orderBy: { scheduledDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    })

    return items.map((item) => {
      const stats = computeConsolidatedStatus(item.evaluations, item.condition)
      return {
        ...item,
        consolidatedStatus: stats.consolidatedStatus,
        statusCounts: stats.statusCounts,
        totalEvaluations: stats.totalEvaluations,
        averageRating: stats.averageRating,
        evaluations: item.evaluations,
        latestMaintenance: item.maintenances[0] ?? null,
      }
    })
  }

  async createEvaluation(itemId: string, userId: string | undefined, dto: CreateItemEvaluationDto) {
    const item = await this.prisma.reservableItem.findUnique({
      where: { id: itemId },
      include: { evaluations: true },
    })

    if (!item) {
      throw new NotFoundException('Item para avaliação não encontrado.')
    }

    let studentName = dto.studentName?.trim()
    if (!studentName && userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } })
      studentName = user?.username || 'Aluno'
    }
    if (!studentName) {
      studentName = 'Aluno'
    }

    const evaluation = await this.prisma.itemEvaluation.create({
      data: {
        itemId,
        userId: userId ?? null,
        studentName,
        rating: dto.rating,
        operationalStatus: dto.operationalStatus,
        description: dto.description?.trim() || null,
      },
      include: {
        user: { select: { id: true, username: true, role: true } },
      },
    })

    const allEvaluations = [...item.evaluations, evaluation]
    const stats = computeConsolidatedStatus(allEvaluations, item.condition)

    return {
      evaluation,
      consolidatedStatus: stats.consolidatedStatus,
      statusCounts: stats.statusCounts,
      averageRating: stats.averageRating,
      totalEvaluations: stats.totalEvaluations,
    }
  }

  async getItemEvaluations(itemId: string) {
    const item = await this.prisma.reservableItem.findUnique({
      where: { id: itemId },
      include: {
        evaluations: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, username: true, role: true } },
          },
        },
      },
    })

    if (!item) {
      throw new NotFoundException('Item não encontrado.')
    }

    const stats = computeConsolidatedStatus(item.evaluations, item.condition)

    return {
      itemId: item.id,
      itemName: item.name,
      itemCode: item.code,
      location: item.location,
      consolidatedStatus: stats.consolidatedStatus,
      statusCounts: stats.statusCounts,
      averageRating: stats.averageRating,
      totalEvaluations: stats.totalEvaluations,
      evaluations: item.evaluations,
    }
  }

  // --- RESERVAS ---

  async getReservations(status?: ReservationStatus) {
    const where: Prisma.ItemReservationWhereInput = {}
    if (status) {
      where.status = status
    }

    return this.prisma.itemReservation.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        item: true,
        user: {
          select: { id: true, username: true, email: true, role: true },
        },
      },
    })
  }

  async createReservation(userId: string | undefined, dto: CreateReservationDto) {
    const item = await this.prisma.reservableItem.findUnique({
      where: { id: dto.itemId },
    })

    if (!item) {
      throw new NotFoundException('Item para reserva não encontrado.')
    }

    if (item.status === ItemStatus.MAINTENANCE) {
      throw new BadRequestException('Este item está em manutenção e não pode ser reservado no momento.')
    }

    const start = new Date(dto.startDate)
    const end = new Date(dto.endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Datas de início e término inválidas.')
    }

    if (start >= end) {
      throw new BadRequestException('A data/hora de término deve ser posterior à data/hora de início.')
    }

    // Validação de conflito de datas com outras reservas ATIVAS do mesmo item
    const conflict = await this.prisma.itemReservation.findFirst({
      where: {
        itemId: dto.itemId,
        status: ReservationStatus.ACTIVE,
        AND: [
          { startDate: { lt: end } },
          { endDate: { gt: start } },
        ],
      },
    })

    if (conflict) {
      throw new ConflictException(
        `Este item já possui uma reserva ativa para o período selecionado (${conflict.startDate.toLocaleString('pt-BR')} até ${conflict.endDate.toLocaleString('pt-BR')}).`,
      )
    }

    const reservation = await this.prisma.itemReservation.create({
      data: {
        itemId: dto.itemId,
        userId: userId ?? null,
        requesterName: dto.requesterName.trim(),
        department: dto.department.trim(),
        startDate: start,
        endDate: end,
        purpose: dto.purpose.trim(),
        notes: dto.notes?.trim() || null,
        status: ReservationStatus.ACTIVE,
      },
      include: { item: true },
    })

    // Atualiza status do item para RESERVED se já começou ou começa agora
    const now = new Date()
    if (start <= now && end >= now) {
      await this.prisma.reservableItem.update({
        where: { id: dto.itemId },
        data: { status: ItemStatus.RESERVED },
      })
    }

    return reservation
  }

  async completeReservation(id: string) {
    const reservation = await this.prisma.itemReservation.findUnique({
      where: { id },
    })

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada.')
    }

    const updated = await this.prisma.itemReservation.update({
      where: { id },
      data: { status: ReservationStatus.COMPLETED },
      include: { item: true },
    })

    await this.syncItemStatus(reservation.itemId)

    return updated
  }

  async cancelReservation(id: string) {
    const reservation = await this.prisma.itemReservation.findUnique({
      where: { id },
    })

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada.')
    }

    const updated = await this.prisma.itemReservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
      include: { item: true },
    })

    await this.syncItemStatus(reservation.itemId)

    return updated
  }

  async getStats() {
    const [totalItems, availableItems, reservedItems, maintenanceItems, activeReservations] = await Promise.all([
      this.prisma.reservableItem.count(),
      this.prisma.reservableItem.count({ where: { status: ItemStatus.AVAILABLE } }),
      this.prisma.reservableItem.count({ where: { status: ItemStatus.RESERVED } }),
      this.prisma.reservableItem.count({ where: { status: ItemStatus.MAINTENANCE } }),
      this.prisma.itemReservation.count({ where: { status: ReservationStatus.ACTIVE } }),
    ])

    return {
      totalItems,
      availableItems,
      reservedItems,
      maintenanceItems,
      activeReservations,
    }
  }

  async getDashboardStats() {
    const [items, reservations] = await Promise.all([
      this.prisma.reservableItem.findMany({
        include: {
          reservations: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              status: true,
              requesterName: true,
              department: true,
            },
          },
        },
      }),
      this.prisma.itemReservation.findMany({
        include: {
          item: {
            select: {
              id: true,
              name: true,
              code: true,
              category: true,
              condition: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // 1. Overview counts
    const totalReservations = reservations.length
    const activeReservations = reservations.filter(r => r.status === ReservationStatus.ACTIVE).length
    const completedReservations = reservations.filter(r => r.status === ReservationStatus.COMPLETED).length
    const cancelledReservations = reservations.filter(r => r.status === ReservationStatus.CANCELLED).length

    const totalItems = items.length
    const availableItems = items.filter(i => i.status === ItemStatus.AVAILABLE).length
    const reservedItems = items.filter(i => i.status === ItemStatus.RESERVED).length
    const maintenanceItems = items.filter(i => i.status === ItemStatus.MAINTENANCE).length

    let totalHoursReserved = 0
    for (const r of reservations) {
      if (r.status !== ReservationStatus.CANCELLED) {
        const diffMs = new Date(r.endDate).getTime() - new Date(r.startDate).getTime()
        if (diffMs > 0) {
          totalHoursReserved += diffMs / (1000 * 60 * 60)
        }
      }
    }
    totalHoursReserved = Math.round(totalHoursReserved * 10) / 10

    // 2. Top Items
    const itemMap = new Map<string, {
      id: string
      name: string
      code: string
      category: string
      condition: ItemCondition
      status: ItemStatus
      reservationCount: number
      totalHours: number
    }>()

    for (const item of items) {
      let hours = 0
      for (const r of item.reservations) {
        if (r.status !== ReservationStatus.CANCELLED) {
          const diff = new Date(r.endDate).getTime() - new Date(r.startDate).getTime()
          if (diff > 0) hours += diff / (1000 * 60 * 60)
        }
      }
      itemMap.set(item.id, {
        id: item.id,
        name: item.name,
        code: item.code,
        category: item.category,
        condition: item.condition,
        status: item.status,
        reservationCount: item.reservations.length,
        totalHours: Math.round(hours * 10) / 10,
      })
    }

    const sortedItems = Array.from(itemMap.values()).sort((a, b) => b.reservationCount - a.reservationCount)
    const maxItemCount = sortedItems[0]?.reservationCount || 1

    const topItems = sortedItems.map(item => ({
      ...item,
      percentage: Math.round((item.reservationCount / maxItemCount) * 100),
    }))

    // 3. Top Requesters (Professores e Solicitantes)
    const requesterMap = new Map<string, {
      requesterName: string
      department: string
      email?: string | null
      reservationCount: number
      activeCount: number
      completedCount: number
      categoryCounts: Record<string, number>
    }>()

    for (const r of reservations) {
      const key = r.requesterName.trim().toLowerCase()
      const existing = requesterMap.get(key) || {
        requesterName: r.requesterName.trim(),
        department: r.department,
        email: r.user?.email || null,
        reservationCount: 0,
        activeCount: 0,
        completedCount: 0,
        categoryCounts: {},
      }

      existing.reservationCount++
      if (r.status === ReservationStatus.ACTIVE) existing.activeCount++
      if (r.status === ReservationStatus.COMPLETED) existing.completedCount++

      const cat = r.item?.category || 'Geral'
      existing.categoryCounts[cat] = (existing.categoryCounts[cat] || 0) + 1

      requesterMap.set(key, existing)
    }

    const sortedRequesters = Array.from(requesterMap.values()).sort((a, b) => b.reservationCount - a.reservationCount)
    const maxRequesterCount = sortedRequesters[0]?.reservationCount || 1

    const topRequesters = sortedRequesters.map(req => {
      let favoriteCategory = '-'
      let maxCatCount = 0
      for (const [cat, count] of Object.entries(req.categoryCounts)) {
        if (count > maxCatCount) {
          maxCatCount = count
          favoriteCategory = cat
        }
      }
      return {
        requesterName: req.requesterName,
        department: req.department,
        email: req.email,
        reservationCount: req.reservationCount,
        activeCount: req.activeCount,
        completedCount: req.completedCount,
        favoriteCategory,
        percentage: Math.round((req.reservationCount / maxRequesterCount) * 100),
      }
    })

    // 4. Condition Stats (Defeitos, Avarias, etc.)
    const conditionCounts: Record<ItemCondition, number> = {
      PERFEITO: 0,
      COM_AVARIAS: 0,
      DEFEITO_FUNCIONA: 0,
      DEFEITO_PARCIAL: 0,
      NAO_FUNCIONA: 0,
    }

    for (const item of items) {
      if (conditionCounts[item.condition] !== undefined) {
        conditionCounts[item.condition]++
      } else {
        conditionCounts.PERFEITO++
      }
    }

    const conditionStats = {
      byCondition: {
        PERFEITO: { count: conditionCounts.PERFEITO, percentage: totalItems ? Math.round((conditionCounts.PERFEITO / totalItems) * 100) : 0 },
        COM_AVARIAS: { count: conditionCounts.COM_AVARIAS, percentage: totalItems ? Math.round((conditionCounts.COM_AVARIAS / totalItems) * 100) : 0 },
        DEFEITO_FUNCIONA: { count: conditionCounts.DEFEITO_FUNCIONA, percentage: totalItems ? Math.round((conditionCounts.DEFEITO_FUNCIONA / totalItems) * 100) : 0 },
        DEFEITO_PARCIAL: { count: conditionCounts.DEFEITO_PARCIAL, percentage: totalItems ? Math.round((conditionCounts.DEFEITO_PARCIAL / totalItems) * 100) : 0 },
        NAO_FUNCIONA: { count: conditionCounts.NAO_FUNCIONA, percentage: totalItems ? Math.round((conditionCounts.NAO_FUNCIONA / totalItems) * 100) : 0 },
      },
      totalWithIssues: conditionCounts.COM_AVARIAS + conditionCounts.DEFEITO_FUNCIONA + conditionCounts.DEFEITO_PARCIAL + conditionCounts.NAO_FUNCIONA,
      totalCritical: conditionCounts.DEFEITO_PARCIAL + conditionCounts.NAO_FUNCIONA,
      itemsRequiringAttention: items
        .filter(i => i.condition === ItemCondition.NAO_FUNCIONA || i.condition === ItemCondition.DEFEITO_PARCIAL || i.status === ItemStatus.MAINTENANCE)
        .map(i => ({
          id: i.id,
          name: i.name,
          code: i.code,
          category: i.category,
          location: i.location,
          condition: i.condition,
          status: i.status,
          description: i.description,
        })),
    }

    // 5. Category Stats
    const categoryMap: Record<string, { itemCount: number; reservationCount: number }> = {}
    for (const item of items) {
      if (!categoryMap[item.category]) {
        categoryMap[item.category] = { itemCount: 0, reservationCount: 0 }
      }
      categoryMap[item.category].itemCount++
      categoryMap[item.category].reservationCount += item.reservations.length
    }

    const categoryStats = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      itemCount: data.itemCount,
      reservationCount: data.reservationCount,
      percentage: totalReservations ? Math.round((data.reservationCount / totalReservations) * 100) : 0,
    })).sort((a, b) => b.reservationCount - a.reservationCount)

    // 6. Department Stats
    const deptMap: Record<string, number> = {}
    for (const r of reservations) {
      const dept = r.department.trim() || 'Não especificado'
      deptMap[dept] = (deptMap[dept] || 0) + 1
    }

    const departmentStats = Object.entries(deptMap).map(([department, count]) => ({
      department,
      reservationCount: count,
      percentage: totalReservations ? Math.round((count / totalReservations) * 100) : 0,
    })).sort((a, b) => b.reservationCount - a.reservationCount)

    // 7. Idle items (Nunca reservados)
    const idleItems = items
      .filter(i => i.reservations.length === 0)
      .map(i => ({
        id: i.id,
        name: i.name,
        code: i.code,
        category: i.category,
        location: i.location,
        condition: i.condition,
        status: i.status,
      }))

    return {
      overview: {
        totalReservations,
        activeReservations,
        completedReservations,
        cancelledReservations,
        totalItems,
        availableItems,
        reservedItems,
        maintenanceItems,
        totalHoursReserved,
      },
      topItems,
      topRequesters,
      conditionStats,
      categoryStats,
      departmentStats,
      idleItems,
    }
  }

  private async syncItemStatus(itemId: string) {
    const item = await this.prisma.reservableItem.findUnique({ where: { id: itemId } })
    if (!item || item.status === ItemStatus.MAINTENANCE) return

    const now = new Date()
    const activeOngoing = await this.prisma.itemReservation.findFirst({
      where: {
        itemId,
        status: ReservationStatus.ACTIVE,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    })

    const newStatus = activeOngoing ? ItemStatus.RESERVED : ItemStatus.AVAILABLE
    if (item.status !== newStatus) {
      await this.prisma.reservableItem.update({
        where: { id: itemId },
        data: { status: newStatus },
      })
    }
  }

  private async seedDefaultItems() {
    const defaultItems = [
      {
        name: 'Projetor Epson PowerLite X49',
        category: 'Audiovisual',
        code: 'PAT-00101',
        location: 'Almoxarifado Central - Bloco A',
        description: 'Projetor HDMI 3600 lumens, resolução XGA com controle remoto e cabo de 5m.',
      },
      {
        name: 'Projetor BenQ MW560',
        category: 'Audiovisual',
        code: 'PAT-00102',
        location: 'Coordenação de Cursos - Bloco B',
        description: 'Projetor WXGA 4000 lumens de alto brilho, ideal para salas amplas e auditório.',
      },
      {
        name: 'Notebook Dell Inspiron 15',
        category: 'Informática',
        code: 'PAT-00201',
        location: 'Suporte de TI - Sala 102',
        description: 'Notebook Intel Core i7 16GB RAM SSD 512GB com Windows 11 e pacote Office.',
      },
      {
        name: 'Notebook Lenovo ThinkPad E14',
        category: 'Informática',
        code: 'PAT-00202',
        location: 'Suporte de TI - Sala 102',
        description: 'Notebook corporativo com leitor biométrico, tela antireflexo e bateria de longa duração.',
      },
      {
        name: 'Kit Microfone Sem Fio JBL Duplo',
        category: 'Audiovisual',
        code: 'PAT-00301',
        location: 'Apoio Técnico - Bloco A',
        description: 'Receptor sem fio UHF com 2 microfones de mão e pilhas recarregáveis.',
      },
      {
        name: 'Caixa de Som Amplificada Yamaha',
        category: 'Audiovisual',
        code: 'PAT-00302',
        location: 'Apoio Técnico - Bloco A',
        description: 'Caixa ativa 150W com conectividade Bluetooth, entrada P10 e XLR com pedestal.',
      },
      {
        name: 'Laboratório de Informática 01',
        category: 'Salas e Espaços',
        code: 'PAT-00401',
        location: 'Bloco C - Piso Superior',
        description: 'Laboratório equipado com 35 estações de trabalho, projetor fixo e ar condicionado.',
      },
      {
        name: 'Smart TV 65" com Suporte Móvel',
        category: 'Audiovisual',
        code: 'PAT-00501',
        location: 'Sala de Reuniões Administrativas',
        description: 'Display interativo 4K com suporte de rodízios para apresentações e videoconferências.',
      },
    ]

    for (const item of defaultItems) {
      await this.prisma.reservableItem.upsert({
        where: { code: item.code },
        create: item,
        update: {},
      })
    }
  }
}

