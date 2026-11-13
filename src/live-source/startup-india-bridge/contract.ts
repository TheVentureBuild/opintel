/**
 * Startup India (Seed Fund Scheme & National Challenges) Bridge Contract.
 *
 * Covers DPIIT, Central Ministry, and PSU innovation challenges with seed funding up to ₹50 Lakhs.
 * Endpoint: POST /__tvb/startup-india/search
 */

export const STARTUP_INDIA_BRIDGE_SEARCH_PATH = '/__tvb/startup-india/search'

export interface StartupIndiaBridgeSearchRequest {
  readonly runId: string
  readonly companyId: string
  readonly keyword: string
  readonly limit?: number
  readonly requestedAt?: string
}

export interface StartupIndiaNotice {
  readonly programId: string
  readonly title: string
  readonly ministry: string
  readonly description: string
  readonly grantAmountInr: string
  readonly deadline: string
  readonly status: string
  readonly portalUrl: string
  readonly categories: readonly string[]
  readonly eligibleEntities: readonly string[]
}

export interface StartupIndiaBridgeError {
  readonly code: string
  readonly message: string
}

export type StartupIndiaBridgeSearchResponse =
  | { readonly ok: true; readonly status: number; readonly body: string }
  | {
      readonly ok: false
      readonly status: number
      readonly body: string | null
      readonly errors: readonly StartupIndiaBridgeError[]
    }

