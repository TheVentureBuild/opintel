/**
 * Challenge.gov (Federal Open Innovation Competitions & Paid Tech Challenges) Bridge Contract.
 *
 * Covers US open federal technology competitions with direct cash prize and pilot procurement awards.
 * Endpoint: POST /__tvb/challenge/search
 */

export const CHALLENGE_BRIDGE_SEARCH_PATH = '/__tvb/challenge/search'

export interface ChallengeBridgeSearchRequest {
  readonly runId: string
  readonly companyId: string
  readonly keyword: string
  readonly limit?: number
  readonly requestedAt?: string
}

export interface ChallengeNotice {
  readonly challengeId: string
  readonly title: string
  readonly agency: string
  readonly description: string
  readonly prizePoolUsd: string
  readonly deadline: string
  readonly status: string
  readonly portalUrl: string
  readonly categories: readonly string[]
  readonly eligibleEntities: readonly string[]
}

export interface ChallengeBridgeError {
  readonly code: string
  readonly message: string
}

export type ChallengeBridgeSearchResponse =
  | { readonly ok: true; readonly status: number; readonly body: string }
  | {
      readonly ok: false
      readonly status: number
      readonly body: string | null
      readonly errors: readonly ChallengeBridgeError[]
    }

