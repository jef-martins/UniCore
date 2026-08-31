import { Component, Input } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { HeroCtaConfig, HeroMediaConfig, HeroMediaPurpose } from '../../../src/design-system/hero'

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './hero-section.component.html',
})
export class HeroSectionComponent {
  @Input() eyebrow?: string
  @Input({ required: true }) title = ''
  @Input({ required: true }) description = ''
  @Input({ required: true }) cta: HeroCtaConfig = { label: '' }
  @Input({ required: true }) media: HeroMediaConfig = { src: '', purpose: 'decorative' }
  @Input() mediaPurpose?: HeroMediaPurpose
  @Input() id = 'hero-section'
  @Input() className?: string

  get titleId(): string {
    return `${this.id}-title`
  }

  get destination(): string | undefined {
    return this.cta.destination?.trim() || undefined
  }

  get isInternalDestination(): boolean {
    return Boolean(this.destination?.startsWith('/'))
  }

  get resolvedMediaPurpose(): HeroMediaPurpose {
    const purpose = this.mediaPurpose ?? this.media.purpose ?? (this.media.alt ? 'informative' : 'decorative')
    if (purpose === 'informative' && !this.media.alt?.trim()) {
      throw new Error('HeroSection: mídia informativa deve fornecer texto alternativo.')
    }
    return purpose
  }

  get mediaAlt(): string {
    return this.resolvedMediaPurpose === 'informative' ? this.media.alt?.trim() ?? '' : ''
  }
}
