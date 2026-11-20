/**
 * Client-side company research drafts and confirmed-profile storage.
 *
 * Research responses are returned as drafts. Only an explicit user confirmation
 * saves a profile for use by discovery, under a versioned browser-local cache.
 *
 * Includes automatic quota-exceeded mitigation (compaction, pruning, and sessionStorage/memory fallbacks).
 */

import type {
  EnrichedCompanyProfile,
  CompanyEnrichmentRequest,
  CompanyEnrichmentResponse,
} from '../live-source/enrichment-bridge/contract'
import { ENRICHMENT_BRIDGE_ENRICH_PATH } from '../live-source/enrichment-bridge/contract'

const STORAGE_KEY = 'tvb:company-enrichment-cache.v2'
const MAX_CACHED_COMPANIES = 20

// In-memory cache ensures profiles are always accessible during the active session
// even if browser localStorage has reached its strict 5MB quota limit.
const inMemoryCache: Record<string, EnrichedCompanyProfile> = {}

/**
 * Compacts a company profile before persistent storage to prevent browser quota exhaustion.
 * - Truncates huge raw markdown scrapes
 * - Truncates long evidence excerpts and limits evidence array
 * - Caps custom notes and summary lengths
 */
export function compactProfileForStorage(profile: EnrichedCompanyProfile): EnrichedCompanyProfile {
  const compactEvidence = (profile.evidence ?? []).slice(0, 5).map((ev) => ({
    ...ev,
    excerpt: ev.excerpt ? ev.excerpt.slice(0, 250) : '',
  }))

  return {
    ...profile,
    evidence: compactEvidence,
    rawMarkdownPreview: profile.rawMarkdownPreview ? profile.rawMarkdownPreview.slice(0, 500) : undefined,
    summary: profile.summary ? profile.summary.slice(0, 2500) : '',
    customNotes: profile.customNotes ? profile.customNotes.slice(0, 5000) : null,
  }
}

export function loadEnrichmentCache(): Record<string, EnrichedCompanyProfile> {
  const result: Record<string, EnrichedCompanyProfile> = { ...inMemoryCache }

  if (typeof window !== 'undefined') {
    // 1. Check sessionStorage fallback
    if (window.sessionStorage) {
      try {
        const rawSession = window.sessionStorage.getItem(STORAGE_KEY)
        if (rawSession) {
          const parsed: unknown = JSON.parse(rawSession)
          if (parsed && typeof parsed === 'object') {
            Object.assign(result, parsed)
          }
        }
      } catch {}
    }

    // 2. Check localStorage primary store
    if (window.localStorage) {
      try {
        const rawLocal = window.localStorage.getItem(STORAGE_KEY)
        if (rawLocal) {
          const parsed: unknown = JSON.parse(rawLocal)
          if (parsed && typeof parsed === 'object') {
            Object.assign(result, parsed)
          }
        }
      } catch {}
    }
  }

  return result
}

export function getCachedEnrichment(companyName: string): EnrichedCompanyProfile | null {
  const key = companyName.trim().toLowerCase()
  if (inMemoryCache[key]) {
    return inMemoryCache[key]
  }
  const cache = loadEnrichmentCache()
  return cache[key] ?? null
}

export function saveCachedEnrichment(profile: EnrichedCompanyProfile): void {
  const key = profile.companyName.trim().toLowerCase()

  // 1. Always update in-memory cache first (guaranteed non-failing)
  inMemoryCache[key] = profile

  if (typeof window === 'undefined') return

  // 2. Compact profile for persistent storage
  const compact = compactProfileForStorage(profile)
  const cache = loadEnrichmentCache()
  cache[key] = compact

  // Limit cache entries to prevent unbounded storage growth
  const keys = Object.keys(cache)
  if (keys.length > MAX_CACHED_COMPANIES) {
    for (const oldKey of keys.slice(0, keys.length - MAX_CACHED_COMPANIES)) {
      delete cache[oldKey]
    }
  }

  // 3. Attempt writing to localStorage with progressive quota mitigation
  if (window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
      return
    } catch {
      // QuotaExceededError handling:
      // Strategy A: Strip evidence from all older cached entries
      try {
        for (const k of Object.keys(cache)) {
          if (k !== key && cache[k].evidence) {
            cache[k] = { ...cache[k], evidence: [] }
          }
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
        return
      } catch {}

      // Strategy B: Save only the current company in localStorage
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ [key]: compact }))
        return
      } catch {}
    }
  }

  // 4. Fallback Strategy C: Try sessionStorage
  if (window.sessionStorage) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ [key]: compact }))
      return
    } catch {}
  }

  // 5. If all storage fails, inMemoryCache already has the profile for this session
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
