import { describe, expect, it } from 'vitest'
import { LayoutShell } from './layout-shell'

describe('LayoutShell', () => {
  it('renderiza marcos semânticos, atalho, busca e ação de destaque', () => {
    const container = document.createElement('div')
    container.innerHTML = LayoutShell({
      activePath: '/inscricao/',
      content: '<section aria-labelledby="content-title"><h1 id="content-title">Conteúdo</h1></section>',
      navigation: [
        { href: '/', label: 'Início' },
        { href: '/inscricao', label: 'Inscrição' },
      ],
      highlightAction: { href: '/inscricao', label: 'Começar' },
      footerLinks: [{ href: '/ajuda', label: 'Ajuda' }],
    })

    expect(container.querySelector('.skip-link')?.getAttribute('href')).toBe('#main-content')
    expect(container.querySelector('header.site-header')).not.toBeNull()
    expect(container.querySelector('nav[aria-label="Navegação principal"]')).not.toBeNull()
    expect(container.querySelector('button[data-layout-action="search"]')?.textContent).toBe('Buscar')
    expect(container.querySelector('main#main-content')?.getAttribute('tabindex')).toBe('-1')
    expect(container.querySelector('footer.site-footer')).not.toBeNull()
  })

  it('comunica a navegação ativa por aria-current e indicador não cromático', () => {
    const container = document.createElement('div')
    container.innerHTML = LayoutShell({
      activePath: '/inscricao',
      content: '<p>Conteúdo</p>',
      highlightAction: { href: '/inscricao', label: 'Começar' },
    })

    const activeLink = container.querySelector<HTMLAnchorElement>('a[aria-current="page"]')

    expect(activeLink?.textContent).toBe('Inscrição')
    expect(activeLink?.dataset.active).toBe('true')
    expect(container.querySelectorAll('a[aria-current="page"]')).toHaveLength(1)
  })

  it('escapa valores configuráveis sem alterar o conteúdo da página', () => {
    const container = document.createElement('div')
    container.innerHTML = LayoutShell({
      activePath: '/',
      content: '<p>Conteúdo próprio</p>',
      navigation: [{ href: '/?q=1&x=2', label: '<Navegação>' }],
      highlightAction: { href: '/inscricao?a=1&b=2', label: 'Ação <principal>' },
      footerLinks: [{ href: '/ajuda', label: 'Ajuda' }],
    })

    expect(container.querySelector('.primary-navigation a')?.textContent).toBe('<Navegação>')
    expect(container.querySelector('.button-primary')?.textContent).toBe('Ação <principal>')
    expect(container.querySelector('.button-primary')?.getAttribute('href')).toBe('/inscricao?a=1&b=2')
  })
})
