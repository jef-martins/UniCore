import { Injectable, NgZone, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { catchError, map, of, tap, type Observable } from 'rxjs'
import { isTokenExpired, parseJwtPayload } from './jwt-utils'

export type UserRole =
  | 'vestibular'
  | 'admin'
  | 'master'
  | 'tesouraria'
  | 'secretaria'
  | 'coordenacao'
  | 'registro_academico'
  | 'aluno'
  | 'professor'

export interface AuthUser {
  id: string
  username: string
  email: string
  role: UserRole
  emailVerified?: boolean
  validationUrl?: string
}

export interface LoginError {
  code?: string
  message: string
  email?: string
}

interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  vestibular: ['/vestibular', '/aluno', '/agenda'],
  tesouraria: ['/tesouraria', '/aluno', '/agenda'],
  secretaria: ['/secretaria', '/aluno', '/agenda'],
  coordenacao: ['/coordenacao', '/aluno', '/professor', '/agenda'],
  registro_academico: ['/registro-academico', '/aluno', '/agenda'],
  aluno: ['/aluno', '/agenda'],
  professor: ['/professor', '/aluno', '/agenda'],
  admin: [
    '/dashboards', '/vestibular', '/tesouraria', '/secretaria',
    '/coordenacao', '/registro-academico', '/professor', '/aluno', '/administracao', '/agenda',
  ],
  master: [
    '/dashboards', '/vestibular', '/tesouraria', '/secretaria',
    '/coordenacao', '/registro-academico', '/professor', '/aluno', '/administracao', '/desenvolvedor', '/agenda',
  ],
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'unicore.auth'
  private userValue: AuthUser | null = null
  private accessTokenValue: string | null = null
  private expirationTimer: ReturnType<typeof setTimeout> | null = null
  private readonly router = inject(Router, { optional: true })
  private readonly ngZone = inject(NgZone, { optional: true })
  lastLoginError: LoginError | null = null

  constructor(private readonly http: HttpClient) {
    this.restoreSession()
    this.setupWindowListeners()
  }

  get currentUser(): AuthUser | null {
    if (this.accessTokenValue && this.isTokenExpired(this.accessTokenValue)) {
      this.handleTokenExpired()
      return null
    }
    return this.userValue
  }

  get accessToken(): string | null {
    if (this.accessTokenValue && this.isTokenExpired(this.accessTokenValue)) {
      this.handleTokenExpired()
      return null
    }
    return this.accessTokenValue
  }

  isAuthenticated(): boolean {
    if (!this.accessTokenValue || !this.userValue) {
      return false
    }
    if (this.isTokenExpired(this.accessTokenValue)) {
      this.handleTokenExpired()
      return false
    }
    return true
  }

  isTokenExpired(token: string | null = this.accessTokenValue): boolean {
    return isTokenExpired(token)
  }

  login(identifier: string, password: string): Observable<boolean> {
    this.lastLoginError = null
    if (!identifier.trim() || !password) return of(false)

    return this.http.post<LoginResponse>('/api/auth/login', {
      identifier: identifier.trim(),
      password,
    }).pipe(
      tap((response) => {
        this.accessTokenValue = response.accessToken
        this.userValue = response.user
        this.persistSession()
        this.scheduleTokenExpiration(response.accessToken)
      }),
      map(() => true),
      catchError((err) => {
        this.logout()
        const errorBody = err?.error
        if (errorBody?.code === 'EMAIL_NOT_VERIFIED') {
          this.lastLoginError = {
            code: 'EMAIL_NOT_VERIFIED',
            message: errorBody.message || 'E-mail institucional ainda não validado.',
            email: errorBody.email,
          }
        } else {
          this.lastLoginError = {
            code: 'INVALID_CREDENTIALS',
            message: errorBody?.message || 'Usuário/e-mail ou senha inválidos.',
          }
        }
        return of(false)
      }),
    )
  }

  logout(): void {
    if (this.expirationTimer) {
      clearTimeout(this.expirationTimer)
      this.expirationTimer = null
    }
    this.accessTokenValue = null
    this.userValue = null
    localStorage.removeItem(this.storageKey)
  }

  canAccess(path: string): boolean {
    const user = this.currentUser
    if (!user) return false
    const normalizedPath = this.normalizePath(path)
    if (normalizedPath === '/agenda' || normalizedPath.startsWith('/agenda/')) return true
    if (normalizedPath === '/alterar-senha' || normalizedPath.endsWith('/alterar-senha')) return true
    
    const permissions = ROLE_PERMISSIONS[user.role] ?? []
    return permissions.some(p => normalizedPath === p || normalizedPath.startsWith(`${p}/`))
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>('/api/auth/change-password', {
      currentPassword,
      newPassword,
    })
  }

  verifyEmail(token: string): Observable<{ success: boolean; message: string; email?: string }> {
    return this.http.post<{ success: boolean; message: string; email?: string }>('/api/auth/verify-email', {
      token,
    })
  }

  resendVerification(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>('/api/auth/resend-verification', {
      email,
    })
  }

  getGoogleAuthUrl(redirectUri?: string): Observable<{ url: string }> {
    const params: Record<string, string> = {}
    if (redirectUri) params['redirectUri'] = redirectUri
    return this.http.get<{ url: string }>('/api/auth/google/url', { params })
  }

  loginWithGoogle(code: string, redirectUri?: string): Observable<boolean> {
    this.lastLoginError = null
    return this.http.post<LoginResponse>('/api/auth/google/callback', {
      code,
      redirectUri,
    }).pipe(
      tap((response) => {
        this.accessTokenValue = response.accessToken
        this.userValue = response.user
        this.persistSession()
        this.scheduleTokenExpiration(response.accessToken)
      }),
      map(() => true),
      catchError((err) => {
        this.logout()
        const errorBody = err?.error
        this.lastLoginError = {
          code: 'GOOGLE_LOGIN_ERROR',
          message: errorBody?.message || 'Falha ao autenticar com a conta Google institucional.',
        }
        return of(false)
      }),
    )
  }

  requestFirstAccess(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>('/api/auth/request-first-access', {
      email,
    })
  }

  hasAnyRole(roles: readonly UserRole[]): boolean {
    const role = this.currentUser?.role
    return role !== undefined && roles.includes(role)
  }

  defaultRoute(): string {
    switch (this.currentUser?.role) {
      case 'master': return '/desenvolvedor'
      case 'admin': return '/administracao'
      case 'tesouraria': return '/tesouraria'
      case 'secretaria': return '/secretaria'
      case 'coordenacao': return '/coordenacao'
      case 'registro_academico': return '/registro-academico'
      case 'aluno': return '/agenda'
      case 'professor': return '/agenda'
      default: return '/vestibular'
    }
  }

  roleLabel(role = this.currentUser?.role): string {
    return {
      vestibular: 'Vestibular',
      tesouraria: 'Tesouraria',
      secretaria: 'Secretaria',
      coordenacao: 'Coordenação',
      registro_academico: 'Registro Acadêmico',
      aluno: 'Aluno',
      professor: 'Professor',
      admin: 'Administrador',
      master: 'Master',
    }[role ?? 'vestibular']
  }

  private normalizePath(path: string): string {
    return path.split(/[?#]/, 1)[0]?.replace(/\/+$/, '') || '/'
  }

  getUsers(sector?: string, search?: string): Observable<AuthUser[]> {
    const params: Record<string, string> = {}
    if (sector) params['sector'] = sector
    if (search && search.trim()) params['search'] = search.trim()
    return this.http.get<AuthUser[]>('/api/auth/users', { params })
  }

  handleTokenExpired(): void {
    this.logout()
    if (this.router) {
      const runNav = () => {
        const currentUrl = this.router?.url ?? ''
        const isPublicRoute =
          currentUrl.startsWith('/login') ||
          currentUrl.startsWith('/verificar-email') ||
          currentUrl.startsWith('/inscricao')

        if (!isPublicRoute) {
          void this.router?.navigate(['/login'], {
            queryParams: {
              expired: 'true',
              returnUrl: currentUrl && currentUrl !== '/' ? currentUrl : undefined,
            },
          })
        }
      }

      if (this.ngZone) {
        this.ngZone.run(runNav)
      } else {
        runNav()
      }
    }
  }

  private scheduleTokenExpiration(token: string): void {
    if (this.expirationTimer) {
      clearTimeout(this.expirationTimer)
      this.expirationTimer = null
    }

    const payload = parseJwtPayload(token)
    if (!payload?.exp || typeof payload.exp !== 'number') return

    const expiresInMs = (payload.exp - 5) * 1000 - Date.now()
    if (expiresInMs <= 0) {
      this.handleTokenExpired()
      return
    }

    this.expirationTimer = setTimeout(() => {
      this.handleTokenExpired()
    }, expiresInMs)
  }

  private setupWindowListeners(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkExpirationAndRedirect()
      }
    })

    window.addEventListener('focus', () => {
      this.checkExpirationAndRedirect()
    })
  }

  private checkExpirationAndRedirect(): void {
    if (this.accessTokenValue && this.isTokenExpired(this.accessTokenValue)) {
      this.handleTokenExpired()
    }
  }

  private persistSession(): void {
    localStorage.setItem(this.storageKey, JSON.stringify({
      accessToken: this.accessTokenValue,
      user: this.userValue,
    }))
  }

  private restoreSession(): void {
    const rawSession = localStorage.getItem(this.storageKey)
    if (!rawSession) return

    try {
      const session = JSON.parse(rawSession) as { accessToken?: unknown; user?: unknown }
      if (
        typeof session.accessToken === 'string' &&
        session.user &&
        typeof session.user === 'object' &&
        !this.isTokenExpired(session.accessToken)
      ) {
        this.accessTokenValue = session.accessToken
        this.userValue = session.user as AuthUser
        this.scheduleTokenExpiration(session.accessToken)
      } else {
        this.logout()
      }
    } catch {
      this.logout()
    }
  }
}
