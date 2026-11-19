/**
 * Target Company Live Discovery Engine
 * Multi-source pipeline supporting Grants.gov, EU SEDIA, TED Procurement,
 * GeM / CPPP India Procurement, MeitY / iDEX Innovation Grants, and World Bank.
 */

import { buildCompanyDiscoveryQueries } from './discovery-queries'
import { csvPreviewToTargetCompanies } from './profiles'
import { loadImportedTargetCompanies } from './store'
import { loadKnownDiscoveryIds, saveKnownDiscoveryIds } from './discovery-history'
import { recommendOpportunitiesForTargetCompanies } from './recommendations'
import type { TargetCompanyMatchInput, TargetOpportunityInput, TargetRelevanceResult } from './matching'
import { parseGrantsGovBody } from '../automation/grantsgov-adapter'
import { parseEuSediaBody } from '../automation/eu-sedia-adapter'
import { buildPipelineResult } from '../automation/pipeline'
import { createReviewQueue } from '../automation/review-queue'
import { reviewFixtureStore } from '../automation/review-fixture'
import type { AdapterResult } from '../automation/types'
import { parseTedSearchBody } from '../automation/ted-adapter'
import type { GrantsGovBridgeSearchResponse } from '../live-source/grantsgov-bridge/contract'
import type { EuSediaBridgeSearchResponse } from '../live-source/eu-sedia-bridge/contract'
import type { TedBridgeSearchResponse } from '../live-source/ted-bridge/contract'
import type { GemBridgeSearchResponse, GemNotice } from '../live-source/gem-bridge/contract'
import type { IndiaGrantsBridgeSearchResponse, IndiaGrantOpportunity } from '../live-source/india-grants-bridge/contract'
import type { WorldBankBridgeSearchResponse, WorldBankNotice } from '../live-source/worldbank-bridge/contract'
import type { SamBridgeSearchResponse, SamNotice } from '../live-source/sam-bridge/contract'
import type { SbirBridgeSearchResponse, SbirNotice } from '../live-source/sbir-bridge/contract'
import type { ChallengeBridgeSearchResponse, ChallengeNotice } from '../live-source/challenge-bridge/contract'
import type { StartupIndiaBridgeSearchResponse, StartupIndiaNotice } from '../live-source/startup-india-bridge/contract'
import type { ThubBridgeSearchResponse, ThubNotice } from '../live-source/thub-bridge/contract'
import type { IcreateBridgeSearchResponse, IcreateNotice } from '../live-source/icreate-bridge/contract'

function extractResponseErrors(response: unknown, fallback: string): string[] {
  const res = response as { errors?: Array<{ message?: string }>; error?: { message?: string } } | null | undefined
  if (Array.isArray(res?.errors) && res.errors.length > 0) {
    return res.errors.map((e) => e?.message ?? fallback)
  }
  if (res?.error?.message) {
    return [res.error.message]
  }
  return [fallback]
}

export type TargetDiscoverySourceType =
  | 'grantsgov'
  | 'eu-sedia'
  | 'ted'
  | 'gem'
  | 'india-grants'
  | 'worldbank'
  | 'sam'
  | 'sbir'
  | 'challenge'
  | 'startup-india'
  | 'thub'
  | 'icreate'

export interface TargetCompanyLiveDiscoveryRecord {
  readonly source: TargetDiscoverySourceType
  readonly linkValidation?: 'source-provided' | 'constructed-unverified' | 'confirmed-unavailable' | null
  readonly sourceRecordId: string | null
  readonly title: string
  readonly sourceUrl: string
  readonly description: string | null
  readonly deadline: string | null
  readonly status: string | null
  readonly sectors?: readonly string[] | null
  readonly requirements?: readonly string[] | null
  readonly applicantTypes?: readonly string[] | null
  readonly country?: string | null
}

export interface TargetCompanyLiveDiscoverySourceResult {
  readonly source: TargetDiscoverySourceType
  readonly queries: readonly string[]
  readonly recordCount: number
  readonly errors: readonly string[]
}

export interface TargetCompanyLiveDiscoveryResult {
  readonly profile: TargetCompanyMatchInput
  readonly queries: readonly string[]
  readonly records: readonly TargetCompanyLiveDiscoveryRecord[]
  readonly recommendations: readonly TargetRelevanceResult[]
  readonly errors: readonly string[]
  readonly sourceResults: readonly TargetCompanyLiveDiscoverySourceResult[]
  readonly newRecordCount: number
}

export function isOpportunityOpen(
  deadline: string | null | undefined,
  status: string | null | undefined,
  now = Date.now(),
  title?: string | null | undefined,
  noticeType?: string | null | undefined,
): boolean {
  const normalizedStatus = status?.trim().toLowerCase() ?? ''
  const normalizedTitle = title?.trim().toLowerCase() ?? ''
  const normalizedType = noticeType?.trim().toLowerCase() ?? ''

  // 1. Strict rejection of awarded, conquered, closed, completed, cancelled, or past results notices
  const awardRegex = /\b(closed|archived|expired|cancelled|canceled|awarded|conquered|winner|completed|decided)\b|\bcan-/i
  const awardPhraseRegex = /contract award|award notice|results of tender|results of|notification of award|aoc\b|not open|no longer open|contract awarded|winner announced|award of contract/i

  if (
    awardRegex.test(normalizedStatus) ||
    awardPhraseRegex.test(normalizedStatus) ||
    awardRegex.test(normalizedType) ||
    awardPhraseRegex.test(normalizedType) ||
    awardPhraseRegex.test(normalizedTitle)
  ) {
    return false
  }

  // 2. Strict deadline evaluation
  const normalizedDeadline = deadline?.trim() ?? ''
  if (normalizedDeadline !== '') {
    const dateOnly = normalizedDeadline.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00(?::00(?:\.0+)?)?Z)?$/)
    const dueAt = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 23, 59, 59, 999)
      : new Date(normalizedDeadline)
    return !Number.isNaN(dueAt.getTime()) && dueAt.getTime() >= now
  }

  return /\b(open|active|ongoing|rolling|published)\b|\baccepting\s+(applications?|proposals?|bids?)\b/i.test(normalizedStatus)
}

export function grantsGovRawToOpportunity(record: TargetCompanyLiveDiscoveryRecord): TargetOpportunityInput {
  return {
    opportunityId: record.sourceRecordId ?? record.sourceUrl,
    opportunityType: 'funding',
    title: record.title,
    description: record.description,
    country: 'US',
    sectors: record.sectors ?? null,
    requirements: record.requirements ?? null,
    applicantTypes: record.applicantTypes ?? null,
    deadline: record.deadline,
    status: record.status,
    sourceUrl: record.sourceUrl,
  }
}

