import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import type { AuthRole } from './auth.service'

export interface JwtPayload {
  sub: string
  username: string
  role: AuthRole
  iat?: number
  exp?: number
}

export type AuthenticatedRequest = Request & { user: JwtPayload }

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authorization = request.headers.authorization
    const [scheme, token] = authorization?.split(' ') ?? []

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Token de acesso ausente.')
    }

    try {
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token)
      return true
    } catch {
      throw new UnauthorizedException('Token de acesso inválido ou expirado.')
    }
  }
}
