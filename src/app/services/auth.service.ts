import { Injectable } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'unicore.authenticated'

  isAuthenticated(): boolean {
    try {
      return localStorage.getItem(this.storageKey) === 'true'
    } catch {
      return false
    }
  }

  login(username: string, password: string): boolean {
    if (!username.trim() || !password.trim()) return false
    try {
      localStorage.setItem(this.storageKey, 'true')
      return true
    } catch {
      return false
    }
  }

  logout(): void {
    try {
      localStorage.removeItem(this.storageKey)
    } catch {
      // O estado em memória não é mantido; a navegação para login continua segura.
    }
  }
}
