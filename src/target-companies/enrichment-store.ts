/**
 * Client-side company research drafts and confirmed-profile storage.
 *
 * Research responses are returned as drafts. Only an explicit user confirmation
 * saves a profile for use by discovery, under a versioned browser-local cache.
 */

import type { EnrichedCompanyProfile, CompanyEnrichmentRequest, CompanyEnrichmentResponse } from '../live-source/enrichment-bridge/contract'
import { ENRICHMENT_BRIDGE_ENRICH_PATH } from '../live-source/enrichment-bridge/contract'

const STORAGE_KEY = 'tvb:company-enrichment-cache.v2'

export function loadEnrichmentCache(): Record<string, EnrichedCompanyProfile> {
  if (typeof window === 'undefined' || !window.localStorage) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, EnrichedCompanyProfile>
  } catch {
    return {}
  }
}

export function getCachedEnrichment(companyName: string): EnrichedCompanyProfile | null {
  const cache = loadEnrichmentCache()
  const key = companyName.trim().toLowerCase()
  return cache[key] ?? null
}

export function saveCachedEnrichment(profile: EnrichedCompanyProfile): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  const cache = loadEnrichmentCache()
  const key = profile.companyName.trim().toLowerCase()
  cache[key] = profile
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
}

export async function requestCompanyEnrichment(
  req: CompanyEnrichmentRequest,
): Promise<CompanyEnrichmentResponse> {
  const response = await fetch(ENRICHMENT_BRIDGE_ENRICH_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  const result = (await response.json()) as CompanyEnrichmentResponse
  if (!response.ok || !result.ok) {
    throw new Error(result.errors?.join(' ') || `Company research failed with HTTP ${response.status}.`)
  }
  return result
}

