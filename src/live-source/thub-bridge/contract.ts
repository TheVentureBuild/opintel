/**
 * T-Hub (Telangana Innovation Hub & Corporate Accelerators) Bridge Contract.
 *
 * Covers enterprise innovation challenges, corporate PoC funding, and state scale-up grants up to ₹40 Lakhs.
 * Endpoint: POST /__tvb/thub/search
 */

export const THUB_BRIDGE_SEARCH_PATH = '/__tvb/thub/search'

export interface ThubBridgeSearchRequest {
  readonly runId: string
  readonly companyId: string
  readonly keyword: string
  readonly limit?: number
  readonly requestedAt?: string
}

export interface ThubNotice {
  readonly programId: string
  readonly title: string
  readonly organization: string
  readonly description: string
  readonly grantAmountInr: string
  readonly deadline: string
  readonly status: string
  readonly portalUrl: string
  readonly categories: readonly string[]
  readonly eligibleEntities: readonly string[]
}

export interface ThubBridgeError {
  readonly code: string
  readonly message: string
}

export type ThubBridgeSearchResponse =
  | { readonly ok: true; readonly status: number; readonly body: string }
  | {
      readonly ok: false
      readonly status: number
      readonly body: string | null
      readonly errors: readonly ThubBridgeError[]
    }

