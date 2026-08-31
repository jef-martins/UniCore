import { describe, expect, it } from 'vitest'
import { HeroSection, type HeroConfig } from './hero'

function render(config: HeroConfig): HTMLDivElement {
  const container = document.createElement('div')
  container.innerHTML = HeroSection(config)
  return container
}

describe('HeroSection', () => {
  it('renderiza conteúdo configurável, CTA com destino e mídia informativa', () => {
    const container = render({
      eyebrow: 'Campanha neutra',
      title: 'Escolha seu próximo passo',
      description: 'Organize sua jornada com informações claras.',
      cta: { label: 'Ver opções', destination: '/opcoes' },
      mediaPurpose: 'informative',
      media: {
        src: '/media/campaign.svg',
        alt: 'Composição abstrata que apresenta as etapas da campanha.',
      },
    })

    const section = container.querySelector('section.hero-section')
    const cta = container.querySelector<HTMLAnchorElement>('[data-hero-cta]')
    const image = container.querySelector<HTMLImageElement>('img')

    expect(section?.getAttribute('aria-labelledby')).toBe('hero-section-title')
    expect(section?.querySelector('h1')?.textContent).toBe('Escolha seu próximo passo')
    expect(section?.querySelector('.hero-description')?.textContent).toBe(
      'Organize sua jornada com informações claras.',
    )
    expect(cta?.tagName).toBe('A')
    expect(cta?.getAttribute('href')).toBe('/opcoes')
    expect(cta?.textContent).toBe('Ver opções')
    expect(image?.getAttribute('alt')).toBe('Composição abstrata que apresenta as etapas da campanha.')
    expect(image?.getAttribute('aria-hidden')).toBeNull()
    expect(container.querySelector('[data-media-purpose="informative"]')).not.toBeNull()
  })

  it('mantém a CTA visível e sem navegação quando o destino está ausente', () => {
    const container = render({
      title: 'Uma campanha aberta',
      description: 'Consulte os próximos passos disponíveis.',
      cta: { label: 'Continuar', destination: '   ' },
      media: { src: '/media/decorative.svg', purpose: 'decorative' },
    })

    const cta = container.querySelector<HTMLButtonElement>('[data-hero-cta]')
    const image = container.querySelector<HTMLImageElement>('img')

    expect(cta?.tagName).toBe('BUTTON')
    expect(cta?.type).toBe('button')
    expect(cta?.textContent).toContain('Continuar')
    expect(cta?.getAttribute('href')).toBeNull()
    expect(cta?.getAttribute('data-destination')).toBeNull()
    expect(image?.getAttribute('alt')).toBe('')
    expect(image?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('[data-media-purpose="decorative"]')).not.toBeNull()
  })

  it('escapa conteúdo configurável sem perder a estrutura semântica', () => {
    const container = render({
      title: '<texto neutro>',
      description: 'Descrição & apoio',
      cta: { label: 'Ação <segura>', destination: '/destino?modo=claro&origem=hero' },
      media: { src: '/media/abstract.svg', purpose: 'decorative' },
    })

    expect(container.querySelector('h1')?.textContent).toBe('<texto neutro>')
    expect(container.querySelector('.hero-description')?.textContent).toBe('Descrição & apoio')
    expect(container.querySelector<HTMLAnchorElement>('a[data-hero-cta]')?.getAttribute('href')).toBe(
      '/destino?modo=claro&origem=hero',
    )
  })
})
