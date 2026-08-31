import { Routes } from '@angular/router'
import { CampaignPageComponent } from './pages/campaign-page.component'
import { VestibularPageComponent } from './pages/vestibular-page.component'

export const appRoutes: Routes = [
  { path: '', component: CampaignPageComponent, title: 'UniCore | Portal' },
  { path: 'inscricao', component: CampaignPageComponent, title: 'UniCore | Inscrição' },
  { path: 'vestibular', component: VestibularPageComponent, title: 'UniCore | Vestibular' },
  // Caminhos desconhecidos preservam o fallback da home do router legado.
  { path: '**', redirectTo: '' },
]
