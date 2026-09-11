import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  computed,
  signal,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { AuthService, AuthUser } from '../services/auth.service'

@Component({
  selector: 'app-sector-user-select-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen) {
      <div class="modal-backdrop" (click)="onBackdropClick($event)">
        <div class="modal-dialog card card-elevated" (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <div class="modal-header">
            <div class="header-titles">
              <div class="header-badge">
                <span class="badge-icon">👥</span>
                <span>Contexto de Setor</span>
              </div>
              <h2 id="sector-modal-title">Selecionar {{ targetSectorLabel }}</h2>
              <p class="header-subtitle">
                Você está acessando o menu de <strong>{{ targetSectorLabel }}</strong>. Selecione o usuário para carregar seu contexto e histórico.
              </p>
            </div>
            <button
              class="close-btn"
              type="button"
              aria-label="Fechar modal"
              (click)="onCancel()"
            >
              ✕
            </button>
          </div>

          <!-- Search Bar -->
          <div class="search-section">
            <div class="search-input-wrapper">
              <span class="search-icon" aria-hidden="true">🔍</span>
              <input
                #searchInput
                id="sector-user-search-input"
                type="text"
                class="search-input"
                placeholder="Buscar por nome, e-mail ou username..."
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchInput($event)"
                autocomplete="off"
              />
              @if (searchQuery()) {
                <button
                  type="button"
                  class="clear-search-btn"
                  title="Limpar pesquisa"
                  (click)="clearSearch()"
                >
                  ✕
                </button>
              }
            </div>
            <div class="search-meta">
              <span class="counter-badge">
                {{ filteredUsers().length }} {{ filteredUsers().length === 1 ? 'usuário encontrado' : 'usuários encontrados' }}
              </span>
            </div>
          </div>

          <!-- Body / User List -->
          <div class="modal-body">
            @if (isLoading()) {
              <div class="loading-state">
                <div class="spinner"></div>
                <p>Carregando usuários do setor...</p>
              </div>
            } @else if (filteredUsers().length === 0) {
              <div class="empty-state">
                <div class="empty-icon">🔎</div>
                @if (searchQuery().trim()) {
                  <h3>Nenhum usuário encontrado</h3>
                  <p>Não encontramos nenhum usuário com o termo "<strong>{{ searchQuery() }}</strong>" no setor de {{ targetSectorLabel }}.</p>
                  <button type="button" class="button button-secondary btn-sm" (click)="clearSearch()">
                    Limpar termo de busca
                  </button>
                } @else {
                  <h3>Nenhum usuário no setor</h3>
                  <p>Não há usuários cadastrados atualmente para o setor de {{ targetSectorLabel }}.</p>
                }
              </div>
            } @else {
              <div class="user-list">
                @for (user of filteredUsers(); track user.id) {
                  <div
                    class="user-card"
                    tabindex="0"
                    role="button"
                    (click)="onSelectUser(user)"
                    (keydown.enter)="onSelectUser(user)"
                    (keydown.space)="onSelectUser(user)"
                    [attr.aria-label]="'Selecionar ' + user.username"
                  >
                    <div class="avatar-circle" [style.background]="getAvatarGradient(user.username)">
                      {{ getInitials(user.username) }}
                    </div>

                    <div class="user-details">
                      <div class="user-main-line">
                        <span class="user-name">{{ user.username }}</span>
                        <span class="role-tag">{{ targetSectorLabel }}</span>
                      </div>
                      <div class="user-sub-line">
                        <span class="user-email">{{ user.email }}</span>
                      </div>
                    </div>

                    <div class="user-action">
                      <button type="button" class="select-btn">
                        Selecionar →
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button
              type="button"
              class="button button-secondary"
              (click)="onCancel()"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="button button-ghost"
              title="Acessar o setor sem vincular usuário específico"
              (click)="onProceedWithoutUser()"
            >
              Avançar sem vincular
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-16, 16px);
      z-index: 2000;
      backdrop-filter: blur(6px);
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-dialog {
      background: var(--color-surface, #181D1A);
      border: 1px solid var(--color-border, #58675C);
      border-radius: var(--radius-16, 16px);
      width: 100%;
      max-width: 580px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      max-height: 85vh;
      overflow: hidden;
      animation: slideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
      from { transform: translateY(16px) scale(0.98); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--color-border, #2e3831);
      background: rgba(255, 255, 255, 0.02);
      position: relative;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-action-green, #49D17D);
      background: rgba(73, 209, 125, 0.1);
      border: 1px solid rgba(73, 209, 125, 0.25);
      padding: 2px 8px;
      border-radius: 999px;
      width: fit-content;
      margin-bottom: 4px;
    }

    .modal-header h2 {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
      color: var(--color-text-primary, #F5F7F4);
    }

    .header-subtitle {
      font-size: 0.85rem;
      color: var(--color-text-secondary, #B9C3BC);
      margin: 0;
      line-height: 1.4;
    }

    .close-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--color-text-secondary, #B9C3BC);
      font-size: 1.15rem;
      line-height: 1;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      border-color: rgba(255, 255, 255, 0.15);
    }

    .search-section {
      padding: 1rem 1.5rem 0.5rem;
      background: rgba(0, 0, 0, 0.15);
      border-bottom: 1px solid var(--color-border, #2e3831);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      font-size: 1rem;
      color: var(--color-text-secondary, #B9C3BC);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 0.65rem 2.25rem 0.65rem 2.5rem;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--color-border, #3f4a42);
      border-radius: 8px;
      color: var(--color-text-primary, #F5F7F4);
      font-size: 0.95rem;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--color-action-green, #49D17D);
      box-shadow: 0 0 0 3px rgba(73, 209, 125, 0.2);
      background: rgba(0, 0, 0, 0.5);
    }

    .clear-search-btn {
      position: absolute;
      right: 10px;
      background: transparent;
      border: none;
      color: var(--color-text-secondary, #B9C3BC);
      font-size: 0.9rem;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }

    .clear-search-btn:hover {
      color: #fff;
    }

    .search-meta {
      display: flex;
      justify-content: flex-end;
    }

    .counter-badge {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #8fa093);
    }

    .modal-body {
      padding: 1rem 1.5rem;
      overflow-y: auto;
      max-height: 420px;
      min-height: 220px;
      display: flex;
      flex-direction: column;
    }

    .user-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--color-border, #2e3831);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      outline: none;
    }

    .user-card:hover, .user-card:focus-visible {
      background: rgba(73, 209, 125, 0.08);
      border-color: rgba(73, 209, 125, 0.45);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }

    .user-card:hover .select-btn, .user-card:focus-visible .select-btn {
      background: var(--color-action-green, #49D17D);
      color: #0b1e13;
      border-color: var(--color-action-green, #49D17D);
    }

    .avatar-circle {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      color: #fff;
      text-transform: uppercase;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }

    .user-details {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .user-main-line {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .user-name {
      font-weight: 600;
      color: var(--color-text-primary, #F5F7F4);
      font-size: 0.95rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .role-tag {
      font-size: 0.7rem;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--color-text-secondary, #B9C3BC);
    }

    .user-sub-line {
      display: flex;
      align-items: center;
    }

    .user-email {
      font-size: 0.8rem;
      color: var(--color-text-secondary, #8fa093);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-action {
      flex-shrink: 0;
    }

    .select-btn {
      padding: 6px 12px;
      font-size: 0.8rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--color-border, #3f4a42);
      border-radius: 6px;
      color: var(--color-text-secondary, #B9C3BC);
      cursor: pointer;
      transition: all 0.15s ease;
      pointer-events: none;
    }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2.5rem 1rem;
      color: var(--color-text-secondary, #B9C3BC);
      gap: 8px;
      flex: 1;
    }

    .empty-icon {
      font-size: 2rem;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .empty-state h3 {
      font-size: 1.05rem;
      font-weight: 600;
      margin: 0;
      color: var(--color-text-primary, #F5F7F4);
    }

    .empty-state p {
      font-size: 0.85rem;
      margin: 0 0 8px 0;
      max-width: 380px;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(73, 209, 125, 0.2);
      border-top-color: var(--color-action-green, #49D17D);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin-bottom: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--color-border, #2e3831);
      background: rgba(0, 0, 0, 0.2);
    }

    .button {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
    }

    .button-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--color-border, #3f4a42);
      color: var(--color-text-primary, #F5F7F4);
    }

    .button-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .button-ghost {
      background: transparent;
      border: none;
      color: var(--color-text-secondary, #8fa093);
      font-size: 0.8rem;
    }

    .button-ghost:hover {
      color: var(--color-action-green, #49D17D);
      text-decoration: underline;
    }

    .btn-sm {
      padding: 4px 10px;
      font-size: 0.75rem;
    }
  `]
})
export class SectorUserSelectModalComponent implements OnChanges {
  @Input() isOpen = false
  @Input() targetSector = ''
  @Input() targetSectorLabel = ''
  @Input() targetDestination = ''

  @Output() userSelected = new EventEmitter<AuthUser>()
  @Output() closed = new EventEmitter<void>()
  @Output() proceedWithoutUser = new EventEmitter<void>()

  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>

  readonly searchQuery = signal('')
  readonly isLoading = signal(false)
  readonly allSectorUsers = signal<AuthUser[]>([])

  readonly filteredUsers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase()
    const users = this.allSectorUsers()
    if (!q) return users

    return users.filter(u => {
      const matchUsername = u.username.toLowerCase().includes(q)
      const matchEmail = u.email.toLowerCase().includes(q)
      return matchUsername || matchEmail
    })
  })

  constructor(private readonly authService: AuthService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.searchQuery.set('')
      this.loadUsers()
      setTimeout(() => {
        this.searchInputElement?.nativeElement?.focus()
      }, 50)
    } else if (changes['targetSector'] && this.isOpen) {
      this.loadUsers()
    }
  }

  loadUsers(): void {
    if (!this.targetSector) return
    this.isLoading.set(true)

    this.authService.getUsers(this.targetSector).subscribe({
      next: (users) => {
        this.allSectorUsers.set(users)
        this.isLoading.set(false)
      },
      error: () => {
        this.allSectorUsers.set([])
        this.isLoading.set(false)
      },
    })
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value)
  }

  clearSearch(): void {
    this.searchQuery.set('')
    this.searchInputElement?.nativeElement?.focus()
  }

  onSelectUser(user: AuthUser): void {
    this.userSelected.emit(user)
  }

  onCancel(): void {
    this.closed.emit()
  }

  onProceedWithoutUser(): void {
    this.proceedWithoutUser.emit()
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onCancel()
    }
  }

  getInitials(username: string): string {
    if (!username) return '?'
    const parts = username.split(/[._\s-]+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return username.slice(0, 2).toUpperCase()
  }

  getAvatarGradient(username: string): string {
    const palettes = [
      'linear-gradient(135deg, #3B82F6, #1D4ED8)',
      'linear-gradient(135deg, #10B981, #047857)',
      'linear-gradient(135deg, #8B5CF6, #6D28D9)',
      'linear-gradient(135deg, #F59E0B, #D97706)',
      'linear-gradient(135deg, #EC4899, #BE185D)',
      'linear-gradient(135deg, #06B6D4, #0E7490)',
    ]
    let hash = 0
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % palettes.length
    return palettes[index]
  }
}
