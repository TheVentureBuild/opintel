import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  isOpportunityOpen,
  runTargetCompanyDiscovery,
  runTargetCompanyGrantsGovDiscovery,
  runTargetCompanySamDiscovery,
  runTargetCompanySbirDiscovery,
  runTargetCompanyChallengeDiscovery,
  runTargetCompanyStartupIndiaDiscovery,
  runTargetCompanyThubDiscovery,
  runTargetCompanyIcreateDiscovery,
} from './live-discovery'
import type { GrantsGovBridgeSearchResponse } from '../live-source/grantsgov-bridge/contract'
import { handleSamBridge } from '../live-source/sam-bridge/handler'
import { handleSbirBridge } from '../live-source/sbir-bridge/handler'
import { handleChallengeBridge } from '../live-source/challenge-bridge/handler'
import { handleStartupIndiaBridge } from '../live-source/startup-india-bridge/handler'
import { handleThubBridge } from '../live-source/thub-bridge/handler'
import { handleIcreateBridge } from '../live-source/icreate-bridge/handler'

test('target-company Grants.gov discovery invokes queries and recommendations', async () => {
  const requester = async (_term: string): Promise<GrantsGovBridgeSearchResponse> => {
    const body = JSON.stringify({
      data: {
        oppHits: [
          {
            id: '123',
            title: 'AI Infrastructure Grant',
            number: 'AI-1',
            oppStatus: 'posted',
            openDate: '01/01/2026',
            closeDate: '12/31/2026',
            agency: 'Test Agency',
          },
        ],
      },
    })

    test('target-company discovery preserves a successful source when another source reports an error', async () => {
      const result = await runTargetCompanyDiscovery(
        { companyId: 'C1', name: 'ContextQA', sector: 'AI Infrastructure', country: 'US' },
        async () => ({
          ok: false,
          status: 503,
          body: null,
          errors: [{ code: 'unavailable', message: 'Source unavailable' }],
        }),
        async () => ({
          ok: true,
          status: 200,
          body: JSON.stringify({ apiVersion: '1.0', totalResults: 0, results: [] }),
        }),
      )

      assert.ok(result.sourceResults.find((source) => source.source === 'grantsgov')?.errors.length)
      assert.deepEqual(result.sourceResults.find((source) => source.source === 'eu-sedia')?.errors, [])
      assert.equal(result.records.length, 0)
    })

    test('a rejected source request is returned as a source-specific error, not thrown', async () => {
      const result = await runTargetCompanyGrantsGovDiscovery(
        { companyId: 'C1', name: 'ContextQA', sector: 'AI Infrastructure', country: 'US' },
        async () => {
          throw new Error('offline test failure')
        },
      )

      assert.ok(result.queries.length > 0)
      assert.ok(result.errors.length > 0)
      assert.ok(result.errors.every((message) => message.includes('Grants.gov request failed')))
      assert.equal(result.records.length, 0)
    })
    return { ok: true, status: 200, body }
  }

  const result = await runTargetCompanyGrantsGovDiscovery(
    { companyId: 'C1', name: 'ContextQA', sector: 'AI Infrastructure', country: 'US' },
    requester,
  )

  assert.ok(result.queries.length > 0)
  assert.equal(result.records.length, 1)
  assert.equal(result.recommendations.length, 1)
  assert.equal(result.recommendations[0].outcome, 'potentially_relevant')
})

test('isOpportunityOpen enforces future deadlines and rejects conquered or awarded tenders', () => {
  // 1. Rejects expired / past deadlines
  assert.equal(isOpportunityOpen('2024-01-01', 'Active'), false, 'Past 2024 deadline should be rejected')
  assert.equal(isOpportunityOpen('2025-06-15', 'Open'), false, 'Past 2025 deadline should be rejected')

  // 2. Rejects conquered / awarded notices
  assert.equal(isOpportunityOpen('2027-12-31', 'Awarded'), false, 'Awarded tender must be rejected')
  assert.equal(isOpportunityOpen('2027-12-31', 'Contract Award Notice'), false, 'Contract award notice must be rejected')
  assert.equal(isOpportunityOpen('2027-12-31', 'Conquered'), false, 'Conquered tender must be rejected')
  assert.equal(isOpportunityOpen('2027-12-31', 'AOC (Award of Contract)'), false, 'AOC must be rejected')
  assert.equal(isOpportunityOpen('2027-12-31', 'Winner Announced'), false, 'Winner announced must be rejected')
  assert.equal(isOpportunityOpen('2027-12-31', 'Results of Tender'), false, 'Results of tender must be rejected')
  assert.equal(isOpportunityOpen('2027-12-31', 'Closed'), false, 'Closed must be rejected')
  assert.equal(isOpportunityOpen('2027-12-31', 'Archived'), false, 'Archived must be rejected')

  // 3. Accepts active future notices
  assert.equal(isOpportunityOpen('2027-06-30', 'Active'), true, 'Active 2027 notice must be accepted')
  assert.equal(isOpportunityOpen('2027-09-15', 'Open'), true, 'Open 2027 notice must be accepted')
})

test('SAM.gov live bridge and discovery matches US software services companies', async () => {
  const profile = {
    companyId: 'pacewisdom-us',
    name: 'Pace Wisdom Solutions',
    sector: 'Custom Web & Mobile Software Development',
    capabilities: ['Custom Web Applications', 'Cloud Architecture', 'DevOps', 'Mobile Applications'],
    country: 'US',
  }

  const requester = async (term: string) => {
    const res = await handleSamBridge({
      runId: 'test-sam',
      companyId: profile.companyId,
      keyword: term,
      limit: 10,
    })
    return res.body
  }

  const result = await runTargetCompanySamDiscovery(profile, requester)
  assert.ok(result.records.length > 0, 'SAM.gov should return active IT solicitations')
  assert.ok(result.records.every((r) => r.source === 'sam'))
  assert.ok(result.records.every((r) => r.sourceUrl.startsWith('https://sam.gov/')))
  assert.ok(result.records.every((r) => r.deadline && new Date(r.deadline).getFullYear() >= 2027))
})

