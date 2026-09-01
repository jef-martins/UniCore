import { Routes } from '@angular/router'
import { LayoutShellComponent } from './design-system/layout-shell.component'
import { authGuard } from './guards/auth.guard'
import { CampaignPageComponent } from './pages/campaign-page.component'
import { LoginPageComponent } from './pages/login-page.component'
import { VestibularPageComponent } from './pages/vestibular-page.component'

export const appRoutes: Routes = [
  { path: 'login', component: LoginPageComponent, title: 'UniCore | Login' },
  {
    path: '',
    component: LayoutShellComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', component: CampaignPageComponent, title: 'UniCore | Portal' },
      { path: 'inscricao', component: CampaignPageComponent, title: 'UniCore | Inscrição' },
      { path: 'vestibular', component: VestibularPageComponent, title: 'UniCore | Vestibular' },
    ],
  },
  // Caminhos desconhecidos preservam o fallback da home do router legado.
  { path: '**', redirectTo: '' },
]
