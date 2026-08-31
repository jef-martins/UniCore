/**
 * Component Library do UniCore — componentes originais e neutros.
 *
 * Os componentes são renderizadores HTML sem dependência de framework. Todos
 * exigem rótulos visíveis quando representam controles, usam elementos nativos
 * para preservar nome/função/estado e aceitam conteúdo que pode refluír.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'text'
/** Estados documentados: default, hover, focus, pressed, disabled e error. */
export type ButtonState = 'default' | 'hover' | 'focus' | 'pressed' | 'disabled' | 'error'

export interface ButtonProps {
  label: string
  variant?: ButtonVariant
  state?: ButtonState
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  pressed?: boolean
  icon?: string
  id?: string
  describedBy?: string
  className?: string
}

export type ControlState = 'default' | 'focus' | 'error' | 'disabled'

export interface TextInputProps {
  id: string
  label: string
  name?: string
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number'
  value?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  state?: ControlState
  helpText?: string
  error?: string
  icon?: string
  autocomplete?: string
  describedBy?: string
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  id: string
  label: string
  options: readonly SelectOption[]
  name?: string
  value?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  state?: ControlState
  helpText?: string
  error?: string
  icon?: string
  describedBy?: string
}

export interface CheckboxProps {
  id: string
  label: string
  name?: string
  checked?: boolean
  required?: boolean
  disabled?: boolean
  state?: ControlState
  helpText?: string
  error?: string
  describedBy?: string
}

export interface ErrorMessageProps {
  id: string
  message: string
  live?: boolean
}

export type CardVariant = 'default' | 'elevated' | 'outlined'

export interface CardProps {
  children: string
  title?: string
  description?: string
  actions?: string
  variant?: CardVariant
  id?: string
  labelledBy?: string
  className?: string
}

export interface MediaCommonProps {
  src: string
  width?: number
  height?: number
  loading?: 'eager' | 'lazy'
  className?: string
  caption?: string
}

export interface InformativeMediaProps extends MediaCommonProps {
  purpose: 'informative'
  alt: string
}

export interface DecorativeMediaProps extends MediaCommonProps {
  purpose: 'decorative'
  alt?: ''
}

export type MediaProps = InformativeMediaProps | DecorativeMediaProps

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

function attribute(name: string, value: string | number | boolean | undefined): string {
  if (value === undefined || value === false) return ''
  if (value === true) return ` ${name}`
  return ` ${name}="${escapeHtml(String(value))}"`
}

function classNames(...names: readonly (string | false | undefined)[]): string {
  return names.filter(Boolean).join(' ')
}

function fieldDescriptionIds(
  id: string,
  helpText: string | undefined,
  error: string | undefined,
  describedBy: string | undefined,
): { describedBy: string | undefined; helpId: string; errorId: string } {
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const ids = [describedBy, helpText ? helpId : undefined, error ? errorId : undefined].filter(
    (value): value is string => Boolean(value),
  )
  return { describedBy: ids.length > 0 ? ids.join(' ') : undefined, helpId, errorId }
}

function requiredMark(required: boolean | undefined): string {
  return required ? '<span class="field-required" aria-hidden="true">*</span>' : ''
}

function iconMarkup(icon: string | undefined): string {
  return icon ? `<span class="component-icon" aria-hidden="true">${icon}</span>` : ''
}

/**
 * Button variants: primary (light primary action), secondary (outlined
 * surface) and text (low emphasis). The state attribute documents default,
 * hover, focus, pressed, disabled and error for visual/stateful consumers.
 */
export function Button({
  label,
  variant = 'primary',
  state = 'default',
  type = 'button',
  disabled = state === 'disabled',
  pressed = state === 'pressed',
  icon,
  id,
  describedBy,
  className,
}: ButtonProps): string {
  return `<button${attribute('id', id)} class="${classNames(
    'button',
    `button-${variant}`,
    `button-state-${state}`,
    className,
  )}" data-variant="${variant}" data-state="${state}" type="${type}"${attribute('disabled', disabled)}${attribute(
    'aria-pressed',
    pressed ? 'true' : undefined,
  )}${attribute('aria-describedby', describedBy)}${attribute(
    'aria-invalid',
    state === 'error' ? 'true' : undefined,
  )}>${iconMarkup(icon)}<span class="button-label">${escapeHtml(label)}</span></button>`
}

function helpMarkup(id: string, text: string | undefined): string {
  return text ? `<p class="field-help" id="${escapeHtml(id)}">${escapeHtml(text)}</p>` : ''
}

function errorMarkup(id: string, error: string | undefined): string {
  return error ? ErrorMessage({ id, message: error }) : ''
}

/** Text input states: default, focus, error and disabled. The label is always visible. */
export function TextInput({
  id,
  label,
  name,
  type = 'text',
  value,
  placeholder,
  required,
  disabled,
  readOnly,
  state = 'default',
  helpText,
  error,
  icon,
  autocomplete,
  describedBy,
}: TextInputProps): string {
  const ids = fieldDescriptionIds(id, helpText, error, describedBy)
  const invalid = state === 'error' || Boolean(error)
  return `<div class="field field-text-input" data-state="${state}">
    <label class="field-label" for="${escapeHtml(id)}">${escapeHtml(label)}${requiredMark(required)}</label>
    <div class="field-control-wrap">
      ${iconMarkup(icon)}
      <input class="field-control${icon ? ' field-control-with-icon' : ''}" id="${escapeHtml(id)}"${attribute(
        'name',
        name,
      )} type="${escapeHtml(type)}"${attribute('value', value)}${attribute(
        'placeholder',
        placeholder,
      )}${attribute('required', required)}${attribute('disabled', disabled || state === 'disabled')}${attribute(
        'readonly',
        readOnly,
      )}${attribute('autocomplete', autocomplete)}${attribute('aria-invalid', invalid ? 'true' : undefined)}${attribute(
        'aria-describedby',
        ids.describedBy,
      )} />
    </div>
    ${helpMarkup(ids.helpId, helpText)}
    ${errorMarkup(ids.errorId, error)}
  </div>`
}

