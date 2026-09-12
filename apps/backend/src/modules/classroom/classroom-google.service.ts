import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { google, type classroom_v1 } from 'googleapis'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../database/prisma.service'

const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses',
  'https://www.googleapis.com/auth/classroom.rosters',
  'https://www.googleapis.com/auth/classroom.profile.emails',
]

export type GoogleAuthType = 'oauth2' | 'service_account' | null

@Injectable()
export class GoogleClassroomService {
  private readonly logger = new Logger(GoogleClassroomService.name)
  private classroom: classroom_v1.Classroom | null = null
  private authType: GoogleAuthType = null
  private configurationMessage: string | null = null

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.initClient()
  }

  initClient(): void {
    const serviceAccountFile = this.config.get<string>('googleServiceAccountFile')
    const clientEmail = this.config.get<string>('googleClientEmail')
    const privateKey = this.config.get<string>('googlePrivateKey')?.replace(/\\n/g, '\n')
    const subject = this.config.get<string>('googleAdminSubject') || undefined

    const clientId = this.config.get<string>('googleClientId')
    const clientSecret = this.config.get<string>('googleClientSecret')
    const redirectUri = this.config.get<string>('googleRedirectUri') || 'http://localhost:3000/api/classroom/google/callback'
    const refreshToken = this.getPersistedRefreshToken()

    // 1. Tenta OAuth 2.0 se tiver refresh token
    if (clientId && clientSecret && refreshToken) {
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
      oauth2Client.setCredentials({ refresh_token: refreshToken })
      oauth2Client.on('tokens', (tokens) => {
        if (tokens.refresh_token) {
          this.persistRefreshToken(tokens.refresh_token)
        }
      })
      this.classroom = google.classroom({ version: 'v1', auth: oauth2Client })
      this.authType = 'oauth2'
      this.configurationMessage = null
      this.logger.log('Google Classroom inicializado via OAuth 2.0.')
      return
    }

    // 2. Tenta Conta de Serviço via arquivo JSON
    if (serviceAccountFile) {
      if (!existsSync(serviceAccountFile)) {
        this.configurationMessage = 'O arquivo da conta de serviço Google não foi encontrado no caminho configurado.'
        this.classroom = null
        this.authType = null
        return
      }
      const auth = new google.auth.JWT({ keyFile: serviceAccountFile, scopes: CLASSROOM_SCOPES, subject })
      this.classroom = google.classroom({ version: 'v1', auth })
      this.authType = 'service_account'
      this.configurationMessage = null
      this.logger.log('Google Classroom inicializado via Conta de Serviço (arquivo JSON).')
      return
    }

    // 3. Tenta Conta de Serviço via Client Email + Private Key
    if (clientEmail && privateKey) {
      const auth = new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: CLASSROOM_SCOPES, subject })
      this.classroom = google.classroom({ version: 'v1', auth })
      this.authType = 'service_account'
      this.configurationMessage = null
      this.logger.log('Google Classroom inicializado via Conta de Serviço (variáveis de ambiente).')
      return
    }

    // 4. Se tiver OAuth configurado mas sem token ainda
    if (clientId && clientSecret) {
      this.configurationMessage = 'Credenciais OAuth 2.0 configuradas. Conecte sua conta do Google Workspace para concluir a integração.'
      this.classroom = null
      this.authType = 'oauth2'
      return
    }

    this.configurationMessage = 'Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET (OAuth 2.0) ou GOOGLE_SERVICE_ACCOUNT_FILE no backend.'
    this.classroom = null
    this.authType = null
  }

  async getStatus() {
    let authUrl: string | null = null
    if (!this.classroom && this.authType === 'oauth2') {
      try {
        authUrl = this.getAuthUrl()
      } catch {
        authUrl = null
      }
    }

    const cachedCoursesCount = await this.prisma.googleCourseCache.count()

    return {
      configured: this.classroom !== null,
      authType: this.authType,
      authUrl,
      cachedCoursesCount,
      message: this.classroom !== null
        ? this.configurationMessage
        : cachedCoursesCount > 0
          ? `${this.configurationMessage || 'Google Classroom desconectado.'} ${cachedCoursesCount} sala(s) salva(s) no banco local UniCore.`
          : this.configurationMessage,
    }
  }

  getAuthUrl(redirectUriOverride?: string): string {
    const clientId = this.config.get<string>('googleClientId')
    const clientSecret = this.config.get<string>('googleClientSecret')
    const redirectUri = redirectUriOverride || this.config.get<string>('googleRedirectUri') || 'http://localhost:3000/api/classroom/google/callback'

    if (!clientId || !clientSecret) {
      throw new BadRequestException('GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não estão configurados.')
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: CLASSROOM_SCOPES,
    })
  }

  async exchangeCode(code: string, redirectUriOverride?: string) {
    const clientId = this.config.get<string>('googleClientId')
    const clientSecret = this.config.get<string>('googleClientSecret')
    const redirectUri = redirectUriOverride || this.config.get<string>('googleRedirectUri') || 'http://localhost:3000/api/classroom/google/callback'

    if (!clientId || !clientSecret) {
      throw new BadRequestException('GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não estão configurados.')
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    try {
      const { tokens } = await oauth2Client.getToken(code.trim())
      if (tokens.refresh_token) {
        this.persistRefreshToken(tokens.refresh_token)
      }
      oauth2Client.setCredentials(tokens)
      oauth2Client.on('tokens', (newTokens) => {
        if (newTokens.refresh_token) {
          this.persistRefreshToken(newTokens.refresh_token)
        }
      })
      this.classroom = google.classroom({ version: 'v1', auth: oauth2Client })
      this.authType = 'oauth2'
      this.configurationMessage = null
      this.logger.log('Google Classroom autenticado com sucesso via código OAuth 2.0.')

      return {
        success: true,
        hasRefreshToken: Boolean(tokens.refresh_token),
        message: 'Conta Google autenticada com sucesso no UniCore.',
      }
    } catch (error) {
      this.logger.error(`Falha ao trocar código de autorização Google: ${(error as Error).message}`)
      throw new BadRequestException('Código de autorização inválido ou expirado.')
    }
  }

  async listCourses(): Promise<classroom_v1.Schema$Course[]> {
    const classroom = this.getClient()
    try {
      const courses: classroom_v1.Schema$Course[] = []
      let pageToken: string | undefined
      do {
        const response = await classroom.courses.list({ pageSize: 100, pageToken, courseStates: ['ACTIVE'] })
        courses.push(...(response.data.courses ?? []))
        pageToken = response.data.nextPageToken ?? undefined
      } while (pageToken)
      return courses
    } catch (error) {
      this.throwGoogleError('listar os cursos', error)
    }
  }

  async listCoursesWithTeachers(): Promise<Array<{
    id: string
    name: string
    section: string | null
    descriptionHeading: string | null
    alternateLink: string | null
    courseState: string | null
    teachers: Array<{ id: string; name: string | null; email: string | null }>
    cached?: boolean
  }>> {
    try {
      const classroom = this.getClient()
      const coursesRes = await classroom.courses.list({ pageSize: 100, courseStates: ['ACTIVE'] })
      const courses = coursesRes.data.courses ?? []

      const results = await Promise.all(
        courses.map(async (course) => {
          let teachers: Array<{ id: string; name: string | null; email: string | null }> = []
          if (course.id) {
            try {
              const tRes = await classroom.courses.teachers.list({ courseId: course.id })
              teachers = (tRes.data.teachers ?? []).map((t) => ({
                id: t.userId ?? '',
                name: t.profile?.name?.fullName ?? null,
                email: t.profile?.emailAddress ?? null,
              }))
            } catch {
              teachers = []
            }
          }
          return {
            id: course.id ?? '',
            name: course.name ?? '',
            section: course.section ?? null,
            descriptionHeading: course.descriptionHeading ?? null,
            alternateLink: course.alternateLink ?? null,
            courseState: course.courseState ?? 'ACTIVE',
            teachers,
          }
        })
      )

      // Salva no banco local UniCore
      this.saveCoursesCache(results).catch((err) => {
        this.logger.warn(`Falha ao salvar salas do Google Classroom no cache local: ${err.message}`)
      })

      return results
    } catch (error) {
      this.logger.warn(`Consulta à API Google Classroom falhou: ${(error as Error).message}. Buscando do banco local...`)
      const cached = await this.prisma.googleCourseCache.findMany({
        orderBy: { name: 'asc' },
      })
      if (cached.length) {
        return cached.map((c) => ({
          id: c.id,
          name: c.name,
          section: c.section,
          descriptionHeading: c.descriptionHeading,
          alternateLink: c.alternateLink,
          courseState: c.courseState,
          teachers: (c.teachers as Array<{ id: string; name: string | null; email: string | null }>) || [],
          cached: true,
        }))
      }
      this.throwGoogleError('listar as salas e professores do Google Classroom', error)
    }
  }

  private async saveCoursesCache(courses: Array<{
    id: string
    name: string
    section: string | null
    descriptionHeading: string | null
    alternateLink: string | null
    courseState: string | null
    teachers: Array<{ id: string; name: string | null; email: string | null }>
  }>) {
    for (const c of courses) {
      await this.prisma.googleCourseCache.upsert({
        where: { id: c.id },
        update: {
          name: c.name,
          section: c.section,
          descriptionHeading: c.descriptionHeading,
          alternateLink: c.alternateLink,
          courseState: c.courseState,
          teachers: c.teachers,
        },
        create: {
          id: c.id,
          name: c.name,
          section: c.section,
          descriptionHeading: c.descriptionHeading,
          alternateLink: c.alternateLink,
          courseState: c.courseState,
          teachers: c.teachers,
        },
      })
    }
  }

  async createCourse(input: { name: string; section: string; descriptionHeading: string }) {
    const classroom = this.getClient()
    try {
      const response = await classroom.courses.create({
        requestBody: { ...input, ownerId: 'me', courseState: 'PROVISIONED' },
      })
      const course = response.data
      if (!course.id) throw new Error('A API Google não retornou o identificador da sala criada.')
      return { id: course.id, alternateLink: course.alternateLink ?? null }
    } catch (error) {
      this.throwGoogleError('criar a sala', error)
    }
  }

  async addTeacher(courseId: string, teacherEmail: string): Promise<'added' | 'already-exists'> {
    const classroom = this.getClient()
    try {
      await classroom.courses.teachers.create({ courseId, requestBody: { userId: teacherEmail } })
      return 'added'
    } catch (error) {
      if (this.getStatusCode(error) === 409) return 'already-exists'
      this.throwGoogleError('adicionar o professor', error)
    }
  }

  async addStudent(courseId: string, studentEmail: string): Promise<'added' | 'already-exists'> {
    const classroom = this.getClient()
    try {
      await classroom.courses.students.create({ courseId, requestBody: { userId: studentEmail } })
      return 'added'
    } catch (error) {
      if (this.getStatusCode(error) === 409) return 'already-exists'
      this.throwGoogleError('adicionar o aluno', error)
    }
  }

  async listCourseStudents(courseId: string): Promise<Array<{
    id: string
    name: string | null
    email: string | null
    cached?: boolean
  }>> {
    try {
      const classroom = this.getClient()
      const students: Array<{ id: string; name: string | null; email: string | null }> = []
      let pageToken: string | undefined
      do {
        const response = await classroom.courses.students.list({ courseId, pageSize: 100, pageToken })
        for (const s of response.data.students ?? []) {
          const profile = s.profile
          students.push({
            id: s.userId ?? profile?.id ?? '',
            name: profile?.name?.fullName ?? null,
            email: profile?.emailAddress ?? null,
          })
        }
        pageToken = response.data.nextPageToken ?? undefined
      } while (pageToken)

      // Salva no banco local UniCore
      this.saveCourseStudentsCache(courseId, students).catch((err) => {
        this.logger.warn(`Falha ao salvar alunos do Google Classroom no cache local: ${err.message}`)
      })

      return students
    } catch (error) {
      this.logger.warn(`Consulta aos alunos do Google Classroom falhou: ${(error as Error).message}. Buscando do banco local...`)
      const cachedCourse = await this.prisma.googleCourseCache.findUnique({
        where: { id: courseId },
      })
      if (cachedCourse && Array.isArray(cachedCourse.students) && cachedCourse.students.length > 0) {
        return (cachedCourse.students as Array<{ id: string; name: string | null; email: string | null }>).map((s) => ({
          ...s,
          cached: true,
        }))
      }
      this.throwGoogleError('listar os alunos da sala', error)
    }
  }

  private async saveCourseStudentsCache(
    courseId: string,
    students: Array<{ id: string; name: string | null; email: string | null }>,
  ) {
    await this.prisma.googleCourseCache.updateMany({
      where: { id: courseId },
      data: { students },
    })
  }

  private persistRefreshToken(refreshToken: string) {
    const tokenPath = join(process.cwd(), '.google-token.json')
    try {
      writeFileSync(tokenPath, JSON.stringify({ refresh_token: refreshToken, updatedAt: new Date().toISOString() }, null, 2))
    } catch (err) {
      this.logger.warn(`Não foi possível salvar .google-token.json: ${(err as Error).message}`)
    }

    const envPath = join(process.cwd(), '.env')
    if (existsSync(envPath)) {
      try {
        let content = readFileSync(envPath, 'utf8')
        if (/^GOOGLE_REFRESH_TOKEN=.*$/m.test(content)) {
          content = content.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, `GOOGLE_REFRESH_TOKEN=${refreshToken}`)
        } else {
          content += `\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`
        }
        writeFileSync(envPath, content, 'utf8')
      } catch (err) {
        this.logger.warn(`Não foi possível atualizar .env: ${(err as Error).message}`)
      }
    }
  }

  private getPersistedRefreshToken(): string | null {
    const envToken = this.config.get<string>('googleRefreshToken')?.trim()
    if (envToken) return envToken

    const tokenPath = join(process.cwd(), '.google-token.json')
    if (existsSync(tokenPath)) {
      try {
        const data = JSON.parse(readFileSync(tokenPath, 'utf8'))
        if (typeof data.refresh_token === 'string' && data.refresh_token.trim()) {
          return data.refresh_token.trim()
        }
      } catch {
        // ignora erro de leitura/parse
      }
    }
    return null
  }

  private getClient(): classroom_v1.Classroom {
    if (this.classroom) return this.classroom
    throw new ServiceUnavailableException(this.configurationMessage ?? 'A integração Google não está configurada.')
  }

  private getStatusCode(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') return undefined
    const candidate = error as { code?: unknown; response?: { status?: unknown } }
    return typeof candidate.code === 'number'
      ? candidate.code
      : typeof candidate.response?.status === 'number' ? candidate.response.status : undefined
  }

  private throwGoogleError(operation: string, error: unknown): never {
    const code = this.getStatusCode(error)
    this.logger.error(`Falha ao ${operation}${code ? ` (HTTP ${code})` : ''}.`)
    throw new ServiceUnavailableException(`Não foi possível ${operation} no Google Classroom.`)
  }
}
