import { describe, expect, it } from 'vitest'
import {
  TrafficLightStatus,
  buildFullAddress,
  classifyCompositeTrafficLight,
  classifyNeighborhoodTrafficLight,
  classifyStreetTrafficLight,
  classifySubterritoryTrafficLight,
  classifyTerritoryTrafficLight,
  formatGoogleMapsRouteUrl,
  formatGoogleMapsUrl,
  getDeterministicCoordinates,
  getTrafficLightInfo,
} from './map-utils'

describe('map-utils - Semáforo Hierárquico e Utilitários de Mapa', () => {
  describe('Nível 1: classifyStreetTrafficLight (Base por contagem de leads)', () => {
    it('deve classificar como VERDE quando a rua tiver 20 ou mais leads', () => {
      expect(classifyStreetTrafficLight(20)).toBe('VERDE')
      expect(classifyStreetTrafficLight(25)).toBe('VERDE')
      expect(classifyStreetTrafficLight(100)).toBe('VERDE')
    })

    it('deve classificar como VERDE quando a rua estiver concluída (isCompleted = true), mesmo com menos de 20 leads', () => {
      // Ex: rua com 1 residência que já recebeu visita (1/1 lead)
      expect(classifyStreetTrafficLight(1, true)).toBe('VERDE')
      expect(classifyStreetTrafficLight(5, true)).toBe('VERDE')
      expect(classifyStreetTrafficLight(0, true)).toBe('VERDE')
    })

    it('deve classificar como AMARELO quando a rua tiver entre 10 e 19 leads', () => {
      expect(classifyStreetTrafficLight(10)).toBe('AMARELO')
      expect(classifyStreetTrafficLight(15)).toBe('AMARELO')
      expect(classifyStreetTrafficLight(19)).toBe('AMARELO')
    })

    it('deve classificar como VERMELHO quando a rua tiver menos de 10 leads', () => {
      expect(classifyStreetTrafficLight(0)).toBe('VERMELHO')
      expect(classifyStreetTrafficLight(5)).toBe('VERMELHO')
      expect(classifyStreetTrafficLight(9)).toBe('VERMELHO')
      expect(classifyStreetTrafficLight(-1)).toBe('VERMELHO')
    })
  })

  describe('Nível 2, 3 e 4: classifyCompositeTrafficLight (Cascata da Maioria e Média)', () => {
    it('deve retornar VERMELHO se a lista estiver vazia', () => {
      expect(classifyCompositeTrafficLight([])).toBe('VERMELHO')
    })

    it('deve retornar VERDE se a maioria absoluta dos itens for VERDE', () => {
      // 3 de 5 é verde (> 2.5)
      const list1: TrafficLightStatus[] = ['VERDE', 'VERDE', 'VERDE', 'AMARELO', 'VERMELHO']
      expect(classifyCompositeTrafficLight(list1)).toBe('VERDE')

      // 2 de 3 é verde (> 1.5)
      const list2: TrafficLightStatus[] = ['VERDE', 'VERDE', 'VERMELHO']
      expect(classifyCompositeTrafficLight(list2)).toBe('VERDE')

      // 1 de 1 é verde (> 0.5)
      expect(classifyCompositeTrafficLight(['VERDE'])).toBe('VERDE')
    })

    it('deve retornar AMARELO quando não for maioria verde, mas estiver na média (verdes + amarelos >= total / 2)', () => {
      // 2 verdes de 4 não é maioria (> 2), mas verdes + amarelos (2 + 1 = 3 >= 2) -> AMARELO
      const list1: TrafficLightStatus[] = ['VERDE', 'VERDE', 'AMARELO', 'VERMELHO']
      expect(classifyCompositeTrafficLight(list1)).toBe('AMARELO')

      // 1 verde, 1 amarelo, 1 vermelho -> total 3. verdes = 1 (não é > 1.5), verdes + amarelos = 2 (>= 1.5) -> AMARELO
      const list2: TrafficLightStatus[] = ['VERDE', 'AMARELO', 'VERMELHO']
      expect(classifyCompositeTrafficLight(list2)).toBe('AMARELO')

      // Todos amarelos
      const list3: TrafficLightStatus[] = ['AMARELO', 'AMARELO', 'AMARELO']
      expect(classifyCompositeTrafficLight(list3)).toBe('AMARELO')
    })

    it('deve retornar VERMELHO quando a maioria for vermelha (abaixo da média)', () => {
      // 3 vermelhos de 4 -> verdes + amarelos = 1 (< 2) -> VERMELHO
      const list1: TrafficLightStatus[] = ['VERMELHO', 'VERMELHO', 'VERMELHO', 'VERDE']
      expect(classifyCompositeTrafficLight(list1)).toBe('VERMELHO')

      // 2 vermelhos de 3 -> verdes + amarelos = 1 (< 1.5) -> VERMELHO
      const list2: TrafficLightStatus[] = ['VERMELHO', 'VERMELHO', 'AMARELO']
      expect(classifyCompositeTrafficLight(list2)).toBe('VERMELHO')
    })
  })

  describe('Integração de Bairro, Subterritório e Território', () => {
    it('deve classificar Bairro corretamente com base em suas ruas', () => {
      // Bairro A: 2 ruas com 25 e 22 leads (ambas verdes) e 1 com 5 leads (vermelha) -> Maioria verde -> VERDE
      const bairroA = classifyNeighborhoodTrafficLight([
        { leadsCount: 25 },
        { leadsCount: 22 },
        { leadsCount: 5 },
      ])
      expect(bairroA).toBe('VERDE')

      // Bairro B: 1 rua verde (25 leads), 1 amarela (12 leads), 2 vermelhas (2 e 4 leads)
      // total = 4, verdes = 1, verdes + amarelos = 2 (>= 4/2) -> AMARELO
      const bairroB = classifyNeighborhoodTrafficLight([
        { leadsCount: 25 },
        { leadsCount: 12 },
        { leadsCount: 2 },
        { leadsCount: 4 },
      ])
      expect(bairroB).toBe('AMARELO')

      // Bairro C: 3 ruas com 3, 4 e 8 leads (todas vermelhas) -> VERMELHO
      const bairroC = classifyNeighborhoodTrafficLight([
        { leadsCount: 3 },
        { leadsCount: 4 },
        { leadsCount: 8 },
      ])
      expect(bairroC).toBe('VERMELHO')

      // Bairro D (ex: Santo barion): 1 rua com 1 lead, porém 100% concluída (isCompleted = true)
      // Deve obrigatoriamente ser VERDE
      const bairroD = classifyNeighborhoodTrafficLight(
        [{ leadsCount: 1, stats: { isCompleted: true, totalResidences: 1, visitedResidences: 1 } }],
        true,
      )
      expect(bairroD).toBe('VERDE')
    })

    it('deve classificar Subterritório corretamente com base em seus bairros ou conclusão', () => {
      const subterritorio = classifySubterritoryTrafficLight([
        { status: 'VERDE' },
        { status: 'VERDE' },
        { status: 'VERMELHO' },
      ])
      expect(subterritorio).toBe('VERDE')

      // Subterritório com isCompleted = true
      expect(classifySubterritoryTrafficLight([], true)).toBe('VERDE')
    })

    it('deve classificar Território corretamente com base em seus subterritórios ou conclusão', () => {
      const territorioConcluido = classifyTerritoryTrafficLight([], true)
      expect(territorioConcluido).toBe('VERDE')
      const territorioVerde = classifyTerritoryTrafficLight([
        { status: 'VERDE' },
        { status: 'VERDE' },
        { status: 'AMARELO' },
      ])
      expect(territorioVerde).toBe('VERDE')

      const territorioAmarelo = classifyTerritoryTrafficLight([
        { status: 'VERDE' },
        { status: 'AMARELO' },
        { status: 'VERMELHO' },
        { status: 'VERMELHO' },
      ])
      // total = 4. verdes = 1, verdes + amarelos = 2 (>= 2) -> AMARELO
      expect(territorioAmarelo).toBe('AMARELO')

      const territorioVermelho = classifyTerritoryTrafficLight([
        { status: 'VERMELHO' },
        { status: 'VERMELHO' },
        { status: 'VERMELHO' },
        { status: 'VERDE' },
      ])
      expect(territorioVermelho).toBe('VERMELHO')
    })
  })

  describe('Google Maps & Endereços', () => {
    it('deve montar o endereço completo corretamente', () => {
      const address = buildFullAddress({
        streetName: 'Rua das Flores',
        number: '123',
        neighborhoodName: 'Jardim América',
        cityName: 'Marília',
        state: 'SP',
        cep: '17500-000',
      })
      expect(address).toBe('Rua das Flores, 123, Jardim América, Marília - SP, CEP 17500-000')
    })

    it('deve formatar URL de busca do Google Maps com encode seguro', () => {
      const url = formatGoogleMapsUrl('Rua das Flores, 123, Marília - SP')
      expect(url).toContain('https://www.google.com/maps/search/?api=1&query=')
      expect(url).toContain('Rua%20das%20Flores%2C%20123%2C%20Mar%C3%ADlia%20-%20SP')
    })

    it('deve formatar URL de rota do Google Maps', () => {
      const url = formatGoogleMapsRouteUrl('Rua das Flores, 123, Marília - SP')
      expect(url).toContain('https://www.google.com/maps/dir/?api=1&destination=')
    })
  })

  describe('Metadados e Coordenadas', () => {
    it('deve retornar metadados visuais corretos para cada cor', () => {
      expect(getTrafficLightInfo('VERDE').icon).toBe('🟢')
      expect(getTrafficLightInfo('VERDE').color).toBe('#22c55e')

      expect(getTrafficLightInfo('AMARELO').icon).toBe('🟡')
      expect(getTrafficLightInfo('AMARELO').color).toBe('#f59e0b')

      expect(getTrafficLightInfo('VERMELHO').icon).toBe('🔴')
      expect(getTrafficLightInfo('VERMELHO').color).toBe('#ef4444')
    })

    it('deve gerar coordenadas determinísticas consistentes para o mesmo seed', () => {
      const coord1 = getDeterministicCoordinates('Rua Tiradentes')
      const coord2 = getDeterministicCoordinates('Rua Tiradentes')
      expect(coord1[0]).toBe(coord2[0])
      expect(coord1[1]).toBe(coord2[1])

      // Deve ser próximo ao centro de Marília (-22.2139, -49.9458)
      expect(coord1[0]).toBeLessThan(-21)
      expect(coord1[0]).toBeGreaterThan(-23)
      expect(coord1[1]).toBeLessThan(-48)
      expect(coord1[1]).toBeGreaterThan(-51)
    })
  })
})
