import '@angular/compiler'
import { of } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import {
  AddressSearchResult,
  NeighborhoodItem,
  StreetItem,
  TerritoryService,
} from '../services/territory.service'
import { StreetModalComponent } from './street-modal.component'

function createMockTerritoryService() {
  return {
    getTerritories: vi.fn().mockReturnValue(of([{ id: 't1', name: 'Território Central' }])),
    getTerritoryHierarchy: vi.fn().mockReturnValue(of({
      id: 't1',
      name: 'Território Central',
      subterritories: [
        {
          id: 'sub1',
          name: 'Zona Norte',
          neighborhoods: [
            { id: 'n1', name: 'Centro', streets: [] },
            { id: 'n2', name: 'Jardim América', streets: [] },
          ],
        },
      ],
    })),
    lookupCep: vi.fn(),
    reverseGeocode: vi.fn(),
    searchAddress: vi.fn(),
    createNeighborhood: vi.fn(),
    createStreet: vi.fn(),
  } as unknown as TerritoryService
}

describe('StreetModalComponent - Regras de Cadastro de Rua e Bairro', () => {
  it('deve formatar e limpar o CEP adequadamente', () => {
    const service = createMockTerritoryService()
    const component = new StreetModalComponent(service, 'browser' as any)

    expect(component.formatCep('17500000')).toBe('17500-000')
    expect(component.cleanCep('17500-000')).toBe('17500000')
    expect(component.formatCep('1750')).toBe('1750')
  })

  it('quando o CEP retornado está dentro do bairro selecionado, mantém o bairro e não cria novo', () => {
    const service = createMockTerritoryService()
    const component = new StreetModalComponent(service, 'browser' as any)

    component.selectedTerritoryId = 't1'
    component.selectedSubterritoryId = 'sub1'
    component.neighborhoodList = [
      { id: 'n1', subterritoryId: 'sub1', name: 'Centro', isActive: true, createdAt: '', updatedAt: '', streets: [] },
    ]
    component.selectedNeighborhoodId = 'n1'

    vi.spyOn(service, 'lookupCep').mockReturnValue(
      of({
        cep: '17500-000',
        logradouro: 'Rua São Luiz',
        bairro: 'Centro',
        localidade: 'Marília',
        uf: 'SP',
      }),
    )

    component.cepInput = '17500-000'
    component.searchCep()

    expect(component.streetName).toBe('Rua São Luiz')
    expect(component.isOutsideCurrentNeighborhood).toBe(false)
    expect(component.isCreatingNewNeighborhood).toBe(false)
    expect(component.selectedNeighborhoodId).toBe('n1')
  })

  it('quando o CEP retornado está FORA do bairro selecionado, ativa cadastro automático do novo bairro', () => {
    const service = createMockTerritoryService()
    const component = new StreetModalComponent(service, 'browser' as any)

    component.selectedTerritoryId = 't1'
    component.selectedSubterritoryId = 'sub1'
    component.neighborhoodList = [
      { id: 'n1', subterritoryId: 'sub1', name: 'Centro', isActive: true, createdAt: '', updatedAt: '', streets: [] },
    ]
    component.selectedNeighborhoodId = 'n1'

    vi.spyOn(service, 'lookupCep').mockReturnValue(
      of({
        cep: '17520-000',
        logradouro: 'Avenida Rio Branco',
        bairro: 'Alto Cafezal',
        localidade: 'Marília',
        uf: 'SP',
      }),
    )

    component.cepInput = '17520-000'
    component.searchCep()

    expect(component.streetName).toBe('Avenida Rio Branco')
    expect(component.isOutsideCurrentNeighborhood).toBe(true)
    expect(component.isCreatingNewNeighborhood).toBe(true)
    expect(component.newNeighborhoodName).toBe('Alto Cafezal')
    expect(component.newNeighborhoodCity).toBe('Marília')
    expect(component.outsideNoticeText).toContain('Alto Cafezal')
    expect(component.outsideNoticeText).toContain('fora do bairro selecionado')
  })

  it('quando o bairro detectado está fora do selecionado mas já existe no subterritório, vincula ao existente', () => {
    const service = createMockTerritoryService()
    const component = new StreetModalComponent(service, 'browser' as any)

    component.selectedTerritoryId = 't1'
    component.selectedSubterritoryId = 'sub1'
    component.neighborhoodList = [
      { id: 'n1', subterritoryId: 'sub1', name: 'Centro', isActive: true, createdAt: '', updatedAt: '', streets: [] },
      { id: 'n2', subterritoryId: 'sub1', name: 'Jardim América', isActive: true, createdAt: '', updatedAt: '', streets: [] },
    ]
    component.selectedNeighborhoodId = 'n1' // Centro selecionado

    vi.spyOn(service, 'lookupCep').mockReturnValue(
      of({
        cep: '17510-000',
        logradouro: 'Rua das Flores',
        bairro: 'Jardim América',
        localidade: 'Marília',
        uf: 'SP',
      }),
    )

    component.cepInput = '17510-000'
    component.searchCep()

    expect(component.streetName).toBe('Rua das Flores')
    expect(component.isOutsideCurrentNeighborhood).toBe(true)
    expect(component.isCreatingNewNeighborhood).toBe(false)
    expect(component.selectedNeighborhoodId).toBe('n2')
  })

  it('ao buscar e selecionar rua como Carlos Artêncio, preenche dados e avalia localização', () => {
    const service = createMockTerritoryService()
    const component = new StreetModalComponent(service, 'browser' as any)

    component.selectedTerritoryId = 't1'
    component.selectedSubterritoryId = 'sub1'
    component.neighborhoodList = [
      { id: 'n1', subterritoryId: 'sub1', name: 'Centro', isActive: true, createdAt: '', updatedAt: '', streets: [] },
    ]
    component.selectedNeighborhoodId = 'n1'

    const searchItem: AddressSearchResult = {
      displayName: 'Avenida Carlos Artêncio, Parque São Jorge, Marília',
      road: 'Avenida Carlos Artêncio',
      neighbourhood: 'Parque São Jorge',
      city: 'Marília',
      state: 'São Paulo',
      zipCode: '17519254',
      lat: -22.2300888,
      lng: -49.9270973,
    }

    component.selectAddressSearchResult(searchItem)

    expect(component.streetName).toBe('Avenida Carlos Artêncio')
    expect(component.streetZipCode).toBe('17519-254')
    expect(component.isOutsideCurrentNeighborhood).toBe(true)
    expect(component.isCreatingNewNeighborhood).toBe(true)
    expect(component.newNeighborhoodName).toBe('Parque São Jorge')
  })

  it('ao salvar com novo bairro ativo, cria o bairro primeiro e depois a rua vinculada', () => {
    const service = createMockTerritoryService()
    const component = new StreetModalComponent(service, 'browser' as any)

    component.selectedTerritoryId = 't1'
    component.selectedSubterritoryId = 'sub1'
    component.streetName = 'Rua Nova Esperança'
    component.streetZipCode = '17530-000'
    component.isCreatingNewNeighborhood = true
    component.newNeighborhoodName = 'Bairro Novo'
    component.newNeighborhoodCity = 'Marília'

    const mockNewNeigh: NeighborhoodItem = {
      id: 'n-novo',
      subterritoryId: 'sub1',
      name: 'Bairro Novo',
      city: 'Marília',
      isActive: true,
      createdAt: '',
      updatedAt: '',
      streets: [],
    }

    const mockNewStreet: StreetItem = {
      id: 's-novo',
      neighborhoodId: 'n-novo',
      name: 'Rua Nova Esperança',
      zipCode: '17530-000',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    }

    vi.spyOn(service, 'createNeighborhood').mockReturnValue(of(mockNewNeigh))
    vi.spyOn(service, 'createStreet').mockReturnValue(of(mockNewStreet))

    let emittedResult: any = null
    component.streetCreated.subscribe((res) => {
      emittedResult = res
    })

    component.saveStreet()

    expect(service.createNeighborhood).toHaveBeenCalledWith({
      subterritoryId: 'sub1',
      name: 'Bairro Novo',
      city: 'Marília',
    })
    expect(service.createStreet).toHaveBeenCalledWith({
      neighborhoodId: 'n-novo',
      name: 'Rua Nova Esperança',
      zipCode: '17530-000',
    })
    expect(emittedResult).toEqual({
      street: mockNewStreet,
      neighborhood: mockNewNeigh,
      territoryId: 't1',
      subterritoryId: 'sub1',
      isNewNeighborhood: true,
    })
  })

  it('ao salvar em bairro existente, cria diretamente a rua no bairro selecionado', () => {
    const service = createMockTerritoryService()
    const component = new StreetModalComponent(service, 'browser' as any)

    component.selectedTerritoryId = 't1'
    component.selectedSubterritoryId = 'sub1'
    component.selectedNeighborhoodId = 'n1'
    component.neighborhoodList = [
      { id: 'n1', subterritoryId: 'sub1', name: 'Centro', isActive: true, createdAt: '', updatedAt: '', streets: [] },
    ]
    component.streetName = 'Rua Existente'
    component.streetZipCode = '17500-000'
    component.isCreatingNewNeighborhood = false

    const mockStreet: StreetItem = {
      id: 's-123',
      neighborhoodId: 'n1',
      name: 'Rua Existente',
      zipCode: '17500-000',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    }

    vi.spyOn(service, 'createStreet').mockReturnValue(of(mockStreet))

    let emittedResult: any = null
    component.streetCreated.subscribe((res) => {
      emittedResult = res
    })

    component.saveStreet()

    expect(service.createNeighborhood).not.toHaveBeenCalled()
    expect(service.createStreet).toHaveBeenCalledWith({
      neighborhoodId: 'n1',
      name: 'Rua Existente',
      zipCode: '17500-000',
    })
    expect(emittedResult.isNewNeighborhood).toBe(false)
    expect(emittedResult.street.id).toBe('s-123')
  })
})
