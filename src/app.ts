import { HeroSection } from './design-system/hero'
import { LayoutShell } from './design-system/layout-shell'
import { navigateTo, resolveRoute, routes, type AppRoute } from './routes'

const campaignMedia =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"%3E%3Crect width="720" height="480" fill="%230B0D0C"/%3E%3Cpath d="M0 340 180 160 330 300 520 90 720 280V480H0Z" fill="%2349D17D" opacity=".82"/%3E%3Ccircle cx="540" cy="140" r="76" fill="%238EF0B3" opacity=".72"/%3E%3C/svg%3E'

function appContent(): string {
  return HeroSection({
    eyebrow: 'Portal UniCore',
    title: 'Um espaço para seus próximos passos.',
    description: 'Encontre informações, organize sua jornada e acompanhe cada etapa em um só lugar.',
    cta: { label: 'Conheça a inscrição', destination: '/inscricao' },
    media: { src: campaignMedia, purpose: 'decorative' },
  })
}

function appMarkup(route: AppRoute): string {
  return LayoutShell({
    activePath: route.path,
    content: appContent(),
    navigation: routes.map(({ path, title }) => ({ href: path, label: title })),
    highlightAction: { href: '/inscricao', label: 'Começar' },
    footerLinks: [
      { href: '/', label: 'Acessibilidade' },
      { href: '/', label: 'Ajuda' },
    ],
  })
}

export function renderApp(root: HTMLElement): void {
  const update = (): void => {
    const route = resolveRoute(window.location.pathname)
    root.innerHTML = appMarkup(route)
    root.querySelectorAll<HTMLAnchorElement>('a[href^="/"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const destination = link.getAttribute('href')
        if (!destination || destination === window.location.pathname) return
        event.preventDefault()
        navigateTo(destination)
      })
    })
  }

  window.addEventListener('popstate', update)
  update()
}
