import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { catchError, throwError } from 'rxjs'
import { AuthService } from '../services/auth.service'

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService)
  const accessToken = authService.accessToken
  const authorizedRequest = accessToken
    ? request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : request

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      const isApiRequest = request.url.includes('/api/')
      const isLoginRequest = request.url.endsWith('/api/auth/login')
      if (isApiRequest && !isLoginRequest && error instanceof HttpErrorResponse && error.status === 401) {
        authService.logout()
      }
      return throwError(() => error)
    }),
  )
}
