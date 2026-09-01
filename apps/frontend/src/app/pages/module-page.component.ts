import { Component } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { AuthService } from '../services/auth.service'

@Component({
  selector: 'app-module-page',
  standalone: true,
  templateUrl: './module-page.component.html',
})
export class ModulePageComponent {
  readonly title: string
  readonly description: string
  readonly eyebrow: string
  readonly isAdministration: boolean

  constructor(
    route: ActivatedRoute,
    authService: AuthService,
  ) {
    this.title = String(route.snapshot.data['moduleTitle'] ?? 'Módulo')
    this.description = String(route.snapshot.data['moduleDescription'] ?? 'Área preparada para integração futura.')
    this.eyebrow = authService.roleLabel()
    this.isAdministration = route.snapshot.data['module'] === 'administracao'
  }
}