test('SBIR.gov live bridge and discovery returns DARPA/NASA innovation grants', async () => {
  const profile = {
    companyId: 'pacewisdom-sbir',
    name: 'Pace Wisdom Solutions',
    sector: 'Artificial Intelligence & Computer Vision',
    capabilities: ['AI', 'Computer Vision', 'Deep Learning', 'Edge Computing'],
    country: 'US',
  }

  const requester = async (term: string) => {
    const res = await handleSbirBridge({
      runId: 'test-sbir',
      companyId: profile.companyId,
      keyword: term,
      limit: 10,
    })
    return res.body
  }

  const result = await runTargetCompanySbirDiscovery(profile, requester)
  assert.ok(result.records.length > 0, 'SBIR.gov should return innovation grant solicitations')
  assert.ok(result.records.every((r) => r.source === 'sbir'))
  assert.ok(result.records.every((r) => r.sourceUrl.startsWith('http')))
  assert.ok(result.records.every((r) => r.deadline && new Date(r.deadline).getFullYear() >= 2027))
})

test('USA.gov / Federal Challenges live bridge and discovery returns federal tech prize competitions', async () => {
  const profile = {
    companyId: 'pacewisdom-challenge',
    name: 'Pace Wisdom Solutions',
    sector: 'AI-Powered Clinical Software & HealthTech',
    capabilities: ['HealthTech', 'AI', 'FHIR', 'Computer Vision'],
    country: 'US',
  }

  const requester = async (term: string) => {
    const res = await handleChallengeBridge({
      runId: 'test-challenge',
      companyId: profile.companyId,
      keyword: term,
      limit: 10,
    })
    return res.body
  }

  const result = await runTargetCompanyChallengeDiscovery(profile, requester)
  assert.ok(result.records.length > 0, 'USA.gov / Federal Challenges should return tech competitions')
  assert.ok(result.records.every((r) => r.source === 'challenge'))
  assert.ok(result.records.every((r) => r.sourceUrl.startsWith('http')))
  assert.ok(result.records.every((r) => r.deadline && new Date(r.deadline).getFullYear() >= 2027))
})

test('Startup India live bridge returns seed fund schemes and innovation challenges', async () => {
  const profile = {
    companyId: 'pacewisdom-india',
    name: 'Pace Wisdom Solutions',
    sector: 'Digital Governance & Cloud Infrastructure',
    capabilities: ['Software Services', 'Cloud Architecture', 'APIs', 'Microservices'],
    country: 'IN',
  }

  const requester = async (term: string) => {
    const res = await handleStartupIndiaBridge({
      runId: 'test-startup-india',
      companyId: profile.companyId,
      keyword: term,
      limit: 10,
    })
    return res.body
  }

  const result = await runTargetCompanyStartupIndiaDiscovery(profile, requester)
  assert.ok(result.records.length > 0, 'Startup India should return seed fund & challenge programs')
  assert.ok(result.records.every((r) => r.source === 'startup-india'))
  assert.ok(result.records.every((r) => r.sourceUrl.startsWith('https://seedfund.startupindia.gov.in/')))
  assert.ok(result.records.every((r) => r.deadline && new Date(r.deadline).getFullYear() >= 2027))
})

test('T-Hub live bridge returns Lab32, T-AIM, and corporate innovation programs', async () => {
  const profile = {
    companyId: 'pacewisdom-thub',
    name: 'Pace Wisdom Solutions',
    sector: 'FinTech, Microservices & Automated QA',
    capabilities: ['FinTech', 'Microservices', 'Automated QA Testing', 'Software Services'],
    country: 'IN',
  }

  const requester = async (term: string) => {
    const res = await handleThubBridge({
      runId: 'test-thub',
      companyId: profile.companyId,
      keyword: term,
      limit: 10,
    })
    return res.body
  }

  const result = await runTargetCompanyThubDiscovery(profile, requester)
  assert.ok(result.records.length > 0, 'T-Hub should return accelerator & grant programs')
  assert.ok(result.records.every((r) => r.source === 'thub'))
  assert.ok(result.records.every((r) => r.sourceUrl.includes('t-hub.co/programs')))
  assert.ok(result.records.every((r) => r.deadline && new Date(r.deadline).getFullYear() >= 2027))
})

test('iCreate live bridge returns Spark prototyping and scale-up grants', async () => {
  const profile = {
    companyId: 'pacewisdom-icreate',
    name: 'Pace Wisdom Solutions',
    sector: 'Edge AI & Industrial IoT Telemetry',
    capabilities: ['Edge AI', 'IoT', 'Telemetry', 'Cloud Architecture', 'Software Services'],
    country: 'IN',
  }

  const requester = async (term: string) => {
    const res = await handleIcreateBridge({
      runId: 'test-icreate',
      companyId: profile.companyId,
      keyword: term,
      limit: 10,
    })
    return res.body
  }

  const result = await runTargetCompanyIcreateDiscovery(profile, requester)
  assert.ok(result.records.length > 0, 'iCreate should return prototyping & scale-up grants')
  assert.ok(result.records.every((r) => r.source === 'icreate'))
  assert.ok(result.records.every((r) => r.sourceUrl.includes('icreate.org.in/programs/')))
  assert.ok(result.records.every((r) => r.deadline && new Date(r.deadline).getFullYear() >= 2027))
})
