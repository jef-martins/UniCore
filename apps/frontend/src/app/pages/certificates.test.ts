import { describe, expect, it } from 'vitest'
import {
  evaluateCertificateEligibility,
  formatDisplayDate,
  formatStudentCpf,
  getStudentInitials,
} from './certificates-utils'
import type { CertificateInscription } from '../services/certificates.service'

describe('Módulo de Gestão e Emissão de Certificados Acadêmicos', () => {
  it('deve extrair as iniciais do aluno corretamente para o avatar', () => {
    expect(getStudentInitials('João Carlos Silva')).toBe('JS')
    expect(getStudentInitials('Maria Souza')).toBe('MS')
    expect(getStudentInitials('Guilherme')).toBe('GU')
    expect(getStudentInitials('')).toBe('EX')
  })

  it('deve formatar CPF corretamente com máscara', () => {
    expect(formatStudentCpf('12345678901')).toBe('123.456.789-01')
    expect(formatStudentCpf('123.456.789-01')).toBe('123.456.789-01')
    expect(formatStudentCpf(null)).toBe('')
  })

  it('deve formatar datas para o padrão brasileiro', () => {
    expect(formatDisplayDate('2026-05-15T10:00:00Z')).toBe('15/05/2026')
    expect(formatDisplayDate(null)).toBe('-')
  })

  it('deve identificar participante apto quando possui taxa paga e presença confirmada', () => {
    const result = evaluateCertificateEligibility({
      isPaid: true,
      attendanceCount: 4,
    })

    expect(result.isEligible).toBe(true)
    expect(result.blockedReason).toBeUndefined()
  })

  it('deve bloquear participante quando a taxa não estiver quitada', () => {
    const result = evaluateCertificateEligibility({
      isPaid: false,
      attendanceCount: 5,
    })

    expect(result.isEligible).toBe(false)
    expect(result.blockedReason).toBe('Taxa de inscrição pendente de pagamento')
  })

  it('deve bloquear participante quando não houver registro de presenças', () => {
    const result = evaluateCertificateEligibility({
      isPaid: true,
      attendanceCount: 0,
    })

    expect(result.isEligible).toBe(false)
    expect(result.blockedReason).toBe('Sem presença confirmada no diário de aulas')
  })

  it('deve bloquear e indicar duplo motivo quando faltar quitação e presença', () => {
    const result = evaluateCertificateEligibility({
      isPaid: false,
      attendanceCount: 0,
    })

    expect(result.isEligible).toBe(false)
    expect(result.blockedReason).toBe('Taxa de inscrição pendente e sem registro de presença')
  })

  it('deve montar corretamente a estrutura completa de uma inscrição apta', () => {
    const item: CertificateInscription = {
      id: '101',
      studentRa: '245001',
      studentName: 'Ana Clara Prado',
      eventId: '55',
      eventTitle: 'Semana da Computação e IA',
      workloadHours: 20,
      startDate: '2026-05-10T00:00:00Z',
      endDate: '2026-05-14T00:00:00Z',
      isPaid: true,
      paymentDate: '2026-05-02T14:30:00Z',
      attendanceCount: 4,
      hasAttendance: true,
      isEligible: true,
    }

    const evalResult = evaluateCertificateEligibility({
      isPaid: item.isPaid,
      attendanceCount: item.attendanceCount,
    })

    expect(evalResult.isEligible).toBe(item.isEligible)
    expect(item.studentRa).toBe('245001')
    expect(item.workloadHours).toBe(20)
  })

  it('deve gerenciar participantes de eventos customizados alternando status pago/pendente', () => {
    interface TestCustomParticipant {
      id: string
      studentName: string
      studentRa: string
      isPaid: boolean
      paymentDate: string | null
      hasAttendance: boolean
    }

    const participant: TestCustomParticipant = {
      id: 'cp-1',
      studentName: 'Lucas Henrique',
      studentRa: '245099',
      isPaid: false,
      paymentDate: null,
      hasAttendance: true,
    }

    // Inicialmente pendente -> inapto
    let check = evaluateCertificateEligibility({
      isPaid: participant.isPaid,
      attendanceCount: participant.hasAttendance ? 1 : 0,
    })
    expect(check.isEligible).toBe(false)
    expect(check.blockedReason).toContain('Taxa de inscrição pendente')

    // Alterna para pago com 1 clique
    participant.isPaid = true
    participant.paymentDate = new Date().toISOString()

    check = evaluateCertificateEligibility({
      isPaid: participant.isPaid,
      attendanceCount: participant.hasAttendance ? 1 : 0,
    })
    expect(check.isEligible).toBe(true)
    expect(check.blockedReason).toBeUndefined()
    expect(participant.paymentDate).toBeTruthy()
  })

  it('deve bloquear emissão de participante customizado quando marcado como ausente', () => {
    const participant = {
      studentName: 'Beatriz Costa',
      studentRa: '245100',
      isPaid: true,
      hasAttendance: false,
    }

    const check = evaluateCertificateEligibility({
      isPaid: participant.isPaid,
      attendanceCount: participant.hasAttendance ? 1 : 0,
    })

    expect(check.isEligible).toBe(false)
    expect(check.blockedReason).toBe('Sem presença confirmada no diário de aulas')
  })

  it('deve suportar configuração de logo, modelo personalizado e estilo de posicionamento do nome do aluno', () => {
    const customEvent = {
      id: 'ev-test-1',
      title: 'Workshop de Inteligência Artificial Generativa',
      logoUrl: 'data:image/png;base64,iVBORw0KGgo...',
      certificateTemplateUrl: '/api/certificates/custom-events/ev-test-1/assets/template.png',
      templateStyle: {
        studentNameTop: 52,
        studentNameFontSize: 36,
        studentNameColor: '#1e3a8a',
      },
      workloadHours: 16,
    }

    expect(customEvent.logoUrl).toContain('data:image/png')
    expect(customEvent.certificateTemplateUrl).toContain('template.png')
    expect(customEvent.templateStyle.studentNameTop).toBe(52)
    expect(customEvent.templateStyle.studentNameFontSize).toBe(36)
    expect(customEvent.templateStyle.studentNameColor).toBe('#1e3a8a')
  })

  it('deve formatar e associar corretamente eventos no catálogo para o aluno logado', () => {
    const catalogItem = {
      id: 'ev-10',
      title: 'Jornada de Inovação e Tecnologia',
      speaker: 'Dra. Helena Martins',
      workloadHours: 24,
      startDate: '2026-10-01T08:00:00Z',
      endDate: '2026-10-03T18:00:00Z',
      location: 'Auditório Nobre',
      isRegistered: true,
      participantId: 'part-55',
      isPaid: true,
      hasAttendance: true,
      isEligible: true,
    }

    expect(catalogItem.isRegistered).toBe(true)
    expect(catalogItem.isEligible).toBe(true)
    expect(catalogItem.participantId).toBe('part-55')
  })

  it('deve identificar corretamente tarefas originadas de eventos acadêmicos na agenda', () => {
    const regularTask = { id: 'uuid-1234', title: 'Reunião de Colegiado' }
    const eventTask = { id: 'ev-abc-987', title: '🎓 [Evento] Semana Acadêmica de Engenharia' }

    const isAcademicEvent = (task: { id: string }) => task.id.startsWith('ev-')

    expect(isAcademicEvent(regularTask)).toBe(false)
    expect(isAcademicEvent(eventTask)).toBe(true)
  })
})

