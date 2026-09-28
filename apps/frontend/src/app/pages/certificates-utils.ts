export function getStudentInitials(name: string): string {
  if (!name) return 'EX'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export function formatStudentCpf(cpf: string | null): string {
  if (!cpf) return ''
  const clean = cpf.replace(/\D/g, '')
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return cpf
}

export function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR')
}

export function evaluateCertificateEligibility(item: {
  isPaid: boolean
  attendanceCount: number
}): { isEligible: boolean; blockedReason?: string } {
  const isPaid = item.isPaid
  const hasAttendance = item.attendanceCount > 0
  const isEligible = isPaid && hasAttendance

  let blockedReason: string | undefined
  if (!isEligible) {
    if (!isPaid && !hasAttendance) {
      blockedReason = 'Taxa de inscrição pendente e sem registro de presença'
    } else if (!isPaid) {
      blockedReason = 'Taxa de inscrição pendente de pagamento'
    } else {
      blockedReason = 'Sem presença confirmada no diário de aulas'
    }
  }

  return { isEligible, blockedReason }
}

/**
 * Monta o certificado clonado diretamente como filho direto de <body>
 * para garantir isolamento absoluto contra qualquer herança de layout,
 * margens, modais empilhados, backdrop-filter ou scroll do Angular/navegador.
 */
export function mountCertificateForPrint(sourceElementId = 'printable-certificate'): () => void {
  const certElement = document.getElementById(sourceElementId)
  if (!certElement) {
    document.body.classList.add('is-printing-cert')
    return () => document.body.classList.remove('is-printing-cert')
  }

  // Remove qualquer montagem anterior se existir
  const prevMount = document.getElementById('print-portal-mount')
  if (prevMount) {
    prevMount.remove()
  }

  const printMount = document.createElement('div')
  printMount.id = 'print-portal-mount'
  const clone = certElement.cloneNode(true) as HTMLElement
  clone.id = 'print-certificate-target'
  printMount.appendChild(clone)
  document.body.appendChild(printMount)
  document.body.classList.add('is-printing-cert')

  const cleanup = () => {
    document.body.classList.remove('is-printing-cert')
    const target = document.getElementById('print-portal-mount')
    if (target && target.parentNode) {
      target.parentNode.removeChild(target)
    }
  }

  return cleanup
}

/**
 * Dispara a impressão do certificado montado diretamente no <body>
 * garantindo encaixe exato em 1 única folha A4 Paisagem (297mm x 210mm).
 */
export function executeCertificatePrint(sourceElementId = 'printable-certificate'): void {
  const cleanup = mountCertificateForPrint(sourceElementId)

  let cleanedUp = false
  const runCleanup = () => {
    if (cleanedUp) return
    cleanedUp = true
    window.removeEventListener('afterprint', runCleanup)
    cleanup()
  }

  window.addEventListener('afterprint', runCleanup)

  // Pequeno timeout para renderização dos nós clonados antes de acionar o diálogo de impressão
  setTimeout(() => {
    window.print()
    // Fallback de segurança caso o navegador cancele o diálogo sem disparar afterprint
    setTimeout(runCleanup, 1500)
  }, 100)
}

/**
 * Retorna a declaração CSS font-family correspondente à chave tipográfica,
 * suportando serifadas clássicas, romanas, sem serifa e caligrafias cursivas.
 */
export function getCertificateFontFamily(font?: string): string {
  switch (font) {
    case 'great-vibes':
      return "'Great Vibes', 'Brush Script MT', cursive"
    case 'alex-brush':
      return "'Alex Brush', 'Brush Script MT', cursive"
    case 'pinyon':
      return "'Pinyon Script', 'Brush Script MT', cursive"
    case 'dancing':
      return "'Dancing Script', cursive"
    case 'cinzel':
      return "'Cinzel', Georgia, serif"
    case 'playfair':
      return "'Playfair Display', Georgia, serif"
    case 'montserrat':
    case 'sans':
      return "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    case 'times':
      return "'Times New Roman', Times, serif"
    case 'serif':
    default:
      return "Georgia, 'Times New Roman', serif"
  }
}

/**
 * Verifica se a fonte escolhida é cursiva/manuscrita
 */
export function isCursiveFont(font?: string): boolean {
  return (
    font === 'great-vibes' ||
    font === 'alex-brush' ||
    font === 'pinyon' ||
    font === 'dancing'
  )
}


