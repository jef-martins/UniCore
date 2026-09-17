import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise'
import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import { extname, join } from 'node:path'
import { PrismaService } from '../database/prisma.service'
import type {
  CertificateCourseDto,
  CertificateDocumentDto,
  CertificateEventDto,
  CertificateInscriptionItemDto,
  CertificatesFilterDto,
  CertificateYearDto,
  CreateCustomEventDto,
  CreateCustomParticipantDto,
  CustomEventSummaryDto,
  CustomParticipantItemDto,
  EventCatalogItemDto,
  UpdateCustomEventDto,
  UpdateParticipantStatusDto,
} from './dto/certificates.dto'

interface ExternalDatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

interface YearRow extends RowDataPacket {
  ano: number
}

interface CourseRow extends RowDataPacket {
  id: string
  name: string
}

interface EventRow extends RowDataPacket {
  id: string
  title: string
  workload: number | null
  classId: string | null
}

interface InscriptionRow extends RowDataPacket {
  id: string
  studentRa: string
  studentName: string
  studentCpf: string | null
  eventId: string
  eventTitle: string
  workloadHours: number | null
  startDate: Date | string | null
  endDate: Date | string | null
  paymentDate: Date | string | null
  attendanceCount: number | string | null
  courseName?: string | null
}

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name)
  private readonly unimestreConfig: ExternalDatabaseConfig
  private unimestrePool: Pool | null = null

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.unimestreConfig = config.getOrThrow<ExternalDatabaseConfig>('unimestre')
  }

  private getUnimestrePool(): Pool {
    if (!this.unimestrePool) {
      this.unimestrePool = createPool({
        host: this.unimestreConfig.host,
        port: this.unimestreConfig.port,
        database: this.unimestreConfig.database,
        user: this.unimestreConfig.user,
        password: this.unimestreConfig.password,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 8000,
      })
    }
    return this.unimestrePool
  }

  private async query<T>(sql: string, params: any[] = []): Promise<T> {
    try {
      const [rows] = await this.getUnimestrePool().execute(sql, params)
      return rows as T
    } catch (error) {
      this.logger.error(`Erro ao executar consulta no Unimestre: ${(error as Error).message}`, sql)
      throw error
    }
  }

  async getYears(): Promise<CertificateYearDto[]> {
    try {
      const rows = await this.query<YearRow[]>(`
        SELECT DISTINCT YEAR(dt_inicial) AS ano 
        FROM cap_oferta 
        WHERE dt_inicial IS NOT NULL 
        ORDER BY ano DESC
      `)
      if (rows.length) {
        return rows.filter((r) => r.ano > 1900 && r.ano < 2100).map((r) => ({ year: Number(r.ano) }))
      }
    } catch (err) {
      this.logger.warn(`Não foi possível carregar anos do Unimestre: ${(err as Error).message}`)
    }

    const currentYear = new Date().getFullYear()
    return [
      { year: currentYear },
      { year: currentYear - 1 },
      { year: currentYear - 2 },
      { year: currentYear - 3 },
    ]
  }

  async getCourses(): Promise<CertificateCourseDto[]> {
    try {
      const rows = await this.query<CourseRow[]>(`
        SELECT CD_CURSO AS id, TRIM(DS_CURSO) AS name 
        FROM cursos_mestre 
        WHERE DS_CURSO IS NOT NULL AND TRIM(DS_CURSO) <> ''
        ORDER BY TRIM(DS_CURSO) ASC
      `)
      return rows.map((r) => ({ id: String(r.id), name: r.name }))
    } catch (err) {
      this.logger.warn(`Não foi possível carregar cursos do Unimestre: ${(err as Error).message}`)
      return []
    }
  }

  async getEvents(year?: number, courseId?: string): Promise<CertificateEventDto[]> {
    const selectedYear = year || new Date().getFullYear()
    try {
      let sql = `
        SELECT o.cd_oferta AS id, TRIM(o.ds_oferta) AS title, o.nr_conceito_mec AS workload, o.id_turma AS classId
        FROM cap_oferta o
        LEFT JOIN turmas t ON o.id_turma = t.id_turma
        WHERE YEAR(o.dt_inicial) = ?
      `
      const params: any[] = [selectedYear]

      if (courseId?.trim()) {
        sql += ` AND t.curso = ?`
        params.push(courseId.trim())
      }

      sql += ` ORDER BY TRIM(o.ds_oferta) ASC`

      const rows = await this.query<EventRow[]>(sql, params)
      return rows.map((r) => ({
        id: String(r.id),
        title: r.title,
        workload: r.workload ? Number(r.workload) : null,
        classId: r.classId ? String(r.classId) : null,
      }))
    } catch (err) {
      this.logger.warn(`Não foi possível carregar eventos do Unimestre: ${(err as Error).message}`)
      return []
    }
  }

  async searchInscriptions(filters: CertificatesFilterDto): Promise<CertificateInscriptionItemDto[]> {
    const year = filters.ano ? Number(filters.ano) : (await this.getYears())[0]?.year || new Date().getFullYear()
    const course = filters.curso?.trim() || ''
    const event = filters.evento?.trim() || ''
    const search = filters.busca?.trim() || ''

    try {
      let sql = `
        SELECT 
          i.cd_inscricao AS id,
          i.cd_pessoa AS studentRa,
          p.nm_pessoa AS studentName,
          p.ds_cpf AS studentCpf,
          o.cd_oferta AS eventId,
          o.ds_oferta AS eventTitle,
          o.nr_conceito_mec AS workloadHours,
          o.dt_inicial AS startDate,
          o.dt_final AS endDate,
          (SELECT MAX(m.datapagamento) 
             FROM mensalidades m 
            WHERE m.codigoaluno = i.cd_pessoa 
              AND m.turma = o.id_turma 
              AND m.valorpago > 0) AS paymentDate,
          (SELECT COUNT(*) 
             FROM diario_aulas_alunos daa 
            WHERE daa.cd_pessoa = i.cd_pessoa 
              AND daa.cd_turma = o.id_turma 
              AND daa.ds_freq != 'F') AS attendanceCount
        FROM cap_inscricao i
        INNER JOIN PESSOAS p ON i.cd_pessoa = p.cd_pessoa
        INNER JOIN cap_oferta o ON i.cd_oferta = o.cd_oferta
        LEFT JOIN turmas t ON o.id_turma = t.id_turma
        WHERE YEAR(o.dt_inicial) = ?
      `
      const params: any[] = [year]

      if (course) {
        sql += ` AND t.curso = ?`
        params.push(course)
      }

      if (event) {
        sql += ` AND o.cd_oferta = ?`
        params.push(event)
      }

      if (search) {
        sql += ` AND (p.nm_pessoa LIKE ? OR i.cd_pessoa = ?)`
        params.push(`%${search}%`, search)
      }

      sql += ` ORDER BY p.nm_pessoa ASC LIMIT 300`

      const rows = await this.query<InscriptionRow[]>(sql, params)

      // Consulta no Prisma local se já houve emissões para essas inscrições
      const inscriptionIds = rows.map((r) => String(r.id))
      const emissionLogs = inscriptionIds.length
        ? await this.prisma.certificateEmissionLog.findMany({
            where: { inscricaoId: { in: inscriptionIds } },
            select: { inscricaoId: true, issuedAt: true },
            orderBy: { issuedAt: 'desc' },
          })
        : []

      const emissionsMap = new Map<string, { count: number; lastAt: Date }>()
      for (const log of emissionLogs) {
        const existing = emissionsMap.get(log.inscricaoId)
        if (existing) {
          existing.count++
        } else {
          emissionsMap.set(log.inscricaoId, { count: 1, lastAt: log.issuedAt })
        }
      }

      return rows.map((r) => {
        const isPaid = Boolean(r.paymentDate)
        const attendance = r.attendanceCount ? Number(r.attendanceCount) : 0
        const hasAttendance = attendance > 0
        const isEligible = isPaid && hasAttendance

        let blockedReason: string | undefined
        if (!isEligible) {
          if (!isPaid && !hasAttendance) {
            blockedReason = 'Taxa de inscrição pendente e sem registro de presença'
          } else if (!isPaid) {
            blockedReason = 'Taxa de inscrição pendente de pagamento'
          } else {
            blockedReason = 'Sem presença confirmada no diário de aulas'
          }
        }

        const emission = emissionsMap.get(String(r.id))

        return {
          id: String(r.id),
          studentRa: String(r.studentRa),
          studentName: r.studentName ? r.studentName.trim() : '',
          eventId: String(r.eventId),
          eventTitle: r.eventTitle ? r.eventTitle.trim() : '',
          workloadHours: r.workloadHours ? Number(r.workloadHours) : null,
          startDate: r.startDate ? new Date(r.startDate).toISOString() : null,
          endDate: r.endDate ? new Date(r.endDate).toISOString() : null,
          isPaid,
          paymentDate: r.paymentDate ? new Date(r.paymentDate).toISOString() : null,
          attendanceCount: attendance,
          hasAttendance,
          isEligible,
          blockedReason,
          emittedCount: emission ? emission.count : 0,
          lastEmittedAt: emission ? emission.lastAt.toISOString() : null,
        }
      })
    } catch (err) {
      this.logger.warn(`Erro ao consultar inscrições de certificados: ${(err as Error).message}`)
      return []
    }
  }

  async getCertificateDocument(
    inscricaoId: string,
    currentUserId?: string,
  ): Promise<CertificateDocumentDto> {
    const cleanId = inscricaoId.trim()
    if (!cleanId) {
      throw new BadRequestException('ID de inscrição inválido.')
    }

    const rows = await this.query<InscriptionRow[]>(
      `
      SELECT 
        i.cd_inscricao AS id,
        i.cd_pessoa AS studentRa,
        p.nm_pessoa AS studentName,
        p.ds_cpf AS studentCpf,
        o.cd_oferta AS eventId,
        o.ds_oferta AS eventTitle,
        o.nr_conceito_mec AS workloadHours,
        o.dt_inicial AS startDate,
        o.dt_final AS endDate,
        c.DS_CURSO AS courseName,
        (SELECT MAX(m.datapagamento) 
           FROM mensalidades m 
          WHERE m.codigoaluno = i.cd_pessoa 
            AND m.turma = o.id_turma 
            AND m.valorpago > 0) AS paymentDate,
        (SELECT COUNT(*) 
           FROM diario_aulas_alunos daa 
          WHERE daa.cd_pessoa = i.cd_pessoa 
            AND daa.cd_turma = o.id_turma 
            AND daa.ds_freq != 'F') AS attendanceCount
      FROM cap_inscricao i
      INNER JOIN PESSOAS p ON i.cd_pessoa = p.cd_pessoa
      INNER JOIN cap_oferta o ON i.cd_oferta = o.cd_oferta
      LEFT JOIN turmas t ON o.id_turma = t.id_turma
      LEFT JOIN cursos_mestre c ON t.curso = c.CD_CURSO
      WHERE i.cd_inscricao = ?
      LIMIT 1
    `,
      [cleanId],
    )

    if (!rows.length) {
      throw new NotFoundException(`Inscrição #${cleanId} não encontrada.`)
    }

    const row = rows[0]
    const isPaid = Boolean(row.paymentDate)
    const attendance = row.attendanceCount ? Number(row.attendanceCount) : 0
    const hasAttendance = attendance > 0

    if (!isPaid || !hasAttendance) {
      const details = !isPaid && !hasAttendance
        ? 'taxa não quitada e ausência de presença registrada'
        : !isPaid
        ? 'taxa do evento não quitada'
        : 'sem registro de presença nas aulas'
      throw new BadRequestException(
        `O aluno não está apto a emitir este certificado (${details}).`,
      )
    }

    const workload = row.workloadHours ? Number(row.workloadHours) : 20
    const studentRa = String(row.studentRa)
    const studentName = row.studentName ? row.studentName.trim() : ''
    const eventTitle = row.eventTitle ? row.eventTitle.trim() : 'Evento Acadêmico'

    // Verifica se já existe um log com código de verificação para esta inscrição
    let existingLog = await this.prisma.certificateEmissionLog.findFirst({
      where: { inscricaoId: cleanId },
      orderBy: { issuedAt: 'desc' },
      include: { issuedByUser: { select: { username: true } } },
    })

    let verificationCode: string
    if (existingLog) {
      verificationCode = existingLog.verificationCode
    } else {
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
      verificationCode = `FAIP-CERT-${cleanId}-${randomSuffix}`

      existingLog = await this.prisma.certificateEmissionLog.create({
        data: {
          inscricaoId: cleanId,
          studentRa,
          studentName,
          eventTitle,
          workloadHours: workload,
          verificationCode,
          issuedByUserId: currentUserId || null,
        },
        include: { issuedByUser: { select: { username: true } } },
      })
    }

    return {
      inscricaoId: cleanId,
      studentRa,
      studentName,
      studentCpf: row.studentCpf ? String(row.studentCpf) : null,
      eventId: String(row.eventId),
      eventTitle,
      workloadHours: workload,
      startDate: row.startDate ? new Date(row.startDate).toISOString() : null,
      endDate: row.endDate ? new Date(row.endDate).toISOString() : null,
      courseName: row.courseName ? String(row.courseName).trim() : null,
      issuedAt: existingLog.issuedAt.toISOString(),
      verificationCode,
      institutionName: 'FAIP - Faculdade de Ensino Superior do Interior Paulista',
      issuedByName: existingLog.issuedByUser?.username || 'Secretaria Geral',
    }
  }

  async getLogs(inscricaoId?: string) {
    return this.prisma.certificateEmissionLog.findMany({
      where: inscricaoId ? { inscricaoId } : undefined,
      include: { issuedByUser: { select: { id: true, username: true, email: true } } },
      orderBy: { issuedAt: 'desc' },
      take: 100,
    })
  }

  // ==========================================
  // GESTÃO NATIVA DE EVENTOS E PARTICIPANTES (UniCore)
  // ==========================================

  async createCustomEvent(dto: CreateCustomEventDto, currentUserId?: string): Promise<CustomEventSummaryDto> {
    if (!dto.title?.trim()) {
      throw new BadRequestException('O título do evento é obrigatório.')
    }
    const workload = dto.workloadHours ? Number(dto.workloadHours) : 20
    if (workload <= 0) {
      throw new BadRequestException('A carga horária deve ser maior que zero.')
    }

    const event = await this.prisma.certificateEvent.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        workloadHours: workload,
        speaker: dto.speaker?.trim() || null,
        courseName: dto.courseName?.trim() || null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        location: dto.location?.trim() || null,
        logoUrl: dto.logoUrl?.trim() || null,
        certificateTemplateUrl: dto.certificateTemplateUrl?.trim() || null,
        templateStyle: dto.templateStyle || undefined,
        createdById: currentUserId || null,
      },
      include: {
        participants: { select: { isPaid: true, hasAttendance: true } },
      },
    })

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      workloadHours: event.workloadHours,
      speaker: event.speaker,
      courseName: event.courseName,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate ? event.endDate.toISOString() : null,
      location: event.location,
      isActive: event.isActive,
      logoUrl: event.logoUrl,
      certificateTemplateUrl: event.certificateTemplateUrl,
      templateStyle: event.templateStyle,
      totalParticipants: 0,
      paidParticipants: 0,
      eligibleParticipants: 0,
      createdAt: event.createdAt.toISOString(),
    }
  }

  async listCustomEvents(search?: string): Promise<CustomEventSummaryDto[]> {
    const events = await this.prisma.certificateEvent.findMany({
      where: search?.trim()
        ? {
            OR: [
              { title: { contains: search.trim(), mode: 'insensitive' } },
              { speaker: { contains: search.trim(), mode: 'insensitive' } },
              { courseName: { contains: search.trim(), mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        participants: {
          select: {
            id: true,
            isPaid: true,
            hasAttendance: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    })

    return events.map((ev) => {
      const total = ev.participants.length
      const paid = ev.participants.filter((p) => p.isPaid).length
      const eligible = ev.participants.filter((p) => p.isPaid && p.hasAttendance).length

      return {
        id: ev.id,
        title: ev.title,
        description: ev.description,
        workloadHours: ev.workloadHours,
        speaker: ev.speaker,
        courseName: ev.courseName,
        startDate: ev.startDate.toISOString(),
        endDate: ev.endDate ? ev.endDate.toISOString() : null,
        location: ev.location,
        isActive: ev.isActive,
        logoUrl: ev.logoUrl,
        certificateTemplateUrl: ev.certificateTemplateUrl,
        templateStyle: ev.templateStyle,
        totalParticipants: total,
        paidParticipants: paid,
        eligibleParticipants: eligible,
        createdAt: ev.createdAt.toISOString(),
      }
    })
  }

  async getCustomEventById(eventId: string) {
    const event = await this.prisma.certificateEvent.findUnique({
      where: { id: eventId },
      include: {
        participants: {
          orderBy: { studentName: 'asc' },
        },
        createdBy: {
          select: { id: true, username: true, email: true },
        },
      },
    })

    if (!event) {
      throw new NotFoundException('Evento acadêmico não encontrado.')
    }

    // Busca histórico de emissões para os participantes deste evento
    const participantIds = event.participants.map((p) => `EV-${p.id}`)
    const emissionLogs = participantIds.length
      ? await this.prisma.certificateEmissionLog.findMany({
          where: { inscricaoId: { in: participantIds } },
          select: { inscricaoId: true, issuedAt: true },
          orderBy: { issuedAt: 'desc' },
        })
      : []

    const emissionsMap = new Map<string, { count: number; lastAt: Date }>()
    for (const log of emissionLogs) {
      const existing = emissionsMap.get(log.inscricaoId)
      if (existing) {
        existing.count++
      } else {
        emissionsMap.set(log.inscricaoId, { count: 1, lastAt: log.issuedAt })
      }
    }

    const participants: CustomParticipantItemDto[] = event.participants.map((p) => {
      const isEligible = p.isPaid && p.hasAttendance
      let blockedReason: string | undefined
      if (!isEligible) {
        if (!p.isPaid && !p.hasAttendance) {
          blockedReason = 'Taxa de inscrição pendente e ausência não abonada'
        } else if (!p.isPaid) {
          blockedReason = 'Taxa de inscrição pendente de pagamento'
        } else {
          blockedReason = 'Presença não confirmada no evento'
        }
      }

      const emission = emissionsMap.get(`EV-${p.id}`)

      return {
        id: p.id,
        eventId: event.id,
        eventTitle: event.title,
        workloadHours: event.workloadHours,
        studentName: p.studentName,
        studentRa: p.studentRa,
        studentCpf: p.studentCpf,
        studentEmail: p.studentEmail,
        isPaid: p.isPaid,
        paymentDate: p.paymentDate ? p.paymentDate.toISOString() : null,
        hasAttendance: p.hasAttendance,
        attendanceCount: p.attendanceCount,
        isEligible,
        blockedReason,
        notes: p.notes,
        createdAt: p.createdAt.toISOString(),
        emittedCount: emission ? emission.count : 0,
        lastEmittedAt: emission ? emission.lastAt.toISOString() : null,
      }
    })

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      workloadHours: event.workloadHours,
      speaker: event.speaker,
      courseName: event.courseName,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate ? event.endDate.toISOString() : null,
      location: event.location,
      isActive: event.isActive,
      logoUrl: event.logoUrl,
      certificateTemplateUrl: event.certificateTemplateUrl,
      templateStyle: event.templateStyle,
      createdAt: event.createdAt.toISOString(),
      participants,
    }
  }

  async updateCustomEvent(eventId: string, dto: UpdateCustomEventDto) {
    const existing = await this.prisma.certificateEvent.findUnique({ where: { id: eventId } })
    if (!existing) {
      throw new NotFoundException('Evento não encontrado.')
    }

    return this.prisma.certificateEvent.update({
      where: { id: eventId },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        workloadHours: dto.workloadHours !== undefined ? Number(dto.workloadHours) : undefined,
        speaker: dto.speaker !== undefined ? dto.speaker?.trim() || null : undefined,
        courseName: dto.courseName !== undefined ? dto.courseName?.trim() || null : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
        location: dto.location !== undefined ? dto.location?.trim() || null : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
        logoUrl: dto.logoUrl !== undefined ? dto.logoUrl?.trim() || null : undefined,
        certificateTemplateUrl: dto.certificateTemplateUrl !== undefined ? dto.certificateTemplateUrl?.trim() || null : undefined,
        templateStyle: dto.templateStyle !== undefined ? dto.templateStyle : undefined,
      },
    })
  }

  async deleteCustomEvent(eventId: string) {
    const existing = await this.prisma.certificateEvent.findUnique({ where: { id: eventId } })
    if (!existing) {
      throw new NotFoundException('Evento não encontrado.')
    }

    await this.prisma.certificateEvent.delete({ where: { id: eventId } })
    return { success: true, message: 'Evento removido com sucesso.' }
  }

  async addParticipant(eventId: string, dto: CreateCustomParticipantDto, currentUserId?: string) {
    const event = await this.prisma.certificateEvent.findUnique({ where: { id: eventId } })
    if (!event) {
      throw new NotFoundException('Evento não encontrado.')
    }

    const studentName = dto.studentName?.trim()
    const studentRa = dto.studentRa?.trim()

    if (!studentName || !studentRa) {
      throw new BadRequestException('Nome do aluno e RA são obrigatórios.')
    }

    const existing = await this.prisma.certificateParticipant.findUnique({
      where: { eventId_studentRa: { eventId, studentRa } },
    })
    if (existing) {
      throw new BadRequestException(`O aluno RA #${studentRa} já está vinculado a este evento.`)
    }

    let linkedUserId: string | null = null
    if (dto.studentEmail?.trim()) {
      const user = await this.prisma.user.findFirst({
        where: { email: { equals: dto.studentEmail.trim(), mode: 'insensitive' } },
      })
      if (user) linkedUserId = user.id
    }

    const isPaid = Boolean(dto.isPaid)
    const hasAttendance = dto.hasAttendance !== undefined ? Boolean(dto.hasAttendance) : true

    return this.prisma.certificateParticipant.create({
      data: {
        eventId,
        studentName,
        studentRa,
        studentCpf: dto.studentCpf?.trim() || null,
        studentEmail: dto.studentEmail?.trim() || null,
        userId: linkedUserId,
        isPaid,
        paymentDate: isPaid ? new Date() : null,
        hasAttendance,
        notes: dto.notes?.trim() || null,
      },
    })
  }

  async updateParticipantStatus(participantId: string, dto: UpdateParticipantStatusDto) {
    const participant = await this.prisma.certificateParticipant.findUnique({
      where: { id: participantId },
    })
    if (!participant) {
      throw new NotFoundException('Participante não encontrado.')
    }

    const data: any = {}
    if (dto.studentName?.trim()) {
      data.studentName = dto.studentName.trim()
    }
    if (dto.isPaid !== undefined) {
      data.isPaid = dto.isPaid
      data.paymentDate = dto.isPaid ? (participant.paymentDate || new Date()) : null
    }
    if (dto.hasAttendance !== undefined) {
      data.hasAttendance = dto.hasAttendance
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() || null
    }

    return this.prisma.certificateParticipant.update({
      where: { id: participantId },
      data,
    })
  }

  async removeParticipant(participantId: string) {
    const participant = await this.prisma.certificateParticipant.findUnique({
      where: { id: participantId },
    })
    if (!participant) {
      throw new NotFoundException('Participante não encontrado.')
    }

    await this.prisma.certificateParticipant.delete({ where: { id: participantId } })
    return { success: true, message: 'Participante desvinculado com sucesso.' }
  }

  async getParticipantCertificateDocument(participantId: string, currentUserId?: string): Promise<CertificateDocumentDto> {
    const participant = await this.prisma.certificateParticipant.findUnique({
      where: { id: participantId },
      include: { event: true },
    })

    if (!participant) {
      throw new NotFoundException('Participante não encontrado.')
    }

    if (!participant.isPaid || !participant.hasAttendance) {
      const details = !participant.isPaid && !participant.hasAttendance
        ? 'taxa não quitada e presença não confirmada'
        : !participant.isPaid
        ? 'taxa de inscrição pendente de quitação'
        : 'presença não confirmada no evento'
      throw new BadRequestException(`O aluno não está apto a emitir este certificado (${details}).`)
    }

    const inscricaoId = `EV-${participant.id}`
    let existingLog = await this.prisma.certificateEmissionLog.findFirst({
      where: { inscricaoId },
      orderBy: { issuedAt: 'desc' },
      include: { issuedByUser: { select: { username: true } } },
    })

    let verificationCode: string
    if (existingLog) {
      verificationCode = existingLog.verificationCode
    } else {
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
      verificationCode = `FAIP-CERT-EV-${participant.studentRa}-${randomSuffix}`

      existingLog = await this.prisma.certificateEmissionLog.create({
        data: {
          inscricaoId,
          studentRa: participant.studentRa,
          studentName: participant.studentName,
          eventTitle: participant.event.title,
          workloadHours: participant.event.workloadHours,
          verificationCode,
          issuedByUserId: currentUserId || null,
        },
        include: { issuedByUser: { select: { username: true } } },
      })
    }

    return {
      inscricaoId,
      studentRa: participant.studentRa,
      studentName: participant.studentName,
      studentCpf: participant.studentCpf,
      eventId: participant.eventId,
      eventTitle: participant.event.title,
      workloadHours: participant.event.workloadHours,
      startDate: participant.event.startDate.toISOString(),
      endDate: participant.event.endDate ? participant.event.endDate.toISOString() : null,
      courseName: participant.event.courseName,
      issuedAt: existingLog.issuedAt.toISOString(),
      verificationCode,
      institutionName: 'FAIP - Faculdade de Ensino Superior do Interior Paulista',
      issuedByName: existingLog.issuedByUser?.username || 'Secretaria Geral',
      logoUrl: participant.event.logoUrl,
      certificateTemplateUrl: participant.event.certificateTemplateUrl,
      templateStyle: participant.event.templateStyle,
    }
  }

  async getEventsCatalog(user: { sub: string; role: string }): Promise<EventCatalogItemDto[]> {
    const events = await this.prisma.certificateEvent.findMany({
      where: { isActive: true },
      include: {
        participants: true,
      },
      orderBy: { startDate: 'desc' },
    })

    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { id: true, email: true, username: true },
    })

    return events.map((ev) => {
      const userParticipant = ev.participants.find(
        (p) =>
          p.userId === user.sub ||
          (currentUser?.email && p.studentEmail && p.studentEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
          (currentUser?.username && p.studentRa && p.studentRa.toLowerCase() === currentUser.username.toLowerCase()),
      )

      return {
        id: ev.id,
        title: ev.title,
        description: ev.description,
        workloadHours: ev.workloadHours,
        speaker: ev.speaker,
        courseName: ev.courseName,
        startDate: ev.startDate.toISOString(),
        endDate: ev.endDate ? ev.endDate.toISOString() : null,
        location: ev.location,
        isActive: ev.isActive,
        logoUrl: ev.logoUrl,
        certificateTemplateUrl: ev.certificateTemplateUrl,
        templateStyle: ev.templateStyle,
        isRegistered: Boolean(userParticipant),
        participantId: userParticipant?.id || null,
        isPaid: userParticipant ? userParticipant.isPaid : undefined,
        hasAttendance: userParticipant ? userParticipant.hasAttendance : undefined,
        isEligible: userParticipant ? userParticipant.isPaid && userParticipant.hasAttendance : undefined,
      }
    })
  }

  async getMyCertificate(participantId: string, user: { sub: string; role: string }) {
    const participant = await this.prisma.certificateParticipant.findUnique({
      where: { id: participantId },
      include: { event: true },
    })
    if (!participant) {
      throw new NotFoundException('Inscrição não encontrada.')
    }

    if (user.role !== 'admin' && user.role !== 'master') {
      const currentUser = await this.prisma.user.findUnique({ where: { id: user.sub } })
      const isOwner =
        participant.userId === user.sub ||
        (currentUser?.email && participant.studentEmail && participant.studentEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser?.username && participant.studentRa && participant.studentRa.toLowerCase() === currentUser.username.toLowerCase())

      if (!isOwner) {
        throw new ForbiddenException('Você não tem permissão para acessar este certificado.')
      }
    }

    return this.getParticipantCertificateDocument(participantId, user.sub)
  }

  private readonly eventsUploadDir = join(process.cwd(), 'uploads/events')

  async saveEventAsset(eventId: string, type: 'logo' | 'template', file: Express.Multer.File) {
    if (!existsSync(this.eventsUploadDir)) {
      await fs.mkdir(this.eventsUploadDir, { recursive: true })
    }
    const ext = extname(file.originalname)
    const uniqueName = `${eventId}-${type}-${Date.now()}${ext}`
    const destination = join(this.eventsUploadDir, uniqueName)
    await fs.writeFile(destination, file.buffer)
    const assetUrl = `/api/certificates/custom-events/${eventId}/assets/${uniqueName}`

    if (type === 'logo') {
      await this.prisma.certificateEvent.update({
        where: { id: eventId },
        data: { logoUrl: assetUrl },
      })
    } else {
      await this.prisma.certificateEvent.update({
        where: { id: eventId },
        data: { certificateTemplateUrl: assetUrl },
      })
    }

    return { assetUrl, fileName: uniqueName }
  }

  getEventAssetPath(fileName: string) {
    const path = join(this.eventsUploadDir, fileName)
    if (!existsSync(path)) {
      throw new NotFoundException('Arquivo de mídia do evento não encontrado.')
    }
    return path
  }
}
