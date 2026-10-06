import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise'
import * as crypto from 'node:crypto'
import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import * as ExcelJS from 'exceljs'
import { AccessRole } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { EventsMailerService } from './events-mailer.service'
import type {
  CreateEventArticleDto,
  CreateEventExpenseDto,
  CreateEventFeedbackDto,
  CreateEventRoomDto,
  CreateEventSponsorDto,
  CreateEventTicketDto,
  CreateEventWorkshopDto,
  CreateSponsorMovementDto,
  EventArticleDto,
  EventExpenseDto,
  EventFeedbackDto,
  EventRoomDto,
  EventSponsorDto,
  EventTicketDto,
  EventWorkshopDto,
  FinancialSummaryDto,
  LookupCpfResultDto,
  ReviewEventArticleDto,
  ScanAttendanceDto,
  ScanAttendanceResultDto,
  UpdateEventWorkshopDto,
  ValidateTicketDto,
} from './dto/certificates.dto'

interface ExternalDatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

@Injectable()
export class EventsAdvancedService {
  private readonly logger = new Logger(EventsAdvancedService.name)
  private readonly unimestreConfig?: ExternalDatabaseConfig
  private unimestrePool: Pool | null = null

  private readonly baseUploadDir = join(process.cwd(), 'uploads/events')
  private readonly ticketsUploadDir = join(process.cwd(), 'uploads/events/tickets')
  private readonly articlesUploadDir = join(process.cwd(), 'uploads/events/articles')
  private readonly expensesUploadDir = join(process.cwd(), 'uploads/events/expenses')

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mailer: EventsMailerService,
  ) {
    try {
      this.unimestreConfig = config.get<ExternalDatabaseConfig>('unimestre')
    } catch {
      this.unimestreConfig = undefined
    }
    this.ensureUploadDirs()
  }

  private async ensureUploadDirs() {
    for (const dir of [
      this.baseUploadDir,
      this.ticketsUploadDir,
      this.articlesUploadDir,
      this.expensesUploadDir,
    ]) {
      if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true }).catch(() => {})
      }
    }
  }

  private getUnimestrePool(): Pool | null {
    if (!this.unimestreConfig || !this.unimestreConfig.host) {
      return null
    }
    if (!this.unimestrePool) {
      this.unimestrePool = createPool({
        host: this.unimestreConfig.host,
        port: this.unimestreConfig.port,
        database: this.unimestreConfig.database,
        user: this.unimestreConfig.user,
        password: this.unimestreConfig.password,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        connectTimeout: 5000,
      })
    }
    return this.unimestrePool
  }

  // ==========================================
  // 1. AUTO-BUSCA E DETECÇÃO DE PERFIL POR CPF
  // ==========================================

  async lookupCpf(cpf: string): Promise<LookupCpfResultDto> {
    const cleanCpf = cpf.replace(/\D/g, '')
    if (cleanCpf.length !== 11) {
      return { cpf: cleanCpf, encontrado: false, perfil: 'visitante' }
    }

    // 1. Tenta consulta ao Unimestre MySQL se disponível
    const pool = this.getUnimestrePool()
    if (pool) {
      try {
        // Verifica se é professor
        const [profRows] = await pool.execute<RowDataPacket[]>(
          `SELECT p.cd_pessoa, p.nm_pessoa AS nome 
           FROM PESSOAS p 
           INNER JOIN turmasprofessores pr ON p.cd_pessoa = pr.cd_pessoa 
           WHERE REPLACE(REPLACE(p.ds_cpf, '.', ''), '-', '') = ? LIMIT 1`,
          [cleanCpf],
        )

        if (profRows && profRows.length > 0) {
          const prof = profRows[0]
          return {
            cpf: cleanCpf,
            encontrado: true,
            perfil: 'professor',
            nome: prof.nome,
            ra: String(prof.cd_pessoa),
          }
        }

        // Verifica se é aluno
        const [alunoRows] = await pool.execute<RowDataPacket[]>(
          `SELECT p.cd_pessoa, p.nm_pessoa AS nome, m.curso AS curso_nome
           FROM PESSOAS p 
           INNER JOIN matriculas m ON p.cd_pessoa = m.codigoaluno 
           WHERE REPLACE(REPLACE(p.ds_cpf, '.', ''), '-', '') = ? 
           ORDER BY m.anosemestre DESC LIMIT 1`,
          [cleanCpf],
        )

        if (alunoRows && alunoRows.length > 0) {
          const aluno = alunoRows[0]
          return {
            cpf: cleanCpf,
            encontrado: true,
            perfil: 'aluno',
            nome: aluno.nome,
            curso: aluno.curso_nome,
            ra: String(aluno.cd_pessoa),
          }
        }
      } catch (err) {
        this.logger.warn(`Erro na consulta MySQL de CPF: ${(err as Error).message}`)
      }
    }

    // 2. Fallback no banco local (CertificateParticipant ou User)
    const localParticipant = await this.prisma.certificateParticipant.findFirst({
      where: {
        studentCpf: {
          contains: cleanCpf,
        },
      },
      include: {
        event: true,
      },
    })

    if (localParticipant) {
      return {
        cpf: cleanCpf,
        encontrado: true,
        perfil: 'aluno',
        nome: localParticipant.studentName,
        curso: localParticipant.event?.courseName || undefined,
        ra: localParticipant.studentRa,
        email: localParticipant.studentEmail || undefined,
      }
    }

    const localUser = await this.prisma.user.findFirst({
      where: {
        username: cleanCpf,
      },
    })

    if (localUser) {
      return {
        cpf: cleanCpf,
        encontrado: true,
        perfil: localUser.role === 'PROFESSOR' ? 'professor' : 'aluno',
        nome: localUser.username,
        email: localUser.email,
      }
    }

    return { cpf: cleanCpf, encontrado: false, perfil: 'visitante' }
  }

  // ==========================================
  // 2. INGRESSOS, TICKETS E BILHETERIA
  // ==========================================

  async createTicket(
    eventId: string,
    userId: string,
    dto: CreateEventTicketDto,
  ): Promise<EventTicketDto> {
    const event = await this.prisma.certificateEvent.findUnique({
      where: { id: eventId },
      include: { workshops: true },
    })

    if (!event) {
      throw new NotFoundException('Evento não encontrado.')
    }

    if (!event.isActive) {
      throw new BadRequestException('As inscrições para este evento estão encerradas.')
    }

    if (event.ticketLimit && event.ticketLimit > 0) {
      if ((event.ticketsSold || 0) >= event.ticketLimit) {
        throw new BadRequestException('Os ingressos para este evento estão esgotados.')
      }
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.')
    }

    // Verifica se já possui ticket ativo ou em análise para o evento
    const existingTicket = await this.prisma.eventTicket.findFirst({
      where: {
        eventId,
        userId,
        status: { in: ['aguardando_pagamento', 'em_analise', 'pago'] },
      },
    })

    if (existingTicket) {
      throw new BadRequestException('Você já possui um ingresso ativo ou pendente para este evento.')
    }

    // Cálculo do valor e do vencimento baseado na regra de lotes
    const now = new Date()
    const isTeacher = user.role === 'PROFESSOR'

    let finalPrice = Number(event.standardPrice || 0)
    let isPromo = false
    let promoDeadline: Date | null = null

    if (isTeacher && event.teacherPrice !== null && event.teacherPrice !== undefined) {
      finalPrice = Number(event.teacherPrice)
      if (
        event.teacherPromoPrice !== null &&
        event.teacherPromoDeadline &&
        now <= new Date(event.teacherPromoDeadline)
      ) {
        finalPrice = Number(event.teacherPromoPrice)
        isPromo = true
        promoDeadline = new Date(event.teacherPromoDeadline)
      }
    } else {
      if (
        event.promoPrice !== null &&
        event.promoPrice !== undefined &&
        event.promoDeadline &&
        now <= new Date(event.promoDeadline)
      ) {
        finalPrice = Number(event.promoPrice)
        isPromo = true
        promoDeadline = new Date(event.promoDeadline)
      }
    }

    // Regra de data de vencimento:
    // Se pegou promoção, crava exatamente no encerramento da promoção.
    // Senão, padrão de 3 dias úteis. Trava para não ultrapassar a data de início do evento.
    let dueDate = isPromo && promoDeadline ? promoDeadline : new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    if (event.startDate && dueDate > new Date(event.startDate)) {
      dueDate = new Date(event.startDate)
    }

    // Gera token alfanumérico curto único (8 dígitos maiúsculos)
    const uniqueCode = crypto.randomBytes(4).toString('hex').toUpperCase()

    // Valida workshops selecionados se informados
    const workshopIds = dto.workshopIds || []
    if (workshopIds.length > 0) {
      for (const wId of workshopIds) {
        const wk = event.workshops.find((w) => w.id === wId)
        if (!wk) {
          throw new BadRequestException(`Workshop #${wId} não pertence a este evento.`)
        }
        const occupied = await this.prisma.eventTicketWorkshop.count({
          where: {
            workshopId: wId,
            ticket: { status: { in: ['aguardando_pagamento', 'em_analise', 'pago'] } },
          },
        })
        if (occupied >= wk.vacancies) {
          throw new BadRequestException(`O workshop "${wk.title}" já atingiu a lotação máxima de vagas.`)
        }
      }
    }

    // Executa criação em transação atômica
    const created = await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.eventTicket.create({
        data: {
          eventId,
          userId,
          uniqueCode,
          status: 'aguardando_pagamento',
          amountPaid: finalPrice,
          dueDate,
        },
      })

      if (workshopIds.length > 0) {
        await tx.eventTicketWorkshop.createMany({
          data: workshopIds.map((wId) => ({
            ticketId: ticket.id,
            workshopId: wId,
          })),
        })
      }

      await tx.certificateEvent.update({
        where: { id: eventId },
        data: { ticketsSold: { increment: 1 } },
      })

      // Sincroniza também como CertificateParticipant para manter 100% o painel legado atual
      const studentRa = user.username.replace(/\D/g, '') || user.username
      const existingParticipant = await tx.certificateParticipant.findUnique({
        where: { eventId_studentRa: { eventId, studentRa } },
      })

      if (!existingParticipant) {
        await tx.certificateParticipant.create({
          data: {
            eventId,
            studentName: user.username,
            studentRa,
            studentEmail: user.email,
            userId: user.id,
            isPaid: false,
            hasAttendance: false,
            attendanceCount: 0,
          },
        })
      }

      return ticket
    })

    const result = await this.getTicketDetails(created.id)
    if (user.email) {
      this.mailer
        .sendTicketCreated({
          to: user.email,
          userName: user.username,
          eventTitle: event.title,
          ticketCode: result.uniqueCode,
          amount: result.amountPaid,
          dueDate: result.dueDate,
          ticketType: event.ticketType || undefined,
          pixKey: event.pixKey || undefined,
          paymentLink: event.paymentLink || undefined,
        })
        .catch((err) => this.logger.warn(`Erro no disparo de e-mail de inscrição: ${err.message}`))
    }
    return result
  }

  async getTicketDetails(ticketId: string): Promise<EventTicketDto> {
    const t = await this.prisma.eventTicket.findUnique({
      where: { id: ticketId },
      include: {
        event: { select: { title: true } },
        user: { select: { username: true, email: true } },
        workshops: {
          include: {
            workshop: { select: { id: true, title: true, courseName: true } },
          },
        },
      },
    })

    if (!t) {
      throw new NotFoundException('Ingresso não encontrado.')
    }

    return {
      id: t.id,
      eventId: t.eventId,
      userId: t.userId,
      uniqueCode: t.uniqueCode,
      status: t.status,
      amountPaid: Number(t.amountPaid),
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      receiptUrl: t.receiptUrl,
      isMonitor: t.isMonitor,
      isUsed: t.isUsed,
      usedAt: t.usedAt ? t.usedAt.toISOString() : null,
      validatedAt: t.validatedAt ? t.validatedAt.toISOString() : null,
      validatedById: t.validatedById,
      createdAt: t.createdAt.toISOString(),
      eventTitle: t.event?.title,
      userName: t.user?.username,
      userEmail: t.user?.email,
      workshops: t.workshops.map((w) => ({
        id: w.workshop.id,
        title: w.workshop.title,
        courseName: w.workshop.courseName,
      })),
    }
  }

  async getEventTickets(eventId: string, status?: string): Promise<EventTicketDto[]> {
    const tickets = await this.prisma.eventTicket.findMany({
      where: {
        eventId,
        status: status ? status : undefined,
      },
      include: {
        user: { select: { username: true, email: true } },
        workshops: {
          include: {
            workshop: { select: { id: true, title: true, courseName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return tickets.map((t) => ({
      id: t.id,
      eventId: t.eventId,
      userId: t.userId,
      uniqueCode: t.uniqueCode,
      status: t.status,
      amountPaid: Number(t.amountPaid),
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      receiptUrl: t.receiptUrl,
      isMonitor: t.isMonitor,
      isUsed: t.isUsed,
      usedAt: t.usedAt ? t.usedAt.toISOString() : null,
      validatedAt: t.validatedAt ? t.validatedAt.toISOString() : null,
      validatedById: t.validatedById,
      createdAt: t.createdAt.toISOString(),
      userName: t.user?.username,
      userEmail: t.user?.email,
      workshops: t.workshops.map((w) => ({
        id: w.workshop.id,
        title: w.workshop.title,
        courseName: w.workshop.courseName,
      })),
    }))
  }

  async getMyTickets(userId: string): Promise<EventTicketDto[]> {
    const tickets = await this.prisma.eventTicket.findMany({
      where: { userId },
      include: {
        event: { select: { title: true } },
        workshops: {
          include: {
            workshop: { select: { id: true, title: true, courseName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return tickets.map((t) => ({
      id: t.id,
      eventId: t.eventId,
      userId: t.userId,
      uniqueCode: t.uniqueCode,
      status: t.status,
      amountPaid: Number(t.amountPaid),
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      receiptUrl: t.receiptUrl,
      isMonitor: t.isMonitor,
      isUsed: t.isUsed,
      usedAt: t.usedAt ? t.usedAt.toISOString() : null,
      validatedAt: t.validatedAt ? t.validatedAt.toISOString() : null,
      validatedById: t.validatedById,
      createdAt: t.createdAt.toISOString(),
      eventTitle: t.event?.title,
      workshops: t.workshops.map((w) => ({
        id: w.workshop.id,
        title: w.workshop.title,
        courseName: w.workshop.courseName,
      })),
    }))
  }

  async uploadTicketReceipt(
    ticketId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<EventTicketDto> {
    const ticket = await this.prisma.eventTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado.')
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('Apenas o titular do ingresso pode enviar o comprovante.')
    }

    const ext = extname(file.originalname).toLowerCase() || '.pdf'
    const fileName = `rec-${ticket.id}-${Date.now()}${ext}`
    const dest = join(this.ticketsUploadDir, fileName)
    await fs.writeFile(dest, file.buffer)

    const receiptUrl = `/api/certificates/tickets/receipt/${fileName}`

    await this.prisma.eventTicket.update({
      where: { id: ticketId },
      data: {
        receiptUrl,
        status: 'em_analise',
      },
    })

    return this.getTicketDetails(ticketId)
  }

  async validateTicket(
    ticketId: string,
    adminUserId: string,
    dto: ValidateTicketDto,
  ): Promise<EventTicketDto> {
    const ticket = await this.prisma.eventTicket.findUnique({
      where: { id: ticketId },
      include: { user: true },
    })

    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado.')
    }

    const isPaid = dto.status === 'pago'

    await this.prisma.$transaction(async (tx) => {
      await tx.eventTicket.update({
        where: { id: ticketId },
        data: {
          status: dto.status,
          isMonitor: dto.isMonitor !== undefined ? dto.isMonitor : ticket.isMonitor,
          validatedAt: new Date(),
          validatedById: adminUserId,
        },
      })

      // Sincroniza flag de isPaid na tabela de CertificateParticipant se o aluno estiver lá
      if (ticket.userId) {
        await tx.certificateParticipant.updateMany({
          where: { eventId: ticket.eventId, userId: ticket.userId },
          data: {
            isPaid,
            paymentDate: isPaid ? new Date() : null,
          },
        })
      }
    })

    const result = await this.getTicketDetails(ticketId)
    if (result.userEmail && result.status === 'pago') {
      this.mailer
        .sendTicketApproved({
          to: result.userEmail,
          userName: result.userName || 'Participante',
          eventTitle: result.eventTitle || 'Evento Acadêmico',
          ticketCode: result.uniqueCode,
          workshops: result.workshops?.map((w) => w.title) || [],
        })
        .catch((err) => this.logger.warn(`Erro no envio de e-mail de aprovação: ${err.message}`))
    }
    return result
  }

  async expirePendingTickets(): Promise<{ canceledCount: number }> {
    const now = new Date()
    const expiredTickets = await this.prisma.eventTicket.findMany({
      where: {
        status: 'aguardando_pagamento',
        dueDate: { lt: now },
      },
      select: {
        id: true,
        uniqueCode: true,
        user: { select: { email: true, username: true } },
        event: { select: { title: true } },
      },
    })

    if (!expiredTickets.length) {
      return { canceledCount: 0 }
    }

    const ids = expiredTickets.map((t) => t.id)
    await this.prisma.eventTicket.updateMany({
      where: { id: { in: ids } },
      data: { status: 'rejeitado' },
    })

    for (const t of expiredTickets) {
      if (t.user?.email) {
        this.mailer
          .sendTicketExpired({
            to: t.user.email,
            userName: t.user.username,
            eventTitle: t.event?.title || 'Evento Acadêmico',
            ticketCode: t.uniqueCode,
          })
          .catch((err) => this.logger.warn(`Erro no aviso de expiração: ${err.message}`))
      }
    }

    this.logger.log(`Cron Limpeza: ${ids.length} ingressos pendentes vencidos cancelados. Vagas liberadas.`)
    return { canceledCount: ids.length }
  }

  // ==========================================
  // 3. WORKSHOPS E TRANSAÇÃO ATÔMICA DE VAGAS
  // ==========================================

  async createWorkshop(eventId: string, dto: CreateEventWorkshopDto): Promise<EventWorkshopDto> {
    const event = await this.prisma.certificateEvent.findUnique({ where: { id: eventId } })
    if (!event) {
      throw new NotFoundException('Evento não encontrado.')
    }

    const created = await this.prisma.eventWorkshop.create({
      data: {
        eventId,
        title: dto.title.trim(),
        courseName: dto.courseName?.trim() || null,
        description: dto.description?.trim() || null,
        vacancies: dto.vacancies && dto.vacancies > 0 ? Number(dto.vacancies) : 50,
      },
    })

    return {
      id: created.id,
      eventId: created.eventId,
      title: created.title,
      courseName: created.courseName,
      description: created.description,
      vacancies: created.vacancies,
      occupiedVacancies: 0,
      remainingVacancies: created.vacancies,
      createdAt: created.createdAt.toISOString(),
    }
  }

  async getEventWorkshops(eventId: string): Promise<EventWorkshopDto[]> {
    const workshops = await this.prisma.eventWorkshop.findMany({
      where: { eventId },
      include: {
        tickets: {
          where: {
            ticket: { status: { in: ['aguardando_pagamento', 'em_analise', 'pago'] } },
          },
          select: { id: true },
        },
      },
      orderBy: { title: 'asc' },
    })

    return workshops.map((w) => {
      const occupied = w.tickets.length
      return {
        id: w.id,
        eventId: w.eventId,
        title: w.title,
        courseName: w.courseName,
        description: w.description,
        vacancies: w.vacancies,
        occupiedVacancies: occupied,
        remainingVacancies: Math.max(0, w.vacancies - occupied),
        createdAt: w.createdAt.toISOString(),
      }
    })
  }

  async updateWorkshop(workshopId: string, dto: UpdateEventWorkshopDto): Promise<EventWorkshopDto> {
    const existing = await this.prisma.eventWorkshop.findUnique({ where: { id: workshopId } })
    if (!existing) {
      throw new NotFoundException('Workshop não encontrado.')
    }

    const updated = await this.prisma.eventWorkshop.update({
      where: { id: workshopId },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        courseName: dto.courseName !== undefined ? (dto.courseName ? dto.courseName.trim() : null) : undefined,
        description: dto.description !== undefined ? (dto.description ? dto.description.trim() : null) : undefined,
        vacancies: dto.vacancies !== undefined ? Number(dto.vacancies) : undefined,
      },
      include: {
        tickets: {
          where: {
            ticket: { status: { in: ['aguardando_pagamento', 'em_analise', 'pago'] } },
          },
          select: { id: true },
        },
      },
    })

    const occupied = updated.tickets.length
    return {
      id: updated.id,
      eventId: updated.eventId,
      title: updated.title,
      courseName: updated.courseName,
      description: updated.description,
      vacancies: updated.vacancies,
      occupiedVacancies: occupied,
      remainingVacancies: Math.max(0, updated.vacancies - occupied),
      createdAt: updated.createdAt.toISOString(),
    }
  }

  async deleteWorkshop(workshopId: string) {
    const existing = await this.prisma.eventWorkshop.findUnique({ where: { id: workshopId } })
    if (!existing) {
      throw new NotFoundException('Workshop não encontrado.')
    }
    await this.prisma.eventWorkshop.delete({ where: { id: workshopId } })
    return { success: true, message: 'Workshop removido com sucesso.' }
  }

  async switchWorkshop(ticketId: string, newWorkshopId: string) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.eventTicket.findUnique({
        where: { id: ticketId },
        include: { workshops: true },
      })
      if (!ticket) {
        throw new NotFoundException('Ingresso não encontrado.')
      }

      const newWorkshop = await tx.eventWorkshop.findUnique({
        where: { id: newWorkshopId },
      })
      if (!newWorkshop) {
        throw new NotFoundException('Novo workshop não encontrado.')
      }

      if (newWorkshop.eventId !== ticket.eventId) {
        throw new BadRequestException('O workshop pertence a outro evento.')
      }

      const occupied = await tx.eventTicketWorkshop.count({
        where: {
          workshopId: newWorkshopId,
          ticket: { status: { in: ['aguardando_pagamento', 'em_analise', 'pago'] } },
        },
      })

      if (occupied >= newWorkshop.vacancies) {
        throw new BadRequestException(`O workshop "${newWorkshop.title}" não possui mais vagas disponíveis.`)
      }

      // Remove vínculo com workshop anterior
      await tx.eventTicketWorkshop.deleteMany({
        where: { ticketId },
      })

      // Insere novo vínculo
      await tx.eventTicketWorkshop.create({
        data: {
          ticketId,
          workshopId: newWorkshopId,
        },
      })

      return { success: true, message: `Inscrição transferida com sucesso para ${newWorkshop.title}.` }
    })
  }

  // ==========================================
  // 4. SUBMISSÃO CIENTÍFICA E BANCA AVALIADORA
  // ==========================================

  async getEligibleCoauthors(eventId: string, currentUserId: string) {
    const paidTickets = await this.prisma.eventTicket.findMany({
      where: {
        eventId,
        status: 'pago',
        userId: { not: currentUserId },
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    })

    return paidTickets
      .filter((t) => t.user)
      .map((t) => ({
        id: t.user!.id,
        name: t.user!.username,
        email: t.user!.email,
      }))
  }

  async submitArticle(
    eventId: string,
    authorId: string,
    dto: CreateEventArticleDto,
    docFile: Express.Multer.File,
    pdfFile?: Express.Multer.File,
  ): Promise<EventArticleDto> {
    const event = await this.prisma.certificateEvent.findUnique({ where: { id: eventId } })
    if (!event) {
      throw new NotFoundException('Evento não encontrado.')
    }

    if (!event.acceptsArticles) {
      throw new BadRequestException('Este evento não está aceitando submissão de trabalhos científicos.')
    }

    if (event.articlesDeadline && new Date() > new Date(event.articlesDeadline)) {
      throw new BadRequestException('O prazo para submissão de trabalhos deste evento expirou.')
    }

    const docExt = extname(docFile.originalname).toLowerCase() || '.docx'
    const docName = `artigo-doc-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${docExt}`
    const docPath = join(this.articlesUploadDir, docName)
    await fs.writeFile(docPath, docFile.buffer)
    const docFileUrl = `/api/certificates/articles/file/${docName}`

    let pdfFileUrl: string | null = null
    if (pdfFile) {
      const pdfExt = extname(pdfFile.originalname).toLowerCase() || '.pdf'
      const pdfName = `artigo-pdf-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${pdfExt}`
      const pdfPath = join(this.articlesUploadDir, pdfName)
      await fs.writeFile(pdfPath, pdfFile.buffer)
      pdfFileUrl = `/api/certificates/articles/file/${pdfName}`
    }

    const article = await this.prisma.eventArticle.create({
      data: {
        eventId,
        authorId,
        title: dto.title.trim(),
        coauthors: dto.coauthors?.trim() || null,
        advisorName: dto.advisorName?.trim() || null,
        coAdvisorName: dto.coAdvisorName?.trim() || null,
        docFileUrl,
        pdfFileUrl,
        status: 'pendente',
      },
      include: {
        author: { select: { username: true, email: true } },
      },
    })

    return {
      id: article.id,
      eventId: article.eventId,
      authorId: article.authorId,
      authorName: article.author.username,
      authorEmail: article.author.email,
      title: article.title,
      coauthors: article.coauthors,
      docFileUrl: article.docFileUrl,
      pdfFileUrl: article.pdfFileUrl,
      plagiarismReport: article.plagiarismReport,
      correctionFile: article.correctionFile,
      status: article.status,
      advisorName: article.advisorName,
      coAdvisorName: article.coAdvisorName,
      currentLockId: null,
      evaluatorId: null,
      evaluatedAt: null,
      createdAt: article.createdAt.toISOString(),
    }
  }

  async listEventArticles(eventId: string, status?: string): Promise<EventArticleDto[]> {
    const articles = await this.prisma.eventArticle.findMany({
      where: {
        eventId,
        status: status ? status : undefined,
      },
      include: {
        author: { select: { username: true, email: true } },
        evaluator: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return articles.map((a) => ({
      id: a.id,
      eventId: a.eventId,
      authorId: a.authorId,
      authorName: a.author.username,
      authorEmail: a.author.email,
      title: a.title,
      coauthors: a.coauthors,
      docFileUrl: a.docFileUrl,
      pdfFileUrl: a.pdfFileUrl,
      plagiarismReport: a.plagiarismReport,
      correctionFile: a.correctionFile,
      status: a.status,
      advisorName: a.advisorName,
      coAdvisorName: a.coAdvisorName,
      currentLockId: a.currentLockId,
      evaluatorId: a.evaluatorId,
      evaluatorName: a.evaluator?.username,
      evaluatedAt: a.evaluatedAt ? a.evaluatedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
    }))
  }

  async getMyArticles(userId: string): Promise<EventArticleDto[]> {
    const articles = await this.prisma.eventArticle.findMany({
      where: { authorId: userId },
      include: {
        author: { select: { username: true, email: true } },
        evaluator: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return articles.map((a) => ({
      id: a.id,
      eventId: a.eventId,
      authorId: a.authorId,
      authorName: a.author.username,
      authorEmail: a.author.email,
      title: a.title,
      coauthors: a.coauthors,
      docFileUrl: a.docFileUrl,
      pdfFileUrl: a.pdfFileUrl,
      plagiarismReport: a.plagiarismReport,
      correctionFile: a.correctionFile,
      status: a.status,
      advisorName: a.advisorName,
      coAdvisorName: a.coAdvisorName,
      currentLockId: a.currentLockId,
      evaluatorId: a.evaluatorId,
      evaluatorName: a.evaluator?.username,
      evaluatedAt: a.evaluatedAt ? a.evaluatedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
    }))
  }

  async lockArticle(articleId: string, evaluatorId: string, lock: boolean) {
    const article = await this.prisma.eventArticle.findUnique({ where: { id: articleId } })
    if (!article) {
      throw new NotFoundException('Artigo não encontrado.')
    }

    if (lock && article.currentLockId && article.currentLockId !== evaluatorId) {
      throw new BadRequestException('Este artigo já está em análise por outro membro da banca.')
    }

    await this.prisma.eventArticle.update({
      where: { id: articleId },
      data: { currentLockId: lock ? evaluatorId : null },
    })

    return { success: true, locked: lock }
  }

  async reviewArticle(
    articleId: string,
    evaluatorId: string,
    dto: ReviewEventArticleDto,
    plagioFile?: Express.Multer.File,
    correcaoFile?: Express.Multer.File,
  ) {
    const article = await this.prisma.eventArticle.findUnique({ where: { id: articleId } })
    if (!article) {
      throw new NotFoundException('Artigo não encontrado.')
    }

    let plagiarismReport = article.plagiarismReport
    if (plagioFile) {
      const ext = extname(plagioFile.originalname).toLowerCase() || '.pdf'
      const name = `plagio-${article.id}-${Date.now()}${ext}`
      const p = join(this.articlesUploadDir, name)
      await fs.writeFile(p, plagioFile.buffer)
      plagiarismReport = `/api/certificates/articles/file/${name}`
    }

    let correctionFile = article.correctionFile
    if (correcaoFile) {
      const ext = extname(correcaoFile.originalname).toLowerCase() || '.docx'
      const name = `correcao-${article.id}-${Date.now()}${ext}`
      const p = join(this.articlesUploadDir, name)
      await fs.writeFile(p, correcaoFile.buffer)
      correctionFile = `/api/certificates/articles/file/${name}`
    }

    await this.prisma.eventArticle.update({
      where: { id: articleId },
      data: {
        status: dto.status,
        evaluatorId,
        evaluatedAt: new Date(),
        currentLockId: null,
        plagiarismReport,
        correctionFile,
      },
    })

    return { success: true, status: dto.status }
  }

  async toggleArticleEvaluator(userId: string, isEvaluator: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isArticleEvaluator: isEvaluator },
    })
    return { success: true, isArticleEvaluator: isEvaluator }
  }

  async getCommitteeMembers() {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { isArticleEvaluator: true },
          { role: { in: [AccessRole.COORDENACAO, AccessRole.ADMIN, AccessRole.MASTER, AccessRole.PROFESSOR] } },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isArticleEvaluator: true,
      },
      orderBy: { username: 'asc' },
    })
  }

  // ==========================================
  // 5. SALAS FÍSICAS E PORTARIA COM SCANNER
  // ==========================================

  async createRoom(dto: CreateEventRoomDto): Promise<EventRoomDto> {
    const room = await this.prisma.eventRoom.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        capacity: dto.capacity && dto.capacity > 0 ? Number(dto.capacity) : 0,
        responsibleIds: dto.responsibleIds || [],
      },
    })
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      capacity: room.capacity,
      isActive: room.isActive,
      responsibleIds: room.responsibleIds,
      createdAt: room.createdAt.toISOString(),
    }
  }

  async getRooms(): Promise<EventRoomDto[]> {
    const rooms = await this.prisma.eventRoom.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return rooms.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      capacity: r.capacity,
      isActive: r.isActive,
      responsibleIds: r.responsibleIds,
      createdAt: r.createdAt.toISOString(),
    }))
  }

  async deleteRoom(roomId: string) {
    const existing = await this.prisma.eventRoom.findUnique({ where: { id: roomId } })
    if (!existing) {
      throw new NotFoundException('Sala não encontrada.')
    }
    await this.prisma.eventRoom.delete({ where: { id: roomId } })
    return { success: true, message: 'Sala removida com sucesso.' }
  }

  async scanAttendance(
    dto: ScanAttendanceDto,
    operatorUserId: string,
    isOperatorAdmin: boolean,
  ): Promise<ScanAttendanceResultDto> {
    const room = await this.prisma.eventRoom.findUnique({ where: { id: dto.roomId } })
    if (!room) {
      throw new NotFoundException('Sala não encontrada.')
    }

    // Valida permissão do operador
    if (!isOperatorAdmin && !room.responsibleIds.includes(operatorUserId)) {
      throw new ForbiddenException('Você não possui autorização para operar o leitor nesta sala.')
    }

    const cleanCode = dto.code.trim().toUpperCase()

    // Localiza usuário por ID, UniqueCode do Ticket ou RA/CPF
    let targetUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: cleanCode.length === 36 ? cleanCode : undefined },
          { username: cleanCode },
        ],
      },
    })

    let matchedTicket: any = null

    if (!targetUser) {
      matchedTicket = await this.prisma.eventTicket.findFirst({
        where: { uniqueCode: cleanCode, eventId: dto.eventId },
        include: { user: true },
      })
      if (matchedTicket?.user) {
        targetUser = matchedTicket.user
      }
    }

    if (!targetUser) {
      const part = await this.prisma.certificateParticipant.findFirst({
        where: {
          eventId: dto.eventId,
          OR: [{ studentRa: cleanCode }, { studentCpf: cleanCode }],
        },
        include: { user: true },
      })
      if (part?.user) {
        targetUser = part.user
      }
    }

    if (!targetUser) {
      return {
        status: 'erro',
        message: 'Credencial não identificada no sistema para este evento.',
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        roomName: room.name,
      }
    }

    // Regra matemática de paridade para Entrada / Saída
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const countToday = await this.prisma.eventAttendance.count({
      where: {
        userId: targetUser.id,
        roomId: dto.roomId,
        checkinDate: { gte: todayStart, lte: todayEnd },
      },
    })

    const isEntry = countToday % 2 === 0
    const checkinType = isEntry ? 'entrada' : 'saida'

    await this.prisma.$transaction(async (tx) => {
      await tx.eventAttendance.create({
        data: {
          eventId: dto.eventId,
          userId: targetUser.id,
          roomId: dto.roomId,
          checkinType,
          operatorId: operatorUserId,
        },
      })

      // Se for entrada, marca o ingresso como usado (destravando o certificado)
      if (isEntry) {
        await tx.eventTicket.updateMany({
          where: {
            eventId: dto.eventId,
            userId: targetUser.id,
            status: 'pago',
          },
          data: {
            isUsed: true,
            usedAt: new Date(),
          },
        })

        await tx.certificateParticipant.updateMany({
          where: {
            eventId: dto.eventId,
            userId: targetUser.id,
          },
          data: {
            hasAttendance: true,
            attendanceCount: { increment: 1 },
          },
        })
      }
    })

    return {
      status: checkinType,
      message: isEntry ? 'ENTRADA CONFIRMADA' : 'SAÍDA REGISTRADA',
      studentName: targetUser.username,
      studentProfile: targetUser.role,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      totalScansToday: countToday + 1,
      roomName: room.name,
    }
  }

  async getEventAttendances(eventId: string) {
    const attendances = await this.prisma.eventAttendance.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, username: true, role: true } },
        room: { select: { id: true, name: true } },
      },
      orderBy: { checkinDate: 'desc' },
      take: 200,
    })

    const operatorIds = attendances.map((a) => a.operatorId).filter((id): id is string => Boolean(id))
    const operators = operatorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: operatorIds } },
          select: { id: true, username: true },
        })
      : []
    const operatorMap = new Map(operators.map((o) => [o.id, o.username]))

    return attendances.map((att) => ({
      id: att.id,
      eventId: att.eventId,
      userId: att.userId,
      userName: att.user.username,
      userRole: att.user.role,
      roomId: att.roomId,
      roomName: att.room?.name || 'Geral',
      operatorId: att.operatorId,
      operatorName: (att.operatorId && operatorMap.get(att.operatorId)) || 'Sistema',
      checkinType: att.checkinType,
      checkinDate: att.checkinDate.toISOString(),
    }))
  }

  // ==========================================
  // 6. FINANÇAS, DESPESAS E PATROCINADORES
  // ==========================================

  async getFinancialSummary(eventId: string): Promise<FinancialSummaryDto> {
    const event = await this.prisma.certificateEvent.findUnique({
      where: { id: eventId },
      include: {
        tickets: { select: { amountPaid: true, status: true } },
        expenses: {
          orderBy: { expenseDate: 'desc' },
        },
        sponsors: {
          include: {
            movements: { select: { amount: true, nature: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!event) {
      throw new NotFoundException('Evento não encontrado.')
    }

    const paidTickets = event.tickets.filter((t) => t.status === 'pago')
    const ticketsRevenue = paidTickets.reduce((acc, t) => acc + Number(t.amountPaid), 0)

    const expensesTotal = event.expenses.reduce((acc, e) => acc + Number(e.amount), 0)

    let sponsorsTotal = 0
    const sponsorsList: EventSponsorDto[] = event.sponsors.map((sp) => {
      const spSum = sp.movements.reduce((acc, m) => acc + Number(m.amount), 0)
      sponsorsTotal += spSum
      return {
        id: sp.id,
        eventId: sp.eventId,
        name: sp.name,
        contact: sp.contact,
        movementsCount: sp.movements.length,
        totalAmount: spSum,
        createdAt: sp.createdAt.toISOString(),
      }
    })

    const expensesList: EventExpenseDto[] = event.expenses.map((e) => ({
      id: e.id,
      eventId: e.eventId,
      groupId: e.groupId,
      description: e.description,
      category: e.category,
      amount: Number(e.amount),
      receiptUrl: e.receiptUrl,
      expenseDate: e.expenseDate.toISOString(),
      createdAt: e.createdAt.toISOString(),
    }))

    const netBalance = ticketsRevenue + sponsorsTotal - expensesTotal

    return {
      eventId,
      eventTitle: event.title,
      ticketsRevenue,
      ticketsCount: event.tickets.length,
      paidTicketsCount: paidTickets.length,
      sponsorsTotal,
      expensesTotal,
      netBalance,
      expenses: expensesList,
      sponsors: sponsorsList,
    }
  }

  async addExpense(
    eventId: string,
    dto: CreateEventExpenseDto,
    file?: Express.Multer.File,
  ): Promise<EventExpenseDto> {
    let receiptUrl: string | null = null
    if (file) {
      const ext = extname(file.originalname).toLowerCase() || '.pdf'
      const name = `despesa-${eventId}-${Date.now()}${ext}`
      const p = join(this.expensesUploadDir, name)
      await fs.writeFile(p, file.buffer)
      receiptUrl = `/api/certificates/expenses/receipt/${name}`
    }

    const created = await this.prisma.eventExpense.create({
      data: {
        eventId,
        description: dto.description.trim(),
        category: dto.category.trim(),
        amount: Number(dto.amount),
        expenseDate: new Date(dto.expenseDate),
        receiptUrl,
        groupId: dto.groupId || null,
      },
    })

    return {
      id: created.id,
      eventId: created.eventId,
      groupId: created.groupId,
      description: created.description,
      category: created.category,
      amount: Number(created.amount),
      receiptUrl: created.receiptUrl,
      expenseDate: created.expenseDate.toISOString(),
      createdAt: created.createdAt.toISOString(),
    }
  }

  async createFinancialGroup(eventId: string, name: string) {
    if (!name?.trim()) {
      throw new BadRequestException('Nome do grupo de despesas é obrigatório.')
    }
    const group = await this.prisma.eventFinancialGroup.create({
      data: {
        title: name.trim(),
        eventIds: [eventId],
      },
    })
    return { id: group.id, eventIds: group.eventIds, name: group.title, createdAt: group.createdAt.toISOString() }
  }

  async getFinancialGroups(eventId: string) {
    const groups = await this.prisma.eventFinancialGroup.findMany({
      where: { eventIds: { has: eventId } },
      orderBy: { title: 'asc' },
    })
    return groups.map((g) => ({
      id: g.id,
      eventIds: g.eventIds,
      name: g.title,
      createdAt: g.createdAt.toISOString(),
    }))
  }

  async deleteExpense(expenseId: string) {
    const existing = await this.prisma.eventExpense.findUnique({ where: { id: expenseId } })
    if (!existing) {
      throw new NotFoundException('Despesa não encontrada.')
    }
    if (existing.receiptUrl) {
      const fileName = basename(existing.receiptUrl)
      const p = join(this.expensesUploadDir, fileName)
      await fs.unlink(p).catch(() => {})
    }
    await this.prisma.eventExpense.delete({ where: { id: expenseId } })
    return { success: true, message: 'Despesa removida com sucesso.' }
  }

  async addSponsor(eventId: string, dto: CreateEventSponsorDto): Promise<EventSponsorDto> {
    const sp = await this.prisma.eventSponsor.create({
      data: {
        eventId,
        name: dto.name.trim(),
        contact: dto.contact?.trim() || null,
      },
    })

    return {
      id: sp.id,
      eventId: sp.eventId,
      name: sp.name,
      contact: sp.contact,
      movementsCount: 0,
      totalAmount: 0,
      createdAt: sp.createdAt.toISOString(),
    }
  }

  async addSponsorMovement(sponsorId: string, dto: CreateSponsorMovementDto) {
    const mv = await this.prisma.eventSponsorMovement.create({
      data: {
        sponsorId,
        type: dto.type || 'entrada',
        nature: dto.nature.trim(),
        description: dto.description.trim(),
        amount: dto.amount ? Number(dto.amount) : 0,
        quantity: dto.quantity ? Number(dto.quantity) : 1,
      },
    })
    return mv
  }

  // ==========================================
  // 7. PESQUISA DE SATISFAÇÃO (FEEDBACK)
  // ==========================================

  async submitFeedback(
    eventId: string,
    userId: string,
    dto: CreateEventFeedbackDto,
  ): Promise<EventFeedbackDto> {
    const rating = Math.min(5, Math.max(1, Math.round(dto.rating)))
    const fb = await this.prisma.eventFeedback.create({
      data: {
        eventId,
        userId,
        rating,
        comment: dto.comment?.trim() || null,
      },
      include: {
        user: { select: { username: true } },
      },
    })

    return {
      id: fb.id,
      eventId: fb.eventId,
      userId: fb.userId,
      userName: fb.user.username,
      rating: fb.rating,
      comment: fb.comment,
      createdAt: fb.createdAt.toISOString(),
    }
  }

  async getEventFeedbacks(eventId: string): Promise<EventFeedbackDto[]> {
    const fbs = await this.prisma.eventFeedback.findMany({
      where: { eventId },
      include: {
        user: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return fbs.map((fb) => ({
      id: fb.id,
      eventId: fb.eventId,
      userId: fb.userId,
      userName: fb.user.username,
      rating: fb.rating,
      comment: fb.comment,
      createdAt: fb.createdAt.toISOString(),
    }))
  }

  // ==========================================
  // 8. SERVIÇO DE ARQUIVOS ESTÁTICOS
  // ==========================================

  getFilePath(folder: 'tickets' | 'articles' | 'expenses', fileName: string): string {
    const safeName = basename(fileName)
    const baseDir =
      folder === 'tickets'
        ? this.ticketsUploadDir
        : folder === 'articles'
        ? this.articlesUploadDir
        : this.expensesUploadDir
    const filePath = join(baseDir, safeName)
    if (!existsSync(filePath)) {
      throw new NotFoundException('Arquivo não encontrado.')
    }
    return filePath
  }

  // ==========================================
  // 9. RELATÓRIOS GERENCIAIS E EXPORTAÇÃO EXCEL (FASE 4)
  // ==========================================

  async exportReport(eventId: string, reportType: string): Promise<Buffer> {
    const event = await this.prisma.certificateEvent.findUnique({
      where: { id: eventId },
    })
    if (!event) {
      throw new NotFoundException('Evento não encontrado.')
    }

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'UniCore • Gestão de Eventos FAIP'
    workbook.created = new Date()

    const normalized = reportType.trim().toLowerCase()

    if (normalized === 'vendas' || normalized === 'financeiro') {
      await this.generateSalesReport(workbook, eventId, event.title)
    } else if (normalized === 'salas' || normalized === 'ocupacao') {
      await this.generateRoomsReport(workbook, eventId, event.title)
    } else if (normalized === 'artigos') {
      await this.generateArticlesReport(workbook, eventId, event.title)
    } else if (normalized === 'demografico') {
      await this.generateDemographicReport(workbook, eventId, event.title)
    } else if (normalized === 'cursos') {
      await this.generateCoursesReport(workbook, eventId, event.title)
    } else if (normalized === 'workshops') {
      await this.generateWorkshopsReport(workbook, eventId, event.title)
    } else {
      throw new BadRequestException(
        `Tipo de relatório inválido: "${reportType}". Opções: vendas, salas, artigos, demografico, cursos, workshops.`,
      )
    }

    const uint8Array = await workbook.xlsx.writeBuffer()
    return Buffer.from(uint8Array)
  }

  private async generateSalesReport(workbook: ExcelJS.Workbook, eventId: string, eventTitle: string) {
    const sheet = workbook.addWorksheet('Ingressos e Vendas')
    const tickets = await this.prisma.eventTicket.findMany({
      where: { eventId },
      include: {
        user: true,
        workshops: { include: { workshop: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    sheet.columns = [
      { header: 'CÓDIGO ÚNICO', key: 'uniqueCode', width: 16 },
      { header: 'PARTICIPANTE', key: 'userName', width: 28 },
      { header: 'E-MAIL', key: 'email', width: 30 },
      { header: 'PERFIL', key: 'role', width: 14 },
      { header: 'STATUS', key: 'status', width: 20 },
      { header: 'VALOR PAGO (R$)', key: 'amount', width: 16 },
      { header: 'VENCIMENTO', key: 'dueDate', width: 16 },
      { header: 'MONITOR', key: 'isMonitor', width: 12 },
      { header: 'CHECK-IN', key: 'isUsed', width: 12 },
      { header: 'OFICINAS', key: 'workshops', width: 32 },
      { header: 'DATA DA INSCRIÇÃO', key: 'createdAt', width: 20 },
    ]

    for (const t of tickets) {
      sheet.addRow({
        uniqueCode: t.uniqueCode,
        userName: t.user?.username || 'N/A',
        email: t.user?.email || 'N/A',
        role: t.user?.role || 'Visitante',
        status: t.status,
        amount: Number(t.amountPaid),
        dueDate: t.dueDate ? t.dueDate.toLocaleDateString('pt-BR') : '-',
        isMonitor: t.isMonitor ? 'Sim' : 'Não',
        isUsed: t.isUsed ? 'Sim' : 'Não',
        workshops: t.workshops.map((w) => w.workshop.title).join('; ') || 'Nenhuma',
        createdAt: t.createdAt.toLocaleDateString('pt-BR'),
      })
    }

    this.styleExcelHeader(sheet)
  }

  private async generateRoomsReport(workbook: ExcelJS.Workbook, eventId: string, eventTitle: string) {
    const sheet = workbook.addWorksheet('Ocupação de Salas')
    const attendances = await this.prisma.eventAttendance.findMany({
      where: { eventId },
      include: {
        user: true,
        room: true,
      },
      orderBy: { checkinDate: 'desc' },
    })

    sheet.columns = [
      { header: 'DATA/HORA', key: 'checkinDate', width: 20 },
      { header: 'TIPO DE FLUXO', key: 'checkinType', width: 16 },
      { header: 'PARTICIPANTE', key: 'userName', width: 28 },
      { header: 'RA / USUÁRIO', key: 'ra', width: 18 },
      { header: 'LOCAL / SALA', key: 'roomName', width: 24 },
      { header: 'HASH VALIDAÇÃO', key: 'validationHash', width: 22 },
    ]

    for (const a of attendances) {
      sheet.addRow({
        checkinDate: a.checkinDate.toLocaleString('pt-BR'),
        checkinType: a.checkinType === 'entrada' ? 'ENTRADA' : 'SAÍDA',
        userName: a.user?.username || 'N/A',
        ra: a.user?.username || 'N/A',
        roomName: a.room?.name || 'Portaria Geral',
        validationHash: a.validationHash || '-',
      })
    }

    this.styleExcelHeader(sheet)
  }

  private async generateArticlesReport(workbook: ExcelJS.Workbook, eventId: string, eventTitle: string) {
    const sheet = workbook.addWorksheet('Artigos Científicos')
    const articles = await this.prisma.eventArticle.findMany({
      where: { eventId },
      include: {
        author: true,
        evaluator: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    sheet.columns = [
      { header: 'TÍTULO DO TRABALHO', key: 'title', width: 36 },
      { header: 'AUTOR PRINCIPAL', key: 'author', width: 26 },
      { header: 'COAUTORES', key: 'coauthors', width: 30 },
      { header: 'ORIENTADOR', key: 'advisor', width: 24 },
      { header: 'COORIENTADOR', key: 'coadvisor', width: 24 },
      { header: 'STATUS', key: 'status', width: 16 },
      { header: 'DATA AVALIAÇÃO', key: 'evaluatedAt', width: 18 },
      { header: 'AVALIADOR', key: 'evaluator', width: 24 },
      { header: 'DATA SUBMISSÃO', key: 'createdAt', width: 18 },
    ]

    for (const a of articles) {
      sheet.addRow({
        title: a.title,
        author: a.author?.username || 'N/A',
        coauthors: a.coauthors || '-',
        advisor: a.advisorName || '-',
        coadvisor: a.coAdvisorName || '-',
        status: a.status.toUpperCase(),
        evaluatedAt: a.evaluatedAt ? a.evaluatedAt.toLocaleDateString('pt-BR') : 'Pendente',
        evaluator: a.evaluator?.username || 'Pendente',
        createdAt: a.createdAt.toLocaleDateString('pt-BR'),
      })
    }

    this.styleExcelHeader(sheet)
  }

  private async generateDemographicReport(workbook: ExcelJS.Workbook, eventId: string, eventTitle: string) {
    const sheet = workbook.addWorksheet('Demografia do Evento')
    const tickets = await this.prisma.eventTicket.findMany({
      where: { eventId },
      include: { user: true },
    })

    const total = tickets.length
    let alunosCount = 0
    let professoresCount = 0
    let visitantesCount = 0

    let alunosPagos = 0
    let professoresPagos = 0
    let visitantesPagos = 0

    for (const t of tickets) {
      const role = (t.user?.role || '').toLowerCase()
      const isPaid = t.status === 'pago'
      if (role.includes('prof')) {
        professoresCount++
        if (isPaid) professoresPagos++
      } else if (role.includes('alun')) {
        alunosCount++
        if (isPaid) alunosPagos++
      } else {
        visitantesCount++
        if (isPaid) visitantesPagos++
      }
    }

    sheet.columns = [
      { header: 'CATEGORIA DE PÚBLICO', key: 'category', width: 28 },
      { header: 'TOTAL DE INSCRITOS', key: 'total', width: 22 },
      { header: 'TOTAL PAGOS', key: 'paid', width: 18 },
      { header: 'PROPORÇÃO (%)', key: 'ratio', width: 18 },
    ]

    const addRow = (cat: string, tot: number, paid: number) => {
      const ratio = total > 0 ? ((tot / total) * 100).toFixed(1) + '%' : '0%'
      sheet.addRow({ category: cat, total: tot, paid, ratio })
    }

    addRow('Alunos Graduação / Pós', alunosCount, alunosPagos)
    addRow('Professores e Coordenadores', professoresCount, professoresPagos)
    addRow('Público Externo / Visitantes', visitantesCount, visitantesPagos)
    addRow('TOTAL CONSOLIDADO', total, alunosPagos + professoresPagos + visitantesPagos)

    this.styleExcelHeader(sheet)
  }

  private async generateCoursesReport(workbook: ExcelJS.Workbook, eventId: string, eventTitle: string) {
    const sheet = workbook.addWorksheet('Adesão por Curso')
    const participants = await this.prisma.certificateParticipant.findMany({
      where: { eventId },
      include: { event: true },
    })

    const map = new Map<string, { total: number; confirmed: number }>()
    for (const p of participants) {
      const course = p.event?.courseName || 'Geral / Não Especificado'
      const existing = map.get(course) || { total: 0, confirmed: 0 }
      existing.total++
      if (p.hasAttendance) existing.confirmed++
      map.set(course, existing)
    }

    sheet.columns = [
      { header: 'CURSO DE GRADUAÇÃO', key: 'course', width: 36 },
      { header: 'TOTAL DE INSCRITOS', key: 'total', width: 22 },
      { header: 'COM PRESENÇA CONFIRMADA', key: 'confirmed', width: 28 },
      { header: 'TAXA DE PARTICIPAÇÃO', key: 'rate', width: 24 },
    ]

    for (const [course, data] of map.entries()) {
      const rate = data.total > 0 ? ((data.confirmed / data.total) * 100).toFixed(1) + '%' : '0%'
      sheet.addRow({
        course,
        total: data.total,
        confirmed: data.confirmed,
        rate,
      })
    }

    this.styleExcelHeader(sheet)
  }

  private async generateWorkshopsReport(workbook: ExcelJS.Workbook, eventId: string, eventTitle: string) {
    const sheet = workbook.addWorksheet('Lotação de Workshops')
    const workshops = await this.prisma.eventWorkshop.findMany({
      where: { eventId },
      include: {
        tickets: {
          include: { ticket: { include: { user: true } } },
        },
      },
    })

    sheet.columns = [
      { header: 'OFICINA / MINICURSO', key: 'title', width: 34 },
      { header: 'CURSO DE REFERÊNCIA', key: 'course', width: 26 },
      { header: 'VAGAS TOTAIS', key: 'vacancies', width: 16 },
      { header: 'INSCRITOS', key: 'occupied', width: 16 },
      { header: 'VAGAS RESTANTES', key: 'remaining', width: 18 },
      { header: 'OCUPAÇÃO (%)', key: 'occupancy', width: 16 },
    ]

    for (const w of workshops) {
      const occupied = w.tickets.filter(
        (tw: any) => tw.ticket && ['aguardando_pagamento', 'em_analise', 'pago'].includes(tw.ticket.status),
      ).length
      const remaining = Math.max(0, w.vacancies - occupied)
      const occupancy = w.vacancies > 0 ? ((occupied / w.vacancies) * 100).toFixed(1) + '%' : '0%'

      sheet.addRow({
        title: w.title,
        course: w.courseName || '-',
        vacancies: w.vacancies,
        occupied,
        remaining,
        occupancy,
      })
    }

    this.styleExcelHeader(sheet)
  }

  private styleExcelHeader(sheet: ExcelJS.Worksheet) {
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.height = 24
  }
}
