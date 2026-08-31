import { Component } from '@angular/core'
import { HeroSectionComponent } from '../design-system/hero-section.component'

const campaignMedia =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"%3E%3Crect width="720" height="480" fill="%230B0D0C"/%3E%3Cpath d="M0 340 180 160 330 300 520 90 720 280V480H0Z" fill="%2349D17D" opacity=".82"/%3E%3Ccircle cx="540" cy="140" r="76" fill="%238EF0B3" opacity=".72"/%3E%3C/svg%3E'

@Component({
  selector: 'app-campaign-page',
  standalone: true,
  imports: [HeroSectionComponent],
  templateUrl: './campaign-page.component.html',
})
export class CampaignPageComponent {
  readonly heroMedia = { src: campaignMedia, purpose: 'decorative' as const }
}
