import { Injectable, signal } from '@angular/core'
import { AuthUser, UserRole } from './auth.service'

export interface SectorContextState {
  user: AuthUser
  sector: string
}

export const PATH_SECTOR_MAP: Record<string, string> = {
  vestibular: 'vestibular',
  tesouraria: 'tesouraria',
  secretaria: 'secretaria',
  coordenacao: 'coordenacao',
  'registro-academico': 'registro_academico',
  professor: 'professor',
  aluno: 'aluno',
  administracao: 'admin',
  desenvolvedor: 'master',
}

export const SECTOR_LABELS: Record<string, string> = {
  vestibular: 'Vestibular',
  tesouraria: 'Tesouraria',
  secretaria: 'Secretaria',
  coordenacao: 'Coordenação',
  registro_academico: 'Registro Acadêmico',
  aluno: 'Aluno',
  professor: 'Professor',
  admin: 'Administração',
  master: 'Desenvolvedor',
}

@Injectable({ providedIn: 'root' })
export class SectorContextService {
  private readonly storageKey = 'unicore.sector_context'

  readonly activeContextUser = signal<AuthUser | null>(null)
  readonly activeContextSector = signal<string | null>(null)

  constructor() {
    this.restoreContext()
  }

  setContextUser(user: AuthUser, sector: string): void {
    this.activeContextUser.set(user)
    this.activeContextSector.set(sector)

    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify({ user, sector }))
    } catch {
      // Ignora erro caso armazenamento local esteja desabilitado
    }
  }

  clearContextUser(): void {
    this.activeContextUser.set(null)
    this.activeContextSector.set(null)

    try {
      sessionStorage.removeItem(this.storageKey)
    } catch {
      // Ignora erro
    }
  }

  getSectorFromPath(path: string): string | null {
    if (!path) return null
    const normalized = path.split(/[?#]/, 1)[0].replace(/^\/+/, '')
    const firstSegment = normalized.split('/')[0]?.toLowerCase()
    if (!firstSegment) return null
    return PATH_SECTOR_MAP[firstSegment] ?? null
  }

  getSectorLabel(sector: string | null): string {
    if (!sector) return ''
    return SECTOR_LABELS[sector] ?? sector
  }

  private restoreContext(): void {
    try {
      const raw = sessionStorage.getItem(this.storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as SectorContextState
      if (parsed && parsed.user && parsed.sector) {
        this.activeContextUser.set(parsed.user)
        this.activeContextSector.set(parsed.sector)
      }
    } catch {
      this.clearContextUser()
    }
  }
}
