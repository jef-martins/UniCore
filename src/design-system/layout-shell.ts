export interface LayoutShellNavigationItem {
  href: string
  label: string
}

export interface LayoutShellFooterLink {
  href: string
  label: string
}

export interface LayoutShellAction {
  href: string
  label: string
}

export interface LayoutShellProps {
  activePath: string
  content: string
  navigation?: readonly LayoutShellNavigationItem[]
  highlightAction: LayoutShellAction
  footerLinks?: readonly LayoutShellFooterLink[]
  portalLabel?: string
  mainId?: string
  footerDescription?: string
  searchLabel?: string
  highlightActionLabel?: string
}

const defaultNavigation: readonly LayoutShellNavigationItem[] = [
  { href: '/', label: 'Início' },
  { href: '/inscricao', label: 'Inscrição' },
]

const defaultFooterLinks: readonly LayoutShellFooterLink[] = [
  { href: '/', label: 'Acessibilidade' },
  { href: '/', label: 'Ajuda' },
]

const defaultProps = {
  portalLabel: 'UniCore',
  mainId: 'main-content',
  footerDescription: 'UniCore · Sistema de experiência digital',
  searchLabel: 'Buscar no portal',
  highlightActionLabel: 'Começar',
} as const

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

function normalizePath(path: string): string {
  const pathWithoutQuery = path.split(/[?#]/, 1)[0] ?? '/'
  return pathWithoutQuery.replace(/\/+$/, '') || '/'
}

function navigationMarkup(
  items: readonly LayoutShellNavigationItem[],
  activePath: string,
): string {
  const normalizedActivePath = normalizePath(activePath)

  return items
    .map((item) => {
      const isActive = normalizePath(item.href) === normalizedActivePath
      const activeAttributes = isActive
        ? ' aria-current="page" data-active="true"'
        : ''

      return `<li><a href="${escapeHtml(item.href)}"${activeAttributes}>${escapeHtml(item.label)}</a></li>`
    })
    .join('')
}

function footerLinksMarkup(links: readonly LayoutShellFooterLink[]): string {
  return links
    .map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`)
    .join('')
}

/**
 * Renders the reusable semantic page frame used by UniCore screens.
 * The content slot is intentionally provided by the consuming screen; all
 * shell labels, links and actions remain neutral and configurable.
 */
export function LayoutShell({
  activePath,
  content,
  navigation = defaultNavigation,
  highlightAction,
  footerLinks = defaultFooterLinks,
  portalLabel = defaultProps.portalLabel,
  mainId = defaultProps.mainId,
  footerDescription = defaultProps.footerDescription,
  searchLabel = defaultProps.searchLabel,
  highlightActionLabel = defaultProps.highlightActionLabel,
}: LayoutShellProps): string {
  const safeMainId = escapeHtml(mainId)
  const safePortalLabel = escapeHtml(portalLabel)

  return `
    <div class="layout-shell">
      <a class="skip-link" href="#${safeMainId}">Ir para o conteúdo</a>
      <header class="site-header">
        <div class="page-container header-inner">
          <a class="portal-mark" href="/" aria-label="${safePortalLabel}, início">${safePortalLabel}</a>
          <nav aria-label="Navegação principal">
            <ul class="primary-navigation">${navigationMarkup(navigation, activePath)}</ul>
          </nav>
          <div class="header-actions">
            <button class="action-link" type="button" data-layout-action="search" aria-label="${escapeHtml(searchLabel)}">Buscar</button>
            <a class="button button-primary" href="${escapeHtml(highlightAction.href)}">${escapeHtml(highlightAction.label || highlightActionLabel)}</a>
          </div>
        </div>
      </header>
      <main id="${safeMainId}" class="page-container page-main" tabindex="-1">
        ${content}
      </main>
      <footer class="site-footer">
        <div class="page-container footer-inner">
          <p>${escapeHtml(footerDescription)}</p>
          <nav aria-label="Links complementares">${footerLinksMarkup(footerLinks)}</nav>
        </div>
      </footer>
    </div>`
}
