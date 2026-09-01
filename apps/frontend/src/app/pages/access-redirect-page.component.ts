import { Component, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService } from '../services/auth.service'

@Component({
  selector: 'app-access-redirect-page',
  standalone: true,
  template: '<p class="route-redirect" aria-live="polite">Abrindo seu painel…</p>',
})
export class AccessRedirectPageComponent implements OnInit {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    void this.router.navigateByUrl(this.authService.defaultRoute())
  }
}
