import { Component, HostListener, Input, OnInit } from '@angular/core'
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { filter } from 'rxjs'
import { AuthService, AuthUser } from '../services/auth.service'
import { SectorContextService } from '../services/sector-context.service'
import { SectorUserSelectModalComponent } from './sector-user-select-modal.component'

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
  imports: [RouterLink, RouterLinkActive, RouterOutlet, SectorUserSelectModalComponent],
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
      padding: 2rem 2rem 4rem;
      flex: 1;
    }

    /* Active Context Banner */
    .active-context-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.65rem 1.75rem;
      background: linear-gradient(90deg, rgba(73, 209, 125, 0.12), rgba(59, 130, 246, 0.08));
      border-bottom: 1px solid rgba(73, 209, 125, 0.35);
      color: var(--color-text-primary, #F5F7F4);
      font-size: 0.875rem;
      flex-wrap: wrap;
      animation: fadeInBanner 0.2s ease-out;
    }

    @keyframes fadeInBanner {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .context-info {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .context-icon {
      font-size: 1.15rem;
    }
    .context-label {
      color: var(--color-text-secondary, #B9C3BC);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    .context-user-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(73, 209, 125, 0.4);
      border-radius: 999px;
      padding: 2px 10px;
      color: #fff;
    }
    .context-email {
      color: var(--color-text-secondary, #8fa093);
      font-size: 0.8rem;
    }
    .context-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: auto;
    }
    .context-btn {
      padding: 4px 12px;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .change-btn {
      background: rgba(73, 209, 125, 0.15);
      color: var(--color-action-green, #49D17D);
      border: 1px solid rgba(73, 209, 125, 0.4);
    }
    .change-btn:hover {
      background: rgba(73, 209, 125, 0.25);
    }
    .clear-btn {
      background: transparent;
      color: var(--color-text-secondary, #B9C3BC);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .clear-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #FF7A7A;
      border-color: rgba(255, 122, 122, 0.3);
    }

    @media (max-width: 768px) {
      .layout-shell { flex-direction: column; }
      .sidebar { width: 100%; height: auto; border-right: none; border-bottom: 1px solid var(--border-color, #3f3f46); }
      .sidebar-nav { display: none; }
      .sidebar.is-open .sidebar-nav { display: block; }
      .sidebar-footer { display: none; }
      .sidebar.is-open .sidebar-footer { display: flex; }
      .menu-toggle { display: block !important; background: transparent; border: 1px solid var(--border-color, #3f3f46); color: #fff; padding: 0.5rem; border-radius: 4px; cursor: pointer; }
      .active-context-banner { padding: 0.5rem 1rem; }
    }
    .menu-toggle { display: none; }
  `]
})
export class LayoutShellComponent implements OnInit {
  menuOpen = false

  isSectorModalOpen = false
  pendingTargetSector = ''
  pendingTargetSectorLabel = ''
  pendingTargetDestination = ''
  private dismissedSector: string | null = null

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    public readonly sectorContextService: SectorContextService,
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
        { href: '/vestibular/agenda', label: 'Agenda' },
        { href: '/vestibular/alterar-senha', label: 'Alterar Senha' },
      ]
    },
    { 
      href: '/tesouraria', 
      label: 'Tesouraria',
      children: [
        { href: '/tesouraria/agenda', label: 'Agenda' },
        { href: '/tesouraria/alterar-senha', label: 'Alterar Senha' },
      ]
    },
    { 
      href: '/secretaria', 
      label: 'Secretaria',
      children: [
        { href: '/secretaria/agenda', label: 'Agenda' },
        { href: '/secretaria/alterar-senha', label: 'Alterar Senha' },
      ]
    },
    { 
      href: '/coordenacao', 
      label: 'Coordenação',
      children: [
        { href: '/coordenacao/unimestre', label: 'Cursos & Turmas' },
        { href: '/coordenacao/classroom', label: 'Google Classroom' },
        { href: '/coordenacao/eventos', label: 'Eventos' },
        { href: '/coordenacao/agenda', label: 'Agenda' },
        { href: '/coordenacao/alterar-senha', label: 'Alterar Senha' },
      ]
    },
    { 
      href: '/registro-academico', 
      label: 'Registro Acadêmico',
      children: [
        { href: '/registro-academico/agenda', label: 'Agenda' },
        { href: '/registro-academico/alterar-senha', label: 'Alterar Senha' },
      ]
    },
    { 
      href: '/professor', 
      label: 'Professor',
      children: [
        { href: '/professor/eventos', label: 'Eventos' },
        { href: '/professor/agenda', label: 'Agenda' },
        { href: '/professor/reservas', label: 'Reserva de Itens' },
        { href: '/professor/salas', label: 'Salas e Laboratórios' },
        { href: '/professor/alterar-senha', label: 'Alterar Senha' },
      ]
    },
    { 
      href: '/aluno', 
      label: 'Aluno',
      children: [
        { href: '/aluno/salas', label: 'Salas e Laboratórios' },
        { href: '/aluno/eventos', label: 'Eventos' },
        { href: '/aluno/agenda', label: 'Agenda' },
        { href: '/aluno/alterar-senha', label: 'Alterar Senha' },
      ]
    },
    {
      href: '/administracao',
      label: 'Administração',
      children: [
        { href: '/administracao/unimestre', label: 'Integração Unimestre' },
        { href: '/administracao/classroom', label: 'Google Classroom' },
        { href: '/administracao/corrigir', label: 'Corrigir Avaliação' },
        {
          href: '/administracao/dashboards',
          label: 'Dashboards',
          children: [
            { href: '/administracao/dashboards/agenda', label: 'Relatório de Agenda' },
            { href: '/administracao/dashboards/reservas', label: 'Relatório de Reservas' },
            { href: '/administracao/dashboards/territorios', label: 'Territórios e Leads' }
          ]
        },
        { href: '/administracao/eventos', label: 'Eventos Acadêmicos' },
        { href: '/administracao/agenda', label: 'Agenda' },
        { href: '/administracao/salas', label: 'Salas e Laboratórios' },
        { href: '/administracao/reservas', label: 'Reserva de Itens' },
        { href: '/administracao/certificados', label: 'Gestão de Certificados' },
        {
          href: '/administracao/cadastros',
          label: 'Cadastros',
          children: [
            { href: '/administracao/cadastros/usuarios', label: 'Cadastro de Usuário' },
            { href: '/administracao/cadastros/itens-reserva', label: 'Itens de Reserva' },
            { href: '/administracao/cadastros/eventos', label: 'Eventos para Certificados' },
            { href: '/administracao/cadastros/territorios', label: 'Territórios' },
            { href: '/administracao/cadastros/leads', label: 'Leads' }
          ]
        },
        { href: '/administracao/alterar-senha', label: 'Alterar Senha' },
      ]
    },
    { 
      href: '/desenvolvedor', 
      label: 'Desenvolvedor',
      children: [
        { href: '/desenvolvedor/unimestre', label: 'Integração Unimestre' },
        { href: '/desenvolvedor/classroom', label: 'Google Classroom' },
        { href: '/desenvolvedor/corrigir', label: 'Corrigir Avaliação' },
        {
          href: '/desenvolvedor/dashboards',
          label: 'Dashboards',
          children: [
            { href: '/desenvolvedor/dashboards/agenda', label: 'Relatório de Agenda' },
            { href: '/desenvolvedor/dashboards/reservas', label: 'Relatório de Reservas' },
            { href: '/desenvolvedor/dashboards/territorios', label: 'Territórios e Leads' }
          ]
        },
        { href: '/desenvolvedor/eventos', label: 'Eventos Acadêmicos' },
        { href: '/desenvolvedor/agenda', label: 'Agenda' },
        { href: '/desenvolvedor/salas', label: 'Salas e Laboratórios' },
        { href: '/desenvolvedor/reservas', label: 'Reserva de Itens' },
        { href: '/desenvolvedor/certificados', label: 'Gestão de Certificados' },
        {
          href: '/desenvolvedor/cadastros',
          label: 'Cadastros',
          children: [
            { href: '/desenvolvedor/cadastros/usuarios', label: 'Cadastro de Usuário' },
            { href: '/desenvolvedor/cadastros/itens-reserva', label: 'Itens de Reserva' },
            { href: '/desenvolvedor/cadastros/eventos', label: 'Eventos para Certificados' },
            { href: '/desenvolvedor/cadastros/territorios', label: 'Territórios' },
            { href: '/desenvolvedor/cadastros/leads', label: 'Leads' }
          ]
        },
        { href: '/desenvolvedor/alterar-senha', label: 'Alterar Senha' },
      ]
    },
  ]

  ngOnInit(): void {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.checkRouteSectorContext(event.urlAfterRedirects || event.url)
      })

    this.checkRouteSectorContext(this.router.url)
  }

  get visibleNavigation(): readonly LayoutNavigationItem[] {
    return this.navigation.filter((item) => this.authService.canAccess(item.href))
  }

  get currentRoleLabel(): string {
    return this.authService.roleLabel()
  }

  get activeContextBanner(): { user: AuthUser; sector: string; sectorLabel: string } | null {
    const user = this.sectorContextService.activeContextUser()
    const sector = this.sectorContextService.activeContextSector()
    const currentUser = this.authService.currentUser
    if (!user || !sector || !currentUser) return null

    const currentRouteSector = this.sectorContextService.getSectorFromPath(this.router.url)
    if (currentRouteSector === sector && sector !== currentUser.role) {
      return {
        user,
        sector,
        sectorLabel: this.sectorContextService.getSectorLabel(sector),
      }
    }
    return null
  }

  canAccess(path: string): boolean {
    return this.authService.canAccess(path)
  }

  onNavigationClick(event: MouseEvent, targetHref: string, hasChildren = false): void {
    const currentUser = this.authService.currentUser
    if (!currentUser) {
      if (!hasChildren) this.closeMenu()
      return
    }

    const targetSector = this.sectorContextService.getSectorFromPath(targetHref)
    // Se a rota não pertence a um setor externo (ex: próprio perfil, /agenda geral ou /alterar-senha)
    if (!targetSector || targetSector === currentUser.role) {
      if (!hasChildren) this.closeMenu()
      return
    }

    const activeSector = this.sectorContextService.activeContextSector()
    const activeUser = this.sectorContextService.activeContextUser()
    const currentRouteSector = this.sectorContextService.getSectorFromPath(this.router.url)

    // Se já está no mesmo setor com usuário em contexto ativo e está navegando em um sublink
    if (activeSector === targetSector && activeUser && currentRouteSector === targetSector) {
      if (!hasChildren) this.closeMenu()
      return
    }

    // Intercepta e abre modal de seleção de usuário
    event.preventDefault()
    event.stopPropagation()
    if (!hasChildren) this.closeMenu()

    this.dismissedSector = null
    this.openSectorModal(targetSector, targetHref)
  }

  private checkRouteSectorContext(url: string): void {
    const currentUser = this.authService.currentUser
    if (!currentUser) return

    const routeSector = this.sectorContextService.getSectorFromPath(url)
    if (!routeSector || routeSector === currentUser.role) return

    const activeSector = this.sectorContextService.activeContextSector()
    const activeUser = this.sectorContextService.activeContextUser()

    if ((!activeUser || activeSector !== routeSector) && !this.isSectorModalOpen && this.dismissedSector !== routeSector) {
      this.openSectorModal(routeSector, url)
    }
  }

  openSectorModal(sector: string, destination: string): void {
    this.pendingTargetSector = sector
    this.pendingTargetSectorLabel = this.sectorContextService.getSectorLabel(sector)
    this.pendingTargetDestination = destination
    this.isSectorModalOpen = true
  }

  closeSectorModal(): void {
    this.isSectorModalOpen = false
    this.dismissedSector = this.pendingTargetSector
    this.pendingTargetSector = ''
    this.pendingTargetSectorLabel = ''
    this.pendingTargetDestination = ''
  }

  onSectorUserSelected(user: AuthUser): void {
    const targetSector = this.pendingTargetSector
    const targetDest = this.pendingTargetDestination
    this.dismissedSector = null
    this.sectorContextService.setContextUser(user, targetSector)
    this.closeSectorModal()
    if (targetDest) {
      void this.router.navigateByUrl(targetDest)
    }
  }

  onProceedWithoutUser(): void {
    const targetDest = this.pendingTargetDestination
    this.dismissedSector = this.pendingTargetSector
    this.closeSectorModal()
    if (targetDest) {
      void this.router.navigateByUrl(targetDest)
    }
  }

  openSwitchUserModal(): void {
    const currentRouteSector = this.sectorContextService.getSectorFromPath(this.router.url)
    const sector = currentRouteSector || this.sectorContextService.activeContextSector() || ''
    if (sector) {
      this.dismissedSector = null
      this.openSectorModal(sector, this.router.url)
    }
  }

  clearActiveContext(): void {
    this.sectorContextService.clearContextUser()
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen
  }

  closeMenu(): void {
    this.menuOpen = false
  }

  logout(): void {
    this.authService.logout()
    this.sectorContextService.clearContextUser()
    this.closeMenu()
    void this.router.navigateByUrl('/login')
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.isSectorModalOpen) {
      this.closeSectorModal()
      return
    }
    this.closeMenu()
  }
}
