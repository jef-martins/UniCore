import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import argon2 from 'argon2'
import { AccessRole } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'

export type AuthRole =
  | 'vestibular'
  | 'admin'
  | 'master'
  | 'tesouraria'
  | 'secretaria'
  | 'coordenacao'
  | 'registro_academico'

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

  toPublicUser(user: { id: string; username: string; email: string; role: AccessRole }): AuthUserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: ROLE_MAP[user.role],
    }
  }
}
