export type RouteName = 'home' | 'registration'

export interface AppRoute {
  name: RouteName
  path: string
  title: string
}

export const routes: readonly AppRoute[] = [
  { name: 'home', path: '/', title: 'Início' },
  { name: 'registration', path: '/inscricao', title: 'Inscrição' },
]

export function resolveRoute(pathname: string): AppRoute {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  return routes.find((route) => route.path === normalizedPath) ?? routes[0]
}

export function navigateTo(path: string): void {
  if (window.location.pathname === path) return
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
