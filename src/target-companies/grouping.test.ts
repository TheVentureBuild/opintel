import assert from 'node:assert/strict'
import { test } from 'node:test'

import { groupTargetRecommendations } from './live-discovery'
import type { TargetRelevanceResult } from './matching'

function assessment(
  companyId: string,
  opportunityId: string,
  title: string,
  options: {
    sourceUrl?: string
    score?: number | null
    outcome?: TargetRelevanceResult['outcome']
    reasons?: string[]
  } = {},
): TargetRelevanceResult {
  return {
    companyId,
    companyName: companyId,
    opportunityId,
    opportunityTitle: title,
    opportunityType: 'funding',
    sourceUrl: options.sourceUrl ?? `https://grants.gov/${opportunityId}`,
    outcome: options.outcome ?? 'potentially_relevant',
    score: options.score !== undefined ? options.score : 50,
    scoreStatus: 'PROVISIONAL',
    coverage: 0.5,
    factors: {} as any,
    matchedFields: [],
    mismatchedFields: [],
    missingFields: [],
    uncertainty: [],
    reasons: options.reasons ?? [],
    deadline: null,
    status: null,
  }
}

test('three companies share one identified source opportunity and retain their own assessments', () => {
  const groups = groupTargetRecommendations([
    assessment('C1', 'O1', 'Grant A', { score: 90, reasons: ['strong fit'] }),
    assessment('C2', 'O1', 'Grant A', { score: 35, reasons: ['weak fit'], outcome: 'potentially_relevant' }),
    assessment('C3', 'O1', 'Grant A', { score: null, reasons: ['uncertain'], outcome: 'insufficient_evidence' }),
  ])

  assert.equal(groups.length, 1)
  assert.deepEqual(groups[0].assessments.map(({ companyId }) => companyId), ['C1', 'C2', 'C3'])
  assert.deepEqual(groups[0].assessments.map(({ score }) => score), [90, 35, null])
  assert.deepEqual(groups[0].assessments.map(({ reasons }) => reasons), [['strong fit'], ['weak fit'], ['uncertain']])
  assert.deepEqual(groups[0].assessments.map(({ outcome }) => outcome), [
    'potentially_relevant',
    'potentially_relevant',
    'insufficient_evidence',
  ])
})

test('identical opportunity IDs from different source hosts remain separate', () => {
  const groups = groupTargetRecommendations([
    assessment('C1', 'O1', 'Grant A', { sourceUrl: 'https://grants.gov/opportunity/O1' }),
    assessment('C1', 'O1', 'Grant A', { sourceUrl: 'https://ec.europa.eu/funding/O1' }),
  ])

  assert.equal(groups.length, 2)
})

test('repeated assessment pairs are deduplicated by canonical opportunity and company', () => {
  const groups = groupTargetRecommendations([
    assessment('C1', 'O1', 'Grant A', { score: 50 }),
    assessment('C1', 'O1', 'Grant A', { score: 10 }),
  ])

  assert.equal(groups.length, 1)
  assert.equal(groups[0].assessments.length, 1)
  assert.equal(groups[0].assessments[0].score, 50)
})

test('missing opportunity IDs remain separate even when source and titles match', () => {
  const groups = groupTargetRecommendations([
    assessment('C1', '', 'Grant A'),
    assessment('C2', '', 'Grant A'),
  ])

  assert.equal(groups.length, 2)
})

test('distinct source IDs remain separate even when titles are identical', () => {
  const groups = groupTargetRecommendations([
    assessment('C1', 'NOTICE-1', 'Road maintenance tender', {
      sourceUrl: 'https://ted.europa.eu/notice/NOTICE-1',
    }),
    assessment('C1', 'NOTICE-2', 'Road maintenance tender', {
      sourceUrl: 'https://ted.europa.eu/notice/NOTICE-2',
    }),
  ])

  assert.equal(groups.length, 2)
})

test('unidentified source URLs are not merged by title or ID', () => {
  const groups = groupTargetRecommendations([
    assessment('C1', 'O1', 'Grant A', { sourceUrl: 'not-a-url' }),
    assessment('C2', 'O1', 'Grant A', { sourceUrl: 'not-a-url' }),
  ])

  assert.equal(groups.length, 2)
})

test('opportunity groups sorted by fit place relevant matches at the top and less relevant/not_relevant at the last', () => {
  const groups = groupTargetRecommendations([
    assessment('WISSEN', 'OPP-GENERIC', 'Generic Maintenance Support', {
      sourceUrl: 'https://grants.gov/opp-generic',
      score: 15,
      outcome: 'not_relevant',
    }),
    assessment('WISSEN', 'OPP-FINTECH', 'Banking API & Financial Reconciliation', {
      sourceUrl: 'https://grants.gov/opp-fintech',
      score: 95,
      outcome: 'relevant',
    }),
    assessment('WISSEN', 'OPP-PORTAL', 'Regulatory Compliance Portal', {
      sourceUrl: 'https://grants.gov/opp-portal',
      score: 75,
      outcome: 'potentially_relevant',
    }),
    assessment('WISSEN', 'OPP-CIVIL', 'Data Center Hardware & Cooling Fit-out', {
      sourceUrl: 'https://ted.europa.eu/opp-civil',
      score: 5,
      outcome: 'not_relevant',
    }),
  ])

  function getGroupRelevanceTier(group: (typeof groups)[0]): number {
    let highestTier = 0
    for (const item of group.assessments ?? []) {
      if (item.outcome === 'relevant') {
        highestTier = Math.max(highestTier, 3)
      } else if (item.outcome === 'potentially_relevant') {
        highestTier = Math.max(highestTier, 2)
      } else if (item.outcome === 'insufficient_evidence') {
        highestTier = Math.max(highestTier, 1)
      }
    }
    return highestTier
  }

  const sorted = [...groups].sort((a, b) => {
    const tierA = getGroupRelevanceTier(a)
    const tierB = getGroupRelevanceTier(b)
    if (tierB !== tierA) return tierB - tierA

    const maxA = Math.max(...a.assessments.map((i) => i.score ?? 0), 0)
    const maxB = Math.max(...b.assessments.map((i) => i.score ?? 0), 0)
    return maxB - maxA
  })

  // Relevant and potential leads must be first
  assert.equal(sorted[0].opportunityId, 'OPP-FINTECH', 'Top item must be the high-confidence relevant lead')
  assert.equal(sorted[1].opportunityId, 'OPP-PORTAL', 'Second item must be the potentially relevant lead')

  // Not relevant items must sink to the very last
  assert.equal(sorted[2].opportunityId, 'OPP-GENERIC', 'Third item is lower-tier not_relevant')
  assert.equal(sorted[3].opportunityId, 'OPP-CIVIL', 'Fourth item is bottom-tier not_relevant')
  assert.ok(sorted[sorted.length - 1].assessments.every((a) => a.outcome === 'not_relevant'))
})