export function euSediaRawToOpportunity(record: TargetCompanyLiveDiscoveryRecord): TargetOpportunityInput {
  return {
    opportunityId: record.sourceRecordId ?? record.sourceUrl,
    opportunityType: 'funding',
    title: record.title,
    description: record.description,
    country: null,
    sectors: record.sectors ?? null,
    requirements: record.requirements ?? null,
    applicantTypes: record.applicantTypes ?? null,
    deadline: record.deadline,
    status: record.status,
    sourceUrl: record.sourceUrl,
  }
}

export function tedRawToOpportunity(record: TargetCompanyLiveDiscoveryRecord): TargetOpportunityInput {
  return {
    opportunityId: record.sourceRecordId ?? record.sourceUrl,
    opportunityType: 'procurement',
    title: record.title,
    description: record.description,
    country: null,
    sectors: record.sectors ?? null,
    requirements: record.requirements ?? null,
    applicantTypes: record.applicantTypes ?? null,
    deadline: record.deadline,
    status: record.status,
    sourceUrl: record.sourceUrl,
  }
}

export function gemRawToOpportunity(record: TargetCompanyLiveDiscoveryRecord): TargetOpportunityInput {
  return {
    opportunityId: record.sourceRecordId ?? record.sourceUrl,
    opportunityType: 'procurement',
    title: record.title,
    description: record.description,
    country: 'IN',
    sectors: record.sectors ?? null,
    requirements: record.requirements ?? null,
    applicantTypes: record.applicantTypes ?? ['commercial', 'for-profit', 'sme', 'startup'],
    deadline: record.deadline,
    status: record.status,
    sourceUrl: record.sourceUrl,
  }
}

export function indiaGrantsRawToOpportunity(record: TargetCompanyLiveDiscoveryRecord): TargetOpportunityInput {
  return {
    opportunityId: record.sourceRecordId ?? record.sourceUrl,
    opportunityType: 'funding',
    title: record.title,
    description: record.description,
    country: 'IN',
    sectors: record.sectors ?? null,
    requirements: record.requirements ?? null,
    applicantTypes: record.applicantTypes ?? ['commercial', 'for-profit', 'startup', 'sme'],
    deadline: record.deadline,
    status: record.status,
    sourceUrl: record.sourceUrl,
  }
}

export function worldBankRawToOpportunity(record: TargetCompanyLiveDiscoveryRecord): TargetOpportunityInput {
  return {
    opportunityId: record.sourceRecordId ?? record.sourceUrl,
    opportunityType: 'procurement',
    title: record.title,
    description: record.description,
    country: null,
    sectors: record.sectors ?? null,
    requirements: record.requirements ?? null,
    applicantTypes: record.applicantTypes ?? ['commercial', 'for-profit'],
    deadline: record.deadline,
    status: record.status,
    sourceUrl: record.sourceUrl,
  }
}

export function samRawToOpportunity(record: TargetCompanyLiveDiscoveryRecord): TargetOpportunityInput {
  return {
    opportunityId: record.sourceRecordId ?? record.sourceUrl,
    opportunityType: 'procurement',
    title: record.title,
    description: record.description,
    country: 'US',
    sectors: record.sectors ?? null,
    requirements: record.requirements ?? null,
    applicantTypes: record.applicantTypes ?? ['commercial', 'for-profit', 'sme', 'startup'],
    deadline: record.deadline,
    status: record.status,
    sourceUrl: record.sourceUrl,
  }
}

export function sbirRawToOpportunity(record: TargetCompanyLiveDiscoveryRecord): TargetOpportunityInput {
  return {
    opportunityId: record.sourceRecordId ?? record.sourceUrl,
    opportunityType: 'funding',
    title: record.title,
    description: record.description,
    country: 'US',
    sectors: record.sectors ?? null,
    requirements: record.requirements ?? null,
    applicantTypes: record.applicantTypes ?? ['commercial', 'for-profit', 'sme', 'startup'],
    deadline: record.deadline,
    status: record.status,
    sourceUrl: record.sourceUrl,
  }
}

export function challengeRawToOpportunity(record: TargetCompanyLiveDiscoveryRecord): TargetOpportunityInput {
  return {
    opportunityId: record.sourceRecordId ?? record.sourceUrl,
    opportunityType: 'funding',
    title: record.title,
    description: record.description,
    country: 'US',
    sectors: record.sectors ?? null,
    requirements: record.requirements ?? null,
    applicantTypes: record.applicantTypes ?? ['commercial', 'for-profit', 'sme', 'startup', 'individual'],
    deadline: record.deadline,
    status: record.status,
    sourceUrl: record.sourceUrl,
  }
}

export function startupIndiaRawToOpportunity(record: TargetCompanyLiveDiscoveryRecord): TargetOpportunityInput {
  return {
    opportunityId: record.sourceRecordId ?? record.sourceUrl,
    opportunityType: 'funding',
    title: record.title,
    description: record.description,
    country: 'IN',
    sectors: record.sectors ?? null,
    requirements: record.requirements ?? null,
    applicantTypes: record.applicantTypes ?? ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
    deadline: record.deadline,
    status: record.status,
    sourceUrl: record.sourceUrl,
  }
}

export function thubRawToOpportunity(record: TargetCompanyLiveDiscoveryRecord): TargetOpportunityInput {
  return {
    opportunityId: record.sourceRecordId ?? record.sourceUrl,
    opportunityType: 'funding',
    title: record.title,
    description: record.description,
    country: 'IN',
    sectors: record.sectors ?? null,
    requirements: record.requirements ?? null,
    applicantTypes: record.applicantTypes ?? ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
    deadline: record.deadline,
    status: record.status,
    sourceUrl: record.sourceUrl,
  }
}

export function icreateRawToOpportunity(record: TargetCompanyLiveDiscoveryRecord): TargetOpportunityInput {
  return {
    opportunityId: record.sourceRecordId ?? record.sourceUrl,
    opportunityType: 'funding',
    title: record.title,
    description: record.description,
    country: 'IN',
    sectors: record.sectors ?? null,
    requirements: record.requirements ?? null,
    applicantTypes: record.applicantTypes ?? ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
    deadline: record.deadline,
    status: record.status,
    sourceUrl: record.sourceUrl,
  }
}

