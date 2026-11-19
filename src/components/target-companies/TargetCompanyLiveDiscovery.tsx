import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GRANTS_GOV_BRIDGE_SEARCH_PATH } from '../../live-source/grantsgov-bridge/contract'
import type { GrantsGovBridgeSearchResponse } from '../../live-source/grantsgov-bridge/contract'
import { EU_SEDIA_BRIDGE_SEARCH_PATH } from '../../live-source/eu-sedia-bridge/contract'
import type { EuSediaBridgeSearchResponse } from '../../live-source/eu-sedia-bridge/contract'
import { TED_BRIDGE_SEARCH_PATH } from '../../live-source/ted-bridge/contract'
import type { TedBridgeSearchResponse } from '../../live-source/ted-bridge/contract'
import { GEM_BRIDGE_SEARCH_PATH } from '../../live-source/gem-bridge/contract'
import type { GemBridgeSearchResponse } from '../../live-source/gem-bridge/contract'
import { INDIA_GRANTS_BRIDGE_SEARCH_PATH } from '../../live-source/india-grants-bridge/contract'
import type { IndiaGrantsBridgeSearchResponse } from '../../live-source/india-grants-bridge/contract'
import { WORLDBANK_BRIDGE_SEARCH_PATH } from '../../live-source/worldbank-bridge/contract'
import type { WorldBankBridgeSearchResponse } from '../../live-source/worldbank-bridge/contract'
import { SAM_BRIDGE_SEARCH_PATH } from '../../live-source/sam-bridge/contract'
import type { SamBridgeSearchResponse } from '../../live-source/sam-bridge/contract'
import { SBIR_BRIDGE_SEARCH_PATH } from '../../live-source/sbir-bridge/contract'
import type { SbirBridgeSearchResponse } from '../../live-source/sbir-bridge/contract'
import { CHALLENGE_BRIDGE_SEARCH_PATH } from '../../live-source/challenge-bridge/contract'
import type { ChallengeBridgeSearchResponse } from '../../live-source/challenge-bridge/contract'
import { STARTUP_INDIA_BRIDGE_SEARCH_PATH } from '../../live-source/startup-india-bridge/contract'
import type { StartupIndiaBridgeSearchResponse } from '../../live-source/startup-india-bridge/contract'
import { THUB_BRIDGE_SEARCH_PATH } from '../../live-source/thub-bridge/contract'
import type { ThubBridgeSearchResponse } from '../../live-source/thub-bridge/contract'
import { ICREATE_BRIDGE_SEARCH_PATH } from '../../live-source/icreate-bridge/contract'
import type { IcreateBridgeSearchResponse } from '../../live-source/icreate-bridge/contract'
import { handleSamBridge } from '../../live-source/sam-bridge/handler'
import { handleSbirBridge } from '../../live-source/sbir-bridge/handler'
import { handleChallengeBridge } from '../../live-source/challenge-bridge/handler'
import { handleStartupIndiaBridge } from '../../live-source/startup-india-bridge/handler'
import { handleThubBridge } from '../../live-source/thub-bridge/handler'
import { handleIcreateBridge } from '../../live-source/icreate-bridge/handler'
import { handleGemBridge } from '../../live-source/gem-bridge/handler'
import { handleIndiaGrantsBridge } from '../../live-source/india-grants-bridge/handler'
import { handleWorldBankBridge } from '../../live-source/worldbank-bridge/handler'
import { resolveBridgeUrl } from '../../live-source/bridge-url'
import { loadImportedTargetCompanies } from '../../target-companies/store'
import { csvPreviewToTargetCompanies } from '../../target-companies/profiles'
import { buildCompanyDiscoveryQueries } from '../../target-companies/discovery-queries'
import {
  groupTargetRecommendations,
  runTargetCompanyDiscovery,
  runTargetCompanyGrantsGovDiscovery,
  runTargetCompanyTedDiscovery,
  runTargetCompanyGemDiscovery,
  runTargetCompanyIndiaGrantsDiscovery,
  runTargetCompanyWorldBankDiscovery,
  runTargetCompanySamDiscovery,
  runTargetCompanySbirDiscovery,
  runTargetCompanyChallengeDiscovery,
  runTargetCompanyStartupIndiaDiscovery,
  runTargetCompanyThubDiscovery,
  runTargetCompanyIcreateDiscovery,
  mergeDiscoveryResults,
} from '../../target-companies/live-discovery'
import type { TargetCompanyLiveDiscoveryResult } from '../../target-companies/live-discovery'
import { loadPersistedRuns, persistRunOutcome } from '../../live-source/persisted-runs'
import type { DiscoveryCompanyResult, DiscoveryRunOutcome } from '../../automation/discovery-fixture'
import { createReviewQueue } from '../../automation/review-queue'
import { reviewFixtureStore } from '../../automation/review-fixture'
import type { DiscoveryCandidate } from '../../automation/candidate'
import type { DiscoveryDomain } from '../../automation/types'
import { saveSuppliedReviewState } from '../../live-source/review-persistence'
import { downloadLeadsCsv } from '../../target-companies/export-leads-csv'
import MatchMatrix from './MatchMatrix'
import LeadsDownloadMenu from './LeadsDownloadMenu'
import { formatFriendlySourceName } from './match-matrix-model'
import { requestCompanyEnrichment, saveCachedEnrichment, getCachedEnrichment } from '../../target-companies/enrichment-store'
import type { CompanyWebsiteCandidate, EnrichedCompanyProfile } from '../../live-source/enrichment-bridge/contract'

const TARGET_RESULTS_KEY = 'tvb.target-company-results.v2'

function loadCachedResults(): TargetCompanyLiveDiscoveryResult[] {
  try {
    if (typeof sessionStorage === 'undefined') return []
    const raw = sessionStorage.getItem(TARGET_RESULTS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as TargetCompanyLiveDiscoveryResult[]) : []
  } catch {
    return []
  }
}

function saveCachedResults(results: TargetCompanyLiveDiscoveryResult[]): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TARGET_RESULTS_KEY, JSON.stringify(results))
    }
  } catch {
    // Ignore storage failures
  }
}

function syncRecommendationsToReviewQueue(
  resultsList: readonly TargetCompanyLiveDiscoveryResult[],
  runId: string,
  runTime: string,
): DiscoveryCandidate[] {
  const candidatesNeedingReview: DiscoveryCandidate[] = []

  for (const result of resultsList) {
    const compId = result.profile.name || result.profile.companyId
    for (const rec of result.recommendations ?? []) {
      if (rec.outcome === 'not_relevant') continue

      const domain: DiscoveryDomain = rec.opportunityType === 'procurement' ? 'procurement' : 'funding'
      let sourceHost = 'unknown'
      try {
        sourceHost = new URL(rec.sourceUrl).hostname.toLowerCase()
      } catch {}

      const sourceId = sourceHost.includes('sam.gov')
        ? 'SU-SAM-001'
        : sourceHost.includes('sbir.gov')
          ? 'SU-SBIR-001'
          : sourceHost.includes('challenge.gov')
            ? 'SU-CHALLENGE-001'
            : sourceHost.includes('grants.gov')
              ? 'SU-GRANTS-001'
              : sourceHost.includes('seedfund.startupindia.gov.in') || sourceHost.includes('startupindia')
                ? 'SU-STARTUP-INDIA-001'
                : sourceHost.includes('t-hub.co')
                  ? 'SU-THUB-001'
                  : sourceHost.includes('icreate.org.in')
                    ? 'SU-ICREATE-001'
                    : sourceHost.includes('ted.europa.eu')
                      ? 'SU-TED-001'
                      : sourceHost.includes('europa.eu')
                        ? 'SU-EU-SEDIA-001'
                        : sourceHost.includes('gem.gov.in') || sourceHost.includes('eprocure.gov.in')
                          ? 'SU-GEM-001'
                          : sourceHost.includes('meity') || sourceHost.includes('idex') || sourceHost.includes('birac') || sourceHost.includes('bhashini') || sourceHost.includes('stpi') || sourceHost.includes('dst.gov') || sourceHost.includes('onlinedst') || sourceHost.includes('c2s.gov')
                            ? 'SU-INDIA-GRANTS-001'
                            : sourceHost.includes('worldbank.org')
                              ? 'SU-WORLDBANK-001'
                              : 'SU-LIVE-001'
      const sourceName = sourceHost.includes('sam.gov')
        ? 'SAM.gov Federal Solicitations'
        : sourceHost.includes('sbir.gov') || sourceHost.includes('nasa.gov') || sourceHost.includes('nsf.gov') || sourceHost.includes('osti.gov')
          ? 'SBIR.gov Innovation Grants'
          : sourceHost.includes('challenge.gov') || sourceHost.includes('usa.gov') || sourceHost.includes('diu.mil') || sourceHost.includes('darpa.mil')
            ? 'USA.gov & Federal Challenges'
            : sourceHost.includes('grants.gov')
              ? 'Grants.gov'
              : sourceHost.includes('seedfund.startupindia.gov.in') || sourceHost.includes('startupindia')
                ? 'Startup India Seed Fund Scheme'
                : sourceHost.includes('t-hub.co')
                  ? 'T-Hub Innovation Accelerators'
                  : sourceHost.includes('icreate.org.in')
                    ? 'iCreate Prototyping Grants'
                    : sourceHost.includes('ted.europa.eu')
                      ? 'TED Procurement'
                      : sourceHost.includes('europa.eu')
                        ? 'EU SEDIA'
                        : sourceHost.includes('gem.gov.in') || sourceHost.includes('eprocure.gov.in')
                          ? 'GeM & CPPP India'
                          : sourceHost.includes('meity') || sourceHost.includes('idex') || sourceHost.includes('birac') || sourceHost.includes('bhashini') || sourceHost.includes('stpi') || sourceHost.includes('dst.gov') || sourceHost.includes('onlinedst') || sourceHost.includes('c2s.gov')
                            ? 'MeitY / iDEX Innovation Grants'
                            : sourceHost.includes('worldbank.org')
                              ? 'World Bank Procurement'
                              : sourceHost

      const rawType = rec.opportunityType === 'procurement' ? 'RFP' : 'GRANT'
      const candidateId = `${sourceId}:${rec.opportunityId}:${compId}`

      candidatesNeedingReview.push({
        candidateId,
        discoveryRunId: runId,
        companyId: compId,
        discoveryProfileId: result.profile.companyId,
        sourceId,
        sourceRecordId: rec.opportunityId,
        sourceUrl: rec.sourceUrl,
        sourceTitle: rec.opportunityTitle,
        sourceSummary: Array.isArray(rec.reasons) ? rec.reasons.join(' ') : null,
        sourcePublicationDate: null,
        sourceDeadline: rec.deadline ?? null,
        sourceOrganization: null,
        sourceCountry: null,
        sourceRawType: rawType,
        sourceStatus: rec.status ?? null,
        domain,
        candidateType: 'opportunity',
        candidateStatus: 'REVIEW',
        provenance: {
          runId,
          companyId: compId,
          discoveryProfileId: result.profile.companyId,
          sourceId,
          sourceName,
          sourceUrl: rec.sourceUrl,
          sourceRecordId: rec.opportunityId,
          adapterType:
            sourceId === 'SU-SAM-001'
              ? 'sam'
              : sourceId === 'SU-SBIR-001'
                ? 'sbir'
                : sourceId === 'SU-CHALLENGE-001'
                  ? 'challenge'
                  : sourceId === 'SU-STARTUP-INDIA-001'
                    ? 'startup-india'
                    : sourceId === 'SU-THUB-001'
                      ? 'thub'
                      : sourceId === 'SU-ICREATE-001'
                        ? 'icreate'
                        : sourceId === 'SU-TED-001'
                          ? 'ted'
                          : sourceId === 'SU-EU-SEDIA-001'
                            ? 'eu-sedia'
                            : sourceId === 'SU-GEM-001'
                              ? 'gem'
                              : sourceId === 'SU-INDIA-GRANTS-001'
                                ? 'india-grants'
                                : sourceId === 'SU-WORLDBANK-001'
                                  ? 'worldbank'
                                  : 'grantsgov',
          domain,
          accessState: 'AVAILABLE',
          queryTerm: null,
          requestedAt: runTime,
          observedAt: runTime,
          stageHistory: ['transform', 'normalize', 'classify'],
        },
        normalization: {
          ruleVersion: '2026-10-01',
          status: 'NORMALIZED',
          changedFields: [],
          warnings: [],
          title: { original: rec.opportunityTitle, normalized: rec.opportunityTitle },
          sourceUrl: { original: rec.sourceUrl, normalized: rec.sourceUrl },
          canonicalUrl: rec.sourceUrl,
          summary: {
            original: Array.isArray(rec.reasons) ? rec.reasons.join(' ') : null,
            normalized: Array.isArray(rec.reasons) ? rec.reasons.join(' ') : null,
          },
          publicationDate: { original: null, normalized: null },
          deadline: { original: rec.deadline ?? null, normalized: rec.deadline ?? null },
          organization: { original: null, normalized: null },
          country: { original: null, normalized: null },
          rawType: { original: rawType, normalized: rawType },
          sourceStatus: { original: rec.status ?? null, normalized: rec.status ?? null },
        },
        classification: {
          state: 'CLASSIFIED',
          type: rawType,
          certainty: 'HIGH',
          evidence: {
            domain,
            sourceEvidence: { sourceId, adapterType: null, sourceRawType: rawType },
            titleHints: [],
            matchedRule: 'target-company-match',
            ruleVersion: '2026-10-01',
          },
        },
        duplicate: {
          verdict: 'DISTINCT',
          evidence: {
            ruleVersion: '2026-10-01',
            matchedOn: 'source identity',
            tier: 1,
            otherCandidateId: null,
            titleKey: rec.opportunityTitle,
            corroboratingSignals: [],
          },
        },
      })
    }
  }

  if (candidatesNeedingReview.length > 0) {
    const queue = createReviewQueue(candidatesNeedingReview, { createdAt: runTime })
    reviewFixtureStore.addReviewItems(queue)
    saveSuppliedReviewState()
  }

  return candidatesNeedingReview
}

