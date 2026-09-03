import { Component, HostListener, Input } from '@angular/core'
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { AuthService } from '../services/auth.service'

export interface LayoutNavigationItem {
  href: string
  label: string
  children?: LayoutNavigationItem[]
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
  styles: [`
    .layout-shell {
      display: flex;
      flex-direction: row;
      height: 100vh;
      overflow: hidden;
    }
    .sidebar {
      width: 260px;
      background: var(--color-surface, #18181b);
      border-right: 1px solid var(--border-color, #3f3f46);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .sidebar-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--border-color, #3f3f46);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .portal-mark {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-color, #3b82f6);
      text-decoration: none;
    }
    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 0;
    }
    .primary-navigation {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      width: 100%;
    }
    .primary-navigation li {
      margin: 0;
      width: 100%;
    }
    .primary-navigation a {
      display: block;
      padding: 0.75rem 1.5rem;
      color: var(--text-color, #d4d4d8);
      text-decoration: none;
      transition: all 0.2s;
    }
    .primary-navigation a.parent-link {
      font-weight: 600;
      color: #fff;
      padding: 0.85rem 1.5rem;
    }
    .primary-navigation a:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
    .primary-navigation a.is-active {
      background: rgba(59, 130, 246, 0.1);
      color: var(--primary-color, #60a5fa);
      border-right: 3px solid var(--primary-color, #3b82f6);
    }
    .sub-navigation {
      list-style: none;
      padding: 0;
      margin: 0 0 0 1.5rem;
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--border-color, #3f3f46);
    }
    .sub-navigation a {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
      color: var(--text-color-secondary, #a1a1aa);
      position: relative;
    }
    .sub-navigation a.parent-link {
      font-weight: normal;
      color: var(--text-color-secondary, #a1a1aa);
      padding: 0.5rem 1rem;
    }
    .sub-navigation a.is-active::before {
      content: '';
      position: absolute;
      left: -1px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--primary-color, #3b82f6);
    }
    .sub-navigation a.is-active {
      color: var(--primary-color, #60a5fa);
      background: rgba(255, 255, 255, 0.05);
    }
    .sidebar-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color, #3f3f46);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .top-bar {
      height: 60px;
      border-bottom: 1px solid var(--border-color, #3f3f46);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 0 2rem;
      background: var(--color-surface, #18181b);
    }
    .role-badge {
      font-size: 0.85rem;
      padding: 0.25rem 0.75rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 99px;
      margin-right: 1rem;
    }
    .action-link {
      background: transparent;
      border: none;
      color: var(--text-color, #d4d4d8);
      cursor: pointer;
      font-size: 0.9rem;
    }
    .action-link:hover { color: #fff; }
    .page-main {
      padding: 2rem;
      flex: 1;
    }
    @media (max-width: 768px) {
      .layout-shell { flex-direction: column; }
      .sidebar { width: 100%; height: auto; border-right: none; border-bottom: 1px solid var(--border-color, #3f3f46); }
      .sidebar-nav { display: none; }
      .sidebar.is-open .sidebar-nav { display: block; }
      .sidebar-footer { display: none; }
      .sidebar.is-open .sidebar-footer { display: flex; }
      .menu-toggle { display: block !important; background: transparent; border: 1px solid var(--border-color, #3f3f46); color: #fff; padding: 0.5rem; border-radius: 4px; cursor: pointer; }
    }
    .menu-toggle { display: none; }
  `]
})
export class LayoutShellComponent {
  menuOpen = false

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  @Input() portalLabel = 'UniCore'
  @Input() mainId = 'main-content'
  @Input() searchLabel = 'Buscar no portal'
  @Input() navigation: readonly LayoutNavigationItem[] = [
    { 
      href: '/vestibular', 
      label: 'Vestibular',
      children: [
        { href: '/vestibular/corrigir', label: 'Corrigir Avaliação' },
        { href: '/vestibular/agenda', label: 'Agenda' }
      ]
    },
    { 
      href: '/tesouraria', 
      label: 'Tesouraria',
      children: [{ href: '/tesouraria/agenda', label: 'Agenda' }]
    },
    { 
      href: '/secretaria', 
      label: 'Secretaria',
      children: [{ href: '/secretaria/agenda', label: 'Agenda' }]
    },
    { 
      href: '/coordenacao', 
      label: 'Coordenação',
      children: [{ href: '/coordenacao/agenda', label: 'Agenda' }]
    },
    { 
      href: '/registro-academico', 
      label: 'Registro Acadêmico',
      children: [{ href: '/registro-academico/agenda', label: 'Agenda' }]
    },
    { 
      href: '/professor', 
      label: 'Professor',
      children: [{ href: '/professor/agenda', label: 'Agenda' }]
    },
    { 
      href: '/aluno', 
      label: 'Aluno',
      children: [{ href: '/aluno/agenda', label: 'Agenda' }]
    },
    {
      href: '/administracao',
      label: 'Administração',
      children: [
        { href: '/administracao/classroom', label: 'Classroom Lote' },
        {
          href: '/administracao/dashboards',
          label: 'Dashboards',
          children: [
            { href: '/administracao/dashboards/agenda', label: 'Relatório de Agenda' }
          ]
        },
        { href: '/administracao/agenda', label: 'Agenda' },
        {
          href: '/administracao/cadastros',
          label: 'Cadastros',
          children: [
            { href: '/administracao/cadastros/usuarios', label: 'Cadastro de Usuário' }
          ]
        }
      ]
    },
    { 
      href: '/desenvolvedor', 
      label: 'Desenvolvedor',
      children: [
        { href: '/desenvolvedor/agenda', label: 'Agenda' },
        {
          href: '/desenvolvedor/cadastros',
          label: 'Cadastros',
          children: [
            { href: '/desenvolvedor/cadastros/usuarios', label: 'Cadastro de Usuário' }
          ]
        }
      ]
    },
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
