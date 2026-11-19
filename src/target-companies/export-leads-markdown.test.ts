import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  generateCompanyLeadsMarkdown,
  formatFitStars,
} from './export-leads-markdown'
import type { TargetCompanyLiveDiscoveryResult } from './live-discovery'
import type { TargetRelevanceResult } from './matching'

test('formatFitStars returns star representations with clear descriptions', () => {
  assert.ok(formatFitStars(5).includes('⭐⭐⭐⭐⭐'))
  assert.ok(formatFitStars(5).includes('Top Tier Fit'))
  assert.ok(formatFitStars(4).includes('⭐⭐⭐⭐'))
  assert.ok(formatFitStars(3).includes('⭐⭐⭐'))
  assert.ok(formatFitStars(2).includes('⭐⭐'))
  assert.ok(formatFitStars(1).includes('⭐'))
})

test('generateCompanyLeadsMarkdown includes company details and qualified leads', () => {
  const profile = {
    companyId: 'WISSEN-1',
    name: 'Wissen Tech',
    country: 'Bangalore, India and New Jersey, US',
    sector: 'Software Services; financial services; healthcare; software development',
    capabilities: [
      'financial reconciliation',
      'banking API gateways',
      'regulatory portals',
      'FHIR healthcare integrations',
    ],
    description: 'Wissen Technology specializes in low-latency systems, banking API integrations, and financial compliance platforms.',
    companyType: 'commercial',
    foundedYear: 2000,
    website: 'https://www.wissen.com',
  }

  const rec1: TargetRelevanceResult = {
    companyId: 'WISSEN-1',
    companyName: 'Wissen Tech',
    opportunityId: 'OP00472679',
    opportunityTitle: 'PACPS Banking API and Financial Reconciliation System',
    opportunityType: 'procurement',
    sourceUrl: 'https://projects.worldbank.org/en/projects-operations/procurement-detail/OP00472679',
    outcome: 'relevant',
    score: 95,
    scoreStatus: 'SCORED',
    coverage: 1,
    factors: {} as any,
    matchedFields: ['financial reconciliation', 'banking API gateways'],
    mismatchedFields: [],
    missingFields: [],
    uncertainty: [],
    reasons: ['Direct anchor vertical match: financial reconciliation and banking API gateways.'],
    deadline: '2027-01-15',
    status: 'Active',
  }

  const rec2: TargetRelevanceResult = {
    companyId: 'WISSEN-1',
    companyName: 'Wissen Tech',
    opportunityId: 'OP00482077',
    opportunityTitle: 'Somalia DPA Data Controller Registration Portal',
    opportunityType: 'procurement',
    sourceUrl: 'https://projects.worldbank.org/en/projects-operations/procurement-detail/OP00482077',
    outcome: 'relevant',
    score: 80,
    scoreStatus: 'SCORED',
    coverage: 1,
    factors: {} as any,
    matchedFields: ['regulatory portals'],
    mismatchedFields: [],
    missingFields: [],
    uncertainty: [],
    reasons: ['Regulatory compliance portal workflow match.'],
    deadline: '2027-02-28',
    status: 'Active',
  }

  const recExcluded: TargetRelevanceResult = {
    companyId: 'WISSEN-1',
    companyName: 'Wissen Tech',
    opportunityId: 'OP00481028',
    opportunityTitle: 'Data Center Chillers and FM200 Hardware Supply',
    opportunityType: 'procurement',
    sourceUrl: 'https://projects.worldbank.org/en/projects-operations/procurement-detail/OP00481028',
    outcome: 'not_relevant',
    score: 5,
    scoreStatus: 'SCORED',
    coverage: 1,
    factors: {} as any,
    matchedFields: [],
    mismatchedFields: ['sector/capabilities'],
    missingFields: [],
    uncertainty: [],
    reasons: ['Physical hardware/chiller facility fit-out.'],
    deadline: '2026-12-29',
    status: 'Active',
  }

  const mockResults: TargetCompanyLiveDiscoveryResult[] = [
    {
      profile,
      queries: [],
      records: [
        {
          source: 'worldbank',
          sourceRecordId: 'OP00472679',
          title: 'PACPS Banking API and Financial Reconciliation System',
          sourceUrl: 'https://projects.worldbank.org/en/projects-operations/procurement-detail/OP00472679',
          country: 'Georgia',
          deadline: '2027-01-15',
          status: 'Active',
          description: 'Reconciliation system',
        },
        {
          source: 'worldbank',
          sourceRecordId: 'OP00482077',
          title: 'Somalia DPA Data Controller Registration Portal',
          sourceUrl: 'https://projects.worldbank.org/en/projects-operations/procurement-detail/OP00482077',
          country: 'Somalia',
          deadline: '2027-02-28',
          status: 'Active',
          description: 'Registration portal',
        },
      ],
      recommendations: [rec1, rec2, recExcluded],
      errors: [],
      sourceResults: [],
      newRecordCount: 2,
    },
  ]

  const markdown = generateCompanyLeadsMarkdown(mockResults, profile, 'Sathvika')

  // Verify Company Details Section
  assert.ok(markdown.includes('# Wissen Tech — Opportunity Intelligence Dossier'))
  assert.ok(markdown.includes('**Company Name** | **Wissen Tech**'))
  assert.ok(markdown.includes('Bangalore, India and New Jersey, US'))
  assert.ok(markdown.includes('Founded 2000'))
  assert.ok(markdown.includes('[https://www.wissen.com](https://www.wissen.com)'))
  assert.ok(markdown.includes('financial reconciliation'))
  assert.ok(markdown.includes('banking API gateways'))
  assert.ok(markdown.includes('Wissen Technology specializes in low-latency systems'))

  // Verify Qualified Leads Table & Details
  assert.ok(markdown.includes('OP00472679'))
  assert.ok(markdown.includes('PACPS Banking API'))
  assert.ok(markdown.includes('OP00482077'))
  assert.ok(markdown.includes('Somalia DPA'))
  assert.ok(markdown.includes('⭐⭐⭐⭐⭐ (5/5 • Top Tier Fit)'))

  // Verify that not_relevant (OP00481028) was excluded from leads
  assert.ok(!markdown.includes('Data Center Chillers and FM200 Hardware Supply'))

  // Verify Governance Audit Section is present
  assert.ok(markdown.includes('## 5. Governance & Quality Gates Audit'))
  assert.ok(markdown.includes('Anti-Signal Hardware & Facilities Knockout'))
  assert.ok(markdown.includes('Individual Consultant Vacancy Knockout'))
})

