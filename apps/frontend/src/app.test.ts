import { beforeEach, describe, expect, it } from 'vitest'
import { renderApp } from './app'

describe('renderApp', () => {
  let root: HTMLDivElement

  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    root = document.createElement('div')
    document.body.replaceChildren(root)
  })

  it('monta o hero entre cabeçalho, conteúdo principal e rodapé', () => {
    renderApp(root)

    expect(root.querySelector('.skip-link')?.getAttribute('href')).toBe('#main-content')
    expect(root.querySelector('header.site-header')).not.toBeNull()
    expect(root.querySelector('nav[aria-label="Navegação principal"]')).not.toBeNull()
    expect(root.querySelector('main#main-content')).not.toBeNull()
    expect(root.querySelector('section.hero-section')).not.toBeNull()
    expect(root.querySelector('footer.site-footer')).not.toBeNull()
  })

  it('monta os conteúdos neutros e a ação de destaque do hero', () => {
    renderApp(root)

    expect(root.querySelector('.portal-mark')?.textContent).toBe('UniCore')
    expect(root.querySelector('#hero-section-title')?.textContent).toBe('Um espaço para seus próximos passos.')
    expect(root.querySelector('.hero-description')?.textContent).toContain('Encontre informações')
    expect(root.querySelector('.header-actions .button-primary')?.textContent).toBe('Começar')
    expect(root.querySelector('.hero-section .button-primary')?.textContent).toBe('Conheça a inscrição')
  })

  it('marca a rota atual na navegação com aria-current', () => {
    window.history.replaceState({}, '', '/inscricao')
    renderApp(root)

    const activeLink = root.querySelector<HTMLAnchorElement>('a[aria-current="page"]')

    expect(activeLink?.getAttribute('href')).toBe('/inscricao')
    expect(activeLink?.textContent).toBe('Inscrição')
  })
})
