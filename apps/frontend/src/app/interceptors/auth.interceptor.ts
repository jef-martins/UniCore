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
      const isPublicAuthEndpoint =
        request.url.includes('/api/auth/login') ||
        request.url.includes('/api/auth/google/callback') ||
        request.url.includes('/api/auth/google/url') ||
        request.url.includes('/api/auth/verify-email') ||
        request.url.includes('/api/auth/request-first-access') ||
        request.url.includes('/api/auth/resend-verification')

      if (isApiRequest && !isPublicAuthEndpoint && error instanceof HttpErrorResponse && error.status === 401) {
        authService.handleTokenExpired()
      }
      return throwError(() => error)
    }),
  )
}
