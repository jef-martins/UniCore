import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { AuthenticatedRequest } from './jwt-auth.guard'
import { ROLES_KEY } from './roles.decorator'
import type { AuthRole } from './auth.service'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AuthRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!roles?.length) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    if (request.user && roles.includes(request.user.role)) return true

    throw new ForbiddenException('O perfil não possui acesso a este recurso.')
  }
}
