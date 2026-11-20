import test from 'node:test'
import assert from 'node:assert/strict'
import {
  saveCachedEnrichment,
  getCachedEnrichment,
  compactProfileForStorage,
} from './enrichment-store'
import type { EnrichedCompanyProfile } from '../live-source/enrichment-bridge/contract'

test('compactProfileForStorage truncates oversized evidence, markdown preview, and notes', () => {
  const hugeProfile: EnrichedCompanyProfile = {
    companyName: 'TestCorp',
    websiteUrl: 'https://testcorp.com',
    resolvedVia: 'search-discovery',
    hqLocation: 'Bangalore, India',
    operatingCountries: ['India', 'United States'],
    isMultiJurisdiction: true,
    sectors: ['Cybersecurity'],
    capabilities: ['Cloud Security', 'Threat Detection'],
    entityType: 'commercial',
    summary: 'A'.repeat(5000),
    rawMarkdownPreview: '# Big Markdown\n'.repeat(1000),
    customNotes: 'N'.repeat(10000),
    evidence: Array.from({ length: 20 }, (_, i) => ({
      field: `field-${i}`,
      value: `val-${i}`,
      excerpt: 'E'.repeat(1000),
      sourceUrl: 'https://testcorp.com/about',
      observedAt: '2026-11-20T12:00:00Z',
    })),
  }

  const compacted = compactProfileForStorage(hugeProfile)
  assert.equal(compacted.companyName, 'TestCorp')
  assert.ok(compacted.summary.length <= 2500)
  assert.ok((compacted.rawMarkdownPreview?.length ?? 0) <= 500)
  assert.ok((compacted.customNotes?.length ?? 0) <= 5000)
  assert.ok((compacted.evidence?.length ?? 0) <= 5)
  assert.ok(compacted.evidence?.every((ev) => ev.excerpt.length <= 250))
})

test('saveCachedEnrichment saves and retrieves profiles seamlessly', () => {
  const profile: EnrichedCompanyProfile = {
    companyName: 'Threatworx',
    websiteUrl: 'https://threatworx.io',
    resolvedVia: 'supplied-url',
    hqLocation: 'Bay Area, US',
    operatingCountries: ['United States'],
    isMultiJurisdiction: false,
    sectors: ['Cybersecurity'],
    capabilities: ['Shadow AI Discovery', 'Posture Management'],
    entityType: 'commercial',
    summary: 'Threatworx provides agentless enterprise shadow AI and cloud risk discovery.',
    evidence: [],
  }

  saveCachedEnrichment(profile)
  const retrieved = getCachedEnrichment('Threatworx')
  assert.ok(retrieved !== null)
  assert.equal(retrieved?.companyName, 'Threatworx')
  assert.equal(retrieved?.hqLocation, 'Bay Area, US')
  assert.ok(retrieved?.capabilities.includes('Shadow AI Discovery'))
})

test('saveCachedEnrichment handles QuotaExceededError gracefully without throwing', () => {
  const mockStorage = {
    _data: new Map<string, string>(),
    getItem(key: string) {
      return this._data.get(key) ?? null
    },
    setItem(_key: string, _val: string) {
      const err = new Error("Failed to execute 'setItem' on 'Storage': Setting the value exceeded the quota.")
      err.name = 'QuotaExceededError'
      throw err
    },
    removeItem(key: string) {
      this._data.delete(key)
    },
  }

  const originalWindow = globalThis.window
  // Mock window with failing localStorage
  const mockWindow = {
    localStorage: mockStorage,
    sessionStorage: {
      _data: new Map<string, string>(),
      getItem(key: string) {
        return this._data.get(key) ?? null
      },
      setItem(key: string, val: string) {
        this._data.set(key, val)
      },
      removeItem(key: string) {
        this._data.delete(key)
      },
    },
  }

  ;(globalThis as unknown as { window: unknown }).window = mockWindow

  try {
    const profile: EnrichedCompanyProfile = {
      companyName: 'QuotaTestCo',
      websiteUrl: 'https://quotatest.com',
      resolvedVia: 'search-discovery',
      hqLocation: 'Austin, US',
      operatingCountries: ['United States'],
      isMultiJurisdiction: false,
      sectors: ['Semiconductors'],
      capabilities: ['ASIC verification'],
      entityType: 'commercial',
      summary: 'Specialized chip design firm',
      evidence: [],
    }

    // Must NOT throw
    assert.doesNotThrow(() => {
      saveCachedEnrichment(profile)
    })

    // Profile must still be retrievable from in-memory / session fallback
    const retrieved = getCachedEnrichment('QuotaTestCo')
    assert.ok(retrieved !== null)
    assert.equal(retrieved?.companyName, 'QuotaTestCo')
    assert.equal(retrieved?.hqLocation, 'Austin, US')
  } finally {
    ;(globalThis as unknown as { window: unknown }).window = originalWindow
  }
})
