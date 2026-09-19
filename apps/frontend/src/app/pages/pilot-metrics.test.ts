import { describe, expect, it } from 'vitest'
import {
  classifySectorTrafficLight,
  computeConversions,
} from './territory-utils'

describe('Métricas do Piloto de 10 Dias & Semáforo dos Setores', () => {
  it('deve calcular as taxas de conversão corretamente com dados zerados', () => {
    const conv = computeConversions(0, 0, 0, 0, 0)
    expect(conv.contatoPorCasa).toBe(0)
    expect(conv.leadPorContato).toBe(0)
    expect(conv.leadPorCasa).toBe(0)
    expect(conv.inscricaoPorLead).toBe(0)
    expect(conv.matriculaPorLead).toBe(0)
  })

  it('deve calcular taxas de conversão de acordo com o exemplo do piloto', () => {
    // 1000 casas, 600 contatos, 200 leads, 50 inscrições, 20 matrículas
    const conv = computeConversions(1000, 600, 200, 50, 20)
    expect(conv.contatoPorCasa).toBe(60.0) // 600/1000
    expect(conv.leadPorContato).toBe(33.3) // 200/600
    expect(conv.leadPorCasa).toBe(20.0) // 200/1000
    expect(conv.inscricaoPorLead).toBe(25.0) // 50/200
    expect(conv.matriculaPorLead).toBe(10.0) // 20/200
  })

  it('deve classificar setor como VERDE quando gerar >= 20 leads por 100 casas', () => {
    const res1 = classifySectorTrafficLight(20, 100)
    expect(res1.leadsPer100Houses).toBe(20.0)
    expect(res1.classification).toBe('VERDE')

    const res2 = classifySectorTrafficLight(25, 100)
    expect(res2.leadsPer100Houses).toBe(25.0)
    expect(res2.classification).toBe('VERDE')

    const res3 = classifySectorTrafficLight(10, 50) // 20 por 100
    expect(res3.leadsPer100Houses).toBe(20.0)
    expect(res3.classification).toBe('VERDE')
  })

  it('deve classificar setor como AMARELO quando gerar entre 10 e 19.9 leads por 100 casas', () => {
    const res1 = classifySectorTrafficLight(15, 100)
    expect(res1.leadsPer100Houses).toBe(15.0)
    expect(res1.classification).toBe('AMARELO')

    const res2 = classifySectorTrafficLight(10, 100)
    expect(res2.leadsPer100Houses).toBe(10.0)
    expect(res2.classification).toBe('AMARELO')

    const res3 = classifySectorTrafficLight(19, 100)
    expect(res3.leadsPer100Houses).toBe(19.0)
    expect(res3.classification).toBe('AMARELO')
  })

  it('deve classificar setor como VERMELHO quando gerar < 10 leads por 100 casas', () => {
    const res1 = classifySectorTrafficLight(9, 100)
    expect(res1.leadsPer100Houses).toBe(9.0)
    expect(res1.classification).toBe('VERMELHO')

    const res2 = classifySectorTrafficLight(0, 100)
    expect(res2.leadsPer100Houses).toBe(0.0)
    expect(res2.classification).toBe('VERMELHO')

    const res3 = classifySectorTrafficLight(0, 0)
    expect(res3.leadsPer100Houses).toBe(0.0)
    expect(res3.classification).toBe('VERMELHO')
  })

  it('deve validar limites de porcentagem e status de metas do piloto', () => {
    const getGoalStatusClass = (pct: number) => {
      if (pct >= 100) return 'goal-achieved'
      if (pct >= 70) return 'goal-good'
      return 'goal-pending'
    }

    const getClampedPercent = (pct: number) => {
      return Math.min(Math.max(pct, 0), 100)
    }

    expect(getGoalStatusClass(120)).toBe('goal-achieved')
    expect(getGoalStatusClass(100)).toBe('goal-achieved')
    expect(getGoalStatusClass(85)).toBe('goal-good')
    expect(getGoalStatusClass(69.9)).toBe('goal-pending')
    expect(getGoalStatusClass(0)).toBe('goal-pending')

    expect(getClampedPercent(150)).toBe(100)
    expect(getClampedPercent(80)).toBe(80)
    expect(getClampedPercent(-10)).toBe(0)
  })
})

