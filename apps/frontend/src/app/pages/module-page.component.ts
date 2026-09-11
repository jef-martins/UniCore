import { Component, computed } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { AuthService } from '../services/auth.service'
import { SectorContextService } from '../services/sector-context.service'

@Component({
  selector: 'app-module-page',
  standalone: true,
  templateUrl: './module-page.component.html',
  styles: [`
    .context-card {
      border: 1px solid rgba(73, 209, 125, 0.4);
      background: linear-gradient(135deg, rgba(73, 209, 125, 0.08), rgba(24, 29, 26, 0.8));
      margin-bottom: 1.5rem;
      padding: 1.25rem 1.5rem;
      border-radius: 12px;
    }
    .context-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 0.5rem;
    }
    .context-tag {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-action-green, #49D17D);
      background: rgba(73, 209, 125, 0.15);
      border: 1px solid rgba(73, 209, 125, 0.3);
      padding: 2px 8px;
      border-radius: 999px;
    }
    .context-username {
      font-size: 1.2rem;
      font-weight: 700;
      color: #fff;
      margin: 0;
    }
    .context-user-email {
      color: var(--color-text-secondary, #B9C3BC);
      font-size: 0.85rem;
      margin: 0.25rem 0 0.5rem;
    }
  `]
})
export class ModulePageComponent {
  readonly title: string
  readonly description: string
  readonly eyebrow: string
  readonly isAdministration: boolean

  readonly activeContextUser = computed(() => {
    const user = this.sectorContextService.activeContextUser()
    const sector = this.sectorContextService.activeContextSector()
    const currentModule = this.route.snapshot.data['module'] || this.route.snapshot.routeConfig?.path
    const routeSector = this.sectorContextService.getSectorFromPath(currentModule || '')
    if (user && sector && routeSector === sector) {
      return user
    }
    return null
  })

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly sectorContextService: SectorContextService,
  ) {
    this.title = String(route.snapshot.data['moduleTitle'] ?? 'Módulo')
    this.description = String(route.snapshot.data['moduleDescription'] ?? 'Área preparada para integração futura.')
    this.eyebrow = authService.roleLabel()
    this.isAdministration = route.snapshot.data['module'] === 'administracao'
  }
}
