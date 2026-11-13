import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import path from 'node:path'

import {
  LEADS_CSV_HEADERS,
  fitScore1to5,
  isPotentialLead,
  generateLeadsCsv,
  countPotentialLeads,
  getLeadBatches,
  buildOpportunityLeadRow,
} from './export-leads-csv'
import type { TargetCompanyLiveDiscoveryResult } from './live-discovery'
import type { TargetRelevanceResult } from './matching'

test('LEADS_CSV_HEADERS exactly matches the 21 columns of RFP & Grant - RFPs & Grants.csv in order', () => {
  const refPath = path.resolve(process.cwd(), '../RFP & Grant - RFPs & Grants.csv')
  if (fs.existsSync(refPath)) {
    const content = fs.readFileSync(refPath, 'utf8')
    const firstLine = content.split(/\r?\n/)[0]
    const headers = firstLine.split(',').map((h) => h.trim())
    assert.equal(headers.length, 21)
    assert.deepEqual(LEADS_CSV_HEADERS, headers)
  } else {
    assert.equal(LEADS_CSV_HEADERS.length, 21)
  }
})

test('fitScore1to5 correctly scales scores and falls back to outcome', () => {
  assert.equal(fitScore1to5(95, 'relevant'), 5)
  assert.equal(fitScore1to5(72, 'potentially_relevant'), 4)
  assert.equal(fitScore1to5(55, 'potentially_relevant'), 3)
  assert.equal(fitScore1to5(40, 'potentially_relevant'), 2)
  assert.equal(fitScore1to5(15, 'not_relevant'), 1)
  assert.equal(fitScore1to5(null, 'relevant'), 5)
  assert.equal(fitScore1to5(null, 'potentially_relevant'), 4)
})

test('isPotentialLead returns true for relevant and potentially_relevant only', () => {
  const base = {
    companyId: 'C1',
    companyName: 'Acme AI',
    opportunityId: 'OPP-1',
    opportunityTitle: 'AI Grant',
    opportunityType: 'funding' as const,
    sourceUrl: 'https://example.com/1',
    score: 80,
    scoreStatus: 'SCORED' as const,
    coverage: 1,
    factors: {} as any,
    matchedFields: [],
    mismatchedFields: [],
    missingFields: [],
    uncertainty: [],
    reasons: ['Strong capability match'],
    deadline: '2026-12-31',
    status: 'posted',
  }

  assert.equal(isPotentialLead({ ...base, outcome: 'relevant' }), true)
  assert.equal(isPotentialLead({ ...base, outcome: 'potentially_relevant' }), true)
  assert.equal(isPotentialLead({ ...base, outcome: 'not_relevant' }), false)
  assert.equal(isPotentialLead({ ...base, outcome: 'insufficient_evidence' }), false)
})

test('generateLeadsCsv includes only potential leads and formats all 21 columns with owner Sathvika', () => {
  const relevantRec: TargetRelevanceResult = {
    companyId: 'C1',
    companyName: 'OpenRAG Systems',
    opportunityId: 'GR-2026-001',
    opportunityTitle: 'Enterprise GenAI Research Call',
    opportunityType: 'funding',
    sourceUrl: 'https://www.grants.gov/search-results-detail/12345',
    outcome: 'relevant',
    score: 85,
    scoreStatus: 'SCORED',
    coverage: 1,
    factors: {} as any,
    matchedFields: ['Artificial Intelligence'],
    mismatchedFields: [],
    missingFields: [],
    uncertainty: [],
    reasons: ['Direct sector and capability alignment on GenAI search'],
    deadline: '2026-11-30',
    status: 'posted',
  }

  const notRelevantRec: TargetRelevanceResult = {
    companyId: 'C1',
    companyName: 'OpenRAG Systems',
    opportunityId: 'OPP-EXCLUDED',
    opportunityTitle: 'Highway Asphalt Replacement',
    opportunityType: 'procurement',
    sourceUrl: 'https://ted.europa.eu/notice/999',
    outcome: 'not_relevant',
    score: 0,
    scoreStatus: 'SCORED',
    coverage: 1,
    factors: {} as any,
    matchedFields: [],
    mismatchedFields: ['sector/capabilities'],
    missingFields: [],
    uncertainty: [],
    reasons: ['No overlap with construction works'],
    deadline: null,
    status: null,
  }

  const results: TargetCompanyLiveDiscoveryResult[] = [
    {
      profile: {
        companyId: 'C1',
        name: 'OpenRAG Systems',
        sector: 'Artificial Intelligence',
      },
      queries: ['Artificial Intelligence'],
      records: [
        {
          source: 'grantsgov',
          sourceRecordId: 'GR-2026-001',
          title: 'Enterprise GenAI Research Call',
          sourceUrl: 'https://www.grants.gov/search-results-detail/12345',
          description: 'Funding for advanced enterprise LLM retrieval research.',
          deadline: '2026-11-30',
          status: 'posted',
        },
      ],
      recommendations: [relevantRec, notRelevantRec],
      errors: [],
      sourceResults: [],
      newRecordCount: 1,
    },
  ]

  assert.equal(countPotentialLeads(results), 1)

  const csvOutput = generateLeadsCsv(results, 'Sathvika')
  const lines = csvOutput.split('\r\n')
  assert.equal(lines.length, 2) // Header + 1 lead row (not_relevant row is excluded)

  // Verify headers
  assert.equal(lines[0], LEADS_CSV_HEADERS.join(','))

  // Verify row contents
  const cells = lines[1].split(',')
  assert.equal(cells[0], 'GR-2026-001') // Opportunity ID
  assert.equal(cells[1], 'Grant') // Type
  assert.equal(cells[2], 'Enterprise GenAI Research Call') // Title
  assert.equal(cells[5], 'OpenRAG Systems') // Relevant TVB related Company
  assert.equal(cells[15], 'Grants.gov') // Source
  assert.equal(cells[16], '5') // Fit score
  assert.equal(cells[17], 'Sathvika') // Owner
  assert.equal(cells[18], '') // Date added (empty)
  assert.equal(cells[19], '') // Last updated (empty)
})

