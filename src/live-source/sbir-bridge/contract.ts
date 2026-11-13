/**
 * SBIR.gov (Small Business Innovation Research) Federal Tech Solicitations Bridge Contract.
 *
 * Covers US Federal Small Business commercial innovation grants across DARPA, NASA, NSF, NIH, and DoE.
 * Endpoint: POST /__tvb/sbir/search
 */

export const SBIR_BRIDGE_SEARCH_PATH = '/__tvb/sbir/search'

export interface SbirBridgeSearchRequest {
  readonly runId: string
  readonly companyId: string
  readonly keyword: string
  readonly limit?: number
  readonly requestedAt?: string
}

export interface SbirNotice {
  readonly topicId: string
  readonly title: string
  readonly agency: string
  readonly program: string
  readonly description: string
  readonly awardAmountUsd: string
  readonly deadline: string
  readonly status: string
  readonly portalUrl: string
  readonly sectors: readonly string[]
  readonly eligibleEntities: readonly string[]
}

export interface SbirBridgeError {
  readonly code: string
  readonly message: string
}

export type SbirBridgeSearchResponse =
  | { readonly ok: true; readonly status: number; readonly body: string }
  | {
      readonly ok: false
      readonly status: number
      readonly body: string | null
      readonly errors: readonly SbirBridgeError[]
    }

