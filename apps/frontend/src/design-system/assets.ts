/**
 * Metadata required before a UniCore asset can be documented or used.
 *
 * `contentStatus` deliberately has no third-party value: identifiable external
 * content is not part of the UniCore asset vocabulary and is rejected at
 * runtime by `validateAssetEligibility`.
 */
export const assetTypes = ['media', 'icon', 'text'] as const
export type AssetType = (typeof assetTypes)[number]

export const assetContentStatuses = ['original', 'neutral'] as const
export type AssetContentStatus = (typeof assetContentStatuses)[number]

export interface AssetRecord {
  readonly id: string
  readonly type: AssetType
  readonly origin: string
  readonly purpose: string
  readonly authorization: string
  readonly reviewedAt: string
  readonly contentStatus: AssetContentStatus
  /** Optional explicit declaration used to make an eligibility decision. */
  readonly containsIdentifiableThirdPartyContent?: boolean
}

export interface AssetEligibilitySuccess {
  readonly eligible: true
  readonly record: AssetRecord
}

export interface AssetEligibilityFailure {
  readonly eligible: false
  readonly issues: readonly AssetEligibilityIssue[]
}

export type AssetEligibilityResult = AssetEligibilitySuccess | AssetEligibilityFailure

export interface AssetEligibilityIssue {
  readonly field: string
  readonly message: string
}

const requiredFields = ['id', 'type', 'origin', 'purpose', 'authorization', 'reviewedAt', 'contentStatus'] as const
const thirdPartyMarkerPattern = /(third.?party|external|identif|brand|replicat|reference)/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function hasValidReviewDate(value: unknown): value is string {
  return hasText(value) && !Number.isNaN(Date.parse(value))
}

function hasThirdPartyMarker(record: Record<string, unknown>): boolean {
  return Object.entries(record).some(([key, value]) => {
    if (!thirdPartyMarkerPattern.test(key)) return false
    if (value === true) return true
    if (typeof value !== 'string') return false

    const normalized = value.trim().toLowerCase()
    return normalized.length > 0 && /(third.?party|external|identif|brand|replicat|reference)/i.test(normalized)
  })
}

/**
 * Validates untrusted asset metadata before it reaches the registry.
 * Origin, purpose and authorization are intentionally checked independently
 * so a caller receives an actionable result for every missing requirement.
 */
export function validateAssetEligibility(input: unknown): AssetEligibilityResult {
  if (!isRecord(input)) {
    return {
      eligible: false,
      issues: [{ field: 'record', message: 'AssetRecord deve ser um objeto.' }],
    }
  }

  const issues: AssetEligibilityIssue[] = []

  for (const field of requiredFields) {
    if (!hasText(input[field])) {
      issues.push({ field, message: `${field} é obrigatório.` })
    }
  }

  if (hasText(input.type) && !assetTypes.includes(input.type as AssetType)) {
    issues.push({ field: 'type', message: 'type deve ser media, icon ou text.' })
  }

  if (hasText(input.reviewedAt) && !hasValidReviewDate(input.reviewedAt)) {
    issues.push({ field: 'reviewedAt', message: 'reviewedAt deve conter uma data válida.' })
  }

  if (hasText(input.contentStatus) && !assetContentStatuses.includes(input.contentStatus as AssetContentStatus)) {
    issues.push({
      field: 'contentStatus',
      message: 'Somente conteúdo original ou neutro é elegível; conteúdo identificável de terceiros é rejeitado.',
    })
  }

  if (input.containsIdentifiableThirdPartyContent === true || hasThirdPartyMarker(input)) {
    issues.push({
      field: 'contentStatus',
      message: 'Ativos ou conteúdo identificáveis de terceiros não são elegíveis para o UniCore.',
    })
  }

  if (issues.length > 0) return { eligible: false, issues }

  return {
    eligible: true,
    record: Object.freeze({
      id: input.id as string,
      type: input.type as AssetType,
      origin: (input.origin as string).trim(),
      purpose: (input.purpose as string).trim(),
      authorization: (input.authorization as string).trim(),
      reviewedAt: input.reviewedAt as string,
      contentStatus: input.contentStatus as AssetContentStatus,
      ...(input.containsIdentifiableThirdPartyContent === undefined
        ? {}
        : { containsIdentifiableThirdPartyContent: false as const }),
    }),
  }
}

export class AssetEligibilityError extends Error {
  readonly issues: readonly AssetEligibilityIssue[]

  constructor(issues: readonly AssetEligibilityIssue[]) {
    super(`Ativo inelegível: ${issues.map((issue) => issue.message).join(' ')}`)
    this.name = 'AssetEligibilityError'
    this.issues = issues
  }
}

/**
 * Immutable registry that can contain only records accepted by the policy.
 * `register` returns a new registry, preventing accidental mutation of the
 * manifest consumed by components.
 */
export class AssetRegistry {
  private readonly records: ReadonlyMap<string, AssetRecord>

  constructor(records: readonly AssetRecord[] = []) {
    const next = new Map<string, AssetRecord>()
    for (const record of records) {
      this.assertAndAdd(next, record)
    }
    this.records = next
  }

  get(id: string): AssetRecord | undefined {
    return this.records.get(id)
  }

  has(id: string): boolean {
    return this.records.has(id)
  }

  all(): readonly AssetRecord[] {
    return Object.freeze([...this.records.values()])
  }

  register(record: AssetRecord): AssetRegistry {
    const next = new Map(this.records)
    this.assertAndAdd(next, record)
    return new AssetRegistry([...next.values()])
  }

  private assertAndAdd(target: Map<string, AssetRecord>, input: unknown): void {
    const result = validateAssetEligibility(input)
    if (!result.eligible) throw new AssetEligibilityError(result.issues)
    if (target.has(result.record.id)) {
      throw new AssetEligibilityError([{ field: 'id', message: `id duplicado: ${result.record.id}.` }])
    }
    target.set(result.record.id, result.record)
  }
}

/**
 * Canonical manifest for the current screen. Every entry is authored for this
 * project and uses neutral content; no external identifiable asset is listed.
 */
export const assetManifest: readonly AssetRecord[] = [
  {
    id: 'media-campaign-abstract',
    type: 'media',
    origin: 'Criado pela equipe do projeto UniCore.',
    purpose: 'Compor a área visual abstrata da campanha.',
    authorization: 'Autorizado pelo projeto UniCore para uso exclusivo neste portal.',
    reviewedAt: '2025-01-01',
    contentStatus: 'original',
  },
  {
    id: 'icon-search-neutral',
    type: 'icon',
    origin: 'Criado pela equipe do projeto UniCore.',
    purpose: 'Apoiar visualmente a ação neutra de busca.',
    authorization: 'Autorizado pelo projeto UniCore para uso neste portal.',
    reviewedAt: '2025-01-01',
    contentStatus: 'original',
  },
  {
    id: 'text-campaign-neutral',
    type: 'text',
    origin: 'Redação original do projeto UniCore.',
    purpose: 'Apresentar a campanha em linguagem neutra.',
    authorization: 'Autorizado pelo projeto UniCore para publicação neste portal.',
    reviewedAt: '2025-01-01',
    contentStatus: 'neutral',
  },
] as const

export const assetRegistry = new AssetRegistry(assetManifest)

export function getAssetRecord(id: string): AssetRecord | undefined {
  return assetRegistry.get(id)
}

/** Portuguese aliases keep the policy discoverable for documentation users. */
export const manifestoDeAtivos = assetManifest
export const registroDeAtivos = assetRegistry
