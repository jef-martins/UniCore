import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { ItemCondition, ItemStatus, Prisma, ReservationStatus } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { CreateItemDto, CreateReservationDto, UpdateItemDto } from './dto/reservations.dto'

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
      },
    })

    return items.map((item) => ({
      ...item,
      currentReservation: item.reservations[0] ?? null,
    }))
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
