import { inject } from '@angular/core'
import type { CanActivateFn } from '@angular/router'
import { Router } from '@angular/router'
import { AuthService, type UserRole } from '../services/auth.service'

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService)
  const router = inject(Router)

  if (authService.isAuthenticated()) return true

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  })
}


export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService)
  const router = inject(Router)
  const roles = (route.data['roles'] ?? []) as UserRole[]

  return authService.hasAnyRole(roles)
    ? true
    : router.createUrlTree([authService.defaultRoute()])
}
