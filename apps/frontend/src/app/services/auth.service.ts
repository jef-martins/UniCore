import { Injectable } from '@angular/core'

export type UserRole = 'vestibular' | 'financeiro' | 'admin' | 'master'

export interface AuthUser {
  username: string
  role: UserRole
}

export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  vestibular: ['/vestibular', '/inscricao', '/agenda'],
  financeiro: ['/financeiro', '/agenda'],
  admin: ['/vestibular', '/financeiro', '/inscricao', '/administracao', '/agenda'],
  master: ['/vestibular', '/financeiro', '/inscricao', '/administracao', '/desenvolvedor', '/agenda'],
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionKey = 'unicore.auth.session'
  private readonly legacyKey = 'unicore.authenticated'

  get currentUser(): AuthUser | null {
    return this.readSession()
  }

  isAuthenticated(): boolean {
    return this.readSession() !== null
  }

  login(username: string, password: string): boolean {
    if (!username.trim() || !password.trim()) return false
    return this.setSession({ username: username.trim(), role: this.resolveLocalRole(username) })
  }

  setSession(user: AuthUser): boolean {
    if (!user.username.trim() || !this.isRole(user.role)) return false
    return this.saveSession({ username: user.username.trim(), role: user.role })
  }

  logout(): void {
    try {
      localStorage.removeItem(this.sessionKey)
      localStorage.removeItem(this.legacyKey)
    } catch {
      // A navegação para login ainda remove o acesso nesta execução.
    }
  }

  canAccess(path: string): boolean {
    const user = this.currentUser
    if (!user) return false
    return ROLE_PERMISSIONS[user.role].includes(this.normalizePath(path))
  }

  hasAnyRole(roles: readonly UserRole[]): boolean {
    const role = this.currentUser?.role
    return role !== undefined && roles.includes(role)
  }

  defaultRoute(): string {
    switch (this.currentUser?.role) {
      case 'master': return '/desenvolvedor'
      case 'admin': return '/administracao'
      case 'financeiro': return '/financeiro'
      default: return '/vestibular'
    }
  }

  roleLabel(role = this.currentUser?.role): string {
    return { vestibular: 'Vestibular', financeiro: 'Financeiro', admin: 'Administrador', master: 'Master' }[role ?? 'vestibular']
  }

  private resolveLocalRole(username: string): UserRole {
    const normalized = username.trim().toLowerCase()
    if (normalized.includes('master') || normalized.includes('desenvolvedor')) return 'master'
    if (normalized === 'admin' || normalized.includes('administrador')) return 'admin'
    if (normalized.includes('financeiro')) return 'financeiro'
    return 'vestibular'
  }

  private readSession(): AuthUser | null {
    try {
      const raw = localStorage.getItem(this.sessionKey)
      if (raw) {
        const session = JSON.parse(raw) as Partial<AuthUser>
        if (typeof session.username === 'string' && this.isRole(session.role)) return { username: session.username, role: session.role }
      }
      if (localStorage.getItem(this.legacyKey) === 'true') return { username: 'legacy', role: 'vestibular' }
    } catch {
      return null
    }
    return null
  }

  private saveSession(user: AuthUser): boolean {
    try {
      localStorage.setItem(this.sessionKey, JSON.stringify(user))
      localStorage.removeItem(this.legacyKey)
      return true
    } catch {
      return false
    }
  }

  private isRole(value: unknown): value is UserRole {
    return value === 'vestibular' || value === 'financeiro' || value === 'admin' || value === 'master'
  }

  private normalizePath(path: string): string {
    return path.split(/[?#]/, 1)[0]?.replace(/\/+$/, '') || '/'
  }
}
