import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { catchError, map, of, tap, type Observable } from 'rxjs'

export type UserRole =
  | 'vestibular'
  | 'admin'
  | 'master'
  | 'tesouraria'
  | 'secretaria'
  | 'coordenacao'
  | 'registro_academico'

export interface AuthUser {
  id: string
  username: string
  email: string
  role: UserRole
}

interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  vestibular: ['/vestibular', '/inscricao', '/agenda'],
  tesouraria: ['/tesouraria', '/agenda'],
  secretaria: ['/secretaria', '/agenda'],
  coordenacao: ['/coordenacao', '/agenda'],
  registro_academico: ['/registro-academico', '/agenda'],
  admin: [
    '/vestibular', '/inscricao', '/tesouraria', '/secretaria',
    '/coordenacao', '/registro-academico', '/administracao', '/agenda',
  ],
  master: [
    '/vestibular', '/inscricao', '/tesouraria', '/secretaria',
    '/coordenacao', '/registro-academico', '/administracao', '/desenvolvedor', '/agenda',
  ],
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'unicore.auth'
  private userValue: AuthUser | null = null
  private accessTokenValue: string | null = null

  constructor(private readonly http: HttpClient) {
    this.restoreSession()
  }

  get currentUser(): AuthUser | null {
    return this.userValue
  }

  get accessToken(): string | null {
    return this.accessTokenValue
  }

  isAuthenticated(): boolean {
    return this.accessTokenValue !== null && this.userValue !== null
  }

  login(identifier: string, password: string): Observable<boolean> {
    if (!identifier.trim() || !password) return of(false)

    return this.http.post<LoginResponse>('/api/auth/login', {
      identifier: identifier.trim(),
      password,
    }).pipe(
      tap((response) => {
        this.accessTokenValue = response.accessToken
        this.userValue = response.user
        this.persistSession()
      }),
      map(() => true),
      catchError(() => {
        this.logout()
        return of(false)
      }),
    )
  }

  logout(): void {
    this.accessTokenValue = null
    this.userValue = null
    localStorage.removeItem(this.storageKey)
  }

  canAccess(path: string): boolean {
    const user = this.currentUser
    if (!user) return false
    const normalizedPath = this.normalizePath(path)
    if (normalizedPath === '/agenda') return true
    return ROLE_PERMISSIONS[user.role]?.includes(normalizedPath) ?? false
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
      admin: 'Administrador',
      master: 'Master',
    }[role ?? 'vestibular']
  }

  private normalizePath(path: string): string {
    return path.split(/[?#]/, 1)[0]?.replace(/\/+$/, '') || '/'
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
      if (typeof session.accessToken === 'string' && session.user && typeof session.user === 'object') {
        this.accessTokenValue = session.accessToken
        this.userValue = session.user as AuthUser
      } else {
        localStorage.removeItem(this.storageKey)
      }
    } catch {
      localStorage.removeItem(this.storageKey)
    }
  }
}
