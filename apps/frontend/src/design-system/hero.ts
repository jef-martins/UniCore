import { Button, Media, type MediaCommonProps, type MediaProps } from './components'

/** A neutral, visible action presented by the campaign section. */
export interface HeroCtaConfig {
  label: string
  /** Empty or whitespace-only destinations are treated as absent. */
  destination?: string
}

export type HeroMediaPurpose = 'informative' | 'decorative'

/** Media configuration supports the shared Media contract and an optional top-level purpose. */
export interface HeroMediaConfig extends MediaCommonProps {
  purpose?: HeroMediaPurpose
  alt?: string
}

export interface HeroConfig {
  /** Optional short campaign label displayed before the title. */
  eyebrow?: string
  title: string
  description: string
  cta: HeroCtaConfig
  /** Informative media requires alt text; decorative media stays out of the accessibility tree. */
  media: HeroMediaConfig
  mediaPurpose?: HeroMediaPurpose
  id?: string
  className?: string
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  )
}

function classNames(...names: readonly (string | false | undefined)[]): string {
  return names.filter(Boolean).join(' ')
}

function attribute(name: string, value: string | undefined): string {
  return value === undefined ? '' : ` ${name}="${escapeHtml(value)}"`
}

function ctaMarkup({ label, destination }: HeroCtaConfig): string {
  const normalizedDestination = destination?.trim() || undefined

  if (normalizedDestination) {
    return `<a class="button button-primary hero-cta" data-hero-cta="true" data-destination="${escapeHtml(
      normalizedDestination,
    )}" href="${escapeHtml(normalizedDestination)}">${escapeHtml(label)}</a>`
  }

  return Button({
    label,
    variant: 'primary',
    type: 'button',
    className: 'hero-cta',
  }).replace('<button ', '<button data-hero-cta="true" ')
}

function normalizeMedia(media: HeroMediaConfig, mediaPurpose?: HeroMediaPurpose): MediaProps {
  const purpose = mediaPurpose ?? media.purpose ?? (media.alt ? 'informative' : 'decorative')

  if (purpose === 'informative' && !media.alt?.trim()) {
    throw new Error('HeroSection: mídia informativa deve fornecer texto alternativo.')
  }

  if (purpose === 'informative') {
    return { ...media, purpose, alt: media.alt as string }
  }

  return { ...media, purpose, alt: '' }
}

/**
 * Renders the original UniCore campaign composition.
 *
 * The CTA is deliberately a native link only when a destination is configured;
 * without one it remains a visible, inert button and cannot redirect the user.
 */
export function HeroSection({
  eyebrow,
  title,
  description,
  cta,
  media,
  mediaPurpose,
  id = 'hero-section',
  className,
}: HeroConfig): string {
  const titleId = `${id}-title`
  const sectionClassName = escapeHtml(classNames('hero-section', className))
  const normalizedMedia = normalizeMedia(media, mediaPurpose)

  return `<section${attribute('id', id)} class="${sectionClassName}" aria-labelledby="${escapeHtml(
    titleId,
  )}">
    <div class="hero-promo">
      <div class="hero-content">
        ${eyebrow ? `<p class="hero-eyebrow">${escapeHtml(eyebrow)}</p>` : ''}
        <h1 id="${escapeHtml(titleId)}">${escapeHtml(title)}</h1>
        <p class="hero-description">${escapeHtml(description)}</p>
        <div class="hero-actions">${ctaMarkup(cta)}</div>
      </div>
      <div class="hero-media" data-media-purpose="${normalizedMedia.purpose}">
        ${Media(normalizedMedia)}
      </div>
    </div>
    <span class="hero-accent" aria-hidden="true"></span>
  </section>`
}
