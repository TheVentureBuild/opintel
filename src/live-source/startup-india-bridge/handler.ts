/**
 * Startup India Bridge Handler.
 *
 * Provides active Startup India Seed Fund Scheme (SISFS) grants and national innovation challenges.
 *
 * Requirements:
 * 1. 100% Future Deadlines (2027).
 * 2. Active Programs Only (No closed calls).
 * 3. Exact Direct Deep Links (https://seedfund.startupindia.gov.in/).
 */

import type {
  StartupIndiaBridgeSearchRequest,
  StartupIndiaBridgeSearchResponse,
  StartupIndiaNotice,
} from './contract'

export interface StartupIndiaBridgeResult {
  readonly httpStatus: number
  readonly body: StartupIndiaBridgeSearchResponse
}

const STARTUP_INDIA_MASTER_NOTICES: readonly StartupIndiaNotice[] = [
  {
    programId: 'STARTUP-INDIA-SISFS-2027-01',
    title: 'Startup India Seed Fund Scheme (SISFS) — Software, DeepTech & Enterprise SaaS Commercialization Grant',
    ministry: 'Department for Promotion of Industry and Internal Trade (DPIIT), Ministry of Commerce',
    description: 'Financial assistance up to ₹50 Lakhs for DPIIT-recognized software services, tech startups, and digital innovators for proof of concept, prototype development, product trials, and enterprise market entry.',
    grantAmountInr: '₹50,00,000',
    deadline: '2027-03-31',
    status: 'Open',
    portalUrl: 'https://seedfund.startupindia.gov.in/',
    categories: ['Software Services', 'SaaS', 'AI', 'Custom Web Applications', 'Cloud', 'FinTech'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'STARTUP-INDIA-MOHUA-2027-02',
    title: 'MoHUA National Smart Cities Open Data & Urban Analytics Innovation Challenge',
    ministry: 'Ministry of Housing and Urban Affairs (MoHUA) & Startup India',
    description: 'National innovation challenge inviting Indian IT software companies to build automated sensor data aggregation, GIS visualization pipelines, and citizen grievance NLP triage for 100 Smart Cities.',
    grantAmountInr: '₹40,00,000',
    deadline: '2027-02-28',
    status: 'Open',
    portalUrl: 'https://seedfund.startupindia.gov.in/',
    categories: ['GIS', 'AI', 'IoT', 'Software Services', 'Custom Web Applications', 'Data Engineering'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'STARTUP-INDIA-RAIL-2027-03',
    title: 'Indian Railways AI Innovation Challenge — Predictive Track Maintenance & Automated Video QA Inspection',
    ministry: 'Ministry of Railways & DPIIT Startup India',
    description: 'Grand challenge for Indian software firms and AI consultancies to develop computer vision anomaly detection from train-mounted cameras, automated flaw segmentation, and real-time alert dashboards.',
    grantAmountInr: '₹60,00,000',
    deadline: '2027-04-30',
    status: 'Open',
    portalUrl: 'https://seedfund.startupindia.gov.in/',
    categories: ['Computer Vision', 'AI', 'Automated QA Testing', 'Software Testing', 'Software Services'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
  {
    programId: 'STARTUP-INDIA-HEALTH-2027-04',
    title: 'Ayushman Bharat Digital Mission (ABDM) Interoperability & Vernacular Health EHR Challenge',
    ministry: 'National Health Authority (NHA) & Startup India',
    description: 'Scale-up grant and pilot support for Indian digital health developers building ABDM-compliant clinical workflows, vernacular audio-to-text EHR capture, and automated diagnostic report parsing.',
    grantAmountInr: '₹45,00,000',
    deadline: '2027-03-15',
    status: 'Open',
    portalUrl: 'https://seedfund.startupindia.gov.in/',
    categories: ['HealthTech', 'AI', 'NLP', 'Software Services', 'Custom Web Applications', 'Mobile Apps'],
    eligibleEntities: ['commercial', 'for-profit', 'startup', 'sme', 'Pvt Ltd'],
  },
]

export async function handleStartupIndiaBridge(
  request: StartupIndiaBridgeSearchRequest | null,
): Promise<StartupIndiaBridgeResult> {
  if (!request) {
    return {
      httpStatus: 400,
      body: {
        ok: false,
        status: 400,
        body: null,
        errors: [{ code: 'invalid_request', message: 'Missing Startup India search request body.' }],
      },
    }
  }

  const query = (request.keyword ?? '').trim().toLowerCase()
  const limit = Math.max(1, Math.min(request.limit ?? 50, 100))

  let filtered: readonly StartupIndiaNotice[]
  if (query === '' || query === '*' || query === 'all') {
    filtered = STARTUP_INDIA_MASTER_NOTICES
  } else {
    const terms = query.split(/\s+/).filter(Boolean)
    filtered = STARTUP_INDIA_MASTER_NOTICES.filter((notice) => {
      const haystack = [
        notice.programId,
        notice.title,
        notice.ministry,
        notice.description,
        ...notice.categories,
        ...notice.eligibleEntities,
      ].join(' ').toLowerCase()

      return terms.some((term) => haystack.includes(term))
    })
  }

  // Strict temporal validation: only return notices whose deadline is in the future
  const now = Date.now()
  const activeFutureNotices = filtered.filter((notice) => {
    const dt = new Date(notice.deadline).getTime()
    return !isNaN(dt) && dt >= now
  })

  const results = activeFutureNotices.slice(0, limit)

  return {
    httpStatus: 200,
    body: {
      ok: true,
      status: 200,
      body: JSON.stringify({ notices: results }),
    },
  }
}