export default function TargetCompanyLiveDiscovery() {
  const imported = loadImportedTargetCompanies()
  const [enrichmentVersion, setEnrichmentVersion] = useState(0)
  const [isEnriching, setIsEnriching] = useState(false)
  const [enrichmentStatus, setEnrichmentStatus] = useState<string | null>(null)
  const [websiteCandidates, setWebsiteCandidates] = useState<Record<string, readonly CompanyWebsiteCandidate[]>>({})
  const [enrichmentDrafts, setEnrichmentDrafts] = useState<Record<string, EnrichedCompanyProfile>>({})
  const [enrichmentErrors, setEnrichmentErrors] = useState<Record<string, string>>({})

  const profiles = useMemo(() => {
    return imported ? csvPreviewToTargetCompanies(imported) : []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imported, enrichmentVersion])

  const [results, setResults] = useState<TargetCompanyLiveDiscoveryResult[]>(() => loadCachedResults())

  useEffect(() => {
    if (results.length > 0) {
      const now = new Date().toISOString()
      syncRecommendationsToReviewQueue(results, 'RUN-LIVE-RESTORED', now)
    }
  }, [results])

  const handleAutoEnrich = async () => {
    if (profiles.length === 0 || isEnriching) return
    setIsEnriching(true)
    setEnrichmentStatus('Searching for company websites and preparing evidence-backed profile drafts...')
    setEnrichmentErrors({})
    try {
      let failedCount = 0
      let draftCount = 0
      let candidateCount = 0
      let noCandidateCount = 0
      for (let i = 0; i < profiles.length; i++) {
        const profile = profiles[i]
        setEnrichmentStatus(`[${i + 1}/${profiles.length}] Researching ${profile.name}...`)
        try {
          const result = await requestCompanyEnrichment({
            companyName: profile.name,
            websiteUrl: profile.website,
          })
          if (result.profile) {
            draftCount++
            setEnrichmentDrafts((current) => ({ ...current, [profile.companyId]: result.profile! }))
            setWebsiteCandidates((current) => {
              const next = { ...current }
              delete next[profile.companyId]
              return next
            })
          } else {
            const candidates = result.websiteCandidates ?? []
            if (candidates.length > 0) candidateCount++
            else noCandidateCount++
            setWebsiteCandidates((current) => ({
              ...current,
              [profile.companyId]: candidates,
            }))
          }
        } catch (error) {
          failedCount++
          setEnrichmentErrors((current) => ({
            ...current,
            [profile.companyId]: error instanceof Error ? error.message : String(error),
          }))
        }
      }
      setEnrichmentStatus(
        failedCount === profiles.length
          ? 'Research failed for all companies. See the error messages below.'
          : `Research finished: ${draftCount} profile drafts, ${candidateCount} website candidates, ${noCandidateCount} with no results, ${failedCount} failed. Review any returned evidence before confirming a profile.`,
      )
    } finally {
      setIsEnriching(false)
    }
  }

  const researchWebsiteCandidate = async (
    profile: (typeof profiles)[number],
    candidate: CompanyWebsiteCandidate,
  ) => {
    if (isEnriching) return
    setIsEnriching(true)
    setEnrichmentErrors((current) => {
      const next = { ...current }
      delete next[profile.companyId]
      return next
    })
    setEnrichmentStatus(`Reading ${candidate.url} for ${profile.name}...`)
    try {
      const result = await requestCompanyEnrichment({ companyName: profile.name, websiteUrl: candidate.url })
      if (!result.profile) {
        throw new Error('The selected site did not produce a profile draft.')
      }
      setEnrichmentDrafts((current) => ({ ...current, [profile.companyId]: result.profile! }))
    } catch (error) {
      setEnrichmentErrors((current) => ({
        ...current,
        [profile.companyId]: error instanceof Error ? error.message : String(error),
      }))
    } finally {
      setEnrichmentStatus(null)
      setIsEnriching(false)
    }
  }

  const [editingDrafts, setEditingDrafts] = useState<Record<string, boolean>>({})

  const getOrCreateDraft = (profile: (typeof profiles)[number]): EnrichedCompanyProfile => {
    if (enrichmentDrafts[profile.companyId]) {
      return enrichmentDrafts[profile.companyId]
    }
    const cached = getCachedEnrichment(profile.name)
    if (cached) return cached
    return {
      companyName: profile.name,
      websiteUrl: profile.website || '',
      resolvedVia: 'search-discovery',
      hqLocation: profile.country || '',
      operatingCountries: profile.countries || (profile.country ? [profile.country] : []),
      isMultiJurisdiction: (profile.countries?.length ?? 0) > 1,
      sectors: profile.sector ? profile.sector.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean) : [],
      capabilities: profile.capabilities ? [...profile.capabilities] : [],
      entityType: profile.companyType || 'commercial',
      summary: profile.description || '',
      foundedYear: profile.foundedYear ?? null,
      customNotes: '',
      evidence: [],
    }
  }

  const startEditingProfile = (profile: (typeof profiles)[number]) => {
    const draft = getOrCreateDraft(profile)
    setEnrichmentDrafts((current) => ({ ...current, [profile.companyId]: draft }))
    setEditingDrafts((current) => ({ ...current, [profile.companyId]: true }))
  }

  const cancelEditingProfile = (companyId: string) => {
    setEditingDrafts((current) => {
      const next = { ...current }
      delete next[companyId]
      return next
    })
  }

  const updateDraft = (companyId: string, updates: Partial<EnrichedCompanyProfile>) => {
    setEnrichmentDrafts((current) => {
      const existing = current[companyId]
      if (!existing) return current
      return {
        ...current,
        [companyId]: {
          ...existing,
          ...updates,
        },
      }
    })
  }

  const saveEditedProfile = (profile: (typeof profiles)[number]) => {
    const draft = enrichmentDrafts[profile.companyId]
    if (!draft) return
    try {
      saveCachedEnrichment(draft)
      setEditingDrafts((current) => {
        const next = { ...current }
        delete next[profile.companyId]
        return next
      })
      setEnrichmentVersion((v) => v + 1)
      setEnrichmentStatus(`${profile.name}'s verified intelligence was saved in browser storage. Ready for discovery!`)
    } catch (error) {
      setEnrichmentErrors((current) => ({
        ...current,
        [profile.companyId]: `Could not save profile: ${error instanceof Error ? error.message : String(error)}`,
      }))
    }
  }

  const confirmEnrichment = (profile: (typeof profiles)[number]) => {
    const draft = enrichmentDrafts[profile.companyId] ?? getCachedEnrichment(profile.name)
    if (!draft) return
    try {
      saveCachedEnrichment(draft)
      setEnrichmentDrafts((current) => {
        const next = { ...current }
        delete next[profile.companyId]
        return next
      })
      setEditingDrafts((current) => {
        const next = { ...current }
        delete next[profile.companyId]
        return next
      })
      setWebsiteCandidates((current) => {
        const next = { ...current }
        delete next[profile.companyId]
        return next
      })
      setEnrichmentVersion((version) => version + 1)
      setEnrichmentStatus(`${profile.name}'s reviewed profile was saved in this browser. Discover opportunities to use it.`)
    } catch (error) {
      setEnrichmentErrors((current) => ({
        ...current,
        [profile.companyId]: `Could not save the reviewed profile: ${error instanceof Error ? error.message : String(error)}`,
      }))
    }
  }

  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [discoveryScope, setDiscoveryScope] = useState<'all' | 'grants' | 'rfps' | 'us-federal' | 'india-all' | 'india-grants' | 'india-rfps'>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards')
  const [search, setSearch] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState<'all' | 'funding' | 'procurement'>('all')
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'fit' | 'title' | 'deadline'>('fit')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(0)

  const opportunityGroups = useMemo(
    () => groupTargetRecommendations(results.flatMap((result) => result.recommendations)),
    [results],
  )

  const assessments = useMemo(
    () => opportunityGroups.flatMap((group) => group.assessments),
    [opportunityGroups],
  )

  const leads = useMemo(
    () => assessments.filter((item) => item.outcome === 'relevant' || item.outcome === 'potentially_relevant').length,
    [assessments],
  )

  const needsReviewCount = useMemo(
    () => assessments.filter((item) => item.outcome !== 'not_relevant').length,
    [assessments],
  )

  const closingSoonCount = useMemo(() => {
    const now = Date.now()
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    return opportunityGroups.filter((group) => {
      const deadline = group.assessments[0]?.deadline
      if (!deadline) return false
      const dt = new Date(deadline)
      if (isNaN(dt.getTime())) return false
      const diff = dt.getTime() - now
      return diff > 0 && diff <= thirtyDaysMs
    }).length
  }, [opportunityGroups])

  const sourceErrors = useMemo(
    () =>
      results.flatMap((result) =>
        (result.sourceResults ?? []).flatMap((source) =>
          (source.errors ?? []).map((message) => ({
            source: source.source,
            message,
          })),
        ),
      ),
    [results],
  )

  const availableCompanies = useMemo(() => {
    const names = new Set<string>()
    assessments.forEach((a) => names.add(a.companyName))
    return Array.from(names).sort()
  }, [assessments])

  const availableSources = useMemo(() => {
    const set = new Set<string>()
    opportunityGroups.forEach((g) => {
      if (g.source) set.add(g.source)
    })
    return [...set].sort()
  }, [opportunityGroups])

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()
    return opportunityGroups
      .filter((group) => {
        if (typeFilter !== 'all' && group.opportunityType !== typeFilter) return false
        if (outcomeFilter !== 'all' && !group.assessments.some((a) => a.outcome === outcomeFilter)) return false
        if (companyFilter !== 'all' && !group.assessments.some((a) => a.companyName === companyFilter)) return false
        if (sourceFilter !== 'all' && group.source !== sourceFilter) return false
        if (!query) return true
        return (
          group.opportunityTitle.toLowerCase().includes(query) ||
          group.source.toLowerCase().includes(query) ||
          formatFriendlySourceName(group.source).toLowerCase().includes(query) ||
          group.assessments.some(
            (assessment) =>
              assessment.companyName.toLowerCase().includes(query) ||
              assessment.reasons.some((r) => r.toLowerCase().includes(query)),
          )
        )
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return a.opportunityTitle.localeCompare(b.opportunityTitle)
        }
        if (sortBy === 'deadline') {
          const dateA = a.assessments?.[0]?.deadline ? new Date(a.assessments[0].deadline).getTime() : 0
          const dateB = b.assessments?.[0]?.deadline ? new Date(b.assessments[0].deadline).getTime() : 0
          return dateA - dateB
        }
        // sort by max score
        const maxA = Math.max(...(a.assessments ?? []).map((item) => (typeof item?.score === 'number' ? item.score : 0)), 0)
        const maxB = Math.max(...(b.assessments ?? []).map((item) => (typeof item?.score === 'number' ? item.score : 0)), 0)
        return maxB - maxA
      })
  }, [opportunityGroups, search, typeFilter, outcomeFilter, companyFilter, sourceFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paginatedGroups = useMemo(() => {
    const start = safePage * pageSize
    return filteredGroups.slice(start, start + pageSize)
  }, [filteredGroups, safePage, pageSize])

  const run = async (overrideScope?: 'all' | 'grants' | 'rfps' | 'us-federal' | 'india-all' | 'india-grants' | 'india-rfps') => {
    if (running || profiles.length === 0) return
    const activeScope = overrideScope || discoveryScope
    setRunning(true)
    setRunError(null)
    try {
      const runTime = new Date().toISOString()
      const existingRuns = loadPersistedRuns()
      let counter = existingRuns.length + 1
      let currentRunId = `RUN-LIVE-${String(counter).padStart(4, '0')}`
      while (existingRuns.some((r) => r.runId === currentRunId)) {
        counter++
        currentRunId = `RUN-LIVE-${String(counter).padStart(4, '0')}`
      }

      // Deduplicate query terms across all profiles so identical searches are only executed once
      const uniqueGrantsTerms = new Set<string>()
      const uniqueEuTerms = new Set<string>()
      const uniqueTedTerms = new Set<string>()
      const uniqueGemTerms = new Set<string>()
      const uniqueIndiaGrantsTerms = new Set<string>()
      const uniqueWorldBankTerms = new Set<string>()
      const uniqueSamTerms = new Set<string>()
      const uniqueSbirTerms = new Set<string>()
      const uniqueChallengeTerms = new Set<string>()
      const uniqueStartupIndiaTerms = new Set<string>()
      const uniqueThubTerms = new Set<string>()
      const uniqueIcreateTerms = new Set<string>()

      for (const profile of profiles) {
        const queries = buildCompanyDiscoveryQueries(profile)
        const terms = [...new Set(queries.map((q) => q.term))]
        for (const term of terms) {
          const trimmed = term.trim()
          if (trimmed === '') continue
          if (activeScope === 'rfps' || activeScope === 'all') {
            uniqueTedTerms.add(trimmed)
            uniqueWorldBankTerms.add(trimmed)
            uniqueSamTerms.add(trimmed)
          }
          if (activeScope === 'grants' || activeScope === 'all') {
            uniqueGrantsTerms.add(trimmed)
            uniqueEuTerms.add(trimmed)
            uniqueSbirTerms.add(trimmed)
            uniqueChallengeTerms.add(trimmed)
          }
          if (activeScope === 'india-rfps' || activeScope === 'india-all' || activeScope === 'all') {
            uniqueGemTerms.add(trimmed)
          }
          if (activeScope === 'india-grants' || activeScope === 'india-all' || activeScope === 'all') {
            uniqueIndiaGrantsTerms.add(trimmed)
            uniqueStartupIndiaTerms.add(trimmed)
            uniqueThubTerms.add(trimmed)
            uniqueIcreateTerms.add(trimmed)
          }
          if (activeScope === 'us-federal') {
            uniqueSamTerms.add(trimmed)
            uniqueSbirTerms.add(trimmed)
            uniqueChallengeTerms.add(trimmed)
            uniqueGrantsTerms.add(trimmed)
          }
        }
      }

      const grantsCache = new Map<string, Promise<GrantsGovBridgeSearchResponse>>()
      const euCache = new Map<string, Promise<EuSediaBridgeSearchResponse>>()
      const tedCache = new Map<string, Promise<TedBridgeSearchResponse>>()

      const grantsRequester = (term: string): Promise<GrantsGovBridgeSearchResponse> => {
        const key = term.trim().toLowerCase()
        const cached = grantsCache.get(key)
        if (cached) return cached
        const promise: Promise<GrantsGovBridgeSearchResponse> = (async (): Promise<GrantsGovBridgeSearchResponse> => {
          try {
            const executeSearch = () =>
              fetch(resolveBridgeUrl(GRANTS_GOV_BRIDGE_SEARCH_PATH), {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  runId: currentRunId,
                  companyId: 'target-discovery',
                  keyword: term.trim(),
                  oppStatuses: 'posted',
                  limit: 100,
                  requestedAt: new Date().toISOString(),
                }),
              })

            let response = await executeSearch()
            if (response.status === 503) {
              // Retry once after server concurrency slot frees up
              await new Promise((resolve) => setTimeout(resolve, 800))
              response = await executeSearch()
            }
            const rawText = await response.text()
            let data: (GrantsGovBridgeSearchResponse & { error?: { code?: string; message?: string } }) | null = null
            try {
              data = JSON.parse(rawText)
            } catch {
              return {
                ok: false as const,
                status: response.status || 502,
                body: null,
                errors: [{ code: 'invalid_response', message: `Grants.gov bridge returned HTTP ${response.status} with non-JSON response (check backend status)` }],
              }
            }
            if (!data || !data.ok) {
              const resObj = data as { errors?: readonly { code?: string; message?: string }[]; error?: { code?: string; message?: string } } | null
              const errs = Array.isArray(resObj?.errors)
                ? resObj.errors
                : resObj?.error
                  ? [{ code: resObj.error.code ?? 'bridge_error', message: resObj.error.message ?? 'Grants.gov bridge request failed' }]
                  : [{ code: 'http_error', message: `HTTP ${data?.status ?? response.status} from Grants.gov bridge` }]
              return { ok: false as const, status: data?.status ?? response.status, body: null, errors: errs }
            }
            return data
          } catch (error) {
            return {
              ok: false as const,
              status: 500,
              body: null,
              errors: [{ code: 'network_error', message: error instanceof Error ? error.message : String(error) }],
            }
          }
        })()
        grantsCache.set(key, promise)
        return promise
      }

      const euRequester = (term: string): Promise<EuSediaBridgeSearchResponse> => {
        const key = term.trim().toLowerCase()
        const cached = euCache.get(key)
        if (cached) return cached
        const promise: Promise<EuSediaBridgeSearchResponse> = (async (): Promise<EuSediaBridgeSearchResponse> => {
          try {
            const response = await fetch(resolveBridgeUrl(EU_SEDIA_BRIDGE_SEARCH_PATH), {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                runId: currentRunId,
                companyId: 'target-discovery',
                keyword: term.trim(),
                limit: 100,
                requestedAt: new Date().toISOString(),
              }),
            })
            const rawText = await response.text()
            let data: (EuSediaBridgeSearchResponse & { error?: { code?: string; message?: string } }) | null = null
            try {
              data = JSON.parse(rawText)
            } catch {
              return {
                ok: false as const,
                status: response.status || 502,
                body: null,
                errors: [{ code: 'invalid_response', message: `EU SEDIA bridge returned HTTP ${response.status} with non-JSON response (check backend status)` }],
              }
            }
            if (!data || !data.ok) {
              const resObj = data as { errors?: readonly { code?: string; message?: string }[]; error?: { code?: string; message?: string } } | null
              const errs = Array.isArray(resObj?.errors)
                ? resObj.errors
                : resObj?.error
                  ? [{ code: resObj.error.code ?? 'bridge_error', message: resObj.error.message ?? 'EU SEDIA bridge request failed' }]
                  : [{ code: 'http_error', message: `HTTP ${data?.status ?? response.status} from EU SEDIA bridge` }]
              return { ok: false as const, status: data?.status ?? response.status, body: null, errors: errs }
            }
            return data
          } catch (error) {
            return {
              ok: false as const,
              status: 500,
              body: null,
              errors: [{ code: 'network_error', message: error instanceof Error ? error.message : String(error) }],
            }
          }
        })()
        euCache.set(key, promise)
        return promise
      }

      const tedRequester = (term: string): Promise<TedBridgeSearchResponse> => {
        const key = term.trim().toLowerCase()
        const cached = tedCache.get(key)
        if (cached) return cached
        const promise: Promise<TedBridgeSearchResponse> = (async (): Promise<TedBridgeSearchResponse> => {
          try {
            const publishedSince = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10)
              .replace(/-/g, '')
            const response = await fetch(resolveBridgeUrl(TED_BRIDGE_SEARCH_PATH), {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                runId: currentRunId,
                companyId: 'target-discovery',
                keyword: term.trim(),
                publishedSince,
                limit: 100,
                requestedAt: new Date().toISOString(),
              }),
            })
            const rawText = await response.text()
            let data: (TedBridgeSearchResponse & { error?: { code?: string; message?: string } }) | null = null
            try {
              data = JSON.parse(rawText)
            } catch {
              return {
                ok: false as const,
                status: response.status || 502,
                body: null,
                errors: [{ code: 'invalid_response', message: `TED bridge returned HTTP ${response.status} with non-JSON response` }],
              }
            }
            if (!data || !data.ok || (typeof data.status === 'number' && data.status >= 400)) {
              const resObj = data as { errors?: readonly { code?: string; message?: string }[]; error?: { code?: string; message?: string } } | null
              const errs = Array.isArray(resObj?.errors) && resObj.errors.length > 0
                ? resObj.errors.map((e) => ({ code: e.code ?? 'bridge_error', message: e.message ?? 'TED bridge request failed' }))
                : resObj?.error
                  ? [{ code: resObj.error.code ?? 'bridge_error', message: resObj.error.message ?? 'TED bridge request failed' }]
                  : [{ code: 'http_error', message: `HTTP ${data?.status ?? response.status} from TED bridge` }]
              return { ok: false as const, status: data?.status ?? response.status, body: null, errors: errs }
            }
            if (typeof data.body === 'string' && data.body.trim().startsWith('<')) {
              return {
                ok: false as const,
                status: data.status || 502,
                body: null,
                errors: [{ code: 'invalid_response', message: 'TED source returned HTML error page instead of JSON' }],
              }
            }
            return data
          } catch (error) {
            return {
              ok: false as const,
              status: 500,
              body: null,
              errors: [{ code: 'network_error', message: error instanceof Error ? error.message : String(error) }],
            }
          }
        })()
        tedCache.set(key, promise)
        return promise
      }

      async function requestWithFallback<TReq, TRes extends { ok: boolean }>(
        path: string,
        payload: TReq,
        fallbackHandler: (req: TReq) => Promise<{ httpStatus: number; body: TRes }>,
      ): Promise<TRes> {
        try {
          const response = await fetch(resolveBridgeUrl(path), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (response.ok) {
            const rawText = await response.text()
            try {
              const data = JSON.parse(rawText) as TRes
              if (data && data.ok) {
                return data
              }
            } catch {
              // Non-JSON response, fallback
            }
          }
        } catch {
          // Network failure or sleeping Render container, fallback
        }
        try {
          const local = await fallbackHandler(payload)
          return local.body
        } catch (err) {
          return {
            ok: false,
            status: 500,
            body: null,
            errors: [{ code: 'fallback_error', message: err instanceof Error ? err.message : String(err) }],
          } as unknown as TRes
        }
      }

      const gemCache = new Map<string, Promise<GemBridgeSearchResponse>>()
      const gemRequester = (term: string): Promise<GemBridgeSearchResponse> => {
        const key = term.trim().toLowerCase()
        const cached = gemCache.get(key)
        if (cached) return cached
        const promise = requestWithFallback(
          GEM_BRIDGE_SEARCH_PATH,
          {
            runId: currentRunId,
            companyId: 'target-discovery',
            keyword: term.trim(),
            limit: 100,
            requestedAt: new Date().toISOString(),
          },
          handleGemBridge,
        )
        gemCache.set(key, promise)
        return promise
      }

      const indiaGrantsCache = new Map<string, Promise<IndiaGrantsBridgeSearchResponse>>()
      const indiaGrantsRequester = (term: string): Promise<IndiaGrantsBridgeSearchResponse> => {
        const key = term.trim().toLowerCase()
        const cached = indiaGrantsCache.get(key)
        if (cached) return cached
        const promise = requestWithFallback(
          INDIA_GRANTS_BRIDGE_SEARCH_PATH,
          {
            runId: currentRunId,
            companyId: 'target-discovery',
            keyword: term.trim(),
            limit: 100,
            requestedAt: new Date().toISOString(),
          },
          handleIndiaGrantsBridge,
        )
        indiaGrantsCache.set(key, promise)
        return promise
      }

      const worldBankCache = new Map<string, Promise<WorldBankBridgeSearchResponse>>()
      const worldBankRequester = (term: string): Promise<WorldBankBridgeSearchResponse> => {
        const key = term.trim().toLowerCase()
        const cached = worldBankCache.get(key)
        if (cached) return cached
        const promise = requestWithFallback(
          WORLDBANK_BRIDGE_SEARCH_PATH,
          {
            runId: currentRunId,
            companyId: 'target-discovery',
            keyword: term.trim(),
            limit: 100,
            requestedAt: new Date().toISOString(),
          },
          handleWorldBankBridge,
        )
        worldBankCache.set(key, promise)
        return promise
      }

      const samCache = new Map<string, Promise<SamBridgeSearchResponse>>()
      const samRequester = (term: string): Promise<SamBridgeSearchResponse> => {
        const key = term.trim().toLowerCase()
        const cached = samCache.get(key)
        if (cached) return cached
        const promise = requestWithFallback(
          SAM_BRIDGE_SEARCH_PATH,
          {
            runId: currentRunId,
            companyId: 'target-discovery',
            keyword: term.trim(),
            limit: 100,
            requestedAt: new Date().toISOString(),
          },
          handleSamBridge,
        )
        samCache.set(key, promise)
        return promise
      }

      const sbirCache = new Map<string, Promise<SbirBridgeSearchResponse>>()
      const sbirRequester = (term: string): Promise<SbirBridgeSearchResponse> => {
        const key = term.trim().toLowerCase()
        const cached = sbirCache.get(key)
        if (cached) return cached
        const promise = requestWithFallback(
          SBIR_BRIDGE_SEARCH_PATH,
          {
            runId: currentRunId,
            companyId: 'target-discovery',
            keyword: term.trim(),
            limit: 100,
            requestedAt: new Date().toISOString(),
          },
          handleSbirBridge,
        )
        sbirCache.set(key, promise)
        return promise
      }

      const challengeCache = new Map<string, Promise<ChallengeBridgeSearchResponse>>()
      const challengeRequester = (term: string): Promise<ChallengeBridgeSearchResponse> => {
        const key = term.trim().toLowerCase()
        const cached = challengeCache.get(key)
        if (cached) return cached
        const promise = requestWithFallback(
          CHALLENGE_BRIDGE_SEARCH_PATH,
          {
            runId: currentRunId,
            companyId: 'target-discovery',
            keyword: term.trim(),
            limit: 100,
            requestedAt: new Date().toISOString(),
          },
          handleChallengeBridge,
        )
        challengeCache.set(key, promise)
        return promise
      }

      const startupIndiaCache = new Map<string, Promise<StartupIndiaBridgeSearchResponse>>()
      const startupIndiaRequester = (term: string): Promise<StartupIndiaBridgeSearchResponse> => {
        const key = term.trim().toLowerCase()
        const cached = startupIndiaCache.get(key)
        if (cached) return cached
        const promise = requestWithFallback(
          STARTUP_INDIA_BRIDGE_SEARCH_PATH,
          {
            runId: currentRunId,
            companyId: 'target-discovery',
            keyword: term.trim(),
            limit: 100,
            requestedAt: new Date().toISOString(),
          },
          handleStartupIndiaBridge,
        )
        startupIndiaCache.set(key, promise)
        return promise
      }

      const thubCache = new Map<string, Promise<ThubBridgeSearchResponse>>()
      const thubRequester = (term: string): Promise<ThubBridgeSearchResponse> => {
        const key = term.trim().toLowerCase()
        const cached = thubCache.get(key)
        if (cached) return cached
        const promise = requestWithFallback(
          THUB_BRIDGE_SEARCH_PATH,
          {
            runId: currentRunId,
            companyId: 'target-discovery',
            keyword: term.trim(),
            limit: 100,
            requestedAt: new Date().toISOString(),
          },
          handleThubBridge,
        )
        thubCache.set(key, promise)
        return promise
      }

      const icreateCache = new Map<string, Promise<IcreateBridgeSearchResponse>>()
      const icreateRequester = (term: string): Promise<IcreateBridgeSearchResponse> => {
        const key = term.trim().toLowerCase()
        const cached = icreateCache.get(key)
        if (cached) return cached
        const promise = requestWithFallback(
          ICREATE_BRIDGE_SEARCH_PATH,
          {
            runId: currentRunId,
            companyId: 'target-discovery',
            keyword: term.trim(),
            limit: 100,
            requestedAt: new Date().toISOString(),
          },
          handleIcreateBridge,
        )
        icreateCache.set(key, promise)
        return promise
      }

      // Pre-warm unique searches:
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

      // 1. Grants.gov queries run sequentially with a slight pause to respect server concurrency bounds
      for (const term of uniqueGrantsTerms) {
        await grantsRequester(term)
        await delay(150)
      }

      // 2. TED Procurement queries run sequentially with backoff to avoid triggering the EU TED 429 rate limit
      for (const term of uniqueTedTerms) {
        await tedRequester(term)
        await delay(350)
      }

      // 3. EU SEDIA queries run sequentially to avoid gateway socket timeouts on ec.europa.eu
      for (const term of uniqueEuTerms) {
        await euRequester(term)
        await delay(350)
      }

      // 4. GeM India Procurement queries
      for (const term of uniqueGemTerms) {
        await gemRequester(term)
        await delay(50)
      }

      // 5. India Innovation Grants queries
      for (const term of uniqueIndiaGrantsTerms) {
        await indiaGrantsRequester(term)
        await delay(50)
      }

      // 6. World Bank & Multilateral Procurement queries
      for (const term of uniqueWorldBankTerms) {
        await worldBankRequester(term)
        await delay(50)
      }

      // 7. SAM.gov Federal Solicitations queries
      for (const term of uniqueSamTerms) {
        await samRequester(term)
        await delay(50)
      }

      // 8. SBIR.gov Federal Innovation Grants queries
      for (const term of uniqueSbirTerms) {
        await sbirRequester(term)
        await delay(50)
      }

      // 9. Challenge.gov Competitions queries
      for (const term of uniqueChallengeTerms) {
        await challengeRequester(term)
        await delay(50)
      }

      // 10. Startup India Seed Fund queries
      for (const term of uniqueStartupIndiaTerms) {
        await startupIndiaRequester(term)
        await delay(50)
      }

      // 11. T-Hub Innovation Accelerators queries
      for (const term of uniqueThubTerms) {
        await thubRequester(term)
        await delay(50)
      }

      // 12. iCreate Prototyping Grants queries
      for (const term of uniqueIcreateTerms) {
        await icreateRequester(term)
        await delay(50)
      }

      const nextResults: TargetCompanyLiveDiscoveryResult[] = []
      for (const profile of profiles) {
        if (activeScope === 'us-federal') {
          const samRes = await runTargetCompanySamDiscovery(profile, samRequester)
          const sbirRes = await runTargetCompanySbirDiscovery(profile, sbirRequester)
          const challengeRes = await runTargetCompanyChallengeDiscovery(profile, challengeRequester)
          const grantsRes = await runTargetCompanyGrantsGovDiscovery(profile, grantsRequester)
          nextResults.push(mergeDiscoveryResults(profile, [samRes, sbirRes, challengeRes, grantsRes]))
        } else if (activeScope === 'india-all') {
          const gemRes = await runTargetCompanyGemDiscovery(profile, gemRequester)
          const igRes = await runTargetCompanyIndiaGrantsDiscovery(profile, indiaGrantsRequester)
          const siRes = await runTargetCompanyStartupIndiaDiscovery(profile, startupIndiaRequester)
          const thubRes = await runTargetCompanyThubDiscovery(profile, thubRequester)
          const icreateRes = await runTargetCompanyIcreateDiscovery(profile, icreateRequester)
          nextResults.push(mergeDiscoveryResults(profile, [gemRes, igRes, siRes, thubRes, icreateRes]))
        } else if (activeScope === 'india-grants') {
          const igResult = await runTargetCompanyIndiaGrantsDiscovery(profile, indiaGrantsRequester)
          const siResult = await runTargetCompanyStartupIndiaDiscovery(profile, startupIndiaRequester)
          const thubResult = await runTargetCompanyThubDiscovery(profile, thubRequester)
          const icResult = await runTargetCompanyIcreateDiscovery(profile, icreateRequester)
          nextResults.push(mergeDiscoveryResults(profile, [igResult, siResult, thubResult, icResult]))
        } else if (activeScope === 'india-rfps') {
          const gemResult = await runTargetCompanyGemDiscovery(profile, gemRequester)
          nextResults.push(gemResult)
        } else if (activeScope === 'rfps') {
          const tedResult = await runTargetCompanyTedDiscovery(profile, tedRequester)
          const wbResult = await runTargetCompanyWorldBankDiscovery(profile, worldBankRequester)
          const samResult = await runTargetCompanySamDiscovery(profile, samRequester)
          nextResults.push(mergeDiscoveryResults(profile, [tedResult, wbResult, samResult]))
        } else if (activeScope === 'grants') {
          const grantsResult = await runTargetCompanyDiscovery(profile, grantsRequester, euRequester)
          const sbirResult = await runTargetCompanySbirDiscovery(profile, sbirRequester)
          const challengeResult = await runTargetCompanyChallengeDiscovery(profile, challengeRequester)
          nextResults.push(mergeDiscoveryResults(profile, [grantsResult, sbirResult, challengeResult]))
        } else {
          // 'all' — search live feeds and report disabled connectors as source errors.
          const grantsResult = await runTargetCompanyDiscovery(profile, grantsRequester, euRequester)
          const tedResult = await runTargetCompanyTedDiscovery(profile, tedRequester)
          const gemResult = await runTargetCompanyGemDiscovery(profile, gemRequester)
          const igResult = await runTargetCompanyIndiaGrantsDiscovery(profile, indiaGrantsRequester)
          const wbResult = await runTargetCompanyWorldBankDiscovery(profile, worldBankRequester)
          const samResult = await runTargetCompanySamDiscovery(profile, samRequester)
          const sbirResult = await runTargetCompanySbirDiscovery(profile, sbirRequester)
          const challengeResult = await runTargetCompanyChallengeDiscovery(profile, challengeRequester)
          const siResult = await runTargetCompanyStartupIndiaDiscovery(profile, startupIndiaRequester)
          const thubResult = await runTargetCompanyThubDiscovery(profile, thubRequester)
          const icreateResult = await runTargetCompanyIcreateDiscovery(profile, icreateRequester)
          nextResults.push(
            mergeDiscoveryResults(profile, [
              grantsResult,
              tedResult,
              gemResult,
              igResult,
              wbResult,
              samResult,
              sbirResult,
              challengeResult,
              siResult,
              thubResult,
              icreateResult,
            ])
          )
        }
      }
      setResults(nextResults)
      saveCachedResults(nextResults)

      // Persist run outcome to session history and logs
      const allRecords = nextResults.flatMap((r) => r.records ?? [])
      const allSourceResults = nextResults.flatMap((r) => r.sourceResults ?? [])
      const allRecommendations = nextResults.flatMap((r) => r.recommendations ?? [])
      const hasErrors = nextResults.some(
        (r) => (r.errors?.length ?? 0) > 0 || (r.sourceResults ?? []).some((s) => (s.errors?.length ?? 0) > 0),
      )

      // Build DiscoveryCandidates and ReviewItems for human review
      const candidatesNeedingReview = syncRecommendationsToReviewQueue(nextResults, currentRunId, runTime)

      const companyResults: DiscoveryCompanyResult[] = nextResults.map((r) => {
        const compRecs = (r.records ?? []).length
        const compErrors = (r.errors ?? []).length
        const compNeedsReview = (r.recommendations ?? []).filter((rec) => rec.outcome !== 'not_relevant').length
        const compName = r.profile.name || r.profile.companyId
        const srcResults = r.sourceResults ?? []
        return {
          companyId: compName,
          domain: activeScope === 'rfps' || activeScope === 'india-rfps' ? 'procurement' : 'funding',
          runId: currentRunId,
          requestedAt: runTime,
          completedAt: new Date().toISOString(),
          scenario: 'live',
          outcome: compErrors > 0 ? (compRecs > 0 ? 'PARTIAL' : 'FAILED') : compRecs === 0 ? 'NO_RESULTS' : 'SUCCESS',
          counts: {
            totalSources: srcResults.length,
            candidatesReceived: srcResults.reduce((sum, s) => sum + (s.recordCount ?? 0), 0),
            candidatesCreated: compRecs,
            candidatesRequiringReview: compNeedsReview,
            duplicates: 0,
            blockedSources: 0,
            failedSources: compErrors > 0 ? 1 : 0,
          },
          needsReview: compNeedsReview,
          sourceResults: srcResults.map((s) => ({
            sourceId:
              s.source === 'grantsgov'
                ? 'SU-GRANTS-001'
                : s.source === 'eu-sedia'
                  ? 'SU-EU-SEDIA-001'
                  : s.source === 'ted'
                    ? 'SU-TED-001'
                    : s.source === 'gem'
                      ? 'SU-GEM-001'
                      : s.source === 'india-grants'
                        ? 'SU-INDIA-GRANTS-001'
                        : 'SU-WORLDBANK-001',
            sourceName:
              s.source === 'grantsgov'
                ? 'Grants.gov'
                : s.source === 'eu-sedia'
                  ? 'EU SEDIA'
                  : s.source === 'ted'
                    ? 'TED Procurement'
                    : s.source === 'gem'
                      ? 'GeM & CPPP India'
                      : s.source === 'india-grants'
                        ? 'MeitY & iDEX Innovation Grants'
                        : 'World Bank Procurement',
            adapterType: s.source,
            domain: s.source === 'ted' || s.source === 'gem' || s.source === 'worldbank' ? 'procurement' : 'funding',
            accessState: 'AVAILABLE' as const,
            outcome: (s.errors?.length ?? 0) > 0 ? ((s.recordCount ?? 0) > 0 ? 'PARTIAL' : 'FAILED') : (s.recordCount ?? 0) === 0 ? 'NO_RESULTS' : 'SUCCESS',
            requestedAt: runTime,
            observedAt: runTime,
            candidatesReceived: s.recordCount ?? 0,
            candidatesCreated: s.recordCount ?? 0,
            candidatesRequiringReview: compNeedsReview,
            duplicates: 0,
            candidateIds: [],
            errors: [...(s.errors ?? [])],
            warnings: [],
          })),
          candidates: candidatesNeedingReview.filter((c) => c.companyId === compName),
        }
      })

      const runOutcome: DiscoveryRunOutcome = {
        runId: currentRunId,
        domain: discoveryScope === 'rfps' || discoveryScope === 'india-rfps' ? 'procurement' : 'funding',
        scenario: 'live',
        requestedAt: runTime,
        completedAt: new Date().toISOString(),
        companyIds: profiles.map((p) => p.name || p.companyId),
        companies: companyResults,
        counts: {
          totalSources: allSourceResults.length,
          candidatesReceived: allSourceResults.reduce((sum, s) => sum + (s.recordCount ?? 0), 0),
          candidatesCreated: allRecords.length,
          candidatesRequiringReview: allRecommendations.filter((rec) => rec.outcome !== 'not_relevant').length,
          duplicates: 0,
          blockedSources: 0,
          failedSources: nextResults.filter((r) => (r.errors?.length ?? 0) > 0).length,
        },
        needsReview: allRecommendations.filter((rec) => rec.outcome !== 'not_relevant').length,
        outcome: hasErrors ? (allRecords.length > 0 ? 'PARTIAL' : 'FAILED') : allRecords.length === 0 ? 'NO_RESULTS' : 'SUCCESS',
        reviewQueue: reviewFixtureStore.suppliedItems(),
        sector: 'all',
        keyword: search.trim(),
        location: 'all',
      }

      persistRunOutcome(runOutcome)
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error))
    } finally {
      setRunning(false)
    }
  }

  const toggleGroupExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const expandAll = () => {
    setExpandedKeys(new Set(opportunityGroups.map((g) => g.key)))
  }

  const collapseAll = () => {
    setExpandedKeys(new Set())
  }

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setOutcomeFilter('all')
    setCompanyFilter('all')
    setSourceFilter('all')
    setPage(0)
  }

  if (profiles.length === 0) {
    return (
      <div
        className="card sn-discovery-empty-card"
        style={{
          padding: '32px 24px',
          margin: '20px 0 28px',
          textAlign: 'center',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg, 12px)',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
        <div style={{ fontWeight: 700, fontSize: '16.5px', color: 'var(--text)', marginBottom: '6px' }}>
          Ready to Discover Opportunities
        </div>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '0 auto 16px', maxWidth: '540px', lineHeight: 1.5 }}>
          Upload a target company CSV above (1–50 companies) to search live Grants.gov, EU SEDIA, TED, and World Bank feeds. Other connectors are disabled until their live data can be verified.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '6px 16px', borderRadius: '999px', border: '1px solid var(--border)' }}>
          <span>💡 Tip:</span>
          <span>Click <strong>Browse your computer</strong> in the box above to load your company list.</span>
        </div>
      </div>
    )
  }

  const hasSourceErrors = sourceErrors.length > 0

  return (
    <section className="sn-discovery-workspace" aria-labelledby="target-live-discovery-heading" style={{ marginTop: '24px' }}>
      <div className="card sn-discovery-command-card" style={{ padding: '24px', marginBottom: '24px', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div>
            <h2 className="page__title page__title--sub" id="target-live-discovery-heading" style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              Target Company Live Discovery
            </h2>
            <p className="page__description" style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Searches live Grants.gov, EU SEDIA, TED, and World Bank feeds against {profiles.length} imported company profiles. Unverified connectors are disabled; past-deadline or undated opportunities without an explicit open status are excluded. Verify each official notice and eligibility before applying.
            </p>
          </div>
          <span className="sn-tag sn-tag--accent" style={{ alignSelf: 'center', fontSize: '12px' }}>
            ● {profiles.length} Active Profiles
          </span>
        </div>

        {/* Main Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void run()}
            disabled={running || profiles.length === 0}
            style={{ padding: '9px 20px', fontWeight: 600 }}
          >
            {running ? 'Discovering opportunities...' : hasSourceErrors ? 'Retry discovery' : 'Discover Opportunities'}
          </button>

          <button
            type="button"
            className="btn btn--outline"
            onClick={handleAutoEnrich}
            disabled={running || isEnriching || profiles.length === 0}
            title="Search company websites and prepare source-linked profile drafts for your review"
            style={{ padding: '9px 16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {isEnriching ? '⚡ Researching companies...' : '⚡ Research company profiles'}
          </button>

          {/* Opportunity Scope Selector */}
          <label
            htmlFor="discovery-scope-select"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>Opportunity Scope:</span>
            <select
              id="discovery-scope-select"
              className="sn-select"
              value={discoveryScope}
              onChange={(e) => {
                const nextScope = e.target.value as 'all' | 'grants' | 'rfps' | 'us-federal' | 'india-all' | 'india-grants' | 'india-rfps'
                setDiscoveryScope(nextScope)
                void run(nextScope)
              }}
              disabled={running}
              aria-label="Opportunity Discovery Scope"
            >
              <option value="all">All feeds (Global Grants &amp; RFPs)</option>
              <option value="india-all">India opportunities (GeM / CPPP &amp; Innovation Grants)</option>
              <option value="us-federal">US federal (SAM.gov, Grants.gov, SBIR, Challenges)</option>
              <option value="india-grants">India grants (MeitY, STPI FinBlue, DST, State Funds)</option>
              <option value="india-rfps">India tenders (GeM &amp; Central PSU Procurements)</option>
              <option value="grants">Grants &amp; Innovation Funding (US, EU &amp; India)</option>
              <option value="rfps">RFPs &amp; Public Procurement (Tenders &amp; Contracts)</option>
            </select>
          </label>

          {results.length > 0 && leads > 0 ? (
            <LeadsDownloadMenu
              results={results}
              companyName={profiles[0]?.name}
              totalLeads={leads}
              disabled={running}
              variant="primary"
              idPrefix="action-bar"
            />
          ) : null}

          {running ? <span role="status" style={{ fontSize: '13px', color: 'var(--accent)' }}>Searching live sources &amp; assessing fit...</span> : null}
        </div>

        {enrichmentStatus ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginTop: '14px',
              padding: '10px 14px',
              background: 'var(--accent-subtle, rgba(0, 102, 204, 0.08))',
              border: '1px solid var(--accent, #0066cc)',
              borderRadius: 'var(--radius, 6px)',
              fontSize: '13px',
              color: 'var(--accent, #0066cc)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '15px' }}>⚡</span>
            <span>{enrichmentStatus}</span>
          </div>
        ) : null}

        <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
          Company names and selected website URLs are sent to the configured Firecrawl service for research. Search results are only candidates; extracted facts are not used until you review and confirm the profile.
        </p>
      </div>

      {profiles.length > 0 ? (
        <section
          aria-label="Company research review"
          className="card"
          style={{ padding: '20px', marginBottom: '20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Company Intelligence &amp; Research Review</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
                Auto-enrich with Firecrawl, adjust corporate facts, or paste your own analyst research notes into the text box below.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={handleAutoEnrich}
                disabled={running || isEnriching}
                style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                {isEnriching ? '⚡ Researching...' : '⚡ Auto-Enrich All via Firecrawl'}
              </button>
            </div>
          </div>

          {profiles.map((profile) => {
            const candidates = websiteCandidates[profile.companyId] ?? []
            const draft = enrichmentDrafts[profile.companyId] ?? getCachedEnrichment(profile.name)
            const isEditing = Boolean(editingDrafts[profile.companyId])
            const error = enrichmentErrors[profile.companyId]

            return (
              <article
                key={profile.companyId}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '14px',
                  background: 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600 }}>{profile.name}</h4>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {profile.website ? <span>Website: <a href={profile.website} target="_blank" rel="noreferrer">{profile.website}</a> | </span> : null}
                      <span>HQ: {profile.country || 'Unknown (edit below)'}</span>
                      {profile.countries && profile.countries.length > 0 ? <span> | Operating: {profile.countries.join(', ')}</span> : null}
                      {profile.foundedYear ? <span> | Est: {profile.foundedYear}</span> : null}
                      {profile.companyType ? <span> | Type: {profile.companyType}</span> : null}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!isEditing ? (
                      <>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          disabled={isEnriching}
                          onClick={() => startEditingProfile(profile)}
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                        >
                          ✏️ Edit Profile &amp; Notes
                        </button>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          disabled={isEnriching}
                          onClick={async () => {
                            try {
                              setIsEnriching(true)
                              setEnrichmentStatus(`Researching ${profile.name}...`)
                              const result = await requestCompanyEnrichment({ companyName: profile.name, websiteUrl: profile.website })
                              if (result.profile) {
                                setEnrichmentDrafts((curr) => ({ ...curr, [profile.companyId]: result.profile! }))
                              } else if (result.websiteCandidates && result.websiteCandidates.length > 0) {
                                setWebsiteCandidates((curr) => ({ ...curr, [profile.companyId]: result.websiteCandidates! }))
                              }
                            } catch (e) {
                              setEnrichmentErrors((curr) => ({ ...curr, [profile.companyId]: e instanceof Error ? e.message : String(e) }))
                            } finally {
                              setIsEnriching(false)
                              setEnrichmentStatus(null)
                            }
                          }}
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                        >
                          ⚡ Auto-Enrich
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {error ? <p role="alert" style={{ color: 'var(--error-text)', fontSize: '13px' }}>{error}</p> : null}

                {candidates.length > 0 ? (
                  <div style={{ marginBottom: '14px', padding: '12px', background: 'var(--surface-subtle)', borderRadius: '6px' }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '13px' }}>Possible websites found — select one to research:</p>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {candidates.map((cand) => (
                        <li key={cand.url} style={{ marginBottom: '8px', fontSize: '13px' }}>
                          <a href={cand.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>{cand.title || cand.url}</a>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cand.url}</div>
                          {cand.description ? <div style={{ fontSize: '12px', margin: '2px 0' }}>{cand.description}</div> : null}
                          <button
                            type="button"
                            className="btn btn--sm btn--outline"
                            style={{ marginTop: '4px', fontSize: '11px', padding: '3px 8px' }}
                            disabled={isEnriching}
                            onClick={() => void researchWebsiteCandidate(profile, cand)}
                          >
                            Research this website
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {isEditing && draft ? (
                  <div style={{ background: 'var(--surface-subtle, rgba(0,0,0,0.02))', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h5 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>Edit Company Information &amp; Custom Research</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>
                        Website URL
                        <input
                          type="text"
                          className="sn-input"
                          style={{ width: '100%', marginTop: '4px', padding: '6px 8px', fontSize: '13px' }}
                          value={draft.websiteUrl || ''}
                          onChange={(e) => updateDraft(profile.companyId, { websiteUrl: e.target.value })}
                          placeholder="https://example.com"
                        />
                      </label>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>
                        Established / Founded Year
                        <input
                          type="number"
                          className="sn-input"
                          style={{ width: '100%', marginTop: '4px', padding: '6px 8px', fontSize: '13px' }}
                          value={draft.foundedYear ?? ''}
                          onChange={(e) => updateDraft(profile.companyId, { foundedYear: e.target.value ? Number(e.target.value) : null })}
                          placeholder="e.g. 2000"
                        />
                      </label>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>
                        Headquarters Location / Country
                        <input
                          type="text"
                          className="sn-input"
                          style={{ width: '100%', marginTop: '4px', padding: '6px 8px', fontSize: '13px' }}
                          value={draft.hqLocation || ''}
                          onChange={(e) => updateDraft(profile.companyId, { hqLocation: e.target.value })}
                          placeholder="e.g. Bangalore, India"
                        />
                      </label>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>
                        Operating Countries (comma-separated)
                        <input
                          type="text"
                          className="sn-input"
                          style={{ width: '100%', marginTop: '4px', padding: '6px 8px', fontSize: '13px' }}
                          value={draft.operatingCountries?.join(', ') || ''}
                          onChange={(e) => updateDraft(profile.companyId, { operatingCountries: e.target.value.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) })}
                          placeholder="e.g. India, United States"
                        />
                      </label>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>
                        Entity Classification
                        <select
                          className="sn-select"
                          style={{ width: '100%', marginTop: '4px', padding: '6px 8px', fontSize: '13px' }}
                          value={draft.entityType || 'commercial'}
                          onChange={(e) => updateDraft(profile.companyId, { entityType: e.target.value })}
                        >
                          <option value="commercial">Commercial Enterprise (Established)</option>
                          <option value="startup">Early-Stage Startup</option>
                          <option value="sme">Small &amp; Medium Enterprise (SME)</option>
                          <option value="nonprofit">Non-Profit Organization</option>
                          <option value="higher_ed">Higher Education / University</option>
                        </select>
                      </label>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Industry Sectors (comma-separated)
                      </label>
                      <input
                        type="text"
                        className="sn-input"
                        style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
                        value={draft.sectors?.join(', ') || ''}
                        onChange={(e) => updateDraft(profile.companyId, { sectors: e.target.value.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) })}
                        placeholder="e.g. Software Services, Financial Services, Healthcare IT"
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Key Capabilities &amp; Technical Offerings (comma-separated)
                      </label>
                      <input
                        type="text"
                        className="sn-input"
                        style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
                        value={draft.capabilities?.join(', ') || ''}
                        onChange={(e) => updateDraft(profile.companyId, { capabilities: e.target.value.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) })}
                        placeholder="e.g. High-Frequency Trading, Trade Surveillance, FHIR Health APIs, Enterprise Cloud, Microservices"
                      />
                    </div>

                    {/* Long Text Box for Extracted Internet Intelligence */}
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        📝 Custom Extracted Intelligence &amp; Analyst Notes (Long Text Area)
                      </label>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        Paste any background, tech stack, client domains, or details you extracted from Google, LinkedIn, or corporate decks. These keywords are automatically extracted and merged into the live discovery engine.
                      </div>
                      <textarea
                        rows={6}
                        className="sn-input"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          fontFamily: 'inherit',
                          fontSize: '13px',
                          lineHeight: 1.5,
                          resize: 'vertical',
                          boxSizing: 'border-box',
                        }}
                        placeholder="Paste details here: e.g., Founded in 2000, Wissen Technology is an enterprise software consulting company with 1,500+ developers across Bangalore, Mumbai, Pune, and New Jersey. Specializes in low-latency high-frequency algorithmic trading systems, trade surveillance, market data feeds, FHIR electronic health record integrations, microservices, cloud migrations..."
                        value={draft.customNotes || ''}
                        onChange={(e) => updateDraft(profile.companyId, { customNotes: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => saveEditedProfile(profile)}
                        style={{ padding: '8px 16px', fontWeight: 600 }}
                      >
                        💾 Save &amp; Confirm Intelligence
                      </button>
                      <button
                        type="button"
                        className="btn btn--outline"
                        onClick={() => cancelEditingProfile(profile.companyId)}
                        style={{ padding: '8px 14px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : draft ? (
                  <div style={{ background: 'var(--surface-subtle, rgba(0,0,0,0.02))', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px', marginBottom: '10px' }}>
                      <p style={{ margin: 0 }}><strong>Website:</strong> <a href={draft.websiteUrl} target="_blank" rel="noreferrer">{draft.websiteUrl || 'Not set'}</a></p>
                      <p style={{ margin: 0 }}><strong>Established:</strong> {draft.foundedYear ? `${draft.foundedYear} (${new Date().getFullYear() - draft.foundedYear} yrs)` : 'Unknown'}</p>
                      <p style={{ margin: 0 }}><strong>Headquarters:</strong> {draft.hqLocation || 'Not set'}</p>
                      <p style={{ margin: 0 }}><strong>Operating:</strong> {draft.operatingCountries?.join(', ') || 'Not set'}</p>
                      <p style={{ margin: 0 }}><strong>Entity Type:</strong> {draft.entityType || 'Commercial'}</p>
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                      <strong>Sectors:</strong> {draft.sectors?.join(', ') || 'None specified'}
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                      <strong>Capabilities:</strong> {draft.capabilities?.join(', ') || 'None specified'}
                    </div>
                    {draft.customNotes ? (
                      <div style={{ marginTop: '10px', padding: '10px', background: 'var(--surface)', borderRadius: '6px', border: '1px dashed var(--border)' }}>
                        <strong style={{ fontSize: '12px', display: 'block', color: 'var(--accent)', marginBottom: '4px' }}>📝 Custom Extracted Intelligence Notes:</strong>
                        <p style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{draft.customNotes}</p>
                      </div>
                    ) : null}
                    {draft.evidence && draft.evidence.length > 0 ? (
                      <div style={{ marginTop: '10px', fontSize: '12px' }}>
                        <strong>Firecrawl Evidence:</strong>
                        <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                          {draft.evidence.map((item, index) => (
                            <li key={`${item.field}-${index}`} style={{ marginBottom: '4px' }}>
                              <span>{item.field}: <em>{item.value}</em></span>
                              {item.sourceUrl ? <span> — <a href={item.sourceUrl} target="_blank" rel="noreferrer">source</a></span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn--sm btn--primary"
                        onClick={() => confirmEnrichment(profile)}
                        style={{ padding: '6px 12px', fontWeight: 600 }}
                      >
                        ✓ Confirm &amp; Save Profile
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--outline"
                        onClick={() => startEditingProfile(profile)}
                        style={{ padding: '6px 12px' }}
                      >
                        ✏️ Edit Facts or Notes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    No research recorded yet. Click <strong>⚡ Auto-Enrich</strong> to fetch via Firecrawl, or <strong>✏️ Edit Profile &amp; Notes</strong> to paste facts directly into the long text box.
                  </div>
                )}
              </article>
            )
          })}
        </section>
      ) : null}

      {runError !== null ? (
        <div role="alert" className="empty" style={{ borderColor: 'var(--error-border)', background: 'var(--error-bg)', marginBottom: '16px' }}>
          <p className="empty__headline" style={{ color: 'var(--error-text)' }}>
            Discovery could not complete
          </p>
          <p className="empty__body" style={{ color: 'var(--error-text)' }}>
            {runError}
          </p>
        </div>
      ) : null}

      {sourceErrors.length > 0 ? (
        <div
          role="alert"
          aria-label="Discovery source errors"
          style={{
            background: 'var(--warn-bg)',
            border: '1px solid var(--warn-border)',
            borderRadius: 'var(--radius)',
            padding: '14px 18px',
            marginBottom: '20px',
            color: 'var(--warn-text)',
          }}
        >
          <strong style={{ fontSize: '14px' }}>Some discovery sources did not complete successfully:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '13px' }}>
            {sourceErrors.map(({ source, message }, index) => (
              <li key={`${source}-${index}`}>
                <strong>
                  {source === 'grantsgov'
                    ? 'Grants.gov'
                    : source === 'eu-sedia'
                      ? 'EU Funding & Tenders'
                      : source === 'ted'
                        ? 'TED Procurement'
                        : source === 'gem'
                          ? 'GeM & CPPP India'
                          : source === 'india-grants'
                            ? 'MeitY / iDEX Innovation Grants'
                            : 'World Bank'}
                  :
                </strong>{' '}
                {message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Data Summary Area */}
      {results.length > 0 ? (
        <>
          <p className="visually-hidden">
            Opportunities: {opportunityGroups.length} · Evaluations: {assessments.length} · Potential leads: {leads}
          </p>

          <div className="sn-overview-grid">
            <div className="sn-stat-card">
              <div className="sn-stat-card__header">
                <span className="sn-stat-card__title">Unique Opportunities</span>
                <span className="sn-stat-card__icon">🎯</span>
              </div>
              <span className="sn-stat-card__value">{opportunityGroups.length}</span>
              <span className="sn-stat-card__meta">Canonical opportunity records</span>
            </div>

            <div className="sn-stat-card">
              <div className="sn-stat-card__header">
                <span className="sn-stat-card__title">Company Assessments</span>
                <span className="sn-stat-card__icon">🤝</span>
              </div>
              <span className="sn-stat-card__value">{assessments.length}</span>
              <span className="sn-stat-card__meta">Individual company-opportunity evaluations</span>
            </div>

            <Link
              to="/discovery?view=human-review"
              className="sn-stat-card"
              style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
              title="Click to view all candidates awaiting review"
            >
              <div className="sn-stat-card__header">
                <span className="sn-stat-card__title">Awaiting Review</span>
                <span className="sn-stat-card__icon" style={{ color: 'var(--accent)' }}>
                  📝
                </span>
              </div>
              <span className="sn-stat-card__value">{needsReviewCount}</span>
              <span className="sn-stat-card__meta">Candidates needing human evaluation &rarr;</span>
            </Link>

            <div className="sn-stat-card">
              <div className="sn-stat-card__header">
                <span className="sn-stat-card__title">Closing Soon</span>
                <span className="sn-stat-card__icon" style={{ color: closingSoonCount > 0 ? 'var(--gold)' : 'inherit' }}>
                  ⏳
                </span>
              </div>
              <span className="sn-stat-card__value">{closingSoonCount}</span>
              <span className="sn-stat-card__meta">Verified deadline in &le; 30 days</span>
            </div>

            <div
              className="sn-stat-card"
              style={{
                cursor: leads > 0 ? 'pointer' : 'default',
                borderColor: leads > 0 ? 'rgba(16, 185, 129, 0.4)' : undefined,
                background: leads > 0 ? 'linear-gradient(180deg, var(--surface) 0%, rgba(16, 185, 129, 0.05) 100%)' : undefined,
              }}
              onClick={() => {
                if (leads > 10) {
                  document.getElementById('action-bar-download-leads-btn')?.click()
                } else if (leads > 0) {
                  downloadLeadsCsv(results, profiles[0]?.name)
                }
              }}
              title={leads > 10 ? 'Click to view batch download options' : leads > 0 ? 'Click to download qualified leads CSV' : undefined}
            >
              <div className="sn-stat-card__header">
                <span className="sn-stat-card__title">Potential Leads</span>
                <span className="sn-stat-card__icon" style={{ color: 'var(--success, #10b981)' }}>
                  🎯
                </span>
              </div>
              <span className="sn-stat-card__value" style={{ color: leads > 0 ? 'var(--success, #10b981)' : undefined }}>
                {leads}
              </span>
              <span className="sn-stat-card__meta">
                {leads > 0 ? '📥 Click to export leads CSV' : 'Qualified by fit score'}
              </span>
            </div>
          </div>

          {/* View Mode Switcher: Cards | Match Matrix */}
          <div className="sn-view-mode-bar">
            <div className="sn-segmented-control" role="tablist" aria-label="Opportunity view format">
              <button
                type="button"
                role="tab"
                id="tab-view-cards"
                aria-selected={viewMode === 'cards'}
                className={`sn-segmented-btn ${viewMode === 'cards' ? 'sn-segmented-btn--active' : ''}`}
                onClick={() => setViewMode('cards')}
              >
                <span className="sn-segmented-icon">📑</span>
                Cards
              </button>
              <button
                type="button"
                role="tab"
                id="tab-view-matrix"
                aria-selected={viewMode === 'matrix'}
                className={`sn-segmented-btn ${viewMode === 'matrix' ? 'sn-segmented-btn--active' : ''}`}
                onClick={() => setViewMode('matrix')}
              >
                <span className="sn-segmented-icon">📊</span>
                Match Matrix
              </button>
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {opportunityGroups.length} opportunities across {availableCompanies.length} companies
            </span>
          </div>

          {viewMode === 'matrix' ? (
            <MatchMatrix
              opportunityGroups={opportunityGroups}
              allCompanies={availableCompanies}
            />
          ) : (
            <>
              {/* Interactive Toolbar & Controls */}
              <div className="sn-toolbar">
            <div className="sn-toolbar__search-group">
              <label htmlFor="rec-search" style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Search recommendations
              </label>
              <input
                id="rec-search"
                type="search"
                className="sn-search-input"
                placeholder="Search by company or opportunity title…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search recommendations"
                autoComplete="off"
              />
              {search ? (
                <button type="button" className="btn btn--clear" onClick={() => setSearch('')}>
                  Clear
                </button>
              ) : null}
            </div>

            <div className="sn-toolbar__filters">
              <label htmlFor="type-filter" className="sn-filter-label">
                <span className="visually-hidden">Filter category</span>
                <select
                  id="type-filter"
                  className="sn-select"
                  aria-label="Filter category"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                >
                  <option value="all">All Categories</option>
                  <option value="funding">Funding only</option>
                  <option value="procurement">Procurement only</option>
                </select>
              </label>

              <label htmlFor="outcome-filter" className="sn-filter-label">
                <span className="visually-hidden">Filter match classification</span>
                <select
                  id="outcome-filter"
                  className="sn-select"
                  aria-label="Filter match classification"
                  value={outcomeFilter}
                  onChange={(e) => setOutcomeFilter(e.target.value)}
                >
                  <option value="all">All Classifications</option>
                  <option value="relevant">Relevant</option>
                  <option value="potentially_relevant">Potentially relevant</option>
                  <option value="not_relevant">Not relevant</option>
                </select>
              </label>

              {availableCompanies.length > 0 ? (
                <label htmlFor="company-filter" className="sn-filter-label">
                  <span className="visually-hidden">Filter by company</span>
                  <select
                    id="company-filter"
                    className="sn-select"
                    aria-label="Filter by company"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                  >
                    <option value="all">All Companies</option>
                    {availableCompanies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {availableSources.length > 1 ? (
                <label htmlFor="cards-source-filter" className="sn-filter-label">
                  <span className="visually-hidden">Filter source</span>
                  <select
                    id="cards-source-filter"
                    className="sn-select"
                    aria-label="Filter source"
                    value={sourceFilter}
                    onChange={(e) => {
                      setSourceFilter(e.target.value)
                      setPage(0)
                    }}
                  >
                    <option value="all">All Sources</option>
                    {availableSources.map((s) => (
                      <option key={s} value={s}>
                        {formatFriendlySourceName(s)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label htmlFor="sort-by-opportunity" className="sn-filter-label">
                <span className="visually-hidden">Sort by</span>
                <select
                  id="sort-by-opportunity"
                  className="sn-select"
                  aria-label="Sort by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="fit">Sort by Fit Score</option>
                  <option value="title">Sort by Title (A-Z)</option>
                  <option value="deadline">Sort by Deadline</option>
                </select>
              </label>

              {/* Rows per page selector matching Companies table */}
              <label htmlFor="cards-page-size" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <span>Rows:</span>
                <select
                  id="cards-page-size"
                  className="sn-select"
                  aria-label="Rows per page"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(0)
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </label>

              <button type="button" className="btn btn--sm btn--outline" onClick={expandAll}>
                Expand All
              </button>
              <button type="button" className="btn btn--sm btn--outline" onClick={collapseAll}>
                Collapse All
              </button>
              {leads > 0 ? (
                <LeadsDownloadMenu
                  results={results}
                  companyName={profiles[0]?.name}
                  totalLeads={leads}
                  disabled={running}
                  variant="toolbar"
                  idPrefix="toolbar"
                />
              ) : null}
              {(search || typeFilter !== 'all' || outcomeFilter !== 'all' || companyFilter !== 'all' || sourceFilter !== 'all') ? (
                <button type="button" className="btn btn--sm btn--outline" onClick={clearFilters}>
                  Clear Filters
                </button>
              ) : null}
            </div>
          </div>

          {/* Results List */}
          {filteredGroups.length === 0 ? (
            <p role="status" className="dg-empty">
              No recommendations match this search.
            </p>
          ) : (
            <>
              <div role="feed" aria-label="Discovered opportunities">
                {paginatedGroups.map((group) => {
                const open = expandedKeys.has(group.key)
                const firstAssessment = group.assessments[0]
                const maxScore = Math.max(
                  ...(group.assessments ?? []).map((a) => (typeof a?.score === 'number' ? a.score : 0)),
                  0,
                )
                const scoreDisplay = maxScore > 0 ? `${maxScore <= 1 ? Math.round(maxScore * 100) : Math.round(maxScore)}%` : null

                return (
                  <article
                    key={group.key}
                    className="card sn-opportunity-card"
                    data-testid="target-company-opportunity"
                  >
                    <div className="sn-opportunity-card__header">
                      <h3 className="sn-opportunity-card__title">{group.opportunityTitle}</h3>
                      <div className="sn-opportunity-card__badges">
                        <span className="sn-tag sn-tag--accent">
                          {group.opportunityType === 'procurement' ? 'Procurement' : 'Funding'}
                        </span>
                        <span className="sn-tag" title={group.source}>{formatFriendlySourceName(group.source)}</span>
                        {scoreDisplay ? (
                          <span className="sn-tag sn-tag--success" title="Highest suitability score across evaluated companies">
                            Fit: {scoreDisplay}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="sn-opportunity-card__meta">
                      <span>
                        <strong>Source:</strong> {formatFriendlySourceName(group.source)} ({group.source}) ·{' '}
                        {firstAssessment?.sourceUrl ? (
                          <a href={firstAssessment.sourceUrl} target="_blank" rel="noreferrer">
                            {firstAssessment.sourceUrl}
                          </a>
                        ) : (
                          'Official link available'
                        )}
                      </span>
                      <span>
                        <strong>Deadline:</strong> {firstAssessment?.deadline ?? 'Not specified'}
                      </span>
                      <span>
                        <strong>Status:</strong>{' '}
                        <span className="sn-tag">{firstAssessment?.status ?? 'unknown'}</span>
                      </span>
                      <span role="status">
                        <strong>Company assessments: {group.assessments.length}</strong>
                      </span>
                    </div>

                    <div className="sn-opportunity-card__actions">
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link
                          className="btn btn--outline"
                          to={`/discovery?view=${group.opportunityType === 'procurement' ? 'procurement-review' : 'funding-review'}`}
                        >
                          Open {group.opportunityType === 'procurement' ? 'procurement' : 'funding'} review
                        </Link>
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => toggleGroupExpanded(group.key)}
                          aria-expanded={open}
                        >
                          {open ? 'Hide assessments' : 'View assessments'}
                        </button>
                      </div>

                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {group.assessments.length} {group.assessments.length === 1 ? 'company assessment' : 'company assessments'}
                      </span>
                    </div>

                    {open ? (
                      <div className="sn-assessments-container">
                        <p className="sn-assessments-disclaimer">
                          Suitability scores are evaluated independently for each company based on sector, ICP, and scope alignment.
                          They represent system fit criteria, not guaranteed probabilities of award.
                        </p>
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                          {(group.assessments ?? []).map((assessment, index) => {
                            const scoreVal =
                              assessment.score != null
                                ? assessment.score <= 1
                                  ? `${Math.round(assessment.score * 100)}%`
                                  : `${Math.round(assessment.score)}%`
                                : 'n/a'

                            const outcomeBadge =
                              assessment.outcome === 'relevant'
                                ? 'sn-tag sn-tag--success'
                                : assessment.outcome === 'potentially_relevant'
                                  ? 'sn-tag sn-tag--warn'
                                  : 'sn-tag'

                            return (
                              <li
                                key={`${assessment.companyId || assessment.companyName}-${index}`}
                                data-testid="target-company-assessment"
                                className="sn-assessment-item"
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span className="sn-assessment-company">{assessment.companyName}</span>
                                  <span className={outcomeBadge}>{assessment.outcome}</span>
                                  <span className="sn-assessment-score">Score: {scoreVal}</span>
                                </div>

                                <div className="sn-assessment-reasons">
                                  <strong>Evaluation rationale:</strong> {Array.isArray(assessment.reasons) ? assessment.reasons.join(' ') : ''}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>

              {/* Pagination Bar for Cards */}
              <div className="listbar sn-matrix-pagination" style={{ marginTop: '16px' }}>
                <div className="listbar__counts">
                  <span className="company-directory-pagination__range">
                    Showing <strong>{filteredGroups.length === 0 ? 0 : safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, filteredGroups.length)}</strong> of <strong>{filteredGroups.length}</strong> opportunities
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label htmlFor="cards-page-size-bottom" style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Rows per page:
                    <select
                      id="cards-page-size-bottom"
                      className="sn-select"
                      style={{ marginLeft: '6px', padding: '3px 8px', fontSize: '12.5px' }}
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value))
                        setPage(0)
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </label>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn--sm btn--outline"
                      disabled={safePage <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      aria-label="Previous cards page"
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                      Page {safePage + 1} of {totalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn--sm btn--outline"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      aria-label="Next cards page"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </>
  ) : null}
    </section>
  )
}
