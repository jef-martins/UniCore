import { Component, Input } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'

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
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './layout-shell.component.html',
})
export class LayoutShellComponent {
  @Input() portalLabel = 'UniCore'
  @Input() mainId = 'main-content'
  @Input() footerDescription = 'UniCore · Sistema de experiência digital'
  @Input() searchLabel = 'Buscar no portal'
  @Input() navigation: readonly LayoutNavigationItem[] = [
    { href: '/', label: 'Início' },
    { href: '/inscricao', label: 'Inscrição' },
  ]
  @Input() footerLinks: readonly LayoutFooterLink[] = [
    { href: '/', label: 'Acessibilidade' },
    { href: '/', label: 'Ajuda' },
  ]
}
