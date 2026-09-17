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
