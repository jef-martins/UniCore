import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import { AuthService } from '../services/auth.service'

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <main class="auth-page" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; background: radial-gradient(circle at top right, rgba(14, 165, 233, 0.15), transparent 45%), radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.1), transparent 40%), #0b0f19;">
      <section class="card card-elevated" style="max-width: 520px; width: 100%; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 2.5rem; background: rgba(30, 41, 59, 0.8); backdrop-filter: blur(16px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); text-align: center;">
        
        <div style="width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, #0284c7, #2563eb); display: inline-flex; align-items: center; justify-content: center; font-size: 26px; font-weight: bold; color: white; margin-bottom: 1.5rem; box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);">
          U
        </div>

        <h1 style="font-size: 1.6rem; font-weight: 700; color: #f8fafc; margin-bottom: 0.5rem; letter-spacing: -0.5px;">
          Validação de E-mail Institucional
        </h1>
        <p style="color: #94a3b8; font-size: 0.95rem; margin-bottom: 2rem;">
          Portal Acadêmico UniCore • FAIP
        </p>

        <!-- Estado 1: Carregando / Validando -->
        @if (state === 'validating') {
          <div style="padding: 2rem 0;">
            <div style="width: 44px; height: 44px; border: 3px solid rgba(56, 189, 248, 0.2); border-top-color: #38bdf8; border-radius: 50%; margin: 0 auto 1.5rem auto; animation: spin 0.8s linear infinite;"></div>
            <h2 style="font-size: 1.1rem; color: #e2e8f0; font-weight: 500; margin: 0;">Validando seu e-mail institucional...</h2>
            <p style="color: #64748b; font-size: 0.85rem; margin-top: 0.5rem;">Aguarde um instante enquanto confirmamos sua autorização.</p>
          </div>
        }

        <!-- Estado 2: Sucesso -->
        @if (state === 'success') {
          <div style="padding: 1rem 0;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 2px solid #10b981; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; color: #10b981; margin-bottom: 1.25rem;">
              ✓
            </div>
            <h2 style="font-size: 1.25rem; color: #10b981; font-weight: 600; margin-bottom: 0.75rem;">E-mail Confirmado com Sucesso!</h2>
            <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.75rem;">
              Seu e-mail institucional <strong>{{ verifiedEmail }}</strong> foi autenticado com êxito. Sua conta está ativa e pronta para uso no UniCore.
            </p>
            <a routerLink="/login" class="button button-primary" style="display: inline-block; width: 100%; text-decoration: none; padding: 0.85rem 1.5rem; font-size: 1rem; font-weight: 600; border-radius: 8px;">
              Ir para o Login →
            </a>
          </div>
        }

        <!-- Estado 3: Erro / Expirado -->
        @if (state === 'error') {
          <div style="padding: 1rem 0; text-align: left;">
            <div style="display: flex; align-items: center; gap: 0.75rem; color: #ef4444; margin-bottom: 1rem;">
              <span style="font-size: 1.8rem;">⚠️</span>
              <h2 style="font-size: 1.15rem; color: #ef4444; font-weight: 600; margin: 0;">Não foi possível validar</h2>
            </div>
            
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 1rem; color: #fca5a5; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem;">
              {{ errorMessage }}
            </div>

            <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 1.25rem; margin-top: 1.25rem;">
              <h3 style="font-size: 0.95rem; color: #f1f5f9; font-weight: 600; margin-bottom: 0.5rem;">Deseja receber um novo link?</h3>
              <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 1rem;">
                Informe seu e-mail institucional para receber um novo link de ativação válido por 24 horas:
              </p>

              @if (resendMessage) {
                <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 0.75rem; color: #34d399; font-size: 0.85rem; margin-bottom: 1rem;">
                  {{ resendMessage }}
                </div>
              }

              <form (ngSubmit)="resend()" style="display: flex; flex-direction: column; gap: 0.75rem;">
                <input
                  type="email"
                  class="field-control"
                  placeholder="ex: seu.nome@faip.edu.br"
                  [(ngModel)]="resendEmail"
                  name="resendEmail"
                  required
                  style="width: 100%; box-sizing: border-box;"
                />
                <button
                  type="submit"
                  class="button button-outline"
                  [disabled]="isResending || !resendEmail.trim()"
                  style="width: 100%;"
                >
                  {{ isResending ? 'Reenviando...' : '✉️ Reenviar Link de Validação' }}
                </button>
              </form>
            </div>

            <div style="text-align: center; margin-top: 1.5rem;">
              <a routerLink="/login" style="color: #38bdf8; font-size: 0.85rem; text-decoration: none;">
                ← Voltar para a tela de login
              </a>
            </div>
          </div>
        }

      </section>
    </main>
  `,
  styles: [`
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class VerifyEmailPageComponent implements OnInit {
  state: 'validating' | 'success' | 'error' = 'validating'
  errorMessage = ''
  verifiedEmail = ''
  resendEmail = ''
  resendMessage = ''
  isResending = false

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')
    if (!token || !token.trim()) {
      this.state = 'error'
      this.errorMessage = 'Link de validação inválido ou incompleto. O parâmetro do token não foi encontrado.'
      return
    }

    this.authService.verifyEmail(token.trim()).subscribe({
      next: (res) => {
        this.state = 'success'
        this.verifiedEmail = res.email || 'institucional'
      },
      error: (err) => {
        this.state = 'error'
        this.errorMessage = err.error?.message || 'Link de validação inválido ou expirado. Por favor, solicite um novo link.'
      },
    })
  }

  resend(): void {
    if (!this.resendEmail.trim()) return
    this.isResending = true
    this.resendMessage = ''
    this.authService.resendVerification(this.resendEmail.trim()).subscribe({
      next: (res) => {
        this.isResending = false
        this.resendMessage = res.message || 'Novo link enviado com sucesso! Verifique sua caixa de entrada.'
      },
      error: (err) => {
        this.isResending = false
        this.resendMessage = ''
        this.errorMessage = err.error?.message || 'Erro ao reenviar o link de validação.'
      },
    })
  }
}
