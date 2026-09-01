import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { HeroSection, type HeroConfig } from './hero'

const textArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,39}$/)
const internalDestinationArb = fc.stringMatching(/^\/[a-z][a-z0-9/-]{0,24}$/)
const externalDestinationArb = fc.constantFrom(
  'https://example.test/inscricao',
  'https://portal.example.test/proximos-passos?origem=hero',
)
const destinationArb = fc.oneof(internalDestinationArb, externalDestinationArb)
const absentDestinationArb = fc.constantFrom<string | undefined>(undefined, '', '   ', '\t\n')

const heroConfigArb: fc.Arbitrary<HeroConfig> = fc
  .record({ title: textArb, description: textArb, label: textArb, destination: fc.oneof(destinationArb, absentDestinationArb) })
  .map(({ title, description, label, destination }) => ({
    title,
    description,
    cta: { label, destination },
    media: { src: '/media/neutral.svg', purpose: 'decorative' as const },
  }))

function render(config: HeroConfig): HTMLDivElement {
  const container = document.createElement('div')
  container.innerHTML = HeroSection(config)
  return container
}

function activateCta(container: HTMLDivElement): string[] {
  const commands: string[] = []
  const cta = container.querySelector<HTMLElement>('[data-hero-cta]')
  cta?.addEventListener('click', (event) => {
    const element = event.currentTarget as HTMLAnchorElement
    const destination = element.getAttribute('data-destination')
    if (element.tagName === 'A' && destination) commands.push(destination)
  })
  cta?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  return commands
}

// Feature: unicore, Property 1: Navegação total e segura da CTA
describe('Property 1: Navegação total e segura da CTA', () => {
  it('emite uma navegação idêntica para destinos válidos e nenhuma para destinos ausentes', () => {
    fc.assert(
      fc.property(heroConfigArb, (config) => {
        const container = render(config)
        const cta = container.querySelector<HTMLElement>('[data-hero-cta]')
        const commands = activateCta(container)
        const expectedDestination = config.cta.destination?.trim() || undefined

        expect(cta).not.toBeNull()
        expect(container.contains(cta)).toBe(true)
        expect(cta?.textContent).toBe(config.cta.label)
        expect(commands).toHaveLength(expectedDestination ? 1 : 0)
        expect(commands[0]).toBe(expectedDestination)
        expect(cta?.getAttribute('data-destination')).toBe(expectedDestination ?? null)
        expect(cta?.getAttribute('href')).toBe(expectedDestination ?? null)
      }),
      { numRuns: 100 },
    )
  })
})
