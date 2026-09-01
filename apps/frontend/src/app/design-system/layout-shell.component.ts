import { Component, HostListener, Input } from '@angular/core'
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { AuthService } from '../services/auth.service'

export interface LayoutNavigationItem {
  href: string
  label: string
}

export interface LayoutFooterLink {
  href: string
  label: string
}

@Component({
  selector: 'app-layout-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout-shell.component.html',
})
export class LayoutShellComponent {
  menuOpen = false

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  @Input() portalLabel = 'UniCore'
  @Input() mainId = 'main-content'
  @Input() footerDescription = 'UniCore · Sistema de experiência digital'
  @Input() searchLabel = 'Buscar no portal'
  @Input() navigation: readonly LayoutNavigationItem[] = [
    { href: '/vestibular', label: 'Vestibular' },
    { href: '/inscricao', label: 'Inscrição' },
    { href: '/agenda', label: 'Agenda' },
    { href: '/tesouraria', label: 'Tesouraria' },
    { href: '/secretaria', label: 'Secretaria' },
    { href: '/coordenacao', label: 'Coordenação' },
    { href: '/registro-academico', label: 'Registro Acadêmico' },
    { href: '/administracao', label: 'Administração' },
    { href: '/desenvolvedor', label: 'Desenvolvedor' },
  ]
  @Input() footerLinks: readonly LayoutFooterLink[] = [
    { href: '/', label: 'Acessibilidade' },
    { href: '/', label: 'Ajuda' },
  ]

  get visibleNavigation(): readonly LayoutNavigationItem[] {
    return this.navigation.filter((item) => this.authService.canAccess(item.href))
  }

  get currentRoleLabel(): string {
    return this.authService.roleLabel()
  }

  canAccess(path: string): boolean {
    return this.authService.canAccess(path)
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen
  }

  closeMenu(): void {
    this.menuOpen = false
  }

  logout(): void {
    this.authService.logout()
    this.closeMenu()
    void this.router.navigateByUrl('/login')
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.closeMenu()
  }
}
