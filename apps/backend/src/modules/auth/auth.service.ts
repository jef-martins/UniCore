import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { randomBytes } from 'node:crypto'
import argon2 from 'argon2'
import { google } from 'googleapis'
import { AccessRole } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { MailService } from '../mail/mail.service'
import { CreateUserDto } from './dto/create-user.dto'
import { ChangePasswordDto } from './dto/change-password.dto'

export type AuthRole =
  | 'vestibular'
  | 'admin'
  | 'master'
  | 'tesouraria'
  | 'secretaria'
  | 'coordenacao'
  | 'registro_academico'
  | 'aluno'
  | 'professor'

export interface AuthUserResponse {
  id: string
  username: string
  email: string
  role: AuthRole
  emailVerified: boolean
  validationUrl?: string
}

export interface LoginResponse {
  accessToken: string
  user: AuthUserResponse
}

const ROLE_MAP: Record<AccessRole, AuthRole> = {
  VESTIBULAR: 'vestibular',
  ADMIN: 'admin',
  MASTER: 'master',
  TESOURARIA: 'tesouraria',
  SECRETARIA: 'secretaria',
  COORDENACAO: 'coordenacao',
  REGISTRO_ACADEMICO: 'registro_academico',
  ALUNO: 'aluno',
  PROFESSOR: 'professor',
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

  isInstitutionalEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false
    const trimmed = email.trim().toLowerCase()
    const atIndex = trimmed.lastIndexOf('@')
    if (atIndex === -1) return false
    const domain = trimmed.substring(atIndex + 1)
    if (!domain) return false

    // Domínio oficial FAIP e subdomínios acadêmicos (ex: professor.faip.edu.br, aluno.faip.edu.br)
    if (domain === 'faip.edu.br' || domain.endsWith('.faip.edu.br')) {
      return true
    }

    // Domínios extras configurados via env (ex: INSTITUTIONAL_EMAIL_DOMAINS=faip.edu.br,unicore.local)
    const extraDomainsRaw = this.config.get<string>('INSTITUTIONAL_EMAIL_DOMAINS', '')
    if (extraDomainsRaw) {
      const extraList = extraDomainsRaw.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
      for (const extra of extraList) {
        if (domain === extra || domain.endsWith(`.${extra}`)) {
          return true
        }
      }
    }

    return false
  }

  async login(identifier: string, password: string): Promise<LoginResponse> {
    const normalizedIdentifier = identifier.trim()
    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [
          { username: { equals: normalizedIdentifier, mode: 'insensitive' } },
          { email: { equals: normalizedIdentifier, mode: 'insensitive' } },
        ],
      },
    })

    let passwordMatches = false
    if (user) {
      try {
        passwordMatches = await argon2.verify(user.passwordHash, password)
      } catch {
        passwordMatches = false
      }
    }

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Usuário/e-mail ou senha inválidos.')
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException({
        message: 'E-mail institucional ainda não validado. Por favor, acesse o link enviado para seu e-mail para validar sua conta.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      })
    }

    const publicUser = this.toPublicUser(user)
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: publicUser.role,
    }, {
      expiresIn: this.config.get<string>('jwtExpiresIn', '9h'),
    })

    return { accessToken, user: publicUser }
  }

  async findAllUsers(
    requestUser: { sub: string; role: AuthRole },
    sector?: string,
    search?: string,
  ): Promise<AuthUserResponse[]> {
    const andConditions: any[] = [{ isActive: true }]
    
    if (requestUser.role === 'master') {
      // Master vê todo mundo, não aplica filtro restritivo de papel
    } else if (requestUser.role === 'admin') {
      andConditions.push({ role: { not: 'MASTER' } })
    } else {
      const accessRole = (Object.keys(ROLE_MAP) as AccessRole[]).find(
        (key) => ROLE_MAP[key] === requestUser.role
      )
      if (accessRole) {
        if (requestUser.role === 'aluno') {
          andConditions.push({ id: requestUser.sub }) // Aluno vê apenas a si mesmo
        } else if (requestUser.role === 'coordenacao') {
          andConditions.push({ role: { in: [accessRole, 'ALUNO', 'PROFESSOR'] } }) // Coordenação vê setor + alunos e professores
        } else {
          andConditions.push({ role: { in: [accessRole, 'ALUNO'] } }) // Outros vêem seu setor + alunos
        }
      }
    }

    if (sector) {
      const targetAccessRole = (Object.keys(ROLE_MAP) as AccessRole[]).find(
        (key) => ROLE_MAP[key] === sector.toLowerCase()
      )
      if (targetAccessRole) {
        andConditions.push({ role: targetAccessRole })
      }
    }

    if (search && search.trim()) {
      const term = search.trim()
      andConditions.push({
        OR: [
          { username: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      })
    }

    const whereClause = andConditions.length === 1 ? andConditions[0] : { AND: andConditions }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      orderBy: { username: 'asc' },
    })
    return users.map((u) => this.toPublicUser(u))
  }

  toPublicUser(user: { id: string; username: string; email: string; role: AccessRole; emailVerified?: boolean; verificationToken?: string | null }): AuthUserResponse {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('CORS_ORIGIN') ||
      'http://localhost:4200'

    const validationUrl = (!user.emailVerified && user.verificationToken)
      ? `${frontendUrl.replace(/\/$/, '')}/verificar-email?token=${encodeURIComponent(user.verificationToken)}`
      : undefined

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: ROLE_MAP[user.role],
      emailVerified: Boolean(user.emailVerified),
      validationUrl,
    }
  }

  async createUser(dto: CreateUserDto): Promise<AuthUserResponse> {
    const accessRole = (Object.keys(ROLE_MAP) as AccessRole[]).find(
      (key) => ROLE_MAP[key] === dto.role
    )

    if (!accessRole) {
      throw new ConflictException('Papel de acesso inválido.')
    }

    const normalizedEmail = dto.email.trim().toLowerCase()
    if (!this.isInstitutionalEmail(normalizedEmail)) {
      throw new BadRequestException(
        'O e-mail informado não é institucional. O cadastro exige obrigatoriamente um e-mail com domínio institucional (ex: @faip.edu.br, @professor.faip.edu.br, @aluno.faip.edu.br).',
      )
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username.trim() },
          { email: normalizedEmail }
        ]
      }
    })

    if (existing) {
      throw new ConflictException('Nome de usuário ou e-mail já estão em uso.')
    }

    const passwordHash = await argon2.hash(dto.password)
    const verificationToken = randomBytes(32).toString('hex')
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

    const user = await this.prisma.user.create({
      data: {
        username: dto.username.trim(),
        email: normalizedEmail,
        passwordHash,
        role: accessRole,
        isActive: true,
        emailVerified: false,
        verificationToken,
        verificationExpires,
      }
    })

    // Dispara envio do e-mail com o link de validação
    await this.mailService.sendVerificationEmail(user.email, user.username, verificationToken)

    return this.toPublicUser(user)
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.')
    }

    let passwordMatches = false
    try {
      passwordMatches = await argon2.verify(user.passwordHash, dto.currentPassword)
    } catch {
      passwordMatches = false
    }

    if (!passwordMatches) {
      throw new BadRequestException('A senha atual informada está incorreta.')
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da senha atual.')
    }

    const passwordHash = await argon2.hash(dto.newPassword)
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })

    return { success: true, message: 'Senha alterada com sucesso.' }
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string; email?: string }> {
    if (!token || !token.trim()) {
      throw new BadRequestException('Token de validação não informado.')
    }

    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: token.trim(),
      },
    })

    if (!user) {
      throw new BadRequestException('Link de validação inválido ou já utilizado.')
    }

    if (user.verificationExpires && user.verificationExpires < new Date()) {
      throw new BadRequestException('Este link de validação expirou. Por favor, solicite um novo link de confirmação.')
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpires: null,
      },
    })

    return {
      success: true,
      message: 'E-mail institucional validado com sucesso! Sua conta está liberada.',
      email: user.email,
    }
  }

  async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    if (!email || !email.trim()) {
      throw new BadRequestException('Informe o e-mail institucional.')
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
    })

    if (!user) {
      throw new NotFoundException('Nenhum usuário encontrado com este e-mail.')
    }

    if (user.emailVerified) {
      return {
        success: true,
        message: 'Este e-mail institucional já foi validado anteriormente. Você já pode fazer login normalmente.',
      }
    }

    const verificationToken = randomBytes(32).toString('hex')
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationExpires,
      },
    })

    await this.mailService.sendVerificationEmail(user.email, user.username, verificationToken)

    return {
      success: true,
      message: 'Novo link de validação enviado com sucesso para seu e-mail institucional!',
    }
  }

  getGoogleLoginUrl(redirectUriOverride?: string): string {
    const clientId = this.config.get<string>('googleClientId')
    const clientSecret = this.config.get<string>('googleClientSecret')
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('corsOrigin') ||
      'http://localhost:4200'
    const redirectUri = redirectUriOverride || `${frontendUrl.replace(/\/$/, '')}/login`

    if (!clientId || !clientSecret) {
      throw new BadRequestException('GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não estão configurados no backend.')
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'select_account',
      scope: [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
    })
  }

  async loginWithGoogle(code: string, redirectUriOverride?: string): Promise<LoginResponse> {
    const clientId = this.config.get<string>('googleClientId')
    const clientSecret = this.config.get<string>('googleClientSecret')
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('corsOrigin') ||
      'http://localhost:4200'
    const redirectUri = redirectUriOverride || `${frontendUrl.replace(/\/$/, '')}/login`

    if (!clientId || !clientSecret) {
      throw new BadRequestException('GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não estão configurados no backend.')
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    let email: string | undefined
    let name: string | undefined

    try {
      const { tokens } = await oauth2Client.getToken(code.trim())
      oauth2Client.setCredentials(tokens)
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const userInfoRes = await oauth2.userinfo.get()
      email = userInfoRes.data.email?.trim().toLowerCase()
      name = userInfoRes.data.name || undefined
    } catch (err) {
      throw new BadRequestException(`Falha ao validar autenticação com a Google: ${(err as Error).message}`)
    }

    if (!email) {
      throw new BadRequestException('A conta Google não forneceu um endereço de e-mail válido.')
    }

    if (!this.isInstitutionalEmail(email)) {
      throw new BadRequestException(
        `O e-mail "${email}" não pertence a um domínio institucional autorizado (@faip.edu.br, @professor.faip.edu.br, @aluno.faip.edu.br). Por favor, utilize sua conta institucional.`,
      )
    }

    let user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })

    if (user) {
      if (!user.emailVerified || user.verificationToken) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerified: true,
            verificationToken: null,
            verificationExpires: null,
          },
        })
      }
    } else {
      let detectedRole: AccessRole = AccessRole.ALUNO
      if (email.includes('@professor.') || email.endsWith('professor.faip.edu.br')) {
        detectedRole = AccessRole.PROFESSOR
      } else if (email.includes('@coordenacao.') || email.endsWith('coordenacao.faip.edu.br')) {
        detectedRole = AccessRole.COORDENACAO
      }

      const baseUsername = email.split('@')[0]
      const count = await this.prisma.user.count({
        where: { username: { startsWith: baseUsername } },
      })
      const username = count === 0 ? baseUsername : `${baseUsername}_${count}`
      const randomPassword = randomBytes(24).toString('hex')
      const passwordHash = await argon2.hash(randomPassword)

      user = await this.prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          role: detectedRole,
          isActive: true,
          emailVerified: true,
        },
      })
    }

    const publicUser = this.toPublicUser(user)
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        username: user.username,
        role: publicUser.role,
      },
      {
        expiresIn: this.config.get<string>('jwtExpiresIn', '9h'),
      },
    )

    return { accessToken, user: publicUser }
  }

  async requestFirstAccess(email: string): Promise<{ success: boolean; message: string }> {
    if (!email || !email.trim()) {
      throw new BadRequestException('Informe o seu e-mail institucional.')
    }
    const normalizedEmail = email.trim().toLowerCase()
    if (!this.isInstitutionalEmail(normalizedEmail)) {
      throw new BadRequestException(
        'O e-mail informado não pertence ao domínio institucional (@faip.edu.br, @professor.faip.edu.br, @aluno.faip.edu.br).',
      )
    }

    let user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    })

    if (!user) {
      let detectedRole: AccessRole = AccessRole.ALUNO
      if (normalizedEmail.includes('@professor.') || normalizedEmail.endsWith('professor.faip.edu.br')) {
        detectedRole = AccessRole.PROFESSOR
      } else if (normalizedEmail.includes('@coordenacao.') || normalizedEmail.endsWith('coordenacao.faip.edu.br')) {
        detectedRole = AccessRole.COORDENACAO
      }

      const baseUsername = normalizedEmail.split('@')[0]
      const count = await this.prisma.user.count({
        where: { username: { startsWith: baseUsername } },
      })
      const username = count === 0 ? baseUsername : `${baseUsername}_${count}`
      const randomPass = randomBytes(16).toString('hex')
      const passwordHash = await argon2.hash(randomPass)

      user = await this.prisma.user.create({
        data: {
          username,
          email: normalizedEmail,
          passwordHash,
          role: detectedRole,
          isActive: true,
          emailVerified: false,
        },
      })
    }

    const verificationToken = randomBytes(32).toString('hex')
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationExpires,
      },
    })

    await this.mailService.sendVerificationEmail(user.email, user.username, verificationToken)

    return {
      success: true,
      message: 'Link de ativação enviado com sucesso para o seu e-mail institucional! Acesse sua caixa postal para validar.',
    }
  }
}
