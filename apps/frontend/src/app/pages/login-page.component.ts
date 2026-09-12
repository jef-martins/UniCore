import { Component, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AuthService } from '../services/auth.service'

@Component({
  selector: 'app-login-page',
  standalone: true,
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent implements OnInit {
  username = ''
  password = ''
  errorMessage = ''
  resendSuccessMessage = ''
  loginInProgress = false
  isEmailNotVerified = false
  unverifiedEmail = ''
  isResending = false

  constructor(
    private readonly authService: AuthService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) void this.router.navigateByUrl('/')
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

      const requestedUrl = this.activatedRoute.snapshot.queryParamMap.get('returnUrl')
      const returnUrl = requestedUrl?.startsWith('/') && !requestedUrl.startsWith('//') ? requestedUrl : '/'
      void this.router.navigateByUrl(returnUrl)
    })
  }
}