/** Select states: default, focus, error and disabled. Options retain native select semantics. */
export function Select({
  id,
  label,
  options,
  name,
  value,
  placeholder,
  required,
  disabled,
  state = 'default',
  helpText,
  error,
  icon,
  describedBy,
}: SelectProps): string {
  const ids = fieldDescriptionIds(id, helpText, error, describedBy)
  const invalid = state === 'error' || Boolean(error)
  const placeholderMarkup = placeholder
    ? `<option value="" disabled${value ? '' : ' selected'}>${escapeHtml(placeholder)}</option>`
    : ''
  const optionMarkup = options
    .map(
      (option) =>
        `<option value="${escapeHtml(option.value)}"${attribute('disabled', option.disabled)}${
          value === option.value ? ' selected' : ''
        }>${escapeHtml(option.label)}</option>`,
    )
    .join('')
  return `<div class="field field-select" data-state="${state}">
    <label class="field-label" for="${escapeHtml(id)}">${escapeHtml(label)}${requiredMark(required)}</label>
    <div class="field-control-wrap">
      ${iconMarkup(icon)}
      <select class="field-control${icon ? ' field-control-with-icon' : ''}" id="${escapeHtml(id)}"${attribute(
        'name',
        name,
      )}${attribute('required', required)}${attribute('disabled', disabled || state === 'disabled')}${attribute(
        'aria-invalid',
        invalid ? 'true' : undefined,
      )}${attribute('aria-describedby', ids.describedBy)}>
        ${placeholderMarkup}${optionMarkup}
      </select>
    </div>
    ${helpMarkup(ids.helpId, helpText)}
    ${errorMarkup(ids.errorId, error)}
  </div>`
}

/** Checkbox states: default, focus, error and disabled; the label remains visible. */
export function Checkbox({
  id,
  label,
  name,
  checked,
  required,
  disabled,
  state = 'default',
  helpText,
  error,
  describedBy,
}: CheckboxProps): string {
  const ids = fieldDescriptionIds(id, helpText, error, describedBy)
  const invalid = state === 'error' || Boolean(error)
  return `<div class="field field-checkbox" data-state="${state}">
    <div class="checkbox-control-wrap">
      <input class="checkbox-control" id="${escapeHtml(id)}"${attribute('name', name)} type="checkbox"${attribute(
        'checked',
        checked,
      )}${attribute('required', required)}${attribute('disabled', disabled || state === 'disabled')}${attribute(
        'aria-invalid',
        invalid ? 'true' : undefined,
      )}${attribute('aria-describedby', ids.describedBy)} />
      <label class="checkbox-label" for="${escapeHtml(id)}">${escapeHtml(label)}${requiredMark(required)}</label>
    </div>
    ${helpMarkup(ids.helpId, helpText)}
    ${errorMarkup(ids.errorId, error)}
  </div>`
}

/**
 * Error message is a textual, assertive status. It is referenced by a control
 * through aria-describedby and does not rely on color or a decorative icon.
 */
export function ErrorMessage({ id, message, live = true }: ErrorMessageProps): string {
  return `<p class="error-message" id="${escapeHtml(id)}" role="alert"${attribute(
    'aria-live',
    live ? 'assertive' : undefined,
  )}><span class="component-icon" aria-hidden="true">!</span><span>${escapeHtml(message)}</span></p>`
}

/**
 * Card variants: default (standard surface), elevated (raised shadow) and
 * outlined (border emphasis). Slots flow vertically and may contain long text.
 */
export function Card({
  children,
  title,
  description,
  actions,
  variant = 'default',
  id,
  labelledBy,
  className,
}: CardProps): string {
  const titleId = labelledBy || (title && id ? `${id}-title` : undefined)
  return `<article${attribute('id', id)} class="${classNames(
    'card',
    `card-${variant}`,
    className,
  )}"${attribute('aria-labelledby', titleId)}>
    ${title ? `<h2${attribute('id', titleId)} class="card-title">${escapeHtml(title)}</h2>` : ''}
    ${description ? `<p class="card-description">${escapeHtml(description)}</p>` : ''}
    <div class="card-body">${children}</div>
    ${actions ? `<div class="card-actions">${actions}</div>` : ''}
  </article>`
}

/**
 * Media purposes are explicit: informative media requires equivalent alt text;
 * decorative media is removed from the accessibility tree with alt="" and
 * aria-hidden. The figure caption, when supplied, remains visible content.
 */
export function Media(props: MediaProps): string {
  const { src, width, height, loading = 'lazy', className, caption } = props
  const informative = props.purpose === 'informative'
  const alt = informative ? props.alt : ''
  const image = `<img class="media-image" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${attribute('aria-hidden', informative ? undefined : 'true')}${attribute('width', width)}${attribute('height', height)} loading="${loading}" decoding="async" />`
  const captionMarkup = caption ? `<figcaption class="media-caption">${escapeHtml(caption)}</figcaption>` : ''
  return `<figure class="${classNames('media', `media-${props.purpose}`, className)}">${image}${captionMarkup}</figure>`
}
