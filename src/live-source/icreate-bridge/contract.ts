/**
 * iCreate (International Centre for Entrepreneurship and Technology) Bridge Contract.
 *
 * Covers deep tech, embedded systems, AI, software automation, and prototype-to-scale grants up to ₹50 Lakhs.
 * Endpoint: POST /__tvb/icreate/search
 */

export const ICREATE_BRIDGE_SEARCH_PATH = '/__tvb/icreate/search'

export interface IcreateBridgeSearchRequest {
  readonly runId: string
  readonly companyId: string
  readonly keyword: string
  readonly limit?: number
  readonly requestedAt?: string
}

export interface IcreateNotice {
  readonly noticeId: string
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

export interface IcreateBridgeError {
  readonly code: string
  readonly message: string
}

export type IcreateBridgeSearchResponse =
  | { readonly ok: true; readonly status: number; readonly body: string }
  | {
      readonly ok: false
      readonly status: number
      readonly body: string | null
      readonly errors: readonly IcreateBridgeError[]
    }