test('getLeadBatches creates chunks of 10 for leads > 10', () => {
  assert.deepEqual(getLeadBatches(0), [])
  assert.deepEqual(getLeadBatches(8), [
    { batchIndex: 1, start: 1, end: 8, offset: 0, limit: 8, label: 'Leads 1 – 8' },
  ])
  const batches25 = getLeadBatches(25, 10)
  assert.equal(batches25.length, 3)
  assert.deepEqual(batches25[0], { batchIndex: 1, start: 1, end: 10, offset: 0, limit: 10, label: 'Leads 1 – 10' })
  assert.deepEqual(batches25[1], { batchIndex: 2, start: 11, end: 20, offset: 10, limit: 10, label: 'Leads 11 – 20' })
  assert.deepEqual(batches25[2], { batchIndex: 3, start: 21, end: 25, offset: 20, limit: 5, label: 'Leads 21 – 25' })
})

test('generateLeadsCsv honors offset and limit options', () => {
  const makeLead = (id: string, score: number): TargetRelevanceResult => ({
    companyId: 'C1',
    companyName: 'Acme',
    opportunityId: id,
    opportunityTitle: `Opportunity ${id}`,
    opportunityType: 'funding',
    sourceUrl: `https://example.com/${id}`,
    outcome: 'relevant',
    score,
    scoreStatus: 'SCORED',
    coverage: 1,
    factors: {} as any,
    matchedFields: [],
    mismatchedFields: [],
    missingFields: [],
    uncertainty: [],
    reasons: [],
    deadline: null,
    status: 'posted',
  })

  const results: TargetCompanyLiveDiscoveryResult[] = [
    {
      profile: { companyId: 'C1', name: 'Acme' },
      queries: ['AI'],
      records: [],
      recommendations: [
        makeLead('OPP-1', 90),
        makeLead('OPP-2', 80),
        makeLead('OPP-3', 70),
      ],
      errors: [],
      sourceResults: [],
      newRecordCount: 3,
    },
  ]

  // All 3 leads
  const allCsv = generateLeadsCsv(results, 'Sathvika')
  assert.equal(allCsv.split('\r\n').length, 4) // 1 header + 3 rows

  // First 2 leads
  const batch1 = generateLeadsCsv(results, 'Sathvika', { offset: 0, limit: 2 })
  const batch1Lines = batch1.split('\r\n')
  assert.equal(batch1Lines.length, 3) // 1 header + 2 rows
  assert.ok(batch1Lines[1].includes('OPP-1')) // highest score first
  assert.ok(batch1Lines[2].includes('OPP-2'))

  // Next 1 lead
  const batch2 = generateLeadsCsv(results, 'Sathvika', { offset: 2, limit: 2 })
  const batch2Lines = batch2.split('\r\n')
  assert.equal(batch2Lines.length, 2) // 1 header + 1 row
  assert.ok(batch2Lines[1].includes('OPP-3'))
})

