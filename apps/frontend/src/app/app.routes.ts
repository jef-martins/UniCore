import { Routes } from '@angular/router'
import { LayoutShellComponent } from './design-system/layout-shell.component'
import { authGuard, roleGuard } from './guards/auth.guard'
import { AgendaPageComponent } from './pages/agenda-page.component'
import { AccessRedirectPageComponent } from './pages/access-redirect-page.component'
import { AdminPageComponent } from './pages/admin-page.component'
import { DashboardPageComponent } from './pages/dashboard-page.component'
import { LoginPageComponent } from './pages/login-page.component'
import { ModulePageComponent } from './pages/module-page.component'
import { VestibularPageComponent } from './pages/vestibular-page.component'

export const appRoutes: Routes = [
  { path: 'login', component: LoginPageComponent, title: 'UniCore | Login' },
  {
    path: '',
    component: LayoutShellComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', component: AccessRedirectPageComponent, title: 'UniCore | Portal' },
      {
        path: 'administracao/dashboards',
        component: ModulePageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['admin', 'master'],
          moduleTitle: 'Dashboards Administrativos',
          moduleDescription: 'Dashboards e relatórios do sistema.',
        },
        title: 'UniCore | Dashboards Administrativos',
      },
      {
        path: 'administracao/dashboards/agenda',
        component: DashboardPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['admin', 'master'] },
        title: 'UniCore | Relatório de Agenda',
      },
      { path: 'agenda', component: AgendaPageComponent, title: 'UniCore | Agenda' },
      
      { path: 'vestibular/agenda', component: AgendaPageComponent, canActivate: [roleGuard], title: 'UniCore | Agenda' },
      { path: 'tesouraria/agenda', component: AgendaPageComponent, canActivate: [roleGuard], title: 'UniCore | Agenda' },
      { path: 'secretaria/agenda', component: AgendaPageComponent, canActivate: [roleGuard], title: 'UniCore | Agenda' },
      { path: 'coordenacao/agenda', component: AgendaPageComponent, canActivate: [roleGuard], title: 'UniCore | Agenda' },
      { path: 'registro-academico/agenda', component: AgendaPageComponent, canActivate: [roleGuard], title: 'UniCore | Agenda' },
      { path: 'administracao/agenda', component: AgendaPageComponent, canActivate: [roleGuard], title: 'UniCore | Agenda' },
      { path: 'desenvolvedor/agenda', component: AgendaPageComponent, canActivate: [roleGuard], title: 'UniCore | Agenda' },
      {
        path: 'vestibular',
        component: ModulePageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['vestibular', 'admin', 'master'],
          moduleTitle: 'Vestibular',
          moduleDescription: 'Central de correção de avaliações e gerência do processo seletivo.',
        },
        title: 'UniCore | Vestibular',
      },
      {
        path: 'vestibular/corrigir',
        component: VestibularPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['vestibular', 'admin', 'master'] },
        title: 'UniCore | Corrigir Avaliação',
      },
      ...[
        ['tesouraria', 'tesouraria', 'Tesouraria', ['tesouraria', 'admin', 'master']],
        ['secretaria', 'secretaria', 'Secretaria', ['secretaria', 'admin', 'master']],
        ['coordenacao', 'coordenacao', 'Coordenação', ['coordenacao', 'admin', 'master']],
        ['registro-academico', 'registro_academico', 'Registro Acadêmico', ['registro_academico', 'admin', 'master']],
      ].map(([path, module, moduleTitle, roles]) => ({
        path: path as string,
        component: ModulePageComponent,
        canActivate: [roleGuard],
        data: {
          roles,
          module,
          moduleTitle,
          moduleDescription: `Área de ${moduleTitle}, preparada para os fluxos do backend.`,
        },
        title: `UniCore | ${moduleTitle}`,
      })),
      {
        path: 'administracao',
        component: ModulePageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['admin', 'master'],
          moduleTitle: 'Administração',
          moduleDescription: 'Gerenciamento de integrações, relatórios em lote e recursos globais.',
        },
        title: 'UniCore | Administração',
      },
      {
        path: 'administracao/classroom',
        component: AdminPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['admin', 'master'] },
        title: 'UniCore | Classroom Lote',
      },
      {
        path: 'desenvolvedor',
        component: ModulePageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['master'],
          module: 'desenvolvedor',
          moduleTitle: 'Configurações do desenvolvedor',
          moduleDescription: 'Área exclusiva do usuário master para configurações técnicas e de código.',
        },
        title: 'UniCore | Desenvolvedor',
      },
      {
        path: 'administracao/cadastros/usuarios',
        loadComponent: () => import('./pages/user-registration-page.component').then(m => m.UserRegistrationPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['admin', 'master'] },
        title: 'UniCore | Cadastro de Usuário',
      },
      {
        path: 'desenvolvedor/cadastros/usuarios',
        loadComponent: () => import('./pages/user-registration-page.component').then(m => m.UserRegistrationPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['master'] },
        title: 'UniCore | Cadastro de Usuário',
      }
    ],
  },
  { path: '**', redirectTo: '' },
]
