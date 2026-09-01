import { describe, expect, it } from 'vitest'
import { tokens } from './tokens'
import {
  AssetEligibilityError,
  AssetRegistry,
  type AssetRecord,
  validateAssetEligibility,
} from './assets'

const validAsset: AssetRecord = {
  id: 'media-neutral-01',
  type: 'media',
  origin: 'Criado pela equipe do projeto UniCore.',
  purpose: 'Compor uma área visual neutra.',
  authorization: 'Autorizado pelo projeto UniCore para uso neste portal.',
  reviewedAt: '2025-01-01',
  contentStatus: 'original',
}

describe('catálogo de Design Tokens do UniCore', () => {
  // Requirements 2.1: valores normativos de cor.
  it('expõe todos os valores normativos de cor', () => {
    expect(tokens.color).toEqual({
      background: '#101311',
      surface: '#181D1A',
      surfaceElevated: '#222A25',
      campaignBlack: '#0B0D0C',
      textPrimary: '#F5F7F4',
      textSecondary: '#B9C3BC',
      actionGreen: '#49D17D',
      actionPrimaryBackground: '#F5F7F4',
      actionPrimaryText: '#101311',
      border: '#58675C',
      focus: '#8EF0B3',
      error: '#FF7A7A',
    })
  })

  // Requirements 2.2: tipografia, pesos, tamanhos e altura de linha.
  it('expõe a família, pesos, tamanhos e altura de linha tipográficos', () => {
    expect(tokens.typography.fontFamilySans).toContain('Inter')
    expect(tokens.typography).toMatchObject({
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      fontSize12: '12px',
      fontSize14: '14px',
      fontSize16: '16px',
      fontSize20: '20px',
      fontSize24: '24px',
      fontSize32: '32px',
      fontSize40: '40px',
      lineHeightBody: 1.5,
    })
  })

  // Requirements 2.3–2.5: escala de espaço, raios e sombras.
  it('expõe as escalas normativas de espaço, raio e sombra', () => {
    expect(Object.values(tokens.space)).toEqual([
      '4px',
      '8px',
      '12px',
      '16px',
      '24px',
      '32px',
      '40px',
      '48px',
      '64px',
    ])
    expect(Object.values(tokens.radius)).toEqual(['4px', '8px', '12px', '16px', '999px'])
    expect(tokens.shadow).toEqual({
      raised: '0 8px 24px rgba(0,0,0,0.28)',
      overlay: '0 16px 40px rgba(0,0,0,0.40)',
    })
  })
})

describe('elegibilidade e registro de AssetRecord', () => {
  // Requirements 1.4 e 1.6: um registro completo pode ser incluído.
  it('aceita um registro com origem, finalidade, autorização e revisão', () => {
    const result = validateAssetEligibility(validAsset)

    expect(result.eligible).toBe(true)
    if (result.eligible) {
      expect(result.record).toMatchObject(validAsset)
    }
  })

  // Requirement 1.6: todos os campos normativos são exigidos antes do uso.
  it.each([
    'id',
    'type',
    'origin',
    'purpose',
    'authorization',
    'reviewedAt',
    'contentStatus',
  ] as const)('rejeita AssetRecord sem o campo obrigatório %s', (field) => {
    const candidate: Record<string, unknown> = { ...validAsset }
    delete candidate[field]

    const result = validateAssetEligibility(candidate)

    expect(result.eligible).toBe(false)
    if (!result.eligible) {
      expect(result.issues).toContainEqual(expect.objectContaining({ field }))
    }
  })

  it('rejeita origem, finalidade e autorização vazias ou compostas apenas por espaços', () => {
    for (const field of ['origin', 'purpose', 'authorization']) {
      const result = validateAssetEligibility({ ...validAsset, [field]: '   ' })

      expect(result.eligible).toBe(false)
      if (!result.eligible) {
        expect(result.issues).toContainEqual(expect.objectContaining({ field }))
      }
    }
  })

  // Requirement 1.4: propostas com conteúdo identificável de terceiros são inelegíveis.
  it.each([
    ['sinalizador explícito', { containsIdentifiableThirdPartyContent: true }],
    ['referência externa', { externalReference: 'external reference asset' }],
    ['marca identificável', { brandName: 'marca identificável' }],
    ['conteúdo identificável', { identifiableContent: 'identifiable third-party icon' }],
    ['réplica de referência', { reference: 'replicated reference layout' }],
    ['status de terceiro', { contentStatus: 'third-party' }],
  ])('rejeita proposta com %s', (_description, proposal) => {
    const result = validateAssetEligibility({ ...validAsset, ...proposal })

    expect(result.eligible).toBe(false)
    if (!result.eligible) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'contentStatus' }),
        ]),
      )
    }
  })

  it('impede o registro de uma proposta inelegível', () => {
    const ineligible = {
      ...validAsset,
      containsIdentifiableThirdPartyContent: true,
    }

    expect(() => new AssetRegistry([ineligible])).toThrow(AssetEligibilityError)
    expect(() => new AssetRegistry([ineligible])).toThrow(/inelegível/i)
  })
})
