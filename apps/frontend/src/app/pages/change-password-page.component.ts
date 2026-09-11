import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router, RouterModule } from '@angular/router'
import { AuthService } from '../services/auth.service'

@Component({
  selector: 'app-change-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="change-password-page" aria-labelledby="page-title">
      <!-- Cabeçalho -->
      <header class="page-header-container">
        <div class="header-info">
          <p class="hero-eyebrow">{{ contextRoleLabel }} · Segurança da Conta</p>
          <h1 id="page-title" class="page-title">Alteração de Senha</h1>
          <p class="page-subtitle">
            Atualize sua credencial de acesso para manter sua conta institucional sempre protegida.
          </p>
        </div>
      </header>

      <!-- Mensagens Globais de Sucesso ou Erro -->
      @if (successMessage) {
        <div class="feedback-alert feedback-success" role="status">
          <span>✓ {{ successMessage }}</span>
          <button class="btn-close" (click)="successMessage = ''" aria-label="Fechar">✕</button>
        </div>
      }
      @if (errorMessage) {
        <div class="feedback-alert feedback-error" role="alert">
          <span>⚠ {{ errorMessage }}</span>
          <button class="btn-close" (click)="errorMessage = ''" aria-label="Fechar">✕</button>
        </div>
      }

      <div class="content-layout">
        <!-- Coluna Esquerda: Formulário de Troca de Senha -->
        <div class="form-column">
          <!-- Card de Identificação do Usuário -->
          <div class="card card-outlined user-identity-card">
            <div class="user-avatar-circle">
              {{ userInitials }}
            </div>
            <div class="user-details">
              <div class="username-display">{{ authService.currentUser?.username }}</div>
              <div class="email-display">{{ authService.currentUser?.email }}</div>
              <div class="role-tag">{{ authService.roleLabel() }}</div>
            </div>
          </div>

          <!-- Formulário -->
          <div class="card card-outlined form-card">
            <h2 class="form-title">Definir Nova Senha de Acesso</h2>
            <p class="form-instructions">
              Informe sua senha atual para validação de segurança e escolha sua nova senha.
            </p>

            <form (ngSubmit)="submitChangePassword()">
              <!-- Senha Atual -->
              <div class="field">
                <label class="field-label" for="current-password">Senha Atual *</label>
                <div class="input-password-wrapper">
                  <input
                    id="current-password"
                    class="field-control password-input"
                    [type]="showCurrentPassword ? 'text' : 'password'"
                    [(ngModel)]="formData.currentPassword"
                    name="currentPassword"
                    required
                    placeholder="Digite sua senha atual"
                    autocomplete="current-password"
                  />
                  <button
                    type="button"
                    class="toggle-eye-btn"
                    (click)="showCurrentPassword = !showCurrentPassword"
                    [attr.aria-label]="showCurrentPassword ? 'Ocultar senha' : 'Ver senha'"
                  >
                    {{ showCurrentPassword ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>

              <!-- Nova Senha -->
              <div class="field">
                <label class="field-label" for="new-password">Nova Senha *</label>
                <div class="input-password-wrapper">
                  <input
                    id="new-password"
                    class="field-control password-input"
                    [type]="showNewPassword ? 'text' : 'password'"
                    [(ngModel)]="formData.newPassword"
                    name="newPassword"
                    required
                    placeholder="Mínimo de 6 caracteres"
                    autocomplete="new-password"
                  />
                  <button
                    type="button"
                    class="toggle-eye-btn"
                    (click)="showNewPassword = !showNewPassword"
                    [attr.aria-label]="showNewPassword ? 'Ocultar senha' : 'Ver senha'"
                  >
                    {{ showNewPassword ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>

              <!-- Confirmar Nova Senha -->
              <div class="field">
                <label class="field-label" for="confirm-password">Confirmar Nova Senha *</label>
                <div class="input-password-wrapper">
                  <input
                    id="confirm-password"
                    class="field-control password-input"
                    [type]="showConfirmPassword ? 'text' : 'password'"
                    [(ngModel)]="formData.confirmPassword"
                    name="confirmPassword"
                    required
                    placeholder="Repita a nova senha exatamente igual"
                    autocomplete="new-password"
                  />
                  <button
                    type="button"
                    class="toggle-eye-btn"
                    (click)="showConfirmPassword = !showConfirmPassword"
                    [attr.aria-label]="showConfirmPassword ? 'Ocultar senha' : 'Ver senha'"
                  >
                    {{ showConfirmPassword ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>

              <!-- Validações Visuais em Tempo Real -->
              <div class="checklist-container">
                <div class="check-item" [class.valid]="hasMinLength">
                  <span class="check-icon">{{ hasMinLength ? '✓' : '○' }}</span>
                  <span>Mínimo de 6 caracteres</span>
                </div>
                <div class="check-item" [class.valid]="isDifferentFromCurrent">
                  <span class="check-icon">{{ isDifferentFromCurrent ? '✓' : '○' }}</span>
                  <span>Diferente da senha atual</span>
                </div>
                <div class="check-item" [class.valid]="passwordsMatch && formData.confirmPassword.length > 0">
                  <span class="check-icon">{{ (passwordsMatch && formData.confirmPassword.length > 0) ? '✓' : '○' }}</span>
                  <span>Confirmação idêntica à nova senha</span>
                </div>
              </div>

              <!-- Ações do Formulário -->
              <div class="form-actions">
                <button
                  class="button button-primary"
                  type="submit"
                  [disabled]="isSubmitting || !isFormValid"
                >
                  {{ isSubmitting ? 'Salvando...' : 'Salvar Nova Senha' }}
                </button>
                <button
                  class="button button-secondary"
                  type="button"
                  (click)="cancel()"
                >
                  Voltar
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Coluna Direita: Dicas de Segurança Institucional -->
        <aside class="tips-column">
          <div class="card card-outlined tips-card">
            <h3 class="tips-title">🛡️ Recomendações de Segurança</h3>
            <ul class="tips-list">
              <li>
                <strong>Use uma senha exclusiva:</strong> Não utilize a mesma senha de redes sociais ou e-mails pessoais.
              </li>
              <li>
                <strong>Combine caracteres:</strong> Misture letras maiúsculas, minúsculas, números e caracteres especiais.
              </li>
              <li>
                <strong>Evite dados óbvios:</strong> Não utilize nomes familiares, datas comemorativas ou partes do seu usuário.
              </li>
              <li>
                <strong>Segurança permanente:</strong> Nunca compartilhe suas credenciais. A equipe de TI jamais solicitará sua senha.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  `,
  styles: [`
    .change-password-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-24, 24px);
      padding-bottom: var(--space-48, 48px);
      max-width: 1000px;
    }

    .page-header-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* Feedback Alerts */
    .feedback-alert {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-12, 12px) var(--space-16, 16px);
      border-radius: var(--radius-8, 8px);
      font-size: var(--font-size-14, 14px);
      animation: fadeIn 0.2s ease-in-out;
    }

    .feedback-success {
      background: rgba(73, 209, 125, 0.15);
      border: 1px solid var(--color-action-green, #49D17D);
      color: #A3F5C3;
    }

    .feedback-error {
      background: rgba(255, 122, 122, 0.15);
      border: 1px solid var(--color-error, #FF7A7A);
      color: #FFB3B3;
    }

    .btn-close {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 0 4px;
      opacity: 0.7;
    }
    .btn-close:hover { opacity: 1; }

    /* Layout */
    .content-layout {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: var(--space-24, 24px);
      align-items: start;
    }

    @media (max-width: 800px) {
      .content-layout {
        grid-template-columns: 1fr;
      }
    }

    .form-column {
      display: flex;
      flex-direction: column;
      gap: var(--space-16, 16px);
    }

    /* Card Identidade */
    .user-identity-card {
      padding: var(--space-16, 16px) var(--space-20, 20px);
      background: var(--color-surface, #181D1A);
      border-radius: var(--radius-12, 12px);
      display: flex;
      align-items: center;
      gap: var(--space-16, 16px);
    }

    .user-avatar-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10B981, #059669);
      color: #FFFFFF;
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .username-display {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary, #F5F7F4);
    }

    .email-display {
      font-size: 13px;
      color: var(--color-text-secondary, #B9C3BC);
    }

    .role-tag {
      display: inline-block;
      align-self: flex-start;
      margin-top: 4px;
      padding: 1px 8px;
      border-radius: var(--radius-pill, 999px);
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--color-border, #58675C);
      font-size: 11px;
      font-weight: 600;
      color: #E2E8F0;
    }

    /* Form Card */
    .form-card {
      padding: var(--space-24, 24px);
      background: var(--color-surface, #181D1A);
      border-radius: var(--radius-12, 12px);
    }

    .form-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 6px 0;
      color: var(--color-text-primary, #F5F7F4);
    }

    .form-instructions {
      font-size: 13px;
      color: var(--color-text-secondary, #B9C3BC);
      margin: 0 0 var(--space-20, 20px) 0;
    }

    .input-password-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .password-input {
      padding-right: 42px;
      width: 100%;
    }

    .toggle-eye-btn {
      position: absolute;
      right: 8px;
      background: transparent;
      border: none;
      font-size: 16px;
      cursor: pointer;
      color: var(--color-text-secondary, #B9C3BC);
      padding: 6px;
      line-height: 1;
      opacity: 0.7;
      transition: opacity 0.15s;
    }
    .toggle-eye-btn:hover { opacity: 1; }

    /* Checklist */
    .checklist-container {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(88, 103, 92, 0.3);
      border-radius: var(--radius-8, 8px);
      padding: var(--space-12, 12px);
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: var(--space-16, 16px) 0;
    }

    .check-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--color-text-secondary, #B9C3BC);
      transition: color 0.15s;
    }

    .check-item.valid {
      color: var(--color-action-green, #49D17D);
      font-weight: 500;
    }

    .check-icon {
      font-size: 13px;
      font-weight: 700;
    }

    .form-actions {
      display: flex;
      gap: var(--space-12, 12px);
      margin-top: var(--space-20, 20px);
    }

    /* Tips Card */
    .tips-card {
      padding: var(--space-20, 20px);
      background: var(--color-surface, #181D1A);
      border-radius: var(--radius-12, 12px);
    }

    .tips-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--color-text-primary, #F5F7F4);
      margin: 0 0 var(--space-12, 12px) 0;
    }

    .tips-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-12, 12px);
      font-size: 13px;
      color: var(--color-text-secondary, #B9C3BC);
      line-height: 1.5;
    }

    .tips-list li strong {
      color: var(--color-text-primary, #F5F7F4);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ChangePasswordPageComponent {
  formData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }

  showCurrentPassword = false
  showNewPassword = false
  showConfirmPassword = false

  isSubmitting = false
  successMessage = ''
  errorMessage = ''

  get contextRoleLabel(): string {
    return this.authService.roleLabel()
  }

  get userInitials(): string {
    const user = this.authService.currentUser
    if (!user || !user.username) return 'UC'
    const parts = user.username.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  get hasMinLength(): boolean {
    return this.formData.newPassword.length >= 6
  }

  get isDifferentFromCurrent(): boolean {
    if (!this.formData.newPassword || !this.formData.currentPassword) return false
    return this.formData.newPassword !== this.formData.currentPassword
  }

  get passwordsMatch(): boolean {
    if (!this.formData.newPassword) return false
    return this.formData.newPassword === this.formData.confirmPassword
  }

  get isFormValid(): boolean {
    return (
      this.formData.currentPassword.length > 0 &&
      this.hasMinLength &&
      this.isDifferentFromCurrent &&
      this.passwordsMatch
    )
  }

  constructor(
    public readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  submitChangePassword(): void {
    if (!this.formData.currentPassword) {
      this.errorMessage = 'Informe a sua senha atual.'
      return
    }

    if (!this.hasMinLength) {
      this.errorMessage = 'A nova senha deve possuir no mínimo 6 caracteres.'
      return
    }

    if (!this.isDifferentFromCurrent) {
      this.errorMessage = 'A nova senha deve ser diferente da senha atual.'
      return
    }

    if (!this.passwordsMatch) {
      this.errorMessage = 'A confirmação de senha não confere com a nova senha digitada.'
      return
    }

    this.isSubmitting = true
    this.errorMessage = ''
    this.successMessage = ''

    this.authService.changePassword(this.formData.currentPassword, this.formData.newPassword).subscribe({
      next: (res) => {
        this.isSubmitting = false
        this.successMessage = res.message || 'Senha alterada com sucesso!'
        this.formData = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }
      },
      error: (err) => {
        this.isSubmitting = false
        this.errorMessage = err.error?.message || 'Erro ao alterar senha. Verifique se a senha atual está correta.'
      },
    })
  }

  cancel(): void {
    void this.router.navigateByUrl(this.authService.defaultRoute())
  }
}
