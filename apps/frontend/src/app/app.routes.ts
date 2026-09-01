import { Routes } from '@angular/router'
import { LayoutShellComponent } from './design-system/layout-shell.component'
import { authGuard, roleGuard } from './guards/auth.guard'
import { AgendaPageComponent } from './pages/agenda-page.component'
import { AccessRedirectPageComponent } from './pages/access-redirect-page.component'
import { CampaignPageComponent } from './pages/campaign-page.component'
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
      { path: 'agenda', component: AgendaPageComponent, title: 'UniCore | Agenda' },
      {
        path: 'inscricao',
        component: CampaignPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['vestibular', 'admin', 'master'] },
        title: 'UniCore | Inscrição',
      },
      {
        path: 'vestibular',
        component: VestibularPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['vestibular', 'admin', 'master'] },
        title: 'UniCore | Vestibular',
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
          module: 'administracao',
          moduleTitle: 'Administração',
          moduleDescription: 'Gerencie usuários, perfis e permissões quando o backend estiver conectado.',
        },
        title: 'UniCore | Administração',
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
    ],
  },
  { path: '**', redirectTo: '' },
]
