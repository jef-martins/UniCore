import { Component, OnInit } from '@angular/core'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { CommonModule } from '@angular/common'
import { AuthService } from '../services/auth.service'

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent implements OnInit {
  username = ''
  password = ''
  errorMessage = ''
  resendSuccessMessage = ''
  loginInProgress = false
  googleLoginInProgress = false
  isEmailNotVerified = false
  unverifiedEmail = ''
  isResending = false

  // Primeiro Acesso / Validação
  showFirstAccess = false
  firstAccessEmail = ''
  firstAccessSuccessMessage = ''
  firstAccessErrorMessage = ''
  firstAccessInProgress = false

  constructor(
    private readonly authService: AuthService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      void this.router.navigateByUrl('/')
      return
    }

    const expired = this.activatedRoute.snapshot.queryParamMap.get('expired')
    if (expired) {
      this.errorMessage = 'Sua sessão expirou. Por favor, faça login novamente para continuar.'
    }

    // Se retornou do Google OAuth com ?code=
    const code = this.activatedRoute.snapshot.queryParamMap.get('code')
    if (code) {
      this.handleGoogleCallback(code)
    }

    const error = this.activatedRoute.snapshot.queryParamMap.get('error')
    if (error) {
      this.errorMessage = `A autenticação com a Google foi cancelada ou falhou: ${error}`
    }
  }

  handleGoogleCallback(code: string): void {
    this.googleLoginInProgress = true
    this.loginInProgress = true
    this.errorMessage = ''

    const redirectUri = `${window.location.origin}/login`
    this.authService.loginWithGoogle(code, redirectUri).subscribe((success) => {
      this.googleLoginInProgress = false
      this.loginInProgress = false

      if (success) {
        const returnUrl = this.getSafeReturnUrl()
        void this.router.navigateByUrl(returnUrl)
      } else {
        const lastErr = this.authService.lastLoginError
        this.errorMessage = lastErr?.message || 'Falha ao autenticar com a conta Google institucional.'
      }
    })
  }

  loginWithGoogle(): void {
    if (this.loginInProgress || this.googleLoginInProgress) return
    this.googleLoginInProgress = true
    this.errorMessage = ''

    const redirectUri = `${window.location.origin}/login`
    this.authService.getGoogleAuthUrl(redirectUri).subscribe({
      next: (res) => {
        if (res?.url) {
          window.location.href = res.url
        } else {
          this.googleLoginInProgress = false
          this.errorMessage = 'Não foi possível obter a URL de autenticação do Google.'
        }
      },
      error: (err) => {
        this.googleLoginInProgress = false
        this.errorMessage = err?.error?.message || 'Integração Google não configurada no servidor.'
      },
    })
  }

  toggleFirstAccess(): void {
    this.showFirstAccess = !this.showFirstAccess
    this.firstAccessErrorMessage = ''
    this.firstAccessSuccessMessage = ''
  }

  submitFirstAccess(event: Event): void {
    event.preventDefault()
    if (this.firstAccessInProgress || !this.firstAccessEmail.trim()) return

    this.firstAccessInProgress = true
    this.firstAccessErrorMessage = ''
    this.firstAccessSuccessMessage = ''

    this.authService.requestFirstAccess(this.firstAccessEmail.trim()).subscribe({
      next: (res) => {
        this.firstAccessInProgress = false
        this.firstAccessSuccessMessage = res.message || 'Link de ativação enviado com sucesso!'
        this.firstAccessEmail = ''
      },
      error: (err) => {
        this.firstAccessInProgress = false
        this.firstAccessErrorMessage = err?.error?.message || 'Erro ao enviar link de validação.'
      },
    })
  }

  onUsernameInput(event: Event): void {
    this.username = (event.target as HTMLInputElement).value
    this.isEmailNotVerified = false
    this.resendSuccessMessage = ''
  }

  onPasswordInput(event: Event): void {
    this.password = (event.target as HTMLInputElement).value
  }

  resendLink(): void {
    if (!this.unverifiedEmail) return
    this.isResending = true
    this.resendSuccessMessage = ''
    this.authService.resendVerification(this.unverifiedEmail).subscribe({
      next: (res) => {
        this.isResending = false
        this.resendSuccessMessage = res.message || 'Novo link enviado com sucesso!'
      },
      error: (err) => {
        this.isResending = false
        this.errorMessage = err.error?.message || 'Erro ao reenviar link de validação.'
      },
    })
  }

  submit(event: Event): void {
    event.preventDefault()
    if (this.loginInProgress) return

    this.errorMessage = ''
    this.resendSuccessMessage = ''
    this.isEmailNotVerified = false

    if (!this.username.trim() || !this.password) {
      this.errorMessage = 'Informe usuário/e-mail e senha para continuar.'
      return
    }

    this.loginInProgress = true
    this.authService.login(this.username, this.password).subscribe((success) => {
      this.loginInProgress = false
      if (!success) {
        const lastErr = this.authService.lastLoginError
        if (lastErr?.code === 'EMAIL_NOT_VERIFIED') {
          this.isEmailNotVerified = true
          this.unverifiedEmail = lastErr.email || this.username
          this.errorMessage = lastErr.message
        } else {
          this.errorMessage = lastErr?.message || 'Usuário/e-mail ou senha inválidos.'
        }
        return
      }

      const returnUrl = this.getSafeReturnUrl()
      void this.router.navigateByUrl(returnUrl)
    })
  }

  private getSafeReturnUrl(): string {
    const requestedUrl = this.activatedRoute.snapshot.queryParamMap.get('returnUrl')
    return requestedUrl?.startsWith('/') && !requestedUrl.startsWith('//') ? requestedUrl : '/'
  }
}
