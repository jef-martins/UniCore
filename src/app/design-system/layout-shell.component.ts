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
    { href: '/', label: 'Início' },
    { href: '/inscricao', label: 'Inscrição' },
    { href: '/vestibular', label: 'Vestibular' },
  ]
  @Input() footerLinks: readonly LayoutFooterLink[] = [
    { href: '/', label: 'Acessibilidade' },
    { href: '/', label: 'Ajuda' },
  ]

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
