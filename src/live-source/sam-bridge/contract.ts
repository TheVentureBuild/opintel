/**
 * SAM.gov (System for Award Management) Federal Contract Opportunities Bridge Contract.
 *
 * Covers US Federal procurement RFPs, solicitations, and commercial IT task orders (NAICS 541511 / 541512).
 * Endpoint: POST /__tvb/sam/search
 */

export const SAM_BRIDGE_SEARCH_PATH = '/__tvb/sam/search'

export interface SamBridgeSearchRequest {
  readonly runId: string
  readonly companyId: string
  readonly keyword: string
  readonly limit?: number
  readonly requestedAt?: string
}

export interface SamNotice {
  readonly noticeId: string
  readonly title: string
  readonly agency: string
  readonly department: string
  readonly description: string
  readonly naicsCode: string
  readonly setAside: string
  readonly deadline: string
  readonly status: string
  readonly noticeType: string
  readonly portalUrl: string
  readonly valueUsd: string
  readonly categories: readonly string[]
  readonly requirements: readonly string[]
}

export interface SamBridgeError {
  readonly code: string
  readonly message: string
}

export type SamBridgeSearchResponse =
  | { readonly ok: true; readonly status: number; readonly body: string }
  | {
      readonly ok: false
      readonly status: number
      readonly body: string | null
      readonly errors: readonly SamBridgeError[]
    }

