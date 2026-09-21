import { ForbiddenException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AccessRole } from '@prisma/client'
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise'
import type { JwtPayload } from '../auth/jwt-auth.guard'
import { PrismaService } from '../database/prisma.service'
import type { UpdateCourseSettingDto } from './dto/update-course-setting.dto'

interface ExternalDatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

interface CourseRow extends RowDataPacket { id: string; name: string; offered: number }
interface ClassRow extends RowDataPacket {
  classGroup: string; subjectId: string; subjectName: string; teacherId: string; teacherName: string; unimestreEmail: string | null; studentCount: number
}
interface StudentRow extends RowDataPacket { id: string; name: string }
interface AccountRow extends RowDataPacket { personId: string; email: string }
interface LegacyRoomRow extends RowDataPacket { subjectId: string; classGroup: string; googleCourseId: string | null; alternateLink: string | null; status: string | null }

@Injectable()
export class UnimestreService {
  private readonly logger = new Logger(UnimestreService.name)
  private readonly unimestreConfig: ExternalDatabaseConfig
  private readonly faipConfig: ExternalDatabaseConfig
  private unimestrePool: Pool | null = null
  private faipPool: Pool | null = null

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.unimestreConfig = config.getOrThrow<ExternalDatabaseConfig>('unimestre')
    this.faipConfig = config.getOrThrow<ExternalDatabaseConfig>('faip')
  }

  async status() {
    const [unimestre, faip] = await Promise.all([this.probe('Unimestre'), this.probe('FAIP')])
    const [cachedCourses, cachedClasses, cachedStudents] = await Promise.all([
      this.prisma.academicCourseCache.count(),
      this.prisma.academicClassCache.count(),
      this.prisma.academicStudentCache.count(),
    ])
    const local = {
      configured: true,
      reachable: true,
      cachedCourses,
      cachedClasses,
      cachedStudents,
      message: `Banco local UniCore ativo com ${cachedCourses} curso(s), ${cachedClasses} turma(s) e ${cachedStudents} aluno(s) salvos para consulta offline.`,
    }
    return { unimestre, faip, local }
  }

  async courses(
    semester?: string,
    user?: JwtPayload,
    coordinationOnly = false,
    coordinatorEmail?: string,
    coordinatorUserId?: string,
  ) {
    const sem = semester?.trim() || ''
    let rawCourses: Array<{ id: string; name: string; offered: boolean; cached?: boolean }> = []

    try {
      const rows = await this.query<CourseRow[]>(this.getUnimestrePool(), `
        SELECT c.CD_CURSO AS id, TRIM(c.DS_CURSO) AS name,
          EXISTS(SELECT 1 FROM turmasprofessores tp WHERE tp.curso = c.CD_CURSO AND tp.anosemestre = ?) AS offered
        FROM CURSOS_MESTRE c
        WHERE c.SN_ATIVO = 'S' AND c.NR_GRAU IN (3, 33) AND TRIM(c.DS_CURSO) <> ''
        ORDER BY TRIM(c.DS_CURSO) ASC
      `, [sem])
      rawCourses = rows.map((row) => ({ id: row.id, name: row.name, offered: Boolean(row.offered) }))

      // Salva ou atualiza no banco local UniCore
      this.saveCoursesCache(sem, rawCourses).catch((err) => {
        this.logger.warn(`Falha ao salvar cursos no cache local: ${err.message}`)
      })
    } catch (error) {
      this.logger.warn(`Consulta externa de cursos falhou: ${(error as Error).message}. Buscando do banco local...`)
      const cached = await this.prisma.academicCourseCache.findMany({
        where: sem ? { semester: sem } : undefined,
        orderBy: { name: 'asc' },
      })
      if (cached.length) {
        rawCourses = cached.map((c) => ({ id: c.id, name: c.name, offered: c.offered, cached: true }))
      } else {
        throw error
      }
    }

    // Carrega configurações de cursos (e-mail do curso, coordenador) salvas no UniCore
    const allSettings = await this.prisma.academicCourseSetting.findMany({
      include: { coordinatorUser: { select: { id: true, username: true, email: true } } },
    })
    const settingsMap = new Map(allSettings.map((s) => [s.academicCourseId, s]))

    // Se estiver em modo coordenação (menu coordenação) ou perfil COORDENACAO,
    // filtrar apenas os cursos atribuídos ao usuário (por ID ou por e-mail institucional)
    const shouldFilterCoordination = coordinationOnly || user?.role === 'coordenacao'
    if (shouldFilterCoordination && user) {
      const allowedCourseIds = await this.getAllowedCourseIdsForCoordinator(user, coordinatorEmail, coordinatorUserId)
      rawCourses = rawCourses.filter((c) => allowedCourseIds.has(c.id))
    }

    return rawCourses.map((c) => {
      const setting = settingsMap.get(c.id)
      return {
        id: c.id,
        name: c.name,
        offered: c.offered,
        cached: c.cached,
        courseEmail: setting?.courseEmail ?? null,
        coordinatorEmail: setting?.coordinatorEmail ?? setting?.coordinatorUser?.email ?? null,
        coordinatorUserId: setting?.coordinatorUserId ?? null,
        coordinatorName: setting?.coordinatorUser?.username ?? null,
      }
    })
  }

  private async saveCoursesCache(semester: string, courses: Array<{ id: string; name: string; offered: boolean }>) {
    if (!semester || !courses.length) return
    const semesterStr = String(semester)
    for (const c of courses) {
      const idStr = String(c.id)
      await this.prisma.academicCourseCache.upsert({
        where: { id_semester: { id: idStr, semester: semesterStr } },
        update: { name: String(c.name), offered: Boolean(c.offered) },
        create: { id: idStr, name: String(c.name), semester: semesterStr, offered: Boolean(c.offered) },
      })
    }
  }

  async classes(
    semester: string,
    academicCourseId: string,
    user?: JwtPayload,
    coordinationOnly = false,
    coordinatorEmail?: string,
    coordinatorUserId?: string,
  ) {
    const shouldFilterCoordination = coordinationOnly || user?.role === 'coordenacao'
    if (shouldFilterCoordination && user) {
      const allowed = await this.getAllowedCourseIdsForCoordinator(user, coordinatorEmail, coordinatorUserId)
      if (!allowed.has(academicCourseId)) {
        throw new ForbiddenException('Acesso negado: este curso não está vinculado à sua coordenação.')
      }
    }

    try {
      const rows = await this.query<ClassRow[]>(this.getUnimestrePool(), `
        SELECT tp.turma AS classGroup, tp.disciplina AS subjectId, d.descricao AS subjectName,
          prof.cd_pessoa AS teacherId, prof.nm_pessoa AS teacherName,
          (SELECT ds_contato FROM contatos_pessoas
            WHERE cd_pessoa = prof.cd_pessoa AND cd_contato = 4
            ORDER BY ds_contato LIKE '%@professor.faip.edu.br%' DESC LIMIT 1) AS unimestreEmail,
          (SELECT COUNT(DISTINCT f.codigoaluno) FROM fichaindividual f
            INNER JOIN MATRICULAS m ON m.codigoaluno = f.codigoaluno AND m.anosemestre = f.anosemestre AND m.curso = f.curso
            WHERE f.anosemestre = tp.anosemestre AND f.curso = tp.curso AND f.turma = tp.turma
              AND f.disciplina = tp.disciplina AND m.situacao <= 3) AS studentCount
        FROM turmasprofessores tp
        INNER JOIN disciplinas d ON tp.disciplina = d.codigo
        INNER JOIN PESSOAS prof ON tp.professor = prof.cd_pessoa
        WHERE tp.anosemestre = ? AND tp.curso = ?
        GROUP BY tp.turma, tp.disciplina, tp.anosemestre, tp.curso, d.descricao, prof.cd_pessoa, prof.nm_pessoa
        ORDER BY tp.turma ASC, d.descricao ASC
      `, [semester, academicCourseId])

      const accountEmails = await this.getAccountEmails(rows.map((row) => String(row.teacherId)))
      const legacyRooms = await this.getLegacyRooms(academicCourseId)
      const result = rows.map((row) => {
        const key = `${row.classGroup}_${row.subjectId}`
        const legacyRoom = legacyRooms.get(key)
        return {
          classGroup: String(row.classGroup),
          subjectId: String(row.subjectId),
          subjectName: String(row.subjectName),
          teacherId: String(row.teacherId),
          teacherName: String(row.teacherName),
          teacherEmail: accountEmails.get(String(row.teacherId)) ?? row.unimestreEmail ?? null,
          studentCount: Number(row.studentCount),
          classroom: legacyRoom ?? null,
        }
      })

      // Salva no banco local UniCore
      this.saveClassesCache(semester, academicCourseId, result).catch((err) => {
        this.logger.warn(`Falha ao salvar turmas no cache local: ${err.message}`)
      })

      return result
    } catch (error) {
      this.logger.warn(`Consulta externa de turmas falhou: ${(error as Error).message}. Buscando do banco local...`)
      const cached = await this.prisma.academicClassCache.findMany({
        where: { semester: String(semester), academicCourseId: String(academicCourseId) },
        orderBy: [{ classGroup: 'asc' }, { subjectName: 'asc' }],
      })
      if (cached.length) {
        return cached.map((c) => ({
          classGroup: c.classGroup,
          subjectId: c.subjectId,
          subjectName: c.subjectName,
          teacherId: c.teacherId || '',
          teacherName: c.teacherName || '',
          teacherEmail: c.teacherEmail,
          studentCount: c.studentCount,
          classroom: c.classroomAlternateLink ? { alternateLink: c.classroomAlternateLink, googleCourseId: null, status: null } : null,
          cached: true,
        }))
      }
      throw error
    }
  }

  private async saveClassesCache(semester: string, academicCourseId: string, classes: Array<any>) {
    const semesterStr = String(semester)
    const academicCourseIdStr = String(academicCourseId)

    for (const item of classes) {
      const subjectIdStr = String(item.subjectId)
      const classGroupStr = String(item.classGroup)

      await this.prisma.academicClassCache.upsert({
        where: {
          semester_academicCourseId_classGroup_subjectId: {
            semester: semesterStr,
            academicCourseId: academicCourseIdStr,
            classGroup: classGroupStr,
            subjectId: subjectIdStr,
          },
        },
        update: {
          subjectName: String(item.subjectName),
          teacherId: item.teacherId ? String(item.teacherId) : null,
          teacherName: item.teacherName ? String(item.teacherName) : null,
          teacherEmail: item.teacherEmail,
          studentCount: Number(item.studentCount) || 0,
          classroomAlternateLink: item.classroom?.alternateLink || null,
        },
        create: {
          semester: semesterStr,
          academicCourseId: academicCourseIdStr,
          classGroup: classGroupStr,
          subjectId: subjectIdStr,
          subjectName: String(item.subjectName),
          teacherId: item.teacherId ? String(item.teacherId) : null,
          teacherName: item.teacherName ? String(item.teacherName) : null,
          teacherEmail: item.teacherEmail,
          studentCount: Number(item.studentCount) || 0,
          classroomAlternateLink: item.classroom?.alternateLink || null,
        },
      })
    }
  }

  async students(
    semester: string,
    academicCourseId: string,
    subjectId: string,
    classGroup: string,
    user?: JwtPayload,
    coordinationOnly = false,
    coordinatorEmail?: string,
    coordinatorUserId?: string,
  ) {
    const shouldFilterCoordination = coordinationOnly || user?.role === 'coordenacao'
    if (shouldFilterCoordination && user) {
      const allowed = await this.getAllowedCourseIdsForCoordinator(user, coordinatorEmail, coordinatorUserId)
      if (!allowed.has(academicCourseId)) {
        throw new ForbiddenException('Acesso negado: este curso não está vinculado à sua coordenação.')
      }
    }

    try {
      const rows = await this.query<StudentRow[]>(this.getUnimestrePool(), `
        SELECT DISTINCT f.codigoaluno AS id, p.nm_pessoa AS name
        FROM fichaindividual f
        INNER JOIN MATRICULAS m ON m.codigoaluno = f.codigoaluno AND m.anosemestre = f.anosemestre AND m.curso = f.curso
        INNER JOIN PESSOAS p ON p.cd_pessoa = f.codigoaluno
        WHERE f.anosemestre = ? AND f.curso = ? AND f.disciplina = ? AND f.turma = ? AND m.situacao <= 3
        ORDER BY p.nm_pessoa ASC
      `, [semester, academicCourseId, subjectId, classGroup])

      const ids = rows.map((row) => String(row.id))
      const [accountEmails, unimestreEmails] = await Promise.all([
        this.getAccountEmails(ids),
        this.getUnimestreStudentEmails(ids),
      ])

      const result = rows.map((row) => {
        const idStr = String(row.id)
        const email =
          accountEmails.get(idStr) ??
          unimestreEmails.get(idStr) ??
          this.formatStudentEmail(row.name)
        return { id: idStr, name: row.name, email }
      })

      // Salva no banco local UniCore
      this.saveStudentsCache(semester, academicCourseId, subjectId, classGroup, result).catch((err) => {
        this.logger.warn(`Falha ao salvar alunos no cache local: ${err.message}`)
      })

      return result
    } catch (error) {
      this.logger.warn(`Consulta externa de alunos falhou: ${(error as Error).message}. Buscando do banco local...`)
      const cached = await this.prisma.academicStudentCache.findMany({
        where: { semester, academicCourseId, subjectId, classGroup },
        orderBy: { name: 'asc' },
      })
      if (cached.length) {
        return cached.map((s) => ({
          id: s.studentId,
          name: s.name,
          email: s.email,
          cached: true,
        }))
      }
      throw error
    }
  }

  private async saveStudentsCache(
    semester: string,
    academicCourseId: string,
    subjectId: string,
    classGroup: string,
    students: Array<{ id: string; name: string; email: string | null }>,
  ) {
    const semesterStr = String(semester)
    const academicCourseIdStr = String(academicCourseId)
    const subjectIdStr = String(subjectId)
    const classGroupStr = String(classGroup)

    for (const s of students) {
      const studentIdStr = String(s.id)
      await this.prisma.academicStudentCache.upsert({
        where: {
          semester_academicCourseId_subjectId_classGroup_studentId: {
            semester: semesterStr,
            academicCourseId: academicCourseIdStr,
            subjectId: subjectIdStr,
            classGroup: classGroupStr,
            studentId: studentIdStr,
          },
        },
        update: {
          name: String(s.name),
          email: s.email,
        },
        create: {
          semester: semesterStr,
          academicCourseId: academicCourseIdStr,
          subjectId: subjectIdStr,
          classGroup: classGroupStr,
          studentId: studentIdStr,
          name: String(s.name),
          email: s.email,
        },
      })
    }
  }

  formatStudentEmail(name: string): string {
    const clean = (name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
    return clean ? `${clean}@aluno.faip.edu.br` : ''
  }

  private async getUnimestreStudentEmails(personIds: string[]): Promise<Map<string, string>> {
    if (!personIds.length) return new Map()
    try {
      const placeholders = personIds.map(() => '?').join(', ')
      const rows = await this.query<AccountRow[]>(this.getUnimestrePool(), `
        SELECT cd_pessoa AS personId, ds_contato AS email
        FROM contatos_pessoas
        WHERE cd_pessoa IN (${placeholders}) AND ds_contato LIKE '%@aluno.faip.edu.br%'
      `, personIds)
      const map = new Map<string, string>()
      for (const row of rows) {
        if (row.email && !map.has(String(row.personId))) {
          map.set(String(row.personId), row.email.trim().toLowerCase())
        }
      }
      return map
    } catch (error) {
      this.logger.warn(`Não foi possível consultar e-mails em contatos_pessoas: ${error}`)
      return new Map()
    }
  }

  private async getAccountEmails(personIds: string[]): Promise<Map<string, string>> {
    if (!personIds.length) return new Map()
    try {
      const placeholders = personIds.map(() => '?').join(', ')
      const rows = await this.query<AccountRow[]>(this.getFaipPool(), `
        SELECT cd_pessoa AS personId, ds_email_google AS email
        FROM faip_contas_google WHERE cd_pessoa IN (${placeholders})
      `, personIds)
      return new Map(rows.filter((row) => row.email).map((row) => [String(row.personId), row.email]))
    } catch {
      this.logger.warn('Não foi possível consultar os vínculos de e-mail no banco FAIP.')
      return new Map()
    }
  }

  private async getLegacyRooms(academicCourseId: string): Promise<Map<string, { googleCourseId: string | null; alternateLink: string | null; status: string | null }>> {
    try {
      const rows = await this.query<LegacyRoomRow[]>(this.getFaipPool(), `
        SELECT id_disciplina AS subjectId, turma AS classGroup, google_id AS googleCourseId,
          link_sala AS alternateLink, status
        FROM controle_google_classroom WHERE id_curso = ?
      `, [academicCourseId])
      return new Map(rows.map((row) => [`${row.classGroup}_${row.subjectId}`, {
        googleCourseId: row.googleCourseId,
        alternateLink: row.alternateLink,
        status: row.status,
      }]))
    } catch {
      return new Map()
    }
  }

  private async probe(name: 'Unimestre' | 'FAIP') {
    const config = name === 'Unimestre' ? this.unimestreConfig : this.faipConfig
    if (!this.isConfigured(config)) return { configured: false, reachable: false, message: `Configure a conexão ${name}.` }
    try {
      await this.query<RowDataPacket[]>(name === 'Unimestre' ? this.getUnimestrePool() : this.getFaipPool(), 'SELECT 1')
      return { configured: true, reachable: true, message: 'Conexão disponível.' }
    } catch (err) {
      const errMsg = (err as Error).message || ''
      this.logger.warn(`Sonda de conexão ${name} falhou: ${errMsg}`)
      if (errMsg.includes('Access denied for user')) {
        const ipMatch = errMsg.match(/@'([^']+)'/)
        const ip = ipMatch ? ipMatch[1] : ''
        return {
          configured: true,
          reachable: false,
          message: ip
            ? `Acesso negado para o IP ${ip}. Libere o IP no firewall do banco.`
            : `Acesso negado para o usuário ${config.user} no banco ${name}.`,
        }
      }
      return { configured: true, reachable: false, message: `Não foi possível acessar o banco ${name}.` }
    }
  }

  private getUnimestrePool(): Pool {
    if (!this.unimestrePool) this.unimestrePool = this.createPool(this.unimestreConfig, 'Unimestre')
    return this.unimestrePool
  }

  private getFaipPool(): Pool {
    if (!this.faipPool) this.faipPool = this.createPool(this.faipConfig, 'FAIP')
    return this.faipPool
  }

  private createPool(config: ExternalDatabaseConfig, name: string): Pool {
    if (!this.isConfigured(config)) throw new ServiceUnavailableException(`A conexão ${name} não está configurada.`)
    return createPool({ ...config, waitForConnections: true, connectionLimit: 4, queueLimit: 0, connectTimeout: 8_000 })
  }

  private isConfigured(config: ExternalDatabaseConfig): boolean {
    return Boolean(config.host && config.database && config.user && config.password)
  }

  private async query<T extends RowDataPacket[]>(pool: Pool, sql: string, values: readonly unknown[] = []): Promise<T> {
    const [rows] = await pool.execute<T>(sql, values)
    return rows
  }

  async getCoordinators() {
    return this.prisma.user.findMany({
      where: {
        role: AccessRole.COORDENACAO,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
      orderBy: { username: 'asc' },
    })
  }

  async getCourseSettings() {
    return this.prisma.academicCourseSetting.findMany({
      include: {
        coordinatorUser: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { courseName: 'asc' },
    })
  }

  async updateCourseSetting(academicCourseId: string, data: UpdateCourseSettingDto) {
    const cleanCourseEmail = data.courseEmail?.trim().toLowerCase() || null
    let cleanCoordinatorEmail = data.coordinatorEmail?.trim().toLowerCase() || null
    let coordinatorUserId = data.coordinatorUserId || null

    if (coordinatorUserId) {
      const user = await this.prisma.user.findUnique({ where: { id: coordinatorUserId } })
      if (user) {
        cleanCoordinatorEmail = user.email.trim().toLowerCase()
      } else {
        coordinatorUserId = null
      }
    } else if (cleanCoordinatorEmail) {
      const user = await this.prisma.user.findFirst({
        where: { email: { equals: cleanCoordinatorEmail, mode: 'insensitive' } },
      })
      if (user) {
        coordinatorUserId = user.id
        cleanCoordinatorEmail = user.email.trim().toLowerCase()
      }
    }

    return this.prisma.academicCourseSetting.upsert({
      where: { academicCourseId },
      update: {
        courseName: data.courseName.trim(),
        courseEmail: cleanCourseEmail,
        coordinatorEmail: cleanCoordinatorEmail,
        coordinatorUserId,
      },
      create: {
        academicCourseId,
        courseName: data.courseName.trim(),
        courseEmail: cleanCourseEmail,
        coordinatorEmail: cleanCoordinatorEmail,
        coordinatorUserId,
      },
      include: {
        coordinatorUser: {
          select: { id: true, username: true, email: true },
        },
      },
    })
  }

  private async getAllowedCourseIdsForCoordinator(
    user: JwtPayload,
    coordinatorEmail?: string,
    coordinatorUserId?: string,
  ): Promise<Set<string>> {
    let targetUserId = coordinatorUserId?.trim() || null
    let targetUserEmail = coordinatorEmail?.trim().toLowerCase() || null

    if (user.role === 'coordenacao') {
      const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } })
      targetUserId = dbUser?.id || user.sub
      targetUserEmail = (dbUser?.email || (user as any).email || '').trim().toLowerCase()
    } else {
      if (targetUserId && !targetUserEmail) {
        const found = await this.prisma.user.findUnique({ where: { id: targetUserId } })
        if (found) targetUserEmail = found.email.trim().toLowerCase()
      } else if (targetUserEmail && !targetUserId) {
        const found = await this.prisma.user.findFirst({
          where: { email: { equals: targetUserEmail, mode: 'insensitive' } },
        })
        if (found) targetUserId = found.id
      } else if (!targetUserId && !targetUserEmail) {
        const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } })
        targetUserId = dbUser?.id || user.sub
        targetUserEmail = (dbUser?.email || (user as any).email || '').trim().toLowerCase()
      }
    }

    const allSettings = await this.prisma.academicCourseSetting.findMany({
      include: {
        coordinatorUser: {
          select: { id: true, email: true },
        },
      },
    })

    const allowed = new Set<string>()
    for (const s of allSettings) {
      // 1. Vinculação direta por ID do usuário
      if (targetUserId && s.coordinatorUserId && (s.coordinatorUserId === targetUserId || s.coordinatorUserId === user.sub)) {
        allowed.add(s.academicCourseId)
        continue
      }
      // 2. Vinculação por e-mail do coordenador configurado no curso
      const settingEmail = (s.coordinatorEmail || s.coordinatorUser?.email || '').trim().toLowerCase()
      if (targetUserEmail && settingEmail && settingEmail === targetUserEmail) {
        allowed.add(s.academicCourseId)
      }
    }

    return allowed
  }
}