test('generateCompanyLeadsMarkdown supports filterType options', () => {
  const profile = { companyId: 'C1', name: 'Alpha Tech', sector: 'AI' }
  const mockResults: TargetCompanyLiveDiscoveryResult[] = [
    {
      profile,
      queries: [],
      records: [],
      recommendations: [
        {
          companyId: 'C1',
          companyName: 'Alpha Tech',
          opportunityId: 'GRANT-1',
          opportunityTitle: 'AI Research Grant',
          opportunityType: 'funding',
          sourceUrl: 'https://grants.gov/1',
          outcome: 'relevant',
          score: 90,
          scoreStatus: 'SCORED',
          coverage: 1,
          factors: {} as any,
          matchedFields: ['AI'],
          mismatchedFields: [],
          missingFields: [],
          uncertainty: [],
          reasons: ['Match'],
          deadline: '2027-01-01',
          status: 'Active',
        },
        {
          companyId: 'C1',
          companyName: 'Alpha Tech',
          opportunityId: 'RFP-1',
          opportunityTitle: 'Federal Cloud RFP',
          opportunityType: 'procurement',
          sourceUrl: 'https://sam.gov/1',
          outcome: 'relevant',
          score: 85,
          scoreStatus: 'SCORED',
          coverage: 1,
          factors: {} as any,
          matchedFields: ['AI'],
          mismatchedFields: [],
          missingFields: [],
          uncertainty: [],
          reasons: ['Match'],
          deadline: '2027-02-01',
          status: 'Active',
        },
      ],
      errors: [],
      sourceResults: [],
      newRecordCount: 0,
    },
  ]

  const grantOnlyMd = generateCompanyLeadsMarkdown(mockResults, profile, 'Sathvika', { filterType: 'grant' })
  assert.ok(grantOnlyMd.includes('AI Research Grant'))
  assert.ok(!grantOnlyMd.includes('Federal Cloud RFP'))

  const rfpOnlyMd = generateCompanyLeadsMarkdown(mockResults, profile, 'Sathvika', { filterType: 'rfp' })
  assert.ok(!rfpOnlyMd.includes('AI Research Grant'))
  assert.ok(rfpOnlyMd.includes('Federal Cloud RFP'))
})
