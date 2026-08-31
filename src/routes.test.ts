import { beforeEach, describe, expect, it, vi } from 'vitest'
import { navigateTo, resolveRoute, routes } from './routes'

describe('módulo público de rotas', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('expõe as rotas públicas do portal', () => {
    expect(routes).toEqual([
      { name: 'home', path: '/', title: 'Início' },
      { name: 'registration', path: '/inscricao', title: 'Inscrição' },
    ])
  })

  it('resolve a rota conhecida e normaliza barras finais', () => {
    expect(resolveRoute('/')).toEqual(routes[0])
    expect(resolveRoute('/inscricao')).toEqual(routes[1])
    expect(resolveRoute('/inscricao/')).toEqual(routes[1])
  })

  it('usa a rota inicial como fallback para caminhos desconhecidos', () => {
    expect(resolveRoute('/caminho-inexistente')).toEqual(routes[0])
  })

  it('navega para um destino público e emite uma atualização de histórico', () => {
    const popstateSpy = vi.spyOn(window, 'dispatchEvent')

    navigateTo('/inscricao')

    expect(window.location.pathname).toBe('/inscricao')
    expect(popstateSpy).toHaveBeenCalledOnce()
    expect(popstateSpy.mock.calls[0][0]).toBeInstanceOf(PopStateEvent)
  })

  it('não cria uma nova navegação quando o destino já está ativo', () => {
    window.history.replaceState({}, '', '/inscricao')
    const popstateSpy = vi.spyOn(window, 'dispatchEvent')

    navigateTo('/inscricao')

    expect(popstateSpy).not.toHaveBeenCalled()
  })
})
