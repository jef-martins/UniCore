import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AccessRole, TicketPriority, TicketStatus } from '@prisma/client'
import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import { extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { PrismaService } from '../database/prisma.service'
import { CreateTicketDto } from './dto/create-ticket.dto'
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto'
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto'

export interface UserAuthContext {
  sub: string
  role: string
  username?: string
}

export const SECTOR_LABELS: Record<string, string> = {
  VESTIBULAR: 'Vestibular',
  TESOURARIA: 'Tesouraria',
  SECRETARIA: 'Secretaria',
  COORDENACAO: 'Coordenação',
  REGISTRO_ACADEMICO: 'Registro Acadêmico',
  ALUNO: 'Aluno',
  PROFESSOR: 'Professor',
  ADMIN: 'Administração',
  MASTER: 'Desenvolvedor',
}

@Injectable()
export class TicketsService {
  private readonly uploadDir = join(process.cwd(), 'uploads/tickets')

  constructor(private readonly prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true, role: true, email: true },
      orderBy: { username: 'asc' },
    })
  }

  async getUnattendedSummary(user: UserAuthContext) {
    const userRole = user.role.toUpperCase() as AccessRole
    if (userRole !== AccessRole.MASTER) {
      return { count: 0, tickets: [] }
    }

    const [tickets, count] = await Promise.all([
      this.prisma.ticket.findMany({
        where: {
          status: TicketStatus.ABERTO,
        },
        include: {
          user: { select: { id: true, username: true, role: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.ticket.count({
        where: {
          status: TicketStatus.ABERTO,
        },
      }),
    ])

    return {
      count,
      tickets: tickets.map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        priority: t.priority,
        sector: t.sector,
        sectorLabel: SECTOR_LABELS[t.sector] || t.sector,
        createdAt: t.createdAt,
        user: t.user,
      })),
    }
  }

  private async saveFile(file: Express.Multer.File): Promise<{ fileName: string; filePath: string; size: number; mimeType: string }> {
    if (!existsSync(this.uploadDir)) {
      await fs.mkdir(this.uploadDir, { recursive: true })
    }
    const ext = extname(file.originalname)
    const uniqueName = `${Date.now()}-${randomUUID()}${ext}`
    const destination = join(this.uploadDir, uniqueName)
    await fs.writeFile(destination, file.buffer)
    return {
      fileName: file.originalname,
      filePath: destination,
      size: file.size,
      mimeType: file.mimetype,
    }
  }

  async autoCloseInactiveTickets(): Promise<number> {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)

    // Busca chamados em atendimento que não foram atualizados há mais de 5 dias
    const candidates = await this.prisma.ticket.findMany({
      where: {
        status: TicketStatus.EM_ANDAMENTO,
        updatedAt: { lte: fiveDaysAgo },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    let closedCount = 0
    for (const ticket of candidates) {
      const lastMessage = ticket.messages[0]
      // Se a última mensagem foi do solicitante, o chamado está aguardando o desenvolvedor, não o usuário final
      if (lastMessage && lastMessage.userId === ticket.userId) {
        continue
      }

      const lastInteractionDate = lastMessage ? new Date(lastMessage.createdAt) : new Date(ticket.updatedAt)

      if (lastInteractionDate <= fiveDaysAgo) {
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: TicketStatus.FINALIZADO,
            closedAt: new Date(),
            resolutionNotes: 'Fechado automaticamente pelo sistema por inatividade (5 dias aguardando interação do solicitante).',
          },
        })

        await this.prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            userId: ticket.assignedToId || ticket.userId,
            message: 'Chamado finalizado automaticamente pelo sistema por inatividade (5 dias sem resposta do solicitante).',
            statusChange: TicketStatus.FINALIZADO,
          },
        })
        closedCount++
      }
    }

    return closedCount
  }

  async findAll(user: UserAuthContext, query?: { sector?: string; status?: string; priority?: string; search?: string; userId?: string; code?: string }) {
    await this.autoCloseInactiveTickets()

    const userRole = user.role.toUpperCase() as AccessRole
    const isMaster = userRole === AccessRole.MASTER

    const where: any = {}

    // Cada um só pode ver do seu usuário. O único que pode ver tudo é o usuário master!
    if (!isMaster) {
      where.userId = user.sub
    } else if (query?.userId) {
      where.userId = query.userId
    }

    if (query?.code) {
      const parsedCode = parseInt(query.code.replace('#', '').trim(), 10)
      if (!isNaN(parsedCode)) {
        where.code = parsedCode
      }
    }

    if (query?.sector) {
      const normalizedSector = query.sector.toUpperCase() as AccessRole
      if (Object.values(AccessRole).includes(normalizedSector)) {
        where.sector = normalizedSector
      }
    }

    if (query?.status) {
      const normalizedStatus = query.status.toUpperCase() as TicketStatus
      if (Object.values(TicketStatus).includes(normalizedStatus)) {
        where.status = normalizedStatus
      }
    }

    if (query?.priority) {
      const normalizedPriority = query.priority.toUpperCase() as TicketPriority
      if (Object.values(TicketPriority).includes(normalizedPriority)) {
        where.priority = normalizedPriority
      }
    }

    if (query?.search?.trim()) {
      const term = query.search.trim()
      const codeNum = parseInt(term.replace('#', ''), 10)
      const orConditions: any[] = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { user: { username: { contains: term, mode: 'insensitive' } } },
      ]
      if (!isNaN(codeNum)) {
        orConditions.push({ code: codeNum })
      }

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: orConditions },
        ]
        delete where.OR
      } else {
        where.OR = orConditions
      }
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, role: true, email: true } },
        assignedTo: { select: { id: true, username: true, role: true, email: true } },
        attachments: { select: { id: true, fileName: true, fileSize: true, mimeType: true, createdAt: true } },
        _count: { select: { messages: true, attachments: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    })

    return tickets.map((t) => ({
      ...t,
      assignedTo: t.status === TicketStatus.ABERTO ? null : t.assignedTo,
      assignedToId: t.status === TicketStatus.ABERTO ? null : t.assignedToId,
      sectorLabel: SECTOR_LABELS[t.sector] || t.sector,
    }))
  }

  async findById(id: string, user: UserAuthContext) {
    await this.autoCloseInactiveTickets()

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, role: true, email: true } },
        assignedTo: { select: { id: true, username: true, role: true, email: true } },
        attachments: true,
        messages: {
          include: {
            user: { select: { id: true, username: true, role: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!ticket) {
      throw new NotFoundException('Chamado não encontrado.')
    }

    const userRole = user.role.toUpperCase() as AccessRole
    const isMaster = userRole === AccessRole.MASTER
    const isOwner = ticket.userId === user.sub

    if (!isMaster && !isOwner) {
      throw new ForbiddenException('Você não tem permissão para acessar este chamado.')
    }

    return {
      ...ticket,
      assignedTo: ticket.status === TicketStatus.ABERTO ? null : ticket.assignedTo,
      assignedToId: ticket.status === TicketStatus.ABERTO ? null : ticket.assignedToId,
      sectorLabel: SECTOR_LABELS[ticket.sector] || ticket.sector,
    }
  }

  async create(user: UserAuthContext, body: CreateTicketDto, files?: Express.Multer.File[]) {
    const title = body.title.trim()
    if (!title) throw new BadRequestException('O título do chamado é obrigatório.')

    const description = body.description.trim()
    if (!description) throw new BadRequestException('A descrição do chamado é obrigatória.')

    const userRole = user.role.toUpperCase() as AccessRole
    const isMaster = userRole === AccessRole.MASTER

    let creatorId = user.sub
    if (isMaster && body.userId) {
      const targetUser = await this.prisma.user.findUnique({ where: { id: body.userId } })
      if (targetUser) {
        creatorId = targetUser.id
      }
    }

    // Salvar anexos caso existam
    const savedAttachments: { fileName: string; filePath: string; fileSize: number; mimeType: string }[] = []
    if (files && files.length > 0) {
      for (const file of files) {
        const saved = await this.saveFile(file)
        savedAttachments.push({
          fileName: saved.fileName,
          filePath: saved.filePath,
          fileSize: saved.size,
          mimeType: saved.mimeType,
        })
      }
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        title,
        description,
        sector: body.sector,
        priority: body.priority || TicketPriority.MEDIA,
        userId: creatorId,
        status: TicketStatus.ABERTO,
        attachments: {
          create: savedAttachments,
        },
      },
      include: {
        user: { select: { id: true, username: true, role: true, email: true } },
        assignedTo: { select: { id: true, username: true, role: true, email: true } },
        attachments: true,
        messages: true,
      },
    })

    return {
      ...ticket,
      sectorLabel: SECTOR_LABELS[ticket.sector] || ticket.sector,
    }
  }

  async addMessage(
    ticketId: string,
    user: UserAuthContext,
    body: CreateTicketMessageDto,
    file?: Express.Multer.File,
  ) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } })
    if (!ticket) throw new NotFoundException('Chamado não encontrado.')

    const userRole = user.role.toUpperCase() as AccessRole
    const isMaster = userRole === AccessRole.MASTER
    const isOwner = ticket.userId === user.sub

    if (!isMaster && !isOwner) {
      throw new ForbiddenException('Você não tem permissão para interagir neste chamado.')
    }

    let fileInfo: { fileName: string; filePath: string; size: number; mimeType: string } | null = null
    if (file) {
      fileInfo = await this.saveFile(file)
    }

    let nextStatus = ticket.status
    if (body.statusChange && Object.values(TicketStatus).includes(body.statusChange)) {
      if (!isMaster && !isOwner) {
        throw new ForbiddenException('Você não tem permissão para alterar o status deste chamado.')
      }

      // Regra: Todo chamado só pode ser reaberto até 5 dias após seu encerramento
      if (body.statusChange === TicketStatus.ABERTO) {
        const closedStatuses: TicketStatus[] = [TicketStatus.CONCLUIDO, TicketStatus.FINALIZADO, TicketStatus.CANCELADO]
        if (closedStatuses.includes(ticket.status)) {
          const closedRef = ticket.closedAt || ticket.updatedAt
          const fiveDaysMs = 5 * 24 * 60 * 60 * 1000
          if (Date.now() - new Date(closedRef).getTime() > fiveDaysMs) {
            throw new BadRequestException(
              'Este chamado foi encerrado há mais de 5 dias e não pode mais ser reaberto. Caso necessite de novo suporte, por favor abra um novo chamado.'
            )
          }
        }
      }

      nextStatus = body.statusChange
    } else if (isMaster && ticket.status === TicketStatus.ABERTO) {
      // Quando o desenvolvedor responde pela primeira vez, coloca em atendimento automaticamente se ainda estiver aberto
      nextStatus = TicketStatus.EM_ANDAMENTO
    }

    const isClosing = nextStatus === TicketStatus.CONCLUIDO || nextStatus === TicketStatus.FINALIZADO
    const closedAt = isClosing ? new Date() : (nextStatus === TicketStatus.ABERTO || nextStatus === TicketStatus.EM_ANDAMENTO ? null : ticket.closedAt)

    let assignedUpdate: string | null | undefined = undefined
    if (nextStatus === TicketStatus.ABERTO) {
      assignedUpdate = null
    } else if (isMaster && !ticket.assignedToId) {
      assignedUpdate = user.sub
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: nextStatus,
        closedAt,
        ...(assignedUpdate !== undefined ? { assignedToId: assignedUpdate } : {}),
      },
      include: {
        user: { select: { id: true, username: true, role: true, email: true } },
        assignedTo: { select: { id: true, username: true, role: true, email: true } },
      },
    })

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: user.sub,
        message: body.message.trim(),
        statusChange: body.statusChange || (nextStatus !== ticket.status ? nextStatus : null),
        attachmentName: fileInfo?.fileName,
        attachmentPath: fileInfo?.filePath,
        attachmentSize: fileInfo?.size,
        attachmentMimeType: fileInfo?.mimeType,
      },
      include: {
        user: { select: { id: true, username: true, role: true, email: true } },
      },
    })

    return {
      message,
      ticket: {
        ...updatedTicket,
        assignedTo: updatedTicket.status === TicketStatus.ABERTO ? null : updatedTicket.assignedTo,
        assignedToId: updatedTicket.status === TicketStatus.ABERTO ? null : updatedTicket.assignedToId,
        sectorLabel: SECTOR_LABELS[updatedTicket.sector] || updatedTicket.sector,
      },
    }
  }

  async updateStatus(ticketId: string, user: UserAuthContext, body: UpdateTicketStatusDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { user: true },
    })
    if (!ticket) throw new NotFoundException('Chamado não encontrado.')

    const userRole = user.role.toUpperCase() as AccessRole
    const isMaster = userRole === AccessRole.MASTER
    const isOwner = ticket.userId === user.sub

    if (!isMaster && !isOwner) {
      throw new ForbiddenException('Você não tem permissão para alterar o status deste chamado.')
    }

    // Regra: Todo chamado só pode ser reaberto até 5 dias após encerramento
    if (body.status === TicketStatus.ABERTO) {
      const closedStatuses: TicketStatus[] = [TicketStatus.CONCLUIDO, TicketStatus.FINALIZADO, TicketStatus.CANCELADO]
      if (closedStatuses.includes(ticket.status)) {
        const closedRef = ticket.closedAt || ticket.updatedAt
        const fiveDaysMs = 5 * 24 * 60 * 60 * 1000
        if (Date.now() - new Date(closedRef).getTime() > fiveDaysMs) {
          throw new BadRequestException(
            'Este chamado foi encerrado há mais de 5 dias e não pode mais ser reaberto. Caso necessite de novo suporte, por favor abra um novo chamado.'
          )
        }
      }
    }

    const isClosing = body.status === TicketStatus.CONCLUIDO || body.status === TicketStatus.FINALIZADO
    const isReopening = body.status === TicketStatus.ABERTO || body.status === TicketStatus.EM_ANDAMENTO

    const updateData: any = {
      status: body.status,
      closedAt: isClosing ? new Date() : (isReopening ? null : ticket.closedAt),
    }

    if (body.resolutionNotes !== undefined) {
      updateData.resolutionNotes = body.resolutionNotes?.trim() || null
    }

    if (body.status === TicketStatus.ABERTO) {
      updateData.assignedToId = null
    } else if (body.assignedToId !== undefined && isMaster) {
      updateData.assignedToId = body.assignedToId || null
    } else if (isMaster && body.status === TicketStatus.EM_ANDAMENTO && !ticket.assignedToId) {
      updateData.assignedToId = user.sub
    }

    if (body.priority && isMaster) {
      updateData.priority = body.priority
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        user: { select: { id: true, username: true, role: true, email: true } },
        assignedTo: { select: { id: true, username: true, role: true, email: true } },
      },
    })

    // Registrar mensagem de sistema para histórico
    let systemLog = `Status alterado para ${body.status}`
    if (body.resolutionNotes) {
      systemLog += ` • Observação: ${body.resolutionNotes}`
    }

    await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: user.sub,
        message: systemLog,
        statusChange: body.status,
      },
    })

    return {
      ...updated,
      sectorLabel: SECTOR_LABELS[updated.sector] || updated.sector,
    }
  }

  async getDashboardStats(user: UserAuthContext, query?: { sector?: string; days?: number; userId?: string }) {
    await this.autoCloseInactiveTickets()

    const userRole = user.role.toUpperCase() as AccessRole
    const isMaster = userRole === AccessRole.MASTER

    const where: any = {}
    if (!isMaster) {
      where.userId = user.sub
    } else if (query?.userId) {
      where.userId = query.userId
    }

    if (query?.sector) {
      const normalizedSector = query.sector.toUpperCase() as AccessRole
      if (Object.values(AccessRole).includes(normalizedSector)) {
        where.sector = normalizedSector
      }
    }

    const days = query?.days ? Number(query.days) : 30
    if (days > 0) {
      const since = new Date()
      since.setDate(since.getDate() - days)
      where.createdAt = { gte: since }
    }

    const allTickets = await this.prisma.ticket.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, role: true } },
        assignedTo: { select: { id: true, username: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const total = allTickets.length
    const abertos = allTickets.filter((t) => t.status === TicketStatus.ABERTO).length
    const emAndamento = allTickets.filter((t) => t.status === TicketStatus.EM_ANDAMENTO).length
    const concluidos = allTickets.filter((t) => t.status === TicketStatus.CONCLUIDO).length
    const finalizados = allTickets.filter((t) => t.status === TicketStatus.FINALIZADO).length
    const cancelados = allTickets.filter((t) => t.status === TicketStatus.CANCELADO).length

    const resolvidos = concluidos + finalizados
    const taxaResolucao = total > 0 ? Math.round((resolvidos / total) * 100) : 0

    // Cálculo do tempo médio de resolução em horas
    const ticketsFechados = allTickets.filter((t) => t.closedAt && (t.status === TicketStatus.CONCLUIDO || t.status === TicketStatus.FINALIZADO))
    let tempoMedioHoras = 0
    if (ticketsFechados.length > 0) {
      const totalMillis = ticketsFechados.reduce((sum, t) => {
        const diff = new Date(t.closedAt!).getTime() - new Date(t.createdAt).getTime()
        return sum + Math.max(0, diff)
      }, 0)
      tempoMedioHoras = Math.round((totalMillis / ticketsFechados.length / (1000 * 60 * 60)) * 10) / 10
    }

    // Por setor
    const sectorStatsMap = new Map<string, { total: number; abertos: number; emAndamento: number; concluidos: number; finalizados: number }>()
    for (const s of Object.values(AccessRole)) {
      sectorStatsMap.set(s, { total: 0, abertos: 0, emAndamento: 0, concluidos: 0, finalizados: 0 })
    }

    for (const t of allTickets) {
      const stat = sectorStatsMap.get(t.sector) || { total: 0, abertos: 0, emAndamento: 0, concluidos: 0, finalizados: 0 }
      stat.total++
      if (t.status === TicketStatus.ABERTO) stat.abertos++
      else if (t.status === TicketStatus.EM_ANDAMENTO) stat.emAndamento++
      else if (t.status === TicketStatus.CONCLUIDO) stat.concluidos++
      else if (t.status === TicketStatus.FINALIZADO) stat.finalizados++
      sectorStatsMap.set(t.sector, stat)
    }

    const porSetor = Array.from(sectorStatsMap.entries())
      .map(([sector, st]) => {
        const res = st.concluidos + st.finalizados
        return {
          sector,
          label: SECTOR_LABELS[sector] || sector,
          total: st.total,
          abertos: st.abertos,
          emAndamento: st.emAndamento,
          concluidos: st.concluidos,
          finalizados: st.finalizados,
          taxaResolucao: st.total > 0 ? Math.round((res / st.total) * 100) : 0,
        }
      })
      .filter((s) => s.total > 0 || isMaster)

    // Por prioridade
    const porPrioridade = {
      BAIXA: { total: 0, resolvidos: 0, pendentes: 0 },
      MEDIA: { total: 0, resolvidos: 0, pendentes: 0 },
      ALTA: { total: 0, resolvidos: 0, pendentes: 0 },
      URGENTE: { total: 0, resolvidos: 0, pendentes: 0 },
    }

    for (const t of allTickets) {
      const p = t.priority
      if (porPrioridade[p]) {
        porPrioridade[p].total++
        if (t.status === TicketStatus.CONCLUIDO || t.status === TicketStatus.FINALIZADO) {
          porPrioridade[p].resolvidos++
        } else {
          porPrioridade[p].pendentes++
        }
      }
    }

    // Recentes
    const recentes = allTickets.slice(0, 10).map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      status: t.status,
      priority: t.priority,
      sector: t.sector,
      sectorLabel: SECTOR_LABELS[t.sector] || t.sector,
      user: t.user,
      assignedTo: t.status === TicketStatus.ABERTO ? null : t.assignedTo,
      createdAt: t.createdAt,
      closedAt: t.closedAt,
    }))

    return {
      overview: {
        total,
        abertos,
        emAndamento,
        concluidos,
        finalizados,
        cancelados,
        resolvidos,
        taxaResolucao,
        tempoMedioHoras,
      },
      porSetor,
      porPrioridade,
      recentes,
    }
  }

  async getAttachment(ticketId: string, attachmentId: string, user: UserAuthContext) {
    const attachment = await this.prisma.ticketAttachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    })

    if (!attachment || attachment.ticketId !== ticketId) {
      throw new NotFoundException('Anexo não encontrado.')
    }

    const userRole = user.role.toUpperCase() as AccessRole
    const isMaster = userRole === AccessRole.MASTER
    const isOwner = attachment.ticket.userId === user.sub

    if (!isMaster && !isOwner) {
      throw new ForbiddenException('Acesso negado a este anexo.')
    }

    if (!existsSync(attachment.filePath)) {
      throw new NotFoundException('Arquivo físico do anexo não foi encontrado.')
    }

    return {
      path: attachment.filePath,
      filename: attachment.fileName,
      mimeType: attachment.mimeType,
    }
  }

  async getMessageAttachment(messageId: string, user: UserAuthContext) {
    const message = await this.prisma.ticketMessage.findUnique({
      where: { id: messageId },
      include: { ticket: true },
    })

    if (!message || !message.attachmentPath) {
      throw new NotFoundException('Anexo de mensagem não encontrado.')
    }

    const userRole = user.role.toUpperCase() as AccessRole
    const isMaster = userRole === AccessRole.MASTER
    const isOwner = message.ticket.userId === user.sub

    if (!isMaster && !isOwner) {
      throw new ForbiddenException('Acesso negado a este anexo.')
    }

    if (!existsSync(message.attachmentPath)) {
      throw new NotFoundException('Arquivo físico não encontrado.')
    }

    return {
      path: message.attachmentPath,
      filename: message.attachmentName || 'anexo',
      mimeType: message.attachmentMimeType || 'application/octet-stream',
    }
  }
}