export function recordToOpportunity(record: TargetCompanyLiveDiscoveryRecord): TargetOpportunityInput {
  switch (record.source) {
    case 'gem':
      return gemRawToOpportunity(record)
    case 'india-grants':
      return indiaGrantsRawToOpportunity(record)
    case 'worldbank':
      return worldBankRawToOpportunity(record)
    case 'sam':
      return samRawToOpportunity(record)
    case 'sbir':
      return sbirRawToOpportunity(record)
    case 'challenge':
      return challengeRawToOpportunity(record)
    case 'startup-india':
      return startupIndiaRawToOpportunity(record)
    case 'thub':
      return thubRawToOpportunity(record)
    case 'icreate':
      return icreateRawToOpportunity(record)
    case 'ted':
      return tedRawToOpportunity(record)
    case 'grantsgov':
      return grantsGovRawToOpportunity(record)
    case 'eu-sedia':
    default:
      return euSediaRawToOpportunity(record)
  }
}

export async function runTargetCompanyGrantsGovDiscovery(
  profile: TargetCompanyMatchInput,
  requester: (term: string) => Promise<GrantsGovBridgeSearchResponse>,
): Promise<TargetCompanyLiveDiscoveryResult> {
  const queries = buildCompanyDiscoveryQueries(profile)
  const uniqueTerms = [...new Set(queries.map((query) => query.term))]
  const recordsById = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  const errors: string[] = []

  for (const term of uniqueTerms) {
    let response: GrantsGovBridgeSearchResponse
    try {
      response = await requester(term)
    } catch (error) {
      errors.push(`Grants.gov request failed: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (!response.ok || (typeof response.status === 'number' && response.status >= 400)) {
      errors.push(...extractResponseErrors(response, `Grants.gov bridge request failed (status ${response.status})`))
      continue
    }
    if (!response.body || (typeof response.body === 'string' && response.body.trim().startsWith('<'))) {
      errors.push(`Grants.gov source returned an HTML response instead of JSON (status ${response.status})`)
      continue
    }
    const parsed = parseGrantsGovBody(response.body, {
      sourceId: 'SU-GRANTS-001',
      observedAt: new Date().toISOString(),
      queryTerm: term || null,
    })
    for (const error of parsed.errors) errors.push(error.message)

    const observedAt = new Date().toISOString()
    const currentResults = parsed.results.filter((result) =>
      isOpportunityOpen(result.deadline, result.sourceStatus, undefined, result.title, result.rawType),
    )
    const adapterResult: AdapterResult = {
      status: 'SUCCESS',
      sourceId: 'SU-GRANTS-001',
      adapterType: 'grantsgov',
      runId: 'target-company-run',
      domain: 'funding',
      accessState: 'AVAILABLE',
      requestedAt: observedAt,
      observedAt,
      blockedReason: null,
      results: currentResults,
      errors: parsed.errors,
      warnings: parsed.warnings,
      provenance: {
        runId: 'target-company-run',
        companyId: profile.companyId,
        discoveryProfileId: profile.companyId,
        sourceId: 'SU-GRANTS-001',
        sourceName: 'Grants.gov',
        sourceUrl: null,
        adapterType: 'grantsgov',
        domain: 'funding',
        accessState: 'AVAILABLE',
        requestedAt: observedAt,
        observedAt,
      },
    }
    const pipeline = buildPipelineResult(adapterResult)
    const reviewItems = createReviewQueue(pipeline.candidates, { createdAt: observedAt })
    reviewFixtureStore.addReviewItems(reviewItems)

    for (const result of currentResults) {
      const id = `grantsgov:${result.sourceRecordId ?? result.sourceUrl}`
      if (!recordsById.has(id)) {
        recordsById.set(id, {
          source: 'grantsgov',
          sourceRecordId: result.sourceRecordId,
          title: result.title,
          sourceUrl: result.sourceUrl,
          description: result.description,
          deadline: result.deadline,
          status: result.sourceStatus ?? null,
        })
      }
    }
  }

  const records = [...recordsById.values()]
  const known = loadKnownDiscoveryIds()
  const newRecordCount = records.filter((record) => !known.has(record.sourceRecordId ?? record.sourceUrl)).length
  saveKnownDiscoveryIds(records.map((record) => record.sourceRecordId ?? record.sourceUrl))
  const opportunities = records.map(grantsGovRawToOpportunity)
  const recommendations = recommendOpportunitiesForTargetCompanies([profile], opportunities)

  return {
    profile,
    queries: uniqueTerms,
    records,
    recommendations,
    errors,
    sourceResults: [{ source: 'grantsgov', queries: uniqueTerms, recordCount: records.length, errors }],
    newRecordCount,
  }
}

export async function runTargetCompanyEuSediaDiscovery(
  profile: TargetCompanyMatchInput,
  requester: (term: string) => Promise<EuSediaBridgeSearchResponse>,
): Promise<TargetCompanyLiveDiscoveryResult> {
  const queries = buildCompanyDiscoveryQueries(profile)
  const uniqueTerms = [...new Set(queries.map((query) => query.term))]
  const recordsById = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  const errors: string[] = []

  for (const term of uniqueTerms) {
    let response: EuSediaBridgeSearchResponse
    try {
      response = await requester(term)
    } catch (error) {
      errors.push(`EU Funding & Tenders request failed: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (!response.ok || (typeof response.status === 'number' && response.status >= 400)) {
      errors.push(...extractResponseErrors(response, `EU Funding & Tenders bridge request failed (status ${response.status})`))
      continue
    }
    if (!response.body || (typeof response.body === 'string' && response.body.trim().startsWith('<'))) {
      errors.push(`EU Funding & Tenders source returned an HTML response instead of JSON (status ${response.status})`)
      continue
    }
    const parsed = parseEuSediaBody(response.body, {
      sourceId: 'SU-EU-001',
      observedAt: new Date().toISOString(),
      queryTerm: term || null,
    })
    for (const error of parsed.errors) errors.push(error.message)
    for (const result of parsed.results) {
      if (!isOpportunityOpen(result.deadline, result.sourceStatus, undefined, result.title, result.rawType)) continue
      const id = `eu-sedia:${result.sourceRecordId ?? result.sourceUrl}`
      if (!recordsById.has(id)) {
        recordsById.set(id, {
          source: 'eu-sedia',
          sourceRecordId: result.sourceRecordId,
          title: result.title,
          sourceUrl: result.sourceUrl,
          description: result.description,
          deadline: result.deadline,
          status: result.sourceStatus ?? null,
          linkValidation: result.linkValidation ?? null,
        })
      }
    }
  }

  const records = [...recordsById.values()]
  const known = loadKnownDiscoveryIds()
  const newRecordCount = records.filter((record) => !known.has(record.sourceRecordId ?? record.sourceUrl)).length
  saveKnownDiscoveryIds(records.map((record) => record.sourceRecordId ?? record.sourceUrl))
  const opportunities = records.map(euSediaRawToOpportunity)
  const recommendations = recommendOpportunitiesForTargetCompanies([profile], opportunities)

  return {
    profile,
    queries: uniqueTerms,
    records,
    recommendations,
    errors,
    sourceResults: [{ source: 'eu-sedia', queries: uniqueTerms, recordCount: records.length, errors }],
    newRecordCount,
  }
}

export async function runTargetCompanyDiscovery(
  profile: TargetCompanyMatchInput,
  grantsRequester: (term: string) => Promise<GrantsGovBridgeSearchResponse>,
  euRequester: (term: string) => Promise<EuSediaBridgeSearchResponse>,
): Promise<TargetCompanyLiveDiscoveryResult> {
  const grants = await runTargetCompanyGrantsGovDiscovery(profile, grantsRequester)
  const eu = await runTargetCompanyEuSediaDiscovery(profile, euRequester)

  const recordsById = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  for (const record of [...grants.records, ...eu.records]) {
    const id = `${record.source}:${record.sourceRecordId ?? record.sourceUrl}`
    if (!recordsById.has(id)) recordsById.set(id, record)
  }
  const records = [...recordsById.values()]
  saveKnownDiscoveryIds(records.map((record) => record.sourceRecordId ?? record.sourceUrl))
  const opportunities = records.map((record) =>
    record.source === 'grantsgov' ? grantsGovRawToOpportunity(record) : euSediaRawToOpportunity(record),
  )
  const recommendations = recommendOpportunitiesForTargetCompanies([profile], opportunities)

  return {
    profile,
    queries: [...new Set([...grants.queries, ...eu.queries])],
    records,
    recommendations,
    errors: [...grants.errors, ...eu.errors],
    sourceResults: [...grants.sourceResults, ...eu.sourceResults],
    newRecordCount: grants.newRecordCount + eu.newRecordCount,
  }
}

export async function runTargetCompanyTedDiscovery(
  profile: TargetCompanyMatchInput,
  requester: (term: string) => Promise<TedBridgeSearchResponse>,
): Promise<TargetCompanyLiveDiscoveryResult> {
  const queries = buildCompanyDiscoveryQueries(profile)
  const uniqueTerms = [...new Set(queries.map((query) => query.term))]
  const recordsById = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  const errors: string[] = []

  for (const term of uniqueTerms) {
    if (term === '') continue
    const response = await requester(term)
    if (!response.ok || (typeof response.status === 'number' && response.status >= 400)) {
      errors.push(...extractResponseErrors(response, `TED bridge request failed (status ${response.status})`))
      continue
    }
    if (!response.body || (typeof response.body === 'string' && response.body.trim().startsWith('<'))) {
      errors.push(`TED source returned an HTML response instead of JSON (status ${response.status})`)
      continue
    }
    const parsed = parseTedSearchBody(response.body, {
      sourceId: 'SU-TED-001',
      observedAt: new Date().toISOString(),
      queryTerm: term || null,
    })
    for (const error of parsed.errors) errors.push(error.message)
    for (const result of parsed.results) {
      if (!isOpportunityOpen(result.deadline, result.sourceStatus, undefined, result.title, result.rawType)) continue
      const id = `ted:${result.sourceRecordId ?? result.sourceUrl}`
      if (!recordsById.has(id)) {
        recordsById.set(id, {
          source: 'ted',
          sourceRecordId: result.sourceRecordId,
          title: result.title,
          sourceUrl: result.sourceUrl,
          description: result.description,
          deadline: result.deadline,
          status: result.sourceStatus ?? null,
        })
      }
    }
  }

  const records = [...recordsById.values()]
  const opportunities = records.map(tedRawToOpportunity)
  const recommendations = recommendOpportunitiesForTargetCompanies([profile], opportunities)

  return {
    profile,
    queries: uniqueTerms,
    records,
    recommendations,
    errors,
    sourceResults: [{ source: 'ted', queries: uniqueTerms, recordCount: records.length, errors }],
    newRecordCount: records.length,
  }
}

export async function runTargetCompanyGemDiscovery(
  profile: TargetCompanyMatchInput,
  requester: (term: string) => Promise<GemBridgeSearchResponse>,
): Promise<TargetCompanyLiveDiscoveryResult> {
  const queries = buildCompanyDiscoveryQueries(profile)
  const uniqueTerms = [...new Set(queries.map((query) => query.term))]
  const recordsById = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  const errors: string[] = []

  for (const term of uniqueTerms) {
    if (term === '') continue
    let response: GemBridgeSearchResponse
    try {
      response = await requester(term)
    } catch (error) {
      errors.push(`GeM request failed: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (!response.ok || (typeof response.status === 'number' && response.status >= 400)) {
      errors.push(...extractResponseErrors(response, `GeM bridge request failed (status ${response.status})`))
      continue
    }
    if (!response.body || (typeof response.body === 'string' && response.body.trim().startsWith('<'))) {
      errors.push(`GeM source returned an HTML response instead of JSON (status ${response.status})`)
      continue
    }

    try {
      const parsed = JSON.parse(response.body) as { tenders?: readonly GemNotice[] }
      const tenders = Array.isArray(parsed?.tenders) ? parsed.tenders : []
      for (const tender of tenders) {
        if (!isOpportunityOpen(tender.deadline, tender.status, undefined, tender.title)) continue
        const id = `gem:${tender.tenderId}`
        if (!recordsById.has(id)) {
          recordsById.set(id, {
            source: 'gem',
            sourceRecordId: tender.tenderId,
            title: tender.title,
            sourceUrl: tender.portalUrl,
            description: `${tender.description} (Ministry: ${tender.ministry} | Org: ${tender.organization} | State: ${tender.state} | Est: ${tender.valueInr})`,
            deadline: tender.deadline,
            status: tender.status,
            sectors: tender.categories,
            requirements: tender.requirements,
            applicantTypes: ['commercial', 'for-profit', 'sme', 'startup'],
            country: 'IN',
          })
        }
      }
    } catch (parseErr) {
      errors.push(`Failed to parse GeM response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
    }
  }

  const records = [...recordsById.values()]
  const known = loadKnownDiscoveryIds()
  const newRecordCount = records.filter((record) => !known.has(record.sourceRecordId ?? record.sourceUrl)).length
  saveKnownDiscoveryIds(records.map((record) => record.sourceRecordId ?? record.sourceUrl))
  const opportunities = records.map(gemRawToOpportunity)
  const recommendations = recommendOpportunitiesForTargetCompanies([profile], opportunities)

  return {
    profile,
    queries: uniqueTerms,
    records,
    recommendations,
    errors,
    sourceResults: [{ source: 'gem', queries: uniqueTerms, recordCount: records.length, errors }],
    newRecordCount,
  }
}

export async function runTargetCompanyIndiaGrantsDiscovery(
  profile: TargetCompanyMatchInput,
  requester: (term: string) => Promise<IndiaGrantsBridgeSearchResponse>,
): Promise<TargetCompanyLiveDiscoveryResult> {
  const queries = buildCompanyDiscoveryQueries(profile)
  const uniqueTerms = [...new Set(queries.map((query) => query.term))]
  const recordsById = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  const errors: string[] = []

  for (const term of uniqueTerms) {
    if (term === '') continue
    let response: IndiaGrantsBridgeSearchResponse
    try {
      response = await requester(term)
    } catch (error) {
      errors.push(`India Grants request failed: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (!response.ok || (typeof response.status === 'number' && response.status >= 400)) {
      errors.push(...extractResponseErrors(response, `India Grants bridge request failed (status ${response.status})`))
      continue
    }
    if (!response.body || (typeof response.body === 'string' && response.body.trim().startsWith('<'))) {
      errors.push(`India Grants source returned an HTML response instead of JSON (status ${response.status})`)
      continue
    }

    try {
      const parsed = JSON.parse(response.body) as { grants?: readonly IndiaGrantOpportunity[] }
      const grants = Array.isArray(parsed?.grants) ? parsed.grants : []
      for (const grant of grants) {
        if (!isOpportunityOpen(grant.deadline, grant.status, undefined, grant.title)) continue
        const id = `india-grants:${grant.grantId}`
        if (!recordsById.has(id)) {
          recordsById.set(id, {
            source: 'india-grants',
            sourceRecordId: grant.grantId,
            title: grant.title,
            sourceUrl: grant.applicationUrl,
            description: `${grant.description} (Agency: ${grant.agency} | Program: ${grant.programName} | Grant: ${grant.grantAmountInr})`,
            deadline: grant.deadline,
            status: grant.status,
            sectors: grant.sectorFocus,
            requirements: null,
            applicantTypes: grant.eligibleEntityTypes,
            country: 'IN',
          })
        }
      }
    } catch (parseErr) {
      errors.push(`Failed to parse India Grants response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
    }
  }

  const records = [...recordsById.values()]
  const known = loadKnownDiscoveryIds()
  const newRecordCount = records.filter((record) => !known.has(record.sourceRecordId ?? record.sourceUrl)).length
  saveKnownDiscoveryIds(records.map((record) => record.sourceRecordId ?? record.sourceUrl))
  const opportunities = records.map(indiaGrantsRawToOpportunity)
  const recommendations = recommendOpportunitiesForTargetCompanies([profile], opportunities)

  return {
    profile,
    queries: uniqueTerms,
    records,
    recommendations,
    errors,
    sourceResults: [{ source: 'india-grants', queries: uniqueTerms, recordCount: records.length, errors }],
    newRecordCount,
  }
}

export async function runTargetCompanyWorldBankDiscovery(
  profile: TargetCompanyMatchInput,
  requester: (term: string) => Promise<WorldBankBridgeSearchResponse>,
): Promise<TargetCompanyLiveDiscoveryResult> {
  const queries = buildCompanyDiscoveryQueries(profile)
  const uniqueTerms = [...new Set(queries.map((query) => query.term))]
  const recordsById = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  const errors: string[] = []

  for (const term of uniqueTerms) {
    if (term === '') continue
    let response: WorldBankBridgeSearchResponse
    try {
      response = await requester(term)
    } catch (error) {
      errors.push(`World Bank request failed: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (!response.ok || (typeof response.status === 'number' && response.status >= 400)) {
      errors.push(...extractResponseErrors(response, `World Bank bridge request failed (status ${response.status})`))
      continue
    }
    if (!response.body || (typeof response.body === 'string' && response.body.trim().startsWith('<'))) {
      errors.push(`World Bank source returned an HTML response instead of JSON (status ${response.status})`)
      continue
    }

    try {
      const parsed = JSON.parse(response.body) as { notices?: readonly WorldBankNotice[] }
      const notices = Array.isArray(parsed?.notices) ? parsed.notices : []
      for (const notice of notices) {
        if (!isOpportunityOpen(notice.deadline, notice.status, undefined, notice.projectTitle, notice.noticeType)) continue
        const id = `worldbank:${notice.noticeId}`
        if (!recordsById.has(id)) {
          recordsById.set(id, {
            source: 'worldbank',
            sourceRecordId: notice.noticeId,
            title: notice.projectTitle,
            sourceUrl: notice.noticeUrl,
            description: `${notice.description} (Country: ${notice.country} | Sector: ${notice.sector} | Notice: ${notice.noticeType} | Eligibility: ${notice.eligibleNationalities})`,
            deadline: notice.deadline,
            status: 'Active',
            sectors: [notice.sector],
            requirements: null,
            applicantTypes: ['commercial', 'for-profit', 'enterprise', 'Pvt Ltd'],
            country: notice.country || null,
          })
        }
      }
    } catch (parseErr) {
      errors.push(`Failed to parse World Bank response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
    }
  }

  const records = [...recordsById.values()]
  const known = loadKnownDiscoveryIds()
  const newRecordCount = records.filter((record) => !known.has(record.sourceRecordId ?? record.sourceUrl)).length
  saveKnownDiscoveryIds(records.map((record) => record.sourceRecordId ?? record.sourceUrl))
  const opportunities = records.map(worldBankRawToOpportunity)
  const recommendations = recommendOpportunitiesForTargetCompanies([profile], opportunities)

  return {
    profile,
    queries: uniqueTerms,
    records,
    recommendations,
    errors,
    sourceResults: [{ source: 'worldbank', queries: uniqueTerms, recordCount: records.length, errors }],
    newRecordCount,
  }
}

export async function runTargetCompanySamDiscovery(
  profile: TargetCompanyMatchInput,
  requester: (term: string) => Promise<SamBridgeSearchResponse>,
): Promise<TargetCompanyLiveDiscoveryResult> {
  const queries = buildCompanyDiscoveryQueries(profile)
  const uniqueTerms = [...new Set(queries.map((query) => query.term))]
  const recordsById = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  const errors: string[] = []

  for (const term of uniqueTerms) {
    if (term === '') continue
    let response: SamBridgeSearchResponse
    try {
      response = await requester(term)
    } catch (error) {
      errors.push(`SAM.gov request failed: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (!response.ok || (typeof response.status === 'number' && response.status >= 400)) {
      errors.push(...extractResponseErrors(response, `SAM.gov bridge request failed (status ${response.status})`))
      continue
    }
    if (!response.body || (typeof response.body === 'string' && response.body.trim().startsWith('<'))) {
      errors.push(`SAM.gov source returned an HTML response instead of JSON (status ${response.status})`)
      continue
    }

    try {
      const parsed = JSON.parse(response.body) as { notices?: readonly SamNotice[] }
      const notices = Array.isArray(parsed?.notices) ? parsed.notices : []
      for (const notice of notices) {
        if (!isOpportunityOpen(notice.deadline, notice.status, undefined, notice.title, notice.noticeType)) continue
        const id = `sam:${notice.noticeId}`
        if (!recordsById.has(id)) {
          recordsById.set(id, {
            source: 'sam',
            sourceRecordId: notice.noticeId,
            title: notice.title,
            sourceUrl: notice.portalUrl,
            description: `${notice.description} (Agency: ${notice.agency} | Value: ${notice.valueUsd} | Set-Aside: ${notice.setAside})`,
            deadline: notice.deadline,
            status: notice.status,
            sectors: notice.categories,
            requirements: notice.requirements,
            applicantTypes: ['commercial', 'for-profit', 'sme', 'startup'],
            country: 'US',
          })
        }
      }
    } catch (parseErr) {
      errors.push(`Failed to parse SAM.gov response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
    }
  }

  const records = [...recordsById.values()]
  const known = loadKnownDiscoveryIds()
  const newRecordCount = records.filter((record) => !known.has(record.sourceRecordId ?? record.sourceUrl)).length
  saveKnownDiscoveryIds(records.map((record) => record.sourceRecordId ?? record.sourceUrl))
  const opportunities = records.map(samRawToOpportunity)
  const recommendations = recommendOpportunitiesForTargetCompanies([profile], opportunities)

  return {
    profile,
    queries: uniqueTerms,
    records,
    recommendations,
    errors,
    sourceResults: [{ source: 'sam', queries: uniqueTerms, recordCount: records.length, errors }],
    newRecordCount,
  }
}

export async function runTargetCompanySbirDiscovery(
  profile: TargetCompanyMatchInput,
  requester: (term: string) => Promise<SbirBridgeSearchResponse>,
): Promise<TargetCompanyLiveDiscoveryResult> {
  const queries = buildCompanyDiscoveryQueries(profile)
  const uniqueTerms = [...new Set(queries.map((query) => query.term))]
  const recordsById = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  const errors: string[] = []

  for (const term of uniqueTerms) {
    if (term === '') continue
    let response: SbirBridgeSearchResponse
    try {
      response = await requester(term)
    } catch (error) {
      errors.push(`SBIR.gov request failed: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (!response.ok || (typeof response.status === 'number' && response.status >= 400)) {
      errors.push(...extractResponseErrors(response, `SBIR.gov bridge request failed (status ${response.status})`))
      continue
    }
    if (!response.body || (typeof response.body === 'string' && response.body.trim().startsWith('<'))) {
      errors.push(`SBIR.gov source returned an HTML response instead of JSON (status ${response.status})`)
      continue
    }

    try {
      const parsed = JSON.parse(response.body) as { notices?: readonly SbirNotice[] }
      const notices = Array.isArray(parsed?.notices) ? parsed.notices : []
      for (const notice of notices) {
        if (!isOpportunityOpen(notice.deadline, notice.status, undefined, notice.title)) continue
        const id = `sbir:${notice.topicId}`
        if (!recordsById.has(id)) {
          recordsById.set(id, {
            source: 'sbir',
            sourceRecordId: notice.topicId,
            title: notice.title,
            sourceUrl: notice.portalUrl,
            description: `${notice.description} (Agency: ${notice.agency} | Program: ${notice.program} | Award: ${notice.awardAmountUsd})`,
            deadline: notice.deadline,
            status: notice.status,
            sectors: notice.sectors,
            requirements: null,
            applicantTypes: notice.eligibleEntities,
            country: 'US',
          })
        }
      }
    } catch (parseErr) {
      errors.push(`Failed to parse SBIR.gov response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
    }
  }

  const records = [...recordsById.values()]
  const known = loadKnownDiscoveryIds()
  const newRecordCount = records.filter((record) => !known.has(record.sourceRecordId ?? record.sourceUrl)).length
  saveKnownDiscoveryIds(records.map((record) => record.sourceRecordId ?? record.sourceUrl))
  const opportunities = records.map(sbirRawToOpportunity)
  const recommendations = recommendOpportunitiesForTargetCompanies([profile], opportunities)

  return {
    profile,
    queries: uniqueTerms,
    records,
    recommendations,
    errors,
    sourceResults: [{ source: 'sbir', queries: uniqueTerms, recordCount: records.length, errors }],
    newRecordCount,
  }
}

export async function runTargetCompanyChallengeDiscovery(
  profile: TargetCompanyMatchInput,
  requester: (term: string) => Promise<ChallengeBridgeSearchResponse>,
): Promise<TargetCompanyLiveDiscoveryResult> {
  const queries = buildCompanyDiscoveryQueries(profile)
  const uniqueTerms = [...new Set(queries.map((query) => query.term))]
  const recordsById = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  const errors: string[] = []

  for (const term of uniqueTerms) {
    if (term === '') continue
    let response: ChallengeBridgeSearchResponse
    try {
      response = await requester(term)
    } catch (error) {
      errors.push(`Challenge.gov request failed: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (!response.ok || (typeof response.status === 'number' && response.status >= 400)) {
      errors.push(...extractResponseErrors(response, `Challenge.gov bridge request failed (status ${response.status})`))
      continue
    }
    if (!response.body || (typeof response.body === 'string' && response.body.trim().startsWith('<'))) {
      errors.push(`Challenge.gov source returned an HTML response instead of JSON (status ${response.status})`)
      continue
    }

    try {
      const parsed = JSON.parse(response.body) as { notices?: readonly ChallengeNotice[] }
      const notices = Array.isArray(parsed?.notices) ? parsed.notices : []
      for (const notice of notices) {
        if (!isOpportunityOpen(notice.deadline, notice.status, undefined, notice.title)) continue
        const id = `challenge:${notice.challengeId}`
        if (!recordsById.has(id)) {
          recordsById.set(id, {
            source: 'challenge',
            sourceRecordId: notice.challengeId,
            title: notice.title,
            sourceUrl: notice.portalUrl,
            description: `${notice.description} (Agency: ${notice.agency} | Prize Pool: ${notice.prizePoolUsd})`,
            deadline: notice.deadline,
            status: notice.status,
            sectors: notice.categories,
            requirements: null,
            applicantTypes: notice.eligibleEntities,
            country: 'US',
          })
        }
      }
    } catch (parseErr) {
      errors.push(`Failed to parse Challenge.gov response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
    }
  }

  const records = [...recordsById.values()]
  const known = loadKnownDiscoveryIds()
  const newRecordCount = records.filter((record) => !known.has(record.sourceRecordId ?? record.sourceUrl)).length
  saveKnownDiscoveryIds(records.map((record) => record.sourceRecordId ?? record.sourceUrl))
  const opportunities = records.map(challengeRawToOpportunity)
  const recommendations = recommendOpportunitiesForTargetCompanies([profile], opportunities)

  return {
    profile,
    queries: uniqueTerms,
    records,
    recommendations,
    errors,
    sourceResults: [{ source: 'challenge', queries: uniqueTerms, recordCount: records.length, errors }],
    newRecordCount,
  }
}

export async function runTargetCompanyStartupIndiaDiscovery(
  profile: TargetCompanyMatchInput,
  requester: (term: string) => Promise<StartupIndiaBridgeSearchResponse>,
): Promise<TargetCompanyLiveDiscoveryResult> {
  const queries = buildCompanyDiscoveryQueries(profile)
  const uniqueTerms = [...new Set(queries.map((query) => query.term))]
  const recordsById = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  const errors: string[] = []

  for (const term of uniqueTerms) {
    if (term === '') continue
    let response: StartupIndiaBridgeSearchResponse
    try {
      response = await requester(term)
    } catch (error) {
      errors.push(`Startup India request failed: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (!response.ok || (typeof response.status === 'number' && response.status >= 400)) {
      errors.push(...extractResponseErrors(response, `Startup India bridge request failed (status ${response.status})`))
      continue
    }
    if (!response.body || (typeof response.body === 'string' && response.body.trim().startsWith('<'))) {
      errors.push(`Startup India source returned an HTML response instead of JSON (status ${response.status})`)
      continue
    }

    try {
      const parsed = JSON.parse(response.body) as { notices?: readonly StartupIndiaNotice[] }
      const notices = Array.isArray(parsed?.notices) ? parsed.notices : []
      for (const notice of notices) {
        if (!isOpportunityOpen(notice.deadline, notice.status)) continue
        const id = `startup-india:${notice.programId}`
        if (!recordsById.has(id)) {
          recordsById.set(id, {
            source: 'startup-india',
            sourceRecordId: notice.programId,
            title: notice.title,
            sourceUrl: notice.portalUrl,
            description: `${notice.description} (Ministry: ${notice.ministry} | Grant: ${notice.grantAmountInr})`,
            deadline: notice.deadline,
            status: notice.status,
            sectors: notice.categories,
            requirements: null,
            applicantTypes: notice.eligibleEntities,
            country: 'IN',
          })
        }
      }
    } catch (parseErr) {
      errors.push(`Failed to parse Startup India response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
    }
  }

  const records = [...recordsById.values()]
  const known = loadKnownDiscoveryIds()
  const newRecordCount = records.filter((record) => !known.has(record.sourceRecordId ?? record.sourceUrl)).length
  saveKnownDiscoveryIds(records.map((record) => record.sourceRecordId ?? record.sourceUrl))
  const opportunities = records.map(startupIndiaRawToOpportunity)
  const recommendations = recommendOpportunitiesForTargetCompanies([profile], opportunities)

  return {
    profile,
    queries: uniqueTerms,
    records,
    recommendations,
    errors,
    sourceResults: [{ source: 'startup-india', queries: uniqueTerms, recordCount: records.length, errors }],
    newRecordCount,
  }
}

export async function runTargetCompanyThubDiscovery(
  profile: TargetCompanyMatchInput,
  requester: (term: string) => Promise<ThubBridgeSearchResponse>,
): Promise<TargetCompanyLiveDiscoveryResult> {
  const queries = buildCompanyDiscoveryQueries(profile)
  const uniqueTerms = [...new Set(queries.map((query) => query.term))]
  const recordsById = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  const errors: string[] = []

  for (const term of uniqueTerms) {
    if (term === '') continue
    let response: ThubBridgeSearchResponse
    try {
      response = await requester(term)
    } catch (error) {
      errors.push(`T-Hub request failed: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (!response.ok || (typeof response.status === 'number' && response.status >= 400)) {
      errors.push(...extractResponseErrors(response, `T-Hub bridge request failed (status ${response.status})`))
      continue
    }
    if (!response.body || (typeof response.body === 'string' && response.body.trim().startsWith('<'))) {
      errors.push(`T-Hub source returned an HTML response instead of JSON (status ${response.status})`)
      continue
    }

    try {
      const parsed = JSON.parse(response.body) as { notices?: readonly ThubNotice[] }
      const notices = Array.isArray(parsed?.notices) ? parsed.notices : []
      for (const notice of notices) {
        if (!isOpportunityOpen(notice.deadline, notice.status)) continue
        const id = `thub:${notice.programId}`
        if (!recordsById.has(id)) {
          recordsById.set(id, {
            source: 'thub',
            sourceRecordId: notice.programId,
            title: notice.title,
            sourceUrl: notice.portalUrl,
            description: `${notice.description} (Organization: ${notice.organization} | Grant: ${notice.grantAmountInr})`,
            deadline: notice.deadline,
            status: notice.status,
            sectors: notice.categories,
            requirements: null,
            applicantTypes: notice.eligibleEntities,
            country: 'IN',
          })
        }
      }
    } catch (parseErr) {
      errors.push(`Failed to parse T-Hub response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
    }
  }

  const records = [...recordsById.values()]
  const known = loadKnownDiscoveryIds()
  const newRecordCount = records.filter((record) => !known.has(record.sourceRecordId ?? record.sourceUrl)).length
  saveKnownDiscoveryIds(records.map((record) => record.sourceRecordId ?? record.sourceUrl))
  const opportunities = records.map(thubRawToOpportunity)
  const recommendations = recommendOpportunitiesForTargetCompanies([profile], opportunities)

  return {
    profile,
    queries: uniqueTerms,
    records,
    recommendations,
    errors,
    sourceResults: [{ source: 'thub', queries: uniqueTerms, recordCount: records.length, errors }],
    newRecordCount,
  }
}

export async function runTargetCompanyIcreateDiscovery(
  profile: TargetCompanyMatchInput,
  requester: (term: string) => Promise<IcreateBridgeSearchResponse>,
): Promise<TargetCompanyLiveDiscoveryResult> {
  const queries = buildCompanyDiscoveryQueries(profile)
  const uniqueTerms = [...new Set(queries.map((query) => query.term))]
  const recordsById = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  const errors: string[] = []

  for (const term of uniqueTerms) {
    if (term === '') continue
    let response: IcreateBridgeSearchResponse
    try {
      response = await requester(term)
    } catch (error) {
      errors.push(`iCreate request failed: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (!response.ok || (typeof response.status === 'number' && response.status >= 400)) {
      errors.push(...extractResponseErrors(response, `iCreate bridge request failed (status ${response.status})`))
      continue
    }
    if (!response.body || (typeof response.body === 'string' && response.body.trim().startsWith('<'))) {
      errors.push(`iCreate source returned an HTML response instead of JSON (status ${response.status})`)
      continue
    }

    try {
      const parsed = JSON.parse(response.body) as { notices?: readonly IcreateNotice[] }
      const notices = Array.isArray(parsed?.notices) ? parsed.notices : []
      for (const notice of notices) {
        if (!isOpportunityOpen(notice.deadline, notice.status)) continue
        const id = `icreate:${notice.noticeId}`
        if (!recordsById.has(id)) {
          recordsById.set(id, {
            source: 'icreate',
            sourceRecordId: notice.noticeId,
            title: notice.title,
            sourceUrl: notice.portalUrl,
            description: `${notice.description} (Organization: ${notice.organization} | Grant: ${notice.grantAmountInr})`,
            deadline: notice.deadline,
            status: notice.status,
            sectors: notice.categories,
            requirements: null,
            applicantTypes: notice.eligibleEntities,
            country: 'IN',
          })
        }
      }
    } catch (parseErr) {
      errors.push(`Failed to parse iCreate response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
    }
  }

  const records = [...recordsById.values()]
  const known = loadKnownDiscoveryIds()
  const newRecordCount = records.filter((record) => !known.has(record.sourceRecordId ?? record.sourceUrl)).length
  saveKnownDiscoveryIds(records.map((record) => record.sourceRecordId ?? record.sourceUrl))
  const opportunities = records.map(icreateRawToOpportunity)
  const recommendations = recommendOpportunitiesForTargetCompanies([profile], opportunities)

  return {
    profile,
    queries: uniqueTerms,
    records,
    recommendations,
    errors,
    sourceResults: [{ source: 'icreate', queries: uniqueTerms, recordCount: records.length, errors }],
    newRecordCount,
  }
}

export function mergeDiscoveryResults(
  profile: TargetCompanyMatchInput,
  results: readonly TargetCompanyLiveDiscoveryResult[],
): TargetCompanyLiveDiscoveryResult {
  const recordsById = new Map<string, TargetCompanyLiveDiscoveryRecord>()
  const allQueries = new Set<string>()
  const allErrors: string[] = []
  const allSourceResults: TargetCompanyLiveDiscoverySourceResult[] = []
  let totalNew = 0

  for (const res of results) {
    for (const q of res.queries) allQueries.add(q)
    allErrors.push(...res.errors)
    allSourceResults.push(...res.sourceResults)
    totalNew += res.newRecordCount

    for (const record of res.records) {
      const id = `${record.source}:${record.sourceRecordId ?? record.sourceUrl}`
      if (!recordsById.has(id)) {
        recordsById.set(id, record)
      }
    }
  }

  const records = [...recordsById.values()]
  const opportunities = records.map(recordToOpportunity)
  const recommendations = recommendOpportunitiesForTargetCompanies([profile], opportunities)

  return {
    profile,
    queries: [...allQueries],
    records,
    recommendations,
    errors: allErrors,
    sourceResults: allSourceResults,
    newRecordCount: totalNew,
  }
}

export interface OpportunityAssessmentGroup {
  readonly key: string
  readonly opportunityId: string
  readonly opportunityTitle: string
  readonly source: string
  readonly opportunityType: TargetOpportunityInput['opportunityType']
  readonly assessments: readonly TargetRelevanceResult[]
}

export function groupTargetRecommendations(recommendations: readonly TargetRelevanceResult[]): OpportunityAssessmentGroup[] {
  const map = new Map<string, OpportunityAssessmentGroup & { assessments: TargetRelevanceResult[] }>()
  let ungroupedIndex = 0
  for (const recommendation of recommendations) {
    let sourceHost: string | null = null
    try {
      const url = new URL(recommendation.sourceUrl)
      if (url.protocol === 'https:' || url.protocol === 'http:') sourceHost = url.hostname.toLowerCase()
    } catch {}
    const opportunityId = recommendation.opportunityId.trim()
    const canonicalKey =
      sourceHost !== null && opportunityId !== ''
        ? JSON.stringify([sourceHost, opportunityId])
        : null
    const key = canonicalKey ?? `unidentified:${ungroupedIndex++}`
    const existing = map.get(key)
    if (existing === undefined) {
      map.set(key, {
        key,
        opportunityId: recommendation.opportunityId,
        opportunityTitle: recommendation.opportunityTitle,
        source: sourceHost ?? 'Unknown source',
        opportunityType: recommendation.opportunityType,
        assessments: [recommendation],
      })
    } else {
      const companyId = recommendation.companyId.trim()
      const companyName = recommendation.companyName.trim()
      const alreadyAssessed =
        companyId !== ''
          ? existing.assessments.some((assessment) => assessment.companyId.trim() === companyId)
          : companyName !== '' &&
            existing.assessments.some((assessment) => assessment.companyId.trim() === '' && assessment.companyName.trim() === companyName)
      if (!alreadyAssessed) existing.assessments.push(recommendation)
    }
  }
  return [...map.values()]
}

export function firstImportedTargetCompany(): TargetCompanyMatchInput | null {
  const preview = loadImportedTargetCompanies()
  if (!preview) return null
  const companies = csvPreviewToTargetCompanies(preview)
  return companies.length > 0 ? companies[0] : null
}
