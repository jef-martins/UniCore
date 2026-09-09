import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { existsSync } from 'node:fs'
import { google, type classroom_v1 } from 'googleapis'
import { ConfigService } from '@nestjs/config'

const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses',
  'https://www.googleapis.com/auth/classroom.rosters',
]

@Injectable()
export class GoogleClassroomService {
  private readonly logger = new Logger(GoogleClassroomService.name)
  private readonly classroom: classroom_v1.Classroom | null
  private readonly configurationMessage: string | null

  constructor(config: ConfigService) {
    const serviceAccountFile = config.get<string>('googleServiceAccountFile')
    const clientEmail = config.get<string>('googleClientEmail')
    const privateKey = config.get<string>('googlePrivateKey')?.replace(/\\n/g, '\n')
    const subject = config.get<string>('googleAdminSubject') || undefined

    if (serviceAccountFile) {
      if (!existsSync(serviceAccountFile)) {
        this.configurationMessage = 'O arquivo da conta de serviço Google não foi encontrado no caminho configurado.'
        this.classroom = null
        return
      }
      const auth = new google.auth.JWT({ keyFile: serviceAccountFile, scopes: CLASSROOM_SCOPES, subject })
      this.classroom = google.classroom({ version: 'v1', auth })
      this.configurationMessage = null
      return
    }

    if (clientEmail && privateKey) {
      const auth = new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: CLASSROOM_SCOPES, subject })
      this.classroom = google.classroom({ version: 'v1', auth })
      this.configurationMessage = null
      return
    }

    this.configurationMessage = 'Configure GOOGLE_SERVICE_ACCOUNT_FILE ou GOOGLE_CLIENT_EMAIL e GOOGLE_PRIVATE_KEY no backend.'
    this.classroom = null
  }

  getStatus() {
    return { configured: this.classroom !== null, message: this.configurationMessage }
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
