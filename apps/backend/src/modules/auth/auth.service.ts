import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import argon2 from 'argon2'
import { AccessRole } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'

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
  ) {}

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

  async findAllUsers(requestUser: { sub: string; role: AuthRole }): Promise<AuthUserResponse[]> {
    const whereClause: any = { isActive: true }
    
    if (requestUser.role === 'master') {
      // Master vê todo mundo, não aplica filtro extra de role
    } else if (requestUser.role === 'admin') {
      whereClause.role = { not: 'MASTER' };
    } else {
      const accessRole = (Object.keys(ROLE_MAP) as AccessRole[]).find(
        (key) => ROLE_MAP[key] === requestUser.role
      )
      if (accessRole) {
        if (requestUser.role === 'aluno') {
          whereClause.id = requestUser.sub; // Aluno vê apenas a si mesmo
        } else if (requestUser.role === 'coordenacao') {
          whereClause.role = { in: [accessRole, 'ALUNO', 'PROFESSOR'] }; // Coordenação vê alunos e professores
        } else {
          whereClause.role = { in: [accessRole, 'ALUNO'] }; // Outros vêem seu setor + alunos
        }
      }
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      orderBy: { username: 'asc' },
    })
    return users.map(u => this.toPublicUser(u))
  }

  toPublicUser(user: { id: string; username: string; email: string; role: AccessRole }): AuthUserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: ROLE_MAP[user.role],
    }
  }

  async createUser(dto: CreateUserDto): Promise<AuthUserResponse> {
    const accessRole = (Object.keys(ROLE_MAP) as AccessRole[]).find(
      (key) => ROLE_MAP[key] === dto.role
    )

    if (!accessRole) {
      throw new ConflictException('Papel de acesso inválido.')
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username },
          { email: dto.email }
        ]
      }
    })

    if (existing) {
      throw new ConflictException('Nome de usuário ou e-mail já estão em uso.')
    }

    const passwordHash = await argon2.hash(dto.password)

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        role: accessRole,
        isActive: true,
      }
    })

    return this.toPublicUser(user)
  }
}
