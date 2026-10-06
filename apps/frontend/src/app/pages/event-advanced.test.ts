import { describe, expect, it } from 'vitest'

describe('Regras de Negócio do Módulo Avançado de Eventos (Frontend & Portabilidade)', () => {
  describe('Cálculo Dinâmico de Lotes e Preços', () => {
    it('deve aplicar preço promocional para aluno se a data limite estiver no futuro', () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString()
      const event = {
        standardPrice: 50.0,
        promoPrice: 35.0,
        promoDeadline: tomorrow,
        teacherPrice: 80.0,
        teacherPromoPrice: 60.0,
        teacherPromoDeadline: tomorrow,
      }

      const isPromo = new Date(event.promoDeadline).getTime() > Date.now()
      expect(isPromo).toBe(true)

      const calculatedPrice = isPromo && event.promoPrice ? event.promoPrice : event.standardPrice
      expect(calculatedPrice).toBe(35.0)
    })

    it('deve aplicar preço padrão para aluno se a data limite tiver expirado', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString()
      const event = {
        standardPrice: 50.0,
        promoPrice: 35.0,
        promoDeadline: yesterday,
      }

      const isPromo = new Date(event.promoDeadline).getTime() > Date.now()
      expect(isPromo).toBe(false)

      const calculatedPrice = isPromo && event.promoPrice ? event.promoPrice : event.standardPrice
      expect(calculatedPrice).toBe(50.0)
    })

    it('deve calcular corretamente para perfil docente', () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString()
      const event = {
        standardPrice: 50.0,
        teacherPrice: 80.0,
        teacherPromoPrice: 60.0,
        teacherPromoDeadline: tomorrow,
      }

      const isDocente = true
      const isPromoDocente = new Date(event.teacherPromoDeadline).getTime() > Date.now()
      const price = isDocente
        ? (isPromoDocente && event.teacherPromoPrice ? event.teacherPromoPrice : event.teacherPrice)
        : event.standardPrice

      expect(price).toBe(60.0)
    })
  })

  describe('Controle de Vagas de Workshops', () => {
    it('deve calcular corretamente vagas ocupadas e restantes', () => {
      const workshop = {
        title: 'Mini-curso de Docker e Cloud',
        vacancies: 30,
        occupiedVacancies: 18,
        remainingVacancies: 12,
      }

      expect(workshop.vacancies - workshop.occupiedVacancies).toBe(workshop.remainingVacancies)
      const occupancyPercentage = (workshop.occupiedVacancies / workshop.vacancies) * 100
      expect(occupancyPercentage).toBe(60)
    })

    it('deve sinalizar workshop esgotado quando vagas restantes forem 0', () => {
      const workshop = {
        vacancies: 25,
        occupiedVacancies: 25,
        remainingVacancies: 0,
      }

      const isSoldOut = workshop.remainingVacancies <= 0
      expect(isSoldOut).toBe(true)
    })
  })

  describe('Paridade de Portaria (Entrada e Saída)', () => {
    it('deve definir entrada quando o total de acessos hoje for par (0, 2, 4...)', () => {
      const checkinType0 = 0 % 2 === 0 ? 'entrada' : 'saida'
      const checkinType2 = 2 % 2 === 0 ? 'entrada' : 'saida'
      expect(checkinType0).toBe('entrada')
      expect(checkinType2).toBe('entrada')
    })

    it('deve definir saída quando o total de acessos hoje for ímpar (1, 3, 5...)', () => {
      const checkinType1 = 1 % 2 === 0 ? 'entrada' : 'saida'
      const checkinType3 = 3 % 2 === 0 ? 'entrada' : 'saida'
      expect(checkinType1).toBe('saida')
      expect(checkinType3).toBe('saida')
    })
  })

  describe('Balanço Financeiro e NPS', () => {
    it('deve calcular saldo líquido com base em ingressos pagos, patrocínios e despesas', () => {
      const summary = {
        ticketsRevenue: 3500.0,
        sponsorsTotal: 1500.0,
        expensesTotal: 1800.0,
        netBalance: 3500.0 + 1500.0 - 1800.0,
      }

      expect(summary.netBalance).toBe(3200.0)
      expect(summary.netBalance > 0).toBe(true)
    })

    it('deve calcular média aritmética de avaliações (1 a 5 estrelas)', () => {
      const feedbacks = [
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
        { rating: 4 },
      ]

      const sum = feedbacks.reduce((acc, f) => acc + f.rating, 0)
      const avg = sum / feedbacks.length
      expect(avg).toBe(4.5)
    })
  })

  describe('Requerimento Oficial FAIP e Credenciamento (Fase 3)', () => {
    it('deve formatar protocolo de 6 dígitos numéricos corretamente a partir do ID do ticket', () => {
      const formatProtocol = (id: string): string => {
        if (!id) return '000001'
        const hex = id.replace(/[^0-9]/g, '')
        if (hex.length >= 6) return hex.slice(0, 6)
        return id.slice(0, 6).toUpperCase()
      }

      expect(formatProtocol('ticket-12345678-abc')).toBe('123456')
      expect(formatProtocol('f9e8d7c6-b5a4-1111')).toBe('987654')
      expect(formatProtocol('abc')).toBe('ABC')
    })

    it('deve limpar e formatar máscara de CPF corretamente', () => {
      const formatCpfMask = (cpf: string): string => {
        const numbers = cpf.replace(/\D/g, '').slice(0, 11)
        if (numbers.length > 9) {
          return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
        }
        return numbers
      }

      expect(formatCpfMask('12345678901')).toBe('123.456.789-01')
      expect(formatCpfMask('123.456.789-01')).toBe('123.456.789-01')
    })

    it('deve permitir troca de oficina filtrando apenas oficinas com vagas e excluindo a atual', () => {
      const currentWorkshopId = 'wk-1'
      const allWorkshops = [
        { id: 'wk-1', title: 'Oficina Atual', remainingVacancies: 5 },
        { id: 'wk-2', title: 'Oficina IA', remainingVacancies: 10 },
        { id: 'wk-3', title: 'Oficina Robótica', remainingVacancies: 0 },
      ]

      const availableForSwitch = allWorkshops.filter(
        (w) => w.id !== currentWorkshopId && w.remainingVacancies > 0,
      )

      expect(availableForSwitch.length).toBe(1)
      expect(availableForSwitch[0].id).toBe('wk-2')
    })
  })
})
