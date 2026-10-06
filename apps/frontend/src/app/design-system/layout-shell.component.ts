import { Component, HostListener, Input, OnDestroy, OnInit } from '@angular/core'
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { filter, Subscription } from 'rxjs'
import { AuthService, AuthUser } from '../services/auth.service'
import { SectorContextService } from '../services/sector-context.service'
import { SectorUserSelectModalComponent } from './sector-user-select-modal.component'
import { TicketsService, UnattendedTicketItem } from '../services/tickets.service'

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
      height: 52px;
      border-bottom: 1px solid var(--border-color, #3f3f46);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      background: var(--color-surface, #18181b);
      flex-shrink: 0;
    }
    .top-bar-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-left: auto;
    }
    .top-bar-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      color: #E4E4E7;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color, #3F3F46);
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .top-bar-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .top-bar-btn.btn-highlight {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(59, 130, 246, 0.4);
      color: #93C5FD;
    }
    .top-bar-btn.btn-highlight:hover {
      background: #3B82F6;
      color: #fff;
    }
    .role-badge {
      font-size: 0.8rem;
      padding: 0.2rem 0.65rem;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 99px;
      color: #D4D4D8;
    }
    /* Bell Notification Button & Dropdown */
    .notification-container {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .top-bar-icon-btn.bell-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color, #3F3F46);
      color: #D4D4D8;
      cursor: pointer;
      transition: all 0.15s ease;
      padding: 0;
    }
    .top-bar-icon-btn.bell-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #FFFFFF;
      border-color: rgba(255, 255, 255, 0.25);
    }
    .top-bar-icon-btn.bell-btn.is-active {
      background: rgba(59, 130, 246, 0.18);
      border-color: #3B82F6;
      color: #60A5FA;
    }
    .bell-icon {
      width: 17px;
      height: 17px;
      transition: transform 0.2s ease;
    }
    .top-bar-icon-btn.bell-btn:hover .bell-icon {
      transform: rotate(8deg);
    }
    .top-bar-icon-btn.bell-btn.has-badge .bell-icon {
      animation: bellGentleSwing 4.5s ease-in-out infinite;
    }
    @keyframes bellGentleSwing {
      0%, 85%, 100% { transform: rotate(0); }
      88% { transform: rotate(12deg); }
      92% { transform: rotate(-10deg); }
      96% { transform: rotate(6deg); }
    }
    .notification-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: 999px;
      background: #EF4444;
      color: #FFFFFF;
      font-size: 0.65rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #18181B;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
      animation: badgePop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes badgePop {
      0% { transform: scale(0); }
      70% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    .notification-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 360px;
      max-width: 90vw;
      background: #202024;
      border: 1px solid var(--border-color, #3F3F46);
      border-radius: 10px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: dropdownFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes dropdownFadeIn {
      from { opacity: 0; transform: translateY(-6px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .notification-header {
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color, #333338);
      background: rgba(255, 255, 255, 0.02);
    }
    .notification-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .notification-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #F4F4F5;
    }
    .notification-count-tag {
      font-size: 0.7rem;
      padding: 0.12rem 0.5rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: #A1A1AA;
      font-weight: 600;
    }
    .notification-count-tag.danger {
      background: rgba(239, 68, 68, 0.15);
      color: #FCA5A5;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .btn-refresh-notifications {
      background: transparent;
      border: none;
      color: #A1A1AA;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .btn-refresh-notifications:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.08);
    }
    .notification-body {
      max-height: 360px;
      overflow-y: auto;
    }
    .notification-empty {
      padding: 2rem 1.25rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }
    .notification-empty .empty-icon {
      font-size: 1.8rem;
      margin-bottom: 0.25rem;
    }
    .notification-empty .empty-text {
      font-size: 0.9rem;
      font-weight: 600;
      color: #E4E4E7;
      margin: 0;
    }
    .notification-empty .empty-sub {
      font-size: 0.75rem;
      color: #71717A;
    }
    .notification-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .notification-item {
      padding: 0.7rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      cursor: pointer;
      transition: background 0.15s ease;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .notification-item:last-child {
      border-bottom: none;
    }
    .notification-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .item-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.72rem;
    }
    .item-code {
      font-family: monospace;
      font-weight: 700;
      color: #60A5FA;
    }
    .item-priority {
      padding: 0.08rem 0.35rem;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.62rem;
    }
    .priority-urgente {
      background: rgba(239, 68, 68, 0.2);
      color: #F87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .priority-alta {
      background: rgba(245, 158, 11, 0.2);
      color: #FBBF24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .priority-media {
      background: rgba(59, 130, 246, 0.15);
      color: #93C5FD;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .priority-baixa {
      background: rgba(107, 114, 128, 0.2);
      color: #D1D5DB;
      border: 1px solid rgba(107, 114, 128, 0.3);
    }
    .item-sector {
      color: #A1A1AA;
    }
    .item-time {
      margin-left: auto;
      color: #71717A;
      font-size: 0.68rem;
    }
    .item-title {
      font-size: 0.82rem;
      font-weight: 600;
      color: #F4F4F5;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item-user {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.72rem;
      color: #A1A1AA;
    }
    .item-user .user-icon {
      font-size: 0.72rem;
      opacity: 0.8;
    }
    .notification-footer {
      padding: 0.6rem 1rem;
      background: rgba(0, 0, 0, 0.25);
      border-top: 1px solid var(--border-color, #333338);
      text-align: center;
    }
    .notification-footer-link {
      font-size: 0.78rem;
      font-weight: 600;
      color: #60A5FA;
      text-decoration: none;
      display: inline-block;
      transition: color 0.15s ease;
    }
    .notification-footer-link:hover {
      color: #93C5FD;
      text-decoration: underline;
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
export class LayoutShellComponent implements OnInit, OnDestroy {
  menuOpen = false

  isSectorModalOpen = false
  pendingTargetSector = ''
  pendingTargetSectorLabel = ''
  pendingTargetDestination = ''
  private dismissedSector: string | null = null

  isNotificationOpen = false
  unattendedCount = 0
  unattendedTickets: UnattendedTicketItem[] = []
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private ticketSub?: Subscription
  private routeSub?: Subscription

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    public readonly sectorContextService: SectorContextService,
    private readonly ticketsService: TicketsService,
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
        { href: '/vestibular/chamados', label: 'Chamados' },
        {
          href: '/vestibular/cadastros',
          label: 'Cadastros',
          children: [
            { href: '/vestibular/cadastros/territorios', label: 'Territórios' },
            { href: '/vestibular/cadastros/mapa', label: 'Mapa Interativo' },
            { href: '/vestibular/cadastros/leads', label: 'Leads' },
          ]
        },
        { href: '/vestibular/alterar-senha', label: 'Alterar Senha' },
      ]
    },
    { 
      href: '/tesouraria', 
      label: 'Tesouraria',
      children: [
        { href: '/tesouraria/agenda', label: 'Agenda' },
        { href: '/tesouraria/chamados', label: 'Chamados' },
        { href: '/tesouraria/alterar-senha', label: 'Alterar Senha' },
      ]
    },
    { 
      href: '/secretaria', 
      label: 'Secretaria',
      children: [
        { href: '/secretaria/agenda', label: 'Agenda' },
        { href: '/secretaria/chamados', label: 'Chamados' },
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
        { href: '/coordenacao/eventos/portaria', label: 'Portaria & Scanner QR' },
        { href: '/coordenacao/agenda', label: 'Agenda' },
        { href: '/coordenacao/chamados', label: 'Chamados' },
        { href: '/coordenacao/alterar-senha', label: 'Alterar Senha' },
      ]
    },
    { 
      href: '/registro-academico', 
      label: 'Registro Acadêmico',
      children: [
        { href: '/registro-academico/agenda', label: 'Agenda' },
        { href: '/registro-academico/chamados', label: 'Chamados' },
        { href: '/registro-academico/alterar-senha', label: 'Alterar Senha' },
      ]
    },
    { 
      href: '/professor', 
      label: 'Professor',
      children: [
        { href: '/professor/eventos', label: 'Eventos' },
        { href: '/professor/eventos/portaria', label: 'Portaria & Scanner QR' },
        { href: '/professor/agenda', label: 'Agenda' },
        { href: '/professor/reservas', label: 'Reserva de Itens' },
        { href: '/professor/salas', label: 'Salas e Laboratórios' },
        { href: '/professor/chamados', label: 'Chamados' },
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
        { href: '/aluno/chamados', label: 'Chamados' },
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
            { href: '/administracao/dashboards/territorios', label: 'Territórios e Leads' },
            { href: '/administracao/dashboards/chamados', label: 'Relatório de Chamados' },
          ]
        },
        { href: '/administracao/chamados', label: 'Central de Chamados' },
        { href: '/administracao/eventos', label: 'Eventos Acadêmicos' },
        { href: '/administracao/eventos/portaria', label: 'Portaria & Scanner QR' },
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
            { href: '/administracao/cadastros/mapa', label: 'Mapa Interativo' },
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
            { href: '/desenvolvedor/dashboards/territorios', label: 'Territórios e Leads' },
            { href: '/desenvolvedor/dashboards/chamados', label: 'Relatório de Chamados' },
          ]
        },
        { href: '/desenvolvedor/chamados', label: 'Gestão de Chamados' },
        { href: '/desenvolvedor/eventos', label: 'Eventos Acadêmicos' },
        { href: '/desenvolvedor/eventos/portaria', label: 'Portaria & Scanner QR' },
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
            { href: '/desenvolvedor/cadastros/mapa', label: 'Mapa Interativo' },
            { href: '/desenvolvedor/cadastros/leads', label: 'Leads' }
          ]
        },
        { href: '/desenvolvedor/alterar-senha', label: 'Alterar Senha' },
      ]
    },
  ]

  ngOnInit(): void {
    this.routeSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.checkRouteSectorContext(event.urlAfterRedirects || event.url)
        if (this.isMasterUser) {
          this.fetchUnattendedTickets()
        }
      })

    this.checkRouteSectorContext(this.router.url)

    if (this.isMasterUser) {
      this.fetchUnattendedTickets()
      this.startPolling()
    }

    this.ticketSub = this.ticketsService.ticketUpdated$.subscribe(() => {
      if (this.isMasterUser) {
        this.fetchUnattendedTickets()
      }
    })
  }

  ngOnDestroy(): void {
    this.stopPolling()
    this.ticketSub?.unsubscribe()
    this.routeSub?.unsubscribe()
  }

  get isMasterUser(): boolean {
    return this.authService.currentUser?.role === 'master'
  }

  startPolling(): void {
    this.stopPolling()
    this.pollInterval = setInterval(() => {
      if (this.isMasterUser && this.authService.isAuthenticated()) {
        this.fetchUnattendedTickets()
      } else {
        this.stopPolling()
      }
    }, 30000)
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  fetchUnattendedTickets(): void {
    if (!this.isMasterUser) {
      this.unattendedCount = 0
      this.unattendedTickets = []
      return
    }

    this.ticketsService.getUnattendedSummary().subscribe({
      next: (res) => {
        this.unattendedCount = res?.count ?? 0
        this.unattendedTickets = res?.tickets ?? []
      },
      error: () => {
        // Silencioso em caso de falha de conexão temporária
      },
    })
  }

  refreshUnattendedTickets(): void {
    this.fetchUnattendedTickets()
  }

  toggleNotificationDropdown(event: MouseEvent): void {
    event.stopPropagation()
    this.isNotificationOpen = !this.isNotificationOpen
    if (this.isNotificationOpen) {
      this.fetchUnattendedTickets()
    }
  }

  closeNotificationDropdown(): void {
    this.isNotificationOpen = false
  }

  goToTicket(ticketId: string): void {
    this.closeNotificationDropdown()
    void this.router.navigate(['/chamados'], { queryParams: { id: ticketId } })
  }

  formatPriority(priority: string): string {
    switch (priority) {
      case 'URGENTE': return 'Urgente'
      case 'ALTA': return 'Alta'
      case 'MEDIA': return 'Média'
      case 'BAIXA': return 'Baixa'
      default: return priority || 'Média'
    }
  }

  formatTimeAgo(dateStr: string): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = Math.max(0, now.getTime() - d.getTime())
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMin < 2) return 'Agora mesmo'
    if (diffMin < 60) return `Há ${diffMin} min`
    if (diffHours < 24) return `Há ${diffHours} h`
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `Há ${diffDays} d`
    return d.toLocaleDateString('pt-BR')
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
    this.stopPolling()
    this.unattendedCount = 0
    this.unattendedTickets = []
    this.isNotificationOpen = false
    this.authService.logout()
    this.sectorContextService.clearContextUser()
    this.closeMenu()
    void this.router.navigateByUrl('/login')
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isNotificationOpen) {
      const target = event.target as HTMLElement
      if (!target.closest('.notification-container')) {
        this.closeNotificationDropdown()
      }
    }
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.isNotificationOpen) {
      this.closeNotificationDropdown()
      return
    }
    if (this.isSectorModalOpen) {
      this.closeSectorModal()
      return
    }
    this.closeMenu()
  }
}
