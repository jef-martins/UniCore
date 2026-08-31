import { describe, expect, it } from 'vitest'
import {
  Button,
  Card,
  Checkbox,
  ErrorMessage,
  Media,
  Select,
  TextInput,
} from './components'
import { LayoutShell } from './layout-shell'

function render(markup: string): HTMLDivElement {
  const container = document.createElement('div')
  container.innerHTML = markup
  return container
}

describe('Component Library', () => {
  it('renderiza as variantes de botão com nome acessível, função nativa e estados documentados', () => {
    const variants = ['primary', 'secondary', 'text'] as const
    const states = ['default', 'hover', 'focus', 'pressed', 'disabled', 'error'] as const

    for (const variant of variants) {
      const container = render(
        Button({
          label: `${variant} action`,
          variant,
          state: 'default',
          type: 'submit',
        }),
      )
      const button = container.querySelector('button')

      expect(button).not.toBeNull()
      expect(button?.classList.contains(`button-${variant}`)).toBe(true)
      expect(button?.dataset.variant).toBe(variant)
      expect(button?.textContent).toContain(`${variant} action`)
      expect(button?.getAttribute('type')).toBe('submit')
    }

    for (const state of states) {
      const container = render(Button({ label: 'Continuar', state }))
      const button = container.querySelector('button')

      expect(button?.dataset.state).toBe(state)
      expect(button?.classList.contains(`button-state-${state}`)).toBe(true)
    }

    const pressed = render(Button({ label: 'Selecionar', state: 'pressed' })).querySelector('button')
    expect(pressed?.getAttribute('aria-pressed')).toBe('true')
    expect(pressed?.textContent).toContain('Selecionar')

    const invalid = render(Button({ label: 'Enviar', state: 'error' })).querySelector('button')
    expect(invalid?.getAttribute('aria-invalid')).toBe('true')
  })

  it('oculta ícones decorativos sem alterar o nome acessível do botão', () => {
    const container = render(Button({ label: 'Buscar', icon: '⌕' }))
    const button = container.querySelector('button')
    const icon = container.querySelector('.component-icon')

    expect(button?.textContent).toContain('Buscar')
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(button?.getAttribute('aria-label')).toBeNull()
  })

  it('aplica semântica desabilitada a botão e controles em estado disabled', () => {
    const button = render(Button({ label: 'Indisponível', state: 'disabled' })).querySelector('button')
    const input = render(TextInput({ id: 'disabled-input', label: 'Nome', state: 'disabled' })).querySelector('input')
    const select = render(
      Select({
        id: 'disabled-select',
        label: 'Categoria',
        options: [{ value: 'one', label: 'Uma opção' }],
        state: 'disabled',
      }),
    ).querySelector('select')
    const checkbox = render(Checkbox({ id: 'disabled-checkbox', label: 'Aceitar', state: 'disabled' })).querySelector(
      'input',
    )

    expect(button?.disabled).toBe(true)
    expect(input?.disabled).toBe(true)
    expect(select?.disabled).toBe(true)
    expect(checkbox?.disabled).toBe(true)
  })

  it('associa rótulos visíveis, ajuda e mensagens de erro aos controles', () => {
    const inputContainer = render(
      TextInput({
        id: 'email',
        label: 'Endereço de e-mail',
        helpText: 'Use um endereço válido.',
        error: 'Informe um endereço válido.',
        icon: '@',
      }),
    )
    const input = inputContainer.querySelector('input')
    const label = inputContainer.querySelector('label')
    const error = inputContainer.querySelector('#email-error')

    expect(label?.textContent).toContain('Endereço de e-mail')
    expect(label?.getAttribute('for')).toBe('email')
    expect(input?.id).toBe('email')
    expect(input?.getAttribute('aria-invalid')).toBe('true')
    expect(input?.getAttribute('aria-describedby')).toBe('email-help email-error')
    expect(error?.getAttribute('role')).toBe('alert')
    expect(error?.textContent).toContain('Informe um endereço válido.')
    expect(inputContainer.querySelector('.component-icon')?.getAttribute('aria-hidden')).toBe('true')

    const selectContainer = render(
      Select({
        id: 'category',
        label: 'Categoria',
        options: [
          { value: 'one', label: 'Uma opção' },
          { value: 'two', label: 'Outra opção', disabled: true },
        ],
        placeholder: 'Escolha uma categoria',
        error: 'Escolha uma categoria.',
      }),
    )
    const select = selectContainer.querySelector('select')
    expect(selectContainer.querySelector('label')?.getAttribute('for')).toBe('category')
    expect(select?.getAttribute('aria-invalid')).toBe('true')
    expect(select?.getAttribute('aria-describedby')).toBe('category-error')
    expect(selectContainer.querySelector<HTMLOptionElement>('option[value="two"]')?.disabled).toBe(true)

    const checkboxContainer = render(
      Checkbox({
        id: 'terms',
        label: 'Aceito os termos',
        required: true,
        error: 'Aceite os termos para continuar.',
      }),
    )
    const checkbox = checkboxContainer.querySelector('input')
    expect(checkboxContainer.querySelector('label')?.getAttribute('for')).toBe('terms')
    expect(checkbox?.type).toBe('checkbox')
    expect(checkbox?.required).toBe(true)
    expect(checkbox?.getAttribute('aria-invalid')).toBe('true')
    expect(checkbox?.getAttribute('aria-describedby')).toBe('terms-error')
    expect(checkboxContainer.querySelector('#terms-error')?.getAttribute('role')).toBe('alert')
  })

  it('expõe mensagens de erro textuais e anunciáveis sem depender do ícone', () => {
    const container = render(ErrorMessage({ id: 'form-error', message: 'Não foi possível concluir.', live: true }))
    const message = container.querySelector('#form-error')

    expect(message?.getAttribute('role')).toBe('alert')
    expect(message?.getAttribute('aria-live')).toBe('assertive')
    expect(message?.textContent).toContain('Não foi possível concluir.')
    expect(message?.querySelector('.component-icon')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('preserva semântica e variantes do card para conteúdo longo', () => {
    const longContent = 'Conteúdo extenso '.repeat(30)
    const container = render(
      Card({
        id: 'details-card',
        title: 'Detalhes',
        description: 'Informações complementares.',
        children: longContent,
        variant: 'elevated',
        actions: '<button type="button">Continuar</button>',
      }),
    )
    const card = container.querySelector('article')

    expect(card?.classList.contains('card-elevated')).toBe(true)
    expect(card?.getAttribute('aria-labelledby')).toBe('details-card-title')
    expect(card?.querySelector('h2#details-card-title')?.textContent).toBe('Detalhes')
    expect(card?.querySelector('.card-body')?.textContent).toBe(longContent)
    expect(card?.querySelector('.card-actions button')?.textContent).toBe('Continuar')
  })

  it('distingue mídia informativa de mídia decorativa na árvore acessível', () => {
    const informative = render(
      Media({
        src: '/media/informative.svg',
        purpose: 'informative',
        alt: 'Ilustração de uma jornada.',
      }),
    ).querySelector('img')
    const decorative = render(
      Media({
        src: '/media/decorative.svg',
        purpose: 'decorative',
      }),
    ).querySelector('img')

    expect(informative?.getAttribute('alt')).toBe('Ilustração de uma jornada.')
    expect(informative?.getAttribute('aria-hidden')).toBeNull()
    expect(decorative?.getAttribute('alt')).toBe('')
    expect(decorative?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('LayoutShell navigation', () => {
  it('expõe um único item ativo com aria-current, nome e indicador adicional', () => {
    const container = render(
      LayoutShell({
        activePath: '/inscricao/?ref=menu',
        content: '<h1>Inscrição</h1>',
        navigation: [
          { href: '/', label: 'Início' },
          { href: '/inscricao', label: 'Inscrição' },
          { href: '/ajuda', label: 'Ajuda' },
        ],
        highlightAction: { href: '/inscricao', label: 'Começar' },
      }),
    )
    const navigation = container.querySelector('nav[aria-label="Navegação principal"]')
    const activeLink = navigation?.querySelector<HTMLAnchorElement>('a[aria-current="page"]')

    expect(navigation).not.toBeNull()
    expect(navigation?.querySelectorAll('a')).toHaveLength(3)
    expect(activeLink?.textContent).toBe('Inscrição')
    expect(activeLink?.getAttribute('href')).toBe('/inscricao')
    expect(activeLink?.dataset.active).toBe('true')
    expect(navigation?.querySelectorAll('a[aria-current="page"]')).toHaveLength(1)
  })
})