test('buildOpportunityLeadRow maps the 6 new sources to exact issuers, geographies, and currencies', () => {
  const baseRec = {
    companyId: 'pw-1',
    companyName: 'Pace Wisdom Solutions',
    outcome: 'relevant' as const,
    score: 85,
    scoreStatus: 'SCORED' as const,
    coverage: 1,
    factors: {} as any,
    matchedFields: ['Software Services'],
    mismatchedFields: [],
    missingFields: [],
    uncertainty: [],
    reasons: ['Strong alignment'],
    deadline: '2027-03-31',
    status: 'Open',
  }

  // 1. SAM.gov
  const samRow = buildOpportunityLeadRow(
    { ...baseRec, opportunityId: 'SAM-1', opportunityTitle: 'Cloud Modernization RFP', opportunityType: 'procurement', sourceUrl: 'https://sam.gov/opp/abc/view' },
    { source: 'sam', sourceRecordId: 'SAM-1', title: 'Cloud Modernization RFP', sourceUrl: 'https://sam.gov/opp/abc/view', description: 'SAM description', deadline: '2027-03-31', status: 'Active' },
    'Software Services',
    'Sathvika',
  )
  assert.equal(samRow[1], 'RFP')
  assert.equal(samRow[3], 'US Federal Procurement Authority')
  assert.equal(samRow[8], 'United States')
  assert.equal(samRow[11], 'USD')
  assert.equal(samRow[15], 'SAM.gov Federal Solicitations')
  assert.equal(samRow[17], 'Sathvika')

  // 2. SBIR.gov
  const sbirRow = buildOpportunityLeadRow(
    { ...baseRec, opportunityId: 'SBIR-1', opportunityTitle: 'DARPA AI Defense Call', opportunityType: 'funding', sourceUrl: 'https://www.sbir.gov/node/12345' },
    { source: 'sbir', sourceRecordId: 'SBIR-1', title: 'DARPA AI Defense Call', sourceUrl: 'https://www.sbir.gov/node/12345', description: 'SBIR grant', deadline: '2027-03-31', status: 'Open' },
    'Artificial Intelligence',
    'Sathvika',
  )
  assert.equal(sbirRow[1], 'Grant')
  assert.equal(sbirRow[3], 'US Federal SBIR / STTR Innovation Directorate')
  assert.equal(sbirRow[8], 'United States')
  assert.equal(sbirRow[11], 'USD')
  assert.equal(sbirRow[15], 'SBIR.gov Innovation Grants')

  // 3. Challenge.gov
  const challengeRow = buildOpportunityLeadRow(
    { ...baseRec, opportunityId: 'CHAL-1', opportunityTitle: 'NIST Cyber Challenge', opportunityType: 'funding', sourceUrl: 'https://www.challenge.gov/?challenge=cyber' },
    { source: 'challenge', sourceRecordId: 'CHAL-1', title: 'NIST Cyber Challenge', sourceUrl: 'https://www.challenge.gov/?challenge=cyber', description: 'Prize challenge', deadline: '2027-03-31', status: 'Open' },
    'Cybersecurity',
    'Sathvika',
  )
  assert.equal(challengeRow[1], 'Grant')
  assert.equal(challengeRow[3], 'US Federal Challenge Directorate (NIST / CMS / DHS / DIU)')
  assert.equal(challengeRow[8], 'United States')
  assert.equal(challengeRow[11], 'USD')
  assert.equal(challengeRow[15], 'USA.gov & Federal Prize Challenges')

  // 4. Startup India
  const startupIndiaRow = buildOpportunityLeadRow(
    { ...baseRec, opportunityId: 'SI-1', opportunityTitle: 'SISFS Tech Scale-Up', opportunityType: 'funding', sourceUrl: 'https://seedfund.startupindia.gov.in/' },
    { source: 'startup-india', sourceRecordId: 'SI-1', title: 'SISFS Tech Scale-Up', sourceUrl: 'https://seedfund.startupindia.gov.in/', description: 'Seed fund', deadline: '2027-03-31', status: 'Open' },
    'Software Services',
    'Sathvika',
  )
  assert.equal(startupIndiaRow[1], 'Grant')
  assert.equal(startupIndiaRow[3], 'DPIIT & Central Ministries (Startup India)')
  assert.equal(startupIndiaRow[8], 'India')
  assert.equal(startupIndiaRow[11], 'INR')
  assert.equal(startupIndiaRow[15], 'Startup India Seed Fund Scheme')

  // 5. T-Hub
  const thubRow = buildOpportunityLeadRow(
    { ...baseRec, opportunityId: 'THUB-1', opportunityTitle: 'T-Hub Lab32 Market Readiness', opportunityType: 'funding', sourceUrl: 'https://t-hub.co/programs/' },
    { source: 'thub', sourceRecordId: 'THUB-1', title: 'T-Hub Lab32 Market Readiness', sourceUrl: 'https://t-hub.co/programs/', description: 'PoC grant', deadline: '2027-03-31', status: 'Open' },
    'Software Services',
    'Sathvika',
  )
  assert.equal(thubRow[1], 'Grant')
  assert.equal(thubRow[3], 'T-Hub Foundation & State of Telangana')
  assert.equal(thubRow[8], 'India')
  assert.equal(thubRow[11], 'INR')
  assert.equal(thubRow[15], 'T-Hub Innovation Accelerators')

  // 6. iCreate
  const icreateRow = buildOpportunityLeadRow(
    { ...baseRec, opportunityId: 'ICREATE-1', opportunityTitle: 'iCreate Spark Prototyping', opportunityType: 'funding', sourceUrl: 'https://www.icreate.org.in/programs/' },
    { source: 'icreate', sourceRecordId: 'ICREATE-1', title: 'iCreate Spark Prototyping', sourceUrl: 'https://www.icreate.org.in/programs/', description: 'Spark grant', deadline: '2027-03-31', status: 'Open' },
    'DeepTech & IoT',
    'Sathvika',
  )
  assert.equal(icreateRow[1], 'Grant')
  assert.equal(icreateRow[3], 'iCreate & MeitY DeepTech Directorate')
  assert.equal(icreateRow[8], 'India')
  assert.equal(icreateRow[11], 'INR')
  assert.equal(icreateRow[15], 'iCreate Tech Prototyping Grants')
})

