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
  loginInProgress = false

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
  }

  onPasswordInput(event: Event): void {
    this.password = (event.target as HTMLInputElement).value
  }

  submit(event: Event): void {
    event.preventDefault()
    if (this.loginInProgress) return

    this.errorMessage = ''
    if (!this.username.trim() || !this.password) {
      this.errorMessage = 'Informe usuário/e-mail e senha para continuar.'
      return
    }

    this.loginInProgress = true
    this.authService.login(this.username, this.password).subscribe((success) => {
      this.loginInProgress = false
      if (!success) {
        this.errorMessage = 'Usuário/e-mail ou senha inválidos.'
        return
      }

      const requestedUrl = this.activatedRoute.snapshot.queryParamMap.get('returnUrl')
      const returnUrl = requestedUrl?.startsWith('/') && !requestedUrl.startsWith('//') ? requestedUrl : '/'
      void this.router.navigateByUrl(returnUrl)
    })
  }
}
