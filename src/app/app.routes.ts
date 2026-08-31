import { Routes } from '@angular/router'
import { CampaignPageComponent } from './pages/campaign-page.component'

export const appRoutes: Routes = [
  { path: '', component: CampaignPageComponent, title: 'UniCore | Portal' },
  { path: 'inscricao', component: CampaignPageComponent, title: 'UniCore | Inscrição' },
  // Caminhos desconhecidos preservam o fallback da home do router legado.
  { path: '**', redirectTo: '' },
]
